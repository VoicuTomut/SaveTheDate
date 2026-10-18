"""Generate tone-on-tone *embossed* flower artwork (letterpress look).

Each composition is drawn three times:
  1. a soft shadow, offset down-right
  2. a white highlight, offset up-left
  3. the raised paper surface on top
which reads as flowers pressed into blue paper. Flowers are from a blue
flower field: nemophila, cornflower, buds and slender leaves.

    python tools/generate_emboss.py

Writes to assets/florals/. Colors mirror --paper tokens in css/colors.css.
"""

import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "florals"

PAPER_RAISED = "#b0c2de"          # raised surface, a touch lighter than --paper (#a7bad9)
LINE = "rgba(40, 62, 120, 0.32)"  # fine pressed outline
HIGHLIGHT = "rgba(255, 255, 255, 0.95)"
SHADOW = "rgba(27, 43, 87, 0.30)"


def f(n):
    return f"{n:.2f}".rstrip("0").rstrip(".")


def rot(x, y, a):
    r = math.radians(a)
    return x * math.cos(r) - y * math.sin(r), x * math.sin(r) + y * math.cos(r)


# --------------------------------------------------------------------------
# Motifs (return SVG fragments, no colors — colors come from the <use> layers)
# --------------------------------------------------------------------------
def nemophila(cx, cy, r, a0=0):
    out = []
    for k in range(5):
        a = a0 + k * 72
        pts = [(0, 0), (-0.6 * r, -0.16 * r), (-0.6 * r, -0.88 * r), (-0.08 * r, -0.96 * r),
               (0, -r), (0.08 * r, -0.96 * r), (0.6 * r, -0.88 * r), (0.6 * r, -0.16 * r)]
        p = [rot(x, y, a) for x, y in pts]
        p = [(cx + x, cy + y) for x, y in p]
        out.append(
            f'<path d="M{f(p[0][0])} {f(p[0][1])}C{f(p[1][0])} {f(p[1][1])} {f(p[2][0])} {f(p[2][1])} {f(p[3][0])} {f(p[3][1])}'
            f'Q{f(p[4][0])} {f(p[4][1])} {f(p[5][0])} {f(p[5][1])}C{f(p[6][0])} {f(p[6][1])} {f(p[7][0])} {f(p[7][1])} {f(p[0][0])} {f(p[0][1])}Z"/>'
        )
    # petal veins
    for k in range(5):
        a = a0 + k * 72
        for da, ln in ((0, 0.62), (-14, 0.45), (14, 0.45)):
            x1, y1 = rot(0, -0.16 * r, a + da)
            x2, y2 = rot(0, -ln * r, a + da)
            out.append(f'<path fill="none" stroke-width="0.8" d="M{f(cx + x1)} {f(cy + y1)}L{f(cx + x2)} {f(cy + y2)}"/>')
    out.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r * 0.16)}"/>')
    for k in range(5):
        x, y = rot(0, -r * 0.26, a0 + 36 + k * 72)
        out.append(f'<circle cx="{f(cx + x)}" cy="{f(cy + y)}" r="{f(r * 0.045)}"/>')
    return "".join(out)


def cornflower(cx, cy, r, a0=0):
    out = []
    for k in range(9):
        a = a0 + k * 40
        pts = [(-0.1, -0.25), (-0.24, -0.86), (-0.12, -0.78), (-0.07, -1.0), (0, -0.82),
               (0.07, -1.0), (0.12, -0.78), (0.24, -0.86), (0.1, -0.25)]
        p = [rot(x * r, y * r, a) for x, y in pts]
        d = "M" + "L".join(f"{f(cx + x)} {f(cy + y)}" for x, y in p) + "Z"
        out.append(f'<path stroke-linejoin="round" d="{d}"/>')
    out.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r * 0.3)}"/>')
    for k in range(7):
        x, y = rot(0, -r * 0.16, a0 + k * 51)
        out.append(f'<circle cx="{f(cx + x)}" cy="{f(cy + y)}" r="{f(r * 0.05)}"/>')
    return "".join(out)


def leaf(x, y, length, angle):
    w = length * 0.2
    pts = [(0, 0), (length * 0.3, -w), (length * 0.75, -w * 0.8), (length, 0),
           (length * 0.75, w * 0.8), (length * 0.3, w)]
    p = [rot(px, py, angle) for px, py in pts]
    p = [(x + px, y + py) for px, py in p]
    out = [
        f'<path d="M{f(p[0][0])} {f(p[0][1])}C{f(p[1][0])} {f(p[1][1])} {f(p[2][0])} {f(p[2][1])} {f(p[3][0])} {f(p[3][1])}'
        f'C{f(p[4][0])} {f(p[4][1])} {f(p[5][0])} {f(p[5][1])} {f(p[0][0])} {f(p[0][1])}Z"/>'
    ]
    m1 = rot(length * 0.05, 0, angle)
    m2 = rot(length * 0.92, 0, angle)
    out.append(f'<path fill="none" stroke-width="0.8" d="M{f(x + m1[0])} {f(y + m1[1])}L{f(x + m2[0])} {f(y + m2[1])}"/>')
    for t in (0.3, 0.5, 0.7):
        for s in (-1, 1):
            a1 = rot(length * t, 0, angle)
            a2 = rot(length * (t + 0.12), s * w * 0.6, angle)
            out.append(f'<path fill="none" stroke-width="0.6" d="M{f(x + a1[0])} {f(y + a1[1])}L{f(x + a2[0])} {f(y + a2[1])}"/>')
    return "".join(out)


