"""Textures for the Blender envelope (portrait + landscape).

* height_<o>.png — embossed flowers as a height map (white = raised paper),
  laid out exactly like the corners on the website
* mask_<flap>_<o>.png — the four flap shapes (rounded tips), same geometry
  as the website's envelope

Requires Pillow and Google Chrome (used headless to rasterise the SVG art).

    python tools/blender/make_textures.py
"""

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "textures"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

ORIENTATIONS = {
    # name: (width, height, corner art width in px)
    "portrait": (1080, 1920, round(1080 * 0.46)),
    "landscape": (1920, 1080, round(380 * 1920 / 1440)),
}


def white_art_svg():
    """The embossed corner art as flat white shapes (for a height map)."""
    s = (ROOT / "assets" / "florals" / "emboss-corner.svg").read_text(encoding="utf-8")
    start = s.index("<use")
    end = s.index("</svg>")
    # shapes at mid height, outlines and veins as raised ridges, so petals keep their detail
    return s[:start] + '<use href="#art" fill="#8c8c8c" stroke="#fff"/>' + s[end:]


def height_map(name, w, h, art):
    svg_path = OUT / "art_white.svg"
    svg_path.write_text(white_art_svg(), encoding="utf-8")
    html = f"""<!doctype html><html><body style="margin:0;width:{w}px;height:{h}px;background:#000;overflow:hidden;position:relative">
<img src="art_white.svg" style="position:absolute;top:0;left:0;width:{art}px">
<img src="art_white.svg" style="position:absolute;top:0;right:0;width:{art}px;transform:scaleX(-1)">
<img src="art_white.svg" style="position:absolute;bottom:0;left:0;width:{art}px;transform:scaleY(-1)">
<img src="art_white.svg" style="position:absolute;bottom:0;right:0;width:{art}px;transform:scale(-1,-1)">
</body></html>"""
    page = OUT / f"_height_{name}.html"
    page.write_text(html, encoding="utf-8")
    raw = OUT / f"_height_{name}_raw.png"
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--window-size={w},{h}", "--force-device-scale-factor=1",
         f"--screenshot={raw}", page.as_uri()],
        check=True, capture_output=True,
    )
    img = Image.open(raw).convert("L")
    # soften the edges so the relief reads as pressed paper, not a cut-out
    img = img.filter(ImageFilter.GaussianBlur(0.8))
    img.save(OUT / f"height_{name}.png")
    for tmp in (page, raw):
        tmp.unlink()


def rounded_tip(p0, tip, p1, r, steps=24):
    def toward(a, b, d):
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        return (a[0] + dx / ln * d, a[1] + dy / ln * d)

    a = toward(tip, p0, r)
    b = toward(tip, p1, r)
    pts = [a]
    for i in range(1, steps):
        t = i / steps
        pts.append((
            (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * tip[0] + t * t * b[0],
            (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * tip[1] + t * t * b[1],
        ))
    pts.append(b)
    return pts


def flap_polygons(w, h):
    cx, cy = w / 2, h / 2
    r = min(w, h) * 0.09
    return {
        "top": [(0, 0), (w, 0)] + rounded_tip((w, 0), (cx, cy + r * 0.35), (0, 0), r),
        "bottom": [(w, h)] + rounded_tip((w, h), (cx, cy - h * 0.04), (0, h), r * 1.4) + [(0, h)],
        "left": [(0, 0)] + rounded_tip((0, 0), (cx + w * 0.03, cy), (0, h), r) + [(0, h)],
        "right": [(w, 0)] + rounded_tip((w, 0), (cx - w * 0.03, cy), (w, h), r) + [(w, h)],
    }


def masks(name, w, h):
    ss = 3  # supersample for clean anti-aliased edges
    for flap, poly in flap_polygons(w, h).items():
        img = Image.new("L", (w * ss, h * ss), 0)
        ImageDraw.Draw(img).polygon([(x * ss, y * ss) for x, y in poly], fill=255)
        img.resize((w, h), Image.LANCZOS).save(OUT / f"mask_{flap}_{name}.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (w, h, art) in ORIENTATIONS.items():
        height_map(name, w, h, art)
        masks(name, w, h)
        print("textures:", name)
    (OUT / "art_white.svg").unlink()


if __name__ == "__main__":
    main()
