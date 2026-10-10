"""Blender scene: the navy letterpress envelope opening onto the hero film.

Builds everything from scratch (no .blend file needed) and renders a PNG sequence.

    blender -b --factory-startup -P tools/blender/envelope.py -- \
        --orient portrait --frames 1-96 --samples 48 --scale 100

Options
    --orient   portrait | landscape
    --frames   e.g. 1-72 or 22 (single frame for previews)
    --samples  Cycles samples (denoised)
    --scale    resolution percentage (use 50 for quick previews)
    --out      output folder (default tools/blender/build/<orient>)

Geometry matches the website: the four flaps use the same rounded-tip shapes
(textures/mask_*.png), the embossed flowers come from textures/height_*.png,
and the hero video plays as a texture under the flaps so the render ends
exactly where the live video continues.
"""

import argparse
import math
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TEX = HERE / "textures"
FONTS = HERE / "fonts"

FPS = 30
KEY_ENERGY = 3080  # calibrated so the paper renders at its true colour


# ---------------------------------------------------------------- arguments
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--orient", default="portrait", choices=["portrait", "landscape"])
    p.add_argument("--frames", default="1-96")
    p.add_argument("--samples", type=int, default=48)
    p.add_argument("--scale", type=int, default=100)
    p.add_argument("--out", default=None)
    return p.parse_args(argv)


ARGS = parse_args()
PORTRAIT = ARGS.orient == "portrait"
PX_W, PX_H = (1080, 1920) if PORTRAIT else (1920, 1080)
W, H = (9.0, 16.0) if PORTRAIT else (16.0, 9.0)   # world units, 1 unit = 120 px
SEAL_R = (167 if PORTRAIT else 100) / PX_W * W     # matches the site's seal size
VIDEO = ROOT / "assets" / "video" / ("hero-portrait.mp4" if PORTRAIT else "hero.mp4")


def srgb(hex_):
    """sRGB hex → linear RGBA for Blender colour sockets."""
    h = hex_.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


PAPER = srgb("#1d2148")          # navy cardstock (renders as ≈ #262b52)
PAPER_RAISED = srgb("#323b78")   # raised flowers: clearly lighter than the paper   # embossed flowers catch a little light
PAPER_INSIDE = srgb("#161a3a")   # inside of the envelope
WAX = srgb("#c9d6ee")            # pale pearl-blue wax, bright on navy
FOIL = srgb("#dfe6f4")           # silver foil lines
LINER = srgb("#34407e")          # printed flowers inside the envelope
LINEN = srgb("#eee9e0")          # tablecloth


# ---------------------------------------------------------------- scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.render.fps = FPS
    sc.render.resolution_x = PX_W
    sc.render.resolution_y = PX_H
    sc.render.resolution_percentage = ARGS.scale
    sc.render.film_transparent = False
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.45
    sc.view_settings.view_transform = "Standard"   # video & paper colours pass through untouched
    sc.view_settings.look = "None"
    sc.cycles.samples = ARGS.samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6

    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("HIP", "OPTIX", "CUDA", "ONEAPI", "METAL"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                sc.cycles.device = "GPU"
                print("render device:", kind)
                break
        except TypeError:
            continue

    world = bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = srgb("#eef3fb")
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.34
    return sc


def node(tree, kind, **inputs):
    n = tree.nodes.new(kind)
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def load_image(path, non_color=True):
    img = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img


def grid(name, sub_x, sub_y):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=sub_x, y_subdivisions=sub_y, size=1, calc_uvs=True)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (W, H, 1)
    bpy.ops.object.transform_apply(scale=True)
    return ob


