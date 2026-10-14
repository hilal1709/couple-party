# Aset Ular Tangga, dimodel manual di Blender (bukan AI): bidak, dadu, kepala ular, item, ilustrasi.
# Jalankan: blender --background --python scripts/blender/snakes.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/snakes']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

# warna bidak & ular mengikuti src/games/snakes/ui/art.tsx
PAWN_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']
SNAKE_HEX = ['#ff37a6', '#5cf64a', '#ffcc1f', '#8a55ff']
SUITS = ['#ff3b5c', '#ffcc1f', '#43b929', '#2f7bff']


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
    """Satukan objek di bawah empty supaya bisa diputar/digeser bersama."""
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


# ---------- bidak ----------
def pawn(color):
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.16, location=(0, 0, 0.08), vertices=48)
    parts.append(bevel(add(last(), hexmat(color)), 0.04))
    bpy.ops.mesh.primitive_cone_add(radius1=0.32, radius2=0.18, depth=0.5, location=(0, 0, 0.41), vertices=48)
    body = add(last(), hexmat(color))
    shade_smooth(body)
    parts.append(body)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0.9), segments=40, ring_count=24)
    head = add(last(), hexmat(color))
    head.name = 'PawnHead'
    shade_smooth(head)
    parts.append(head)
    eye(-0.11, -0.25, 0.95, head, 0.07)
    eye(0.11, -0.25, 0.95, head, 0.07)
    mouth(0, -0.29, 0.84, head, True)
    return group('pawn', parts, rot=(0, 0, FACE_YAW))


# ---------- dadu ----------
PIPS = {
    1: [(0, 0)],
    2: [(-1, -1), (1, 1)],
    3: [(-1, -1), (0, 0), (1, 1)],
    4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
    5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)],
    6: [(-1, -1), (-1, 0), (-1, 1), (1, -1), (1, 0), (1, 1)],
}
FRONT = {1: 2, 2: 3, 3: 2, 4: 5, 5: 4, 6: 2}


def die(n, tone='paper', loc=(0, 0, 0), scale=1.0, rot=(0, 0, math.radians(12))):
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
    parts.append(bevel(add(last(), mat(tone, 0.35)), 0.13, 5))
    shade_smooth(parts[-1])
    front = FRONT[n]
    right = next(k for k in range(1, 7) if k not in (n, 7 - n, front, 7 - front))
    s = 0.25

    def pip(co, sc):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.085, location=co, segments=16, ring_count=10)
        p = add(last(), mat('ink', 0.3))
        p.scale = sc
        no_lines(p)
        parts.append(p)

    for u, v in PIPS[n]:
        pip((u * s, v * s, 1.0), (1, 1, 0.35))
    for u, v in PIPS[front]:
        pip((u * s, -0.5, 0.5 + v * s), (1, 0.35, 1))
    for u, v in PIPS[right]:
        pip((0.5, u * s, 0.5 + v * s), (0.35, 1, 1))
    return group('die', parts, loc=loc, rot=rot, scale=scale)


# ---------- kepala ular (menghadap +X, dilihat dari atas) ----------
def snake_head(color, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0), segments=40, ring_count=24)
    h = add(last(), hexmat(color, 0.4))
    h.scale = (1.3, 1.0, 0.62)
    shade_smooth(h)
    parts.append(h)
    for side in (1, -1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(0.22, side * 0.25, 0.22), segments=20, ring_count=12)
        w = add(last(), mat('paper', 0.2))
        shade_smooth(w)
        parts.append(w)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(0.3, side * 0.25, 0.32), segments=14, ring_count=8)
        pupil = add(last(), mat('ink', 0.2))
        no_lines(pupil)
        parts.append(pupil)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, location=(0.6, side * 0.1, 0.12))
        nostril = add(last(), mat('ink', 0.3))
        no_lines(nostril)
        parts.append(nostril)
    tongue = hexmat('#ff3b5c', 0.4)
    parts.append(tube([(0.55, 0, -0.05), (0.85, 0, -0.03), (1.02, 0, -0.03)], 0.055, tongue, 'POLY', 'tongue'))
    for side in (1, -1):
        parts.append(tube([(1.0, 0, -0.03), (1.18, side * 0.11, -0.03)], 0.055, tongue, 'POLY', 'fork'))
    return group('head', parts, loc=loc, rot=rot, scale=scale)


# ---------- item ----------
def checkmark(pts, y):
    return tube([(x, y, z) for x, z in pts], 0.05, mat('ink', 0.3), 'POLY', 'check')


