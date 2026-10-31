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
    cube((cx + PITCH / 2, LENGTH / 2, 0.015), (PITCH - (LANE_HALF + 0.38) * 2, LENGTH, 0.05), pbr('#241a3f', 0.22, 0.2), b=0)
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
        cube((s * w / 2, 6, 2.4), (0.3, 30, 4.8), wall, b=0)
    cube((0, -9.1, 2.4), (w, 0.3, 4.8), wall, b=0)
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
    sofa = pbr('#ff37a6', 0.55)
    sofa2 = pbr('#43b929', 0.55)
    table = pbr('#fff4fa', 0.3)
    for i in range(-2, 3):
        cx = i * PITCH
        if i == 0:
            continue
        m = sofa if i % 2 else sofa2
        cube((cx, -5.2, 0.28), (2.1, 0.75, 0.42), m, b=0.08)
        cube((cx, -5.6, 0.62), (2.1, 0.2, 0.7), m, b=0.08)
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
        for k in range(7):
            a = k / 7 * math.tau
            sphere((side * 9.6 + math.cos(a) * 0.28, -7.8 + math.sin(a) * 0.28, 1.0 + (k % 3) * 0.14), 0.26, pbr('#2c8a3a', 0.8), (1, 1, 1.5), seg=10, sub=False)


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
    merge_by_material()
    export('bowling')


def ring():
    """ring 6 x 6 m: kanvas di z=0 supaya petinju berdiri di y=0"""
    R = 3.0
    plane(-R - 0.45, R + 0.45, -R - 0.45, R + 0.45, 0, tagged('canvas', '#2f4c8c', 0.8))
    cube((0, 0, -0.57), (R * 2 + 0.9, R * 2 + 0.9, 1.1), pbr('#14101f', 0.5), b=0)
    # rok ring berlampu
    for s in (-1, 1):
        cube((0, s * (R + 0.46), -0.55), (R * 2 + 0.9, 0.04, 0.9), pbr(ROSE, 0.5), b=0)
        cube((s * (R + 0.46), 0, -0.55), (0.04, R * 2 + 0.9, 0.9), pbr(ROSE, 0.5), b=0)
        cube((0, s * (R + 0.48), -0.1), (R * 2 + 0.9, 0.03, 0.05), pbr(LEAF, 0.4, emit=3.5), b=0)
        cube((s * (R + 0.48), 0, -0.1), (0.03, R * 2 + 0.9, 0.05), pbr(LEAF, 0.4, emit=3.5), b=0)
    corners = [(-R, -R, ROSE), (R, -R, SKY), (R, R, ROSE), (-R, R, SKY)]
    for x, y, c in corners:
        cyl((x, y, 0.75), 0.11, 1.5, pbr('#d7d7e2', 0.25, 0.8), verts=14, b=0)
        cyl((x, y, 0.72), 0.17, 1.2, pbr(c, 0.45), verts=14, b=0.03)
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


def crowd(d0=5.6, tiers=5, gap=0.74, base=-0.9, cy=0.0, sides=(0, 1, 2, 3)):
    """penonton berjenjang, warna dibagi supaya tetap sedikit material"""
    import random
    rnd = random.Random(4)
    # warna diredam dan bernama crowd_*: arena menyembunyikannya di grafis Hemat
    shirts = [tagged(f'crowd_{i}', c, 0.8) for i, c in enumerate(('#a52a70', '#3f9a33', '#a8872a', '#2f7fa8', '#a8552c', '#5d3aa8', '#9a97a8'))]
    skins = [tagged(f'crowd_kulit{i}', c, 0.7) for i, c in enumerate(('#b8966e', '#8f6240', '#5e3c24'))]
    step = pbr('#1c1630', 0.8)
    for tier in range(tiers):
        d = d0 + tier * 1.05
        z = base + tier * 0.62
        if 0 in sides:
            cube((0, cy + d + 0.35, z - 0.42), (d * 2 + 1.4, 1.05, 0.5), step, b=0)
        if 1 in sides:
            cube((0, cy - d - 0.35, z - 0.42), (d * 2 + 1.4, 1.05, 0.5), step, b=0)
        if 2 in sides:
            cube((d + 0.35, cy, z - 0.42), (1.05, d * 2 + 1.4, 0.5), step, b=0)
        if 3 in sides:
            cube((-d - 0.35, cy, z - 0.42), (1.05, d * 2 + 1.4, 0.5), step, b=0)
        n = int(d * 2 / gap)
        for side in sides:
            for i in range(n):
                if rnd.random() < 0.14:
                    continue
                u = -d + (i + 0.5) * (2 * d / n) + rnd.random() * 0.1
                x, y = ((u, d) if side == 0 else (u, -d) if side == 1 else (d, u) if side == 2 else (-d, u))
                y += cy
                h = 0.92 + rnd.random() * 0.14
                # dua bola rendah: dari jauh tetap bulat setelah dihaluskan
                for loc, r, sc, mats in (((x, y, z + 0.1), 0.25, (1, 0.85, 1.35), shirts), ((x, y, z + 0.1 + h * 0.6), 0.17, (1, 1, 1), skins)):
                    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=7, ring_count=5)
                    o = last()
                    o.scale = sc
                    o.data.materials.append(rnd.choice(mats))
                    for p in o.data.polygons:
                        p.use_smooth = True