# ---------------------------------------------------------------- materials
def video_material():
    mat = bpy.data.materials.new("Film")
    mat.use_nodes = True
    t = mat.node_tree
    t.nodes.clear()
    out = t.nodes.new("ShaderNodeOutputMaterial")
    tex = t.nodes.new("ShaderNodeTexImage")
    img = bpy.data.images.load(str(VIDEO))
    img.source = "MOVIE"
    tex.image = img
    tex.image_user.frame_duration = 300
    tex.image_user.frame_start = 1
    tex.image_user.frame_offset = 0
    tex.image_user.use_auto_refresh = True
    emit = node(t, "ShaderNodeEmission", Strength=1.0)
    t.links.new(tex.outputs["Color"], emit.inputs["Color"])
    t.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def paper_material(flap, embossed):
    mat = bpy.data.materials.new(f"Paper_{flap}")
    mat.use_nodes = True
    t = mat.node_tree
    t.nodes.clear()
    out = t.nodes.new("ShaderNodeOutputMaterial")
    uv = t.nodes.new("ShaderNodeTexCoord")

    def image(name):
        n = t.nodes.new("ShaderNodeTexImage")
        n.image = load_image(TEX / name)
        n.extension = "CLIP"
        t.links.new(uv.outputs["UV"], n.inputs["Vector"])
        return n

    mask = image(f"mask_{flap}_{ARGS.orient}.png")
    height = image(f"height_{ARGS.orient}.png")
    foil = image(f"foil_{ARGS.orient}.png")

    # --- paper: navy outside; inside (backfacing) a printed floral liner
    geo = t.nodes.new("ShaderNodeNewGeometry")
    outside = t.nodes.new("ShaderNodeMix")
    outside.data_type = "RGBA"
    outside.inputs["A"].default_value = PAPER
    outside.inputs["B"].default_value = PAPER_RAISED
    t.links.new(height.outputs["Color"], outside.inputs["Factor"])
    inside = t.nodes.new("ShaderNodeMix")
    inside.data_type = "RGBA"
    inside.inputs["A"].default_value = PAPER_INSIDE
    inside.inputs["B"].default_value = LINER
    t.links.new(height.outputs["Color"], inside.inputs["Factor"])
    col = t.nodes.new("ShaderNodeMix")
    col.data_type = "RGBA"
    t.links.new(geo.outputs["Backfacing"], col.inputs["Factor"])
    t.links.new(outside.outputs["Result"], col.inputs["A"])
    t.links.new(inside.outputs["Result"], col.inputs["B"])

    paper = node(t, "ShaderNodeBsdfPrincipled", Roughness=0.68)
    paper.inputs["Specular IOR Level"].default_value = 0.22  # matte cardstock
    t.links.new(col.outputs["Result"], paper.inputs["Base Color"])

    # fibres + embossing
    grain = node(t, "ShaderNodeTexNoise", Scale=900.0, Detail=6.0, Roughness=0.6)
    t.links.new(uv.outputs["UV"], grain.inputs["Vector"])
    bump_grain = node(t, "ShaderNodeBump", Strength=0.06, Distance=0.002)
    t.links.new(grain.outputs["Fac"], bump_grain.inputs["Height"])
    if embossed:
        bump = node(t, "ShaderNodeBump", Strength=1.5, Distance=0.05)
        t.links.new(height.outputs["Color"], bump.inputs["Height"])
        t.links.new(bump_grain.outputs["Normal"], bump.inputs["Normal"])
        t.links.new(bump.outputs["Normal"], paper.inputs["Normal"])
    else:
        t.links.new(bump_grain.outputs["Normal"], paper.inputs["Normal"])

    # --- fine silver foil lines, slightly pressed into the paper
    metal = node(t, "ShaderNodeBsdfPrincipled", Metallic=1.0, Roughness=0.24)
    metal.inputs["Base Color"].default_value = FOIL
    t.links.new(bump_grain.outputs["Normal"], metal.inputs["Normal"])
    foiled = t.nodes.new("ShaderNodeMixShader")
    t.links.new(foil.outputs["Color"], foiled.inputs["Fac"])
    t.links.new(paper.outputs["BSDF"], foiled.inputs[1])
    t.links.new(metal.outputs["BSDF"], foiled.inputs[2])

    # --- cut out the flap shape
    clear = t.nodes.new("ShaderNodeBsdfTransparent")
    shape = t.nodes.new("ShaderNodeMixShader")
    t.links.new(mask.outputs["Color"], shape.inputs["Fac"])
    t.links.new(clear.outputs["BSDF"], shape.inputs[1])
    t.links.new(foiled.outputs["Shader"], shape.inputs[2])
    t.links.new(shape.outputs["Shader"], out.inputs["Surface"])
    return mat


