# Pipeline: Round 2 VR180 Upgrade

This folder contains a reference pipeline to convert a 4K input clip into a Round 2 VR180 stereo SBS equidistant fisheye clip at 8K (7680×3840), with depth-based DIBR, periphery expansion, foveated blur, and upscaling.

Important: This pipeline is designed to be lightweight and run locally. For best visual quality you can optionally swap in stronger AI models (LaMa, RIFE, Real-ESRGAN) using their CLIs in place of the built-ins here.

Requirements
- Python 3.9+
- ffmpeg in PATH
- pip install -r requirements.txt

Quick Start
1) Setup
```
python -m venv .venv
. .venv/Scripts/Activate.ps1  # Windows PowerShell
pip install -r pipeline/requirements.txt
```

2) Process a 20–30s segment
```
python pipeline/process_round2.py \
  --input input/round1_4k.mp4 \
  --outdir outputs/round2_work \
  --start-ts 00:00:10 \
  --duration 00:00:25 \
  --method mirror
```
- method: mirror | telea | lama (lama assumes you run LaMa externally; see Advanced)

3) Copy result into the web app
```
copy outputs/vr180-round2-8k-sbs-fisheye.mp4 assets/videos/vr180-round2-8k-sbs-fisheye.mp4
```

What it does
- Extracts frames + audio with ffmpeg
- Estimates depth (MiDaS small via OpenCV DNN; will auto-download ONNX on first run)
- DIBR stereo synthesis with disparity clamp equivalent to ≤1.5° visual angle
- Occlusion inpaint (mirror or OpenCV telea inpaint)
- Periphery expansion: Panini (≈0.7) + Stereographic (≈0.2) inspired blend to compress edges and simulate 200–220° then cropped to 180°
- Foveated edge blur starting around ~70° eccentricity with optional vignette
- Upscale to 8K using OpenCV (Lanczos) by default; optionally swap in Real-ESRGAN
- Re-encodes to MP4 and provides metadata injection instructions

Output
- outputs/vr180-round2-8k-sbs-fisheye.mp4

Advanced (Optional High-Quality Modules)
- Inpainting (LaMa): Use the lama-cleaner CLI or run LaMa on masks exported by the pipeline (see comments in process_round2.py). Replace the inpaint step with the external result.
- Upscaling (Real-ESRGAN): Run realesrgan-ncnn-vulkan or Real-ESRGAN python and point the pipeline to the upscaled frames folder.
- Temporal consistency: For best quality use a learned temporal model; the pipeline provides optical-flow-based smoothing as a baseline.

VR180 Metadata Injection
To tag the MP4 as VR180 stereo fisheye:
- Using exiftool (QuickTime tags vary by player support):
```
exiftool -overwrite_original \
  -XMP-GSpherical:Spherical=true \
  -XMP-GSpherical:Stitched=true \
  -XMP-GSpherical:ProjectionType=Fisheye \
  -XMP-GSpherical:StereoMode=left-right \
  outputs/vr180-round2-8k-sbs-fisheye.mp4
```
- Or using spatial-media (some forks support 180):
```
pip install spatial-media
python -m spatialmedia -i --stereo=left-right --projection=fisheye outputs/vr180-round2-8k-sbs-fisheye.mp4
```
Note: Metadata support for VR180 fisheye is player-dependent; the web app here does not require metadata to play.

Troubleshooting
- If MiDaS model download fails, manually download an ONNX MiDaS small model and put it in pipeline/models/model-small.onnx, then re-run.
- If you get green/magenta frames, switch ffmpeg encoder to libx264.
- For long clips, run on a subset first to validate settings.
