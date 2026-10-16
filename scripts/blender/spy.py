# Aset Siapa Mata-mata, dimodel manual di Blender (bukan AI): empat maskot peran (warga bertopi pesta,
# penyusup berkumis palsu & kacamata hitam, Mr. White polos, mata-mata bermantel & fedora),
# kartu rahasia, kaca pembesar, stempel voting, pin lokasi, dan ilustrasi menu/menang/kalah.
# Jalankan: blender --background --python scripts/blender/spy.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py spy
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/spy']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

BLUE = '#2f7bff'
COAT = '#d9a35b'
GLASS = '#bfe6ff'
VIOLET = '#8a55ff'


def hexmat(h, rough=0.45):
    key = 'x' + h.lstrip('#')
    if key not in PAL:
        PAL[key] = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    return mat(key, rough)


def m_(color, rough=0.45):
    return hexmat(color, rough) if color.startswith('#') else mat(color, rough)


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
    o = add(last(), m_(color, rough))
    o.scale = size
    if bev:
        bevel(o, bev, 3)
    if not lines:
        no_lines(o)
    return o


def cyl(loc, r, h, color, rot=(0, 0, 0), verts=40, rough=0.45, lines=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    o = add(last(), m_(color, rough))
    shade_smooth(o)
    if not lines:
        no_lines(o)
    return o


def ball(loc, r, color, scale=(1, 1, 1), rough=0.4, lines=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=20)
    o = add(last(), m_(color, rough))
    o.scale = scale
    shade_smooth(o)
    if not lines:
        no_lines(o)
    return o


def cone_(loc, r1, h, color, r2=0.0, rot=(0, 0, 0), verts=40, rough=0.45):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    o = add(last(), m_(color, rough))
    shade_smooth(o)
    return o


def torus(loc, R, r, color, rot=(0, 0, 0), rough=0.4):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=48, minor_segments=14)
    o = add(last(), m_(color, rough))
    shade_smooth(o)
    return o