def linen_material():
    mat = bpy.data.materials.new("Linen")
    mat.use_nodes = True
    t = mat.node_tree
    bsdf = t.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = LINEN
    bsdf.inputs["Roughness"].default_value = 0.85
    uv = t.nodes.new("ShaderNodeTexCoord")
    warp = node(t, "ShaderNodeTexWave", Scale=420.0, Distortion=1.5)
    weft = node(t, "ShaderNodeTexWave", Scale=420.0, Distortion=1.5)
    weft.bands_direction = "Y"
    t.links.new(uv.outputs["Generated"], warp.inputs["Vector"])
    t.links.new(uv.outputs["Generated"], weft.inputs["Vector"])
    weave = t.nodes.new("ShaderNodeMath")
    weave.operation = "MULTIPLY"
    t.links.new(warp.outputs["Fac"], weave.inputs[0])
    t.links.new(weft.outputs["Fac"], weave.inputs[1])
    bump = node(t, "ShaderNodeBump", Strength=0.12, Distance=0.01)
    t.links.new(weave.outputs["Value"], bump.inputs["Height"])
    t.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def wax_material():
    mat = bpy.data.materials.new("Wax")
    mat.use_nodes = True
    t = mat.node_tree
    bsdf = t.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = WAX
    bsdf.inputs["Roughness"].default_value = 0.3
    bsdf.inputs["Coat Weight"].default_value = 0.7
    bsdf.inputs["Sheen Weight"].default_value = 0.25
    bsdf.inputs["Coat Roughness"].default_value = 0.14
    bsdf.inputs["Subsurface Weight"].default_value = 0.12
    bsdf.inputs["Subsurface Radius"].default_value = (0.4, 0.4, 0.8)
    bsdf.inputs["Subsurface Scale"].default_value = 0.05
    # gentle irregularity of poured wax
    noise = node(t, "ShaderNodeTexNoise", Scale=6.0, Detail=4.0)
    bump = node(t, "ShaderNodeBump", Strength=0.18, Distance=0.05)
    t.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    t.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# ---------------------------------------------------------------- objects
def make_film():
    ob = grid("Film", 2, 2)
    ob.data.materials.append(video_material())
    return ob


FLAPS = {
    # name: (z, hinge location, rotation axis index, open angle, direction the flap extends, embossed)
    "left":   (0.010, (-W / 2, 0), 1, -178, (1, 0), False),
    "right":  (0.012, (W / 2, 0), 1, 178, (-1, 0), False),
    "bottom": (0.020, (0, -H / 2), 0, 178, (0, 1), True),
    "top":    (0.030, (0, H / 2), 0, -178, (0, -1), True),
}


def flap_reach(name):
    """Distance from the hinge to the flap's tip."""
    return (W / 2 if name in ("left", "right") else H / 2) * 1.03


def curl(co, ex, ey, start, radius):
    """Roll the paper up (towards +z) beyond `start` along the flap direction."""
    d = co.x * ex + co.y * ey          # distance from the hinge
    if d <= start:
        return co.x, co.y, co.z
    phi = (d - start) / radius
    along = start + radius * math.sin(phi)
    lift = radius * (1 - math.cos(phi))
    side_x, side_y = co.x - d * ex, co.y - d * ey
    return side_x + along * ex, side_y + along * ey, lift