def shield():
    curve = bpy.data.curves.new('shield', 'CURVE')
    curve.dimensions = '2D'
    curve.fill_mode = 'BOTH'
    curve.extrude = 0.08
    curve.bevel_depth = 0.03
    sp = curve.splines.new('POLY')
    outline = [(0, 0.62), (0.24, 0.55), (0.46, 0.48), (0.45, 0.12), (0.36, -0.2), (0.2, -0.45), (0, -0.6),
               (-0.2, -0.45), (-0.36, -0.2), (-0.45, 0.12), (-0.46, 0.48), (-0.24, 0.55)]
    sp.points.add(len(outline) - 1)
    for p, (x, y) in zip(sp.points, outline):
        p.co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    o = bpy.data.objects.new('shield', curve)
    scene.collection.objects.link(o)
    add(o, mat('electric', 0.4))
    o.rotation_euler = (math.radians(90), 0, 0)
    o.location = (0, 0, 0.62)
    ck = checkmark([(-0.2, 0.62), (-0.05, 0.45), (0.22, 0.8)], -0.12)
    return group('item', [o, ck], rot=(0, 0, FACE_YAW))


def ticket():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.55))
    t = add(last(), mat('yellow', 0.4))
    t.scale = (1.0, 0.1, 0.56)
    bevel(t, 0.03)
    ck = checkmark([(-0.17, 0.55), (-0.04, 0.42), (0.2, 0.7)], -0.07)
    return group('item', [t, ck], rot=(0, 0, FACE_YAW))


def trap():
    parts = []
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.3, subdivisions=1, location=(0, 0, 0.5))
    core = last()
    add(core, mat('ink', 0.3))
    parts.append(core)
    dirs = [v.co.normalized() for v in core.data.vertices]
    for d in dirs:
        loc = Vector((0, 0, 0.5)) + d * 0.36
        bpy.ops.mesh.primitive_cone_add(radius1=0.09, depth=0.22, location=loc, vertices=12)
        c = last()
        c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        add(c, mat('rose', 0.4))
        parts.append(c)
    return group('item', parts)


def gift(loc=(0, 0, 0), scale=1.0):
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=0.7, location=(0, 0, 0.35))
    parts.append(bevel(add(last(), mat('rose', 0.45)), 0.02))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.76))
    lid = add(last(), mat('petal', 0.45))
    lid.scale = (0.82, 0.82, 0.16)
    parts.append(bevel(lid, 0.02))
    for sx, sy in ((0.14, 0.86), (0.86, 0.14)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.43))
        r = add(last(), mat('electric', 0.4))
        r.scale = (sx, sy, 0.87)
        parts.append(r)
    for side in (1, -1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.14, minor_radius=0.045, location=(side * 0.13, 0, 0.94),
                                         rotation=(math.radians(90), math.radians(side * 30), 0))
        bow = add(last(), mat('electric', 0.4))
        shade_smooth(bow)
        parts.append(bow)
    return group('gift', parts, loc=loc, rot=(0, 0, FACE_YAW * 0.6), scale=scale)


# ---------- dekor ilustrasi ----------
def ladder(base, height=2.2, lean=12, width=0.56, color='grass'):
    parts = []
    rail = mat(color, 0.4)
    for side in (1, -1):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=height, location=(side * width / 2, 0, height / 2), vertices=24)
        r = add(last(), rail)
        shade_smooth(r)
        parts.append(r)
    rungs = int(height / 0.32)
    for i in range(rungs):
        z = 0.25 + i * (height - 0.35) / max(1, rungs - 1)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=width, location=(0, 0, z), rotation=(0, math.radians(90), 0), vertices=16)
        parts.append(add(last(), mat('paper', 0.4)))
    return group('ladder', parts, loc=base, rot=(math.radians(-lean), 0, FACE_YAW))


def coil(center, turns=2.2, r0=0.55, r1=0.3, rise=0.9, color='#ff37a6', head_scale=0.55):
    """Ular melingkar spiral naik, kepala di ujung atas menatap kamera."""
    cx, cy, cz = center
    n = 40
    pts = []
    for i in range(n):
        t = i / (n - 1)
        a = t * turns * math.tau
        r = r0 + (r1 - r0) * t
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), cz + 0.14 + rise * t))
    body = tube(pts, 0.14, stripe_mat('petal', 'rose', f'snake-{color}', 14) if color == '#ff37a6' else hexmat(color, 0.4), name='body')
    end = pts[-1]
    # kepala menghadap kamera (−Y diputar FACE_YAW), sedikit menunduk
    head = snake_head(color, loc=(end[0], end[1], end[2] + 0.18), rot=(0, math.radians(-25), -math.pi / 2 + FACE_YAW), scale=head_scale)
    return body, head


