# Map Kapal Bajak Laut (Petak Cat): badai malam di geladak kapal besar, layar berkibar, meriam, peti harta, dan kru tulang.
# Jalankan: blender --background --python scripts/blender/petak_kapal.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, set_sky  # noqa: E402
from petak_kit import Kit  # noqa: E402

m = Map('kapal', 43, lm=4096)
k = Kit(m)
W = 9.0

DEK = m.tex('dek', 'weathered_planks', 2.2, rough=0.35)
LAMBUNG = m.tex('lambung', 'old_wood_floor', 2.6)
KAYU_CAT = m.tex('kayu_cat', 'distressed_painted_planks', 2.0)
KAYU_BIRU = m.tex('kayu_biru', 'blue_painted_planks', 2.0)
KARAT = m.tex('karat', 'rusty_corrugated_iron', 1.4)
TONG_KAYU = m.tex('tong_kayu', 'brown_planks_05', 1.2)
LAYAR = m.tex('sway_layar', 'concrete_wall_008', 4.0, '#ffeec8')
BENDERA = m.flat('sway_bendera', '#17181c', 0.8)
TALI = m.flat('tali', '#b49a6c', 0.8)
EMAS = m.flat('emas', '#e0b13a', 0.25, 0.9)
BESI3 = m.flat('meriam', '#2b2f33', 0.4, 0.8)
LENTERA = m.flat('neon_lentera', '#ffb45c', 0.4, emit=8)
LAUT = m.flat('air_laut', '#163a4d', 0.15)


def tong(x, y):
    k.scan(m.rnd.choice(('Barrel_01', 'Barrel_02', 'wine_barrel_01')), x, y, 1.1, tris=700, tex=512)
    m.solid(x, y, 0.9, 0.9, 1.1)
    m.spot(x + 0.82, y, 1, 0, 'ringkuk')


def peti_harta(x, y, rot=0.0):
    k.scan('treasure_chest', x, y, rot=rot, w=1.5, tris=1600, tex=512)
    m.solid(x, y, 1.4, 0.9, 1.0, rot)
    m.spot(x + 1, y, 1, 0, 'ringkuk')


def meriam(x, sisi):
    y = sisi * (W - 1.6)
    k.scan('cannon_01', x, y + sisi * 0.1, rot=1.57 * sisi, w=2.4, tris=2400, tex=512)
    m.solid(x, y, 1.1, 1.4, 0.9)
    m.spot(x + 0.95, y, 1, 0, 'ringkuk')


def tiang(x, h):
    m.cyl((x, 0, h / 2), 0.32, h, LAMBUNG, 12, 0.18, solid=True)
    m.box((x, 0, h * 0.5), (0.2, 13, 0.2), LAMBUNG)
    m.box((x, 0, h * 0.82), (0.18, 9.5, 0.18), LAMBUNG)
    # layar menggembung, digantung dari palang
    m.cloth((x + 0.15, 0, h * 0.5 - 0.1), 12, 5.6, LAYAR, math.pi / 2, sway=0.34, cols=10, rows=10)
    m.cloth((x + 0.15, 0, h * 0.82 - 0.1), 8.6, 4.6, LAYAR, math.pi / 2, sway=0.3, cols=8, rows=8)
    # tangga tali ke sisi kapal
    for s in (-1, 1):
        for d in (-0.5, 0.5):
            m.rope((x + d, s * (W - 0.2), 1.0), (x, s * 0.4, h * 0.45), 0.03, TALI, 0.1, 3)
    m.spot(x + 0.75, 0.4, 1, 0, 'pohon')


def lentera(x, y, z):
    m.rope((x, y, z + 0.5), (x, y, z + 0.14), 0.02, TALI, 0, 1)
    k.scan('wooden_lantern_01', x, y, 0.42, rot=0, z=z - 0.22, tris=500)
    m.ball((x, y, z), 0.09, LENTERA)
    lamp((x, y, z - 0.2), 75, (1.0, 0.66, 0.34))


def tepi(x0, x1, y):
    m.block(x0, y - 0.2, x1, y + 0.2, 0, 0.5, LAMBUNG, solid=True)
    m.block(x0, y - 0.28, x1, y + 0.28, 1.15, 1.24, KAYU_CAT)
    m.block(x0, y - 0.24, x1, y + 0.24, 0.5, 0.58, KAYU_CAT)
    m.solid((x0 + x1) / 2, y, x1 - x0, 0.5, 1.2)
    # jeruji pagar dan rusuk lambung
    x = x0 + 0.3
    while x < x1:
        m.cyl((x, y, 0.86), 0.05, 0.58, KAYU_CAT, 8, 0.07)
        x += 0.62
    for x in range(int(x0), int(x1), 3):
        m.box((x + 0.5, y + math.copysign(0.26, y), -2), (0.32, 0.14, 4.1), LAMBUNG)


