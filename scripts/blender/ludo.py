# Aset Ludo, dimodel manual di Blender (bukan AI): bidak bertopi pesta, dadu pink, ikon petak jahil
# (roket, portal, bom, kulit pisang), bintang aman, mahkota finis, dan ilustrasi menu/menang/kalah.
# Jalankan: blender --background --python scripts/blender/ludo.py -- <folder-output> [nama ...]
# Tanpa nama = render semua. Lanjutkan dengan: python -I scripts/blender/export.py ludo
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/ludo']
OUT_DIR = Path(argv[0])
ONLY = set(argv[1:])

# warna mengikuti src/games/ludo/ui/art.tsx (PAWN_HEX)
PAWN_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']
# topi pesta tiap bidak: warna kontras dengan badannya
HAT_HEX = ['#5cf64a', '#ff37a6', '#ffcc1f', '#2f7bff', '#5cf64a', '#8a55ff', '#ff37a6', '#ffcc1f']
BANANA = '#ffd84a'
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
    add(o, m_(color, rough))
    return o


def star_pts(outer, inner, n=5, cx=0.0, cz=0.0):
    pts = []
    for i in range(n * 2):
        a = math.pi / 2 + i * math.pi / n
        r = outer if i % 2 == 0 else inner
        pts.append((cx + math.cos(a) * r, cz + math.sin(a) * r))
    return pts


# ---------- bidak Ludo: pasak bulat bertopi pesta ----------
def ludo_pawn(i, loc=(0, 0, 0), scale=1.0, yaw=FACE_YAW, happy=True):
    c = PAWN_HEX[i]
    parts = [
        bevel(cyl((0, 0, 0.07), 0.46, 0.14, c, verts=48), 0.04),
        cyl((0, 0, 0.15), 0.4, 0.04, 'paper', verts=48),
        cone_((0, 0, 0.42), 0.36, 0.52, c, r2=0.16, verts=48),
        torus((0, 0, 0.68), 0.19, 0.06, 'paper'),
    ]
    head = ball((0, 0, 0.98), 0.3, c)
    head.name = 'PawnHead'
    parts.append(head)
    eye(-0.1, -0.26, 1.02, head, 0.065)
    eye(0.1, -0.26, 1.02, head, 0.065)
    mouth(0, -0.285, 0.9, head, happy)
    # topi pesta miring sedikit + pompom
    hat = cone_((0.05, 0, 1.38), 0.15, 0.36, HAT_HEX[i], verts=32)
    hat.rotation_euler = (0, math.radians(14), 0)
    band = torus((0.03, 0, 1.23), 0.14, 0.025, 'paper')
    band.rotation_euler = (0, math.radians(14), 0)
    pom = ball((0.1, 0, 1.58), 0.065, 'paper')
    parts += [hat, band, pom]
    return group('pawn', parts, loc=loc, rot=(0, 0, yaw), scale=scale)


# ---------- dadu pink ----------
PIPS = {
    1: [(0, 0)],
    2: [(-1, 1), (1, -1)],
    3: [(-1, 1), (0, 0), (1, -1)],
    4: [(-1, 1), (1, 1), (-1, -1), (1, -1)],
    5: [(-1, 1), (1, 1), (0, 0), (-1, -1), (1, -1)],
    6: [(-1, 1), (1, 1), (-1, 0), (1, 0), (-1, -1), (1, -1)],
}


def die(value, loc=(0, 0, 0.5), size=0.8, rot=(0, 0, FACE_YAW), body='rose', pip_color='paper'):
    s = size
    cube = box((0, 0, 0), (s, s, s), body, rough=0.3, bev=s * 0.18)
    shade_smooth(cube)
    parts = [cube]
    g = s * 0.25
    r = s * 0.085

    def face(n, place):
        for u, v in PIPS[n]:
            bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=16, ring_count=10)
            o = add(last(), mat(pip_color, 0.3))
            no_lines(o)
            place(o, u * g, v * g)
            parts.append(o)

    def top(o, u, v):
        o.location = (u, v, s / 2 - r * 0.1)
        o.scale = (1, 1, 0.45)

    def front(o, u, v):
        o.location = (u, -s / 2 + r * 0.1, v)
        o.scale = (1, 0.45, 1)

    def right(o, u, v):
        o.location = (s / 2 - r * 0.1, -u, v)
        o.scale = (0.45, 1, 1)

    side = {1: (2, 3), 2: (1, 3), 3: (1, 2), 4: (1, 5), 5: (3, 1), 6: (2, 4)}[value]
    face(value, front)
    face(side[0], top)
    face(side[1], right)
    return group('die', parts, loc=loc, rot=rot)


