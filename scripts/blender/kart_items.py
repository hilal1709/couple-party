# Kotak item, item, dan rintangan Kart Kacau versi detail, dimodel manual di Blender (bukan AI).
#   GLB (game): item-box, pisang, roket, petasan, awan, kepiting, istana-pasir, kerang, kelapa-ayun
#   PNG (ikon HUD): item-<jenis> untuk 9 item → lanjut: python -I scripts/blender/export.py kart
# Bagian bernama untuk animasi di three.js: kepiting → leg_L1..3 / leg_R1..3, claw_L / claw_R, pincer_L / pincer_R, eyes;
# awan → face; petasan → spark.
# Jalankan: blender --background --python scripts/blender/kart_items.py -- <folder-png> <folder-glb> [nama ...]
# Sumbu: depan = -Y Blender (= +Z three.js), atas = +Z. Ukuran dalam meter.
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/kart', 'src/assets/kart/models']
OUT_DIR = Path(argv[0])
GLB_DIR = Path(argv[1])
ONLY = set(argv[2:])
SUB = {'n': 2}
_mats = {}


def pbr(color, rough=0.5, metal=0.0, emit=0.0, alpha=1.0, coat=0.0):
    key = (color, rough, metal, emit, alpha, coat)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(f'm{len(_mats)}')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    rgb = srgb(tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)))
    b.inputs['Base Color'].default_value = rgb
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = rgb
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    _mats[key] = m
    return m


def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun'):
            bpy.data.objects.remove(o, do_unlink=True)


def last():
    return bpy.context.object


