# Map Stasiun Tua (Petak Cat): senja hujan, peron beratap, aula karcis, gudang barang, dan kereta yang melintas.
# Jalankan: blender --background --python scripts/blender/petak_stasiun.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, set_sky  # noqa: E402
from petak_kit import MK, Kit  # noqa: E402

m = Map('stasiun', 23, lm=4096)
k = Kit(m)

BATU = m.tex('batu_jalan', 'cobblestone_01', 2.4, rough=0.3)
KERIKIL = m.tex('kerikil', 'gravel', 2.2)
BETON = m.tex('beton', 'concrete_tiles', 2.4, rough=0.35)
UBIN = m.tex('ubin', 'worn_tile_floor', 1.8, rough=0.3)
TEMBOK = m.tex('tembok', 'concrete_wall_008', 2.6, '#f7ecc4')
TEMBOK2 = m.tex('tembok_tua', 'worn_mossy_plasterwall', 2.6)
BATA = m.tex('bata', 'brick_4', 1.6)
GENTENG = m.tex('genteng', 'clay_roof_tiles', 2.0)
SENG = m.tex('seng', 'rusty_corrugated_iron', 1.6, rough=0.5)
SENG2 = m.tex('seng_abu', 'corrugated_iron_02', 1.6, rough=0.4)
PAPAN = m.tex('papan', 'weathered_planks', 1.6)
PAPAN2 = m.tex('papan_cat', 'blue_painted_planks', 1.6)
KOPER = m.tex('koper', 'brown_leather', 0.8)
BANTALAN = m.tex('bantalan', 'old_wood_floor', 1.2)
HIJAU_TUA = m.flat('hijau_tua', '#2c5a44', 0.45, 0.3)
KUNING_GARIS = m.flat('garis_kuning', '#e8b81c', 0.5)
GENANGAN = m.flat('air_genangan', '#38444c', 0.06, 0.5)
LOKO = m.flat('loko', '#1f2a2c', 0.4, 0.6)
GERBONG = m.flat('gerbong', '#d9c9a0', 0.5, 0.2)
GERBONG2 = m.flat('gerbong_biru', '#2f5f9e', 0.45, 0.2)
JENDELA = m.flat('neon_jendela', '#ffdf9a', 0.4, emit=4)
SINYAL = m.flat('neon_sinyal', '#ff3a2a', 0.4, emit=8)
SAWO = m.flat('rangka', '#3a4f43', 0.5, 0.5)


def genangan(x, y, w, d):
    """beberapa lingkaran tumpang-tindih, supaya tepinya tidak kotak"""
    for i in range(4):
        r = min(w, d) * (0.3 + m.rnd.random() * 0.25)
        m.cyl((x + (m.rnd.random() - 0.5) * (w - r), y + (m.rnd.random() - 0.5) * (d - r), 0.04 + i * 0.002), r, 0.01, GENANGAN, 18)


def koper(x, y, n=2):
    for i in range(n):
        k.scan('vintage_suitcase', x, y, 0.3, rot=i * 0.5 + 0.1, z=i * 0.3, tris=500)
    m.solid(x, y, 0.8, 0.5, 0.3 + n * 0.3)
    m.spot(x, y + 0.6, 0, 1, 'ringkuk')


def jendela(x, y, axis, out):
    dx, dy = (0, out) if axis == 'x' else (out, 0)
    size = (1.5, 0.1, 1.8) if axis == 'x' else (0.1, 1.5, 1.8)
    inner = (1.3, 0.1, 1.6) if axis == 'x' else (0.1, 1.3, 1.6)
    m.box((x + dx * 0.04, y + dy * 0.04, 2.0), size, HIJAU_TUA)
    m.box((x + dx * 0.08, y + dy * 0.08, 2.0), inner, JENDELA)
    for i in (-0.33, 0.33):
        b = (0.04, 0.12, 1.6) if axis == 'x' else (0.12, 0.04, 1.6)
        m.box((x + (i if axis == 'x' else 0) + dx * 0.12, y + (i if axis == 'y' else 0) + dy * 0.12, 2.0), b, HIJAU_TUA)


