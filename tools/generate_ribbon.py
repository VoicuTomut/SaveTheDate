"""Pearl-white satin ribbon frame for the date & countdown (assets/florals/ribbon-*.svg).

A hand-drawn ribbon: each strand is a centre line (cubic Béziers) drawn as a
ribbon of varying width — its two edges are stroked and the band between them
is a faint pearl wash, so where the width pinches the ribbon reads as a twist.

  ribbon-top.svg     bow at the centre, swags to both sides curling into loops
                     with hanging tails
  ribbon-bottom.svg  the mirror swag under the countdown, tied with a small knot

    python tools/generate_ribbon.py
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "florals"
PEARL = "#f7f4ee"            # pure pearl white (mirrors --pearl in css/colors.css)
W, H = 600, 180


def f(n):
    return f"{n:.1f}".rstrip("0").rstrip(".")


def bez(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def path(start, *curves):
    """start point + cubic segments given as (c1, c2, end)."""
    pts, cur = [start], start
    for c1, c2, end in curves:
        pts += bez(cur, c1, c2, end)[1:]
        cur = end
    return pts


def ribbon(pts, width, twists=1.5, phase=0.3, taper_end=False, tail_cut=False):
    """Two edge lines + a faint band, width pinching `twists` times along the strand."""
    n = len(pts)
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        t = i / (n - 1)
        w = width * (0.28 + 0.72 * abs(math.cos(math.pi * (twists * t + phase))))
        if taper_end:
            w *= 1 - 0.55 * t ** 3
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    d = lambda ps: "M" + " L".join(f"{f(x)} {f(y)}" for x, y in ps)
    out = [f'<path class="band" d="{d(left + right[::-1])}Z"/>',
           f'<path d="{d(left)}"/>', f'<path d="{d(right)}"/>']
    if tail_cut:  # swallow-tail end
        (lx, ly), (rx, ry), (cx, cy) = left[-1], right[-1], pts[-1]
        ax, ay = pts[-1][0] - pts[-6][0], pts[-1][1] - pts[-6][1]
        ln = math.hypot(ax, ay) or 1
        mx, my = cx - ax / ln * width * 0.7, cy - ay / ln * width * 0.7
        out.append(f'<path d="M{f(lx)} {f(ly)} L{f(mx)} {f(my)} L{f(rx)} {f(ry)}"/>')
    else:
        out.append(f'<path d="M{f(left[0][0])} {f(left[0][1])} L{f(right[0][0])} {f(right[0][1])}"/>')
    return out


def mirror(pts):
    return [(W - x, y) for x, y in pts]


def side(top=True):
    """One half (left); returns list of (points, kwargs)."""
    k = 1 if top else -1
    y0 = 46 if top else H - 46
    Y = (lambda y: y) if top else (lambda y: H - y)
    swag = path((292, Y(46)),
                ((250, Y(84)), (200, Y(18)), (148, Y(44))),
                ((106, Y(66)), (86, Y(40)), (66, Y(42))),
                ((34, Y(44)), (26, Y(88)), (56, Y(90))),     # the curl
                ((84, Y(92)), (86, Y(58)), (60, Y(58))),
                ((36, Y(58)), (30, Y(86)), (36, Y(112))),    # hanging tail
                ((42, Y(138)), (24, Y(150)), (30, Y(172 if top else 170))))
    items = [(swag, dict(width=9, twists=4.5, phase=0.1, taper_end=True, tail_cut=True))]
    if top:
        loop = path((298, 42), ((282, 4), (232, 2), (234, 26)), ((236, 46), (276, 52), (296, 46)))
        tail = path((296, 48), ((286, 64), (272, 76), (280, 100)), ((284, 112), (276, 122), (270, 130)))
        items += [(loop, dict(width=10, twists=1.2, phase=0.35)),
                  (tail, dict(width=9, twists=1.3, phase=0.2, tail_cut=True))]
    return items


def svg(top):
    body = []
    for pts, kw in side(top):
        body += ribbon(pts, **kw)
        body += ribbon(mirror(pts), **kw)
    knot_y = 44 if top else H - 46
    knot = f'M293 {knot_y - 7} Q300 {knot_y - 9} 307 {knot_y - 7} Q309 {knot_y} 307 {knot_y + 7} Q300 {knot_y + 9} 293 {knot_y + 7} Q291 {knot_y} 293 {knot_y - 7}Z'
    body.append(f'<path class="band" style="fill-opacity:.16" d="{knot}"/>')
    body.append(f'<path d="{knot}"/>')
    body.append(f'<path d="M298 {knot_y - 6} Q296.5 {knot_y} 298 {knot_y + 6}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Ribbon">'
            f'<style>path,ellipse{{fill:none;stroke:{PEARL};stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round}}'
            f'.band{{fill:{PEARL};fill-opacity:.07;stroke:none}}</style>'
            + "".join(body) + "</svg>")


for name, top in (("ribbon-top.svg", True), ("ribbon-bottom.svg", False)):
    (OUT / name).write_text(svg(top), encoding="utf-8")
    print(OUT / name, (OUT / name).stat().st_size, "bytes")
