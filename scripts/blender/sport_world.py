# Arena Sport Kacau. Tiap arena = satu GLB statis + prop bernama yang digerakkan di three.js.
# Lintasan membentang ke +Y dari garis foul y=0, lebar 1.05 m, sama dengan sim bowling.
# Jalankan: blender --background --python scripts/blender/sport_world.py -- brand/illustrations/sport src/assets/sport/models [bowling props]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

SUB['n'] = 0
LANE_HALF = 0.525
PITCH = 2.5  # jarak antar lintasan
LENGTH = 19.3
ROSE, LEAF, GOLD, SKY = '#ff37a6', '#5cf64a', '#ffcc1f', '#42c6ff'


def tagged(name, color, rough=0.5, metal=0.0):
    """material yang teksturnya diisi di three.js, dikenali dari namanya"""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = pbr(color, rough, metal).copy()
    m.name = name
    return m


def plane(x0, x1, y0, y1, z, m):
    """bidang mendatar dengan UV 0..1, dipakai lintasan & lantai"""
    me = bpy.data.meshes.new('bidang')
    me.from_pydata([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for i, co in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[i].uv = co
    o = bpy.data.objects.new('bidang', me)
    scene.collection.objects.link(o)
    me.materials.append(m)
    return o


def squiggle(x, y, z, axis_x, length, color, emit=6.0):
    """garis zigzag neon Memphis di dinding"""
    pts = []
    n = 8
    for i in range(n + 1):
        t = i / n * length
        w = 0.28 * (1 if i % 2 else -1)
        pts.append((x + (t if axis_x else 0), y + (0 if axis_x else t), z + w))
    return tube(pts, 0.05, pbr(color, 0.4, emit=emit), res=1, steps=4)


def neon_ring(loc, r, color, rot=(math.radians(90), 0, 0)):
    return torus(loc, r, 0.05, pbr(color, 0.4, emit=6.0), rot=rot, seg=36)


def lane_block(cx, main=False):
    """lintasan + parit + pembatas + rak pin di ujung; satu paket per jalur"""
    plane(cx - LANE_HALF, cx + LANE_HALF, 0, LENGTH, 0, tagged('lane', '#d8a35e', 0.22))
    gutter = pbr('#1b1b24', 0.35, 0.3)
    for s in (-1, 1):
        cyl((cx + s * (LANE_HALF + 0.12), LENGTH / 2, 0.0), 0.12, LENGTH, gutter, rot=(math.radians(90), 0, 0), verts=12, b=0)
        cube((cx + s * (LANE_HALF + 0.3), LENGTH / 2, 0.04), (0.14, LENGTH, 0.12), pbr('#2c2342', 0.3), b=0.02)
        # bantalan samping berlampu
        cube((cx + s * (LANE_HALF + 0.3), LENGTH / 2, 0.11), (0.05, LENGTH, 0.03), pbr(ROSE if s < 0 else LEAF, 0.4, emit=2.5), b=0)
    # penutup antar jalur: alas gelap mengilap supaya tidak ada lantai kosong
    cube((cx + PITCH / 2, LENGTH / 2, 0.015), (PITCH - (LANE_HALF + 0.38) * 2, LENGTH, 0.05), tagged('logam_gelap', '#3a3448', 0.3), b=0)
    cube((cx + PITCH / 2, 9, 0.045), (0.05, 18, 0.01), pbr(SKY, 0.4, emit=1.5), b=0)
    # pit di belakang pin
    cube((cx, LENGTH + 0.9, -0.2), (LANE_HALF * 2 + 0.6, 1.9, 0.2), pbr('#0c0a12', 0.8), b=0)
    # pelipit garis foul
    cube((cx, 0, 0.002), (LANE_HALF * 2, 0.04, 0.004), pbr('#121212', 0.5), b=0)


def masking_units():
    """panel di atas pin: tiap jalur satu warna, bentuk Memphis menyala"""
    colors = ['#3a2a78', '#7a1f6b', '#14606a', '#7a1f6b', '#3a2a78']
    backing = pbr('#0d0b14', 0.9)
    for i, c in zip(range(-2, 3), colors):
        cx = i * PITCH
        cube((cx, 20.6, 1.4), (PITCH, 0.3, 2.8), backing, b=0)
        cube((cx, 19.4, 1.95), (PITCH - 0.04, 0.5, 1.4), pbr(c, 0.45), b=0.03)
        neon_ring((cx - 0.75, 19.13, 1.95), 0.26, GOLD)
        cyl((cx + 0.7, 19.13, 1.95), 0.28, 0.08, pbr(LEAF, 0.4, emit=3.0), rot=(math.radians(-90), 0, 0), verts=3, b=0)
        squiggle(cx - 0.28, 19.12, 2.1, True, 0.7, ROSE)
        # lampu sorot pin
        cube((cx, 19.15, 1.22), (1.9, 0.1, 0.05), pbr('#fff2d6', 0.3, emit=9.0), b=0)
    # dinding gelap antara panel & langit-langit
    cube((0, 19.6, 3.9), (PITCH * 5 + 8, 0.4, 1.8), pbr('#1a1430', 0.8), b=0)


def scoreboards():
    for i in range(-2, 3):
        cx = i * PITCH
        cube((cx, 8, 3.6), (2.0, 0.12, 0.72), pbr('#0f0d18', 0.3), b=0.03)
        cube((cx, 7.93, 3.6), (1.86, 0.02, 0.58), pbr(SKY, 0.5, emit=1.2), b=0)
        for s in (-1, 1):
            cyl((cx + s * 0.8, 8, 4.2), 0.02, 0.5, pbr('#333340', 0.4, 0.8), verts=8, b=0)


def room():
    wall = pbr('#231a3d', 0.75)
    w = PITCH * 5 + 8
    # lantai belakang: tekstur karpet diisi di three.js
    plane(-w / 2, w / 2, -9, 0, 0, tagged('carpet', '#2c2350', 0.95))
    plane(-w / 2, w / 2, 0, 21, -0.02, pbr('#18131f', 0.5))
    # dinding & langit-langit
    for s in (-1, 1):
        cube((s * w / 2, 6, 2.4), (0.3, 30, 4.8), tagged('beton', '#a8a4a0', 0.9), b=0)
    cube((0, -9.1, 2.4), (w, 0.3, 4.8), tagged('beton', '#a8a4a0', 0.9), b=0)
    cube((0, 6, 4.75), (w, 30, 0.1), pbr('#15112a', 0.8), b=0)
    # plafon: balok & lampu strip
    for i in range(-5, 6):
        cube((i * 2.6, 6, 4.6), (0.2, 28, 0.2), pbr('#2f2552', 0.6), b=0)
    for y in (-3, 3, 9, 15):
        cube((0, y, 4.45), (w - 2, 0.16, 0.06), pbr('#fff2d6', 0.3, emit=5.0), b=0)
    # pajangan Memphis di dinding samping
    for s in (-1, 1):
        x = s * (w / 2 - 0.17)
        rot = (0, math.radians(90), 0)
        for k, y in enumerate((-6, -1.5, 3, 7.5, 12, 16.5)):
            c = (ROSE, LEAF, GOLD, SKY)[(k + (s > 0)) % 4]
            z = 2.1 + (0.5 if k % 2 else -0.3)
            if k % 3 == 0:
                torus((x, y, z), 0.7, 0.09, pbr(c, 0.4, emit=5.0), rot=rot, seg=40)
            elif k % 3 == 1:
                cyl((x, y, z), 0.9, 0.08, pbr(c, 0.45, emit=1.6), rot=rot, verts=3, b=0)
            else:
                squiggle(x, y - 1, z, False, 2.2, c)
        cube((x, 6, 0.55), (0.06, 30, 1.1), pbr('#3a2a78', 0.6), b=0)
        cube((x, 6, 1.14), (0.08, 30, 0.08), pbr(LEAF if s < 0 else ROSE, 0.4, emit=3.5), b=0)
    # tulisan neon di atas pin
    text3d('BOWLING KACAU', (0, 19.36, 3.55), 0.85, pbr(ROSE, 0.3, emit=7.0), extrude=0.05)


def seating():
    """sofa, meja, rak bola, dan pengembali bola di area pemain"""
    sofa = tagged('sofa_rose', '#c8307e', 0.55)
    sofa2 = tagged('sofa_leaf', '#2f8f3f', 0.55)
    table = tagged('papan', '#b98a52', 0.6)
    logam = tagged('logam', '#7a7f8c', 0.5)
    for i in range(-2, 3):
        cx = i * PITCH
        if i == 0:
            continue
        m = sofa if i % 2 else sofa2
        cube((cx, -5.2, 0.28), (2.1, 0.75, 0.42), m, b=0.08)
        cube((cx, -5.6, 0.62), (2.1, 0.2, 0.7), m, b=0.08)
        # meja rendah, gelas, dan lampu gantung tiap jalur
        cube((cx, -4.2, 0.36), (1.3, 0.6, 0.05), table, b=0.015)
        for k in (-0.3, 0.05, 0.4):
            cyl((cx + k, -4.2, 0.46), 0.04, 0.14, pbr(GOLD, 0.2), verts=8, b=0)
        cyl((cx, -4.2, 0.18), 0.05, 0.34, logam, verts=8, b=0)
        cyl((cx, -4.6, 3.8), 0.012, 1.8, logam, verts=4, b=0)
        cyl((cx, -4.6, 2.85), 0.22, 0.26, tagged('logam', '#7a7f8c', 0.5), verts=14, r2=0.06, b=0)
        cyl((cx, -4.6, 2.72), 0.14, 0.02, pbr('#fff2d6', 0.3, emit=8.0), verts=12, b=0)
    for cx in (-1.25, 1.25):
        # pengembali bola
        cube((cx, -1.4, 0.3), (0.55, 1.5, 0.3), pbr('#2c2342', 0.3, 0.3), b=0.1)
        cube((cx, -1.4, 0.48), (0.3, 1.3, 0.06), pbr('#121218', 0.4), b=0.02)
        sphere((cx, -2.4, 0.52), 0.34, pbr(GOLD, 0.25, 0.3), (1, 1, 0.9), seg=20, sub=False)
    for k, (bx, c) in enumerate(((-0.36, ROSE), (0.0, LEAF), (0.36, SKY))):
        sphere((1.25 + bx, -1.05, 0.62), 0.11, pbr(c, 0.15, coat=0.8), seg=18, sub=False)
        sphere((-1.25 + bx, -1.05, 0.62), 0.11, pbr(c, 0.15, coat=0.8), seg=18, sub=False)
    # rak bola & tanaman di dinding belakang
    for side in (-1, 1):
        rx = side * 7.2
        cube((rx, -8.4, 0.5), (2.6, 0.5, 0.05), pbr('#3a2a78', 0.4), b=0)
        cube((rx, -8.4, 1.05), (2.6, 0.5, 0.05), pbr('#3a2a78', 0.4), b=0)
        for lv, z in enumerate((0.64, 1.19)):
            for k in range(5):
                c = (ROSE, GOLD, SKY, LEAF, '#ff6b35')[(k + lv) % 5]
                sphere((rx - 1 + k * 0.5, -8.4, z), 0.11, pbr(c, 0.15, coat=0.8), seg=14, sub=False)
        cyl((side * 9.6, -7.8, 0.3), 0.3, 0.6, table, verts=16, r2=0.36, b=0)
        prop('semak-2', side * 9.6, -7.8, 0.9, side * 1.2, z=0.55)
        prop('semak', side * 9.6, 0.5, 0.8, side, z=0)


def racked_neighbors():
    """pin diam di jalur tetangga, supaya ruangan terasa ramai"""
    white = pbr('#fbf6ee', 0.25)
    rows = [(0, 0), (-0.5, 1), (0.5, 1), (-1, 2), (0, 2), (1, 2), (-1.5, 3), (-0.5, 3), (0.5, 3), (1.5, 3)]
    for i in (-2, -1, 1, 2):
        cx = i * PITCH
        for c, r in rows:
            cyl((cx + c * 0.305, 18.29 + r * 0.264, 0.2), 0.06, 0.4, white, verts=8, b=0)


def merge_by_material():
    """gabung semua objek bermaterial sama: satu material = satu panggilan gambar di HP"""
    to_meshes()
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    groups = {}
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.data.materials:
            groups.setdefault(o.data.materials[0].name, []).append(o)
    for name, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        bpy.context.object.name = name


def build_bowling():
    reset()
    for i in range(-2, 3):
        lane_block(i * PITCH, i == 0)
    masking_units()
    scoreboards()
    room()
    seating()
    racked_neighbors()
    finish('bowling', skip=('lane',), sky=None, sky_power=0.04, sun=0, lamps=[((0, -2, 4.3), 14, 900, (1, 0.9, 0.8)), ((0, 10, 4.3), 12, 700, (0.95, 0.85, 1)), ((0, 18, 1.8), 12, 500, (1, 0.96, 0.85))])


def ring():
    """ring 6 x 6 m: kanvas di z=0 supaya petinju berdiri di y=0"""
    R = 3.0
    plane(-R - 0.45, R + 0.45, -R - 0.45, R + 0.45, 0, tagged('canvas', '#2f4c8c', 0.8))
    cube((0, 0, -0.57), (R * 2 + 0.9, R * 2 + 0.9, 1.1), tagged('kulit', '#7a3030', 0.6), b=0)
    # rok ring berlampu
    for s in (-1, 1):
        cube((0, s * (R + 0.46), -0.55), (R * 2 + 0.9, 0.04, 0.9), pbr(ROSE, 0.5), b=0)
        cube((s * (R + 0.46), 0, -0.55), (0.04, R * 2 + 0.9, 0.9), pbr(ROSE, 0.5), b=0)
        cube((0, s * (R + 0.48), -0.1), (R * 2 + 0.9, 0.03, 0.05), pbr(LEAF, 0.4, emit=3.5), b=0)
        cube((s * (R + 0.48), 0, -0.1), (0.03, R * 2 + 0.9, 0.05), pbr(LEAF, 0.4, emit=3.5), b=0)
    corners = [(-R, -R, ROSE), (R, -R, SKY), (R, R, ROSE), (-R, R, SKY)]
    for x, y, c in corners:
        cyl((x, y, 0.75), 0.11, 1.5, pbr('#d7d7e2', 0.25, 0.8), verts=14, b=0)
        cyl((x, y, 0.72), 0.17, 1.2, tagged('kulit_' + c[1:], c, 0.45), verts=14, b=0.03)
    # tali tiga tingkat
    colors = ['#ff37a6', '#fff4fa', '#5cf64a']
    for i, z in enumerate((0.45, 0.85, 1.25)):
        m = pbr(colors[i], 0.35)
        for k in range(4):
            a = corners[k]
            b = corners[(k + 1) % 4]
            dx, dy = b[0] - a[0], b[1] - a[1]
            rot = (math.radians(90), 0, 0) if dx == 0 else (0, math.radians(90), 0)
            cyl(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z), 0.024, R * 2, m, rot=rot, verts=8, b=0)


def tiers(d0=5.6, n=5, base=-0.9, cy=0.0, sides=(0, 1, 2, 3)):
    """trap tribun; orangnya digambar di game (lihat squareSeats di render/arena.ts)"""
    step = tagged('beton', '#a8a4a0', 0.9)
    seat = tagged('kursi0', '#d04a3a', 0.45)
    for t in range(n):
        d = d0 + t * 1.05
        z = base + t * 0.62
        L = d * 2 + 1.4
        if 0 in sides:
            cube((0, cy + d + 0.35, z - 0.42), (L, 1.05, 0.5), step, b=0)
        if 1 in sides:
            cube((0, cy - d - 0.35, z - 0.42), (L, 1.05, 0.5), step, b=0)
        if 2 in sides:
            cube((d + 0.35, cy, z - 0.42), (1.05, L, 0.5), step, b=0)
        if 3 in sides:
            cube((-d - 0.35, cy, z - 0.42), (1.05, L, 0.5), step, b=0)
    return seat


def arena():
    w = 26
    plane(-w / 2, w / 2, -w / 2, w / 2, -1.1, tagged('lantai_gelap', '#2a2430', 0.5))
    for s in (-1, 1):
        cube((s * w / 2, 0, 3), (0.3, w, 8.4), tagged('beton', '#a8a4a0', 0.9), b=0)
        cube((0, s * w / 2, 3), (w, 0.3, 8.4), tagged('beton', '#a8a4a0', 0.9), b=0)
    cube((0, 0, 7.2), (w, w, 0.2), pbr('#0c0916', 0.8), b=0)
    # rangka lampu di atas ring
    truss = tagged('logam', '#7a7f8c', 0.5)
    for s in (-1, 1):
        cube((0, s * 3.4, 5.4), (8, 0.12, 0.12), truss, b=0)
        cube((s * 3.4, 0, 5.4), (0.12, 8, 0.12), truss, b=0)
        cube((0, s * 3.4, 5.9), (8, 0.08, 0.08), truss, b=0)
        cube((s * 3.4, 0, 5.9), (0.08, 8, 0.08), truss, b=0)
        for k in range(-4, 5):
            cyl((k * 0.9, s * 3.4, 5.65), 0.02, 0.5, truss, rot=(0, math.radians(30 * (1 if k % 2 else -1)), 0), verts=5, b=0)
    for x in (-3, -1, 1, 3):
        for y in (-3.4, 3.4):
            cyl((x, y, 5.22), 0.12, 0.26, pbr('#fff2d6', 0.3, emit=8.0), verts=10, b=0)
    for y in (-3, -1, 1, 3):
        cyl((6.5, y, 7.1), 0.03, 0.2, truss, verts=5, b=0)
        cyl((-6.5, y, 7.1), 0.03, 0.2, truss, verts=5, b=0)
    # layar gantung tengah
    cube((0, 0, 5.3), (2.6, 2.6, 1.2), pbr('#0f0d18', 0.3), b=0.04)
    for s in (-1, 1):
        face_uv(cube((0, s * 1.32, 5.3), (2.3, 0.02, 0.95), tagged('papan_skor', '#0c1a2a', 0.4), b=0))
        face_uv(cube((s * 1.32, 0, 5.3), (0.02, 2.3, 0.95), tagged('papan_skor', '#0c1a2a', 0.4), b=0))
    for s in (-1, 1):
        text3d('RING KACAU', (0, s * 12.8, 4.9), 1.5, pbr(ROSE, 0.3, emit=7.0), extrude=0.05, rot=(math.radians(90), 0, math.radians(180) if s < 0 else 0))
        neon_ring((-8, s * 12.82, 3.6), 0.8, GOLD)
        neon_ring((8, s * 12.82, 3.6), 0.8, LEAF)
        squiggle(s * 12.82, -8, 3.6, False, 5, ROSE)
        squiggle(s * 12.82, 3, 3.6, False, 5, LEAF)
    # meja juri, pers, bangku pelatih
    for s in (-1, 1):
        for k in (-2, 0, 2):
            face_uv(cube((s * 4.15, k * 1.3, -0.72), (0.08, 1.2, 0.72), tagged(f'iklan{(k // 2) % 3}', '#ffffff', 0.5), b=0))
    table = tagged('papan', '#b98a52', 0.6)
    cube((0, -4.5, -0.42), (5, 0.8, 0.06), table, b=0.02)
    for k in (-2, -0.7, 0.7, 2):
        cube((k, -4.5, -0.32), (0.34, 0.24, 0.02), pbr('#14141c', 0.3, 0.4), rot=(math.radians(20), 0, 0), b=0)
    for k in (-2.3, 2.3):
        cyl((k, -4.5, -0.78), 0.05, 0.7, truss, verts=8, b=0)
    # bangku & ember di sudut ring
    for x, y in ((-2.75, -2.75), (2.75, 2.75)):
        for dx, dy in ((-0.13, 0), (0.13, 0), (0, 0.13)):
            cyl((x + dx, y + dy, 0.17), 0.015, 0.34, truss, verts=5, b=0)
        cyl((x, y, 0.36), 0.16, 0.04, tagged('kulit', '#7a3030', 0.6), verts=14, b=0.01)
        cyl((x + 0.3, y - 0.3 if x > 0 else y + 0.3, 0.12), 0.11, 0.24, truss, verts=12, r2=0.13, b=0)


def build_boxing():
    reset()
    ring()
    tiers()
    arena()
    finish('boxing', skip=('lantai_gelap',), sky=None, sky_power=0.02, sun=0, lamps=[((0, 0, 5.1), 6, 1400, (1, 0.93, 0.82)), ((0, 0, 7), 20, 300, (0.7, 0.6, 1))])


def tree(x, y, s=1.0, seed=0):
    import random
    rnd = random.Random(seed)
    cyl((x, y, 0.9 * s), 0.17 * s, 1.8 * s, pbr('#6b4526', 0.8), verts=8, b=0)
    leaf = pbr(('#3f9a33', '#2c8a3a', '#5aae3a')[seed % 3], 0.85)
    for k in range(4):
        sphere((x + (rnd.random() - 0.5) * 1.1 * s, y + (rnd.random() - 0.5) * 1.1 * s, (2.1 + k * 0.42) * s), (1.05 - k * 0.13) * s, leaf, (1, 1, 0.8), seg=10, sub=False)


def target(x, y, main):
    """sasaran panahan diameter 1.22 m, pusat di z=1.3, menghadap -Y"""
    rot = (math.radians(90), 0, 0)
    z = 1.3
    cyl((x, y + 0.08, z), 0.78, 0.16, tagged('kulit_jerami', '#c9a25a', 0.95), rot=rot, verts=32, b=0.03)
    for i, (r, c) in enumerate(((0.61, '#fff4fa'), (0.488, '#121212'), (0.366, '#3a6fe0'), (0.244, '#e0223c'), (0.122, '#ffcc1f'))):
        cyl((x, y - 0.005 - i * 0.004, z), r, 0.004, pbr(c, 0.5), rot=rot, verts=40, b=0)
    # kaki penyangga
    wood = tagged('papan', '#b98a52', 0.6)
    for s in (-1, 1):
        cyl((x + s * 0.42, y + 0.1, 0.72), 0.045, 1.5, wood, rot=(0, math.radians(-s * 12), 0), verts=8, b=0)
    cyl((x, y + 0.55, 0.72), 0.045, 1.6, wood, rot=(math.radians(-22), 0, 0), verts=8, b=0)


def build_archery():
    reset()
    plane(-70, 70, -40, 100, 0, tagged('ground', '#5aae3a', 0.95))
    target(0, 18, True)
    for x in (-4.5, 4.5, -9, 9):
        target(x, 18, False)
    # jalur tembak, tali pembatas, dan bendera kecil
    white = pbr('#fff4fa', 0.6)
    cube((0, 0, 0.01), (22, 0.1, 0.01), white, b=0)
    for x in (-6.75, -2.25, 2.25, 6.75):
        cube((x, 10, 0.012), (0.05, 22, 0.008), white, b=0)
    colors = (ROSE, LEAF, GOLD, SKY)
    for i in range(30):
        x = -11.5 + i * 0.8
        p1 = (x, 21.2, 3.0 - 0.5 * math.sin(i / 29 * math.pi))
        c = colors[i % 4]
        cyl(p1, 0.13, 0.34, tagged(f'flag_{c[1:]}', c, 0.7), rot=(math.radians(180), 0, 0), verts=3, r2=0.0, b=0)
    for x in (-12, 12):
        cyl((x, 21.2, 1.6), 0.07, 3.2, pbr('#fff4fa', 0.5), verts=8, b=0)
    # hutan bertekstur, tenda, bangku penonton, dan bukit jauh
    import random
    rnd = random.Random(8)
    for i in range(22):
        prop('pohon' if i % 2 else 'pohon-2', -38 + i * 3.6 + rnd.random() * 2.5, 26 + rnd.random() * 12, 0.9 + rnd.random() * 0.5, rnd.random() * 6.28)
    for side in (-1, 1):
        for i in range(7):
            prop('pohon-3' if i % 2 else 'pohon', side * (19 + rnd.random() * 10), -6 + i * 5.5, 0.8 + rnd.random() * 0.5, rnd.random() * 6.28)
    for i in range(24):
        prop('semak' if i % 3 else 'semak-2', -22 + i * 1.9 + rnd.random(), 22.5 + rnd.random() * 2, 0.8 + rnd.random() * 0.6, rnd.random() * 6.28)
    for i in range(20):
        prop('bunga' if i % 2 else 'bunga-2', -12 + rnd.random() * 24, 19.5 + rnd.random() * 2, 0.8, rnd.random() * 6.28)
    for i in range(8):
        prop('batu' if i % 2 else 'batu-2', (-1) ** i * (13 + rnd.random() * 8), 8 + rnd.random() * 14, 0.28 + rnd.random() * 0.2, rnd.random() * 6.28)
    cloth = tagged('kulit_tenda', '#fff4fa', 0.8)
    for x, c in ((-15, ROSE), (15, SKY)):
        cube((x, 8, 1.1), (4, 3, 2.2), cloth, b=0.03)
        cyl((x, 8, 2.75), 3.0, 1.1, pbr(c, 0.6), verts=4, r2=0.0, b=0)
    # pagar kayu penonton di kedua sisi jalur tembak
    wood = tagged('papan', '#b98a52', 0.6)
    for side in (-1, 1):
        for k in range(3):
            y = 1.5 + k * 2.2
            cube((side * 11, y, 0.42), (1.3, 1.9, 0.08), wood, b=0.02)
            for dy in (-0.8, 0.8):
                cyl((side * 11, y + dy, 0.2), 0.05, 0.4, wood, verts=8, b=0)
        for k in range(14):
            cyl((side * 13, k * 2.2 - 2, 0.55), 0.05, 1.1, wood, verts=6, b=0)
        cube((side * 13, 12.3, 0.9), (0.05, 30, 0.08), wood, b=0)
        cube((side * 13, 12.3, 0.5), (0.05, 30, 0.08), wood, b=0)
    for x, y, r in ((-46, 70, 26), (-8, 82, 32), (36, 76, 28), (70, 60, 24), (-74, 50, 22)):
        sphere((x, y, -2), r, tagged('hill', '#4f8a3f', 0.95), (1.3, 1, 0.45), seg=20, sub=False)
    finish('archery', sky='siang', sky_power=1.1, sun=4.5, sun_dir=(-8, -6, 16))


def build_pitch():
    reset()
    plane(-30, 30, -18, 34, 0, tagged('ground', '#3f9a33', 0.95))
    # gawang 5 x 2 m supaya pas dengan badan chibi; garis gawang di y=11
    W, H, Y = 2.5, 2.0, 11.0
    post = pbr('#fff4fa', 0.3)
    for s in (-1, 1):
        cyl((s * W, Y, H / 2), 0.06, H, post, verts=12, b=0)
        cyl((s * W, Y + 0.7, H / 2 - 0.2), 0.03, H, pbr('#c9c9d6', 0.4), rot=(math.radians(-16), 0, 0), verts=8, b=0)
    cyl((0, Y, H), 0.06, W * 2 + 0.12, post, rot=(0, math.radians(90), 0), verts=12, b=0)
    # jaring: bidang bertekstur transparan
    net = tagged('net', '#ffffff', 0.8)
    n = bpy.data.meshes.new('jaring')
    vs = [(-W, Y, H), (W, Y, H), (W, Y + 1.2, 0), (-W, Y + 1.2, 0), (-W, Y, 0), (W, Y, 0)]
    n.from_pydata(vs, [], [(0, 1, 2, 3), (0, 3, 4), (1, 5, 2)])
    uv = n.uv_layers.new(name='UVMap')
    rows = [(0, 1), (2, 1), (2, 0), (0, 0), (0, 1), (0, 0), (0.5, 0), (0, 1), (0, 0), (0.5, 0)]
    for i, co in enumerate(rows[:len(uv.data)]):
        uv.data[i].uv = co
    o = bpy.data.objects.new('jaring', n)
    scene.collection.objects.link(o)
    n.materials.append(net)
    # papan iklan, tribun beratap, lampu sorot, bangku cadangan
    for k in range(-3, 4):
        face_uv(cube((k * 6.6, 15, 0.5), (6.4, 0.2, 1.0), tagged(f'iklan{k % 3}', '#ffffff', 0.5), b=0))
    tiers(d0=16, n=5, base=0.8, cy=2, sides=(0, 2, 3))
    logam = tagged('logam', '#7a7f8c', 0.5)
    cube((0, 25.5, 7.6), (46, 12, 0.14), logam, rot=(math.radians(8), 0, 0), b=0.02)
    for x in (-20, -8, 8, 20):
        cyl((x, 21.2, 3.8), 0.14, 7.6, logam, verts=10, b=0)
    cube((0, 26, 3.6), (60, 0.4, 7.2), tagged('beton', '#a8a4a0', 0.9), b=0)
    text3d('STADION KACAU', (0, 25.7, 6.4), 1.5, pbr(ROSE, 0.3, emit=7.0), extrude=0.05)
    for x, y in ((-24, 22), (24, 22), (-24, -10), (24, -10)):
        cyl((x, y, 8), 0.24, 16, logam, verts=10, b=0)
        cube((x, y, 16.6), (4.4, 0.4, 2.2), pbr('#2a2a34', 0.4, 0.5), b=0.03)
        for dx in (-1.6, -0.5, 0.5, 1.6):
            for dz in (-0.55, 0.55):
                cyl((x + dx, y + (-0.22 if y > 0 else 0.22), 16.6 + dz), 0.3, 0.05, pbr('#fff2d6', 0.3, emit=8.0), rot=(math.radians(90), 0, 0), verts=10, b=0)
    for x in (-10, 10):
        cube((x, -2, 0.42), (5, 0.7, 0.06), tagged('kursi1', '#2f6fb0', 0.45), b=0.02)
        cube((x, -1.7, 1.1), (5.4, 0.06, 2.2), tagged('kulit_kaca', '#c8d8e8', 0.2), b=0.02)
    finish('pitch', sky='malam', sky_power=0.7, sun=0, lamps=[((-20, 14, 16), 8, 18000, (1, 0.96, 0.88)), ((20, 14, 16), 8, 18000, (1, 0.96, 0.88)), ((0, 2, 16), 20, 9000, (1, 0.96, 0.9))])


def court_lines(hw, hl, service, color='#d8d6cc', w=0.06, z=0.012):
    m = pbr(color, 0.6)
    for s in (-1, 1):
        cube((s * hw, 0, z), (w, hl * 2, 0.004), m, b=0)
        cube((0, s * hl, z), (hw * 2 + w, w, 0.004), m, b=0)
        cube((0, s * service, z), (hw * 2, w, 0.004), m, b=0)
    cube((0, 0, z), (w, service * 2, 0.004), m, b=0)


def net_at(hw, h, post):
    """jaring: bidang bertekstur (tagged net) + pita atas + dua tiang"""
    plane_net = bpy.data.meshes.new('jaring')
    plane_net.from_pydata([(-hw, 0, 0.12), (hw, 0, 0.12), (hw, 0, h), (-hw, 0, h)], [], [(0, 1, 2, 3)])
    uv = plane_net.uv_layers.new(name='UVMap')
    for i, co in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[i].uv = co
    o = bpy.data.objects.new('jaring', plane_net)
    scene.collection.objects.link(o)
    plane_net.materials.append(tagged('net', '#ffffff', 0.8))
    cube((0, 0, h), (hw * 2, 0.03, 0.05), pbr('#fff4fa', 0.5), b=0)
    for s in (-1, 1):
        cyl((s * (hw + 0.1), 0, h / 2), 0.04, h + 0.08, pbr(post, 0.4, 0.5), verts=10, b=0)


# meter per satu ulangan tekstur, sama untuk semua arena
REAL_SCALE = {'beton': 3.0, 'logam': 1.5, 'logam_gelap': 1.5, 'papan': 0.9, 'kulit': 1.0, 'sofa_rose': 0.8, 'sofa_leaf': 0.8}
KART_MODELS = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'kart' / 'models'
HDRI_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'sport' / 'tex'
_kit = {}


def kit(name):
    """impor prop bertekstur sekali (Kart: MegaKit), lalu salin supaya tekstur tidak berlipat"""
    if name not in _kit:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(KART_MODELS / f'{name}.glb'))
        new = [o for o in bpy.data.objects if o not in before]
        bpy.context.view_layer.update()
        meshes = [o for o in new if o.type == 'MESH']
        _kit[name] = [(o.data, o.matrix_world.copy()) for o in meshes]
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
    return _kit[name]