def make_flap(name):
    z, (hx, hy), axis, _, (ex, ey), embossed = FLAPS[name]
    ob = grid(f"Flap_{name}", 120, 210 if PORTRAIT else 120)
    for v in ob.data.vertices:          # pivot on the hinge edge
        v.co.x -= hx
        v.co.y -= hy
    ob.location = (hx, hy, z)
    ob.data.materials.append(paper_material(name, embossed))

    # shape keys: the tip peels up first, then the whole flap flexes
    reach = flap_reach(name)
    ob.shape_key_add(name="Basis")
    for key, start, radius in (("Peel", reach * 0.62, reach * 0.28), ("Flex", reach * 0.05, reach * 1.6)):
        sk = ob.shape_key_add(name=key)
        sk.value = 0.0                 # new keys start fully on in Blender 5: start flat
        for v, kv in zip(ob.data.vertices, sk.data):
            kv.co = curl(v.co, ex, ey, start, radius)
    for poly in ob.data.polygons:
        poly.use_smooth = True
    return ob


def wax_profile(s, r):
    """Height of the wax at normalised radius s (0 = centre, 1 = outer edge)."""
    floor, lip, shoulder = 0.10 * r, 0.19 * r, 0.16 * r
    if s <= 0.64:
        return floor
    if s <= 0.70:                      # wall of the stamp, rising to the lip
        t = (s - 0.64) / 0.06
        return floor + (lip - floor) * (t * t * (3 - 2 * t))
    if s <= 0.76:                      # rounded lip
        t = (s - 0.70) / 0.06
        return lip - (lip - shoulder) * t
    t = min(1.0, (s - 0.76) / 0.24)    # poured edge rolling down to the paper
    return shoulder * math.cos(t * math.pi / 2) ** 0.55


def make_seal(parent):
    import bmesh

    wax = wax_material()
    r = SEAL_R
    top_z = FLAPS["top"][0] + 0.004
    rings, segs = 90, 220

    def outline(theta):
        # irregular pour + two little drips
        k = 1 + 0.035 * math.sin(3 * theta + 0.6) + 0.022 * math.sin(7 * theta + 1.9) + 0.012 * math.sin(13 * theta)
        for centre, width, amount in ((-0.45, 0.16, 0.13), (2.35, 0.12, 0.09)):
            d = math.atan2(math.sin(theta - centre), math.cos(theta - centre))
            k += amount * math.exp(-(d / width) ** 2)
        return r * k

    bm = bmesh.new()
    centre = bm.verts.new((0, 0, wax_profile(0, r)))
    grid_v = []
    for i in range(1, rings + 1):
        s = i / rings
        row = []
        for j in range(segs):
            th = 2 * math.pi * j / segs
            R = outline(th) if s > 0.76 else r * (1 + 0.004 * math.sin(5 * th))
            rho = s * R if s > 0.76 else s * r
            row.append(bm.verts.new((rho * math.cos(th), rho * math.sin(th), wax_profile(s, r))))
        grid_v.append(row)
    for j in range(segs):
        bm.faces.new((centre, grid_v[0][j], grid_v[0][(j + 1) % segs]))
    for i in range(rings - 1):
        for j in range(segs):
            a_, b_ = grid_v[i][j], grid_v[i][(j + 1) % segs]
            c_, d_ = grid_v[i + 1][(j + 1) % segs], grid_v[i + 1][j]
            bm.faces.new((a_, d_, c_, b_))
    mesh = bpy.data.meshes.new("Seal")
    bm.to_mesh(mesh)
    bm.free()
    body = bpy.data.objects.new("Seal", mesh)
    bpy.context.collection.objects.link(body)
    for poly in mesh.polygons:
        poly.use_smooth = True
    body.modifiers.new("Smooth", "SUBSURF").levels = 1

    # stamped monogram A & C, standing on the floor of the well
    parts = [body]
    floor = wax_profile(0, r)
    for ch, font, size, x, y in (
        ("A", "Ephesis-Regular.ttf", 0.92, -0.3, -0.02),
        ("&", "CormorantGaramond-Italic.ttf", 0.42, 0.0, -0.06),
        ("C", "Ephesis-Regular.ttf", 0.92, 0.31, -0.02),
    ):
        bpy.ops.object.text_add(location=(r * x, r * y, floor + r * 0.045))
        txt = bpy.context.active_object
        txt.data.body = ch
        txt.data.font = bpy.data.fonts.load(str(FONTS / font), check_existing=True)
        txt.data.size = r * size
        txt.data.align_x = "CENTER"
        txt.data.align_y = "CENTER"
        txt.data.extrude = r * 0.045
        txt.data.bevel_depth = r * 0.006
        txt.data.bevel_resolution = 2
        bpy.ops.object.convert(target="MESH")
        parts.append(txt)

    for ob in parts:
        ob.data.materials.clear()
        ob.data.materials.append(wax)
        ob.location.z += top_z
        ob.select_set(False)

    # ride on a mount that follows the curling paper of the top flap
    mount = bpy.data.objects.new("SealMount", None)
    bpy.context.collection.objects.link(mount)
    mount.parent = parent
    mount.location = (0, -H / 2, 0)            # seal centre, in the flap's hinge space
    for ob in parts:
        ob.location.z -= top_z
        ob.parent = mount
        ob.location.z += 0.004
    return parts


