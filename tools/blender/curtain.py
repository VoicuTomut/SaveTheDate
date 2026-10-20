"""Blender scene: a navy velvet theatre curtain that draws open onto the deep-navy page.

Builds everything from scratch (no .blend file needed) and renders a PNG sequence.

    blender -b --factory-startup -P tools/blender/curtain.py -- \
        --orient portrait --frames 1-100 --samples 24 --scale 100

Options
    --orient   portrait | landscape
    --frames   e.g. 1-84 or 30 (single frame for previews)
    --samples  Cycles samples (denoised)
    --scale    resolution percentage (use 25 for quick previews)
    --out      output folder (default tools/blender/build/<orient>)

Two velvet panels hang in soft vertical folds in front of the hero film. On
opening they draw apart: the top leads and the hem trails (a natural drape),
the folds gather and deepen as the fabric bunches at the sides, and the
gathered curtain finally slips out of frame, revealing "Save the Date" on the
page's deep navy (the site's own screen, captured into textures/std_*.png).
"""

import argparse
import math
import random
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FPS = 30
KEY_ENERGY = 460    # low, raking theatrical light (the film behind is self-lit, unaffected)


# ---------------------------------------------------------------- arguments
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--orient", default="portrait", choices=["portrait", "landscape"])
    p.add_argument("--frames", default="1-100")
    p.add_argument("--samples", type=int, default=24)
    p.add_argument("--scale", type=int, default=100)
    p.add_argument("--out", default=None)
    p.add_argument("--transparent", action="store_true",
                   help="render only the curtain over a transparent background (RGBA PNGs), to be "
                        "composited over any Save the Date screen with tools/composite_curtain.py")
    return p.parse_args(argv)


ARGS = parse_args()
PORTRAIT = ARGS.orient == "portrait"
PX_W, PX_H = (1080, 1920) if PORTRAIT else (1920, 1080)
W, H = (9.0, 16.0) if PORTRAIT else (16.0, 9.0)   # world units, 1 unit = 120 px


def srgb(hex_):
    h = hex_.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


VELVET = srgb("#0e1f8a")        # saturated royal-blue body: light and shadow give the depth
VELVET_SHEEN = srgb("#5b8cff")  # royal-blue sheen on the rounded folds

# ---------------------------------------------------------------- motion
OPEN_START, OPEN_END, END = 6, 62, 100
PREROLL = 40         # simulated frames before frame 1 so the fabric has settled
STAGES = 16          # mesh states blended over time
FOLDS = 3 if PORTRAIT else 5    # broad drapes per panel
LAG = 0.30           # how much the hem trails behind the top
GATHER = 0.86        # how much of its width a panel loses when drawn
SLIP = 0.20          # extra slide (× W) that carries the gathered curtain out of frame


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.render.fps = FPS
    sc.render.resolution_x = PX_W
    sc.render.resolution_y = PX_H
    sc.render.resolution_percentage = ARGS.scale
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.45
    sc.view_settings.view_transform = "Standard"
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
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.005  # troughs fall to near-black
    sc.gravity = (0.0, -9.81 * 5.0, 0.0)   # screen-down; scaled so the 16-unit curtain falls like a real one
    return sc


def node(tree, kind, **inputs):
    n = tree.nodes.new(kind)
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


# ---------------------------------------------------------------- film behind the curtain
def make_backdrop():
    """Behind the curtain: the site's own Save the Date screen (captured from the page,
    textures/std_<orient>.png), self-lit so its colours are exact. The curtain reveals
    it, and the live page shows the identical screen once the curtain has opened."""
    def emissive(name, size, z, image=None):
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, z))
        ob = bpy.context.active_object
        ob.name = name
        ob.scale = (size[0], size[1], 1)
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        t = mat.node_tree
        t.nodes.clear()
        out = t.nodes.new("ShaderNodeOutputMaterial")
        emit = node(t, "ShaderNodeEmission", Strength=1.0)
        if image:
            tex = t.nodes.new("ShaderNodeTexImage")
            tex.image = bpy.data.images.load(str(image))
            tex.extension = "EXTEND"
            t.links.new(tex.outputs["Color"], emit.inputs["Color"])
        else:
            emit.inputs["Color"].default_value = srgb("#0f1a3d")
        t.links.new(emit.outputs["Emission"], out.inputs["Surface"])
        ob.data.materials.append(mat)

    emissive("Navy", (W * 1.4, H * 1.4), -0.01)
    emissive("SaveTheDate", (W, H), 0.0, HERE / "textures" / f"std_{ARGS.orient}.png")