def prop(name, x, y, s=1.0, rz=0.0, z=0.0):
    from mathutils import Matrix
    place = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Scale(s, 4)
    for data, mw in kit(name):
        o = bpy.data.objects.new(name, data.copy())
        scene.collection.objects.link(o)
        o.matrix_world = place @ mw


def face_uv(o):
    """tiap sisi kubus memakai seluruh gambar, tulisan tegak dan terbaca dari luar"""
    me = o.data
    uv = me.uv_layers[0].data
    co = [v.co for v in me.vertices]
    lo = [min(c[i] for c in co) for i in range(3)]
    hi = [max(c[i] for c in co) for i in range(3)]
    span = [max(1e-5, h - l) for l, h in zip(lo, hi)]
    for p in me.polygons:
        a = max(range(3), key=lambda i: abs(p.normal[i]))
        s = 1 if p.normal[a] > 0 else -1
        for li in p.loop_indices:
            c = co[me.loops[li].vertex_index]
            k = [(c[i] - lo[i]) / span[i] for i in range(3)]
            if a == 0:
                uv[li].uv = (k[1] if s > 0 else 1 - k[1], k[2])
            elif a == 1:
                uv[li].uv = (1 - k[0] if s > 0 else k[0], k[2])
            else:
                uv[li].uv = (k[0], k[1])