# ---------- tanah, rel, peron ----------
m.block(-26, -19, 26, -9, -1.0, -0.9, KERIKIL)
m.block(-26, -9, 26, 19, -0.3, 0, BETON)
m.block(-26, 9.2, 26, 19, 0, 0.03, BATU)
m.block(-26, -9.5, 26, -9, -1, 0, BETON)
m.block(-26, -8.9, 26, -8.55, 0, 0.012, KUNING_GARIS)
m.solid(0, -9.3, 52, 0.6, 1.3)
for yr in (-12.5, -16):
    for s in (-0.72, 0.72):
        m.block(-26, yr + s - 0.05, 26, yr + s + 0.05, -0.8, -0.68, k.besi)
    for i in range(-14, 14):
        m.block(i * 1.8 - 0.14, yr - 1.1, i * 1.8 + 0.14, yr + 1.1, -0.9, -0.8, BANTALAN)

# gerbong barang diam di jalur belakang
m.block(-23, -17.4, -6, -14.6, -0.2, 2.6, SENG2)
m.block(-23.2, -17.6, -5.8, -14.4, 2.6, 2.75, k.besi)

# ---------- atap peron ----------
for x in range(-20, 21, 5):
    for y in (-7.2, -2):
        m.cyl((x, y, 1.9), 0.09, 3.8, SAWO, 10, solid=True)
    m.box((x, -4.6, 3.8), (0.1, 6.0, 0.14), SAWO)
    # siku penguat rangka atap
    for y, d in ((-7.2, 1), (-2, -1)):
        m.rope((x, y, 3.2), (x, y + d * 0.7, 3.78), 0.03, SAWO, 0, 1, 6)
m.block(-21.5, -8.4, 21.5, -0.8, 3.92, 4.0, SENG)
m.life['atap'].append([-21.5, 0.8, 21.5, 8.4])
m.life['atap'].append([-16.3, -9.3, 16.3, -0.7])
for x in (-15, -5, 5, 15):
    k.scan('mounted_fluorescent_lights', x, -4.6, 0.14, rot=0, z=3.6, tris=300)
    lamp((x, -4.6, 3.45), 80, (1.0, 0.82, 0.58))
for x in (-12.5, 2.5):
    k.bangku(x, -2.2, 2.6, PAPAN)
    koper(x + 2.2, -2.6, 2)
k.scan('Barrel_01', -18, -1.9, 1.0, tris=600, tex=512, solid=True, spot='ringkuk')
k.scan('metal_trash_can', 18, -1.9, 0.95, tris=500, solid=True, spot='ringkuk')
k.scan('korean_public_payphone_01', 9, -2.1, 2.0, rot=3.14, tris=1200, tex=512)
m.solid(9, -2.2, 1.0, 0.8, 2.0)
m.spot(10, -2.2, 1, 0, 'nempel')
k.scan('hand_truck', 6.4, -1.8, 1.2, rot=0.4, tris=600)
k.scan('security_camera_02', 0, -4.6, 0.3, rot=3.14, z=3.45, tris=400)
k.scan('concrete_road_barrier_02', -22.5, -8.1, 0.8, rot=0, tris=600, solid=True)
k.scan('concrete_road_barrier_02', 22, -7.9, 0.8, rot=0.1, tris=600, solid=True)
k.lantai(26, -24, -8.4, 24, -0.6, 0.02)
k.scan('old_military_crate', -8, -7.3, 0.6, rot=0.1, tris=600, tex=512, solid=True, keep='old_military_crate_a')
k.scan('wooden_crate_02', -8, -7.3, 0.6, rot=0.4, z=0.6, tris=400)
m.solid(-8, -7.3, 1.1, 0.8, 1.2)
m.spot(-7.2, -7.3, 1, 0, 'ringkuk')
koper(14, -6.8, 3)
koper(-16, -6.6, 2)

# papan nama peron
for x in (-10, 10):
    m.box((x, -6.5, 3.05), (2.6, 0.08, 0.7), k.putih)
    m.text('STASIUN TUA', (x, -6.55, 3.05), 0.34, k.karet, depth=0.01)

# ---------- aula karcis ----------
HX0, HX1, HY0, HY1, HH = -16, 16, 1, 9, 4.8
m.block(HX0, HY0, HX1, HY1, 0, 0.03, UBIN)
for x0, x1 in ((-16, -9.2), (-6.8, -1.2), (1.2, 6.8), (9.2, 16)):
    m.block(x0, HY0 - 0.3, x1, HY0, 0, HH, TEMBOK, solid=True)
    m.block(x0, HY1, x1, HY1 + 0.3, 0, HH, TEMBOK, solid=True)
