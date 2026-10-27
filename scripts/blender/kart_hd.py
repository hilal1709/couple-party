# Pembalap & kart detail Kart Kacau, dimodel manual di Blender (bukan AI).
# Mesh halus (subdivision), material PBR, dan bagian bernama supaya bisa dianimasikan di three.js:
#   pembalap: char_root → body, head (poros leher), arm_L / arm_R (poros bahu)
#   kart:     kart_root → chassis, wheel_FL/FR/RL/RR (poros as roda), steer (poros setir), exhaust_L/R (titik api)
# Material bernama "tint" pada kart diwarnai ulang di game dengan warna pembalap.
#
# Jalankan: blender --background --python scripts/blender/kart_hd.py -- <folder-png> <folder-glb> [nama ...]
#   GLB  → src/assets/kart/models/char-<id>.glb, kart-<bodi>.glb (+ versi -lod ringan untuk grafis Hemat)
#   PNG  → potret char-<id>, kart-<bodi> untuk layar pilih; lanjut: python -I scripts/blender/export.py kart
# Sumbu: depan = -Y Blender (= +Z three.js), atas = +Z.
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/kart', 'src/assets/kart/models']
OUT_DIR = Path(argv[0])
GLB_DIR = Path(argv[1])
ONLY = set(argv[2:])

CHARS = {
    'moci': '#ff37a6',
    'kroak': '#5cf64a',
    'bubu': '#2f7bff',
    'ciko': '#ffcc1f',
    'gurit': '#8a55ff',
    'loreng': '#ff8a1c',
    'embek': '#13bfae',
    'komo': '#ff3b5c',
}
# subdivision: 2 untuk render potret, 1 untuk GLB game, 0 untuk LOD Hemat
SUB = {'n': 2}

_mats = {}


def pbr(name, color, rough=0.5, metal=0.0, emit=0.0, clearcoat=0.0):
    key = (name, color, rough, metal, emit, clearcoat)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    rgb = srgb(tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)))
    b.inputs['Base Color'].default_value = rgb
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if clearcoat:
        b.inputs['Coat Weight'].default_value = clearcoat
    if emit:
        b.inputs['Emission Color'].default_value = rgb
        b.inputs['Emission Strength'].default_value = emit
    _mats[key] = m
    return m


def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun'):
            bpy.data.objects.remove(o, do_unlink=True)


def last():
    return bpy.context.object


def smooth(o, level=None, crease=False):
    lv = SUB['n'] if level is None else level
    if lv > 0:
        m = o.modifiers.new('sub', 'SUBSURF')
        m.levels = lv
        m.render_levels = lv
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


