"""Page background (assets/texture/velvet.jpg) cut from the opening curtain.

Takes the first frame of assets/video/curtain.mp4 (the closed royal-blue velvet
curtain rendered by tools/blender/curtain.py), crops away the top and bottom
edges and cross-fades opposite edges so the picture tiles seamlessly in both
directions. A whisper of noise hides banding from the video compression.

    python tools/make_velvet.py      (needs ffmpeg on PATH)
"""
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "video" / "curtain.mp4"
OUT = ROOT / "assets" / "texture" / "velvet.jpg"
TOP, BOTTOM = 140, 940      # rows kept from the 1080-high frame
BLEND = 220                 # px cross-faded at each seam

with tempfile.TemporaryDirectory() as tmp:
    frame = Path(tmp) / "frame.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SRC), "-frames:v", "1", str(frame)], check=True)
    img = np.asarray(Image.open(frame).convert("RGB")).astype(float)[TOP:BOTTOM]


def seamless(a, axis):
    """Fold the last BLEND px onto the first BLEND px along axis, so the edges meet."""
    a = np.moveaxis(a, axis, 0)
    n = a.shape[0] - BLEND
    t = np.linspace(0, 1, BLEND)[:, None, None]
    out = a[:n].copy()
    out[:BLEND] = a[:BLEND] * t + a[n:] * (1 - t)
    return np.moveaxis(out, 0, axis)


img = seamless(seamless(img, 0), 1)
img += np.random.default_rng(16052027).normal(0, 0.6, img.shape)
OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, quality=90, optimize=True, progressive=True)
print(OUT, img.shape[1], "x", img.shape[0], OUT.stat().st_size, "bytes")