def world_uv(o, meters):
    """proyeksi kotak: kepadatan tekstur sama di semua benda, satu ulangan = `meters` meter"""
    me = o.data
    uv = me.uv_layers[0].data
    for p in me.polygons:
        a = max(range(3), key=lambda i: abs(p.normal[i]))
        u, v = [i for i in range(3) if i != a]
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = (c[u] / meters, c[v] / meters)


def stand(side, HW, roof=True, L=13.0):
    """tribun beton lima trap dengan kursi, pagar, dinding belakang, dan atap"""
    beton = tagged('beton', '#a8a4a0', 0.9)
    logam = tagged('logam', '#7a7f8c', 0.5)
    base = HW + 3.0
    n = int(L / 0.76)
    for r in range(5):
        x = side * (base + r * 0.85 + 0.42)
        cube((x, 0, (r + 1) * 0.42 / 2), (0.85, L * 2, (r + 1) * 0.42), beton, b=0.015)
        # sandaran kursi plastik per baris
        seat = tagged(f'kursi{r % 2}', '#2f6fb0' if r % 2 else '#d04a3a', 0.45)
        for k in range(-n, n + 1):
            y = k * 0.76
            cube((x - side * 0.26, y, (r + 1) * 0.42 + 0.17), (0.05, 0.56, 0.34), seat, b=0)
            cube((x, y, (r + 1) * 0.42 + 0.03), (0.42, 0.56, 0.05), seat, b=0)
    # dinding belakang, atap miring, tiang
    wx = side * (base + 5 * 0.85 + 0.12)
    cube((wx, 0, 2.2), (0.24, L * 2, 4.4), beton, b=0.02)
    if roof:
        rot = (0, math.radians(side * 7), 0)
        cube((side * (base + 2.4), 0, 5.0), (5.6, L * 2 + 0.6, 0.1), logam, rot=rot, b=0.02)
        for k in (-1, 0, 1):
            y = k * (L - 1)
            cyl((wx, y, 2.6), 0.09, 5.2, logam, verts=10, b=0)
            cyl((side * (base + 0.3), y, 2.25), 0.07, 4.5, logam, verts=10, b=0)
    # pagar depan & papan iklan
    for k in range(-int(L / 1.1), int(L / 1.1) + 1):
        cyl((side * (base - 0.05), k * 1.1, 0.5), 0.022, 1.0, logam, verts=6, b=0)
    cube((side * (base - 0.05), 0, 1.0), (0.04, L * 2, 0.04), logam, b=0)
    for k in range(-int(L / 4), int(L / 4) + 1):
        face_uv(cube((side * (HW + 1.9), k * 3.9, 0.42), (0.1, 3.6, 0.84), tagged(f'iklan{k % 3}', '#ffffff', 0.5), b=0))