for x0, x1 in ((-9.2, -6.8), (-1.2, 1.2), (6.8, 9.2)):
    m.block(x0, HY0 - 0.3, x1, HY0, 2.7, HH, TEMBOK)
    m.block(x0, HY1, x1, HY1 + 0.3, 2.7, HH, TEMBOK)
m.block(HX0 - 0.3, HY0 - 0.3, HX0, HY1 + 0.3, 0, HH, TEMBOK, solid=True)
m.block(HX1, HY0 - 0.3, HX1 + 0.3, HY1 + 0.3, 0, HH, TEMBOK, solid=True)
m.block(HX0, HY0, HX1, HY1, HH - 0.02, HH, k.putih)
m.prism(HX0, HY0 - 0.3, HX1, HY1 + 0.3, HH, HH + 2.6, GENTENG, 'x', over=0.7)
for x in (-13, -4, 4, 13):
    jendela(x, HY0 - 0.3, 'x', -1)
    jendela(x, HY1 + 0.3, 'x', 1)
    m.spot(x - 1.2, HY0 - 0.72, 0, -1, 'nempel')
    m.spot(x + 1.2, HY1 + 0.72, 0, 1, 'nempel')
m.block(-16.3, HY0 - 0.34, 16.3, HY0 - 0.3, 0, 0.9, BATA)
m.block(-16.3, HY1 + 0.3, 16.3, HY1 + 0.34, 0, 0.9, BATA)
k.kotor('x', HY0 - 0.34, -16, 16, -1, 4.8)
k.kotor('x', HY1 + 0.34, -16, 16, 1, 4.8)
k.kotor('x', HY0, -16, 16, 1, 4.8, 3.2, False)
k.kotor('x', HY1, -16, 16, -1, 4.8, 3.2, False)
k.kotor('y', HX0 - 0.3, HY0, HY1, -1, 4.8)
k.kotor('y', HX1 + 0.3, HY0, HY1, 1, 4.8)
# lis atap dan talang
m.block(HX0 - 0.45, HY0 - 0.5, HX1 + 0.45, HY0 - 0.36, HH - 0.25, HH - 0.05, HIJAU_TUA)
m.block(HX0 - 0.45, HY1 + 0.36, HX1 + 0.45, HY1 + 0.5, HH - 0.25, HH - 0.05, HIJAU_TUA)
for x in (-16, -8, 8, 16):
    m.cyl((x, HY0 - 0.42, HH / 2), 0.05, HH, HIJAU_TUA, 8)
    m.cyl((x, HY1 + 0.42, HH / 2), 0.05, HH, HIJAU_TUA, 8)
m.text('STASIUN', (0, 9.34, 3.5), 0.8, HIJAU_TUA, rot=(math.pi / 2, 0, math.pi))
# loket karcis, bangku, jam
m.block(-15.4, 7.4, -10, 8.0, 0, 1.15, PAPAN2, solid=True)
m.block(-15.4, 8.0, -10, 9.0, 1.15, 2.6, k.kaca)
m.text('LOKET', (-12.7, 7.36, 2.9), 0.36, HIJAU_TUA, depth=0.01)
m.spot(-9.5, 7.6, -1, 0, 'nempel')
for x, y in ((-4, 3.4), (4, 3.4), (-4, 6.8), (4, 6.8)):
    k.bangku(x, y, 3, PAPAN)
    m.spot(x + 2.0, y, 1, 0, 'duduk')
for x in (-7.8, 0, 7.8):
    m.cyl((x, 5, HH / 2), 0.3, HH, TEMBOK2, 14, solid=True)
k.scan('wall_clock', 0, 1.02, 0.8, rot=3.14, z=2.8, tris=500, tex=512)
for x in (-10, 0, 10):
    m.box((x, 5, HH - 0.2), (1.4, 0.3, 0.1), k.lampu)
    lamp((x, 5, HH - 0.5), 150, (1.0, 0.86, 0.66), 0.5)
koper(10, 3.2, 3)
k.peti(13.5, 7.8, PAPAN, 2)

