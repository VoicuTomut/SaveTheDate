"""Textures for the Blender envelope (portrait + landscape).

* height_<o>.png — embossed flowers as a height map (white = raised paper):
  corner bouquets plus delicate vines along the diagonal flap edges
* foil_<o>.png   — fine silver-foil lines: along the flap edges and a frame
  around the envelope
* mask_<flap>_<o>.png — the four flap shapes (rounded tips), same geometry as
  the website's envelope

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


def white_art_svg(name):
    """Embossed art as a height map: shapes mid-height, outlines and veins as ridges."""
    s = (ROOT / "assets" / "florals" / name).read_text(encoding="utf-8")
    start = s.index("<use")
    end = s.index("</svg>")
    return s[:start] + '<use href="#art" fill="#8c8c8c" stroke="#fff"/>' + s[end:]


# ---------------------------------------------------------------- geometry
def flap_geometry(w, h):
    cx, cy = w / 2, h / 2
    r = min(w, h) * 0.09
    return {
        "top_tip": (cx, cy + r * 0.35),
        "bottom_tip": (cx, cy - h * 0.04),
        "left_tip": (cx + w * 0.03, cy),
        "right_tip": (cx - w * 0.03, cy),
        "r": r,
    }


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
    g = flap_geometry(w, h)
    r = g["r"]
    return {
        "top": [(0, 0), (w, 0)] + rounded_tip((w, 0), g["top_tip"], (0, 0), r),
        "bottom": [(w, h)] + rounded_tip((w, h), g["bottom_tip"], (0, h), r * 1.4) + [(0, h)],
        "left": [(0, 0)] + rounded_tip((0, 0), g["left_tip"], (0, h), r) + [(0, h)],
        "right": [(w, 0)] + rounded_tip((w, 0), g["right_tip"], (w, h), r) + [(w, h)],
    }


def visible_edges(w, h):
    """The diagonal edges seen on the closed envelope: (corner, unit direction,
    unit normal pointing into the flap that owns the edge, length)."""
    g = flap_geometry(w, h)
    cx = w / 2
    edges = []
    for corner, tip in (
        ((0, 0), g["top_tip"]), ((w, 0), g["top_tip"]),
        ((0, h), g["bottom_tip"]), ((w, h), g["bottom_tip"]),
    ):
        dx, dy = tip[0] - corner[0], tip[1] - corner[1]
        ln = math.hypot(dx, dy)
        ux, uy = dx / ln, dy / ln
        nx, ny = -uy, ux
        # the owning flap (top / bottom) lies towards the vertical centre line
        mid = (corner[0] + dx / 2, corner[1] + dy / 2)
        if (mid[0] + nx * 10 - cx) ** 2 > (mid[0] - cx) ** 2:
            nx, ny = -nx, -ny
        edges.append((corner, (ux, uy), (nx, ny), ln))
    return edges


# ---------------------------------------------------------------- height map
def height_map(name, w, h, art):
    for svg in ("emboss-corner.svg", "emboss-sprig.svg"):
        (OUT / f"_white_{svg}").write_text(white_art_svg(svg), encoding="utf-8")

    sprig_w = round(min(w, h) * 0.27)
    sprig_h = round(sprig_w * 80 / 320)
    vines = []
    for corner, (ux, uy), (nx, ny), ln in visible_edges(w, h):
        angle = math.degrees(math.atan2(uy, ux))
        for t in (0.36, 0.6):
            # centre of the sprig: along the edge, a little inside the flap
            px = corner[0] + ux * ln * t + nx * sprig_h * 0.9
            py = corner[1] + uy * ln * t + ny * sprig_h * 0.9
            vines.append(
                f'<img src="_white_emboss-sprig.svg" style="position:absolute;width:{sprig_w}px;'
                f'left:{px - sprig_w / 2:.1f}px;top:{py - sprig_h / 2:.1f}px;'
                f'transform:rotate({angle:.2f}deg)">'
            )

    html = f"""<!doctype html><html><body style="margin:0;width:{w}px;height:{h}px;background:#000;overflow:hidden;position:relative">
<img src="_white_emboss-corner.svg" style="position:absolute;top:0;left:0;width:{art}px">
<img src="_white_emboss-corner.svg" style="position:absolute;top:0;right:0;width:{art}px;transform:scaleX(-1)">
<img src="_white_emboss-corner.svg" style="position:absolute;bottom:0;left:0;width:{art}px;transform:scaleY(-1)">
<img src="_white_emboss-corner.svg" style="position:absolute;bottom:0;right:0;width:{art}px;transform:scale(-1,-1)">
{''.join(vines)}
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
    img = Image.open(raw).convert("L").filter(ImageFilter.GaussianBlur(0.8))
    img.save(OUT / f"height_{name}.png")
    for tmp in (page, raw):
        tmp.unlink()


# ---------------------------------------------------------------- foil
def foil(name, w, h):
    ss = 3
    img = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(img)
    lw = round(2.2 * ss)
    inset = min(w, h) * 0.026

    # frame around the whole envelope
    d.rectangle([inset * ss, inset * ss, (w - inset) * ss, (h - inset) * ss], outline=255, width=lw)

    # a fine line just inside each visible flap edge, stopping short of the seal
    g = flap_geometry(w, h)
    for corner, (ux, uy), (nx, ny), ln in visible_edges(w, h):
        off = inset * 0.85
        start, stop = 0.05, 1 - (g["r"] * 2.6) / ln
        a = (corner[0] + ux * ln * start + nx * off, corner[1] + uy * ln * start + ny * off)
        b = (corner[0] + ux * ln * stop + nx * off, corner[1] + uy * ln * stop + ny * off)
        d.line([(a[0] * ss, a[1] * ss), (b[0] * ss, b[1] * ss)], fill=255, width=lw)

    img.resize((w, h), Image.LANCZOS).save(OUT / f"foil_{name}.png")


# ---------------------------------------------------------------- masks
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
        foil(name, w, h)
        masks(name, w, h)
        print("textures:", name)
    for tmp in OUT.glob("_white_*.svg"):
        tmp.unlink()


if __name__ == "__main__":
    main()