def sphere(loc, r, mat, scale=(1, 1, 1), seg=24, sub=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=max(8, seg // 2))
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
    if sub:
        return smooth(o)
    return bev(o, b) if b else o


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


def curve_tube(points, r, mat):
    cu = bpy.data.curves.new('tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 3
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


# ---------------------------------------------------------------------------
# Wajah & kepala

INK = '#1a1420'


def eyes(cx, cz, r, head_y, spacing=0.36, iris='#3a2410', size=1.0):
    """Mata kartun: sklera putih, iris, pupil, dua kilau. Menghadap -Y."""
    parts = []
    white = pbr('sklera', '#ffffff', 0.25, clearcoat=0.6)
    irm = pbr(f'iris{iris}', iris, 0.3, clearcoat=0.8)
    pup = pbr('pupil', '#0a0a10', 0.2, clearcoat=1)
    hl = pbr('kilau', '#ffffff', 0.1, emit=2.0)
    for s in (-1, 1):
        x = cx + s * r * spacing
        y = head_y - r * 0.86
        z = cz + r * 0.12
        parts.append(sphere((x, y, z), r * 0.2 * size, white, (1, 0.55, 1.25)))
        parts.append(sphere((x, y - r * 0.07, z - r * 0.01), r * 0.13 * size, irm, (1, 0.4, 1.2)))
        parts.append(sphere((x, y - r * 0.1, z - r * 0.01), r * 0.075 * size, pup, (1, 0.4, 1.2)))
        parts.append(sphere((x + r * 0.05, y - r * 0.13, z + r * 0.07), r * 0.035 * size, hl, sub=False))
        parts.append(sphere((x - r * 0.03, y - r * 0.13, z - r * 0.05), r * 0.018 * size, hl, sub=False))
        # alis
        brow = cube((x, y - r * 0.02, z + r * 0.32), (r * 0.22, r * 0.05, r * 0.05), pbr('alis', INK, 0.6), rot=(0, s * 0.18, 0), b=0.01)
        parts.append(brow)
        # pipi merona
        parts.append(sphere((cx + s * r * 0.6, head_y - r * 0.7, cz - r * 0.2), r * 0.13, pbr('pipi', '#ff7ab8', 0.7), (1.3, 0.35, 0.8), sub=False))
    return parts


def mouth(cx, cz, r, head_y, open_=False):
    m = pbr('mulut', '#3a0a18', 0.5)
    y = head_y - r * 0.93
    if open_:
        return [sphere((cx, y, cz - r * 0.3), r * 0.14, m, (1.3, 0.5, 0.9)), sphere((cx, y - 0.02, cz - r * 0.36), r * 0.08, pbr('lidah', '#ff6b8a', 0.5), (1.2, 0.4, 0.6))]
    t = curve_tube([(cx - r * 0.18, y, cz - r * 0.22), (cx, y - 0.02, cz - r * 0.34), (cx + r * 0.18, y, cz - r * 0.22)], r * 0.035, m)
    return [t]


def party_hat(x, y, z, color):
    """Topi pesta khas Couple Party: kerucut bergaris + pompom."""
    parts = []
    stripes = [color, '#fff4fa', color, '#fff4fa', color]
    h = 0.85
    for k, c in enumerate(stripes):
        z0 = z + k * h / len(stripes)
        r0 = 0.36 * (1 - k / len(stripes))
        r1 = 0.36 * (1 - (k + 1) / len(stripes))
        parts.append(cyl((x, y, z0 + h / len(stripes) / 2), r0, h / len(stripes), pbr(f'topi{c}', c, 0.4, clearcoat=0.5), verts=28, r2=max(0.001, r1), b=0))
    parts.append(sphere((x, y, z + h + 0.06), 0.12, pbr('pompom', '#fff4fa', 0.9)))
    parts.append(torus((x, y, z + 0.02), 0.35, 0.05, pbr('pita', '#fff4fa', 0.5)))
    return parts


def goggles(cx, cz, r, head_y):
    """Kacamata balap di dahi."""
    strap = torus((cx, head_y, cz + r * 0.45), r * 0.86, 0.035, pbr('tali', INK, 0.6), rot=(0, 0, 0))
    strap.scale = (1.06, 0.98, 0.6)
    lens = []
    for s in (-1, 1):
        lens.append(torus((cx + s * r * 0.3, head_y - r * 0.86, cz + r * 0.5), r * 0.15, 0.04, pbr('bingkai', '#c9c9d4', 0.3, metal=0.8), rot=(math.radians(90), 0, 0), seg=24))
        lens.append(sphere((cx + s * r * 0.3, head_y - r * 0.86, cz + r * 0.5), r * 0.14, pbr('lensa', '#7fd0ff', 0.05, clearcoat=1), (1, 0.3, 1), sub=False))
    return [strap, *lens]


def head(cid, color):
    """Kepala hewan di poros leher (0, 0.25, 2.3); pusat kepala z=2.85."""
    hy = 0.25
    hz = 2.85
    r = 0.78
    skin = pbr(f'kulit{cid}', color, 0.45, clearcoat=0.3)
    light = pbr('putih', '#fff4ea', 0.6)
    parts = [sphere((0, hy, hz), r, skin, (1.05, 0.95, 0.92), seg=32)]
    iris = '#3a2410'
    if cid == 'moci':  # kucing
        for s in (-1, 1):
            parts.append(cyl((s * 0.46, hy, hz + 0.62), 0.24, 0.42, skin, rot=(0, s * -0.35, 0), verts=4, r2=0.02, b=0.05))
            parts.append(cyl((s * 0.46, hy - 0.06, hz + 0.6), 0.14, 0.3, pbr('telinga', '#ffc0dd', 0.6), rot=(0, s * -0.35, 0), verts=4, r2=0.01, b=0.03))
            for k in (-1, 1):
                parts.append(cube((s * 0.62, hy - 0.66, hz - 0.12 + k * 0.06), (0.34, 0.015, 0.015), pbr('kumis', INK, 0.5), rot=(0, s * k * 0.15, 0), b=0))
        parts.append(sphere((0, hy - 0.74, hz - 0.08), 0.07, pbr('hidung', '#ff6ba8', 0.4), (1.3, 0.6, 0.8)))
    elif cid == 'kroak':  # kodok
        parts[0].scale = (1.18, 0.95, 0.82)
        for s in (-1, 1):
            parts.append(sphere((s * 0.38, hy - 0.1, hz + 0.52), 0.3, skin))
        iris = '#2a5a10'
    elif cid == 'bubu':  # beruang
        for s in (-1, 1):
            parts.append(sphere((s * 0.58, hy, hz + 0.6), 0.25, skin))
            parts.append(sphere((s * 0.58, hy - 0.1, hz + 0.6), 0.13, pbr('telinga-bubu', '#9ac0ff', 0.6), (1, 0.4, 1)))
        parts.append(sphere((0, hy - 0.66, hz - 0.22), 0.3, light, (1.25, 0.7, 0.8)))
        parts.append(sphere((0, hy - 0.88, hz - 0.12), 0.09, pbr('hidung2', INK, 0.3, clearcoat=1), (1.3, 0.8, 0.9)))
    elif cid == 'ciko':  # ayam
        for k in range(3):
            parts.append(sphere((0, hy - 0.2 + k * 0.22, hz + 0.72 - abs(k - 1) * 0.08), 0.16, pbr('jengger', '#ff3b5c', 0.45)))
        parts.append(cyl((0, hy - 0.9, hz - 0.12), 0.15, 0.36, pbr('paruh', '#ff8a1c', 0.4), rot=(math.radians(90), 0, 0), verts=16, r2=0.01, b=0))
        parts.append(sphere((0, hy - 0.72, hz - 0.42), 0.1, pbr('pial', '#ff3b5c', 0.5), (1, 0.6, 1.5)))
    elif cid == 'gurit':  # gurita
        parts[0].scale = (1, 0.95, 1.12)
        for s in (-1, 1):
            for k in range(3):
                parts.append(sphere((s * (0.35 + k * 0.12), hy - 0.45, hz + 0.3 + k * 0.12), 0.06, pbr('bintik', '#5a2fb8', 0.5), (1, 0.4, 1), sub=False))
        iris = '#1a1050'
    elif cid == 'loreng':  # harimau
        for s in (-1, 1):
            parts.append(cyl((s * 0.5, hy, hz + 0.62), 0.22, 0.34, skin, rot=(0, s * -0.3, 0), verts=12, r2=0.04, b=0.04))
        stripe = pbr('loreng', INK, 0.5)
        for x, z, ry in ((-0.28, 0.6, 0.3), (0, 0.72, 0), (0.28, 0.6, -0.3), (-0.62, 0.15, 1.2), (0.62, 0.15, -1.2)):
            parts.append(cube((x, hy - 0.62 if abs(x) < 0.5 else hy - 0.3, hz + z - 0.1), (0.08, 0.1, 0.3), stripe, rot=(0, ry, 0), b=0.02))
        parts.append(sphere((0, hy - 0.66, hz - 0.22), 0.3, light, (1.3, 0.65, 0.75)))
        parts.append(sphere((0, hy - 0.86, hz - 0.1), 0.08, pbr('hidung3', '#ff6ba8', 0.4), (1.3, 0.7, 0.8)))
        iris = '#5a3a08'
    elif cid == 'embek':  # kambing
        for s in (-1, 1):
            parts.append(curve_tube([(s * 0.3, hy + 0.1, hz + 0.6), (s * 0.55, hy + 0.35, hz + 0.95), (s * 0.75, hy + 0.5, hz + 0.75)], 0.08, pbr('tanduk', '#fff0d0', 0.5)))
            parts.append(sphere((s * 0.78, hy, hz + 0.1), 0.18, skin, (1.6, 0.6, 0.6)))
        parts.append(cyl((0, hy - 0.6, hz - 0.72), 0.12, 0.34, pbr('jenggot', '#fff4ea', 0.8), rot=(math.radians(180), 0, 0), verts=12, r2=0.01, b=0))
    elif cid == 'komo':  # komodo
        parts.append(sphere((0, hy - 0.6, hz - 0.15), 0.5, skin, (1, 1.1, 0.6)))
        for k in range(4):
            parts.append(cyl((0, hy - 0.2 + k * 0.28, hz + 0.68 - k * 0.07), 0.13, 0.3, pbr('duri', '#ffcc1f', 0.4), verts=6, r2=0.01, b=0))
        for s in (-1, 1):
            parts.append(sphere((s * 0.14, hy - 1.1, hz - 0.1), 0.04, pbr('lubang', INK, 0.5), sub=False))
        iris = '#806010'
    parts += eyes(0, hz, r, hy, iris=iris, size=1.15 if cid in ('kroak', 'gurit') else 1)
    parts += mouth(0, hz, r, hy, open_=cid in ('ciko', 'kroak'))
    parts += goggles(0, hz, r, hy)
    parts += party_hat(0.05, hy + 0.05, hz + 0.62, '#ffcc1f' if cid != 'ciko' else '#ff37a6')
    return parts


def driver(cid, color):
    """Pembalap duduk, berbaju balap. Kembalikan root dengan bagian bernama."""
    suit = pbr(f'baju{cid}', color, 0.55)
    white = pbr('garis', '#fff4fa', 0.5)
    glove = pbr('sarung', '#fff4fa', 0.7)
    root = empty('char_root')
    body = empty('body', (0, 0.35, 1.2))
    torso = [
        sphere((0, 0.35, 1.72), 0.6, suit, (1, 0.85, 1.05)),
        torus((0, 0.35, 1.72), 0.58, 0.05, white, rot=(0, 0, 0)),
        sphere((0, 0.35, 2.2), 0.32, white, (1.3, 1, 0.35)),  # kerah
        cyl((0, -0.18, 1.75), 0.16, 0.04, pbr('nomor', '#fff4fa', 0.5), rot=(math.radians(90), 0, 0), verts=24, b=0),
    ]
    parent(torso, body)
    hd = empty('head', (0, 0.25, 2.3))
    parent(head(cid, color), hd)
    arms = []
    for s, name in ((-1, 'arm_L'), (1, 'arm_R')):
        a = empty(name, (s * 0.52, 0.3, 2.0))
        upper = curve_tube([(s * 0.52, 0.3, 2.0), (s * 0.62, 0.0, 1.85), (s * 0.48, -0.42, 1.92)], 0.14, suit)
        hand = sphere((s * 0.42, -0.55, 1.95), 0.17, glove)
        parent([upper, hand], a)
        arms.append(a)
    parent([body, hd, *arms], root)
    return root


# ---------------------------------------------------------------------------
# Kart

def wheel(name, x, y, front):
    """Roda: ban beralur + velg berjari-jari, poros di as."""
    e = empty(name, (x, y, 0.48))
    tire_m = pbr('ban', '#1c1c22', 0.85)
    rim_m = pbr('velg', '#e8e8f0', 0.25, metal=0.85)
    hub_m = pbr('tint', '#ff37a6', 0.35, clearcoat=0.6)
    side = 1 if x > 0 else -1
    tire = torus((x, y, 0.48), 0.36, 0.17, tire_m, rot=(0, math.radians(90), 0), seg=28)
    tire.scale = (1.35, 1, 1)
    parts = [tire]
    for k in range(14):
        a = k / 14 * math.tau
        parts.append(cube((x, y + math.cos(a) * 0.5, 0.48 + math.sin(a) * 0.5), (0.36 if front else 0.42, 0.1, 0.035), tire_m, rot=(a, 0, 0), b=0.012))
    parts.append(cyl((x + side * 0.05, y, 0.48), 0.27, 0.2, rim_m, rot=(0, math.radians(90), 0), verts=24))
    for k in range(5):
        a = k / 5 * math.tau
        parts.append(cube((x + side * 0.16, y + math.cos(a) * 0.12, 0.48 + math.sin(a) * 0.12), (0.04, 0.05, 0.22), rim_m, rot=(a, 0, 0), b=0.01))
    parts.append(cyl((x + side * 0.17, y, 0.48), 0.08, 0.05, hub_m, rot=(0, math.radians(90), 0), verts=16, b=0.01))
    return parent(parts, e)


def steering(y=-0.62, z=1.82):
    e = empty('steer', (0, y, z))
    rim = torus((0, y, z), 0.28, 0.045, pbr('setir', '#2a2a34', 0.4), rot=(math.radians(60), 0, 0), seg=28)
    hub = cyl((0, y, z), 0.08, 0.06, pbr('tint', '#ff37a6', 0.35, clearcoat=0.6), rot=(math.radians(60), 0, 0), verts=16)
    col = cyl((0, y - 0.25, z - 0.3), 0.04, 0.7, pbr('besi', '#3a3a44', 0.3, metal=0.8), rot=(math.radians(-30), 0, 0), verts=10)
    return parent([rim, hub, col], e)


def chrome_pipe(x, y, z):
    m = pbr('krom', '#dcdce6', 0.12, metal=1)
    pipe = cyl((x, y, z), 0.13, 0.7, m, rot=(math.radians(90), 0, 0), verts=20)
    tip = cyl((x, y + 0.36, z), 0.15, 0.08, pbr('ujung', '#2a1a14', 0.6), rot=(math.radians(90), 0, 0), verts=20)
    return [pipe, tip]


def body_bajaj():
    paint = pbr('tint', '#ff37a6', 0.3, clearcoat=1)
    dark = pbr('jok', '#2a2a34', 0.7)
    glass = pbr('kaca', '#bfe9ff', 0.05, clearcoat=1)
    lamp = pbr('lampu', '#fff6c8', 0.1, emit=3)
    parts = [
        cube((0, 0.05, 0.72), (1.8, 2.9, 0.5), paint, sub=True),
        cube((0, -1.05, 1.15), (1.5, 0.9, 0.55), paint, sub=True),
        cube((0, -1.36, 1.5), (1.1, 0.05, 0.3), glass, rot=(math.radians(-25), 0, 0), b=0.02),
        cube((0, 0.85, 1.25), (1.5, 1.0, 0.7), paint, sub=True),
        cube((0, 0.3, 1.25), (0.95, 0.75, 0.25), dark, sub=True),  # jok duduk
        cube((0, 0.62, 1.75), (0.95, 0.22, 0.75), dark, sub=True),  # sandaran
        cube((0, -1.52, 0.75), (1.75, 0.18, 0.35), pbr('bumper', '#e8e8f0', 0.3, metal=0.6), b=0.06),
        cube((0, 1.72, 0.85), (0.7, 0.04, 0.32), pbr('pelat', '#fff4fa', 0.5), b=0.01),
    ]
    for s in (-1, 1):
        parts.append(sphere((s * 0.55, -1.52, 1.2), 0.17, lamp, (1, 0.5, 1), sub=False))
        parts.append(cube((s * 0.95, 0.05, 0.62), (0.18, 2.4, 0.3), pbr('sisi', '#121212', 0.6), sub=True))
        parts += chrome_pipe(s * 0.45, 1.55, 0.95)
    # sayap belakang
    parts.append(cube((0, 1.55, 2.05), (1.9, 0.45, 0.08), paint, b=0.03))
    for s in (-1, 1):
        parts.append(cube((s * 0.6, 1.5, 1.75), (0.08, 0.2, 0.55), dark, b=0.02))
    return parts


def arch(loc, r, depth, mat, seg=20):
    """Setengah tabung melengkung (atap tenda) menghadap ke atas, sumbu sepanjang Y."""
    import bmesh
    me = bpy.data.meshes.new('arch')
    bm = bmesh.new()
    ring_a, ring_b = [], []
    for i in range(seg + 1):
        a = math.pi * i / seg
        x, z = math.cos(a) * r, math.sin(a) * r * 0.6
        ring_a.append(bm.verts.new((x, -depth / 2, z)))
        ring_b.append(bm.verts.new((x, depth / 2, z)))
    for i in range(seg):
        bm.faces.new((ring_a[i], ring_a[i + 1], ring_b[i + 1], ring_b[i]))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('arch', me)
    scene.collection.objects.link(o)
    o.location = loc
    o.data.materials.append(mat)
    sol = o.modifiers.new('tebal', 'SOLIDIFY')
    sol.thickness = 0.05
    return smooth(o, 0)


def body_gerobak():
    wood = pbr('kayu', '#b98a5a', 0.75)
    wood2 = pbr('kayu2', '#8f6438', 0.8)
    metal = pbr('besi2', '#5a5a66', 0.35, metal=0.8)
    paint = pbr('tint', '#ff37a6', 0.4, clearcoat=0.4)
    parts = [cube((0, 0, 0.78), (2.1, 3.1, 0.25), wood2, b=0.04)]
    for k in range(6):
        for s in (-1, 1):
            parts.append(cube((s * 1.02, -1.25 + k * 0.5, 1.05), (0.08, 0.44, 0.45), wood, b=0.02))
        parts.append(cube((0, -1.25 + k * 0.5, 0.92), (1.95, 0.44, 0.05), wood, b=0.01))
    for s in (-1, 1):
        parts.append(cube((s * 1.07, 0, 1.32), (0.06, 3.1, 0.1), metal, b=0.02))
        parts.append(cube((s * 1.07, 0, 0.82), (0.06, 3.1, 0.1), metal, b=0.02))
        parts.append(cyl((s * 0.95, 1.3, 2.3), 0.06, 2.0, metal, verts=10))
        parts.append(cyl((s * 0.95, -0.1, 2.3), 0.06, 2.0, metal, verts=10))
    # atap tenda melengkung belang
    for k in range(7):
        c = paint if k % 2 == 0 else pbr('kain', '#fff4fa', 0.8)
        parts.append(arch((0, -0.15 + k * 0.24, 3.3), 1.05, 0.24, c))
    parts.append(cube((0, 0.5, 1.3), (0.9, 0.7, 0.3), pbr('jok2', '#5a3a2a', 0.8), sub=True))
    # lentera & peti
    parts.append(cyl((0.85, -1.45, 1.6), 0.12, 0.3, pbr('lentera', '#ffcc1f', 0.2, emit=2.5), verts=12))
    parts.append(cube((-0.5, 1.2, 1.25), (0.6, 0.5, 0.5), wood, b=0.03))
    parts += chrome_pipe(0.6, 1.6, 0.85)
    parts += chrome_pipe(-0.6, 1.6, 0.85)
    return parts


def body_bebek():
    paint = pbr('tint', '#ff37a6', 0.25, clearcoat=1)
    beak = pbr('paruh2', '#ff8a1c', 0.4, clearcoat=0.5)
    white = pbr('sayap', '#fff4fa', 0.5)
    parts = [
        sphere((0, 0.15, 0.95), 1.15, paint, (0.82, 1.45, 0.52), seg=32),
        sphere((0, -1.55, 1.3), 0.55, paint, (1, 1, 0.95), seg=28),
        sphere((0, -2.12, 1.22), 0.26, beak, (1.2, 1.4, 0.45)),
        cube((0, 0.3, 1.35), (0.9, 0.8, 0.25), pbr('jok3', '#2a2a34', 0.7), sub=True),
    ]
    for s in (-1, 1):
        parts.append(sphere((s * 0.25, -1.95, 1.5), 0.12, pbr('sklera', '#ffffff', 0.25, clearcoat=0.6), (1, 0.6, 1.2)))
        parts.append(sphere((s * 0.26, -2.03, 1.5), 0.07, pbr('pupil', '#0a0a10', 0.2, clearcoat=1), (1, 0.5, 1.2), sub=False))
        parts.append(sphere((s * 1.0, 0.45, 1.15), 0.5, white, (0.25, 1.2, 0.5)))
    # ekor = sirip + roket pendorong
    parts.append(cube((0, 1.75, 1.6), (0.1, 0.6, 0.7), paint, rot=(math.radians(-25), 0, 0), sub=True))
    parts.append(cyl((0, 1.85, 0.95), 0.45, 0.8, pbr('roket', '#3a3a44', 0.3, metal=0.7), rot=(math.radians(90), 0, 0), verts=24, r2=0.55))
    parts.append(cyl((0, 2.28, 0.95), 0.38, 0.1, pbr('nyala', '#ff8a1c', 0.3, emit=2), rot=(math.radians(90), 0, 0), verts=24, b=0))
    return parts


BODIES = {'bajaj': body_bajaj, 'gerobak': body_gerobak, 'bebek': body_bebek}
EXHAUST = {'bajaj': [(-0.45, 1.95, 0.95), (0.45, 1.95, 0.95)], 'gerobak': [(-0.6, 2.0, 0.85), (0.6, 2.0, 0.85)], 'bebek': [(0, 2.35, 0.95)]}


def kart(body):
    root = empty('kart_root')
    ch = empty('chassis')
    parent(BODIES[body](), ch)
    wheels = [wheel('wheel_FL', -1.05, -1.1, True), wheel('wheel_FR', 1.05, -1.1, True), wheel('wheel_RL', -1.05, 1.1, False), wheel('wheel_RR', 1.05, 1.1, False)]
    st = steering(-0.62 if body != 'bebek' else -0.7, 1.82 if body != 'bebek' else 1.9)
    ex = [empty(f'exhaust_{"LR"[k] if len(EXHAUST[body]) > 1 else "C"}', p) for k, p in enumerate(EXHAUST[body])]
    parent([ch, *wheels, st, *ex], root)
    return root


# ---------------------------------------------------------------------------

def to_meshes():
    bpy.ops.object.select_all(action='DESELECT')
    curves = [o for o in bpy.data.objects if o.type in ('CURVE', 'FONT')]
    for o in curves:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    if curves:
        bpy.ops.object.convert(target='MESH')


def decimate_all(ratio):
    for o in bpy.data.objects:
        if o.type == 'MESH':
            m = o.modifiers.new('dec', 'DECIMATE')
            m.ratio = ratio


def export(name):
    to_meshes()
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.name not in ('cam', 'sun'):
            o.select_set(True)
    path = (GLB_DIR / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT')
    tris = sum(len(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().loop_triangles) if False else 0 for o in [])
    print('GLB', path, tris)


OUT_DIR.mkdir(parents=True, exist_ok=True)
GLB_DIR.mkdir(parents=True, exist_ok=True)

SPRITE = dict(res=(512, 512), line=2.5)
jobs = []
for cid, color in CHARS.items():
    jobs.append((f'char-{cid}', lambda cid=cid, color=color: driver(cid, color), 'both', dict(SPRITE, ortho=3.4, target=(0, 0.2, 2.6))))
for b in BODIES:
    jobs.append((f'kart-{b}', lambda b=b: kart(b), 'both', dict(SPRITE, ortho=5.8, target=(0, 0, 1.2))))

for name, build, kind, cam in jobs:
    if ONLY and name not in ONLY:
        continue
    # GLB game (subdivision 1) + LOD ringan (tanpa subdivision, decimate)
    for suffix, sub, dec in (('', 1, None), ('-lod', 0, 0.5)):
        SUB['n'] = sub
        _mats.clear()
        clear()
        build()
        if dec:
            decimate_all(dec)
        export(name + suffix)
    # potret PNG (subdivision 2, garis tinta)
    SUB['n'] = 2
    _mats.clear()
    clear()
    root = build()
    root.rotation_euler = (0, 0, FACE_YAW + (math.radians(-28) if name.startswith('kart') else 0))
    if name.startswith('kart'):
        # potret kart: pasang pembalap Moci di kursi
        d = driver('moci', '#ff37a6')
        d.rotation_euler = root.rotation_euler
    studio(cam['ortho'], cam['res'], (3.2, -6.2, 3.4), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
