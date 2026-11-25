"""Seamless velvet / suede texture for the navy page (assets/texture/suede.png).

Modelled on velvet invitation paper: big soft clouds where the nap lies in
different directions (lighter sheen, deeper shadow), with a very fine grain on
top and no streaks. It is a grey + alpha overlay laid on the navy background
colour, built from filtered white noise in the frequency domain so it tiles
without seams. The CSS lays it twice at two unrelated sizes (480px and 697px)
so the clouds never visibly repeat; LIGHT / SHADOW are one layer's opacity.

    python tools/generate_suede.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

N = 512                 # tile size (px)
SEED = 16052027
LIGHT = 0.11            # max opacity of the pale sheen
SHADOW = 0.15           # max opacity of the shadowed nap
OUT = Path(__file__).resolve().parent.parent / "assets" / "texture" / "suede.png"

rng = np.random.default_rng(SEED)
f = np.fft.fftfreq(N) * N
fx, fy = np.meshgrid(f, f)
r = np.hypot(fx, fy)


def spectral(lo, hi, slope):
    """Periodic noise with amplitude ~ f^-slope between lo and hi cycles per tile."""
    amp = np.where((r >= lo) & (r <= hi), np.maximum(r, 1) ** -slope, 0.0)
    n = np.fft.ifft2(np.fft.fft2(rng.standard_normal((N, N))) * amp).real
    return n / n.std()


def sample_wrapped(img, x, y):
    """Bilinear sample with wrap-around (keeps the tile seamless)."""
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    dx, dy = x - x0, y - y0
    g = lambda yy, xx: img[yy % N, xx % N]
    return (g(y0, x0) * (1 - dx) * (1 - dy) + g(y0, x0 + 1) * dx * (1 - dy)
            + g(y0 + 1, x0) * (1 - dx) * dy + g(y0 + 1, x0 + 1) * dx * dy)


clouds = spectral(1, 14, 1.9)                     # soft clouds of brushed nap
wx, wy = spectral(1, 5, 1.0), spectral(1, 5, 1.0) # gentle swirl, like hand-brushed velvet
yy, xx = np.mgrid[0:N, 0:N].astype(float)
clouds = sample_wrapped(clouds, xx + 9 * wx, yy + 9 * wy)
clouds /= clouds.std()
grain = spectral(150, 256, 0.0)                   # the fine pile

v = np.tanh((clouds + 0.28 * grain) / 1.6)        # soft-clip to -1..1

alpha = np.where(v > 0, v * LIGHT, -v * SHADOW)
grey = np.where(v > 0, 215, 0)                    # pale sheen / black shadow

img = np.dstack([grey, np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(img, "LA").save(OUT, optimize=True)
print(OUT, OUT.stat().st_size, "bytes")
