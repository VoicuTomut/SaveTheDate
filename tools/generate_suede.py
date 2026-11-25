"""Seamless suede texture for the navy page (assets/texture/suede.png).

The CSS lays it twice at two unrelated sizes (256px and 373px) so the pattern
never visibly repeats; STRENGTH is the opacity of one layer.

A grey + alpha overlay laid on top of the navy background colour: fine nap
grain, soft mottling where the nap lies in different directions, and a faint
vertical brush, like the velvet of the opening curtain. Built from filtered
white noise in the frequency domain, so it tiles without seams.

    python tools/generate_suede.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

N = 384                 # tile size (px)
SEED = 16052027
OUT = Path(__file__).resolve().parent.parent / "assets" / "texture" / "suede.png"


def band(rng, lo, hi, stretch_y=1.0):
    """Periodic noise keeping spatial frequencies between lo and hi (cycles per tile)."""
    f = np.fft.fftfreq(N) * N
    fx, fy = np.meshgrid(f, f)
    r = np.sqrt(fx ** 2 + (fy * stretch_y) ** 2)
    mask = np.exp(-((r - (lo + hi) / 2) / ((hi - lo) / 2)) ** 2)
    noise = np.fft.ifft2(np.fft.fft2(rng.standard_normal((N, N))) * mask).real
    return noise / noise.std()


rng = np.random.default_rng(SEED)
grain = band(rng, 110, 190)                # the nap: fine, dense speckle
mottle = band(rng, 1, 4)                   # broad, soft patches of lighter / darker nap
brush = band(rng, 30, 80, stretch_y=8.0)   # faint vertical brushing (like the curtain)

v = 0.8 * grain + 0.45 * mottle + 0.3 * brush
v = np.tanh(v / 2.2)                       # soft-clip to -1..1

STRENGTH = 0.085                           # max opacity of the overlay
alpha = np.abs(v) * STRENGTH
grey = np.where(v > 0, 205, 0)             # light nap is a cool pale blue-grey, shadow is black

img = np.dstack([grey, np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(img, "LA").save(OUT, optimize=True)
print(OUT, OUT.stat().st_size, "bytes")
