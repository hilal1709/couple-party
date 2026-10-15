# Aset Tebak Gambar, dimodel manual di Blender (bukan AI): krayon, alat gambar, kartu kata, stopwatch, ilustrasi.
# Jalankan: blender --background --python scripts/blender/draw.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py draw
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/draw']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

# warna krayon mengikuti INKS di src/games/draw/engine.ts
INKS = ['#121212', '#ff37a6', '#43b929', '#2f7bff', '#ffcc1f', '#ff8a1c', '#8a55ff', '#8b5a2b']


def hexmat(h, rough=0.45):
    key = 'x' + h.lstrip('#')
    if key not in PAL:
        PAL[key] = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    return mat(key, rough)


def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun'):
            bpy.data.objects.remove(o, do_unlink=True)


def group(name, children, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    for c in children:
        if c.parent is None:
            c.parent = e
    e.location = loc
    e.rotation_euler = rot
    e.scale = (scale, scale, scale)
    return e


def last():
    return bpy.context.object


def bevel(o, width=0.04, segments=3):
    m = o.modifiers.new('bev', 'BEVEL')
    m.width = width
    m.segments = segments
    return o


def tube(points, radius, material, kind='NURBS', name='tube'):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    sp = curve.splines.new(kind)
    sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (*co, 1)
    if kind == 'NURBS':
        sp.use_endpoint_u = True
        sp.order_u = min(4, len(points))
    o = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(o)
    add(o, material)
    return o


# ---------- krayon (berdiri di sumbu Z, ujung di atas) ----------
def crayon(color, length=1.2, r=0.13):
    parts = []
    body_h = length * 0.78
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=body_h, location=(0, 0, body_h / 2), vertices=32)
    body = add(last(), hexmat(color, 0.55))
    shade_smooth(body)
    parts.append(bevel(body, 0.015, 2))
    # pembungkus kertas dengan dua garis tinta
    bpy.ops.mesh.primitive_cylinder_add(radius=r * 1.06, depth=body_h * 0.55, location=(0, 0, body_h * 0.42), vertices=32)
    wrap = add(last(), mat('paper', 0.6))
    shade_smooth(wrap)
    parts.append(wrap)
    for z in (body_h * 0.2, body_h * 0.64):
        bpy.ops.mesh.primitive_torus_add(major_radius=r * 1.07, minor_radius=0.014, location=(0, 0, z))
        ring = add(last(), mat('ink', 0.3))
        no_lines(ring)
        parts.append(ring)
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r * 0.28, depth=length * 0.22, location=(0, 0, body_h + length * 0.11), vertices=32)
    tip = add(last(), hexmat(color, 0.5))
    shade_smooth(tip)
    parts.append(tip)
    return parts


def centered(name, parts, length, rot, loc=(0, 0, 0.5)):
    """Putar benda memanjang di titik tengahnya supaya pas di bingkai sprite."""
    inner = group(name + '-in', parts, loc=(0, 0, -length / 2))
    return group(name, [inner], loc=loc, rot=rot)


def crayon_sprite(color):
    return centered('crayon', crayon(color), 1.2, (math.radians(55), 0, math.radians(-30)), loc=(0, 0, 0.45))


# ---------- pensil ----------
def pencil(length=1.6, r=0.12, broken=False):
    parts = []
    body_h = length * 0.7
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=body_h, location=(0, 0, body_h / 2), vertices=6)
    body = add(last(), mat('yellow', 0.45))
    parts.append(bevel(body, 0.012, 2))
    # ferrule logam + penghapus pink
    bpy.ops.mesh.primitive_cylinder_add(radius=r * 1.04, depth=length * 0.07, location=(0, 0, -length * 0.035), vertices=24)
    ferrule = add(last(), hexmat('#c9c9d6', 0.25))
    shade_smooth(ferrule)
    parts.append(ferrule)
    bpy.ops.mesh.primitive_cylinder_add(radius=r * 0.98, depth=length * 0.1, location=(0, 0, -length * 0.12), vertices=24)
    rub = add(last(), mat('rose', 0.6))
    shade_smooth(rub)
    parts.append(bevel(rub, 0.03, 3))
    if not broken:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r * 0.25, depth=length * 0.2, location=(0, 0, body_h + length * 0.1), vertices=24)
        wood = add(last(), hexmat('#f2c58c', 0.6))
        shade_smooth(wood)
        parts.append(wood)
        bpy.ops.mesh.primitive_cone_add(radius1=r * 0.27, depth=length * 0.07, location=(0, 0, body_h + length * 0.225), vertices=16)
        parts.append(add(last(), mat('ink', 0.3)))
    else:
        # patahan bergerigi
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0, depth=length * 0.06, location=(0, 0, body_h + length * 0.03), vertices=6)
        parts.append(add(last(), hexmat('#f2c58c', 0.6)))
    return parts