def make_lights():
    key = bpy.data.lights.new("Key", "AREA")
    key.shape = "DISK"
    key.size = max(W, H) * 0.9
    key.energy = KEY_ENERGY * (1 if PORTRAIT else 1.2)
    ko = bpy.data.objects.new("Key", key)
    bpy.context.collection.objects.link(ko)
    ko.location = (-W * 0.55, H * 0.42, max(W, H) * 1.25)
    ko.rotation_euler = (math.radians(-22), math.radians(-24), 0)

    fill = bpy.data.lights.new("Fill", "AREA")
    fill.size = max(W, H) * 1.5
    fill.energy = KEY_ENERGY * 0.25 * (1 if PORTRAIT else 1.2)
    fo = bpy.data.objects.new("Fill", fill)
    bpy.context.collection.objects.link(fo)
    fo.location = (W * 0.6, -H * 0.4, max(W, H) * 1.4)
    fo.rotation_euler = (math.radians(18), math.radians(20), 0)


def make_table():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.06))
    table = bpy.context.active_object
    table.name = "Table"
    table.scale = (W * 4, H * 4, 1)
    table.data.materials.append(linen_material())


def make_camera():
    cam = bpy.data.cameras.new("Camera")
    # long lens: flaps fold back towards their own edge instead of looming over the centre
    cam.lens = 200
    cam.sensor_width = 36
    cam.sensor_fit = "HORIZONTAL"
    cam.clip_end = 2000
    ob = bpy.data.objects.new("Camera", cam)
    bpy.context.collection.objects.link(ob)
    framed = (W / 2) * cam.lens / (cam.sensor_width / 2)   # envelope exactly fills the frame
    bpy.context.scene.camera = ob
    # the envelope fills the screen from the first frame (no table border)
    ob.location.z = framed
    return ob


# ---------------------------------------------------------------- animation
def ease_keys(ob, path, index, frames_values):
    for f, v in frames_values:
        if index is None:
            setattr(ob, path, v)
            ob.keyframe_insert(path, frame=f)
        else:
            getattr(ob, path)[index] = v
            ob.keyframe_insert(path, index=index, frame=f)
    if ob.animation_data and ob.animation_data.action:
        for fc in getattr(ob.animation_data.action, "fcurves", []):
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.easing = "AUTO"
                kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"


TIMING = {
    # every flap opens the same natural way, one after another:
    # the tip is lifted, the paper flexes, the flap folds back over its own edge
    "top": (8, 46),
    "left": (32, 66),
    "right": (35, 69),
    "bottom": (42, 78),
    "end": 92,
}


def key_value(block, frames_values):
    for f, v in frames_values:
        block.value = v
        block.keyframe_insert("value", frame=f)