def arena():
    w = 26
    plane(-w / 2, w / 2, -w / 2, w / 2, -1.1, pbr('#100c1c', 0.5))
    for s in (-1, 1):
        cube((s * w / 2, 0, 3), (0.3, w, 8.4), pbr('#191330', 0.8), b=0)
        cube((0, s * w / 2, 3), (w, 0.3, 8.4), pbr('#191330', 0.8), b=0)
    cube((0, 0, 7.2), (w, w, 0.2), pbr('#0c0916', 0.8), b=0)
    # rangka lampu di atas ring
    truss = pbr('#3a3a48', 0.4, 0.7)
    for s in (-1, 1):
        cube((0, s * 3.4, 5.4), (8, 0.12, 0.12), truss, b=0)
        cube((s * 3.4, 0, 5.4), (0.12, 8, 0.12), truss, b=0)
    for x in (-3, -1, 1, 3):
        for y in (-3.4, 3.4):
            cyl((x, y, 5.22), 0.12, 0.26, pbr('#fff2d6', 0.3, emit=8.0), verts=10, b=0)
    # layar gantung tengah
    cube((0, 0, 5.3), (2.6, 2.6, 1.2), pbr('#0f0d18', 0.3), b=0.04)
    for s in (-1, 1):
        cube((0, s * 1.32, 5.3), (2.3, 0.02, 0.95), pbr(SKY, 0.5, emit=1.4), b=0)
        cube((s * 1.32, 0, 5.3), (0.02, 2.3, 0.95), pbr(ROSE, 0.5, emit=1.4), b=0)
    for s in (-1, 1):
        text3d('RING KACAU', (0, s * 12.8, 4.9), 1.5, pbr(ROSE, 0.3, emit=7.0), extrude=0.05, rot=(math.radians(90), 0, math.radians(180) if s < 0 else 0))
        neon_ring((-8, s * 12.82, 3.6), 0.8, GOLD)
        neon_ring((8, s * 12.82, 3.6), 0.8, LEAF)
        squiggle(s * 12.82, -8, 3.6, False, 5, ROSE)
        squiggle(s * 12.82, 3, 3.6, False, 5, LEAF)


def build_boxing():
    reset()
    ring()
    crowd()
    arena()
    merge_by_material()
    export('boxing')


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
    cyl((x, y + 0.08, z), 0.78, 0.16, pbr('#c9a25a', 0.95), rot=rot, verts=32, b=0.03)
    for i, (r, c) in enumerate(((0.61, '#fff4fa'), (0.488, '#121212'), (0.366, '#3a6fe0'), (0.244, '#e0223c'), (0.122, '#ffcc1f'))):
        cyl((x, y - 0.005 - i * 0.004, z), r, 0.004, pbr(c, 0.5), rot=rot, verts=40, b=0)
    # kaki penyangga
    wood = pbr('#7a5230', 0.7)
    for s in (-1, 1):
        cyl((x + s * 0.42, y + 0.1, 0.72), 0.045, 1.5, wood, rot=(0, math.radians(-s * 12), 0), verts=8, b=0)
    cyl((x, y + 0.55, 0.72), 0.045, 1.6, wood, rot=(math.radians(-22), 0, 0), verts=8, b=0)


def build_archery():
    reset()
    plane(-60, 60, -30, 90, 0, tagged('grass', '#5aae3a', 0.95))
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
        cyl(p1, 0.13, 0.34, pbr(colors[i % 4], 0.6), rot=(math.radians(180), 0, 0), verts=3, r2=0.0, b=0)
    for x in (-12, 12):
        cyl((x, 21.2, 1.6), 0.07, 3.2, pbr('#fff4fa', 0.5), verts=8, b=0)
    # pepohonan, tenda, bangku penonton, dan bukit jauh
    for i, (x, y, s) in enumerate(((-16, 26, 1.5), (-9, 30, 1.8), (-2, 33, 1.6), (6, 31, 2), (14, 27, 1.5), (21, 22, 1.8), (-22, 18, 1.8), (-20, 6, 1.6), (22, 8, 1.6), (26, 28, 2.2), (-28, 30, 2.2))):
        tree(x, y, s, i)
    for x, c in ((-15, ROSE), (15, SKY)):
        cube((x, 8, 1.1), (4, 3, 2.2), pbr('#fff4fa', 0.7), b=0.03)
        cyl((x, 8, 2.75), 3.0, 1.1, pbr(c, 0.6), verts=4, r2=0.0, b=0)
    wood = pbr('#b0763a', 0.7)
    for side in (-1, 1):
        for k in range(3):
            cube((side * 11, 2 + k * 2.2, 0.32), (1.2, 1.8, 0.1), wood, b=0.02)
    for x, y, r in ((-46, 70, 26), (-8, 82, 32), (36, 76, 28), (70, 60, 24), (-74, 50, 22)):
        sphere((x, y, -2), r, pbr('#3f7f3a', 0.95), (1.3, 1, 0.45), seg=20, sub=False)
    merge_by_material()
    export('archery')


