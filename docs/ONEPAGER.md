# VR180 Round 2 One-Pager

Title: VR180 Immersive Experience – Round 2 Upgrade

Goal: Deliver a comfortable, natural VR180 experience with stereo depth, expanded periphery, foveated edges, and 8K clarity. Provide a 20–30s stereo SBS equidistant fisheye clip and a web app with a Before/After toggle.

Pipeline
- Depth Estimation → Stereo DIBR → Inpaint Occlusions
- Panini Projection (≈0.7) + Stereographic (≈0.2)
- Expand to 200–220° then crop to 180°
- Foveated Edge Blur from ~70° + optional vignette
- AI Super-Resolution to 8K (Temporal smoothing)
- Export VR180 SBS Fisheye MP4 + Metadata

Output Specs
- 7680×3840 (8K), 20–30s, Stereo SBS, Equidistant Fisheye
- Disparity ≤ 1.5° visual angle, no toe-in, no eyepiece masks

App Features
- Stereo fisheye shader (per-eye sampling from SBS)
- Before/After toggle (Round 1 vs Round 2)
- WebXR headset support, autoplay muted
- Minimal overlay with pipeline summary

How to Run
- npm run dev (http://localhost:8000)
- Final video at assets/videos/vr180-round2-8k-sbs-fisheye.mp4

Deployment
- GitHub Pages via Actions on main branch

Notes
- Use Real-ESRGAN/LaMa/RIFE for best quality if available
- Maintain vertical lines and avoid toe-in; center remains comfortable
