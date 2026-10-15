# Aset Kartu Remi, dimodel manual di Blender (bukan AI): kartu, chip, ikon tiap mode, ilustrasi.
# Jalankan: blender --background --python scripts/blender/remi.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py remi
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/remi']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

# warna jenis mengikuti src/games/remi/ui/CardFace.tsx
RED = '#ff3b5c'
INK_HEX = '#121212'
CHIP_HEX = ['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff']
FELT = '#43b929'


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
    e.scale = (scale, scale, scale) if not isinstance(scale, tuple) else scale
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


def prism(outline, depth, material, name='prism', y=0.0):
    """Benda pipih dari garis luar 2D di bidang XZ, menghadap -Y."""
    n = len(outline)
    verts = [(x, y, z) for x, z in outline] + [(x, y + depth, z) for x, z in outline]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))]
    faces += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    add(o, material)
    return o


def label(text, loc, size, material, rot=(math.radians(90), 0, 0), name='label'):
    """Teks 3D tipis berdiri di bidang XZ (menghadap -Y)."""
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = 0.012
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    add(o, material)
    no_lines(o)
    return o


# ---------- simbol jenis (garis luar parametrik) ----------
def heart_outline(s, steps=40, flip=False):
    pts = []
    for i in range(steps):
        t = i / steps * math.tau
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17 * s, (-z if flip else z) / 17 * s))
    return pts


def circle_outline(cx, cz, r, steps=24):
    return [(cx + r * math.cos(i / steps * math.tau), cz + r * math.sin(i / steps * math.tau)) for i in range(steps)]


def suit_pip(suit, s, y=-0.03):
    """Simbol jenis di bidang XZ; mengembalikan daftar objek."""
    col = hexmat(RED if suit in 'HD' else INK_HEX, 0.35)
    d = 0.03
    if suit == 'H':
        return [prism(heart_outline(s), d, col, 'heart', y)]
    if suit == 'D':
        return [prism([(0, s), (s * 0.68, 0), (0, -s), (-s * 0.68, 0)], d, col, 'diamond', y)]
    if suit == 'S':
        body = prism([(x, z + s * 0.12) for x, z in heart_outline(s * 0.92, flip=True)], d, col, 'spade', y)
        stem = prism([(-s * 0.1, -s * 0.2), (s * 0.1, -s * 0.2), (s * 0.32, -s * 0.95), (-s * 0.32, -s * 0.95)], d, col, 'stem', y)
        return [body, stem]
    # keriting: tiga bulatan + batang
    parts = [prism(circle_outline(cx * s, cz * s, s * 0.36), d, col, 'club', y) for cx, cz in ((0, 0.42), (-0.4, -0.12), (0.4, -0.12))]
    parts.append(prism([(-s * 0.1, -s * 0.05), (s * 0.1, -s * 0.05), (s * 0.3, -s * 0.95), (-s * 0.3, -s * 0.95)], d, col, 'stem', y))
    return parts


# ---------- kartu ----------
CARD_W, CARD_H, CARD_T = 0.62, 0.9, 0.025


def card(rank='A', suit='S', loc=(0, 0, 0), rot=(0, 0, 0), back=False, scale=1.0, name='card'):
    """Kartu berdiri di bidang XZ, muka menghadap -Y, titik tengah di tengah kartu."""
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    body = add(last(), mat('paper', 0.5) if not back else stripe_mat('rose', 'petal', 'back', 14))
    body.scale = (CARD_W, CARD_T, CARD_H)
    parts.append(bevel(body, 0.035, 3))
    if back:
        # pita miring bertuliskan CP di punggung
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.016, 0))
        band = add(last(), mat('ink', 0.4))
        band.scale = (CARD_W * 0.9, 0.01, 0.16)
        band.rotation_euler = (0, math.radians(-18), 0)
        no_lines(band)
        parts.append(band)
        parts.append(label('CP', (0, -0.03, 0), 0.13, mat('electric', 0.4), rot=(math.radians(90), math.radians(-18), 0)))
    else:
        col = hexmat(RED if suit in 'HD' else INK_HEX, 0.35)
        for o in suit_pip(suit, 0.17, -0.028):
            no_lines(o)
            parts.append(o)
        parts.append(label(rank, (-CARD_W * 0.33, -0.03, CARD_H * 0.36), 0.15, col))
        parts.append(label(rank, (CARD_W * 0.33, -0.03, -CARD_H * 0.36), 0.15, col, rot=(math.radians(90), math.radians(180), 0)))
    return group(name, parts, loc=loc, rot=rot, scale=scale)


