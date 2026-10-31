# Map Pabrik Permen (Petak Cat): aula pabrik, sungai sirup, ban berjalan, tong aduk, gigi mesin, dan permen raksasa.
# Jalankan: blender --background --python scripts/blender/petak_pabrik.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, noise, set_sky  # noqa: E402
from petak_kit import Kit  # noqa: E402

import numpy as np  # noqa: E402

m = Map('pabrik', 31, lm=4096)
k = Kit(m)
H = 8.0


def garis(a, b, size=128, n=8):
    """garis miring dua warna, berulang mulus"""
    y, x = np.mgrid[0:size, 0:size] / size
    s = (np.floor((x + y) * n) % 2)[..., None]
    return np.array(a) * s + np.array(b) * (1 - s)


def spiral(a, b, size=256):
    y, x = np.mgrid[0:size, 0:size] / size - 0.5
    r, t = np.hypot(x, y), np.arctan2(y, x)
    s = (np.floor((t / math.tau + r * 4) * 6) % 2)[..., None]
    return np.array(a) * s + np.array(b) * (1 - s)


def ban(size=256):
    """karet ban berjalan dengan permen tergambar di atasnya; digeser di shader"""
    y, x = np.mgrid[0:size, 0:size] / size
    a = np.ones((size, size, 3)) * 0.13 + 0.05 * (np.floor(x * 16) % 2)[..., None]
    pal = ((1, 0.25, 0.6), (1, 0.8, 0.2), (0.3, 0.85, 0.5), (0.35, 0.6, 1))
    for i in range(8):
        cx, cy = (i + 0.5) / 8, 0.3 + 0.4 * (i % 2)
        d = np.hypot(x - cx, (y - cy) * 1.0)
        a[d < 0.05] = pal[i % 4]
        a[(np.abs(y - cy) < 0.02) & (np.abs(x - cx) < 0.085)] = pal[i % 4]
    return a


LANTAI = m.tex('lantai', 'large_floor_tiles_02', 2.4, '#ffeef4', rough=0.3)
BATA = m.tex('bata', 'painted_worn_brick', 1.4, '#ffc6dc')
BETON = m.tex('beton', 'concrete_tiles', 2.4)
SENG = m.tex('seng', 'corrugated_iron_02', 1.8, rough=0.4)
KARAT = m.tex('karat', 'rusty_corrugated_iron', 1.6, rough=0.5)
PAPAN = m.tex('papan', 'distressed_painted_planks', 1.6)
KARDUS = m.tex('kardus', 'plywood', 1.2)
PERMEN = [m.image('permen_pink', garis((1, 0.35, 0.65), (1, 0.95, 0.97)), 0.25), m.image('permen_mint', garis((0.3, 0.85, 0.65), (1, 1, 0.96)), 0.25), m.image('permen_kuning', garis((1, 0.78, 0.2), (1, 0.97, 0.9)), 0.25)]
LOLI = [m.image('loli0', spiral((1, 0.25, 0.55), (1, 0.9, 0.95)), 0.2), m.image('loli1', spiral((0.25, 0.6, 1), (1, 0.95, 0.5)), 0.2), m.image('loli2', spiral((0.3, 0.9, 0.5), (1, 0.45, 0.2)), 0.2)]
BAN = m.image('belt_karet', ban(), 0.6, tile=2.0)
SIRUP = m.flat('air_sirup', '#ff4f9a', 0.08)
BESI2 = m.flat('baja', '#9aa4ad', 0.3, 0.9)
TEMBAGA = m.flat('tembaga', '#c9743a', 0.3, 0.9)
GUMMY = [m.flat(f'gummy{i}', c, 0.15) for i, c in enumerate(('#ff3f7f', '#ffb21f', '#45d17a', '#46a6ff', '#b65cff'))]
PANEL = m.flat('neon_atap', '#fff0e0', 0.4, emit=3)
TERANG = m.flat('neon_luar', '#fff6e0', 0.4, emit=4)