def pencil_sprite():
    return centered('pencil', pencil(), 1.3, (math.radians(58), 0, math.radians(-35)), loc=(0, 0, 0.5))


# ---------- penghapus ----------
def eraser_sprite():
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.3))
    a = add(last(), mat('rose', 0.6))
    a.scale = (0.5, 0.95, 0.42)
    parts.append(bevel(a, 0.06, 4))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.47, 0.3))
    b = add(last(), hexmat('#2f7bff', 0.5))
    b.scale = (0.52, 0.42, 0.44)
    parts.append(bevel(b, 0.06, 4))
    # remah-remah penghapus
    for x, y in ((-0.3, -0.62), (0.15, -0.66), (-0.08, -0.74)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(x, y, 0.05), segments=10, ring_count=6)
        parts.append(add(last(), mat('rose', 0.6)))
    return group('eraser', parts, rot=(0, 0, math.radians(-50)))


# ---------- tong sampah (hapus semua) ----------
def bin_sprite():
    parts = []
    bpy.ops.mesh.primitive_cone_add(radius1=0.32, radius2=0.42, depth=0.85, location=(0, 0, 0.43), vertices=40)
    body = add(last(), stripe_mat('paper', 'rose', 'bin-stripes', 9))
    shade_smooth(body)
    parts.append(body)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.47, depth=0.09, location=(0.04, 0, 0.93), rotation=(0, math.radians(-12), 0), vertices=40)
    lid = add(last(), mat('rose', 0.45))
    shade_smooth(lid)
    parts.append(bevel(lid, 0.02))
    parts.append(tube([(-0.08, 0, 1.0), (0.04, 0, 1.1), (0.18, 0, 1.03)], 0.04, mat('ink', 0.3), 'NURBS', 'handle'))
    # kertas kusut menyembul
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.16, subdivisions=1, location=(-0.24, 0.05, 0.98))
    parts.append(add(last(), mat('paper', 0.6)))
    return group('bin', parts, rot=(0, 0, FACE_YAW))


# ---------- panah undo ----------
def undo_sprite():
    pts = []
    for i in range(14):
        a = math.radians(-40 + i * 17)
        pts.append((0.45 * math.cos(a), 0, 0.55 + 0.45 * math.sin(a)))
    arc = tube(pts, 0.1, mat('electric', 0.4), 'NURBS', 'arc')
    end = pts[-1]
    bpy.ops.mesh.primitive_cone_add(radius1=0.22, depth=0.34, location=(end[0] - 0.05, 0, end[2] - 0.12), vertices=3)
    head = add(last(), mat('electric', 0.4))
    head.rotation_euler = (math.radians(90), math.radians(-160), 0)
    head.scale = (1, 0.45, 1)
    return group('undo', [arc, head], rot=(0, 0, 0))


# ---------- kartu kata ----------
def wordcard(tone='paper', loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, mark=True):
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.62))
    c = add(last(), mat(tone, 0.45))
    c.scale = (0.9, 0.06, 1.2)
    parts.append(bevel(c, 0.05, 3))
    # garis huruf "_ _ _"
    for k in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.24 + k * 0.24, -0.04, 0.42))
        dash = add(last(), mat('ink', 0.3))
        dash.scale = (0.16, 0.02, 0.04)
        no_lines(dash)
        parts.append(dash)
    if mark:
        # tanda tanya dari tabung + titik
        q = [(-0.14, -0.05, 0.92), (-0.12, -0.05, 1.03), (0.0, -0.05, 1.07), (0.13, -0.05, 1.0), (0.1, -0.05, 0.88), (0.0, -0.05, 0.8), (0.0, -0.05, 0.7)]
        parts.append(tube(q, 0.045, mat('rose', 0.4), 'NURBS', 'q'))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=(0, -0.05, 0.6), segments=12, ring_count=8)
        parts.append(add(last(), mat('rose', 0.4)))
    return group('wordcard', parts, loc=loc, rot=rot, scale=scale)


