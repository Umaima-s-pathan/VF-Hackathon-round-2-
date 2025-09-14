# VR180 Immersive Experience – Round 2 Upgrade

A deployable web app showcasing a 20–30s VR180 stereo SBS equidistant fisheye clip with a Before/After toggle. The Round 2 pipeline delivers stereo depth (DIBR), periphery expansion, foveated edges, and AI 8K upscaling for a more natural, comfortable VR experience.

Live Demo (GitHub Pages): https://umaima-s-pathan.github.io/VR-Hackathon/

---

## Overview & Pitch

Round 2 focuses on immersion and comfort:
- Stereo depth with disparity capped at 1.0–1.5° to avoid eye strain.
- Peripheral expansion using Panini + Stereographic blend to reach 200–220° FOV and crop to 180°.
- Foveated edge blur (starting ~70° eccentricity) plus optional vignette to mimic human vision.
- AI upscaling to 8K for crisp clarity with temporal consistency.

The web app ships a clean player with a Round 1 vs Round 2 toggle and a pipeline overlay panel.

---

## Pipeline Summary

- Input: 4K clip (given timestamps)
- Depth Estimation → Stereo DIBR (disparity clamp ≤ 1.5°)
- Inpaint occlusions (AI or procedural)
- Projection: Panini mix ≈ 0.7 + Stereographic ≈ 0.2 → expand to 200–220° → crop to 180°
- Foveated edge blur + optional vignette
- Upscale to 8K (7680×3840) with temporal consistency pass
- Export as VR180 Stereo SBS Equidistant Fisheye MP4 (no toe-in, no eyepiece masks)
- Inject VR180 metadata

See pipeline/README.md for exact commands.

---

## Output Specs

- Duration: 20–30 seconds
- Resolution: 8K (7680×3840)
- Format: VR180 Stereo SBS, equidistant fisheye
- Metadata: VR180 stereo fisheye, no toe-in

---

## App Features

- Stereo per-eye fisheye shader for VR180 SBS
- Before/After toggle to compare Round 1 and Round 2
- WebXR VR compatibility (Cardboard/headsets)
- Minimal, professional overlay with pipeline steps

---

## Screenshots

- Before vs After frames: see docs/ONEPAGER.md (export to PDF to include in submission)

---

## How to Run / Test

YouTube mode (no downloads) setup:
1) Create config/local-config.json and paste your YouTube Data API v3 key and video IDs:
```
{
  "YOUTUBE_API_KEY": "PASTE_YOUR_API_KEY",
  "ROUND1_YT_VIDEO_ID": "<optional_round1_video_id>",
  "ROUND2_YT_VIDEO_ID": "<your_round2_video_id>",
  "USE_YOUTUBE": true
}
```
- Where to paste your API key: config/local-config.json (this file is gitignored)
- Tip: In Google Cloud Console, restrict the key to your site’s HTTP referrer.

2) Start a local server and open the app. Click the “Source: Use YouTube” button if not already in YouTube mode.

Using Node http-server:
```bash
npm install
npm run dev
# open http://localhost:8000
```

Using Python:
```bash
python -m http.server 8000
# open http://localhost:8000
```

Replace videos:
- Put your Round 1 clip at: assets/videos/vr180-round1.mp4 (SBS fisheye or mono)
- Put your Round 2 clip at: assets/videos/vr180-round2-8k-sbs-fisheye.mp4

The player defaults to Round 2 (toggle in header).

---

## Build the Round 2 Clip

Run the offline pipeline (Windows PowerShell or bash):
```bash
# 1) Set up
python -m venv .venv
. .venv/Scripts/Activate.ps1  # Windows PowerShell
pip install -r pipeline/requirements.txt

# 2) Process
python pipeline/process_round2.py \
  --input input/round1_4k.mp4 \
  --outdir outputs/round2_work \
  --duration 00:00:30 \
  --start-ts 00:00:10 \
  --method lama  # or 'mirror' for procedural edge fill

# 3) Final VR180 MP4 is placed in outputs/vr180-round2-8k-sbs-fisheye.mp4
#    Copy to assets/videos/vr180-round2-8k-sbs-fisheye.mp4
```

See pipeline/README.md for advanced options (disparity cap, FOV expansion, temporal consistency, metadata injection).

---

## Deployment

- GitHub Pages via Actions (see .github/workflows/deploy.yml)
- Push to main; the site is published automatically

---

## Why Round 2 is Better

- More natural depth with comfortable disparities
- Wider peripheral sense without warping the center
- Foveated blur improves realism and reduces visual overload
- Sharper details via AI upscaling without distracting flicker

---

## Author

Umaima Pathan
- LinkedIn: https://www.linkedin.com/in/umaima-pathan-b0586124a/

