# Aset Domino, dimodel manual di Blender (bukan AI): kartu domino, tumpukan, chip, ikon tiap mode, ilustrasi.
# Jalankan: blender --background --python scripts/blender/domino.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py domino
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/domino']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

# warna mengikuti src/games/domino/ui/TileFace.tsx
CHIP_HEX = ['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff']
WOOD = '#c98a4b'
WOOD_DARK = '#8a5a2b'
PIP_RED = '#ff3b5c'


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
    e.scale = (scale, scale, scale)
    return e


def bevel(o, width=0.04, segments=3):
    m = o.modifiers.new('bev', 'BEVEL')
    m.width = width
    m.segments = segments
    return o


def label(text, loc, size, material, rot=(math.radians(90), 0, 0), name='label'):
    """Teks 3D tipis berdiri di bidang XZ (menghadap -Y)."""
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = 0.015
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    add(o, material)
    no_lines(o)
    return o


# ---------- kartu domino ----------
TW, TH, TT = 0.5, 1.0, 0.13  # lebar, panjang, tebal
G = 0.13  # jarak antar titik mata
LAYOUT = {
    0: [],
    1: [(0, 0)],
    2: [(-1, 1), (1, -1)],
    3: [(-1, 1), (0, 0), (1, -1)],
    4: [(-1, 1), (1, 1), (-1, -1), (1, -1)],
    5: [(-1, 1), (1, 1), (0, 0), (-1, -1), (1, -1)],
    6: [(-1, 1), (1, 1), (-1, 0), (1, 0), (-1, -1), (1, -1)],
}


def dots(n, cz, y):
    """Titik mata satu sisi kartu; angka 1 & 4 merah seperti kartu gaple warung."""
    col = hexmat(PIP_RED if n in (1, 4) else '#121212', 0.3)
    out = []
    for dx, dz in LAYOUT[n]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.048 if n != 1 else 0.075, depth=0.02, location=(dx * G, y, cz + dz * G), rotation=(math.radians(90), 0, 0), vertices=20)
        d = add(last(), col)
        no_lines(d)
        out.append(d)
    return out


def domino(a=6, b=6, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, back=False, name='domino'):
    """Kartu berdiri di bidang XZ, muka menghadap -Y; `a` di atas, `b` di bawah."""
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    body = add(last(), mat('paper', 0.35) if not back else stripe_mat('rose', 'petal', 'dback', 16))
    body.scale = (TW, TT, TH)
    parts.append(bevel(body, 0.05, 4))
    y = -TT / 2 - 0.004
    if back:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.02, location=(0, y, 0), rotation=(math.radians(90), 0, 0), vertices=32)
        seal = add(last(), mat('ink', 0.4))
        no_lines(seal)
        parts.append(seal)
        parts.append(label('CP', (0, y - 0.012, 0), 0.12, mat('electric', 0.4)))
    else:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y, 0))
        bar = add(last(), mat('ink', 0.4))
        bar.scale = (TW * 0.78, 0.01, 0.025)
        no_lines(bar)
        parts.append(bar)
        parts += dots(a, TH / 4, y)
        parts += dots(b, -TH / 4, y)
    return group(name, parts, loc=loc, rot=rot, scale=scale)


def flat_domino(a, b, loc, yaw, back=False, scale=1.0):
    """Kartu rebah di meja, muka ke atas."""
    return domino(a, b, loc=loc, rot=(math.radians(-90), 0, yaw), back=back, scale=scale)


def chain(tiles, start, yaw=0.0, scale=0.7):
    """Deretan kartu rebah bersambung; balak dipasang melintang."""
    x = 0.0
    for a, b in tiles:
        dbl = a == b
        step = (TW if dbl else TH) * scale
        cx = x + step / 2
        px = start[0] + cx * math.cos(yaw)
        py = start[1] + cx * math.sin(yaw)
        flat_domino(a, b, (px, py, start[2]), yaw + (0 if dbl else math.pi / 2), scale=scale)
        x += step + 0.02


def bone_pile(loc, count=7, scale=0.6):
    """Tumpukan kartu tertutup berserakan (cangkulan)."""
    spots = [(0, 0, 0), (0.32, 0.12, 0), (-0.3, 0.1, 0), (0.05, 0.35, 0), (0.15, -0.05, 1), (-0.12, 0.2, 1), (0.1, 0.18, 2)]
    for i, (x, y, layer) in enumerate(spots[:count]):
        flat_domino(0, 0, (loc[0] + x, loc[1] + y, loc[2] + layer * TT * scale), math.radians(25 * ((i * 7) % 5) - 40), back=True, scale=scale)