def tumpah():
    """sirup menggenang: bercak merah muda mengilap"""
    r = np.random.default_rng(9)
    y, x = np.mgrid[0:256, 0:256] / 256
    a = np.clip((noise(256, r, 5) - 0.32 - np.hypot(x - 0.5, y - 0.5) * 0.75) * 9, 0, 1)
    return np.dstack([np.full_like(a, 0.95), np.full_like(a, 0.2), np.full_like(a, 0.5), a * 0.9])


SIRUP_TUMPAH = m.decal_tex('decal_sirup', tumpah().astype(np.float32))


def lolipop(x, y, h, i, r=1.6):
    m.cyl((x, y, h / 2), 0.12, h, k.putih, 10, solid=True)
    m.picture((x, y - 0.14, h), r * 2, r * 2, LOLI[i % 3], 'x', -1)
    m.picture((x, y + 0.14, h), r * 2, r * 2, LOLI[i % 3], 'x', 1)
    m.cyl((x, y, h), r, 0.26, LOLI[i % 3], 28, rot=(math.pi / 2, 0, 0))
    m.spot(x + 0.5, y, 1, 0, 'pohon')


def tongkat(x, y, h, i):
    """permen tongkat berkait di puncak"""
    for t in range(4):
        m.cyl((x, y, 0.5 + t * (h / 4)), 0.3, h / 4, PERMEN[i % 3], 14, solid=t == 0)
    for s in range(9):
        a = s / 8 * math.pi
        m.ball((x + 0.7 - math.cos(a) * 0.7, y, h + math.sin(a) * 0.7), 0.3, PERMEN[i % 3])
    m.spot(x, y + 0.6, 0, 1, 'nempel')


def gummy(x, y, r, i):
    # beruang permen: badan, kepala, telinga, tangan, dan kaki
    g = GUMMY[i % 5]
    m.ball((x, y, r * 0.8), r * 0.82, g, (1, 0.85, 1.1))
    m.ball((x, y, r * 1.85), r * 0.58, g, (1, 0.9, 0.95))
    for s in (-1, 1):
        m.ball((x + s * r * 0.42, y, r * 2.32), r * 0.2, g)
        m.ball((x + s * r * 0.8, y - r * 0.2, r * 1.15), r * 0.26, g, (1.1, 1, 0.8))
        m.ball((x + s * r * 0.5, y - r * 0.3, r * 0.26), r * 0.3, g, (1, 1.2, 0.8))
        m.ball((x + s * r * 0.2, y - r * 0.52, r * 1.95), r * 0.07, k.karet)
    m.ball((x, y - r * 0.56, r * 1.75), r * 0.1, k.karet)
    m.solid(x, y, r * 2, r * 2, r * 2.3)
    m.spot(x + r + 0.45, y, 1, 0, 'ringkuk')


def tong_aduk(x, y, name, i):
    m.cyl((x, y, 1.6), 2.4, 3.2, BESI2, 24, solid=True)
    m.cyl((x, y, 3.28), 2.5, 0.16, TEMBAGA, 24)
    m.cyl((x, y, 3.3), 2.2, 0.04, GUMMY[i], 24)
    m.spot(x + 2.85, y, 1, 0, 'nempel')
    m.spot(x - 2.85, y, -1, 0, 'nempel')
    with m.moving(name, (x, y, 0)):
        m.cyl((x, y, 4.2), 0.14, 2.4, BESI2, 10)
        m.box((x, y, 3.5), (3.6, 0.2, 0.5), BESI2)
        m.box((x, y, 3.5), (0.2, 3.6, 0.5), BESI2)


