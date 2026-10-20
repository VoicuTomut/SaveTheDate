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

The curtain is rendered **once** over a transparent background; any Save the Date lettering is then
composited under it in about 20 seconds, so trying a new style never needs a new render.

```bash
# 1. render the curtain over transparency (only when the curtain itself changes; ~20 min on GPU)
blender -b --factory-startup -P tools/blender/curtain.py -- --orient portrait  --frames 1-100 --samples 24 --transparent --out tools/blender/build/portrait-alpha
blender -b --factory-startup -P tools/blender/curtain.py -- --orient landscape --frames 1-100 --samples 24 --transparent --out tools/blender/build/landscape-alpha

# 2. compose with a lettering (needs a local server on :5577 and playwright-core)
python tools/composite_curtain.py --font "Imperial Script"                    # writes assets/video/curtain*.mp4
python tools/composite_curtain.py --font "Pinyon Script" --preview previews/  # quick preview only
```

Without `--transparent`, `curtain.py` renders the finished opening with `textures/std_*.png` as backdrop.

`build/` holds the rendered frames (git-ignored).