# ---------- chip ----------
def chip(color, loc=(0, 0, 0), rot=(0, 0, 0), r=0.4, h=0.1):
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(0, 0, 0), vertices=48)
    body = add(last(), hexmat(color, 0.4))
    shade_smooth(body)
    parts.append(bevel(body, 0.02, 2))
    # titik-titik mata domino di permukaan chip
    for k in range(5):
        a = k / 5 * math.tau
        bpy.ops.mesh.primitive_cylinder_add(radius=r * 0.12, depth=0.01, location=(r * 0.62 * math.cos(a), r * 0.62 * math.sin(a), h / 2 + 0.002), vertices=16)
        d = add(last(), mat('paper', 0.4))
        no_lines(d)
        parts.append(d)
    bpy.ops.mesh.primitive_cylinder_add(radius=r * 0.22, depth=0.01, location=(0, 0, h / 2 + 0.002), vertices=24)
    c = add(last(), mat('ink', 0.4))
    no_lines(c)
    parts.append(c)
    return group('chip', parts, loc=loc, rot=rot)


def chip_stack(loc, colors, h=0.1):
    return group('stack', [chip(c, loc=(0.015 * ((i * 7) % 3 - 1), 0.015 * ((i * 5) % 3 - 1), i * h * 1.02)) for i, c in enumerate(colors)], loc=loc)


def coffee(loc, scale=1.0):
    """Gelas kopi warung: gelas bening + kopi + lepek."""
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.05, location=(0, 0, 0.025), vertices=40)
    saucer = add(last(), mat('paper', 0.35))
    shade_smooth(saucer)
    parts.append(saucer)
    bpy.ops.mesh.primitive_cone_add(radius1=0.2, radius2=0.25, depth=0.6, location=(0, 0, 0.35), vertices=40)
    glass = add(last(), hexmat('#5b3a22', 0.25))
    shade_smooth(glass)
    parts.append(glass)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.248, depth=0.08, location=(0, 0, 0.62), vertices=40)
    foam = add(last(), hexmat('#e8c79a', 0.6))
    shade_smooth(foam)
    parts.append(foam)
    return group('coffee', parts, loc=loc, scale=scale)


def wood_table(loc=(0, 0, 0), w=3.0, d=1.6):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    t = add(last(), hexmat(WOOD, 0.7))
    t.scale = (w, d, 0.2)
    bevel(t, 0.05, 3)
    # serat kayu: garis tipis gelap
    for i in range(5):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1] - d / 2 + (i + 0.5) * d / 5, loc[2] + 0.101))
        g = add(last(), hexmat(WOOD_DARK, 0.7))
        g.scale = (w * 0.96, 0.012, 0.002)
        no_lines(g)
    return t


# ---------- sprite kecil ----------
def chip_sprite(color):
    chip(color, loc=(0, 0, 0.5), rot=(math.radians(62), 0, FACE_YAW))


def bone_sprite():
    bone_pile((0, 0, 0.05), 7, 0.8)


# ---------- ikon mode ----------
def mode_gaple():
    chain([(3, 6), (6, 6), (6, 1)], (-0.75, 0.25, 0.05), yaw=math.radians(-12), scale=0.6)
    domino(5, 3, loc=(0.35, -0.35, 0.5), rot=(0, math.radians(8), FACE_YAW), scale=0.9)


def mode_cangkul():
    wood = hexmat(WOOD, 0.6)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=1.5, location=(0.15, 0, 0.85), rotation=(0, math.radians(-35), 0), vertices=16)
    handle = add(last(), wood)
    shade_smooth(handle)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.62, -0.05, 0.25))
    blade = add(last(), hexmat('#9aa3b5', 0.25))
    blade.scale = (0.55, 0.06, 0.4)
    blade.rotation_euler = (0, math.radians(-35), 0)
    bevel(blade, 0.02, 2)
    group('hoe', [handle, blade], rot=(0, 0, FACE_YAW))
    bone_pile((0.35, 0.3, 0.03), 5, 0.6)
    domino(2, 4, loc=(-0.55, -0.2, 0.35), rot=(math.radians(-25), math.radians(-18), FACE_YAW), scale=0.7)