def flat_card(rank, suit, loc, yaw, back=False, scale=1.0):
    """Kartu rebah di meja."""
    return card(rank, suit, loc=loc, rot=(math.radians(-90), 0, yaw), back=back, scale=scale)


def fan(cards, loc, spread=14, radius=0.9, scale=1.0, yaw=FACE_YAW, tilt=0.0):
    """Kipas kartu berdiri; `cards` = [(rank, suit), ...]."""
    n = len(cards)
    objs = []
    for i, (r, s) in enumerate(cards):
        a = math.radians((i - (n - 1) / 2) * spread)
        objs.append(card(r, s, loc=(radius * math.sin(a), -0.03 * i, radius * math.cos(a) - radius), rot=(0, a, 0)))
    return group('fan', objs, loc=loc, rot=(math.radians(tilt), 0, yaw), scale=scale)


# ---------- chip ----------
def chip(color, loc=(0, 0, 0), rot=(0, 0, 0), r=0.4, h=0.1):
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(0, 0, 0), vertices=48)
    body = add(last(), hexmat(color, 0.4))
    shade_smooth(body)
    parts.append(bevel(body, 0.02, 2))
    # gerigi putih di tepi
    for k in range(6):
        a = k / 6 * math.tau
        bpy.ops.mesh.primitive_cube_add(size=1, location=(r * 0.93 * math.cos(a), r * 0.93 * math.sin(a), 0))
        notch = add(last(), mat('paper', 0.5))
        notch.scale = (r * 0.18, r * 0.3, h * 1.04)
        notch.rotation_euler = (0, 0, a + math.pi / 2)
        no_lines(notch)
        parts.append(notch)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.6, minor_radius=0.012, location=(0, 0, h / 2))
    ring = add(last(), mat('paper', 0.4))
    no_lines(ring)
    parts.append(ring)
    return group('chip', parts, loc=loc, rot=rot)


def chip_stack(loc, colors, h=0.1):
    return group('stack', [chip(c, loc=(0.015 * ((i * 7) % 3 - 1), 0.015 * ((i * 5) % 3 - 1), i * h * 1.02)) for i, c in enumerate(colors)], loc=loc)


def chip_sprite(color):
    chip(color, loc=(0, 0, 0.5), rot=(math.radians(62), 0, FACE_YAW))


def deck_sprite():
    for i in range(9):
        flat_card('A', 'S', (0.012 * ((i * 5) % 3), 0.01 * ((i * 3) % 3), i * 0.028), math.radians(4 * ((i * 7) % 3 - 1)), back=True)


def dealer_btn():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.12, location=(0, 0, 0), vertices=48)
    d = add(last(), mat('paper', 0.35))
    shade_smooth(d)
    bevel(d, 0.03, 3)
    t = label('D', (0, 0, 0.07), 0.45, mat('ink', 0.3), rot=(0, 0, 0))
    group('dealer', [d, t], loc=(0, 0, 0.5), rot=(math.radians(62), 0, FACE_YAW))


# ---------- ikon mode ----------
def mode_cangkulan():
    # cangkul: gagang kayu + mata cangkul, mencungkil kartu dari tumpukan
    wood = hexmat('#c98a4b', 0.6)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=1.5, location=(0.15, 0, 0.85), rotation=(0, math.radians(-35), 0), vertices=16)
    handle = add(last(), wood)
    shade_smooth(handle)
    # mata cangkul di ujung bawah gagang, tegak lurus gagang
    blade = prism([(-0.3, 0.05), (0.3, 0.05), (0.24, -0.4), (-0.24, -0.4)], 0.06, hexmat('#9aa3b5', 0.25), 'blade', -0.03)
    blade.location = (0.62, -0.05, 0.3)
    blade.rotation_euler = (0, math.radians(-35), 0)
    bevel(blade, 0.02, 2)
    for i in range(4):
        flat_card('A', 'S', (0.25 + 0.01 * i, 0.1, 0.03 * i), math.radians(10 * i), back=True, scale=0.8)
    c = card('7', 'H', loc=(-0.55, -0.15, 0.25), rot=(math.radians(-55), math.radians(-20), 0), scale=0.75)
    group('cangkul', [handle, blade, c], rot=(0, 0, FACE_YAW))


