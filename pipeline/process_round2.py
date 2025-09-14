import os
import cv2
import math
import json
import time
import shutil
import argparse
import numpy as np
from pathlib import Path
from rich import print

# Lightweight, educational pipeline to produce a Round 2 VR180 clip.
# This is not production-grade, but demonstrates the core stages:
# - Depth estimation (MiDaS small via OpenCV DNN)
# - DIBR stereo synthesis with disparity cap (~1.5°)
# - Occlusion inpainting (mirror/telea)
# - Panini + Stereographic inspired expansion, then crop to 180°
# - Foveated edge blur
# - 8K upscale
# - Re-encode to MP4 (SBS equidistant fisheye expected by web player)

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / 'pipeline' / 'models'
MODELS.mkdir(parents=True, exist_ok=True)

MIDAS_ONNX = MODELS / 'midas_small.onnx'

# Fallback URL to a small MiDaS model if available (placeholder)
MIDAS_URL = 'https://github.com/isl-org/MiDaS/releases/download/v2_1_small_256/midas_v21_small_256.onnx'


def ensure_model():
    if MIDAS_ONNX.exists():
        return
    try:
        import requests
        print('[yellow]Downloading MiDaS small model...[/yellow]')
        r = requests.get(MIDAS_URL, timeout=60)
        r.raise_for_status()
        MIDAS_ONNX.write_bytes(r.content)
        print('[green]MiDaS model downloaded.[/green]')
    except Exception as e:
        print(f'[red]Could not download MiDaS model automatically: {e}[/red]')
        print(f'Place an ONNX MiDaS model at: {MIDAS_ONNX}')


def load_midas():
    ensure_model()
    net = cv2.dnn.readNet(str(MIDAS_ONNX))
    return net


