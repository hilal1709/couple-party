# Aset Bom Waktu, dimodel manual di Blender (bukan AI): bom bulat berwajah panik dengan sumbu,
# hati nyawa (utuh & ditambal), tiga power-up (bumerang, sepatu pegas, gunting), toa protes,
# maskot gosong berambut kribo, dan ilustrasi menu/menang/kalah.
# Jalankan: blender --background --python scripts/blender/bom.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py bom
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/bom']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

BLUE = '#2f7bff'
STEEL = '#9a9aae'
SOOT = '#4a4148'
SMOKE = '#b9adb5'
ROPE = '#d9a35b'
DUSTY = '#d98bb4'


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


def cone_(loc, r1, h, color, r2=0.0, rot=(0, 0, 0), verts=40, rough=0.45, lines=True):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    o = add(last(), m_(color, rough))
    shade_smooth(o)
    if not lines:
        no_lines(o)
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


def attach(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    return child


def prism_xz(points, depth, color, loc=(0, 0, 0), bev=0.0, rough=0.45):
    """Bentuk datar dari garis luar (x, z) yang ditebalkan ke arah Y."""
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
        b = bevel(o, bev, 4)
        b.modifiers['bev'].limit_method = 'ANGLE'
    return o


# ---------- bom ----------
def big_eye(x, z, parent, look=(0.0, 0.0), r=0.13):
    """Mata putih besar dengan pupil hitam (supaya terbaca di badan bom yang hitam)."""
    white = ball((x, -0.5, z), r, 'paper', scale=(1, 0.5, 1.25), rough=0.2)
    pupil = ball((x + look[0], -0.56, z + look[1]), r * 0.5, 'ink', scale=(1, 0.5, 1.2), rough=0.2, lines=False)
    hl = ball((x + look[0] + r * 0.18, -0.6, z + look[1] + r * 0.25), r * 0.16, 'paper', lines=False)
    return [attach(o, parent) for o in (white, pupil, hl)]


def spark(loc, scale=1.0):
    """Percikan api di ujung sumbu: inti kuning + duri pink & kuning."""
    core = ball(loc, 0.09 * scale, 'yellow', rough=0.2)
    parts = [core]
    for i in range(8):
        a = i / 8 * math.tau
        tip = cone_(
            (loc[0] + math.cos(a) * 0.13 * scale, loc[1], loc[2] + math.sin(a) * 0.13 * scale),
            0.045 * scale,
            0.16 * scale,
            'rose' if i % 2 else 'yellow',
            rot=(0, math.pi / 2 - a, 0),
            verts=12,
            rough=0.2,
        )
        parts.append(tip)
    return parts


def bomb(loc=(0, 0, 0), scale=1.0, lit=True, face='panic', rot=(0, 0, 0)):
    body = ball((0, 0, 0.65), 0.6, 'ink', rough=0.25)
    body.name = 'Bomb'
    shine = attach(ball((-0.28, -0.42, 0.95), 0.1, 'paper', scale=(1.4, 0.4, 0.8), lines=False), body)
    shine.rotation_euler = (0, math.radians(35), 0)
    cap = cyl((0.12, 0, 1.25), 0.17, 0.16, STEEL, rot=(0, math.radians(14), 0), verts=32, rough=0.25)
    rim = torus((0.13, 0, 1.33), 0.15, 0.035, STEEL, rot=(0, math.radians(14), 0), rough=0.25)
    fuse = tube([(0.16, 0, 1.32), (0.24, 0, 1.55), (0.42, 0, 1.62), (0.5, 0, 1.78)], 0.045, ROPE, rough=0.7, lines=True)
    parts = [body, shine, cap, rim, fuse]
    if lit:
        parts += spark((0.52, 0, 1.84))
    else:
        # sumbu padam: ujung gosong + asap tipis
        parts.append(ball((0.5, 0, 1.79), 0.05, SOOT, lines=False))
        parts += [ball((0.55 + k * 0.08, 0, 1.92 + k * 0.17), 0.06 + k * 0.025, SMOKE, rough=0.8) for k in range(3)]
    if face == 'panic':
        big_eye(-0.19, 0.78, body, look=(0.03, 0.02))
        big_eye(0.19, 0.78, body, look=(0.03, 0.02))
        brow = [attach(box((s * 0.2, -0.53, 0.98), (0.17, 0.03, 0.035), 'paper', bev=0.01, lines=False), body) for s in (-1, 1)]
        brow[0].rotation_euler = (0, math.radians(18), 0)
        brow[1].rotation_euler = (0, math.radians(-18), 0)
        mouth_ = tube([(-0.13, -0.57, 0.5), (-0.06, -0.58, 0.54), (0.0, -0.58, 0.5), (0.06, -0.58, 0.54), (0.13, -0.57, 0.5)], 0.022, 'paper')
        attach(mouth_, body)
        attach(ball((0.46, -0.36, 0.98), 0.065, BLUE, scale=(0.8, 0.6, 1.3), lines=False), body)
    elif face == 'calm':
        for s in (-1, 1):
            attach(tube([(s * 0.19 - 0.08, -0.56, 0.8), (s * 0.19, -0.57, 0.86), (s * 0.19 + 0.08, -0.56, 0.8)], 0.025, 'paper'), body)
        attach(tube([(-0.12, -0.57, 0.56), (0, -0.59, 0.5), (0.12, -0.57, 0.56)], 0.022, 'paper'), body)
    return group('bomb', parts, loc=loc, rot=(rot[0], rot[1], FACE_YAW + rot[2]), scale=scale)


# ---------- hati nyawa ----------
def heart_points(size=0.5, n=48):
    pts = []
    for i in range(n):
        t = i / n * math.tau
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 16 * size, z / 16 * size))
    return pts