def court_furniture(HW, HL):
    wood = tagged('papan', '#b98a52', 0.6)
    logam = tagged('logam', '#7a7f8c', 0.5)
    # kursi wasit
    ux = HW + 1.05
    for dx, dy in ((-0.25, -0.25), (0.25, -0.25), (-0.25, 0.25), (0.25, 0.25)):
        cyl((ux + dx, dy, 0.8), 0.03, 1.6, logam, verts=8, b=0)
    cube((ux, 0, 1.62), (0.66, 0.62, 0.07), wood, b=0.02)
    cube((ux + 0.3, 0, 1.95), (0.06, 0.6, 0.62), wood, b=0.02)
    for z in (0.4, 0.8, 1.2):
        cube((ux - 0.33, 0, z), (0.05, 0.5, 0.05), logam, b=0)
    cube((ux, 0, 2.5), (0.8, 0.7, 0.04), tagged('payung', '#fff4fa', 0.6), b=0.01)
    cyl((ux, 0, 2.25), 0.02, 0.5, logam, verts=6, b=0)
    # bangku pemain, tas, handuk, botol, keranjang bola
    towel = pbr('#fff4fa', 0.9)
    bag = pbr('#d04a3a', 0.7)
    for y in (-3.4, 3.4):
        x = -(HW + 1.15)
        cube((x, y, 0.45), (0.5, 2.0, 0.06), wood, b=0.015)
        cube((x - 0.22, y, 0.72), (0.05, 2.0, 0.5), wood, b=0.015)
        for k in (-0.85, 0.85):
            cyl((x, y + k, 0.22), 0.03, 0.44, logam, verts=6, b=0)
        cube((x + 0.05, y - 0.5, 0.5), (0.4, 0.5, 0.05), towel, b=0.02)
        cube((x + 0.38, y + 0.55, 0.15), (0.3, 0.75, 0.3), bag, b=0.08)
        for k in range(3):
            cyl((x + 0.05, y + 0.2 + k * 0.12, 0.58), 0.032, 0.17, pbr(SKY, 0.25), verts=8, b=0)
    bx, by = HW + 1.1, 4.2
    for dx, dy in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)):
        cyl((bx + dx, by + dy, 0.4), 0.012, 0.8, logam, verts=5, b=0)
    for i in range(16):
        sphere((bx + (i % 4 - 1.5) * 0.11, by + ((i // 4) - 1.5) * 0.11, 0.84), 0.058, pbr('#e7f64a', 0.6), seg=8, sub=False)
    # papan skor di ujung jauh
    cube((0, HL + 3.0, 2.9), (4.8, 0.2, 1.7), pbr('#14141c', 0.4), b=0.03)
    face_uv(cube((0, HL + 2.88, 2.9), (4.4, 0.02, 1.34), tagged('papan_skor', '#0c1a2a', 0.4), b=0))
    for s in (-1, 1):
        cyl((s * 2.1, HL + 3.0, 1.1), 0.08, 2.2, logam, verts=8, b=0)


def finish(name, skip=(), **bake):
    """gabung per material, samakan kepadatan tekstur, panggang cahaya, ekspor"""
    merge_by_material()
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.data.materials:
            mname = o.data.materials[0].name
            if mname in REAL_SCALE:
                world_uv(o, REAL_SCALE[mname])
    bake_lightmap(name, ('ground', 'hill', 'fence', 'net', 'flag', 'Leaves', 'Bark', 'Flowers', 'Grass', *skip), **bake)
    export(name)


def bake_lightmap(name, skip, size=1536, samples=48, sky='senja', sky_power=1.2, sun=4.0, sun_dir=(-8, -6, 14), lamps=()):
    """panggang cahaya pantul + sudut gelap ke satu atlas di UV kedua; prop bertekstur tetap memberi bayangan"""
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.data.materials and not any(s in o.data.materials[0].name for s in skip)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.data.uv_layers.new(name='lm')
        o.data.uv_layers.active = o.data.uv_layers['lm']
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')

    world = bpy.data.worlds.new('langit')
    world.use_nodes = True
    nt = world.node_tree
    if sky:
        env = nt.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(str(HDRI_DIR / f'langit-{sky}.hdr'))
        nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = sky_power
    scene.world = world
    lights = []
    if sun:
        s = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
        scene.collection.objects.link(s)
        s.data.energy = sun
        s.data.angle = math.radians(4)
        s.rotation_euler = Vector(sun_dir).to_track_quat('Z', 'Y').to_euler()
        lights.append(s)
    for loc, size_m, power, color in lamps:
        la = bpy.data.objects.new('lampu', bpy.data.lights.new('lampu', 'AREA'))
        scene.collection.objects.link(la)
        la.location = loc
        la.data.size = size_m
        la.data.energy = power
        la.data.color = color
        lights.append(la)

    img = bpy.data.images.new(f'lm-{name}', size, size, float_buffer=True)
    used = set()
    for o in meshes:
        for m in o.data.materials:
            if m.name in used:
                continue
            used.add(m.name)
            n = m.node_tree.nodes.new('ShaderNodeTexImage')
            n.image = img
            m.node_tree.nodes.active = n
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6)
    scene.view_settings.view_transform = 'Standard'
    scene.render.image_settings.file_format = 'PNG'
    out = (GLB_DIR / f'{name}-lm.png').resolve()
    img.save_render(str(out))
    print('LIGHTMAP', out)
    for o in meshes:
        o.data.uv_layers.active = o.data.uv_layers[0]
        o.data.uv_layers[0].active_render = True
    for la in lights:
        bpy.data.objects.remove(la, do_unlink=True)


def build_court():
    """lapangan tenis 8 x 16 m di taman sore: tribun, wasit, bangku, pepohonan bertekstur"""
    reset()
    HW, HL = 4.0, 8.0
    plane(-70, 70, -70, 70, -0.01, tagged('ground', '#5a9a3a', 0.95))
    plane(-HW - 2.4, HW + 2.4, -HL - 3.0, HL + 3.0, 0.004, tagged('court_out', '#3a6fc0', 0.75))
    plane(-HW, HW, -HL, HL, 0.008, tagged('court_in', '#2a8f63', 0.75))
    court_lines(HW, HL, HL * 0.55, z=0.012)
    net_at(HW + 0.3, 0.9, '#d7d7e2')
    cube((0, 0, 0.45), (0.05, 0.03, 0.9), pbr('#fff4fa', 0.5), b=0)
    stand(1, HW)
    stand(-1, HW)
    court_furniture(HW, HL)
    # pagar kawat di ujung jauh; ujung dekat dilewati kamera
    logam = tagged('logam', '#7a7f8c', 0.5)
    for k in range(-7, 8):
        cyl((k * 2, HL + 3.3, 1.8), 0.05, 3.6, logam, verts=8, b=0)
    cube((0, HL + 3.3, 3.6), (28, 0.05, 0.05), logam, b=0)
    fence = bpy.data.meshes.new('pagar')
    fence.from_pydata([(-14, HL + 3.3, 0), (14, HL + 3.3, 0), (14, HL + 3.3, 3.6), (-14, HL + 3.3, 3.6)], [], [(0, 1, 2, 3)])
    uv = fence.uv_layers.new(name='UVMap')
    for i, co in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[i].uv = co
    fo = bpy.data.objects.new('pagar', fence)
    scene.collection.objects.link(fo)
    fence.materials.append(tagged('fence', '#ffffff', 0.6))
    # tiang lampu
    for x, y in ((-13, 12), (13, 12), (-13, -12), (13, -12)):
        cyl((x, y, 6), 0.14, 12, logam, verts=10, b=0)
        cube((x, y, 12.2), (2.4, 0.3, 1.1), pbr('#2a2a34', 0.4, 0.5), b=0.03)
        for dx in (-0.8, 0, 0.8):
            for dz in (-0.25, 0.25):
                cyl((x + dx, y - 0.18, 12.2 + dz), 0.16, 0.05, pbr('#fff2d6', 0.3, emit=5.0), rot=(math.radians(90), 0, 0), verts=10, b=0)
    # bendera di atap, ditiup angin lewat shader
    for side in (-1, 1):
        for k, c in zip((-9, -3, 3, 9), (ROSE, GOLD, SKY, LEAF)):
            x = side * (HW + 5.2)
            cyl((x, k, 6.2), 0.03, 2.4, logam, verts=6, b=0)
            flag = bpy.data.meshes.new('bendera')
            flag.from_pydata([(x, k, 6.6), (x, k + 1.1, 6.6), (x, k + 1.1, 7.3), (x, k, 7.3)], [], [(0, 1, 2, 3)])
            uv = flag.uv_layers.new(name='UVMap')
            fo = bpy.data.objects.new('bendera', flag)
            scene.collection.objects.link(fo)
            flag.materials.append(tagged(f'flag_{c[1:]}', c, 0.7))
    # hutan & semak: rapat di ujung jauh, bukit di belakangnya
    import random
    rnd = random.Random(3)
    for i in range(16):
        prop('pohon' if i % 2 else 'pohon-2', -30 + i * 4 + rnd.random() * 2, HL + 8 + rnd.random() * 8, 0.8 + rnd.random() * 0.4, rnd.random() * 6.28)
    for side in (-1, 1):
        for i in range(6):
            prop('pohon-3' if i % 2 else 'pohon', side * (HW + 14 + rnd.random() * 6), -18 + i * 7, 0.75 + rnd.random() * 0.4, rnd.random() * 6.28)
    for i in range(18):
        prop('semak' if i % 3 else 'semak-2', -17 + i * 2, HL + 4.6 + rnd.random() * 1.2, 0.8 + rnd.random() * 0.5, rnd.random() * 6.28)
    for x, y, r in ((-50, 62, 22), (-12, 70, 26), (28, 66, 24), (60, 54, 20), (-66, 40, 18)):
        sphere((x, y, -3), r, tagged('hill', '#4f8a3f', 0.95), (1.5, 1, 0.5), seg=24, sub=False)
    finish('court')


def build_hall():
    """gedung badminton 5.2 x 10 m: lantai kayu mengilap, tribun, rangka atap, lampu gantung"""
    reset()
    HW, HL = 2.6, 5.0
    plane(-14, 14, -14, 14, 0, tagged('lantai', '#c98f4f', 0.3))
    plane(-HW, HW, -HL, HL, 0.006, tagged('court_in', '#1f8a5c', 0.5))
    court_lines(HW, HL, 1.6, w=0.05, z=0.01)
    net_at(HW + 0.1, 1.15, '#ff37a6')
    stand(1, HW, roof=False, L=10)
    stand(-1, HW, roof=False, L=10)
    court_furniture(HW, HL)
    beton = tagged('beton', '#a8a4a0', 0.9)
    logam = tagged('logam', '#7a7f8c', 0.5)
    for s in (-1, 1):
        cube((s * 14, 0, 4), (0.3, 28, 8), beton, b=0)
        cube((0, s * 14, 4), (28, 0.3, 8), beton, b=0)
        cube((s * 13.8, 0, 1.2), (0.06, 28, 0.1), pbr(ROSE if s < 0 else LEAF, 0.4, emit=3.5), b=0)
    cube((0, 0, 8), (28, 28, 0.2), pbr('#15112a', 0.8), b=0)
    # rangka atap segitiga
    for y in range(-12, 13, 4):
        cube((0, y, 7.2), (26, 0.14, 0.14), logam, b=0)
        cube((0, y, 7.75), (26, 0.1, 0.1), logam, b=0)
        for k in range(-6, 7):
            cyl((k * 2, y, 7.47), 0.02, 0.58, logam, rot=(0, math.radians(35 * (1 if k % 2 else -1)), 0), verts=5, b=0)
    for x in (-5, 0, 5):
        for y in (-6, 0, 6):
            cube((x, y, 6.2), (2.4, 0.46, 0.08), pbr('#2a2a34', 0.4, 0.5), b=0.02)
            cube((x, y, 6.14), (2.2, 0.36, 0.02), pbr('#fff2d6', 0.3, emit=7.0), b=0)
            for s in (-1, 1):
                cyl((x + s, y, 7), 0.01, 1.5, logam, verts=4, b=0)
    # jendela tinggi & spanduk
    for k in range(-5, 6):
        cube((k * 2.4, 13.82, 6.0), (1.9, 0.04, 1.4), pbr('#bcd8ff', 0.2, emit=1.4), b=0)
    for k in range(-1, 2):
        face_uv(cube((k * 7, -13.8, 3.2), (6, 0.06, 1.4), tagged(f'iklan{k % 3}', '#ffffff', 0.5), b=0))
    text3d('HALL KACAU', (0, 13.8, 3.6), 1.6, pbr(ROSE, 0.3, emit=7.0), extrude=0.05)
    finish('hall', sky=None, sky_power=0.05, sun=0, lamps=[((0, 0, 6.0), 12, 2200, (1, 0.95, 0.85)), ((0, 13, 6), 8, 200, (0.75, 0.85, 1))])


def lathe(profile, m, seg=20):
    """putar profil (r, z) mengelilingi sumbu Z"""
    n = len(profile)
    verts = [(math.cos(i / seg * math.tau) * r, math.sin(i / seg * math.tau) * r, z) for i in range(seg) for r, z in profile]
    faces = [(i * n + k, ((i + 1) % seg) * n + k, ((i + 1) % seg) * n + k + 1, i * n + k + 1) for i in range(seg) for k in range(n - 1)]
    me = bpy.data.meshes.new('lathe')
    me.from_pydata(verts, [], faces)
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new('lathe', me)
    scene.collection.objects.link(o)
    me.materials.append(m)
    return o


def build_props():
    reset()
    # pin standar: tinggi 0.38 m, perut r 0.06, pangkal di z=0
    white = pbr('#fbf6ee', 0.22, coat=0.6)
    red = pbr('#e0223c', 0.3)
    prof = [(0.0, 0.0), (0.028, 0.0), (0.05, 0.05), (0.061, 0.115), (0.05, 0.19), (0.031, 0.25), (0.024, 0.285), (0.031, 0.32), (0.034, 0.345), (0.024, 0.372), (0.0, 0.381)]
    body = lathe(prof, white)
    body.name = 'pin'
    band = lathe([(0.0312, 0.268), (0.0262, 0.272), (0.0255, 0.29), (0.029, 0.3)], red)
    parent([band], body)
    # bola: warna diisi di three.js lewat material `ball`
    ball = sphere((0, 0, 0), 0.108, tagged('ball', '#ff37a6', 0.12), seg=28, sub=False)
    ball.name = 'ball'
    for dx, dz in ((-0.024, 0.032), (0.024, 0.032), (0, -0.008)):
        h = sphere((dx, -0.1, dz + 0.02), 0.014, pbr('#0c0a12', 0.5), seg=8, sub=False)
        parent([h], ball)
    export('bowling-props')


if __name__ == '__main__':
    GLB_DIR.mkdir(parents=True, exist_ok=True)
    if not ONLY or 'bowling' in ONLY:
        build_bowling()
    if not ONLY or 'boxing' in ONLY:
        build_boxing()
    if not ONLY or 'archery' in ONLY:
        build_archery()
    if not ONLY or 'pitch' in ONLY:
        build_pitch()
    if not ONLY or 'court' in ONLY:
        build_court()
    if not ONLY or 'hall' in ONLY:
        build_hall()
    if not ONLY or 'props' in ONLY:
        build_props()