def wordcard_sprite():
    wordcard('electric', loc=(-0.28, 0.15, 0), rot=(0, math.radians(14), FACE_YAW), mark=False)
    wordcard('paper', loc=(0.12, -0.05, 0), rot=(0, math.radians(-8), FACE_YAW))


# ---------- stopwatch ----------
def stopwatch(loc=(0, 0, 0), scale=1.0):
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=0.2, location=(0, 0, 0.6), rotation=(math.radians(90), 0, 0), vertices=48)
    case = add(last(), mat('rose', 0.4))
    shade_smooth(case)
    parts.append(bevel(case, 0.04))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=0.04, location=(0, -0.1, 0.6), rotation=(math.radians(90), 0, 0), vertices=48)
    face = add(last(), mat('paper', 0.3))
    shade_smooth(face)
    parts.append(face)
    for k in range(12):
        a = k / 12 * math.tau
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0.33 * math.cos(a), -0.125, 0.6 + 0.33 * math.sin(a)))
        t = add(last(), mat('ink', 0.3))
        t.scale = (0.025, 0.01, 0.06 if k % 3 == 0 else 0.03)
        t.rotation_euler = (0, -a + math.pi / 2, 0)
        no_lines(t)
        parts.append(t)
    hand = tube([(0, -0.14, 0.6), (0.17, -0.14, 0.82)], 0.025, mat('ink', 0.3), 'POLY', 'hand')
    no_lines(hand)
    parts.append(hand)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.16, location=(0, 0, 1.15), vertices=24)
    parts.append(bevel(add(last(), mat('electric', 0.4)), 0.02))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.1, location=(0, 0, 1.06), vertices=16)
    parts.append(add(last(), mat('ink', 0.3)))
    for side in (1, -1):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.1, location=(side * 0.38, 0, 1.0), rotation=(0, math.radians(side * 40), 0), vertices=16)
        parts.append(add(last(), mat('electric', 0.4)))
    return group('stopwatch', parts, loc=loc, rot=(0, 0, FACE_YAW * 0.5), scale=scale)


# ---------- easel & kanvas bercoret ----------
def easel(loc=(0, 0, 0), scale=1.0, doodle=True):
    parts = []
    wood = hexmat('#c98a4b', 0.6)
    for x, lean in ((-0.55, 10), (0.55, -10)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=2.3, location=(x, 0, 1.1), rotation=(0, math.radians(lean), 0), vertices=12)
        parts.append(add(last(), wood))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=2.0, location=(0, 0.45, 0.95), rotation=(math.radians(-22), 0, 0), vertices=12)
    parts.append(add(last(), wood))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.1, 0.62))
    shelf = add(last(), wood)
    shelf.scale = (1.3, 0.18, 0.06)
    parts.append(shelf)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.12, 1.32))
    board = add(last(), mat('paper', 0.6))
    board.scale = (1.5, 0.06, 1.25)
    board.rotation_euler = (math.radians(-6), 0, 0)
    parts.append(bevel(board, 0.03))
    if doodle:
        d0 = len(parts)
        # coretan kucing: kepala bulat, telinga, kumis, plus matahari kecil
        y = -0.17
        circle = [(0.3 * math.cos(t / 15 * math.tau) - 0.15, y, 1.25 + 0.27 * math.sin(t / 15 * math.tau)) for t in range(16)]
        parts.append(tube(circle, 0.028, mat('ink', 0.3), 'NURBS', 'head'))
        for side in (1, -1):
            parts.append(tube([(-0.15 + side * 0.13, y, 1.45), (-0.15 + side * 0.22, y, 1.66), (-0.15 + side * 0.27, y, 1.42)], 0.028, mat('rose', 0.3), 'POLY', 'ear'))
            for dz in (0.0, -0.06):
                parts.append(tube([(-0.15 + side * 0.1, y, 1.2 + dz), (-0.15 + side * 0.42, y, 1.23 + dz * 2)], 0.016, mat('ink', 0.3), 'POLY', 'whisker'))
        for side in (1, -1):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=(-0.15 + side * 0.1, y, 1.3), segments=10, ring_count=6)
            parts.append(add(last(), mat('ink', 0.3)))
        sun = [(0.48 + 0.11 * math.cos(t / 11 * math.tau), y, 1.68 + 0.11 * math.sin(t / 11 * math.tau)) for t in range(12)]
        parts.append(tube(sun, 0.026, mat('yellow', 0.3), 'NURBS', 'sun'))
        parts.append(tube([(0.2, y, 0.86), (0.4, y, 0.95), (0.6, y, 0.84)], 0.03, mat('fern', 0.3), 'NURBS', 'grass'))
        for o in parts[d0:]:
            no_lines(o)
    return group('easel', parts, loc=loc, rot=(0, 0, FACE_YAW * 0.55), scale=scale)