def mode_bigtwo():
    card('2', 'S', loc=(0, 0, 0.55), rot=(0, math.radians(-14), FACE_YAW))
    for i, z in enumerate((0.95, 0.75, 0.55)):
        tube([(-0.75, -0.2, z), (-0.5 - i * 0.03, -0.2, z - 0.05)], 0.03, mat('rose', 0.4), 'POLY', 'swoosh')
    flat_card('K', 'H', (0.2, 0.25, -0.0), math.radians(25), scale=0.9)


def mode_remi41():
    fan([('A', 'H'), ('K', 'H'), ('Q', 'H'), ('J', 'H')], (0, 0, 0.95), spread=16, radius=1.0, scale=0.9)


def mode_poker():
    card('A', 'S', loc=(-0.2, 0, 0.62), rot=(0, math.radians(-12), FACE_YAW))
    card('A', 'H', loc=(0.15, -0.08, 0.6), rot=(0, math.radians(10), FACE_YAW))
    chip_stack((0.55, -0.45, 0.05), CHIP_HEX[:3])


def mode_joker():
    # topi badut tiga cabang dengan bola di ujungnya
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.18, location=(0, 0, 0.2), vertices=40)
    band = add(last(), stripe_mat('rose', 'paper', 'band', 12))
    shade_smooth(band)
    parts.append(band)
    for side, color, ball in ((-1, 'electric', 'yellow'), (0, 'rose', 'electric'), (1, 'yellow', 'rose')):
        pts = [(side * 0.25, 0, 0.28), (side * 0.45, 0, 0.7), (side * 0.75 if side else 0.08, 0, 1.0 if side else 1.15)]
        parts.append(tube(pts, 0.1, mat(color, 0.4), 'NURBS', 'horn'))
        end = pts[-1]
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, location=end, segments=16, ring_count=10)
        b = add(last(), mat(ball, 0.35))
        shade_smooth(b)
        parts.append(b)
    group('jester', parts, rot=(0, 0, FACE_YAW))


def mode_bohong():
    # megafon meneriakkan "Bohong!" ke kartu tertutup
    parts = []
    bpy.ops.mesh.primitive_cone_add(radius1=0.42, radius2=0.14, depth=0.8, location=(0, 0, 0), vertices=40, end_fill_type='NOTHING')
    horn = add(last(), mat('rose', 0.4))
    shade_smooth(horn)
    m = horn.modifiers.new('solid', 'SOLIDIFY')
    m.thickness = 0.03
    parts.append(horn)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.22, location=(0, 0, 0.5), vertices=24)
    parts.append(add(last(), mat('ink', 0.4)))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.2, 0.42))
    grip = add(last(), mat('yellow', 0.4))
    grip.scale = (0.08, 0.3, 0.08)
    parts.append(bevel(grip, 0.02))
    group('megaphone', parts, loc=(-0.25, 0, 0.7), rot=(0, math.radians(-100), FACE_YAW))
    for i, z in enumerate((0.95, 0.72, 0.49)):
        tube([(0.62, -0.3, z + (i - 1) * 0.06), (0.86, -0.3, z + (i - 1) * 0.2)], 0.035, mat('ink', 0.3), 'POLY', 'shout')
    card('?', 'S', loc=(1.3, 0.45, 0.25), rot=(math.radians(-70), 0, math.radians(20)), back=True, scale=0.8)


def mode_blackjack():
    card('A', 'S', loc=(-0.2, 0, 0.6), rot=(0, math.radians(-10), FACE_YAW))
    card('K', 'H', loc=(0.18, -0.08, 0.55), rot=(0, math.radians(12), FACE_YAW))
    label('21', (0.1, -0.6, 1.62), 0.46, mat('rose', 0.35), rot=(math.radians(90), 0, FACE_YAW))


def mode_seven():
    for i, r in enumerate(('6', '7', '8')):
        card(r, 'H', loc=(-0.55 + i * 0.55, -0.05 * i, 0.55 + (0.12 if r == '7' else 0)), rot=(0, math.radians((i - 1) * -6), FACE_YAW), scale=0.85)


# ---------- ilustrasi ----------
def felt_table(loc=(0, 0, 0), w=2.9, d=1.5):
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=0.22, location=loc, vertices=64)
    t = add(last(), hexmat(FELT, 0.8))
    t.scale = (w / 2, d / 2, 1)
    shade_smooth(t)
    bevel(t, 0.06, 3)
    bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.07, location=(loc[0], loc[1], loc[2] + 0.11))
    rim = add(last(), mat('rose', 0.4))
    rim.scale = (w / 2, d / 2, 1)
    shade_smooth(rim)
    return t