def ban_berjalan(x0, x1, y):
    m.block(x0, y - 0.8, x1, y + 0.8, 0.6, 0.9, BESI2, solid=True)
    m.block(x0, y - 0.7, x1, y + 0.7, 0.9, 0.93, BAN)
    # bibir pengaman dan rol di tepi ban
    for s in (-1, 1):
        m.block(x0, y + s * 0.74, x1, y + s * 0.86, 0.9, 1.06, TEMBAGA)
    for x in (x0, x1):
        m.cyl((x, y, 0.75), 0.17, 1.5, BESI2, 14, rot=(math.pi / 2, 0, 0))
    for x in np.arange(x0 + 0.5, x1, 2.5):
        m.box((float(x), y, 0.3), (0.3, 1.5, 0.6), k.besi)
    m.spot((x0 + x1) / 2, y + 1.3, 0, 1, 'tiarap')
    m.spot(x1 + 0.5, y, 1, 0, 'jongkok')


def gigi(name, x, y, z, r, axis):
    """roda gigi menempel dinding; axis 'y' = menghadap sumbu y Blender"""
    with m.moving(name, (x, y, z)):
        rot = (math.pi / 2, 0, 0) if axis == 'y' else (0, math.pi / 2, 0)
        m.cyl((x, y, z), r, 0.3, KARAT, 24, rot=rot)
        m.cyl((x, y, z), r * 0.25, 0.5, TEMBAGA, 12, rot=rot)
        n = 12
        for i in range(n):
            a = i / n * math.tau
            c, s = math.cos(a) * (r + 0.18), math.sin(a) * (r + 0.18)
            if axis == 'y':
                b = m.box((x + c, y, z + s), (0.38, 0.28, 0.42), KARAT)
                b.rotation_euler = (0, -a, 0)
            else:
                b = m.box((x, y + c, z + s), (0.28, 0.38, 0.42), KARAT)
                b.rotation_euler = (a, 0, 0)


# ---------- ruang ----------
m.block(-25, -18, 25, 18, -0.4, 0, LANTAI)
for x0, y0, x1, y1 in ((-25, -18.4, 25, -18), (-25, 18, 25, 18.4), (-25.4, -18.4, -25, 18.4), (25, -18.4, 25.4, 18.4)):
    m.block(x0, y0, x1, y1, 0, H, BATA, solid=True)
m.block(-25.4, -18.4, 25.4, 18.4, H, H + 0.3, SENG)
for x in (-16, -8, 0, 8, 16):
    m.box((x, 0, H - 0.5), (0.4, 36, 0.8), KARAT)
    for y in (-11, 0, 11):
        m.block(x - 2, y - 1, x + 2, y + 1, H - 0.08, H, PANEL)
        lamp((x, y, H - 1.4), 420, (1.0, 0.92, 0.86), 1.0)
m.text('PABRIK PERMEN', (0, -18.0, 6.3), 1.3, GUMMY[0], rot=(math.pi / 2, 0, math.pi))
for a, f, a0, a1, o in (('x', -18, -25, 25, 1), ('x', 18, -25, 25, -1), ('y', -25, -18, 18, 1), ('y', 25, -18, 18, -1)):
    k.kotor(a, f, a0, a1, o, H, 3.6, a == 'x')
    t, L = (a0 + a1) / 2, a1 - a0
    P = (lambda q, z: (t, f + o * q, z)) if a == 'x' else (lambda q, z: (f + o * q, t, z))
    S = (lambda d, z: (L, d, z)) if a == 'x' else (lambda d, z: (d, L, z))
    m.box(P(0.06, 0.45), S(0.14, 0.9), BETON)
    m.box(P(0.05, 3.3), S(0.1, 0.12), BETON)
    # pita permen di sepanjang dinding
    m.box(P(0.04, 1.2), S(0.08, 0.6), PERMEN[0], bevel=0)
    m.box(P(0.05, 2.45), S(0.1, 0.28), PERMEN[1], bevel=0)
# jendela tinggi berbingkai besi, bercahaya dari luar
for x in (-21, -15, 15, 21):
    for f, o, r in ((-18, 1, 0), (18, -1, 3.14)):
        m.block(x - 1.1, f - 0.01, x + 1.1, f + 0.01, 3.6, 6.8, TERANG)
        k.scan('modular_factory_facade', x, f + o * 0.04, rot=r, z=3.6, h=3.2, tris=500, tex=1024, keep='window_tall_large_02')