# ---------- laut ----------
with m.moving('laut_ombak', (0, 0, 0)):
    m.grid(-90, -90, 90, 90, -1.6, 80, LAUT)

# ---------- lambung dan geladak ----------
m.block(-25, -W, 16, W, -4, 0, LAMBUNG)
m.block(-25, -W, 16, W, -0.02, 0, DEK)
# haluan meruncing ke timur
for s in (-1, 1):
    a = math.atan2(-s * W, 9)
    m.box((20.5, s * W / 2, 0.57), (math.hypot(9, W) + 0.5, 0.4, 1.15), LAMBUNG, a, solid=True)
    m.box((20.5, s * W / 2, -2), (math.hypot(9, W) + 0.5, 0.4, 4.1), LAMBUNG, a)
for i in range(9):
    x = 16 + i
    w = W * (1 - (i + 0.5) / 9)
    m.block(x, -w, x + 1, w, -4, 0, DEK)
m.rope((25, 0, 0.9), (30, 0, 5), 0.2, LAMBUNG, 0, 1, 10)
m.solid(25.2, 0, 1.5, 1.5, 3)
tepi(-25, 16, W)
tepi(-25, 16, -W)
m.block(-25.2, -W, -24.8, W, 0, 1.15, LAMBUNG, solid=True)

# ---------- kabin kapten (buritan) ----------
CX0, CX1 = -25, -14
m.block(CX0, -W + 0.3, CX1, W - 0.3, 3.4, 3.7, DEK)
for y0, y1 in ((-W + 0.3, -1.3), (1.3, W - 0.3)):
    m.block(CX1 - 0.3, y0, CX1, y1, 0, 3.4, KAYU_BIRU, solid=True)
m.block(CX1 - 0.3, -1.3, CX1, 1.3, 2.5, 3.4, KAYU_BIRU)
m.block(CX0, W - 0.5, CX1, W - 0.3, 0, 3.4, KAYU_CAT, solid=True)
m.block(CX0, -W + 0.3, CX1, -W + 0.5, 0, 3.4, KAYU_CAT, solid=True)
m.block(-22, -3, -17, -1.4, 0, 0.9, KAYU_CAT, solid=True)
m.cyl((-21, 3.5, 0.45), 0.9, 0.9, TONG_KAYU, 14, solid=True)
peti_harta(-23, -6.4, 0.2)
peti_harta(-16.6, 6.6, 1.5)
tong(-23.6, 6.4)
for x, y in ((-20, 0.6), (-16.5, -5.5)):
    lamp((x, y, 3.0), 90, (1.0, 0.68, 0.36))
m.ball((-20, 0.6, 3.0), 0.16, LENTERA)
m.spot(-14.8, 2, -1, 0, 'nempel')
m.spot(-14.8, -2, -1, 0, 'nempel')
m.text('KAPTEN', (-13.65, 0, 2.95), 0.34, EMAS, rot=(math.pi / 2, 0, math.pi / 2), depth=0.02)
# pagar atap kabin dan kemudi
for y in (-W + 0.5, W - 0.5):
    m.block(CX0, y - 0.06, CX1, y + 0.06, 3.7, 4.5, KAYU_CAT)
m.cyl((-17, 0, 4.4), 0.1, 1.4, KAYU_CAT, 8)
bpy.ops.mesh.primitive_torus_add(major_radius=0.7, minor_radius=0.06, major_segments=18, minor_segments=5, location=(0, 0, 0), rotation=(0, math.pi / 2, 0))
o = bpy.context.object
bpy.ops.object.transform_apply(rotation=True)
m._keep(o, EMAS)
o.location = (-16.8, 0, 5)

# ---------- tiang dan layar ----------
tiang(-5, 17)
tiang(7, 15)
m.cyl((-23, 0, 8), 0.12, 9, LAMBUNG, 8)
m.cloth((-22.95, 0, 12.2), 1.8, 1.2, BENDERA, 0, sway=0.2, cols=6, rows=4)

