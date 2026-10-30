# Stiker emote, dimodel manual di Blender (bukan AI): tujuh kepala bulat berekspresi dan satu jempol.
# Tiap stiker dirender 8 frame yang berputar mulus (T = 0..1), frame pertama sekaligus jadi versi diam.
# Jalankan: blender --background --python scripts/blender/emote.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py emote
# lalu: python -I scripts/blender/emote_anim.py
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/emote']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

BLUE = '#2f7bff'
SKY = '#8fbcff'
LILAC = '#c9b8f0'
R = 0.7
FRAMES = 8
T = 0.0  # posisi animasi, 0..1


def wave(cycles=1, phase=0.0):
    """Gelombang -1..1 yang berulang tepat `cycles` kali per putaran."""
    return math.sin((T * cycles + phase) * math.tau)


def beat(cycles=1, phase=0.0):
    """Denyut 0..1 yang berulang tepat `cycles` kali per putaran."""
    return abs(math.sin((T * cycles + phase) * math.pi))


def rise(phase=0.0):
    """Benda yang lahir, naik, lalu hilang: (kemajuan 0..1, ukuran 0..1)."""
    p = (T + phase) % 1
    return p, math.sin(p * math.pi)


def m_(color, rough=0.45):
    if color.startswith('#'):
        key = 'x' + color.lstrip('#')
        if key not in PAL:
            PAL[key] = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
        return mat(key, rough)
    return mat(color, rough)


def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun'):
            bpy.data.objects.remove(o, do_unlink=True)


def last():
    return bpy.context.object


def ball(loc, r, color, scale=(1, 1, 1), rough=0.4, lines=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=48, ring_count=32)
    o = add(last(), m_(color, rough))
    o.scale = scale
    shade_smooth(o)
    if not lines:
        no_lines(o)
    return o