# ---------------------------------------------------------------- velvet
def velvet_material():
    """Royal-navy velvet: deep body colour, strong blue sheen on the rounded
    folds, near-black troughs, and a fine directional pile."""
    mat = bpy.data.materials.new("Velvet")
    mat.use_nodes = True
    t = mat.node_tree
    bsdf = t.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = VELVET
    bsdf.inputs["Roughness"].default_value = 0.85
    bsdf.inputs["Specular IOR Level"].default_value = 0.0   # no white gloss: velvet keeps its colour
    bsdf.inputs["Sheen Weight"].default_value = 0.8
    bsdf.inputs["Sheen Roughness"].default_value = 0.3
    bsdf.inputs["Sheen Tint"].default_value = VELVET_SHEEN
    # pile: fine noise + faint vertical streaks of brushed velvet
    coord = t.nodes.new("ShaderNodeTexCoord")
    pile = node(t, "ShaderNodeTexNoise", Scale=900.0, Detail=8.0, Roughness=0.7)
    t.links.new(coord.outputs["Object"], pile.inputs["Vector"])
    streak_map = t.nodes.new("ShaderNodeMapping")
    streak_map.inputs["Scale"].default_value = (40.0, 2.0, 40.0)
    t.links.new(coord.outputs["Object"], streak_map.inputs["Vector"])
    streak = node(t, "ShaderNodeTexNoise", Scale=6.0, Detail=4.0)
    t.links.new(streak_map.outputs["Vector"], streak.inputs["Vector"])
    mix = t.nodes.new("ShaderNodeMath")
    mix.operation = "ADD"
    t.links.new(pile.outputs["Fac"], mix.inputs[0])
    t.links.new(streak.outputs["Fac"], mix.inputs[1])
    bump = node(t, "ShaderNodeBump", Strength=0.07, Distance=0.002)
    t.links.new(mix.outputs["Value"], bump.inputs["Height"])
    t.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# ---------------------------------------------------------------- curtain panels (cloth)
NX = 64 if PORTRAIT else 96      # simulation resolution (smoothed for render)
NY = 110 if PORTRAIT else 66
Z0 = 1.6           # in front of the film
A0 = 0.45          # pleat depth at the heading (deep, full folds)
FULLNESS = 1.9     # fabric is wider than the rod span, so it hangs in folds
OVERLAP = 0.015


def fold_profile(seed):
    """Broad, irregular drapes: a slow main swell plus softer secondary folds,
    each with its own phase, like real heavy fabric."""
    rng = random.Random(seed)
    f1 = FOLDS + rng.uniform(-0.3, 0.3)
    f2 = FOLDS * 2.3 + rng.uniform(-0.5, 0.5)
    f3 = FOLDS * 4.1 + rng.uniform(-0.7, 0.7)
    p1, p2, p3 = (rng.random() * math.tau for _ in range(3))

    def f(u):
        return (0.70 * math.sin(math.tau * u * f1 + p1)
                + 0.24 * math.sin(math.tau * u * f2 + p2)
                + 0.06 * math.sin(math.tau * u * f3 + p3))
    return f


def heading(side, u, s):
    """Rod position of a point along the heading (u: 0 outer edge → 1 inner edge)
    for opening progress s: rings slide to the side and bunch up, then the bunch
    is carried out of frame."""
    outer = -W / 2 - W * 0.06
    span = W / 2 * (1 + OVERLAP) + W * 0.06
    width = span * (1 - GATHER * s)
    slip = SLIP * W * smooth((s - 0.5) / 0.5)
    x = outer - slip + u * width
    # pleats: a regular zig-zag at the heading, deeper when bunched
    pleats = FOLDS * 2
    z = Z0 + A0 * (1 + 1.4 * s) * math.sin(math.pi * pleats * u)
    return (x if side < 0 else -x), z