def card(loc, color, rot):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    c = add(last(), hexmat(color, 0.4))
    c.scale = (0.62, 0.05, 0.92)
    bevel(c, 0.05, 3)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.06, location=(0, -0.01, 0), rotation=(math.radians(90), 0, 0), vertices=40)
    oval = add(last(), mat('paper', 0.4))
    oval.scale = (1, 1.45, 1)
    oval.rotation_euler = (math.radians(90), math.radians(30), 0)
    return group('card', [c, oval], loc=loc, rot=rot)


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.75, res=(384, 384), target=(0, 0, 0.55), line=3.0)
ASSETS = {}

for i, c in enumerate(PAWN_HEX):
    ASSETS[f'pawn-{i}'] = (lambda c=c: pawn(c), dict(SPRITE, ortho=1.6, target=(0, 0, 0.6)))
for tone in ('paper', 'rose'):
    for n in range(1, 7):
        ASSETS[f'die-{tone}-{n}'] = (lambda n=n, tone=tone: die(n, tone), dict(SPRITE, ortho=2.0, target=(0, 0, 0.5)))
for i, c in enumerate(SNAKE_HEX):
    ASSETS[f'snake-head-{i}'] = (lambda c=c: snake_head(c), dict(ortho=3.0, res=(256, 256), cam_loc=(0, 0, 10), target=(0, 0, 0), line=2.5))
ASSETS['item-shield'] = (shield, SPRITE)
ASSETS['item-pass'] = (ticket, SPRITE)
ASSETS['item-trap'] = (trap, dict(SPRITE, ortho=1.5, target=(0, 0, 0.5)))
ASSETS['item-double'] = (lambda: (die(5, 'paper', loc=(-0.38, 0.1, 0), scale=0.6, rot=(0, 0, math.radians(-14))),
                                  die(2, 'rose', loc=(0.36, -0.15, 0), scale=0.6, rot=(0, 0, math.radians(20)))), SPRITE)
ASSETS['gift'] = (gift, SPRITE)


def tile_snakes():
    pedestal((0, 0, -0.18), w=2.8, d=1.3)
    coil((-0.75, 0.05, 0), color='#ff37a6')
    ladder((0.75, 0.1, 0), height=2.0)
    pip((0.62, -0.3, 1.25), tilt=-8)
    gift(loc=(-0.1, -0.35, 0), scale=0.45)


def snakes_win():
    pedestal((0.2, 0, -0.18), w=1.7, d=1.1)
    pedestal((0.2, 0, 0.17), w=1.2, d=0.9)
    ladder((-0.75, 0.15, -0.35), height=1.6, lean=8)
    mochi((0.05, 0, 0.95), tilt=6)
    pip((0.62, 0.05, 1.1), tilt=-14)
    crown((0.05, 0, 1.58))
    squiggle_tube((0.2, -0.6, -0.05), 1.6, 'electric')


def snakes_lose():
    pedestal((0, 0, -0.18), w=2.0, d=1.2)
    mochi((0.15, 0, 0.62), tilt=-4, happy=False)
    coil((0.15, 0, 0.05), turns=1.6, r0=0.72, r1=0.64, rise=0.75, color='#5cf64a', head_scale=0.5)
    die(1, 'paper', loc=(-0.95, -0.2, 0.0), scale=0.35)


def tile_uno():
    pedestal((0, 0, -0.18), w=2.6, d=1.2)
    for i, c in enumerate(SUITS):
        card((-0.95 + i * 0.32, 0.15, 0.6 + abs(i - 1.5) * -0.04), c, (0, math.radians(-24 + i * 16), FACE_YAW))
    pip((0.85, -0.05, 0.78), tilt=-10)


ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-snakes'] = (tile_snakes, ILLU)
ASSETS['tile-uno'] = (tile_uno, dict(ILLU, ortho=3.8))
ASSETS['snakes-win'] = (snakes_win, dict(ILLU, ortho=3.6, res=(1200, 1100)))
ASSETS['snakes-lose'] = (snakes_lose, dict(ILLU, ortho=3.4, res=(1200, 1100)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