def mode_lima():
    domino(5, 5, loc=(-0.3, 0, 0.55), rot=(0, math.radians(-10), FACE_YAW), scale=0.9)
    domino(0, 5, loc=(0.3, -0.1, 0.5), rot=(0, math.radians(12), FACE_YAW), scale=0.9)
    # bintang poin di atas
    star = []
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        r = 0.32 if i % 2 == 0 else 0.14
        pts.append((r * math.cos(a), r * math.sin(a)))
    verts = [(x, -0.04, z) for x, z in pts] + [(x, 0.04, z) for x, z in pts]
    faces = [list(range(10))[::-1], list(range(10, 20))] + [[i, (i + 1) % 10, 10 + (i + 1) % 10, 10 + i] for i in range(10)]
    me = bpy.data.meshes.new('star')
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new('star', me)
    scene.collection.objects.link(o)
    add(o, mat('yellow', 0.3))
    star.append(o)
    group('star', star, loc=(0.55, -0.3, 1.25), rot=(0, math.radians(-12), FACE_YAW))


def mode_qiuqiu():
    tiles = []
    for i, (a, b) in enumerate(((4, 5), (3, 6), (0, 0), (4, 6))):
        ang = math.radians((i - 1.5) * 14)
        tiles.append(domino(a, b, loc=(0.9 * math.sin(ang), -0.03 * i, 0.9 * math.cos(ang) - 0.9), rot=(0, ang, 0), scale=0.75))
    group('fan', tiles, loc=(-0.15, 0, 0.6), rot=(0, 0, FACE_YAW))
    chip_stack((0.7, -0.5, 0.05), CHIP_HEX[:3])


# ---------- ilustrasi ----------
def tile_domino():
    wood_table((0, 0.1, -0.1))
    chain([(2, 5), (5, 5), (5, 1), (1, 3)], (-1.25, -0.15, 0.03), yaw=math.radians(-6), scale=0.55)
    bone_pile((1.1, 0.2, 0.03), 6, 0.5)
    domino(6, 6, loc=(0.45, -0.55, 0.45), rot=(math.radians(-12), math.radians(10), FACE_YAW), scale=0.75)
    coffee((-1.15, 0.5, 0.0), 0.75)
    chip_stack((1.25, -0.45, 0.02), CHIP_HEX[:3])
    mochi((-0.55, 1.15, 0.5), tilt=-8)
    pip((0.45, 1.2, 0.75), tilt=10)


def domino_win():
    pedestal((0.2, 0, -0.18), w=1.7, d=1.1)
    pedestal((0.2, 0, 0.17), w=1.2, d=0.9)
    mochi((0.05, 0, 0.95), tilt=6)
    crown((0.05, 0, 1.58))
    for i, (a, b) in enumerate(((6, 6), (5, 5), (4, 4))):
        domino(a, b, loc=(0.85 + i * 0.22, 0.1 + i * 0.05, 0.75), rot=(0, math.radians(-10 + i * 12), FACE_YAW), scale=0.55)
    chip_stack((-0.9, -0.35, -0.3), CHIP_HEX * 2)
    coffee((-0.5, -0.75, -0.35), 0.55)


def domino_lose():
    pedestal((0, 0, -0.18), w=2.0, d=1.2)
    pip((0.1, 0, 0.82), tilt=8, happy=False)
    tear((0.0, -0.45, 1.05))
    flat_domino(6, 5, (-0.6, -0.25, 0.04), math.radians(70), scale=0.55)
    flat_domino(4, 6, (-0.25, -0.42, 0.04), math.radians(-60), scale=0.55)
    flat_domino(0, 0, (0.7, 0.15, 0.04), math.radians(30), back=True, scale=0.55)
    coffee((0.75, -0.4, 0.0), 0.5)


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.75, res=(384, 384), target=(0, 0, 0.55), line=3.0)
ASSETS = {}
for i, c in enumerate(CHIP_HEX):
    ASSETS[f'chip-{i}'] = (lambda c=c: chip_sprite(c), dict(SPRITE, ortho=1.1, target=(0, 0, 0.5)))
ASSETS['bone'] = (bone_sprite, dict(SPRITE, ortho=1.8, target=(0, 0.1, 0.1)))
ASSETS['mode-gaple'] = (mode_gaple, dict(SPRITE, ortho=2.1, target=(0, 0, 0.35)))
ASSETS['mode-cangkul'] = (mode_cangkul, dict(SPRITE, ortho=2.3, target=(0, 0, 0.5)))
ASSETS['mode-lima'] = (mode_lima, dict(SPRITE, ortho=2.1, target=(0.05, -0.1, 0.7)))
ASSETS['mode-qiuqiu'] = (mode_qiuqiu, dict(SPRITE, ortho=2.1, target=(0, 0, 0.5)))

ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-domino'] = (tile_domino, dict(ILLU, ortho=3.9, target=(0, 0, 0.45)))
ASSETS['domino-win'] = (domino_win, dict(ILLU, ortho=3.8, res=(1200, 1100)))
ASSETS['domino-lose'] = (domino_lose, dict(ILLU, ortho=3.2, res=(1200, 1100)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