def make_panel(side):
    name = "Curtain_L" if side < 0 else "Curtain_R"
    profile = fold_profile(11 if side < 0 else 23)
    top = H / 2 * 1.04
    mesh = bpy.data.meshes.new(name)
    verts, faces = [], []
    for j in range(NY + 1):
        v = j / NY
        y = -H / 2 * 1.04 + v * (2 * top)
        for i in range(NX + 1):
            u = i / NX
            x, z = heading(side, u, 0.0)
            # below the heading the folds soften into broad, irregular drapes
            z = Z0 + (z - Z0) * v ** 2 + A0 * 0.9 * profile(u) * (1 - v ** 2)
            verts.append((x, y, z))
    for j in range(NY):
        for i in range(NX):
            a = j * (NX + 1) + i
            quad = (a, a + 1, a + NX + 2, a + NX + 1)
            faces.append(quad if side < 0 else tuple(reversed(quad)))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    for poly in mesh.polygons:
        poly.use_smooth = True
    ob.data.materials.append(velvet_material())

    # the heading is pinned to the rod
    pin = ob.vertex_groups.new(name="Pin")
    pin.add([NY * (NX + 1) + i for i in range(NX + 1)], 1.0, "REPLACE")

    # opening: a shape key moves the heading along the rod (the pins follow it)
    ob.shape_key_add(name="Basis")
    sk = ob.shape_key_add(name="Open")
    sk.value = 0.0
    for idx, kv in enumerate(sk.data):
        j, i = divmod(idx, NX + 1)
        if j == NY:
            x, z = heading(side, i / NX, 1.0)
            kv.co = (x, kv.co.y, z)
    for f in range(OPEN_START - PREROLL, END + 1):
        sk.value = smooth((f - OPEN_START) / (OPEN_END - OPEN_START))
        sk.keyframe_insert("value", frame=f)

    # heavy velvet
    cloth = ob.modifiers.new("Cloth", "CLOTH")
    cs = cloth.settings
    cs.quality = 10
    cs.mass = 0.6
    cs.air_damping = 2.0
    cs.tension_stiffness = 40
    cs.compression_stiffness = 40
    cs.shear_stiffness = 15
    cs.bending_stiffness = 2.5
    cs.tension_damping = 10
    cs.bending_damping = 1.0
    cs.vertex_group_mass = "Pin"
    cs.pin_stiffness = 2.0
    cc = cloth.collision_settings
    cc.use_collision = False
    cc.use_self_collision = True
    cc.self_distance_min = 0.02
    cc.self_friction = 5
    cache = cloth.point_cache
    cache.frame_start = OPEN_START - PREROLL
    cache.frame_end = END

    ob.modifiers.new("Smooth", "SUBSURF").levels = 2
    return ob


def bake(sc):
    sc.frame_start = OPEN_START - PREROLL
    sc.frame_end = END
    for ob in bpy.data.objects:
        if ob.name.startswith("Curtain_"):
            cache = ob.modifiers["Cloth"].point_cache
            with bpy.context.temp_override(scene=sc, active_object=ob, object=ob, point_cache=cache):
                bpy.ops.ptcache.bake(bake=True)
            print("baked", ob.name)


# ---------------------------------------------------------------- lights & camera
def make_lights():
    key = bpy.data.lights.new("Key", "AREA")
    key.shape = "DISK"
    key.size = max(W, H) * 0.9
    key.energy = KEY_ENERGY * (1 if PORTRAIT else 1.2)
    ko = bpy.data.objects.new("Key", key)
    bpy.context.collection.objects.link(ko)
    ko.location = (-W * 0.55, H * 0.42, max(W, H) * 1.25)
    ko.rotation_euler = (math.radians(-22), math.radians(-24), 0)

    # a low grazing light from the side brings out the velvet folds
    rim = bpy.data.lights.new("Rim", "AREA")
    rim.size = max(W, H) * 0.6
    rim.energy = KEY_ENERGY * 1.8 * (1 if PORTRAIT else 1.2)
    ro = bpy.data.objects.new("Rim", rim)
    bpy.context.collection.objects.link(ro)
    ro.location = (W * 1.1, H * 0.1, max(W, H) * 0.5)
    ro.rotation_euler = (0, math.radians(62), 0)

    fill = bpy.data.lights.new("Fill", "AREA")
    fill.size = max(W, H) * 1.5
    fill.energy = 0.0
    fo = bpy.data.objects.new("Fill", fill)
    bpy.context.collection.objects.link(fo)
    fo.location = (W * 0.6, -H * 0.4, max(W, H) * 1.4)
    fo.rotation_euler = (math.radians(18), math.radians(20), 0)


def make_camera():
    cam = bpy.data.cameras.new("Camera")
    cam.lens = 200                 # near-orthographic: the film fills the frame exactly
    cam.sensor_width = 36
    cam.sensor_fit = "HORIZONTAL"
    cam.clip_end = 2000
    ob = bpy.data.objects.new("Camera", cam)
    bpy.context.collection.objects.link(ob)
    ob.location = (0, 0, (W / 2) * cam.lens / (cam.sensor_width / 2))
    bpy.context.scene.camera = ob


# ---------------------------------------------------------------- main
def main():
    sc = reset()
    make_lights()
    if ARGS.transparent:
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = "RGBA"
    else:
        make_backdrop()
    for side in (-1, 1):
        make_panel(side)
    make_camera()
    bake(sc)

    first, last = (ARGS.frames.split("-") + [None])[:2]
    sc.frame_start = int(first)
    sc.frame_end = int(last or first)
    # absolute: Blender resolves relative paths against the drive root, not the shell
    out = Path(ARGS.out).resolve() if ARGS.out else HERE / "build" / ARGS.orient
    out.mkdir(parents=True, exist_ok=True)
    sc.render.image_settings.file_format = "PNG"
    if ARGS.transparent:
        sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = str(out / "f")
    bpy.ops.render.render(animation=True)


main()