# ---------- sungai sirup melintang dengan tiga jembatan ----------
m.block(-25, -1.8, 25, 1.8, -0.3, 0.02, BESI2)
m.block(-25, -1.5, 25, 1.5, 0.02, 0.05, SIRUP)
for x0, x1 in ((-25, -16), (-12, -2), (2, 12), (16, 25)):
    m.solid((x0 + x1) / 2, 0, x1 - x0, 3.2, 1.2)
    for y in (-1.75, 1.75):
        m.block(x0, y - 0.05, x1, y + 0.05, 0.02, 0.8, TEMBAGA)
for x in (-14, 0, 14):
    m.block(x - 2, -2, x + 2, 2, 0.05, 0.16, PAPAN)

# ---------- utara ----------
ban_berjalan(-22, -5, 8.5)
ban_berjalan(5, 22, 8.5)
ban_berjalan(-22, -8, 14)
tong_aduk(0, 11, 'putar_aduk1', 0)
tong_aduk(14, 14, 'putar_aduk2', 2)
gigi('putar_gigi1', -12, 17.8, 5, 2.2, 'y')
gigi('putar_gigi2', -7.9, 17.8, 5.6, 1.5, 'y')
gigi('putar_gigi3', 24.8, 4.5, 5, 2.0, 'x')

# ---------- selatan: gudang permen raksasa ----------
for i, (x, y, h) in enumerate(((-18, -6, 6), (-9, -9, 5), (9, -6, 6.4), (18, -10, 5.4), (0, -13, 5.8))):
    lolipop(x, y, h, i)
for i, (x, y, h) in enumerate(((-21, -14, 4), (-13, -15, 4.6), (5, -15, 4.2), (21, -5, 4.4), (-4.5, -6.5, 3.8))):
    tongkat(x, y, h, i)
for i, (x, y, r) in enumerate(((-14, -11, 1.3), (-5, -10.5, 1.0), (13.5, -13, 1.5), (5, -8.5, 1.1), (22, -15.5, 1.2), (-22, -9, 1.1))):
    gummy(x, y, r, i)
for x, y, n in ((-2, -5, 2), (13, -4, 3), (-19, -3.5, 2)):
    for i in range(n):
        k.scan('cardboard_box_01', x, y, 0.5, rot=i * 0.25, z=i * 0.5, tris=200, tex=512)
    m.solid(x, y, 0.9, 0.9, n * 0.5)
    m.spot(x + 0.75, y, 1, 0, 'ringkuk')
for i, (x, y) in enumerate(((-23.5, 16), (23.5, 3.5), (-23.5, 3.5))):
    k.scan(('Barrel_01', 'Barrel_02', 'industrial_pastic_container')[i], x, y, 1.1, tris=700, tex=512, solid=True, spot='ringkuk')

# ---------- bengkel dan gudang kecil ----------
k.scan('worn_metal_rack', -23.6, -5.5, 2.3, rot=1.57, tris=1000, tex=512)
m.solid(-23.8, -5.5, 0.7, 2.2, 2.3)
k.scan('steel_frame_shelves_02', 24.2, -5.4, 2.2, rot=-1.57, tris=800, tex=512)
m.solid(24.2, -5.4, 0.6, 2.2, 2.2)
for x, y, z, pid, h in ((-23.7, -6.1, 0.96, 'plastic_jerrycan', 0.4), (-23.7, -5, 1.5, 'metal_jerrycan', 0.4), (24.2, -5.9, 0.92, 'propane_tank', 0.42), (24.2, -5, 1.46, 'cardboard_box_01', 0.34)):
    k.scan(pid, x, y, h, z=z, tris=300)