def build_pitch():
    reset()
    plane(-30, 30, -18, 34, 0, tagged('grass', '#3f9a33', 0.95))
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
    # papan iklan & tribun
    for x, c in ((-10, ROSE), (-3.4, GOLD), (3.4, SKY), (10, LEAF)):
        cube((x, 15, 0.45), (6.4, 0.2, 0.9), pbr(c, 0.45, emit=0.8), b=0)
    crowd(d0=16, tiers=5, gap=1.0, base=0.8, cy=2, sides=(0, 2, 3))
    cube((0, 26, 7), (60, 0.4, 3), pbr('#191330', 0.8), b=0)
    text3d('STADION KACAU', (0, 25.7, 7.2), 1.9, pbr(ROSE, 0.3, emit=7.0), extrude=0.05)
    for x in (-24, 24):
        cyl((x, 22, 6), 0.2, 12, pbr('#3a3a48', 0.5, 0.6), verts=8, b=0)
        cube((x, 22, 12.4), (3.2, 0.3, 1.8), pbr('#fff2d6', 0.3, emit=6.0), b=0)
    merge_by_material()
    export('pitch')


def court_lines(hw, hl, service, color='#fff4fa', w=0.06, z=0.012):
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


def build_court():
    """lapangan tenis 8 x 16 m untuk badan chibi, di taman sore"""
    reset()
    HW, HL = 4.0, 8.0
    plane(-30, 30, -30, 30, -0.01, tagged('grass', '#3f7f3a', 0.95))
    cube((0, 0, -0.005), (HW * 2 + 4, HL * 2 + 6, 0.01), pbr('#3a6fe0', 0.8), b=0)
    cube((0, 0, 0), (HW * 2, HL * 2, 0.004), pbr('#2a8f5a', 0.75), b=0)
    court_lines(HW, HL, HL * 0.55)
    net_at(HW + 0.3, 0.9, '#d7d7e2')
    # pagar kawat hanya di ujung jauh, ujung dekat dilewati kamera; lalu tribun samping & pepohonan
    wire = pbr('#3a3a48', 0.5, 0.5)
    for k in range(-5, 6):
        cyl((k * 2, HL + 3.2, 1.6), 0.04, 3.2, wire, verts=6, b=0)
    cube((0, HL + 3.2, 3.2), (22, 0.06, 0.06), wire, b=0)
    crowd(d0=HW + 2.6, tiers=3, gap=1.0, base=0.3, sides=(2, 3))
    for i, (x, y, s) in enumerate(((-15, 12, 1.6), (15, 13, 1.7), (-18, -2, 1.5), (18, -3, 1.6), (-14, -14, 1.6), (14, -15, 1.7), (-6, 20, 1.9), (6, 22, 1.8))):
        tree(x, y, s, i)
    merge_by_material()
    export('court')


def build_hall():
    """gedung badminton 5.2 x 10 m, lantai kayu, lampu atas"""
    reset()
    HW, HL = 2.6, 5.0
    plane(-12, 12, -12, 12, 0, tagged('wood', '#c98f4f', 0.35))
    cube((0, 0, 0.004), (HW * 2, HL * 2, 0.004), pbr('#1f8a5c', 0.7), b=0)
    court_lines(HW, HL, 1.6, w=0.05, z=0.01)
    net_at(HW + 0.1, 1.15, '#ff37a6')
    wall = pbr('#231a3d', 0.8)
    for s in (-1, 1):
        cube((s * 12, 0, 3.5), (0.3, 24, 7), wall, b=0)
        cube((0, s * 12, 3.5), (24, 0.3, 7), wall, b=0)
        cube((s * 11.8, 0, 1.2), (0.06, 24, 0.1), pbr(ROSE if s < 0 else LEAF, 0.4, emit=3.5), b=0)
    cube((0, 0, 7), (24, 24, 0.2), pbr('#15112a', 0.8), b=0)
    for x in (-4, 0, 4):
        for y in (-6, 0, 6):
            cube((x, y, 6.8), (2.2, 0.4, 0.08), pbr('#fff2d6', 0.3, emit=7.0), b=0)
    crowd(d0=6.6, tiers=3, gap=1.05, base=0.4, sides=(2, 3))
    text3d('HALL KACAU', (0, 11.8, 4.8), 1.4, pbr(ROSE, 0.3, emit=7.0), extrude=0.05)
    merge_by_material()
    export('hall')


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
