# Map Dapur Raksasa (Petak Cat): meja dapur seluas lapangan; pemain sekecil sendok di antara panci, kaleng, dan tomat.
# Jalankan: blender --background --python scripts/blender/petak_dapur.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, noise, set_sky  # noqa: E402
from petak_kit import Kit  # noqa: E402

import numpy as np  # noqa: E402

m = Map('dapur', 37, lm=4096)
k = Kit(m)

MEJA = m.tex('meja', 'old_wood_floor', 7.0, rough=0.35)
UBIN = m.tex('ubin_dinding', 'large_floor_tiles_02', 6.0, rough=0.2)
TALENAN = m.tex('talenan', 'plywood', 6.0)
KAYU = m.tex('kayu_rak', 'distressed_painted_planks', 5.0)
BAJA = m.flat('baja', '#c3cad1', 0.22, 1.0)
HITAM = m.flat('wajan', '#1e2023', 0.35, 0.7)
PIRING = m.flat('piring', '#f4f1ea', 0.2)
BIRU_P = m.flat('piring_biru', '#3f73c8', 0.25)
TOMAT = m.flat('tomat', '#e0301e', 0.2)
WORTEL = m.flat('wortel', '#f08a1e', 0.45)
DAUN = m.flat('daun_tomat', '#2f8f3f', 0.5)
ROTI = m.tex('roti', 'brown_leather', 3.0)
KEJU = m.flat('keju', '#f7c531', 0.4)

def pori(warna, seed):
    """lubang-lubang spons"""
    r = np.random.default_rng(seed)
    n = noise(256, r, 24)
    return np.clip(np.array(warna)[None, None] * (0.45 + (n > 0.42)[..., None] * 0.65), 0, 1)


SPONS = m.image('spons', pori((1, 0.84, 0.3), 1), 0.9, tile=2.0)
SPONS2 = m.image('spons_hijau', pori((0.25, 0.68, 0.36), 2), 0.8, tile=2.0)
KALENG = [m.flat(f'kaleng{i}', c, 0.3, 0.4) for i, c in enumerate(('#d8322c', '#2f6fd0', '#f2c21a', '#3aa655'))]
AIR = m.flat('air_wastafel', '#7fb8d8', 0.05, 0.2)
API = m.flat('neon_api', '#3fa0ff', 0.4, emit=7)
JENDELA = m.flat('neon_jendela', '#fff4d8', 0.4, emit=5)
GORDEN = m.tex('sway_gorden', 'fabric_pattern_05', 2.4, '#fff0c8')
MADU = m.flat('madu', '#d98a1a', 0.1)


def piring(x, y, r, mat):
    m.cyl((x, y, 0.1), r, 0.2, mat, 36, r + 0.5, solid=False)
    m.cyl((x, y, 0.24), r * 0.82, 0.05, PIRING, 36)
    m.solid(x, y, r * 1.8, r * 1.8, 0.24)


def kaleng(x, y, r, h, i, label):
    m.cyl((x, y, h / 2), r, h, BAJA, 32, solid=True)
    m.cyl((x, y, h / 2), r + 0.02, h * 0.7, KALENG[i % 4], 32)
    # bibir, alur, dan cincin pembuka
    for z, t in ((0.1, 0.2), (h - 0.1, 0.2)):
        m.cyl((x, y, z), r + 0.08, t, BAJA, 32)
    for z in (h * 0.3, h * 0.5, h * 0.7):
        m.cyl((x, y, z), r + 0.03, 0.12, k.putih, 32)
    m.cyl((x, y, h + 0.02), r * 0.92, 0.04, k.besi, 32)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.2, minor_radius=0.05, major_segments=14, minor_segments=5, location=(0, 0, 0))
    o = bpy.context.object
    m._keep(o, BAJA)
    o.location = (x + r * 0.45, y, h + 0.07)
    m.solid(x, y, r * 1.2, r * 1.2, h)
    m.spot(x + r + 0.42, y, 1, 0, 'nempel')
    m.spot(x - r - 0.42, y, -1, 0, 'nempel')


def sendok(x, y, rot):
    c, s = math.cos(rot), math.sin(rot)
    m.ball((x, y, 0.3), 1.6, BAJA, (1.5, 1, 0.2), rot)
    m.rope((x + c * 2, y + s * 2, 0.3), (x + c * 10, y + s * 10, 0.6), 0.28, BAJA, 0, 1, 10)
    m.solid(x + c * 6, y + s * 6, 8, 0.6, 0.45, rot)


def panci(x, y, r, h):
    k.scan('brass_pot_01', x, y, rot=0.6, z=0.5, w=r * 2.3, tris=4000, tex=1024)
    m.solid(x, y, r * 1.5, r * 1.5, h)
    m.life['asap'].append([x, h + 0.3, -y])
    m.life['asap'].append([x + 1, h + 0.3, -(y + 0.6)])