def heart(loc=(0, 0, 0), scale=1.0, color='rose', patched=False):
    h = prism_xz(heart_points(0.5), 0.26, color, bev=0.09, rough=0.35)
    shade_smooth(h)
    parts = [h]
    parts.append(ball((-0.2, -0.14, 0.2), 0.07, 'paper', scale=(1.3, 0.4, 0.8), lines=False))
    if patched:
        for r in (40, -40):
            band = box((0.05, -0.15, -0.02), (0.5, 0.04, 0.13), '#ffcc1f', bev=0.02)
            band.rotation_euler = (0, math.radians(r), 0)
            parts.append(band)
        parts += [ball((0.05 + dx, -0.18, -0.02 + dz), 0.015, 'ink', lines=False) for dx, dz in ((-0.03, 0.03), (0.03, -0.03), (0.03, 0.03), (-0.03, -0.03))]
    return group('heart', parts, loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


# ---------- power-up ----------
def boomerang(loc=(0, 0, 0), scale=1.0):
    arm = [(-0.62, 0.42), (-0.46, 0.55), (0.04, 0.0), (-0.46, -0.55), (-0.62, -0.42), (-0.24, 0.0)]
    b = prism_xz(arm, 0.12, 'rose', bev=0.05, rough=0.35)
    stripes = [box((-0.38 + s * 0.0, -0.08, z), (0.08, 0.02, 0.18), 'paper', bev=0.0, lines=False) for s, z in ((1, 0.3), (1, -0.3))]
    stripes[0].rotation_euler = (0, math.radians(-48), 0)
    stripes[1].rotation_euler = (0, math.radians(48), 0)
    g = group('boom', [b, *stripes], rot=(0, math.radians(-15), 0))
    return group('boomerang', [g], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def spring_shoe(loc=(0, 0, 0), scale=1.0):
    sole = box((0.05, 0, 0.42), (0.95, 0.42, 0.1), 'ink', bev=0.04)
    upper = box((-0.12, 0, 0.62), (0.6, 0.4, 0.32), 'electric', bev=0.1)
    toe = ball((0.3, 0, 0.55), 0.24, 'electric', scale=(1.1, 0.82, 0.6))
    lace = [box((x, -0.21, 0.7), (0.05, 0.02, 0.2), 'paper', bev=0.0, lines=False) for x in (-0.25, -0.12, 0.01)]
    stripe = box((-0.12, -0.205, 0.58), (0.5, 0.02, 0.06), 'rose', bev=0.0, lines=False)
    coil = []
    n = 5
    pts = [(0.05 + 0.13 * math.cos(t / 8 * math.tau), 0.13 * math.sin(t / 8 * math.tau), 0.36 - t * 0.33 / (n * 8)) for t in range(n * 8 + 1)]
    coil.append(tube(pts, 0.028, STEEL, rough=0.25, lines=True))
    base = cyl((0.05, 0, 0.02), 0.18, 0.04, 'ink', verts=32)
    return group('shoe', [sole, upper, toe, *lace, stripe, *coil, base], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def scissors(loc=(0, 0, 0), scale=1.0):
    blade = [(0.0, -0.04), (0.78, -0.02), (0.84, 0.03), (0.0, 0.06)]
    parts = []
    for s in (-1, 1):
        b = prism_xz(blade, 0.04, '#e9e6f0', bev=0.012, rough=0.15)
        b.rotation_euler = (0, math.radians(s * 16), 0)
        handle = torus((-0.32, 0, s * 0.16), 0.16, 0.055, 'rose', rot=(math.radians(90), 0, 0))
        arm = box((-0.11, 0, s * 0.07), (0.24, 0.05, 0.07), 'rose', bev=0.02)
        arm.rotation_euler = (0, math.radians(-s * 30), 0)
        parts += [b, handle, arm]
    pivot = cyl((0, -0.03, 0.01), 0.05, 0.1, 'ink', rot=(math.radians(90), 0, 0), verts=20)
    g = group('sc', [*parts, pivot], rot=(0, math.radians(-30), 0))
    return group('scissors', [g], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def megaphone(loc=(0, 0, 0), scale=1.0):
    horn = cone_((0.12, 0, 0.6), 0.36, 0.7, '#ffcc1f', r2=0.12, rot=(0, math.radians(-90), 0), verts=40)
    bell = torus((0.47, 0, 0.6), 0.35, 0.04, 'ink', rot=(0, math.radians(90), 0))
    mouth = cyl((-0.27, 0, 0.6), 0.13, 0.12, 'ink', rot=(0, math.radians(90), 0), verts=24)
    grip = box((-0.12, 0, 0.36), (0.1, 0.12, 0.34), 'rose', bev=0.03)
    grip.rotation_euler = (0, math.radians(-12), 0)
    waves = [tube([(0.65 + k * 0.14, 0, 0.6 + (0.18 + k * 0.08)), (0.75 + k * 0.17, 0, 0.6), (0.65 + k * 0.14, 0, 0.6 - (0.18 + k * 0.08))], 0.03, 'rose', lines=True) for k in range(2)]
    g = group('mega', [horn, bell, mouth, grip, *waves], rot=(0, math.radians(-12), 0))
    return group('megaphone', [g], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


# ---------- maskot ----------
def bean(color, face=True, happy=True):
    b = ball((0, 0, 0.78), 0.5, color, scale=(1, 0.92, 1.55))
    b.name = 'Bean'
    if face:
        eye(-0.17, -0.42, 1.0, b, 0.1)
        eye(0.17, -0.42, 1.0, b, 0.1)
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


def mascot(color='electric', loc=(0, 0, 0), scale=1.0, happy=True, hat=None, lean=0.0):
    b = bean(color, happy=happy)
    if hat:
        party_hat(b, hat)
    return group('mascot', [b, *feet('fern' if color == 'electric' else '#c4237d')], loc=loc, rot=(0, math.radians(lean), FACE_YAW), scale=scale)


def mascot_gosong(loc=(0, 0, 0), scale=1.0):
    """Maskot habis kena ledakan: badan berjelaga, rambut kribo berasap, mata linglung."""
    b = ball((0, 0, 0.78), 0.5, DUSTY, scale=(1, 0.92, 1.55))
    b.name = 'Bean'
    # mata linglung: lingkaran putih + spiral kecil
    for s in (-1, 1):
        attach(ball((s * 0.17, -0.44, 1.0), 0.11, 'paper', scale=(1, 0.45, 1.15), rough=0.2), b)
        attach(torus((s * 0.17, -0.5, 1.0), 0.05, 0.016, 'ink', rot=(math.radians(90), 0, 0)), b)
        attach(ball((s * 0.17 + 0.012, -0.5, 1.0), 0.02, 'ink', lines=False), b)
    attach(torus((0, -0.47, 0.76), 0.06, 0.022, 'ink', rot=(math.radians(90), 0, 0)), b)
    soot = [attach(ball((x, -0.38, z), r, SOOT, scale=(1.4, 0.3, 0.9), rough=0.9, lines=False), b) for x, z, r in ((-0.33, 0.68, 0.09), (0.3, 1.18, 0.07), (0.22, 0.5, 0.06), (-0.2, 1.25, 0.05))]
    afro = []
    for i in range(14):
        a = i / 14 * math.tau
        ring_ = 0.32 if i % 2 else 0.22
        afro.append(ball((math.cos(a) * ring_, math.sin(a) * ring_ * 0.8, 1.6 + (0.08 if i % 3 == 0 else 0)), 0.2, 'ink', rough=0.9))
    afro.append(ball((0, 0, 1.78), 0.24, 'ink', rough=0.9))
    smoke = [ball((0.2 + k * 0.12, 0.05, 2.05 + k * 0.28), 0.1 + k * 0.05, SMOKE, rough=0.8) for k in range(3)]
    for o in (*afro, *smoke):
        attach(o, b)
    return group('gosong', [b, *soot, *feet(SOOT)], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def letter_tile(ch, loc, rot=0.0, color='paper', scale=1.0):
    """Ubin huruf berdiri menghadap kamera, sedikit miring."""
    t = box((0, 0, 0.25), (0.46, 0.1, 0.46), color, bev=0.03)
    lab = label(ch, (0, -0.06, 0.24), 0.34, 'ink', extrude=0.02)
    return group('tile', [t, lab], loc=loc, rot=(0, math.radians(rot), FACE_YAW), scale=scale)


# ---------- ilustrasi ----------
def tile_bom():
    # meja bundar: bom menyala di tengah, dua maskot panik saling oper, huruf & hati berserakan
    table = cyl((0, 0.3, 0.3), 1.4, 0.14, 'petal', verts=64)
    leg = cyl((0, 0.3, 0.12), 0.18, 0.3, 'ink', verts=24)
    bomb((0.05, 0.1, 0.37), 0.95, lit=True)
    mascot('electric', (-1.55, -0.1, 0.0), 0.8, happy=False, hat='rose', lean=-10)
    mascot('rose', (1.6, 0.1, 0.0), 0.78, happy=False, lean=12)
    letter_tile('K', (-0.75, -0.75, 0.37), -10, 'electric', 0.9)
    letter_tile('A', (0.8, -0.7, 0.37), 12, 'paper', 0.9)
    heart((-0.95, 0.9, 1.25), 0.5)
    scissors((1.0, 0.95, 0.9), 0.5)
    return table, leg


def bom_win():
    pedestal((0.1, 0, -0.18), w=2.2, d=1.1)
    mascot('electric', (-0.25, 0, 0), 1.0, hat='rose')
    crown((-0.2, 0.05, 2.2))
    bomb((0.85, -0.2, 0.0), 0.55, lit=False, face='calm')
    heart((-1.1, -0.2, 0.75), 0.45)


def bom_lose():
    pedestal((0, 0, -0.18), w=2.2, d=1.2)
    mascot_gosong((0.0, 0.0, 0.0), 1.0)
    # serpihan bom: kepingan hitam & sumbu putus
    for x, z, r in ((-1.0, 0.15, 30), (0.95, 0.12, -20), (1.15, 0.5, 60)):
        p = prism_xz([(-0.12, -0.08), (0.14, -0.1), (0.1, 0.1), (-0.08, 0.12)], 0.08, 'ink', loc=(x, -0.3, z), bev=0.02)
        p.rotation_euler = (0, math.radians(r), 0)
    tube([(-0.95, -0.35, 0.42), (-0.8, -0.35, 0.6), (-0.62, -0.35, 0.55)], 0.04, ROPE, lines=True)
    heart((0.95, -0.25, 1.1), 0.4, color='#b8adb4', patched=True)


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.6, res=(384, 384), target=(0, 0, 0.45), line=3.0)
ASSETS = {
    'bomb': (lambda: bomb(), dict(SPRITE, ortho=2.4, target=(0.1, 0, 0.95))),
    'icon-heart': (lambda: heart(loc=(0, 0, 0.5)), dict(SPRITE, ortho=1.3, target=(0, 0, 0.5))),
    'icon-heart-off': (lambda: heart(loc=(0, 0, 0.5), color='#b8adb4', patched=True), dict(SPRITE, ortho=1.3, target=(0, 0, 0.5))),
    'power-balik': (lambda: boomerang(loc=(0, 0, 0.5)), dict(SPRITE, ortho=1.6, target=(-0.1, 0, 0.5))),
    'power-lompat': (lambda: spring_shoe(), dict(SPRITE, ortho=1.5, target=(0.05, 0, 0.4))),
    'power-pendek': (lambda: scissors(loc=(0, 0, 0.5)), dict(SPRITE, ortho=1.5, target=(0.1, 0, 0.5))),
    'icon-protest': (lambda: megaphone(), dict(SPRITE, ortho=1.7, target=(0.15, 0, 0.6))),
    'mascot-gosong': (lambda: mascot_gosong(), dict(SPRITE, ortho=2.8, target=(0, 0, 1.15))),
}
ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-bom'] = (tile_bom, dict(ILLU, ortho=4.4, target=(0.0, 0.2, 0.8)))
ASSETS['bom-win'] = (bom_win, dict(ILLU, ortho=3.9, res=(1200, 1100), target=(0, 0, 1.0)))
ASSETS['bom-lose'] = (bom_lose, dict(ILLU, ortho=3.7, res=(1200, 1100), target=(0, 0, 0.9)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