def smooth_keys(id_data):
    ad = id_data.animation_data
    action = ad.action if ad else None
    for fc in getattr(action, "fcurves", []) or []:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"


def curve(points, f):
    """Smooth (ease-in-out) interpolation through (frame, value) points."""
    if f <= points[0][0]:
        return points[0][1]
    for (f0, v0), (f1, v1) in zip(points, points[1:]):
        if f <= f1:
            t = (f - f0) / (f1 - f0)
            t = t * t * (3 - 2 * t)
            return v0 + (v1 - v0) * t
    return points[-1][1]


def curl_flap(name, flap, last_frame, peel_pts, flex_pts, mount=None):
    """Key the flap's peel / flex frame by frame; optionally keep the seal on the paper."""
    _, _, _, _, (ex, ey), _ = FLAPS[name]
    reach = flap_reach(name)
    keys = flap.data.shape_keys

    class P:  # minimal stand-in for a vertex coordinate
        def __init__(self, x, y):
            self.x, self.y, self.z = x, y, 0.0

    def deformed(d, peel, flex):
        x, y = d * ex, d * ey
        px, py, pz = curl(P(x, y), ex, ey, reach * 0.62, reach * 0.28)
        fx, fy, fz = curl(P(x, y), ex, ey, reach * 0.05, reach * 1.6)
        return (x + peel * (px - x) + flex * (fx - x),
                y + peel * (py - y) + flex * (fy - y),
                peel * pz + flex * fz)

    for f in range(1, last_frame + 1):
        peel = curve(peel_pts, f)
        flex = curve(flex_pts, f)
        # paper (and seal) are keyed from the same numbers, frame by frame
        keys.key_blocks["Peel"].value = peel
        keys.key_blocks["Peel"].keyframe_insert("value", frame=f)
        keys.key_blocks["Flex"].value = flex
        keys.key_blocks["Flex"].keyframe_insert("value", frame=f)
        if mount is None:
            continue
        d0 = H / 2
        a = deformed(d0, peel, flex)
        b = deformed(d0 + 0.05, peel, flex)
        mount.location = a
        along = math.hypot(b[0] - a[0], b[1] - a[1])
        mount.rotation_euler = (-math.atan2(b[2] - a[2], along), 0, 0)
        mount.keyframe_insert("location", frame=f)
        mount.keyframe_insert("rotation_euler", frame=f)


def animate(flaps):
    for name, ob in flaps.items():
        _, _, axis, _, _, _ = FLAPS[name]
        a, b = TIMING[name]
        span = b - a
        sign = -1 if name in ("top", "left") else 1
        # a hesitant release, then a long smooth fold right over its own edge
        ease_keys(ob, "rotation_euler", axis, [
            (a, 0.0),
            (a + span * 0.2, math.radians(4) * sign),
            (b, math.radians(180) * sign),
        ])
        # the sealed top flap is lifted most decisively; the others are lighter
        top = name == "top"
        peel_pts = [(a - 4, 0.0), (a + span * 0.25, 1.0 if top else 0.7), (a + span * 0.6, 0.3 if top else 0.2), (b, 0.0)]
        flex_pts = [(a, 0.0), (a + span * 0.5, 0.7 if top else 0.6), (b, 0.0)]
        curl_flap(name, ob, TIMING["end"], peel_pts, flex_pts,
                  bpy.data.objects["SealMount"] if top else None)


# ---------------------------------------------------------------- main
def main():
    sc = reset()
    make_lights()
    make_table()
    make_film()
    flaps = {name: make_flap(name) for name in ("left", "right", "bottom", "top")}
    make_seal(flaps["top"])
    animate(flaps)
    make_camera()

    first, last = (ARGS.frames.split("-") + [None])[:2]
    sc.frame_start = int(first)
    sc.frame_end = int(last or first)
    out = Path(ARGS.out) if ARGS.out else HERE / "build" / ARGS.orient
    out.mkdir(parents=True, exist_ok=True)
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = str(out / "f")
    bpy.ops.render.render(animation=True)


main()