def smooth(o, level=None):
    lv = SUB['n'] if level is None else level
    if lv:
        m = o.modifiers.new('sub', 'SUBSURF')
        m.levels = m.render_levels = lv
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def bev(o, w=0.04, seg=3):
    m = o.modifiers.new('bev', 'BEVEL')
    m.width = w
    m.segments = seg
    m.limit_method = 'ANGLE'
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def sphere(loc, r, mat, scale=(1, 1, 1), seg=24, sub=True, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=max(8, seg // 2), rotation=rot)
    o = last()
    o.data.materials.append(mat)
    o.scale = scale
    return smooth(o, None if sub else 0)


def cube(loc, size, mat, rot=(0, 0, 0), b=0.05, sub=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = last()
    o.scale = size
    o.data.materials.append(mat)
    bpy.ops.object.transform_apply(scale=True)
    return smooth(o) if sub else (bev(o, b) if b else o)


def cyl(loc, r, h, mat, rot=(0, 0, 0), verts=24, r2=None, b=0.02):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    o = last()
    o.data.materials.append(mat)
    return bev(o, b, 2) if b else smooth(o, 0)


def torus(loc, R, r, mat, rot=(0, 0, 0), seg=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=seg, minor_segments=12)
    o = last()
    o.data.materials.append(mat)
    return smooth(o, 0)


def tube(points, r, mat, res=3):
    cu = bpy.data.curves.new('tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, co in zip(sp.bezier_points, points):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('tube', cu)
    scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def text3d(body, loc, size, mat, extrude=0.08, rot=(math.radians(90), 0, 0)):
    cu = bpy.data.curves.new('teks', 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = 0.02
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('teks', cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.location = loc
    return e


def parent(children, p):
    bpy.context.view_layer.update()
    for c in children:
        mw = c.matrix_world.copy()
        c.parent = p
        c.matrix_world = mw
    return p


def eyes_on(x, y, z, r, look=(0, -1)):
    """sepasang mata kartun menghadap -Y"""
    out = []
    for s in (-1, 1):
        out.append(sphere((x + s * r * 1.2, y, z), r, pbr('#ffffff', 0.2, coat=0.6), (1, 0.6, 1.2)))
        out.append(sphere((x + s * r * 1.2, y - r * 0.5, z - r * 0.1), r * 0.55, pbr('#0a0a10', 0.2, coat=1), (1, 0.5, 1.2), sub=False))
        out.append(sphere((x + s * r * 1.2 + r * 0.2, y - r * 0.8, z + r * 0.25), r * 0.18, pbr('#ffffff', 0.1, emit=2), sub=False))
    return out


# ---------------------------------------------------------------------------
# Kotak item

RAINBOW = ['#ff3b5c', '#ff8a1c', '#ffcc1f', '#5cf64a', '#13bfae', '#2f7bff', '#8a55ff', '#ff37a6']


def item_box():
    """Kubus kaca membulat, bingkai pelangi, sudut emas, "?" 3D di tengah."""
    s = 1.05
    glass = cube((0, 0, 0), (2 * s, 2 * s, 2 * s), pbr('#bfe9ff', 0.05, alpha=0.22, coat=1), b=0.25)
    glass.name = 'glass'
    parts = [glass]
    edges = []
    k = 0
    for ax in range(3):
        for a in (-s, s):
            for b in (-s, s):
                p = [0, 0, 0]
                p[(ax + 1) % 3] = a
                p[(ax + 2) % 3] = b
                rot = [(0, math.radians(90), 0), (math.radians(90), 0, 0), (0, 0, 0)][ax]
                edges.append(cyl(tuple(p), 0.09, 2 * s - 0.1, pbr(RAINBOW[k % len(RAINBOW)], 0.3, emit=0.6, coat=0.8), rot=rot, verts=12))
                k += 1
    for x in (-s, s):
        for y in (-s, s):
            for z in (-s, s):
                parts.append(sphere((x, y, z), 0.16, pbr('#ffcc1f', 0.2, metal=0.9), seg=12, sub=False))
    q = text3d('?', (0, 0.12, -0.12), 1.9, pbr('#ff37a6', 0.3, emit=2.5), extrude=0.22)
    q.data.body = '?'
    q2 = text3d('?', (0, -0.12, -0.12), 1.9, pbr('#fff4fa', 0.3, emit=2.5), extrude=0.04)
    # sisi belakang juga terbaca
    q3 = text3d('?', (0, 0.36, -0.12), 1.9, pbr('#fff4fa', 0.3, emit=2.5), extrude=0.04, rot=(math.radians(90), 0, math.pi))
    return parts + edges + [q, q2, q3]


# ---------------------------------------------------------------------------
# Item

def pisang(x=0.0, y=0.0):
    """Kulit pisang: buah setengah terkupas + 4 kelopak kulit terkulai."""
    peel = pbr('#ffd23a', 0.45, coat=0.4)
    inner = pbr('#fff2b8', 0.6)
    tip = pbr('#5a3a1a', 0.7)
    parts = [tube([(x, y, 0.15), (x + 0.05, y, 0.6), (x - 0.05, y + 0.1, 1.0)], 0.2, inner)]
    parts.append(cyl((x - 0.06, y + 0.12, 1.12), 0.07, 0.14, tip, verts=8))
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        ca, sa = math.cos(a), math.sin(a)
        # kelopak kulit: pipih, melengkung terkulai ke luar; sisi dalam pucat
        for d, (r0, z0, tilt) in enumerate(((0.32, 0.32, 0.9), (0.68, 0.12, 0.35))):
            pet = sphere((x + ca * r0, y + sa * r0, z0), 0.2, peel, (0.95, 2.1 if d == 0 else 1.7, 0.28), seg=20)
            pet.rotation_euler = (0, 0, a - math.pi / 2)
            pet.rotation_mode = 'ZYX'
            pet.rotation_euler = (tilt, 0, a - math.pi / 2)
            parts.append(pet)
            inner_p = sphere((x + ca * (r0 - 0.02), y + sa * (r0 - 0.02), z0 + 0.04), 0.17, inner, (0.85, 1.9 if d == 0 else 1.5, 0.2), seg=16)
            inner_p.rotation_mode = 'ZYX'
            inner_p.rotation_euler = (tilt, 0, a - math.pi / 2)
            parts.append(inner_p)
        parts.append(sphere((x + ca * 0.98, y + sa * 0.98, 0.04), 0.06, tip, seg=8, sub=False))
    parts.append(cyl((x, y, 0.12), 0.24, 0.24, peel, verts=16, r2=0.18))
    return parts


def roket():
    """Roket kertas: badan bergaris, lipatan kertas, moncong, 4 sirip, jendela, nosel."""
    paper = pbr('#fff4fa', 0.75)
    pink = pbr('#ff37a6', 0.5, coat=0.4)
    rx = math.radians(90)
    parts = [cyl((0, 0, 0.6), 0.36, 1.5, paper, rot=(rx, 0, 0), verts=12, b=0.01)]
    for k in range(6):
        a = k / 6 * math.tau
        parts.append(cube((math.cos(a) * 0.35, 0, 0.6 + math.sin(a) * 0.35), (0.03, 1.48, 0.03), pbr('#d8ccd4', 0.8), b=0))
    for yy in (-0.35, 0.25):
        parts.append(cyl((0, yy, 0.6), 0.38, 0.14, pink, rot=(rx, 0, 0), verts=12, b=0.01))
    parts.append(cyl((0, -1.1, 0.6), 0.37, 0.6, pink, rot=(-rx, 0, 0), verts=12, r2=0.02, b=0.01))
    parts.append(sphere((0, -0.55, 0.92), 0.16, pbr('#7fd0ff', 0.05, coat=1), (1, 0.5, 1)))
    torus((0, -0.55, 0.92), 0.16, 0.035, pbr('#ffcc1f', 0.3, metal=0.8), rot=(rx, 0, 0))
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        f = cube((math.cos(a) * 0.5, 0.55, 0.6 + math.sin(a) * 0.5), (0.04, 0.6, 0.36), pink, rot=(0, -a + math.pi / 2, 0), b=0.01)
        parts.append(f)
    parts.append(cyl((0, 0.85, 0.6), 0.24, 0.3, pbr('#3a3a44', 0.3, metal=0.8), rot=(rx, 0, 0), verts=16, r2=0.3))
    parts.append(cyl((0, 1.0, 0.6), 0.2, 0.05, pbr('#ff8a1c', 0.3, emit=3), rot=(rx, 0, 0), verts=16, b=0))
    return parts


def petasan():
    """Petasan berantai: tiga tabung merah berpita emas, label, sumbu kepang, percikan."""
    red = pbr('#ff3b5c', 0.45, coat=0.5)
    gold = pbr('#ffcc1f', 0.25, metal=0.8)
    label = pbr('#fff4fa', 0.7)
    parts = []
    for k, (x, y) in enumerate(((-0.3, 0), (0.3, 0), (0, -0.28))):
        parts.append(cyl((x, y, 0.65), 0.26, 1.2, red, verts=20))
        for z in (0.12, 1.18):
            parts.append(torus((x, y, z), 0.26, 0.04, gold))
        parts.append(cyl((x, y - 0.01, 0.65), 0.262, 0.35, label, verts=20, b=0))
        parts.append(cyl((x, y, 1.27), 0.2, 0.06, pbr('#2a1a14', 0.8), verts=16, b=0))
    parts.append(torus((0, -0.1, 0.65), 0.6, 0.05, gold, rot=(0, 0, 0)))
    fuse = tube([(0, -0.1, 1.3), (0.12, -0.1, 1.55), (-0.05, -0.1, 1.75), (0.08, -0.1, 1.95)], 0.035, pbr('#5a3a1a', 0.9))
    spark = empty('spark', (0.08, -0.1, 2.0))
    s = [sphere((0.08, -0.1, 2.0), 0.12, pbr('#ffcc1f', 0.2, emit=6), seg=12, sub=False)]
    for k in range(6):
        a = k / 6 * math.tau
        s.append(cyl((0.08 + math.cos(a) * 0.15, -0.1, 2.0 + math.sin(a) * 0.15), 0.03, 0.18, pbr('#ff8a1c', 0.2, emit=5), rot=(0, math.pi / 2 - a, 0), verts=6, r2=0.0, b=0))
    parent(s, spark)
    return parts + [fuse]


def awan():
    """Awan hujan berwajah: gumpalan biru-abu, mata cemberut, mulut, tetesan."""
    cloud = pbr('#8a9ab8', 0.9)
    puffs = [sphere((x, y, z), r, cloud, seg=20) for x, y, z, r in ((0, 0, 0.3, 0.9), (-0.85, 0.1, 0.1, 0.65), (0.85, 0.05, 0.12, 0.68), (-0.4, 0.2, 0.75, 0.6), (0.45, 0.15, 0.7, 0.58), (0, 0.4, 0.05, 0.7))]
    face = empty('face', (0, -0.85, 0.35))
    f = eyes_on(0, -0.82, 0.45, 0.13)
    f.append(tube([(-0.2, -0.88, 0.05), (0, -0.92, 0.15), (0.2, -0.88, 0.05)], 0.035, pbr('#2a1a30', 0.5)))
    for s in (-1, 1):
        f.append(cube((s * 0.17, -0.86, 0.68), (0.2, 0.04, 0.05), pbr('#2a1a30', 0.5), rot=(0, s * -0.35, 0), b=0.01))
    parent(f, face)
    drops = [sphere((x, 0, -0.75 - (k % 2) * 0.2), 0.08, pbr('#2f7bff', 0.1, coat=1), (0.8, 0.8, 1.6), seg=10, sub=False) for k, x in enumerate((-0.6, -0.2, 0.2, 0.6))]
    return puffs + drops


def perisai():
    """Ikon perisai gelembung (di game memakai shader fresnel)."""
    b = sphere((0, 0, 0.7), 0.75, pbr('#9ad8ff', 0.05, alpha=0.4, coat=1), seg=32)
    hl = sphere((0.28, -0.6, 1.05), 0.14, pbr('#ffffff', 0.1, emit=2), (1, 0.4, 1.5), sub=False)
    star = sphere((0, 0, 0.7), 0.25, pbr('#ff37a6', 0.3, coat=0.6))
    ring = torus((0, 0, 0.7), 0.78, 0.03, pbr('#ffcc1f', 0.2, emit=1))
    return [b, hl, star, ring]


def sambal(x=0.0):
    chili = sphere((x, 0, 0.75), 0.3, pbr('#ff3b5c', 0.25, coat=1), (0.75, 0.75, 1.6))
    chili.rotation_euler = (0, math.radians(18), 0)
    stem = cyl((x + 0.15, 0, 1.25), 0.08, 0.25, pbr('#43b929', 0.5), rot=(0, math.radians(18), 0), verts=8)
    leaf = sphere((x + 0.25, 0, 1.18), 0.12, pbr('#5cf64a', 0.5), (1.6, 0.4, 0.6))
    fl = [cyl((x - 0.14 + dx, 0, 0.18), 0.14, 0.45, pbr(c, 0.3, emit=3), rot=(math.radians(180), 0, 0), verts=10, r2=0.0, b=0) for dx, c in ((-0.08, '#ffcc1f'), (0.1, '#ff8a1c'))]
    return [chili, stem, leaf, *fl, *eyes_on(x - 0.02, -0.25, 0.85, 0.07)]


def magnet():
    red = pbr('#ff3b5c', 0.3, coat=0.8)
    arc = torus((0, 0, 0.75), 0.42, 0.17, red, rot=(math.radians(90), 0, 0))
    legs = [cyl((s * 0.42, 0, 0.42), 0.17, 0.5, red, verts=20) for s in (-1, 1)]
    tips = [cyl((s * 0.42, 0, 0.12), 0.175, 0.2, pbr('#e8e8f0', 0.2, metal=0.9), verts=20) for s in (-1, 1)]
    sparks = [cyl((s * 0.42, 0, -0.15), 0.02, 0.25, pbr('#7fd0ff', 0.2, emit=4), rot=(0, s * 0.4, 0), verts=6) for s in (-1, 1)]
    return [arc, *legs, *tips, *sparks]


# ---------------------------------------------------------------------------
# Rintangan Pantai Kelapa

def kepiting():
    """Kepiting besar: cangkang berbintik, mata bertangkai, 6 kaki & 2 capit bernama untuk animasi."""
    shell = pbr('#ff5a3c', 0.35, coat=0.6)
    belly = pbr('#ffcaa8', 0.6)
    dark = pbr('#c83a24', 0.5)
    parts = [sphere((0, 0, 1.0), 1.25, shell, (1.25, 0.95, 0.55), seg=32), sphere((0, 0, 0.75), 1.1, belly, (1.15, 0.85, 0.35), seg=24)]
    for x, y in ((-0.6, 0.2), (0.5, 0.35), (0, 0.55), (-0.2, -0.2), (0.7, -0.2)):
        parts.append(sphere((x, y, 1.62), 0.12, dark, (1, 1, 0.4), seg=10, sub=False))
    eyes = empty('eyes', (0, -0.9, 1.45))
    e = []
    for s in (-1, 1):
        e.append(cyl((s * 0.35, -0.85, 1.75), 0.06, 0.6, shell, verts=10))
        e.append(sphere((s * 0.35, -0.85, 2.1), 0.2, pbr('#ffffff', 0.2, coat=0.6)))
        e.append(sphere((s * 0.35, -1.0, 2.12), 0.1, pbr('#0a0a10', 0.2, coat=1), sub=False))
        e.append(sphere((s * 0.35 + 0.05, -1.07, 2.18), 0.035, pbr('#ffffff', 0.1, emit=2), sub=False))
    parent(e, eyes)
    parts.append(tube([(-0.25, -1.12, 0.95), (0, -1.18, 0.85), (0.25, -1.12, 0.95)], 0.04, pbr('#5a1010', 0.5)))
    for s, side in ((-1, 'L'), (1, 'R')):
        for k in range(3):
            y = -0.3 + k * 0.45
            leg = empty(f'leg_{side}{k + 1}', (s * 1.2, y, 0.85))
            seg = [
                tube([(s * 1.2, y, 0.85), (s * 1.8, y + 0.05, 1.05), (s * 2.2, y + 0.1, 0.4), (s * 2.3, y + 0.12, 0.0)], 0.1, shell),
                sphere((s * 1.8, y + 0.05, 1.05), 0.13, dark, seg=10, sub=False),
            ]
            parent(seg, leg)
        claw = empty(f'claw_{side}', (s * 1.1, -0.8, 1.0))
        arm = tube([(s * 1.1, -0.8, 1.0), (s * 1.6, -1.3, 1.3), (s * 1.5, -1.9, 1.25)], 0.17, shell)
        palm = sphere((s * 1.5, -2.05, 1.25), 0.42, shell, (0.8, 1.1, 0.75))
        lower = cyl((s * 1.42, -2.55, 1.05), 0.16, 0.6, shell, rot=(math.radians(-80), 0, 0), verts=12, r2=0.04)
        pinc = empty(f'pincer_{side}', (s * 1.55, -2.3, 1.4))
        upper = cyl((s * 1.55, -2.65, 1.45), 0.15, 0.65, dark, rot=(math.radians(-100), 0, 0), verts=12, r2=0.03)
        parent([upper], pinc)
        parent([arm, palm, lower, pinc], claw)
    return parts


def istana_pasir():
    """Istana pasir: tembok berbenteng, 4 menara ember, menara utama, gerbang, bendera, kerang hiasan."""
    sand = pbr('#f2cf8a', 0.95)
    sand2 = pbr('#e6bb72', 0.95)
    parts = [cube((0, 0, 0.6), (4.2, 4.2, 1.2), sand, b=0.12)]
    for k in range(9):
        for side in range(4):
            a = side * math.pi / 2
            u = -1.9 + k * 0.475
            x, y = (u, 2.05) if side % 2 == 0 else (2.05, u)
            if side >= 2:
                x, y = -x, -y
            parts.append(cube((x, y, 1.35), (0.3, 0.3, 0.3), sand2, b=0.05))
    for x in (-2.1, 2.1):
        for y in (-2.1, 2.1):
            parts.append(cyl((x, y, 1.0), 0.75, 2.0, sand, verts=20, r2=0.62, b=0.06))
            for k in range(8):
                a = k / 8 * math.tau
                parts.append(cube((x + math.cos(a) * 0.58, y + math.sin(a) * 0.58, 2.12), (0.2, 0.2, 0.25), sand2, rot=(0, 0, a), b=0.04))
    parts.append(cyl((0, 0, 2.2), 1.1, 2.0, sand, verts=24, r2=0.95, b=0.06))
    parts.append(cyl((0, 0, 3.6), 0.7, 0.9, sand2, verts=20, r2=0.15, b=0.04))
    parts.append(cube((0, -2.12, 0.55), (1.0, 0.1, 1.0), pbr('#5a3a2a', 0.9), b=0.05))
    parts.append(cyl((0, -2.12, 1.05), 0.5, 0.1, pbr('#5a3a2a', 0.9), rot=(math.radians(90), 0, 0), verts=16))
    for (x, y, c) in ((0, 0, '#ff37a6'), (-2.1, -2.1, '#5cf64a'), (2.1, 2.1, '#2f7bff')):
        z = 4.05 if (x, y) == (0, 0) else 2.3
        parts.append(cyl((x, y, z + 0.6), 0.03, 1.2, pbr('#8a6a4a', 0.8), verts=6))
        parts.append(cube((x + 0.3, y, z + 1.0), (0.55, 0.03, 0.35), pbr(c, 0.6), b=0.01))
    for k in range(6):
        a = k / 6 * math.tau
        parts.append(sphere((math.cos(a) * 1.4, math.sin(a) * 1.4 - 0.7, 1.2), 0.14, pbr('#ffcae9', 0.5), (1, 0.4, 0.8), seg=10))
    return parts


def fan(mat, ribs=9, radius=1.7, open_angle=0.0, lift=0.0):
    """Satu keping kerang simping: kipas bergerigi dari engsel, dibuat dari bmesh."""
    import bmesh
    me = bpy.data.meshes.new('kipas')
    bm = bmesh.new()
    na, nr = 48, 12
    grid = []
    for i in range(na + 1):
        a = math.radians(-72 + 144 * i / na)
        row = []
        for j in range(nr + 1):
            r = radius * j / nr
            ridge = 0.13 * abs(math.sin(a * ribs * 1.25)) * (j / nr)
            x = math.sin(a) * r
            z = math.cos(a) * r
            y = -ridge - 0.25 * (j / nr) ** 2 * math.cos(a) ** 2
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(na):
        for j in range(nr):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('kipas', me)
    scene.collection.objects.link(o)
    o.data.materials.append(mat)
    o.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.08
    for p in o.data.polygons:
        p.use_smooth = True
    o.rotation_euler = (open_angle, 0, 0)
    o.location = (0, 0, lift)
    return o


def kerang():
    """Kerang simping raksasa: dua keping bergerigi terbuka + mutiara berkilau."""
    pink = pbr('#ffb0c8', 0.35, coat=0.6)
    pink2 = pbr('#ff8ab0', 0.35, coat=0.6)
    bottom = fan(pink, open_angle=math.radians(-80), lift=0.15)
    top = fan(pink2, open_angle=math.radians(-15), lift=0.2)
    hinge = cube((0, 0.05, 0.18), (0.7, 0.4, 0.3), pink2, b=0.1)
    pearl = sphere((0, -0.75, 0.45), 0.3, pbr('#fff8f0', 0.08, metal=0.25, coat=1))
    return [bottom, top, hinge, pearl]


def kelapa_ayun():
    """Seikat kelapa dengan daun, digantung di tali (tali dibuat di game)."""
    husk = pbr('#7a4a2a', 0.85)
    husk2 = pbr('#5a8a2a', 0.7)
    parts = []
    for k, (x, y, z) in enumerate(((0, 0, -0.4), (-0.75, 0.1, -0.1), (0.7, -0.15, -0.15), (0.05, 0.6, 0.0))):
        parts.append(sphere((x, y, z), 0.62, husk if k % 2 == 0 else husk2, (1, 0.95, 1.1)))
        parts.append(sphere((x, y - 0.55, z - 0.15), 0.1, pbr('#2a1a10', 0.8), seg=8, sub=False))
    for k in range(7):
        a = k / 7 * math.tau
        for d, (r0, z0, tilt, ln) in enumerate(((0.75, 0.95, 0.35, 1.0), (1.65, 0.65, -0.35, 0.9))):
            leaf = sphere((math.cos(a) * r0, math.sin(a) * r0, z0), 0.45, pbr('#43b929' if d == 0 else '#5cc93a', 0.55), (0.55, ln * 1.9, 0.08), seg=16)
            leaf.rotation_mode = 'ZYX'
            leaf.rotation_euler = (tilt, 0, a - math.pi / 2)
            parts.append(leaf)
    parts.append(cyl((0, 0, 0.7), 0.25, 0.5, pbr('#8f6438', 0.8), verts=12))
    return parts


# ---------------------------------------------------------------------------

def to_meshes():
    bpy.ops.object.select_all(action='DESELECT')
    objs = [o for o in bpy.data.objects if o.type in ('CURVE', 'FONT')]
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    if objs:
        bpy.ops.object.convert(target='MESH')


def export(name):
    to_meshes()
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.name not in ('cam', 'sun'):
            o.select_set(True)
    path = (GLB_DIR / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT')
    print('GLB', path)


GLB = {
    'item-box': item_box,
    'pisang': lambda: pisang(),
    'roket': roket,
    'petasan': petasan,
    'awan': awan,
    'kepiting': kepiting,
    'istana-pasir': istana_pasir,
    'kerang': kerang,
    'kelapa-ayun': kelapa_ayun,
}
ICON = {
    'item-roket': (roket, 2.6, (0, -0.1, 0.6)),
    'item-pisang': (lambda: pisang(), 2.0, (0, 0, 0.5)),
    'item-pisang3': (lambda: [*pisang(-0.75, 0.3), *pisang(0.75, 0.3), *pisang(0, -0.5)], 3.0, (0, 0, 0.5)),
    'item-perisai': (perisai, 1.9, (0, 0, 0.7)),
    'item-sambal': (lambda: sambal(), 1.8, (0, 0, 0.7)),
    'item-sambal3': (lambda: [*sambal(-0.55), *sambal(0), *sambal(0.55)], 2.4, (0, 0, 0.7)),
    'item-awan': (awan, 2.6, (0, 0, 0.1)),
    'item-magnet': (magnet, 1.8, (0, 0, 0.55)),
    'item-petasan': (petasan, 2.6, (0, 0, 1.0)),
}

OUT_DIR.mkdir(parents=True, exist_ok=True)
GLB_DIR.mkdir(parents=True, exist_ok=True)
for name, build in GLB.items():
    if ONLY and name not in ONLY:
        continue
    SUB['n'] = 1
    _mats.clear()
    clear()
    build()
    export(name)
for name, (build, ortho, target) in ICON.items():
    if ONLY and name not in ONLY:
        continue
    SUB['n'] = 2
    _mats.clear()
    clear()
    build()
    studio(ortho, (384, 384), (3.2, -6.2, 3.4), target, 3.0)
    render(str((OUT_DIR / f'{name}.png').resolve()))