def tile_remi():
    felt_table((0, 0.1, -0.1))
    fan([('A', 'S'), ('K', 'H'), ('Q', 'C'), ('J', 'D'), ('10', 'S')], (-0.15, 0.1, 1.05), spread=13, radius=1.0, scale=0.85)
    chip_stack((0.95, -0.35, 0.05), CHIP_HEX)
    chip_stack((1.2, 0.05, 0.05), CHIP_HEX[1:3])
    chip(CHIP_HEX[3], loc=(0.7, -0.6, 0.02), rot=(math.radians(8), 0, 0))
    for (x, y, yaw), back in (((-1.05, -0.35, 25), True), ((-0.75, -0.55, -15), False)):
        flat_card('7', 'H', (x, y, 0.03), math.radians(yaw), back=back, scale=0.75)
    mochi((-1.25, 0.55, 0.55), tilt=-8)
    pip((1.25, 0.6, 0.75), tilt=10)


def remi_win():
    pedestal((0.2, 0, -0.18), w=1.7, d=1.1)
    pedestal((0.2, 0, 0.17), w=1.2, d=0.9)
    mochi((0.05, 0, 0.95), tilt=6)
    crown((0.05, 0, 1.58))
    fan([('A', 'S'), ('A', 'H'), ('A', 'C'), ('A', 'D')], (0.85, 0.1, 1.15), spread=15, radius=0.8, scale=0.6)
    chip_stack((-0.9, -0.35, -0.3), CHIP_HEX * 2)
    chip_stack((-0.45, -0.75, -0.3), CHIP_HEX[:3])
    for (x, y, yaw), c in zip(((1.1, -0.7, 20), (-1.3, 0.2, 75), (0.6, -0.85, 140)), CHIP_HEX[1:]):
        chip(c, loc=(x, y, -0.33), rot=(0, 0, math.radians(yaw)))


def remi_lose():
    pedestal((0, 0, -0.18), w=2.0, d=1.2)
    pip((0.1, 0, 0.82), tilt=8, happy=False)
    tear((0.0, -0.45, 1.05))
    flat_card('2', 'C', (-0.75, -0.3, 0.03), math.radians(20), scale=0.8)
    flat_card('3', 'D', (-0.4, -0.45, 0.05), math.radians(-25), scale=0.8)
    card('A', 'S', loc=(0.85, 0.1, 0.35), rot=(math.radians(-70), 0, math.radians(-30)), back=True, scale=0.7)
    chip(CHIP_HEX[0], loc=(0.75, -0.45, 0.05), rot=(math.radians(70), 0, math.radians(30)))


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.75, res=(384, 384), target=(0, 0, 0.55), line=3.0)
ASSETS = {}
for i, c in enumerate(CHIP_HEX):
    ASSETS[f'chip-{i}'] = (lambda c=c: chip_sprite(c), dict(SPRITE, ortho=1.1, target=(0, 0, 0.5)))
ASSETS['deck'] = (deck_sprite, dict(SPRITE, ortho=1.5, target=(0, 0, 0.12)))
ASSETS['dealer-btn'] = (dealer_btn, dict(SPRITE, ortho=1.1, target=(0, 0, 0.5)))
ASSETS['mode-cangkulan'] = (mode_cangkulan, dict(SPRITE, ortho=2.2, target=(0, 0, 0.55)))
ASSETS['mode-bigtwo'] = (mode_bigtwo, dict(SPRITE, ortho=2.0, target=(0, 0, 0.5)))
ASSETS['mode-remi41'] = (mode_remi41, dict(SPRITE, ortho=2.0, target=(0, 0, 0.55)))
ASSETS['mode-poker'] = (mode_poker, dict(SPRITE, ortho=2.0, target=(0, 0, 0.5)))
ASSETS['mode-joker'] = (mode_joker, dict(SPRITE, ortho=2.0, target=(0, 0, 0.6)))
ASSETS['mode-bohong'] = (mode_bohong, dict(SPRITE, ortho=2.6, target=(0.45, 0, 0.6)))
ASSETS['mode-blackjack'] = (mode_blackjack, dict(SPRITE, ortho=2.3, target=(0, -0.2, 0.9)))
ASSETS['mode-seven'] = (mode_seven, dict(SPRITE, ortho=2.0, target=(0, 0, 0.55)))

ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-remi'] = (tile_remi, dict(ILLU, ortho=3.9, target=(0, 0, 0.55)))
ASSETS['remi-win'] = (remi_win, dict(ILLU, ortho=3.8, res=(1200, 1100)))
ASSETS['remi-lose'] = (remi_lose, dict(ILLU, ortho=3.2, res=(1200, 1100)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