k.scan('drill_press_01', 23.4, -12.5, 1.8, rot=-1.57, tris=1600, tex=512, solid=True)
k.scan('tool_cart', 22, 7, 0.9, rot=0.4, tris=800, tex=512, solid=True, spot='ringkuk')
k.scan('metal_tool_chest', 23.7, -14.2, 1.0, rot=-1.57, tris=800, tex=512, solid=True)
k.scan('old_military_compressor', -8, 16.8, 0.9, rot=3.14, tris=1400, tex=512, solid=True, spot='ringkuk')
k.scan('industrial_storage_cart', 3.5, 5.2, 0.95, rot=0.2, tris=800, tex=512, solid=True)
k.scan('hand_truck', -4.5, 4.4, 1.2, rot=2.4, tris=500)
k.scan('WetFloorSign_01', -10, -4, 0.62, rot=0.6, tris=300)
for x, y, r in ((-24.95, 12, 1.57), (24.95, -2.8, -1.57), (2.5, 17.95, 3.14)):
    k.scan('power_box_01', x, y, 0.7, rot=r, z=1.25, tris=500)
for x, y, r in ((-24.95, -11, 1.57), (24.95, 12, -1.57)):
    k.scan('korean_fire_extinguisher_01', x, y, 0.6, rot=r, tris=400)

# ---------- plafon: saluran udara, lampu gantung, dan derek ----------
for y in (-14.5, 5, 14.5):
    for i in range(14):
        k.scan('modular_airduct_rectangular_01', -23.4 + i * 3.6, y, rot=1.57, z=H - 1.05, w=3.6, tris=260, tex=512, keep='modular_airduct_rectangular_01_tripple_01')
for x in (-16, 0, 16):
    for y in (-6, 6):
        k.scan('hanging_industrial_lamp', x, y, 1.6, rot=0, z=H - 1.7, tris=500, tex=512)
k.scan('overhead_crane', 8, 8.5, rot=0, z=H - 2.4, w=24, tris=3000, tex=1024, keep='overhead_crane')
k.scan('overhead_crane', -8, -9, rot=0, z=H - 2.4, w=24, tris=3000, tex=1024, keep='overhead_crane')

# ---------- noda lantai ----------
for i in range(7):
    s = m.rnd.uniform(1.2, 2.4)
    m.decal((m.rnd.uniform(-23, 23), m.rnd.uniform(-16, 16), 0.012 + i * 0.0004), s, s, m.rnd.choice((k.dec['oli'], k.dec['retak'])))
for x, y, s in ((-10, -3, 3), (9, 4, 2.4), (-4, 3.6, 2), (17, 3, 3), (6, -3.2, 2.6)):
    m.decal((x, y, 0.016), s, s, SIRUP_TUMPAH)

# ---------- pipa ----------
for a, b in (((-12, 15, 5), (0, 11, 7)), ((0, 11, 7), (14, 14, 7)), ((14, 14, 7), (24.7, 10, 6))):
    m.rope(a, b, 0.22, TEMBAGA, 0, 1, 12)
for p in ((0, 11, 7), (14, 14, 7), (-12, 15, 5)):
    m.ball(p, 0.3, TEMBAGA)
    m.cyl(p, 0.32, 0.1, k.besi, 14)

m.spawn['seeker'] = [[23.5, 8.5], [23.5, 10.5]]
m.spawn['hider'] = [[-6, 5], [-3, 5], [0, 5], [3, 5], [6, 5], [-6, 3.2], [0, 3.2], [6, 3.2]]
m.life['warga'] = [[[-23, -4], [-14, -3.4], [-14, 4], [-3, 5], [14, 4], [14, -3.4], [23, -3.4], [14, -3.4], [14, 4], [-3, 5], [-14, 4], [-14, -3.4]]]
m.life['kucing'] = [[[-3.5, -3.4], [-14, 3.4], [14, 3.4], [3.5, -3.4]]]
m.life['merpati'] = []
m.life['atap'] = [[-26, -26, 26, 26]]
m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 0.1, 0.0, min_elevation=40)
m.finish()