# ---------- halaman depan (utara) ----------
for x in (-20, -8, 8, 20):
    k.scan('street_lamp_02', x, 12, 4.4, rot=1.57, tris=800, tex=512)
    m.solid(x, 12, 0.3, 0.3, 4)
    lamp((x, 12, 4.0), 70)
for x, y, w, d in ((-12, 13, 5, 2.6), (3, 15, 6, 3), (14, 12, 3, 2), (-4, 11.5, 3, 1.5), (18, 16.5, 5, 2)):
    genangan(x, y, w, d)
for i, (x, y) in enumerate(((-14, 15.5), (-5, 16.6), (11, 16))):
    # becak: kabin dan tiga roda
    c = (k.merah, k.biru, HIJAU_TUA)[i]
    # badan melengkung, jok, kap lipat, sandaran kaki, stang, dan sadel pengayuh
    m.ball((x, y + 0.05, 0.86), 0.62, c, (1, 0.8, 0.62))
    m.box((x, y - 0.05, 0.92), (0.96, 0.5, 0.14), KOPER)
    m.box((x, y + 0.26, 1.2), (0.96, 0.12, 0.5), KOPER)
    m.solid(x, y, 1.2, 1.1, 1.5)
    m.ball((x, y + 0.2, 1.42), 0.6, SENG2, (1, 0.72, 0.7))
    for s in (-0.56, 0.56):
        m.rope((x + s, y + 0.3, 0.9), (x + s, y - 0.3, 1.72), 0.012, k.besi, 0, 1, 6)
    m.box((x, y - 0.56, 0.5), (0.9, 0.34, 0.04), k.besi)
    m.rope((x, y - 0.5, 0.56), (x, y - 1.25, 0.72), 0.03, k.besi, 0, 1, 6)
    m.rope((x, y - 1.3, 0.34), (x, y - 1.3, 1.0), 0.02, k.besi, 0, 1, 6)
    m.rope((x - 0.26, y - 1.3, 1.0), (x + 0.26, y - 1.3, 1.0), 0.015, k.besi, 0, 1, 6)
    m.ball((x, y - 0.9, 0.98), 0.1, k.karet, (0.9, 1.3, 0.35))
    for dx, dy in ((-0.6, 0), (0.6, 0), (0, -1.3)):
        k.roda((x + dx, y + dy, 0.33), 1.5708, 0.3, k.karet, 0.03, 10, k.besi)
    m.spot(x + 1.0, y, 1, 0, 'ringkuk')
k.scan('covered_car', -19, 15.5, 1.55, rot=0.05, tris=2400, tex=512, solid=True)
m.spot(-16.4, 15.5, 1, 0, 'ringkuk')
k.motor(6.5, 12.6, 0.3, k.merah)
k.motor(16, 14.6, 2.7, HIJAU_TUA)
k.scan('fire_hydrant', -2.4, 13, 0.75, rot=0.6, tris=500, tex=512)
k.lantai(24, -24, 9.6, 24, 18.6, 0.04)
k.kotor('x', 19, -25, 25, -1, 2.2, 3, True)
m.scatter('detail_rumput', MK / 'Grass_Common_Short.gltf', [(m.rnd.uniform(-25, 25), m.rnd.choice((18.6, 18.8))) for _ in range(44)], 0.3)
for x, h in ((-22, 7), (22.5, 8), (-1, 7)):
    m.foliage_gltf(MK / 'CommonTree_2.gltf', (x, 17.8, 0), h, x)
    m.solid(x, 17.8, 0.6, 0.6, 3)
m.block(-26, 19, 26, 19.6, 0, 2.2, BATA, solid=True)
m.block(-26, -19.6, -25.6, 19.6, 0, 3, BATA, solid=True)
m.block(25.6, -19.6, 26, 19.6, 0, 3, BATA, solid=True)
m.spot(-3, 18.5, 0, -1, 'nempel')
m.spot(12, 18.5, 0, -1, 'nempel')