def box(loc, size, color, rough=0.45, bev=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = add(last(), m_(color, rough))
    o.scale = size
    if bev:
        b = o.modifiers.new('bev', 'BEVEL')
        b.width = bev
        b.segments = 4
    return o


def tube(points, r, color, rough=0.35, lines=False):
    curve = bpy.data.curves.new('tube', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = r
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    sp = curve.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, co in zip(sp.bezier_points, points):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('tube', curve)
    scene.collection.objects.link(o)
    add(o, m_(color, rough))
    if not lines:
        no_lines(o)
    return o


def prism(points, depth, color, loc=(0, 0, 0), bev=0.0, rough=0.4, lines=True):
    """Bentuk datar dari garis luar (x, z), ditebalkan ke arah Y."""
    n = len(points)
    verts = [(x, -depth / 2, z) for x, z in points] + [(x, depth / 2, z) for x, z in points]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me = bpy.data.meshes.new('prism')
    me.from_pydata(verts, [], faces)
    me.validate()
    o = bpy.data.objects.new('prism', me)
    scene.collection.objects.link(o)
    o.location = loc
    add(o, m_(color, rough))
    if bev:
        b = o.modifiers.new('bev', 'BEVEL')
        b.width = bev
        b.segments = 4
        b.limit_method = 'ANGLE'
    if not lines:
        no_lines(o)
    return o


def label(text, loc, size, color, spin=0.0):
    cu = bpy.data.curves.new('label', 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = 0.03
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('label', cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (math.radians(90), math.radians(spin), 0)
    add(o, m_(color, 0.3))
    no_lines(o)
    return o


def on(x, z, lift=0.02):
    """Titik di permukaan depan kepala."""
    return (x, -math.sqrt(max(R * R - x * x - z * z, 0.0)) - lift, z)


def arc(xa, xb, z, bend, r=0.03, color='ink'):
    """Lengkung tinta menempel di wajah; `bend` positif = melengkung ke atas."""
    mid = (xa + xb) / 2
    return tube([on(xa, z), on(mid, z + bend), on(xb, z)], r, color)


def head(color):
    return ball((0, 0, 0), R, color, rough=0.42)


def round_eye(x, z, r=0.085):
    ball(on(x, z, 0), r, 'ink', scale=(1, 0.45, 1.25), rough=0.2, lines=False)
    ball(on(x + r * 0.3, z + r * 0.45, 0.04), r * 0.32, 'paper', scale=(1, 0.5, 1), rough=0.1, lines=False)


def blush(x, z, color='rose'):
    ball(on(x, z, -0.01), 0.1, color, scale=(1.3, 0.3, 0.75), rough=0.6, lines=False)


def heart_points(size, n=40):
    pts = []
    for i in range(n):
        t = i / n * math.tau
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 16 * size, z / 16 * size))
    return pts


def drop(loc, r=0.075):
    bpy.ops.mesh.primitive_cone_add(radius1=r, depth=r * 2.1, location=(loc[0], loc[1], loc[2] + r * 1.1), vertices=24)
    cap = add(last(), m_(BLUE, 0.2))
    no_lines(cap)
    ball(loc, r, BLUE, rough=0.2, lines=False)


# ---------- stiker ----------
def ngakak():
    head('yellow')
    arc(-0.36, -0.1, 0.2, 0.12, 0.036)
    arc(0.1, 0.36, 0.2, 0.12, 0.036)
    open_ = 0.72 + 0.28 * beat(2)
    mouth_ = [(-0.34, 0.0)] + [(math.cos(a) * 0.34, -math.sin(a) * 0.34 * open_) for a in [i / 24 * math.pi for i in range(1, 24)]][::-1] + [(0.34, 0.0)]
    prism(mouth_, 0.04, 'ink', loc=(0, -0.68, -0.08), lines=False)
    ball((0, -0.71, -0.08 - 0.25 * open_), 0.15, 'rose', scale=(1.1, 0.2, 0.6 * open_), lines=False)
    box((0, -0.71, -0.13), (0.42, 0.02, 0.06), 'paper', bev=0.01)
    for s, phase in ((-1, 0.0), (1, 0.5)):
        p, size = rise(phase)
        drop((s * (0.68 + p * 0.3), -0.2, 0.25 + 0.3 * math.sin(p * math.pi)), 0.02 + 0.06 * size)


def nangis():
    head(SKY)
    arc(-0.34, -0.1, 0.17, -0.07, 0.034)
    arc(0.1, 0.34, 0.17, -0.07, 0.034)
    tube([on(-0.36, 0.34), on(-0.25, 0.4), on(-0.12, 0.36)], 0.028, 'ink')
    tube([on(0.12, 0.36), on(0.25, 0.4), on(0.36, 0.34)], 0.028, 'ink')
    for s, phase in ((-1, 0.0), (1, 0.35)):
        tube([on(s * 0.22, 0.12), on(s * 0.24, -0.2), on(s * 0.27, -0.56)], 0.05 + 0.012 * wave(2, phase), BLUE, rough=0.2)
        for k in (0.0, 0.5):
            p, size = rise(phase + k)
            drop((s * (0.27 + p * 0.08), -0.72, -0.5 - p * 0.42), 0.03 + 0.06 * size)
    arc(-0.14, 0.14, -0.26, 0.09 + 0.025 * wave(4), 0.034)


def ngambek():
    head('rose')
    for s in (-1, 1):
        round_eye(s * 0.22, 0.06, 0.08)
        box(on(s * 0.23, 0.25 + 0.015 * wave(2), 0.03), (0.3, 0.04, 0.075), 'ink', bev=0.015, rot=(0, math.radians(s * (22 + 5 * wave(2))), 0))
        for phase in (0.0, 0.34, 0.67):
            p, size = rise(phase + (0.17 if s > 0 else 0))
            ball((s * (0.74 + p * 0.26), -0.1, 0.08 + p * 0.3), 0.025 + 0.085 * size, '#b9adb5', rough=0.7, lines=False)
    arc(-0.17, 0.17, -0.3, 0.1, 0.036)


def naksir():
    head('paper')
    pulse = 1 + 0.2 * beat(2)
    for s in (-1, 1):
        prism(heart_points(0.19 * pulse), 0.06, 'rose', loc=(s * 0.24, -0.66, 0.1), bev=0.02, rough=0.3)
        blush(s * 0.42, -0.14)
    arc(-0.16, 0.16, -0.22, -0.12, 0.034)
    for x, phase, size in ((0.62, 0.0, 0.15), (0.84, 0.33, 0.11), (-0.68, 0.66, 0.12)):
        p, grow = rise(phase)
        prism(heart_points(0.02 + size * grow), 0.05, 'rose', loc=(x + 0.05 * wave(1, phase), -0.3, 0.2 + p * 0.75), bev=0.008, rough=0.3, lines=False)


def kaget():
    head('electric')
    wide = 0.85 + 0.3 * beat(2)
    for s in (-1, 1):
        ball(on(s * 0.23, 0.14, -0.02), 0.17 * wide, 'paper', scale=(1, 0.4, 1.15), rough=0.2)
        ball(on(s * 0.23, 0.14, 0.05), 0.05, 'ink', scale=(1, 0.45, 1), rough=0.2, lines=False)
    ball(on(0, -0.27, -0.01), 0.14 * wide, 'ink', scale=(0.85, 0.3, 1.1), rough=0.3, lines=False)
    p, size = rise(0.2)
    drop((0.62 + p * 0.22, -0.25, 0.5 - p * 0.45), 0.03 + 0.06 * size)
    for x, z, spin, phase in ((-0.72, 0.5, 14, 0.0), (0.0, 0.88, 0, 0.25)):
        label('!', (x, -0.2, z), 0.36 + 0.2 * beat(2, phase), 'rose', spin)


def keren():
    head('grass')
    slide = 0.02 * wave(1)
    for s in (-1, 1):
        lens = [(-0.2, 0.1), (0.2, 0.1), (0.18, -0.04), (0.06, -0.12), (-0.1, -0.12), (-0.2, -0.02)]
        prism(lens, 0.05, 'ink', loc=(s * 0.25, -0.7, 0.12 + slide), bev=0.015, rough=0.15)
        box((s * 0.28, -0.74, 0.17 + slide), (0.11, 0.01, 0.03), 'paper', bev=0.0, rot=(0, math.radians(-30), 0))
    box((0, -0.71, 0.2 + slide), (0.14, 0.05, 0.05), 'ink', bev=0.01)
    box((-0.58, -0.32, 0.2 + slide), (0.24, 0.05, 0.05), 'ink', bev=0.01)
    box((0.58, -0.32, 0.2 + slide), (0.24, 0.05, 0.05), 'ink', bev=0.01)
    tube([on(-0.15, -0.22), on(0.03, -0.3 - 0.02 * wave(1)), on(0.21, -0.17)], 0.034, 'ink')
    for x, z, s, phase in ((0.74, 0.6, 1.0, 0.0), (-0.72, -0.5, 0.7, 0.5)):
        twinkle = (0.25 + 0.95 * beat(1, phase)) * s
        turn = T * math.pi / 2
        points = [(math.cos(i / 8 * math.tau + turn) * (0.2 if i % 2 == 0 else 0.06) * twinkle, math.sin(i / 8 * math.tau + turn) * (0.2 if i % 2 == 0 else 0.06) * twinkle) for i in range(8)]
        prism(points, 0.05, 'yellow', loc=(x, -0.3, z), bev=0.004, rough=0.2, lines=False)


def ngantuk():
    head(LILAC)
    arc(-0.35, -0.1, 0.12, -0.07, 0.034)
    arc(0.1, 0.35, 0.12, -0.07, 0.034)
    ball(on(0.02, -0.25, -0.01), 0.07, 'ink', scale=(1.1, 0.3, 0.7 + 0.25 * wave(1)), rough=0.3, lines=False)
    bubble = 0.09 * (1.05 + 0.5 * wave(1, -0.25))
    ball(on(0.34, -0.25, 0.0), bubble, SKY, scale=(1, 0.5, 1), rough=0.1, lines=False)
    for phase in (0.0, 0.33, 0.66):
        p, size = rise(phase)
        label('Z', (0.46 + p * 0.55, -0.25, 0.5 + p * 0.75), 0.08 + 0.42 * size, BLUE, -10 - 10 * p)


def sip():
    fist = box((0, 0, -0.12), (0.72, 0.52, 0.74), 'yellow', bev=0.16)
    fist.name = 'fist'
    for k in range(4):
        z = 0.14 - k * 0.175
        box((0.02, -0.28, z), (0.5, 0.1, 0.13), 'yellow', bev=0.05)
    thumb = box((-0.14, 0, 0.5 + 0.05 * beat(2)), (0.26, 0.34, 0.66), 'yellow', bev=0.12, rot=(0, math.radians(-8 + 9 * wave(2)), 0))
    thumb.name = 'thumb'
    box((0.56, 0, -0.14), (0.42, 0.56, 0.72), 'rose', bev=0.06)
    box((0.78, 0, -0.14), (0.1, 0.62, 0.84), 'electric', bev=0.03)
    for i, phase in enumerate((0.0, 0.5)):
        p, size = rise(phase)
        s = (0.15 + 0.2 * size) * 0.6
        a = T * math.tau
        points = [(math.cos(k / 8 * math.tau + a) * (s if k % 2 == 0 else s * 0.3), math.sin(k / 8 * math.tau + a) * (s if k % 2 == 0 else s * 0.3)) for k in range(8)]
        prism(points, 0.05, 'yellow' if i else 'rose', loc=(-0.72 + i * 0.3, -0.3, 0.45 + i * 0.5), bev=0.004, rough=0.2, lines=False)


def whole(loc=(0, 0, 0), tilt=0.0, scale=1.0):
    """Gerakkan seluruh stiker sekaligus."""
    e = bpy.data.objects.new('pose', None)
    scene.collection.objects.link(e)
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun', 'pose') and o.parent is None:
            o.parent = e
    e.location = loc
    e.rotation_euler = (0, math.radians(tilt), 0)
    e.scale = (scale, scale, scale)


POSE = {
    'ngakak': lambda: whole((0, 0, 0.1 * beat(2)), 9 * wave(2)),
    'nangis': lambda: whole((0.025 * wave(4), 0, 0), 3 * wave(2)),
    'ngambek': lambda: whole((0.05 * wave(4), 0, 0), 2 * wave(4), 1 + 0.03 * beat(2)),
    'naksir': lambda: whole((0, 0, 0.05 * wave(1)), 6 * wave(1)),
    'kaget': lambda: whole((0, 0, 0.14 * beat(2)), 0, 1 + 0.05 * beat(2)),
    'keren': lambda: whole((0, 0, 0), 6 * wave(1)),
    'ngantuk': lambda: whole((0, 0, -0.03 + 0.03 * wave(1)), 7 * wave(1)),
    'sip': lambda: whole((0, 0, 0.07 * beat(2)), 7 * wave(2), 1 + 0.04 * beat(2)),
}

# ---------- daftar aset ----------
HEAD = dict(ortho=2.5, target=(0, 0, 0.0))
ASSETS = {
    'ngakak': (ngakak, dict(HEAD, ortho=2.5, target=(0, 0, 0.05))),
    'nangis': (nangis, dict(HEAD, ortho=2.3, target=(0, 0, -0.1))),
    'ngambek': (ngambek, dict(HEAD, ortho=2.5, target=(0, 0, 0.1))),
    'naksir': (naksir, dict(HEAD, ortho=2.7, target=(0.1, 0, 0.25))),
    'kaget': (kaget, dict(HEAD, ortho=2.8, target=(0, 0, 0.35))),
    'keren': (keren, dict(HEAD, ortho=2.4)),
    'ngantuk': (ngantuk, dict(HEAD, ortho=3.1, target=(0.3, 0, 0.45))),
    'sip': (sip, dict(HEAD, ortho=2.7, target=(0.1, 0, 0.2))),
}

OUT_DIR.mkdir(parents=True, exist_ok=True)
FRAME_DIR = OUT_DIR / 'frames'
FRAME_DIR.mkdir(exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    for i in range(FRAMES):
        T = i / FRAMES
        clear()
        build()
        POSE[name]()
        target = cam['target']
        studio(cam['ortho'], (512, 512), (target[0], -7, target[2] + 0.5), target, 4.0)
        render(str((FRAME_DIR / f'{name}-{i}.png').resolve()))
        if i == 0:
            render(str((OUT_DIR / f'{name}.png').resolve()))