def label(text, loc, size, color, rot=(math.radians(90), 0, 0), extrude=0.03):
    """Teks 3D tipis berdiri di bidang XZ (menghadap -Y)."""
    cu = bpy.data.curves.new('label', 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = extrude
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('label', cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    add(o, m_(color, 0.3))
    no_lines(o)
    return o


def tube(points, r, color, rough=0.4, lines=False):
    curve = bpy.data.curves.new('tube', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = r
    curve.bevel_resolution = 4
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


def attach(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    return child


# ---------- maskot "kacang" untuk tiap peran ----------
def bean(color, face=True, happy=True, look=0.0):
    """Badan kapsul berdiri di z=0, wajah menghadap -Y. `look` menggeser mata ke samping (lirik)."""
    b = ball((0, 0, 0.78), 0.5, color, scale=(1, 0.92, 1.55))
    b.name = 'Bean'
    if face:
        eye(-0.17 + look, -0.42, 1.0, b, 0.1)
        eye(0.17 + look, -0.42, 1.0, b, 0.1)
        cheek(-0.3, -0.4, 0.82, b)
        cheek(0.3, -0.4, 0.82, b)
        mouth(0, -0.46, 0.8, b, happy)
    return b


def feet(color):
    return [ball((x, -0.08, 0.05), 0.15, color, scale=(1, 1.4, 0.55)) for x in (-0.2, 0.2)]


def party_hat(b, color='rose'):
    hat = cone_((0.06, 0, 1.78), 0.24, 0.5, color, verts=32)
    hat.rotation_euler = (0, math.radians(12), 0)
    band = torus((0.03, 0, 1.56), 0.22, 0.035, 'paper')
    band.rotation_euler = (0, math.radians(12), 0)
    pom = ball((0.12, 0, 2.05), 0.08, 'yellow')
    return [attach(o, b) for o in (hat, band, pom)]


def sunglasses(b, z=1.08):
    lens = [box((x, -0.47, z), (0.28, 0.06, 0.15), 'ink', rough=0.15, bev=0.05) for x in (-0.17, 0.17)]
    bridge = box((0, -0.48, z + 0.03), (0.12, 0.04, 0.04), 'ink', bev=0.01)
    shine = [box((x - 0.06, -0.505, z + 0.04), (0.06, 0.01, 0.03), 'paper', bev=0, lines=False) for x in (-0.17, 0.17)]
    arms = [box((x, -0.2, z + 0.02), (0.03, 0.5, 0.03), 'ink', bev=0) for x in (-0.47, 0.47)]
    return [attach(o, b) for o in (*lens, bridge, *shine, *arms)]


def mustache(b, z=0.8, drop=0.0, tilt=0.0):
    parts = []
    for s in (-1, 1):
        m = ball((s * 0.13, -0.49, z - drop), 0.12, 'ink', scale=(1.35, 0.5, 0.6), rough=0.6)
        m.rotation_euler = (0, s * math.radians(-18) + tilt, 0)
        curl = ball((s * 0.28, -0.46, z + 0.06 - drop), 0.055, 'ink', rough=0.6)
        parts += [m, curl]
    return [attach(o, b) for o in parts]


def fedora(b, color='ink'):
    brim = cyl((0, 0, 1.52), 0.62, 0.05, color, verts=48)
    crown_ = cyl((0, 0, 1.7), 0.38, 0.34, color, verts=40)
    dent = ball((0, 0, 1.87), 0.3, color, scale=(1, 0.8, 0.25))
    band = cyl((0, 0, 1.58), 0.395, 0.09, 'rose', verts=40)
    hat = [brim, crown_, dent, band]
    for o in hat:
        o.rotation_euler = (math.radians(-6), math.radians(8), 0)
    return [attach(o, b) for o in hat]


def trench_coat(b):
    coat = cone_((0, 0, 0.36), 0.6, 0.66, COAT, r2=0.47, verts=48)
    collar = [prism_xz([(0.02, 0), (0.3, 0.02), (0.1, 0.2)], 0.05, COAT, loc=(s * 0.04, -0.46, 0.62), mirror=s) for s in (-1, 1)]
    belt = torus((0, 0, 0.3), 0.55, 0.045, '#9a5b34')
    buckle = box((0, -0.58, 0.3), (0.14, 0.04, 0.11), 'yellow', bev=0.01)
    buttons = [ball((x, -0.55, z), 0.035, '#9a5b34', lines=False) for x in (-0.12, 0.12) for z in (0.14, 0.46)]
    return [attach(o, b) for o in (coat, *collar, belt, buckle, *buttons)]


def prism_xz(points, depth, color, loc=(0, 0, 0), mirror=1):
    n = len(points)
    pts = [(x * mirror, z) for x, z in points]
    verts = [(x, -depth / 2, z) for x, z in pts] + [(x, depth / 2, z) for x, z in pts]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me = bpy.data.meshes.new('prism')
    me.from_pydata(verts, [], faces)
    me.validate()
    o = bpy.data.objects.new('prism', me)
    scene.collection.objects.link(o)
    o.location = loc
    add(o, m_(color))
    return o


def question_mark(loc=(0, 0, 0), size=0.5, color='rose'):
    """Tanda tanya dari tabung lengkung + titik."""
    s = size
    hook = tube([(-0.35 * s, 0, 0.7 * s), (0, 0, 1.0 * s), (0.35 * s, 0, 0.72 * s), (0.05 * s, 0, 0.38 * s), (0, 0, 0.18 * s)], 0.11 * s, color, lines=True)
    dot = ball((0, 0, -0.12 * s), 0.13 * s, color)
    return group('q', [hook, dot], loc=loc)


def role_warga(loc=(0, 0, 0), scale=1.0, happy=True):
    b = bean('electric', happy=happy)
    party_hat(b, 'rose')
    return group('warga', [b, *feet('fern')], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def role_penyusup(loc=(0, 0, 0), scale=1.0, happy=True, slipping=False):
    b = bean('rose', happy=happy)
    sunglasses(b)
    if slipping:
        mustache(b, drop=0.32, tilt=math.radians(25))
    else:
        mustache(b)
    return group('penyusup', [b, *feet('#c4237d')], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def role_mrwhite(loc=(0, 0, 0), scale=1.0):
    b = bean('paper', face=False)
    # wajah kosong: cuma keringat dingin & alis bingung
    sweat = attach(ball((0.36, -0.36, 1.18), 0.06, BLUE, scale=(0.8, 0.6, 1.3), lines=False), b)
    brows = [attach(box((s * 0.17, -0.47, 1.12 + (0.03 if s > 0 else 0)), (0.16, 0.03, 0.035), 'ink', bev=0.01), b) for s in (-1, 1)]
    brows[0].rotation_euler = (0, math.radians(-12), 0)
    brows[1].rotation_euler = (0, math.radians(18), 0)
    q = question_mark((0.05, 0, 1.92), 0.55, 'rose')
    return group('mrwhite', [b, sweat, *brows, q, *feet('#e7d6e0')], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def role_spy(loc=(0, 0, 0), scale=1.0, happy=True):
    b = bean('#ffcc1f', happy=happy, look=0.07)
    fedora(b)
    trench_coat(b)
    return group('spy', [b, *feet('ink')], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


# ---------- benda ----------
def card(face='paper', loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    return box(loc, (0.9 * scale, 0.05 * scale, 1.25 * scale), face, rough=0.35, bev=0.06 * scale)


def card_back(loc=(0, 0, 0), scale=1.0):
    c = card('ink')
    inner = box((0, -0.03, 0), (0.72, 0.01, 1.07), 'rose', bev=0.03, lines=False)
    q = label('?', (0, -0.05, -0.02), 0.85, 'paper')
    stars = [ball((x, -0.04, z), 0.045, 'electric', lines=False) for x, z in ((-0.25, 0.4), (0.25, -0.42), (0.27, 0.38), (-0.27, -0.4))]
    return group('cardback', [c, inner, q, *stars], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def card_word(loc=(0, 0, 0), scale=1.0):
    c = card('paper')
    stripe = box((0, -0.03, 0.4), (0.72, 0.01, 0.2), 'electric', bev=0.01, lines=False)
    lines_ = [box((-0.05 + (0.05 if k % 2 else 0), -0.03, 0.05 - k * 0.16), (0.56 - (0.12 if k % 2 else 0), 0.01, 0.05), 'ink', bev=0, lines=False) for k in range(3)]
    heart = [ball((s * 0.06, -0.035, -0.42), 0.07, 'rose', lines=False) for s in (-1, 1)]
    tip = cone_((0, -0.035, -0.5), 0.12, 0.12, 'rose', rot=(math.radians(180), 0, 0), verts=4)
    no_lines(tip)
    tilt = group('cw', [c, stripe, *lines_, *heart, tip], rot=(0, math.radians(-8), 0))
    return group('cardword', [tilt], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def magnifier(loc=(0, 0, 0), scale=1.0, rot=(0, 0, 0)):
    ring = torus((0, 0, 0.75), 0.42, 0.08, 'rose', rot=(math.radians(90), 0, 0))
    glass = cyl((0, 0, 0.75), 0.4, 0.03, GLASS, rot=(math.radians(90), 0, 0), rough=0.05, lines=False)
    shine = ball((-0.15, -0.04, 0.9), 0.08, 'paper', scale=(1, 0.3, 1.6), lines=False)
    neck = cyl((0.36, 0, 0.36), 0.06, 0.2, 'ink', rot=(0, math.radians(45), 0), verts=20)
    handle = cyl((0.55, 0, 0.17), 0.09, 0.42, 'ink', rot=(0, math.radians(45), 0), verts=24, rough=0.3)
    g = group('mag', [ring, glass, shine, neck, handle], rot=(0, math.radians(-10), 0))
    return group('magnifier', [g], loc=loc, rot=(rot[0], rot[1], FACE_YAW + rot[2]), scale=scale)


def stamp(loc=(0, 0, 0), scale=1.0):
    base = box((0, 0, 0.12), (0.9, 0.6, 0.24), 'rose', bev=0.05)
    pad = box((0, 0, 0.01), (0.86, 0.56, 0.04), 'ink', bev=0.01, lines=False)
    neck = cyl((0, 0, 0.42), 0.12, 0.36, 'paper', verts=24)
    knob = ball((0, 0, 0.72), 0.24, 'electric', scale=(1, 1, 0.85))
    x = label('X', (0, -0.31, 0.12), 0.24, 'paper')
    return group('stamp', [base, pad, neck, knob, x], loc=loc, rot=(0, math.radians(-14), FACE_YAW), scale=scale)


def pin(loc=(0, 0, 0), scale=1.0):
    head = ball((0, 0, 0.8), 0.36, 'rose')
    tip = cone_((0, 0, 0.33), 0.31, 0.62, 'rose', rot=(math.radians(180), 0, 0), verts=40)
    dot = cyl((0, -0.33, 0.83), 0.15, 0.06, 'paper', rot=(math.radians(90), 0, 0), verts=32)
    shadow = cyl((0, 0, 0.005), 0.2, 0.01, '#d99ab9', verts=32, lines=False)
    return group('pin', [head, tip, dot, shadow], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


# ---------- ilustrasi ----------
def tile_spy():
    # meja bundar dengan kartu tertelungkup; tiga maskot saling curiga
    table = cyl((0, 0.3, 0.3), 1.35, 0.14, 'petal', verts=64)
    leg = cyl((0, 0.3, 0.12), 0.18, 0.3, 'ink', verts=24)
    for k, (x, y, r) in enumerate(((-0.55, -0.1, 20), (0.1, -0.35, -8), (0.65, 0.05, 30))):
        c = box((x, y, 0.39), (0.4, 0.56, 0.03), 'ink' if k != 1 else 'paper', rough=0.35, bev=0.03)
        c.rotation_euler = (0, 0, math.radians(r))
    role_warga((-1.3, 0.85, 0.0), 0.72)
    role_spy((1.35, 0.95, 0.0), 0.72)
    role_penyusup((0.0, 1.45, 0.25), 0.7)
    magnifier((-0.6, -0.9, 0.35), 0.75, rot=(0, math.radians(20), 0))
    pin((1.25, -0.6, 0.35), 0.5)
    question_mark((0.15, -1.05, 1.0), 0.55, 'electric')
    return table, leg


def spy_win():
    pedestal((0.1, 0, -0.18), w=2.1, d=1.1)
    role_spy((-0.1, 0, 0), 1.0)
    crown((-0.05, 0.05, 2.05))
    magnifier((0.85, -0.25, 0.25), 0.7, rot=(0, math.radians(-25), 0))
    card_word((-1.05, -0.2, 0.25), 0.55)


def spy_lose():
    pedestal((0, 0, -0.18), w=2.1, d=1.2)
    role_penyusup((0.0, 0.0, 0.0), 1.0, happy=False, slipping=True)
    tear((0.45, -0.55, 1.15))
    stamp((-1.0, -0.25, 0.0), 0.55)
    card_back((1.05, -0.1, 0.4), 0.45)


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.6, res=(384, 384), target=(0, 0, 0.45), line=3.0)
ROLE = dict(SPRITE, ortho=2.5, target=(0, 0, 1.0))
ASSETS = {
    'role-warga': (lambda: role_warga(), dict(ROLE, ortho=2.6, target=(0, 0, 1.1))),
    'role-penyusup': (lambda: role_penyusup(), ROLE),
    'role-mrwhite': (lambda: role_mrwhite(), dict(ROLE, ortho=2.8, target=(0, 0, 1.2))),
    'role-spy': (lambda: role_spy(), dict(ROLE, ortho=2.6, target=(0, 0, 1.0))),
    'card-back': (lambda: card_back(loc=(0, 0, 0.7)), dict(SPRITE, ortho=1.6, target=(0, 0, 0.7))),
    'card-word': (lambda: card_word(loc=(0, 0, 0.7)), dict(SPRITE, ortho=1.6, target=(0, 0, 0.7))),
    'icon-magnifier': (lambda: magnifier(), dict(SPRITE, ortho=1.7, target=(0.1, 0, 0.6))),
    'icon-stamp': (lambda: stamp(), dict(SPRITE, ortho=1.4, target=(0, 0, 0.4))),
    'icon-pin': (lambda: pin(), dict(SPRITE, ortho=1.5, target=(0, 0, 0.65))),
}
ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-spy'] = (tile_spy, dict(ILLU, ortho=4.3, target=(0.05, 0.2, 0.75)))
ASSETS['spy-win'] = (spy_win, dict(ILLU, ortho=3.9, res=(1200, 1100), target=(0, 0, 1.0)))
ASSETS['spy-lose'] = (spy_lose, dict(ILLU, ortho=3.6, res=(1200, 1100), target=(0, 0, 0.8)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
