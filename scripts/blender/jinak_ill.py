# Ilustrasi Jinak Bom (tile menu, menang, kalah, ikon peran) dari model GLB bertekstur hasil jinak.py.
# Dirender Cycles (bukan AI) dengan garis tinta Freestyle & latar transparan, lalu:
#   python -I scripts/blender/export.py jinak
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

SKY = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'sport' / 'tex' / 'langit-senja.hdr'


def lin(h):
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        v = int(h[i:i + 2], 16) / 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = 64
    s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'AgX - Medium High Contrast'
    s.view_settings.exposure = 0.35
    global NOLINES
    NOLINES = bpy.data.collections.new('nolines')
    s.collection.children.link(NOLINES)
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    nt = w.node_tree
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(str(SKY))
    nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = 1.1
    s.world = w
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(48), math.radians(12), math.radians(-35))
    s.collection.objects.link(sun)
    key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'AREA'))
    key.data.energy = 450
    key.data.size = 4
    key.location = (2.5, -6, 4)
    key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat('-Z', 'Y').to_euler()
    s.collection.objects.link(key)
    # garis tinta
    s.render.use_freestyle = True
    s.render.line_thickness_mode = 'ABSOLUTE'
    s.render.line_thickness = 2.2
    fs = s.view_layers[0].freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.linestyle = ls.linestyle or bpy.data.linestyles.new('ink')
    ls.linestyle.color = (0.007, 0.007, 0.007)
    ls.linestyle.thickness = 2.2
    ls.select_by_visibility = True
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = False
    ls.select_by_collection = True
    ls.collection = NOLINES
    ls.collection_negation = 'EXCLUSIVE'
    return s


NOLINES = None


def nolines(o):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    NOLINES.objects.link(o)
    return o