def bud(x, y, size, angle):
    p = rot(0, -size, angle)
    tip = rot(0, -size * 1.9, angle)
    sl = rot(-size * 0.45, -size * 0.9, angle)
    sr = rot(size * 0.45, -size * 0.9, angle)
    return (
        f'<ellipse cx="{f(x + p[0] * 1.35)}" cy="{f(y + p[1] * 1.35)}" rx="{f(size * 0.42)}" ry="{f(size * 0.7)}" '
        f'transform="rotate({f(angle)} {f(x + p[0] * 1.35)} {f(y + p[1] * 1.35)})"/>'
        f'<path d="M{f(x)} {f(y)}Q{f(x + sl[0])} {f(y + sl[1])} {f(x + p[0])} {f(y + p[1])}Q{f(x + sr[0])} {f(y + sr[1])} {f(x)} {f(y)}Z"/>'
        f'<path fill="none" stroke-width="0.6" d="M{f(x + p[0])} {f(y + p[1])}L{f(x + tip[0] * 0.9)} {f(y + tip[1] * 0.9)}"/>'
    )


def stem(points, width=2.2):
    d = f"M{f(points[0][0])} {f(points[0][1])}"
    for i in range(1, len(points) - 1, 2):
        d += f"Q{f(points[i][0])} {f(points[i][1])} {f(points[i + 1][0])} {f(points[i + 1][1])}"
    return f'<path fill="none" stroke-width="{width}" stroke-linecap="round" d="{d}"/>'


def dots(rng, x, y, spread, n):
    out = []
    for _ in range(n):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, spread)
        out.append(f'<circle cx="{f(x + math.cos(a) * r)}" cy="{f(y + math.sin(a) * r)}" r="{f(rng.uniform(1.4, 2.6))}"/>')
    return "".join(out)


# --------------------------------------------------------------------------
# Emboss wrapper
# --------------------------------------------------------------------------
def emboss_svg(w, h, art, label):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">'
        "<defs>"
        '<filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.3"/></filter>'
        f'<g id="art" stroke-width="1.1">{art}</g>'
        "</defs>"
        f'<use href="#art" transform="translate(1.6 2.2)" fill="{SHADOW}" stroke="{SHADOW}" filter="url(#soft)"/>'
        f'<use href="#art" transform="translate(-1 -1.2)" fill="{HIGHLIGHT}" stroke="{HIGHLIGHT}"/>'
        f'<use href="#art" fill="{PAPER_RAISED}" stroke="{LINE}"/>'
        "</svg>\n"
    )


# --------------------------------------------------------------------------
# Compositions
# --------------------------------------------------------------------------
def corner():
    """Flowering vine growing from the top-left corner."""
    rng = random.Random(1605)
    parts = []
    # main stems
    parts.append(stem([(0, 40), (120, 70), (190, 150), (240, 210), (330, 250)]))
    parts.append(stem([(40, 0), (90, 110), (150, 170), (190, 230), (200, 330)], 2))
    parts.append(stem([(0, 140), (60, 160), (110, 210)], 1.6))
    parts.append(stem([(150, 0), (170, 60), (240, 90)], 1.6))
    # leaves along the stems
    for x, y, ln, a in [
        (60, 52, 70, -20), (120, 72, 64, 30), (170, 120, 60, -40), (220, 190, 58, 10),
        (280, 236, 54, -30), (70, 70, 58, 100), (95, 130, 60, 160), (150, 175, 55, 70),
        (185, 240, 52, 120), (195, 290, 46, 60), (40, 150, 46, 40), (165, 50, 46, -60),
        (210, 85, 44, 20),
    ]:
        parts.append(leaf(x, y, ln, a + rng.uniform(-6, 6)))
    # flowers
    parts.append(nemophila(120, 115, 44, 12))
    parts.append(nemophila(255, 215, 34, 40))
    parts.append(nemophila(60, 205, 30, 5))
    parts.append(cornflower(200, 160, 26, 0))
    parts.append(cornflower(245, 90, 20, 10))
    parts.append(nemophila(200, 330, 22, 20))
    parts.append(nemophila(30, 30, 30, 50))
    # buds
    for x, y, s, a in [(330, 250, 10, 70), (300, 180, 9, 40), (110, 215, 8, 200), (240, 300, 8, 150), (170, 10, 8, 20)]:
        parts.append(bud(x, y, s, a))
    parts.append(dots(rng, 300, 290, 26, 6))
    parts.append(dots(rng, 290, 130, 22, 5))
    return emboss_svg(380, 380, "".join(parts), "Embossed blue flowers")


def sprig():
    """Small symmetric ornament for dividers."""
    rng = random.Random(27)
    parts = []
    parts.append(stem([(20, 40), (90, 30), (160, 40)], 1.4))
    parts.append(stem([(160, 40), (230, 30), (300, 40)], 1.4))
    for x, a in ((60, -160), (95, 160), (120, -150), (200, -30), (225, 20), (260, -20)):
        parts.append(leaf(x if a > -90 and a < 90 else x + 10, 36, 36, a))
    parts.append(nemophila(160, 38, 20, 0))
    parts.append(cornflower(122, 30, 10, 0))
    parts.append(cornflower(198, 30, 10, 20))
    parts.append(bud(30, 40, 6, -100))
    parts.append(bud(290, 40, 6, 100))
    parts.append(dots(rng, 160, 12, 6, 2))
    return emboss_svg(320, 80, "".join(parts), "Embossed flower ornament")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in (("emboss-corner.svg", corner()), ("emboss-sprig.svg", sprig())):
        (OUT / name).write_text(data, encoding="utf-8")
        print("wrote", name, f"{len(data) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