# ---------- meja dan dinding ----------
m.block(-26, -18, 26, 18, -1, 0, MEJA)
m.block(-26, 18, 26, 19, 0, 16, UBIN, solid=True)
m.block(-26.4, -18, -25.6, 18, 0, 16, UBIN, solid=True)
m.block(25.6, -18, 26.4, 18, 0, 16, UBIN, solid=True)
# tepi meja: pagar tak terlihat, plus bibir kayu
m.block(-26, -18.4, 26, -18, -1, 0.5, MEJA)
m.solid(0, -18.2, 52, 0.4, 2)
# dinding seberang ruangan, jauh di balik tepi meja
m.block(-60, -46, 60, -45, -30, 34, UBIN)
m.block(-60, -46, -59, 19, -30, 34, UBIN)
m.block(59, -46, 60, 19, -30, 34, UBIN)
m.block(-60, -45, 60, 19, -30, -29, MEJA)
for x in (-34, 0, 34):
    m.block(x - 12, -44.9, x + 12, -44.8, 6, 26, JENDELA)
# jendela raksasa di dinding belakang
m.block(-16, 17.8, -2, 18, 6, 15, JENDELA)
for x in (-16, -9, -2):
    m.block(x - 0.3, 17.7, x + 0.3, 18, 6, 15, KAYU)
m.block(-16.3, 17.7, -1.7, 18, 10.3, 10.7, KAYU)
lamp((-9, 14, 11), 2600, (1.0, 0.93, 0.8), 2.5)
lamp((10, 2, 14), 1800, (1.0, 0.95, 0.88), 3)
lamp((-14, -9, 14), 1400, (1.0, 0.95, 0.88), 3)

# ---------- kompor ----------
m.block(4, 8, 24, 17.8, 0, 0.5, HITAM, solid=True)
# tapak kompor rendah, bisa diinjak lewat pijakan
m.solid(14, 12.9, 20, 9.8, 0.5)
m.block(4, 7.2, 24, 8, 0, 0.26, BAJA, solid=True)
for i, x in enumerate((8.5, 19.5)):
    bpy.ops.mesh.primitive_torus_add(major_radius=2.1, minor_radius=0.1, major_segments=24, minor_segments=6, location=(0, 0, 0))
    o = bpy.context.object
    m._keep(o, API)
    o.location = (x, 13, 0.58)
    lamp((x, 13, 1.1), 90, (0.3, 0.55, 1.0))
panci(8.5, 13, 3.1, 5.2)
m.spot(8.5, 6.7, 0, -1, 'nempel')
m.spot(15, 6.7, 0, -1, 'nempel')
# wajan
k.scan('brass_pan_01', 19.5, 11, rot=-1.57, z=0.52, w=11, tris=3000, tex=1024)
m.solid(19.5, 13, 6.4, 6.4, 1.3)
m.solid(19.5, 6.2, 0.6, 5.6, 1.4)
m.spot(21.5, 5, 1, 0, 'nempel')

# ---------- talenan, sayur, roti ----------
k.scan('wooden_cutting_board', -14.5, -8, rot=0, w=18, tris=1800, tex=1024)
m.solid(-14.5, -8, 17, 10, 0.42)
m.ball((-16, -8, 2.9), 2.6, TOMAT, (1, 1, 0.92))
m.solid(-16, -8, 3.8, 3.8, 4)
m.ball((-16, -8, 5.2), 0.5, DAUN, (1.4, 1.4, 0.3))
m.spot(-13, -8, 1, 0, 'ringkuk')
m.spot(-19, -8, -1, 0, 'ringkuk')
k.scan('hamburger_buns', -9.5, -7, rot=0.2, z=0.4, w=6, tris=3000, tex=1024)
m.solid(-9.5, -7, 5.4, 2.8, 3)
m.spot(-9.5, -9.3, 0, -1, 'tiarap')
for i in range(4):
    a = 0.5 + i * 0.1
    m.cyl((-20 + i * 1.8, -14.5 - i * 0.2, 0.55), 0.6 - i * 0.05, 1.1, WORTEL, 14)
m.solid(-17.3, -14.8, 7, 1.4, 1.1)
m.spot(-17, -16, 0, -1, 'nempel')

# pisau besar
m.box((-13, 1.2, 0.22), (11, 1.4, 0.2), BAJA, 0.1, solid=True, top=0.3)
m.box((-3.4, 2.2, 0.35), (5, 1.1, 0.7), HITAM, 0.1, solid=True)
m.spot(-5.5, 3.4, 0, 1, 'tiarap')

# ---------- piring dan keju ----------
piring(9, -7, 5.2, BIRU_P)
k.scan('strawberry_chocolate_cake', 8, -7, rot=0.5, z=0.28, w=5.4, tris=4000, tex=1024)
m.solid(8, -7, 3.8, 3.8, 3)
m.spot(11.2, -6, 1, 0, 'ringkuk')
piring(19, -13, 4, PIRING)
k.scan('croissant', 19, -13, rot=1, z=0.28, w=6, tris=2400, tex=1024)
m.solid(19, -13, 3.4, 3.4, 2)
m.spot(21.8, -13, 1, 0, 'nempel')