def load(models, name, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(models / f'{name}.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name + '-root', None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    root.location = loc
    root.rotation_euler = rot
    root.scale = (scale,) * 3
    return root, new


def emissive(name, color, strength=6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(color)
    p.inputs['Emission Color'].default_value = lin(color)
    p.inputs['Emission Strength'].default_value = strength
    return m


def solid(name, color, rough=0.4, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    return m


def wire(pts, color, r=0.022):
    cu = bpy.data.curves.new('kabel', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 5
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for p, co in zip(sp.bezier_points, pts):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('kabel', cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(solid('karet-' + color, color, 0.35, 0, 0.5))
    return o


def text(body, loc, size, mat, rot=(math.radians(90), 0, 0)):
    cu = bpy.data.curves.new('t', 'FONT')
    cu.body = body
    cu.size = size
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.extrude = 0.004
    o = bpy.data.objects.new('t', cu)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def camera(loc, target, lens=50, ortho=None):
    cd = bpy.data.cameras.new('cam')
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    cd.lens = lens
    cam = bpy.data.objects.new('cam', cd)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = Vector(loc)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def render(out, res):
    s = bpy.context.scene
    s.render.resolution_x, s.render.resolution_y = res
    s.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out, flush=True)


# posisi slot (Blender: muka depan di -Y) sama dengan jinak.py
SLOT, GAP, COLS = 0.8, 0.1, 4
FW = COLS * SLOT + (COLS + 1) * GAP
FH = 2 * SLOT + 3 * GAP


def slot_pos(k):
    c, r = k % COLS, k // COLS
    return (-FW / 2 + GAP + SLOT / 2 + c * (SLOT + GAP), -0.5 - 0.045, FH / 2 - GAP - SLOT / 2 - r * (SLOT + GAP))


def bomb(models, leds='#222222', cut=False, timer_txt='1:23', timer_col='#ff3a24'):
    """bom lengkap: casing + timer + kabel + tombol + simbol + gembok; LED diberi warna"""
    load(models, 'casing')
    rot = (math.radians(90), 0, 0)  # GLB Y-atas → Blender Z-atas sudah dikonversi importer; panel menghadap -Y
    for k in range(8):
        x, y, z = slot_pos(k)
        if k == 1:
            load(models, 'timer', (x, y + 0.025, z))
            nolines(text(timer_txt, (x, y - 0.04, z + 0.05), 0.2, emissive('led-timer', timer_col, 12)))
        elif k in (0, 2, 4, 5):
            load(models, 'panel', (x, y + 0.025, z))
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=(x + 0.3, y - 0.03, z + 0.3))
            bpy.context.object.data.materials.append(emissive('led', leds, 8 if leds != '#222222' else 0))
        else:
            load(models, 'blank', (x, y + 0.025, z))
    # kabel di slot 0
    x, y, z = slot_pos(0)
    cols = ['#e0262f', '#1f5fe0', '#f4c21b', '#f2f2ee']
    for i, c in enumerate(cols):
        zz = z + 0.16 - i * 0.14
        if cut and i == 1:
            wire([(x - 0.27, y - 0.06, zz), (x - 0.1, y - 0.12, zz - 0.02), (x - 0.04, y - 0.16, zz - 0.06)], c)
            wire([(x + 0.27, y - 0.06, zz), (x + 0.1, y - 0.12, zz + 0.02), (x + 0.05, y - 0.16, zz + 0.05)], c)
        else:
            wire([(x - 0.27, y - 0.06, zz), (x - 0.1, y - 0.11, zz + 0.02), (x + 0.1, y - 0.11, zz - 0.02), (x + 0.27, y - 0.06, zz)], c)
    # tombol merah di slot 2
    x, y, z = slot_pos(2)
    load(models, 'button', (x - 0.07, y - 0.0, z - 0.04), (0, 0, 0), 1.35)
    # tuts simbol di slot 4
    x, y, z = slot_pos(4)
    for i in range(4):
        load(models, 'key', (x + (0.15 if i % 2 else -0.15), y - 0.035, z + (0.1 if i < 2 else -0.2)), (0, 0, 0), 1.25)
    # roda gembok di slot 5
    x, y, z = slot_pos(5)
    for i in range(3):
        load(models, 'dial', (x - 0.2 + i * 0.2, y - 0.08, z - 0.12), (0, 0, 0), 1.15)
    # baterai di atas
    for i in range(2):
        load(models, 'battery', (-0.75 + i * 1.5, 0.05, FH / 2 + 0.085))
    rot  # noqa: B018


def tile(models, out):
    reset()
    bomb(models)
    load(models, 'mug', (-2.6, -0.7, -FH / 2 - 0.045), (0, 0, 0.6), 1.2)
    load(models, 'driver', (2.3, -1.1, -FH / 2 + 0.02), (0, 0, 0.5))
    camera((3.6, -6.4, 2.6), (0, 0, -0.1), 42)
    render(out / 'tile-jinak.png', (900, 900))


def win(models, out):
    reset()
    bomb(models, leds='#45ff3a', cut=True, timer_txt='0:42', timer_col='#5cf64a')
    rnd = random.Random(4)
    for _ in range(70):
        bpy.ops.mesh.primitive_plane_add(size=0.16, location=(rnd.uniform(-2.4, 2.4), rnd.uniform(-1.6, -0.6), rnd.uniform(0.4, 2.2)))
        o = bpy.context.object
        o.rotation_euler = (rnd.random() * 6, rnd.random() * 6, rnd.random() * 6)
        o.data.materials.append(emissive('konfeti', rnd.choice(['#5cf64a', '#ff37a6', '#ffcc1f', '#87e752', '#ffcae9']), 0.8))
        nolines(o)
    camera((2.8, -6.6, 2.2), (0, 0, 0.2), 40)
    render(out / 'jinak-win.png', (720, 720))


def lose(models, out):
    reset()
    bomb(models, leds='#ff2a2a', timer_txt='0:00')
    soot = solid('jelaga', '#2a2626', 0.95)
    rnd = random.Random(9)
    for _ in range(26):
        r = rnd.uniform(0.25, 0.6)
        bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=3, location=(rnd.uniform(-1.8, 1.8), rnd.uniform(-0.3, 0.6), rnd.uniform(0.9, 2.4)))
        o = bpy.context.object
        d = o.modifiers.new('d', 'DISPLACE')
        d.texture = bpy.data.textures.new('awan', 'CLOUDS')
        d.strength = 0.18
        bpy.ops.object.shade_smooth()
        o.data.materials.append(soot if rnd.random() < 0.6 else solid('asap', '#8c8288', 0.9))
        if rnd.random() < 0.5:
            nolines(o)
    for _ in range(18):
        bpy.ops.mesh.primitive_cone_add(radius1=0.04, depth=0.35, location=(rnd.uniform(-2, 2), rnd.uniform(-1, 0), rnd.uniform(0.2, 2.0)))
        o = bpy.context.object
        o.rotation_euler = (rnd.random() * 6, rnd.random() * 6, 0)
        o.data.materials.append(emissive('api', rnd.choice(['#ffcc1f', '#ff8a1c', '#ff37a6']), 10))
        nolines(o)
    camera((2.8, -6.6, 2.2), (0, 0, 0.4), 40)
    render(out / 'jinak-lose.png', (720, 720))


def role_penjinak(models, out):
    reset()
    load(models, 'driver', (0, 0, 0.2), (0, math.radians(-25), math.radians(20)), 2.2)
    for i, c in enumerate(['#e0262f', '#1f5fe0', '#f4c21b']):
        wire([(-0.9, -0.2 + i * 0.12, -0.3 + i * 0.05), (-0.3, -0.4, 0.3), (0.3, 0.2, -0.2), (0.9, -0.1 + i * 0.1, 0.25)], c, 0.04)
    camera((0, -4.5, 1.2), (0, 0, 0.05), 50)
    render(out / 'role-penjinak.png', (480, 480))


def role_pakar(models, out):
    reset()
    cover = solid('sampul', '#ff37a6', 0.5)
    pages = solid('halaman', '#f2e6cc', 0.85)
    for i, (h, m) in enumerate(((0.04, cover), (0.16, pages), (0.04, cover))):
        z = [0.0, 0.1, 0.2][i]
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, z))
        o = bpy.context.object
        o.scale = (1.3 if m is cover else 1.24, 0.95 if m is cover else 0.9, h)
        bv = o.modifiers.new('b', 'BEVEL')
        bv.width = 0.02
        bv.segments = 3
        o.data.materials.append(m)
    t = text('PANDUAN', (0, 0, 0.245), 0.17, solid('tinta', '#fff4fa', 0.6), (0, 0, 0))
    nolines(t)
    load(models, 'mug', (1.05, 0.45, -0.02), (0, 0, 2.2), 1.1)
    camera((1.8, -3.6, 3.2), (0.15, 0.1, 0.1), 50)
    render(out / 'role-pakar.png', (480, 480))


def main(out_dir, models):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for fn in (tile, win, lose, role_penjinak, role_pakar):
        fn(Path(models), out_dir)
