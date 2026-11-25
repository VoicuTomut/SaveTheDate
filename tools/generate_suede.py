"""Seamless velvet texture for the navy page (assets/texture/suede.png).

Modelled on the royal-blue velvet of the opening curtain (tools/blender/curtain.py):
soft vertical bands of royal-blue sheen where the light catches the pile,
deeper shadow between them, faint vertical brushing and a fine pile on top.
It is an RGBA overlay laid on the navy background colour, built from filtered
white noise in the frequency domain so it tiles without seams. The CSS lays it
twice at two unrelated widths so the bands never visibly repeat.

    python tools/generate_suede.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

N = 512                       # tile size (px)
SEED = 16052027
SHEEN = (64, 104, 255)        # royal-blue sheen of the curtain velvet (#4068ff)
LIGHT = 0.20                  # max opacity of the sheen
SHADOW = 0.30                 # max opacity of the shadow between the bands
OUT = Path(__file__).resolve().parent.parent / "assets" / "texture" / "suede.png"

rng = np.random.default_rng(SEED)
f = np.fft.fftfreq(N) * N
fx, fy = np.meshgrid(f, f)


def spectral(lo, hi, stretch_y=1.0, slope=0.0):
    """Periodic noise between lo and hi cycles per tile; stretch_y > 1 makes it vertical."""
    r = np.hypot(fx, fy * stretch_y)
    amp = np.where((r >= lo) & (r <= hi), np.maximum(r, 1) ** -slope, 0.0)
    n = np.fft.ifft2(np.fft.fft2(rng.standard_normal((N, N))) * amp).real
    return n / n.std()


bands = spectral(1, 6, stretch_y=14, slope=1.0)    # broad soft bands of light, like the folds
brush = spectral(10, 60, stretch_y=10, slope=0.5)  # finer vertical brushing in the pile
grain = spectral(150, 256)                          # the fine pile

v = np.tanh((1.0 * bands + 0.2 * brush + 0.15 * grain) / 1.5)

alpha = np.where(v > 0, v * LIGHT, -v * SHADOW)
rgb = np.where(v[..., None] > 0, np.array(SHEEN), 0)

img = np.dstack([rgb, np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(img, "RGBA").save(OUT, optimize=True)
print(OUT, OUT.stat().st_size, "bytes")