# ---------- kaleng dan botol ----------
kaleng(-3, 11, 2.3, 7, 0, 'tomat')
kaleng(-10, 13, 2.0, 6, 1, 'sarden')
kaleng(-20, 10, 2.6, 8, 2, 'kopi')
kaleng(0, -14, 1.9, 6, 3, 'susu')
k.scan('jug_01', -15, 8.6, 7, rot=2.2, tris=2400, tex=1024)
m.solid(-15, 8.6, 2.4, 2.4, 6)
m.spot(-13.1, 8.6, 1, 0, 'nempel')

# ---------- sendok, garpu, spons ----------
sendok(-3, -4, 0.2)
sendok(14, -1.6, 2.9)
m.box((3, -15.5, 0.75), (5.6, 3.4, 1.5), SPONS, 0.3, solid=True)
m.box((3, -15.5, 1.65), (5.6, 3.4, 0.4), SPONS2, 0.3)
m.spot(6.4, -14.3, 1, 0, 'ringkuk')

# ---------- benda dapur raksasa di latar ----------
k.scan('vintage_electric_kettle', 23, -8, 7, rot=2.4, tris=3000, tex=1024)
m.solid(23, -8, 3.6, 3.6, 7)
m.spot(20.6, -8, -1, 0, 'nempel')
k.scan('wooden_bowl_01', 10.5, -15.3, rot=0.4, w=6, tris=1600, tex=1024)
m.solid(10.5, -15.3, 5, 5, 2)
m.spot(7.4, -15.3, -1, 0, 'ringkuk')
for x, y, pid, w in ((-23.2, 2.4, 'food_apple_01', 3.6), (-21.5, 5.6, 'lemon', 3.2), (24, 2.5, 'yellow_onion', 3.6)):
    k.scan(pid, x, y, w=w, tris=2000, tex=1024)
    m.solid(x, y, w * 0.7, w * 0.7, w * 0.8)
k.scan('bananas', 6, 2.6, rot=0.6, w=7, tris=6000, tex=1024)
m.solid(6, 2.6, 6, 3.4, 1.6, 0.6)
k.scan('wine_bottles_01', -24, -3.4, 12, rot=0.2, tris=2400, tex=1024)
m.solid(-24, -3.4, 2.4, 2.4, 6)
k.scan('all_purpose_cleaner', -16, 15, 9, rot=3.5, tris=1500, tex=512)
k.scan('bleach_bottle', -12.5, 16.4, 8, rot=3.2, tris=1500, tex=512)
m.solid(-14, 15.7, 6, 3, 6)
k.scan('CheeseBox_01', 14, 3.4, rot=1, w=6, tris=1500, tex=1024)
m.solid(14, 3.4, 4.6, 4.6, 2)
m.spot(14, 0.6, 0, -1, 'ringkuk')
k.lantai(34, -24, -17, 24, 7, 0.012)

# lemari gantung, rak bumbu, dan gorden di dinding belakang
for x in (6, 15, 24):
    m.box((x, 18.0, 13), (8.6, 1.0, 5.6), KAYU)
    m.box((x + 3.4, 17.45, 11), (0.2, 0.2, 1.2), BAJA)
for x in (-25, -19):
    m.box((x, 18, 5.4), (5.4, 0.8, 0.26), KAYU)
    k.scan(('pot_enamel_01', 'tea_set_01')[x == -19], x, 17.9, rot=3.1, z=5.54, w=4, tris=1600, tex=512)
for x in (-17, -1):
    m.cloth((x, 17.5, 15.6), 2.8, 10, GORDEN, 0, sway=0.14, cols=6, rows=8)

# wastafel: kolam air, tak bisa dilewati
m.block(-25.5, 12.5, -17, 18, 0, 1.2, BAJA, solid=True)
m.block(-25, 13, -17.4, 17.6, 1.2, 1.26, AIR)
m.rope((-21, 17.8, 1.2), (-21, 17.2, 9), 0.4, BAJA, 0, 1, 10)
m.rope((-21, 17.2, 9), (-21, 14.6, 8), 0.34, BAJA, 0, 1, 10)

# remah
for i in range(26):
    x, y = m.rnd.uniform(-22, 22), m.rnd.uniform(-16, 6)
    m.ball((x, y, 0.08), 0.14 + m.rnd.random() * 0.12, ROTI if i % 2 else PIRING, (1.2, 1, 0.6))

m.spawn['seeker'] = [[23.5, 15.5], [22, 15.5]]
m.spawn['hider'] = [[-2, 8], [0, 8], [2, 8], [-2, 10], [0, 10], [2, 10], [-2, 11.5], [2, 11.5]]
m.life['kucing'] = [[[-3, 6], [3, -4], [15, 5.5], [24, -3], [15, -16], [-2, -9]]]
m.life['merpati'] = [[-4, 0.05, 1], [15, 0.05, -2]]
m.life['warga'] = []
m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 1.2, 2.0, (1.0, 0.92, 0.8), min_elevation=46)
m.finish()