# ---------- isi geladak ----------
k.lantai(40, -24, -8, 15, 8, 0.012)
k.kotor('x', W - 0.5, CX0, CX1, -1, 3.4, 3, False)
k.kotor('x', -W + 0.5, CX0, CX1, 1, 3.4, 3, False)
k.kotor('y', CX1, -W, W, 1, 3.4, 3, False)
for x in (-18, 10):
    k.scan('lifebuoy', x, W - 0.34, 0.8, rot=3.14, z=0.75, tris=500)
    k.scan('wooden_bucket_02', x + 2, W - 0.8, 0.4, tris=500, tex=512)
k.scan('seadogs_compass', -16.2, 0, 0.28, rot=1.57, z=3.72, tris=500, tex=512)
k.scan('wooden_barrels_01', 5.5, 5.6, rot=0.5, w=2.2, tris=1200, tex=512, solid=True, spot='ringkuk')
k.scan('wooden_crate_02', 18.4, -2.2, 0.9, rot=0.3, tris=500, tex=512, solid=True)
k.scan('wooden_bucket_01', 16.6, 3.4, 0.45, tris=500)
# sekoci tergantung di luar pagar, dan kapal kawan di kejauhan
for s, x in ((1, -4), (-1, 6)):
    k.scan('ship_pinnace', x, s * (W + 1.7), rot=0, z=0.5, w=7.5, tris=2400, tex=512, keep='ship_pinnace_hull')
    for d in (-3, 3):
        m.rope((x + d, s * (W - 0.1), 1.2), (x + d, s * (W + 1.6), 3.6), 0.05, LAMBUNG, 0, 1, 6)
        m.rope((x + d, s * (W + 1.6), 3.6), (x + d, s * (W + 1.7), 0.9), 0.02, TALI, 0, 1, 4)
k.scan('dutch_ship_medium', 62, 44, rot=2.3, z=-3, w=46, tris=12000, tex=1024)
k.scan('dutch_ship_medium', -70, -52, rot=0.5, z=-3, w=40, tris=12000, tex=1024)
for x in (-10, 1, 12):
    meriam(x, 1)
    meriam(x + 3, -1)
for x, y in ((-12, 2.5), (-11, 3.4), (3, -2.4), (11, 2.8), (12, 1.8), (17, 2.2)):
    tong(x, y)
for x, y, n in ((-2, 4.4, 3), (4, -4.6, 2), (14, -3.6, 3)):
    for i in range(n):
        k.scan('wooden_crate_01', x, y, 0.6, rot=i * 0.3, z=i * 0.6, tris=500, tex=512)
    m.solid(x, y, 1.1, 1.0, n * 0.6)
    m.spot(x + 0.9, y, 1, 0, 'ringkuk')
peti_harta(-8, -3.6, 0.5)
peti_harta(19, 0, 1.2)
# lubang palka dan gulungan tali
m.block(0, -1.8, 3.4, 1.4, 0, 0.42, KARAT, solid=True)
m.spot(3.9, 0, 1, 0, 'tiarap')
for i in range(3):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.09, major_segments=14, minor_segments=5, location=(0, 0, 0))
    o = bpy.context.object
    m._keep(o, TALI)
    o.location = (-3, -4.5, 0.1 + i * 0.16)
m.solid(-3, -4.5, 1.1, 1.1, 0.5)
m.spot(-3, -5.5, 0, -1, 'ringkuk')
for x, y in ((-12, 0), (1.8, 3), (13, 0), (20, -2.3)):
    lentera(x, y, 3.0 if x < 16 else 2.4)
    m.cyl((x, y, 1.7), 0.05, 3.4, LAMBUNG, 6)
    m.solid(x, y, 0.15, 0.15, 3)

m.spawn['seeker'] = [[-22, 5.5], [-20, 5.5]]
m.spawn['hider'] = [[-11, 0.8], [-9, 0.8], [-7, 0.8], [-3, 0.8], [-1, 2.6], [9, 0.8], [11, 0.8], [14, 0.8]]
m.life['warga'] = [[[-13, 0], [14, 0], [14, -3], [-13, 3]], [[-20, -0.5], [-20, -5.5], [-16, -6], [-16, 0], [-12, -6.5], [10, -6.5], [-12, -6.5], [-16, 0]]]
m.life['merpati'] = [[8.5, 0.05, 3], [-8, 0.05, -2]]
m.life['kucing'] = [[[-12, 0.5], [16, 0.5], [21, 0.8], [13, -2], [-12, -3]]]
m.life['atap'] = [[-25.2, -9, -13.7, 9]]
m.sun = set_sky('belfast_sunset_puresky_2k.hdr', 0.7, 0.5, (0.7, 0.8, 1.0), min_elevation=40)
m.finish()
