# Aset Monopoli, dimodel manual di Blender (bukan AI): bidak, rumah & hotel, dadu, kartu, ikon petak,
# landmark tiap komplek kota, dan ilustrasi menu/menang/kalah.
# Jalankan: blender --background --python scripts/blender/monopoly.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py monopoly
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/monopoly']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

# warna mengikuti src/games/monopoly/ui/art.tsx (PAWN_HEX) & board.ts (GROUP_HEX)
PAWN_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']
GROUP_HEX = {
    'brown': '#9a5b34', 'sky': '#7fd6ff', 'pink': '#ff37a6', 'orange': '#ff8a1c',
    'red': '#ff3b5c', 'yellow': '#ffcc1f', 'green': '#43b929', 'navy': '#2f4bff',
}
MONEY = '#87e752'
SAND = '#e9c27a'
STEEL = '#9aa3b5'


def hexmat(h, rough=0.45):
    key = 'x' + h.lstrip('#')
    if key not in PAL:
        PAL[key] = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    return mat(key, rough)


def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun'):
            bpy.data.objects.remove(o, do_unlink=True)


def last():
    return bpy.context.object


def group(name, children, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    for c in children:
        if c.parent is None:
            c.parent = e
    e.location = loc
    e.rotation_euler = rot
    e.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    return e


def bevel(o, width=0.04, segments=3):
    m = o.modifiers.new('bev', 'BEVEL')
    m.width = width
    m.segments = segments
    return o


def box(loc, size, color, rough=0.45, bev=0.03, lines=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = add(last(), hexmat(color, rough) if color.startswith('#') else mat(color, rough))
    o.scale = size
    if bev:
        bevel(o, bev, 3)
    if not lines:
        no_lines(o)
    return o


def cyl(loc, r, h, color, rot=(0, 0, 0), verts=40, rough=0.45, lines=True, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    o = add(last(), hexmat(color, rough) if color.startswith('#') else mat(color, rough))
    if smooth:
        shade_smooth(o)
    if not lines:
        no_lines(o)
    return o


def ball(loc, r, color, scale=(1, 1, 1), rough=0.4, lines=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=20)
    o = add(last(), hexmat(color, rough) if color.startswith('#') else mat(color, rough))
    o.scale = scale
    shade_smooth(o)
    if not lines:
        no_lines(o)
    return o


def cone_(loc, r1, h, color, r2=0.0, rot=(0, 0, 0), verts=40, rough=0.45):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    o = add(last(), hexmat(color, rough) if color.startswith('#') else mat(color, rough))
    shade_smooth(o)
    return o


def torus(loc, R, r, color, rot=(0, 0, 0), rough=0.4):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=40, minor_segments=14)
    o = add(last(), hexmat(color, rough) if color.startswith('#') else mat(color, rough))
    shade_smooth(o)
    return o


def label(text, loc, size, material, rot=(math.radians(90), 0, 0), name='label', extrude=0.015):
    """Teks 3D tipis berdiri di bidang XZ (menghadap -Y)."""
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = extrude
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    add(o, material)
    no_lines(o)
    return o


def prism(points, depth, color, loc=(0, 0, 0), rot=(0, 0, 0), rough=0.45):
    """Bentuk 2D (bidang XZ) yang ditebalkan sepanjang Y."""
    n = len(points)
    verts = [(x, -depth / 2, z) for x, z in points] + [(x, depth / 2, z) for x, z in points]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me = bpy.data.meshes.new('prism')
    me.from_pydata(verts, [], faces)
    me.validate()
    o = bpy.data.objects.new('prism', me)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    add(o, hexmat(color, rough) if color.startswith('#') else mat(color, rough))
    return o


# ---------- bangunan ----------
def house(loc=(0, 0, 0), color='#43b929', scale=1.0, yaw=FACE_YAW):
    parts = [box((0, 0, 0.22), (0.5, 0.42, 0.44), color, bev=0.02)]
    roof = prism([(-0.32, 0), (0, 0.26), (0.32, 0)], 0.48, color, loc=(0, 0, 0.44))
    parts.append(roof)
    parts.append(box((0, -0.212, 0.13), (0.13, 0.01, 0.24), 'ink', bev=0, lines=False))
    parts.append(box((0.15, -0.212, 0.3), (0.1, 0.01, 0.1), 'paper', bev=0, lines=False))
    return group('house', parts, loc=loc, rot=(0, 0, yaw), scale=scale)


def hotel(loc=(0, 0, 0), color='#ff3b5c', scale=1.0, yaw=FACE_YAW):
    parts = [box((0, 0, 0.4), (1.0, 0.44, 0.8), color, bev=0.03)]
    parts.append(prism([(-0.58, 0), (0, 0.3), (0.58, 0)], 0.5, color, loc=(0, 0, 0.8)))
    for row in range(2):
        for col in range(4):
            parts.append(box((-0.33 + col * 0.22, -0.222, 0.3 + row * 0.26), (0.12, 0.01, 0.13), 'paper', bev=0, lines=False))
    parts.append(box((0, -0.222, 0.08), (0.2, 0.01, 0.16), 'ink', bev=0, lines=False))
    return group('hotel', parts, loc=loc, rot=(0, 0, yaw), scale=scale)


# ---------- dadu ----------
PIPS = {
    1: [(0, 0)],
    2: [(-1, 1), (1, -1)],
    3: [(-1, 1), (0, 0), (1, -1)],
    4: [(-1, 1), (1, 1), (-1, -1), (1, -1)],
    5: [(-1, 1), (1, 1), (0, 0), (-1, -1), (1, -1)],
    6: [(-1, 1), (1, 1), (-1, 0), (1, 0), (-1, -1), (1, -1)],
}


def die(value, color, loc=(0, 0, 0.5), size=0.8, rot=(0, 0, FACE_YAW), pip_color='ink'):
    s = size
    parts = [box((0, 0, 0), (s, s, s), color, rough=0.35, bev=s * 0.14)]
    g = s * 0.24
    r = s * 0.075

    def face(n, place):
        for u, v in PIPS[n]:
            o = cyl((0, 0, 0), r, 0.02, pip_color, verts=20, lines=False)
            place(o, u * g, v * g)
            parts.append(o)

    def top(o, u, v):
        o.location = (u, v, s / 2 + 0.002)

    def front(o, u, v):
        o.location = (u, -s / 2 - 0.002, v)
        o.rotation_euler = (math.radians(90), 0, 0)

    def right(o, u, v):
        o.location = (s / 2 + 0.002, -u, v)
        o.rotation_euler = (0, math.radians(90), 0)

    side = {1: (2, 3), 2: (1, 3), 3: (1, 2), 4: (1, 5), 5: (3, 1), 6: (2, 4)}[value]
    # angka utama di muka depan (paling besar terlihat kamera), dua sisi lain di atas & kanan
    face(value, front)
    face(side[0], top)
    face(side[1], right)
    return group('die', parts, loc=loc, rot=rot)


# ---------- bidak ----------
def token_car(c):
    parts = [box((0, 0, 0.2), (0.9, 0.42, 0.22), c, bev=0.08)]
    parts.append(box((-0.05, 0, 0.38), (0.48, 0.38, 0.2), c, bev=0.08))
    parts.append(box((-0.05, -0.192, 0.39), (0.36, 0.01, 0.12), 'paper', bev=0, lines=False))
    for x in (-0.28, 0.28):
        for y in (-0.21, 0.21):
            parts.append(cyl((x, y, 0.11), 0.11, 0.08, 'ink', rot=(math.radians(90), 0, 0), verts=24))
    return parts


def token_hat(c):
    return [
        cyl((0, 0, 0.04), 0.5, 0.06, c, verts=48),
        cyl((0, 0, 0.36), 0.3, 0.62, c, verts=48),
        cyl((0, 0, 0.16), 0.305, 0.12, 'ink', verts=48),
    ]


def token_boat(c):
    hull = prism([(-0.5, 0.2), (0.5, 0.2), (0.32, 0), (-0.32, 0)], 0.32, c)
    mast = cyl((0, 0, 0.6), 0.03, 0.8, 'ink', verts=12)
    sail = prism([(0.04, 0.32), (0.04, 0.95), (0.42, 0.32)], 0.02, 'paper')
    flag = prism([(0.03, 1.0), (0.03, 1.12), (-0.2, 1.06)], 0.02, c)
    return [hull, mast, sail, flag]


def token_boot(c):
    leg = box((-0.12, 0, 0.42), (0.3, 0.3, 0.64), c, bev=0.06)
    foot = box((0.1, 0, 0.1), (0.62, 0.32, 0.2), c, bev=0.07)
    sole = box((0.08, 0, 0.02), (0.66, 0.34, 0.04), 'ink', bev=0.01)
    cuff = box((-0.12, 0, 0.74), (0.34, 0.34, 0.08), 'paper', bev=0.02)
    return [leg, foot, sole, cuff]


def token_rocket(c):
    body = cyl((0, 0, 0.45), 0.16, 0.6, 'paper', verts=32)
    nose = cone_((0, 0, 0.88), 0.16, 0.26, c)
    win = cyl((0, -0.155, 0.55), 0.07, 0.02, '#2f7bff', rot=(math.radians(90), 0, 0), verts=20)
    fins = [prism([(0.14, 0.15), (0.34, 0.0), (0.14, 0.36)], 0.04, c, rot=(0, 0, a)) for a in (0, math.tau / 3, 2 * math.tau / 3)]
    flame = cone_((0, 0, 0.08), 0.1, 0.18, 'yellow', rot=(math.radians(180), 0, 0))
    return [body, nose, win, flame, *fins]


def token_plane(c, scale=1.0):
    body = cyl((0, 0, 0.3), 0.11, 0.9, c, rot=(0, math.radians(90), 0), verts=24)
    nose = ball((0.45, 0, 0.3), 0.11, c)
    wing = box((0.02, 0, 0.3), (0.26, 1.0, 0.04), c, bev=0.015)
    tail = prism([(-0.45, 0.3), (-0.32, 0.3), (-0.45, 0.55)], 0.03, c)
    stab = box((-0.4, 0, 0.32), (0.14, 0.4, 0.03), c, bev=0.01)
    return [body, nose, wing, tail, stab]


def token_balloon(c):
    env = ball((0, 0, 0.62), 0.34, c, scale=(1, 1, 1.12))
    stripe = torus((0, 0, 0.62), 0.345, 0.03, 'paper')
    basket = box((0, 0, 0.1), (0.2, 0.2, 0.16), '#9a5b34', bev=0.02)
    ropes = [cyl((x * 0.09, y * 0.09, 0.26), 0.008, 0.22, 'ink', verts=6, lines=False) for x in (-1, 1) for y in (-1, 1)]
    return [env, stripe, basket, *ropes]


def token_teapot(c):
    body = ball((0, 0, 0.3), 0.3, c, scale=(1.1, 1, 0.85))
    lid = cyl((0, 0, 0.56), 0.13, 0.05, c, verts=24)
    knob = ball((0, 0, 0.62), 0.05, 'paper')
    spout = cyl((0.36, 0, 0.36), 0.045, 0.3, c, rot=(0, math.radians(-50), 0), verts=16)
    handle = torus((-0.33, 0, 0.32), 0.12, 0.03, c, rot=(math.radians(90), 0, 0))
    return [body, lid, knob, spout, handle]


TOKENS = [token_car, token_hat, token_boat, token_boot, token_rocket, token_plane, token_balloon, token_teapot]


def pawn_sprite(i):
    parts = TOKENS[i](PAWN_HEX[i])
    group('token', parts, rot=(0, 0, FACE_YAW + (math.radians(-35) if i in (0, 5) else 0)))


# ---------- kartu & ikon petak ----------
def card(color, mark, loc=(0, 0, 0.5), rot=(0, 0, FACE_YAW), scale=1.0, mark_color='ink'):
    parts = [box((0, 0, 0), (0.62, 0.05, 0.9), color, rough=0.4, bev=0.03)]
    parts.append(box((0, -0.026, 0), (0.5, 0.005, 0.78), 'paper', bev=0, lines=False))
    parts.append(label(mark, (0, -0.032, -0.02), 0.5, mat(mark_color, 0.4) if not mark_color.startswith('#') else hexmat(mark_color, 0.4)))
    return group('card', parts, loc=loc, rot=rot, scale=scale)


def chest(loc=(0, 0, 0), scale=1.0):
    parts = [box((0, 0, 0.22), (0.8, 0.5, 0.44), '#9a5b34', bev=0.03)]
    lid = cyl((0, 0, 0.44), 0.25, 0.8, '#9a5b34', rot=(0, math.radians(90), 0), verts=32)
    lid.scale = (1, 1, 1)
    parts.append(lid)
    for x in (-0.3, 0.3):
        parts.append(box((x, 0, 0.36), (0.07, 0.52, 0.72), 'yellow', bev=0.01))
    parts.append(box((0, -0.26, 0.4), (0.14, 0.03, 0.16), 'yellow', bev=0.01))
    parts.append(ball((0.0, 0.0, 0.72), 0.12, MONEY))
    return group('chest', parts, loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def bulb(loc=(0, 0, 0)):
    glass = ball((0, 0, 0.62), 0.32, 'yellow', rough=0.2)
    neck = cone_((0, 0, 0.32), 0.12, 0.22, 'yellow', r2=0.2)
    base = cyl((0, 0, 0.16), 0.13, 0.16, STEEL, verts=24)
    tip = cyl((0, 0, 0.05), 0.06, 0.06, 'ink', verts=16)
    rays = [box((0.55 * math.cos(a), 0, 0.62 + 0.55 * math.sin(a)), (0.16, 0.04, 0.05), 'ink', bev=0.01) for a in (0.2, 0.9, math.pi - 0.9, math.pi - 0.2)]
    for r, a in zip(rays, (0.2, 0.9, math.pi - 0.9, math.pi - 0.2)):
        r.rotation_euler = (0, -a, 0)
    group('bulb', [glass, neck, base, tip, *rays], loc=loc, rot=(0, 0, FACE_YAW))


def drop(loc=(0, 0, 0)):
    body = ball((0, 0, 0.38), 0.32, '#2f7bff', rough=0.2)
    tip = cone_((0, 0, 0.78), 0.29, 0.5, '#2f7bff', rough=0.2)
    shine = ball((-0.12, -0.26, 0.48), 0.07, 'paper', lines=False)
    tap = box((0.0, 0.0, 1.18), (0.5, 0.16, 0.14), STEEL, bev=0.04)
    spout = cyl((0.0, 0.0, 1.06), 0.06, 0.14, STEEL, verts=16)
    group('drop', [body, tip, shine, tap, spout], loc=loc, rot=(0, 0, FACE_YAW))


def money_bag(loc=(0, 0, 0), scale=1.0):
    body = ball((0, 0, 0.36), 0.36, MONEY, scale=(1, 1, 0.95))
    neck = cyl((0, 0, 0.72), 0.12, 0.12, MONEY, verts=24)
    tie = torus((0, 0, 0.7), 0.13, 0.035, 'ink')
    top = cone_((0, 0, 0.84), 0.2, 0.16, MONEY, r2=0.05, rot=(math.radians(180), 0, 0))
    sign = label('$', (0, -0.36, 0.34), 0.4, mat('ink', 0.4))
    group('bag', [body, neck, tie, top, sign], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def bill_stack(loc=(0, 0, 0), n=5, scale=1.0, yaw=0.0):
    parts = []
    for i in range(n):
        b = box((0.02 * ((i * 7) % 3 - 1), 0.02 * ((i * 5) % 3 - 1), 0.03 + i * 0.05), (0.9, 0.44, 0.04), MONEY, bev=0.008)
        parts.append(b)
    parts.append(box((0, 0, 0.05 + (n - 1) * 0.05 / 2), (0.14, 0.46, n * 0.05 + 0.01), 'paper', bev=0.005))
    return group('bills', parts, loc=loc, rot=(0, 0, yaw), scale=scale)


def coin_stack(loc=(0, 0, 0), n=4, scale=1.0):
    parts = [cyl((0.01 * ((i * 3) % 3 - 1), 0, 0.04 + i * 0.075), 0.2, 0.07, 'yellow', verts=32) for i in range(n)]
    return group('coins', parts, loc=loc, scale=scale)


def arrow_go(loc=(0, 0, 0)):
    shape = [(-0.7, 0.12), (0.15, 0.12), (0.15, 0.36), (0.7, 0.0), (0.15, -0.36), (0.15, -0.12), (-0.7, -0.12)]
    a = prism([(x, z) for x, z in shape], 0.14, 'rose', loc=(0, 0, 0.6), rot=(0, 0, 0))
    a.rotation_euler = (0, 0, 0)
    group('arrow', [a], loc=loc, rot=(0, 0, FACE_YAW + math.pi))
    coin_stack((0.45, 0.3, 0), 3, 0.9)
    bill_stack((-0.4, 0.35, 0), 3, 0.7, yaw=0.4)


def jail_cell(loc=(0, 0, 0)):
    parts = [box((0, 0, 0.04), (1.1, 0.5, 0.08), 'ink', bev=0.01), box((0, 0, 1.06), (1.1, 0.5, 0.08), 'ink', bev=0.01)]
    for k in range(-2, 3):
        parts.append(cyl((k * 0.24, -0.2, 0.55), 0.04, 1.0, STEEL, verts=16))
    group('cell', parts, loc=loc, rot=(0, 0, FACE_YAW))
    pip((0.05, 0.25, 0.55), tilt=6, happy=False)


def police_light(loc=(0, 0, 0)):
    base = cyl((0, 0, 0.12), 0.42, 0.24, 'ink', verts=40)
    dome_r = ball((-0.18, 0, 0.4), 0.22, '#ff3b5c', rough=0.15)
    dome_b = ball((0.18, 0, 0.4), 0.22, '#2f7bff', rough=0.15)
    whistle = cyl((0.1, -0.55, 0.12), 0.1, 0.4, 'yellow', rot=(0, math.radians(90), 0), verts=24)
    group('siren', [base, dome_r, dome_b, whistle], loc=loc, rot=(0, 0, FACE_YAW))


# ---------- landmark tiap komplek ----------
def lm_brown():
    """Kairo & Nairobi: piramida gurun."""
    cone_((0, 0, 0.45), 0.75, 0.9, SAND, verts=4, rough=0.7).rotation_euler = (0, 0, math.radians(45))
    cone_((0.75, 0.4, 0.25), 0.4, 0.5, SAND, verts=4, rough=0.7)
    ball((-0.7, 0.55, 0.9), 0.2, 'yellow', lines=False)


def lm_sky():
    """Asia Tenggara: stupa berundak."""
    for i, (r, h) in enumerate(((0.8, 0.16), (0.62, 0.16), (0.46, 0.16))):
        cyl((0, 0, 0.08 + i * 0.16), r, h, '#7fd6ff', verts=8)
    ball((0, 0, 0.72), 0.34, 'paper', scale=(1, 1, 0.85))
    cone_((0, 0, 1.12), 0.1, 0.5, 'yellow')


def lm_pink():
    """Amerika Latin: kaktus bertopi sombrero."""
    cyl((0, 0, 0.5), 0.2, 1.0, '#43b929', verts=24)
    ball((0, 0, 1.0), 0.2, '#43b929')
    for side in (-1, 1):
        cyl((side * 0.32, 0, 0.55), 0.09, 0.32, '#43b929', verts=16)
        cyl((side * 0.2, 0, 0.42), 0.09, 0.26, '#43b929', rot=(0, math.radians(90), 0), verts=16)
        ball((side * 0.32, 0, 0.71), 0.09, '#43b929')
    cyl((0, 0, 1.15), 0.42, 0.04, '#ff37a6', verts=40)
    cone_((0, 0, 1.28), 0.18, 0.24, '#ff37a6', r2=0.08)


def lm_orange():
    """Jalur Sutra: kubah bawang & menara."""
    box((0, 0, 0.3), (0.9, 0.6, 0.6), 'paper', bev=0.02)
    ball((0, 0, 0.78), 0.3, '#ff8a1c', scale=(1, 1, 1.15))
    cone_((0, 0, 1.15), 0.08, 0.25, '#ff8a1c')
    for x in (-0.6, 0.6):
        cyl((x, 0, 0.6), 0.07, 1.2, 'paper', verts=16)
        cone_((x, 0, 1.3), 0.09, 0.22, '#ff8a1c')


def lm_red():
    """Klasik (Roma, Berlin, Sydney): gerbang lengkung bertingkat."""
    parts = []
    for row in range(2):
        for col in range(3):
            x = (col - 1) * 0.42
            z = 0.3 + row * 0.56
            parts.append(box((x - 0.17, 0, z), (0.08, 0.36, 0.5), '#ff3b5c', bev=0.01))
            parts.append(box((x + 0.17, 0, z), (0.08, 0.36, 0.5), '#ff3b5c', bev=0.01))
            parts.append(box((x, 0, z + 0.25), (0.42, 0.36, 0.08), '#ff3b5c', bev=0.01))
    parts.append(box((0, 0, 1.18), (1.34, 0.4, 0.1), 'paper', bev=0.01))
    group('arches', parts, rot=(0, 0, FACE_YAW))


def lm_yellow():
    """Pelabuhan (Amsterdam, Barcelona): kincir angin."""
    cone_((0, 0, 0.55), 0.38, 1.1, 'paper', r2=0.22, verts=8)
    cone_((0, 0, 1.22), 0.26, 0.3, '#ffcc1f', verts=8)
    # dua bilah panjang bersilang, dipasang di muka kincir yang menghadap kamera
    blades = [group('blade', [box((0, 0, 0), (0.14, 0.02, 1.25), '#ffcc1f', bev=0.01)], rot=(0, math.radians(k * 90 + 25), 0)) for k in range(2)]
    hub = cyl((0, -0.02, 0), 0.07, 0.06, 'ink', rot=(math.radians(90), 0, 0), verts=16)
    front = (math.sin(FACE_YAW) * 0.4, -math.cos(FACE_YAW) * 0.4)
    group('rotor', [*blades, hub], loc=(front[0], front[1], 1.0), rot=(0, 0, FACE_YAW))


def lm_green():
    """Gemerlap (Paris, Dubai, Hong Kong): menara besi meruncing."""
    legs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg = box((0, 0, 0), (0.08, 0.08, 0.9), '#43b929', bev=0.01)
            leg.location = (sx * 0.26, sy * 0.26, 0.42)
            leg.rotation_euler = (sy * math.radians(14), -sx * math.radians(14), 0)
            legs.append(leg)
    deck = box((0, 0, 0.62), (0.5, 0.5, 0.06), '#43b929', bev=0.01)
    upper = cone_((0, 0, 1.15), 0.2, 1.0, '#43b929', r2=0.03, verts=4)
    upper.rotation_euler = (0, 0, math.radians(45))
    arch = torus((0, -0.3, 0.18), 0.22, 0.04, '#43b929', rot=(math.radians(90), 0, 0))
    tip = ball((0, 0, 1.7), 0.06, 'yellow', lines=False)
    group('tower', [*legs, deck, upper, arch, tip], rot=(0, 0, FACE_YAW))


def lm_navy():
    """Ibu kota dunia (Tokyo, New York): gerbang torii."""
    parts = [
        cyl((-0.42, 0, 0.55), 0.07, 1.1, '#2f4bff', verts=20),
        cyl((0.42, 0, 0.55), 0.07, 1.1, '#2f4bff', verts=20),
        box((0, 0, 0.88), (1.0, 0.12, 0.08), '#2f4bff', bev=0.01),
        box((0, 0, 1.14), (1.3, 0.16, 0.1), 'ink', bev=0.01),
        box((0, 0, 1.04), (1.1, 0.14, 0.08), '#2f4bff', bev=0.01),
    ]
    group('torii', parts, rot=(0, 0, FACE_YAW))
    ball((0.55, 0.45, 1.25), 0.18, 'rose', lines=False)


LANDMARKS = {'brown': lm_brown, 'sky': lm_sky, 'pink': lm_pink, 'orange': lm_orange, 'red': lm_red, 'yellow': lm_yellow, 'green': lm_green, 'navy': lm_navy}


# ---------- papan mini untuk ilustrasi ----------
def mini_board(loc=(0, 0, 0), size=2.6):
    parts = [box((0, 0, 0), (size, size, 0.12), '#e6ffd9', bev=0.03)]
    n = 9
    cell = size / 11
    colors = list(GROUP_HEX.values())
    for side in range(4):
        for k in range(n):
            t = -size / 2 + cell * 1.5 + k * cell + cell / 2 - cell / 2
            c = colors[(side * 2 + k // 5) % 8]
            if side == 0:
                pos = (size / 2 - cell * 1.5 - k * cell, -size / 2 + cell * 0.55, 0.065)
                sc = (cell * 0.92, cell * 0.35, 0.02)
            elif side == 1:
                pos = (-size / 2 + cell * 0.55, -size / 2 + cell * 1.5 + k * cell, 0.065)
                sc = (cell * 0.35, cell * 0.92, 0.02)
            elif side == 2:
                pos = (-size / 2 + cell * 1.5 + k * cell, size / 2 - cell * 0.55, 0.065)
                sc = (cell * 0.92, cell * 0.35, 0.02)
            else:
                pos = (size / 2 - cell * 0.55, size / 2 - cell * 1.5 - k * cell, 0.065)
                sc = (cell * 0.35, cell * 0.92, 0.02)
            if k % 3 != 1:
                parts.append(box(pos, sc, c, bev=0, lines=False))
            del t
    parts.append(box((0, 0, 0.065), (size - cell * 2.2, size - cell * 2.2, 0.01), 'paper', bev=0, lines=False))
    parts.append(label('MONOPOLI', (0, 0, 0.08), 0.32, mat('rose', 0.4), rot=(0, 0, math.radians(-25)), extrude=0.02))
    return group('board', parts, loc=loc)


# ---------- sprite kecil ----------
def house_sprite():
    house((0, 0, 0), scale=1.4)


def hotel_sprite():
    hotel((0, 0, 0), scale=0.9)


def card_chance():
    card('rose', '?', rot=(0, 0, FACE_YAW - math.radians(10)))


def card_chest():
    chest((0, 0, 0), 1.0)


def icon_airport():
    group('plane', token_plane('#2f7bff'), loc=(0, 0, 0.1), rot=(0, math.radians(-10), FACE_YAW - math.radians(35)), scale=1.1)


def icon_tax():
    money_bag((0, 0, 0), 1.0)


def die_sprite(v, color):
    die(v, color, loc=(0, 0, 0.45), size=0.8, rot=(0, 0, FACE_YAW + math.radians(8)))


def landmark_sprite(g):
    LANDMARKS[g]()


# ---------- ilustrasi ----------
def tile_monopoly():
    mini_board((0, 0.15, 0), 3.0)
    hotel((0.6, 0.5, 0.06), scale=0.45)
    house((-0.25, 0.75, 0.06), scale=0.5)
    house((-0.55, 0.65, 0.06), scale=0.5, color='#43b929')
    group('car', token_car('#ff37a6'), loc=(-0.85, -0.7, 0.06), rot=(0, 0, FACE_YAW - 0.6), scale=0.45)
    group('hat', token_hat('#2f7bff'), loc=(0.95, -0.65, 0.06), scale=0.42)
    die(5, 'paper', loc=(0.15, -0.55, 0.32), size=0.4, rot=(0.3, 0.2, FACE_YAW + 0.4))
    die(2, 'electric', loc=(0.55, -0.35, 0.32), size=0.4, rot=(-0.2, 0.1, FACE_YAW - 0.3))
    bill_stack((1.55, 0.2, -0.05), 5, 0.7, yaw=0.3)
    coin_stack((1.6, -0.45, -0.05), 5, 0.8)
    mochi((-0.75, 1.35, 0.55), tilt=-8)
    pip((0.4, 1.45, 0.8), tilt=10)


def monopoly_win():
    pedestal((0.2, 0, -0.18), w=1.9, d=1.1)
    for i in range(3):
        bill_stack((-0.2 + i * 0.12, 0.05 * i, 0.0 + i * 0.28), 6, 0.9, yaw=0.2 * i)
    mochi((0.0, 0, 1.4), tilt=6)
    crown((0.0, 0, 2.03))
    hotel((0.95, 0.1, 0.0), scale=0.55)
    coin_stack((-0.95, -0.3, 0.0), 6, 0.9)
    money_bag((0.9, -0.55, -0.35), 0.55)


def monopoly_lose():
    pedestal((0, 0, -0.18), w=2.0, d=1.2)
    pip((0.15, 0, 0.82), tilt=8, happy=False)
    tear((0.05, -0.45, 1.05))
    # celengan kosong terguling
    pig = ball((-0.65, -0.15, 0.3), 0.32, 'petal', scale=(1.25, 1, 1))
    snout = cyl((-1.05, -0.15, 0.3), 0.11, 0.1, 'rose', rot=(0, math.radians(90), 0), verts=24)
    group('pig', [pig, snout], rot=(math.radians(70), 0, 0.3))
    bill_stack((0.8, -0.35, 0.0), 1, 0.6, yaw=-0.5)


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.6, res=(384, 384), target=(0, 0, 0.45), line=3.0)
ASSETS = {}
for i in range(8):
    ASSETS[f'pawn-{i}'] = (lambda i=i: pawn_sprite(i), dict(SPRITE, ortho=1.45, target=(0, 0, 0.45)))
ASSETS['house'] = (house_sprite, dict(SPRITE, ortho=1.2, target=(0, 0, 0.4)))
ASSETS['hotel'] = (hotel_sprite, dict(SPRITE, ortho=1.5, target=(0, 0, 0.45)))
ASSETS['card-chance'] = (card_chance, dict(SPRITE, ortho=1.3, target=(0, 0, 0.5)))
ASSETS['card-chest'] = (card_chest, dict(SPRITE, ortho=1.4, target=(0, 0, 0.4)))
ASSETS['icon-airport'] = (icon_airport, dict(SPRITE, ortho=1.6, target=(0, 0, 0.4)))
ASSETS['icon-power'] = (lambda: bulb(), dict(SPRITE, ortho=1.6, target=(0, 0, 0.55)))
ASSETS['icon-water'] = (lambda: drop(), dict(SPRITE, ortho=1.7, target=(0, 0, 0.65)))
ASSETS['icon-tax'] = (icon_tax, dict(SPRITE, ortho=1.3, target=(0, 0, 0.45)))
ASSETS['corner-go'] = (lambda: arrow_go(), dict(SPRITE, ortho=2.0, target=(0, 0, 0.4)))
ASSETS['corner-jail'] = (lambda: jail_cell(), dict(SPRITE, ortho=2.1, target=(0, 0, 0.6)))
ASSETS['corner-parking'] = (lambda: group('car', token_car('#ff8a1c'), rot=(0, 0, FACE_YAW - 0.5), scale=1.2), dict(SPRITE, ortho=1.7, target=(0, 0, 0.3)))
ASSETS['corner-gotojail'] = (lambda: police_light(), dict(SPRITE, ortho=1.6, target=(0, 0, 0.3)))
for g in GROUP_HEX:
    ASSETS[f'landmark-{g}'] = (lambda g=g: landmark_sprite(g), dict(SPRITE, ortho=2.1, target=(0, 0, 0.65)))
for v in range(1, 7):
    ASSETS[f'die-a-{v}'] = (lambda v=v: die_sprite(v, 'paper'), dict(SPRITE, ortho=1.35, target=(0, 0, 0.45)))
    ASSETS[f'die-b-{v}'] = (lambda v=v: die_sprite(v, 'electric'), dict(SPRITE, ortho=1.35, target=(0, 0, 0.45)))

ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-monopoly'] = (tile_monopoly, dict(ILLU, ortho=4.4, target=(0.2, 0.1, 0.4)))
ASSETS['monopoly-win'] = (monopoly_win, dict(ILLU, ortho=3.9, res=(1200, 1100), target=(0, 0, 0.8)))
ASSETS['monopoly-lose'] = (monopoly_lose, dict(ILLU, ortho=3.3, res=(1200, 1100)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