def lying(item_parts, loc, yaw, name='lying'):
    """Rebahkan benda (yang berdiri di Z) di lantai."""
    return group(name, item_parts, loc=loc, rot=(math.radians(90), 0, yaw))


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.75, res=(384, 384), target=(0, 0, 0.55), line=3.0)
ASSETS = {}

for i, c in enumerate(INKS):
    ASSETS[f'crayon-{i}'] = (lambda c=c: crayon_sprite(c), dict(SPRITE, ortho=1.45, target=(0, 0, 0.45)))
ASSETS['tool-pencil'] = (pencil_sprite, dict(SPRITE, ortho=1.9, target=(0, 0, 0.5)))
ASSETS['tool-eraser'] = (eraser_sprite, dict(SPRITE, ortho=1.9, target=(0, 0, 0.3)))
ASSETS['tool-bin'] = (bin_sprite, dict(SPRITE, ortho=1.6, target=(0, 0, 0.55)))
ASSETS['tool-undo'] = (undo_sprite, dict(SPRITE, ortho=1.5, target=(0, 0, 0.55)))
ASSETS['wordcard'] = (wordcard_sprite, dict(SPRITE, ortho=2.2, target=(0, 0, 0.62)))
ASSETS['stopwatch'] = (stopwatch, dict(SPRITE, ortho=1.6, target=(0, 0, 0.68)))


def tile_draw():
    pedestal((0, 0, -0.18), w=2.8, d=1.3)
    easel(loc=(-0.45, 0.25, 0), scale=0.8)
    mochi((0.8, -0.1, 0.62), tilt=-6)
    group('pencil', pencil(length=1.2), loc=(1.35, -0.2, 0.0), rot=(0, math.radians(18), FACE_YAW))
    for (x, y, yaw), c in zip(((-1.15, -0.35, 20), (-0.7, -0.5, 75), (-0.2, -0.42, 140), (0.25, -0.55, 35)), INKS[1:5]):
        lying(crayon(c, length=0.55, r=0.06), (x, y, 0.06), math.radians(yaw))


def draw_win():
    pedestal((0.2, 0, -0.18), w=1.7, d=1.1)
    pedestal((0.2, 0, 0.17), w=1.2, d=0.9)
    mochi((0.05, 0, 0.95), tilt=6)
    pip((0.62, 0.05, 1.1), tilt=-14)
    crown((0.05, 0, 1.58))
    group('pencil', pencil(length=1.5), loc=(-0.6, 0.0, 0.3), rot=(0, math.radians(-25), FACE_YAW))
    easel(loc=(-1.25, 0.6, -0.35), scale=0.6)
    for (x, y, yaw), c in zip(((1.1, -0.6, 20), (0.7, -0.75, 95), (-0.3, -0.75, 150), (-0.8, -0.6, 40), (1.3, 0.1, 120)), INKS[1:6]):
        lying(crayon(c, length=0.55, r=0.06), (x, y, -0.3), math.radians(yaw))


def draw_lose():
    pedestal((0, 0, -0.18), w=2.0, d=1.2)
    pip((0.1, 0, 0.82), tilt=8, happy=False)
    tear((0.0, -0.45, 1.05))
    # pensil patah dua
    group('pencil-a', pencil(length=1.0, broken=True), loc=(-0.75, -0.2, 0.07), rot=(math.radians(90), 0, math.radians(20)))
    bpy.ops.mesh.primitive_cone_add(radius1=0.12, radius2=0.03, depth=0.3, location=(-0.2, -0.45, 0.07), rotation=(0, math.radians(80), math.radians(-30)), vertices=6)
    add(last(), mat('yellow', 0.45))
    wordcard('paper', loc=(0.85, 0.1, 0.0), rot=(0, math.radians(-12), FACE_YAW), scale=0.6)


ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-draw'] = (tile_draw, dict(ILLU, ortho=3.9, target=(0, 0, 0.75)))
ASSETS['draw-win'] = (draw_win, dict(ILLU, ortho=3.8, res=(1200, 1100)))
ASSETS['draw-lose'] = (draw_lose, dict(ILLU, ortho=3.2, res=(1200, 1100)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
