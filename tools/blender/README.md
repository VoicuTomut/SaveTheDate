# Envelope render (Blender)

The opening envelope is a real 3D scene rendered with Cycles: blue letterpress paper with the embossed
flowers as relief, four flaps with the website's rounded-tip shapes, and a wax seal with the stamped
**A & C** monogram. The hero video is mapped under the flaps, so the render ends exactly where the live
video continues.

## Rebuild

```bash
# 1. textures (height map of the embossed flowers + flap masks) — needs Pillow and Chrome
python tools/blender/make_textures.py

# 2. render both orientations (Blender 4.x / 5.x, GPU recommended)
blender -b --factory-startup -P tools/blender/envelope.py -- --orient portrait  --frames 1-72 --samples 32
blender -b --factory-startup -P tools/blender/envelope.py -- --orient landscape --frames 1-72 --samples 32

# 3. encode
ffmpeg -framerate 30 -i tools/blender/build/portrait/f%04d.png  -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart assets/video/envelope-portrait.mp4
ffmpeg -framerate 30 -i tools/blender/build/landscape/f%04d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart assets/video/envelope.mp4
```

Quick preview of one frame: `--frames 30 --samples 16 --scale 40`.

## Files

- `envelope.py` — builds the scene, animates the flaps and renders
- `make_textures.py` — generates `textures/height_*.png` and `textures/mask_*.png`
- `fonts/` — Ephesis and Cormorant Garamond (SIL Open Font License, see the OFL files) for the seal monogram
- `build/` — rendered frames (git-ignored)