# ---------- gudang barat ----------
m.block(-25.4, 0.5, -17.4, 8.6, 0, 0.1, BETON)
m.block(-25.6, 0.3, -17.4, 0.5, 0, 3.4, SENG2, solid=True)
m.block(-25.6, 8.6, -17.4, 8.8, 0, 3.4, SENG2, solid=True)
m.block(-25.8, 0.1, -17.2, 9.0, 3.4, 3.5, SENG)
m.life['atap'].append([-25.8, -9.0, -17.2, -0.1])
k.peti(-23.5, 6.8, PAPAN, 3)
k.peti(-20.5, 2.4, PAPAN, 3)
k.peti(-23.6, 2.8, PAPAN2, 2)
k.scan('wooden_barrels_01', -20.8, 6.6, rot=0.2, w=2.2, tris=1000, tex=512, solid=True)
k.scan('rusted_wheel_rim_01', -18.2, 8.2, 0.5, tris=500)
lamp((-21, 4.5, 3.1), 40)
m.spot(-19.6, 7, 1, 0, 'ringkuk')

# ---------- menara air dan sinyal timur ----------
for dx, dy in ((-1.4, -1.4), (1.4, -1.4), (-1.4, 1.4), (1.4, 1.4)):
    m.cyl((21 + dx, 3.8 + dy, 2.8), 0.1, 5.6, k.besi, 8, solid=True)
m.cyl((21, 3.8, 6.6), 2.0, 2.2, SENG, 16)
m.cyl((23, -7.8, 2.2), 0.08, 4.4, k.besi, 8, solid=True)
m.box((23, -7.8, 4.4), (0.4, 0.25, 0.8), k.karet)
m.cyl((23, -7.94, 4.6), 0.09, 0.04, SINYAL, 10, rot=(math.pi / 2, 0, 0))
lamp((23, -8.2, 4.5), 16, (1, 0.2, 0.15))
m.block(19.2, 2, 22.8, 5.6, 0, 0.1, BETON)
k.tong(19.4, 7, k.biru)

# genangan peron
for x, y, w, d in ((-23, -5, 3, 2), (23, -3, 2.5, 3)):
    genangan(x, y, w, d)

# ---------- kereta yang melintas ----------
with m.moving('kereta', (0, -12.5, 0)):
    m.box((0, -12.5, 0.9), (5.4, 2.6, 2.3), LOKO)
    m.box((-1.4, -12.5, 2.4), (2.4, 2.4, 0.9), LOKO)
    m.box((2.8, -12.5, 0.8), (0.3, 2.0, 1.2), k.merah)
    for i in range(1, 5):
        x = -i * 15.2 + 5
        m.box((x, -12.5, 1.1), (14, 2.8, 2.5), GERBONG if i % 2 else GERBONG2)
        m.box((x, -12.5, 2.42), (14.2, 2.9, 0.14), k.besi)
        for f in (-5, 5):
            m.box((x + f, -12.5, -0.05), (2.2, 2.2, 0.3), k.besi)
            for g in (-0.8, 0.8):
                m.cyl((x + f + g, -13.3, -0.16), 0.32, 0.1, k.karet, 12, rot=(math.pi / 2, 0, 0))
                m.cyl((x + f + g, -11.7, -0.16), 0.32, 0.1, k.karet, 12, rot=(math.pi / 2, 0, 0))
        for j in range(7):
            for s in (-1.42, 1.42):
                m.box((x - 5.6 + j * 1.9, -12.5 + s, 1.5), (1.2, 0.03, 0.8), JENDELA)

m.spawn['seeker'] = [[18, 5], [18, 3.4]]
m.spawn['hider'] = [[-6, -5], [-3, -5], [1.6, -5], [3, -5], [6, -5], [-6, -3.6], [1.6, -3.6], [6, -3.6]]
m.life['merpati'] = [[-6, 0.05, 4.8], [15, 0.05, 3.5]]
m.life['kucing'] = [[[-14, 4.8], [-1, 5], [-1, -3.8], [12, -4.6], [-1, -3.8], [-1, 5]]]
m.life['warga'] = [[[0, -5], [-14, -5], [-14, -3.6], [14, -3.6], [14, -5]], [[8.6, -0.4], [8.6, 5], [8.6, 11], [-8.6, 11], [-8.6, 5], [-8.6, -0.4]]]
m.life['asap'] = []

m.sun = set_sky('belfast_sunset_puresky_2k.hdr', 0.75, 0.8, (0.8, 0.8, 1.0), min_elevation=35)
m.finish()