# ---------- ikon petak ----------
def icon_star(loc=(0, 0, 0), scale=1.0, color='yellow'):
    s = prism(star_pts(0.62, 0.27), 0.2, color, loc=(0, 0, 0.62))
    bevel(s, 0.03, 2)
    shine = ball((-0.14, -0.11, 0.78), 0.06, 'paper', lines=False)
    return group('star', [s, shine], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def icon_crown(loc=(0, 0, 0), scale=1.0):
    base = cyl((0, 0, 0.18), 0.42, 0.36, 'yellow', verts=48, rough=0.25)
    parts = [base, torus((0, 0, 0.02), 0.42, 0.05, 'yellow', rough=0.25)]
    for i in range(6):
        a = i / 6 * math.tau
        parts.append(cone_((0.36 * math.cos(a), 0.36 * math.sin(a), 0.5), 0.1, 0.32, 'yellow', rough=0.25))
        parts.append(ball((0.36 * math.cos(a), 0.36 * math.sin(a), 0.68), 0.05, 'rose' if i % 2 else 'electric', lines=False))
    parts.append(ball((0, -0.42, 0.18), 0.08, 'rose', scale=(1, 0.5, 1)))
    return group('crown', parts, loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def icon_boost(loc=(0, 0, 0), scale=1.0):
    body = cyl((0, 0, 0.5), 0.2, 0.62, 'paper', verts=32)
    nose = cone_((0, 0, 0.98), 0.2, 0.34, 'rose')
    win = cyl((0, -0.19, 0.6), 0.09, 0.03, '#2f7bff', rot=(math.radians(90), 0, 0), verts=24)
    ring = torus((0, -0.19, 0.6), 0.09, 0.02, 'ink', rot=(math.radians(90), 0, 0))
    fins = [prism([(0.18, 0.18), (0.42, 0.0), (0.18, 0.44)], 0.05, 'rose', rot=(0, 0, a)) for a in (0, math.tau / 3, 2 * math.tau / 3)]
    flame = cone_((0, 0, 0.06), 0.15, 0.3, 'yellow', rot=(math.radians(180), 0, 0))
    flame2 = cone_((0, 0, -0.02), 0.08, 0.24, '#ff8a1c', rot=(math.radians(180), 0, 0))
    g = group('rocket', [body, nose, win, ring, flame, flame2, *fins], rot=(0, math.radians(-28), FACE_YAW))
    return group('boost', [g], loc=loc, scale=scale)


def icon_portal(loc=(0, 0, 0), scale=1.0):
    outer = torus((0, 0, 0.62), 0.5, 0.11, VIOLET, rot=(math.radians(90), 0, 0))
    inner = torus((0, 0.02, 0.62), 0.32, 0.06, 'electric', rot=(math.radians(90), 0, 0))
    hole = cyl((0, 0.04, 0.62), 0.27, 0.02, 'ink', rot=(math.radians(90), 0, 0), verts=40, lines=False)
    sparks = [ball((0.62 * math.cos(a), -0.05, 0.62 + 0.62 * math.sin(a)), 0.05 + 0.02 * (k % 2), 'rose' if k % 2 else 'yellow', lines=False) for k, a in enumerate((0.4, 1.4, 2.6, 3.7, 4.9))]
    # spiral di dalam lubang
    curve = bpy.data.curves.new('swirl', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.022
    sp = curve.splines.new('POLY')
    n = 40
    sp.points.add(n - 1)
    for k, p in enumerate(sp.points):
        t = k / (n - 1)
        a = t * math.tau * 2.2
        r = 0.04 + t * 0.2
        p.co = (r * math.cos(a), -0.02, 0.62 + r * math.sin(a), 1)
    sw = bpy.data.objects.new('swirl', curve)
    scene.collection.objects.link(sw)
    add(sw, mat('paper', 0.3))
    no_lines(sw)
    return group('portal', [outer, inner, hole, sw, *sparks], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def icon_bomb(loc=(0, 0, 0), scale=1.0):
    body = ball((0, 0, 0.45), 0.42, 'ink', rough=0.25)
    shine = ball((-0.16, -0.3, 0.62), 0.08, 'paper', scale=(1, 0.5, 1.3), lines=False)
    cap = cyl((0.16, 0, 0.86), 0.12, 0.14, '#9aa3b5', rot=(0, math.radians(22), 0), verts=24)
    curve = bpy.data.curves.new('fuse', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.03
    sp = curve.splines.new('BEZIER')
    sp.bezier_points.add(2)
    for bp, co in zip(sp.bezier_points, [(0.2, 0, 0.92), (0.32, 0, 1.12), (0.5, 0, 1.08)]):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    fuse = bpy.data.objects.new('fuse', curve)
    scene.collection.objects.link(fuse)
    add(fuse, hexmat('#9a5b34', 0.6))
    spark = prism(star_pts(0.16, 0.07, 6), 0.04, 'yellow', loc=(0.54, 0, 1.08))
    spark2 = prism(star_pts(0.09, 0.04, 6), 0.05, '#ff8a1c', loc=(0.54, -0.02, 1.08))
    return group('bomb', [body, shine, cap, fuse, spark, spark2], loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


def icon_slip(loc=(0, 0, 0), scale=1.0):
    """Kulit pisang tergeletak: pangkal + kelopak melengkung keluar."""
    parts = [ball((0, 0, 0.2), 0.16, BANANA, scale=(1, 1, 1.5)), cyl((0, 0, 0.47), 0.05, 0.14, '#9a5b34', verts=12)]
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        petal = ball((0, 0, 0), 0.13, BANANA, scale=(1, 0.55, 3.0))
        petal.location = (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.1)
        petal.rotation_euler = (0, math.radians(76), a)
        parts.append(petal)
    return group('peel', parts, loc=loc, rot=(0, 0, FACE_YAW), scale=scale)


# ---------- papan mini untuk ilustrasi ----------
def mini_board(loc=(0, 0, 0), size=3.0):
    cell = size / 15
    parts = [box((0, 0, 0), (size, size, 0.14), 'paper', bev=0.03)]
    yards = [(-1, 1, 0), (1, 1, 1), (1, -1, 2), (-1, -1, 3)]
    for sx, sy, i in yards:
        c = PAWN_HEX[i]
        parts.append(box((sx * cell * 4.5, sy * cell * 4.5, 0.075), (cell * 5.6, cell * 5.6, 0.02), c, bev=0.01, lines=False))
        parts.append(box((sx * cell * 4.5, sy * cell * 4.5, 0.09), (cell * 3.6, cell * 3.6, 0.02), 'paper', bev=0.01, lines=False))
    # jalur rumah (kolom tengah tiap lengan) berwarna
    dirs = [(-1, 0), (0, 1), (1, 0), (0, -1)]
    for i, (dx, dy) in enumerate(dirs):
        for k in range(5):
            r = cell * (2 + k)
            parts.append(box((dx * r, dy * r, 0.08), (cell * 0.86, cell * 0.86, 0.02), PAWN_HEX[i], bev=0, lines=False))
    # segitiga tengah
    for i, (dx, dy) in enumerate(dirs):
        tri = prism([(-cell * 1.5, 0), (cell * 1.5, 0), (0, cell * 1.5)], 0.02, PAWN_HEX[i])
        tri.location = (dx * cell * 1.5, dy * cell * 1.5, 0.08)
        tri.rotation_euler = (math.radians(90), 0, math.atan2(dy, dx) + math.pi / 2)
        no_lines(tri)
        parts.append(tri)
    # garis grid tipis di lengan
    for i, (dx, dy) in enumerate(dirs):
        for k in range(6):
            for v in (-1, 1):
                r = cell * (2 + k)
                x = dx * r + (-dy) * v * cell
                y = dy * r + dx * v * cell
                parts.append(box((x, y, 0.08), (cell * 0.86, cell * 0.86, 0.015), 'petal', bev=0, lines=False))
    return group('board', parts, loc=loc)


# ---------- ilustrasi ----------
def tile_ludo():
    mini_board((0, 0.15, 0), 3.1)
    ludo_pawn(0, loc=(-0.95, 0.95, 0.08), scale=0.42)
    ludo_pawn(1, loc=(0.25, 0.9, 0.08), scale=0.42)
    ludo_pawn(2, loc=(0.95, -0.5, 0.08), scale=0.42)
    ludo_pawn(3, loc=(-0.45, -0.75, 0.08), scale=0.42)
    die(6, loc=(0.6, -1.25, 0.32), size=0.45, rot=(0.25, 0.15, FACE_YAW + 0.3))
    die(4, loc=(1.15, -1.0, 0.3), size=0.4, rot=(-0.2, 0.1, FACE_YAW - 0.4), body='electric', pip_color='ink')
    icon_star((-1.55, -0.55, 0.0), 0.45)
    mochi((-0.9, 1.75, 0.6), tilt=-8)
    pip((0.55, 1.85, 0.85), tilt=10)


def ludo_win():
    pedestal((0.1, 0, -0.18), w=2.0, d=1.1)
    ludo_pawn(0, loc=(-0.15, 0, 0), scale=1.15)
    icon_crown((-0.1, 0, 1.92), 0.55)
    ludo_pawn(1, loc=(0.85, 0.25, 0), scale=0.6)
    ludo_pawn(2, loc=(-1.0, 0.25, 0), scale=0.6)
    icon_star((1.1, -0.3, 1.15), 0.4)
    icon_star((-1.25, -0.25, 0.95), 0.32, color='rose')


def ludo_lose():
    pedestal((0, 0, -0.18), w=2.1, d=1.2)
    # bidak terjungkal kepleset kulit pisang
    p = ludo_pawn(3, loc=(0.1, 0.0, 0.42), scale=0.95, happy=False)
    p.rotation_euler = (math.radians(-12), math.radians(78), FACE_YAW)
    icon_slip((-0.8, -0.3, 0.0), 0.75)
    tear((0.5, -0.5, 0.75))
    die(1, loc=(1.05, -0.2, 0.25), size=0.42, rot=(0.1, 0.05, FACE_YAW - 0.3))


# ---------- daftar aset ----------
SPRITE = dict(ortho=1.6, res=(384, 384), target=(0, 0, 0.45), line=3.0)
ASSETS = {}
for i in range(8):
    ASSETS[f'pawn-{i}'] = (lambda i=i: ludo_pawn(i), dict(SPRITE, ortho=1.9, target=(0, 0, 0.82)))
for v in range(1, 7):
    ASSETS[f'die-{v}'] = (lambda v=v: die(v, loc=(0, 0, 0.45), size=0.8, rot=(0, 0, FACE_YAW + math.radians(8))), dict(SPRITE, ortho=1.35, target=(0, 0, 0.45)))
ASSETS['icon-star'] = (lambda: icon_star(), dict(SPRITE, ortho=1.5, target=(0, 0, 0.62)))
ASSETS['icon-crown'] = (lambda: icon_crown(), dict(SPRITE, ortho=1.5, target=(0, 0, 0.35)))
ASSETS['icon-boost'] = (lambda: icon_boost(), dict(SPRITE, ortho=1.6, target=(0, 0, 0.5)))
ASSETS['icon-portal'] = (lambda: icon_portal(), dict(SPRITE, ortho=1.7, target=(0, 0, 0.62)))
ASSETS['icon-bomb'] = (lambda: icon_bomb(), dict(SPRITE, ortho=1.7, target=(0.12, 0, 0.62)))
ASSETS['icon-slip'] = (lambda: icon_slip(), dict(SPRITE, ortho=1.7, target=(0, 0, 0.15)))

ILLU = dict(ortho=4.0, res=(1200, 1000), target=(0, 0, 0.6), line=4.0)
ASSETS['tile-ludo'] = (tile_ludo, dict(ILLU, ortho=4.6, target=(0.1, 0.2, 0.5)))
ASSETS['ludo-win'] = (ludo_win, dict(ILLU, ortho=3.9, res=(1200, 1100), target=(0, 0, 0.95)))
ASSETS['ludo-lose'] = (ludo_lose, dict(ILLU, ortho=3.3, res=(1200, 1100), target=(0, 0, 0.45)))

OUT_DIR.mkdir(parents=True, exist_ok=True)
for name, (build, cam) in ASSETS.items():
    if ONLY and name not in ONLY:
        continue
    clear()
    build()
    studio(cam['ortho'], cam['res'], cam.get('cam_loc', (3.2, -6.2, 3.4)), cam['target'], cam['line'])
    render(str((OUT_DIR / f'{name}.png').resolve()))