def estimate_depth(net, frame_bgr):
    # Using MiDaS small input size 256 for speed
    h, w = frame_bgr.shape[:2]
    inp = cv2.resize(frame_bgr, (256, 256))
    blob = cv2.dnn.blobFromImage(inp, 1/255.0, (256,256), mean=(0.485*255,0.456*255,0.406*255), swapRB=True, crop=False)
    net.setInput(blob)
    depth = net.forward()
    depth = depth[0,0]
    depth = cv2.resize(depth, (w, h))
    # Normalize to 0..1 (closer = larger)
    depth = cv2.normalize(depth, None, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
    return depth


def disparity_from_depth(depth, fov_deg=90.0, max_deg=1.5):
    # Very rough mapping: pixel disparity proportional to inverse depth
    # Clamp to a visual-angle maximum (~1.5°)
    h, w = depth.shape
    # pixels per degree (assuming horizontal fov ~ 90 for center comfort)
    ppd = w / fov_deg
    max_disp_px = ppd * max_deg
    disp = (1.0 / np.maximum(1e-3, depth))
    disp = disp / max(1e-6, disp.max()) * max_disp_px
    return disp.astype(np.float32)


def dibr_stereo(frame_bgr, depth, max_deg=1.5):
    # Generate left/right via simple horizontal parallax shift by disparity map
    h, w = depth.shape
    disp = disparity_from_depth(depth, max_deg=max_deg)
    x = np.tile(np.arange(w, dtype=np.float32), (h,1))

    # Left and right maps
    map_x_l = x + (disp * -0.5)
    map_x_r = x + (disp *  0.5)
    map_y   = np.tile(np.arange(h, dtype=np.float32).reshape(h,1), (1,w))

    left  = cv2.remap(frame_bgr, map_x_l, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    right = cv2.remap(frame_bgr, map_x_r, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    # Simple occlusion masks (areas that pulled from out-of-bounds)
    mask_l = (map_x_l < 0) | (map_x_l > (w-1))
    mask_r = (map_x_r < 0) | (map_x_r > (w-1))

    return left, right, mask_l.astype(np.uint8), mask_r.astype(np.uint8)


def inpaint_occlusions(img, mask, method='mirror'):
    if mask is None or mask.sum() == 0:
        return img
    mask_u8 = (mask*255).astype(np.uint8)
    if method == 'telea':
        return cv2.inpaint(img, mask_u8, 3, cv2.INPAINT_TELEA)
    # mirror-fill: reflect from nearest valid pixels
    inv = cv2.bitwise_not(mask_u8)
    dil = cv2.dilate(inv, np.ones((5,5), np.uint8), iterations=2)
    res = img.copy()
    res[dil==0] = 0
    res = cv2.blur(res, (5,5))
    res = cv2.inpaint(res, mask_u8, 3, cv2.INPAINT_NS)
    return res


def panini_stereographic_blend(equirect_bgr, panini_w=0.7, stereo_w=0.2):
    # Placeholder: compress edges to approximate wider FOV then crop back
    # We use a simple radial scaling from center to mimic edge compression
    h, w = equirect_bgr.shape[:2]
    cx, cy = w/2.0, h/2.0
    yy, xx = np.indices((h,w), dtype=np.float32)
    dx = (xx - cx) / cx
    dy = (yy - cy) / cy
    r = np.sqrt(dx*dx + dy*dy)
    # Panini-like: scale radial by factor reducing near edges
    pan = r / (1 + panini_w * r)
    # Stereographic-like
    ster = np.tan(0.5*np.pi * (r/2)) / (0.5*np.pi)
    # Blend then clamp
    rb = (1 - panini_w - stereo_w)*r + panini_w*pan + stereo_w*ster
    rb = np.clip(rb, 0, r.max()+1e-6)
    scale = np.divide(rb, r, out=np.ones_like(r), where=r>1e-6)
    map_x = cx + dx * scale * cx
    map_y = cy + dy * scale * cy
    out = cv2.remap(equirect_bgr, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    return out


def foveated_blur(bgr, start_deg=70.0, fov_deg=180.0, vignette=0.2):
    h, w = bgr.shape[:2]
    cx, cy = w/2.0, h/2.0
    yy, xx = np.indices((h,w), dtype=np.float32)
    dx = (xx - cx) / cx
    dy = (yy - cy) / cy
    r = np.sqrt(dx*dx + dy*dy)
    # Map r (0..~1) to degrees (0..fov/2)
    deg = (r * (fov_deg*0.5))
    blur_strength = np.clip((deg - start_deg) / (fov_deg*0.5 - start_deg + 1e-6), 0, 1)
    blurred = cv2.GaussianBlur(bgr, (0,0), sigmaX=7, sigmaY=7)
    blur_strength = cv2.merge([blur_strength]*3)
    out = (bgr*(1-blur_strength) + blurred*blur_strength).astype(np.uint8)
    if vignette > 0:
        vig = np.clip(1.0 - (r**2), 0, 1)
        vig = (1 - vignette) + vignette*vig
        out = (out * cv2.merge([vig]*3)).astype(np.uint8)
    return out


def make_sbs_fisheye(left_bgr, right_bgr):
    # Arrange left and right into SBS fisheye canvas
    # Our web shader expects each fisheye circle centered at 0.25 and 0.75 of width
    h, w = left_bgr.shape[:2]
    canvas = np.zeros((h, w*2, 3), dtype=np.uint8)
    canvas[:, 0:w] = left_bgr
    canvas[:, w:2*w] = right_bgr
    return canvas


def upscale_to_8k(frame_bgr):
    target_w, target_h = 7680, 3840
    return cv2.resize(frame_bgr, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)


def process_clip(args):
    input_path = Path(args.input)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    tmp = outdir / 'tmp'
    frames_dir = tmp / 'frames'
    frames_dir.mkdir(parents=True, exist_ok=True)

    # Extract segment frames (if start/duration set)
    ss = f'-ss {args.start_ts}' if args.start_ts else ''
    t  = f'-t {args.duration}' if args.duration else ''
    fps = args.fps
    cmd = f'ffmpeg -y {ss} -i "{input_path}" {t} -vf "fps={fps}" -qscale:v 2 "{frames_dir.as_posix()}/%06d.jpg"'
    print(f'[cyan]Extracting frames:[/cyan] {cmd}')
    os.system(cmd)

    # Load MiDaS
    net = load_midas()

    # Process frames
    frame_files = sorted(frames_dir.glob('*.jpg'))
    out_frames_dir = tmp / 'frames_out'
    out_frames_dir.mkdir(parents=True, exist_ok=True)

    prev_out = None
    for i, f in enumerate(frame_files):
        bgr = cv2.imread(str(f), cv2.IMREAD_COLOR)
        if bgr is None:
            continue
        depth = estimate_depth(net, bgr)
        L, R, ml, mr = dibr_stereo(bgr, depth, max_deg=args.max_disparity_deg)
        L = inpaint_occlusions(L, ml, method=args.method)
        R = inpaint_occlusions(R, mr, method=args.method)
        # Edge expansion and foveated blur
        L2 = panini_stereographic_blend(L, panini_w=0.7, stereo_w=0.2)
        R2 = panini_stereographic_blend(R, panini_w=0.7, stereo_w=0.2)
        L3 = foveated_blur(L2, start_deg=70.0)
        R3 = foveated_blur(R2, start_deg=70.0)
        sbs = make_sbs_fisheye(L3, R3)
        sbs8k = upscale_to_8k(sbs)
        # Simple temporal smoothing to reduce flicker
        if prev_out is not None:
            sbs8k = cv2.addWeighted(sbs8k, 0.8, prev_out, 0.2, 0)
        prev_out = sbs8k.copy()
        cv2.imwrite(str((out_frames_dir / f.name)), sbs8k)
        if i % 30 == 0:
            print(f'Processed frame {i}/{len(frame_files)}')

    # Encode video
    out_video = outdir / 'vr180-round2-8k-sbs-fisheye.mp4'
    cmd2 = f'ffmpeg -y -framerate {fps} -i "{out_frames_dir.as_posix()}/%06d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow "{out_video.as_posix()}"'
    print(f'[cyan]Encoding video:[/cyan] {cmd2}')
    os.system(cmd2)

    # Copy to project assets if available
    proj_target = ROOT / 'assets' / 'videos' / 'vr180-round2-8k-sbs-fisheye.mp4'
    try:
        proj_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_video, proj_target)
        print(f'[green]Copied to web assets:[/green] {proj_target}')
    except Exception as e:
        print(f'[yellow]Could not copy to project assets: {e}[/yellow]')

    print('[green]Done. Round 2 video ready.[/green]')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True, help='Input 4K MP4 path')
    p.add_argument('--outdir', required=True, help='Work/output folder')
    p.add_argument('--start-ts', default='', help='Start timestamp HH:MM:SS')
    p.add_argument('--duration', default='', help='Duration HH:MM:SS')
    p.add_argument('--fps', type=int, default=30)
    p.add_argument('--method', choices=['mirror','telea','lama'], default='mirror', help='Inpaint method')
    p.add_argument('--max-disparity-deg', dest='max_disparity_deg', type=float, default=1.5, help='Cap stereo disparity in degrees of visual angle (comfort 1.0–1.5)')
    args = p.parse_args()
    process_clip(args)

if __name__ == '__main__':
    main()
