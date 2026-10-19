# Curtain render (Blender)

The opening is a real 3D scene rendered with Cycles: two panels of royal-navy **velvet** hang in
front of the hero film. They are **cloth-simulated**: the heading is pinned to a rod in pleats, gravity
and the fabric's weight and stiffness shape the drapes, and self-collision keeps the folds full. On
opening, the rings slide along the rod; the fabric follows physically — the top leads, the hem trails
and swings, the folds gather — and the gathered curtain leaves the frame, revealing "Save the Date".
Behind the curtain is the site's own Save the Date screen (`textures/std_*.png`, captured from the page),
so the render ends exactly where the live page continues.

Velvet look: saturated royal-blue body, royal-blue sheen, no white gloss, a fine pile, and a low raking
light so crests glow while troughs fall to near-black (colours measured from the reference fabric).

## Rebuild

```bash
# 0. if the Save the Date screen changed, re-capture textures/std_portrait.png (390×693 @2.77x)
#    and textures/std_landscape.png (1440×810 @1.33x) from the page with the curtain hidden
# render both orientations (Blender 4.x / 5.x, GPU recommended); the cloth is baked first
blender -b --factory-startup -P tools/blender/curtain.py -- --orient portrait  --frames 1-100 --samples 24
blender -b --factory-startup -P tools/blender/curtain.py -- --orient landscape --frames 1-100 --samples 24

# encode
ffmpeg -framerate 30 -i tools/blender/build/portrait/f%04d.png  -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart assets/video/curtain-portrait.mp4
ffmpeg -framerate 30 -i tools/blender/build/landscape/f%04d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart assets/video/curtain.mp4
```

Quick preview: `--frames 1-100 --samples 6 --scale 20` (the simulation always runs from the start).

`build/` holds the rendered frames (git-ignored).
