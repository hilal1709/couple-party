# Map Kota Terbalik (Petak Cat): gedung berdiri di atas atapnya, jalan raya dan mobil menggantung di langit.
# Jalankan: blender --background --python scripts/blender/petak_kota.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, set_sky  # noqa: E402
from petak_kit import MK, Kit  # noqa: E402

m = Map('kota', 41, lm=4096)
k = Kit(m)
LANGIT = 15.0

PLAZA = m.tex('plaza', 'rectangular_paving', 2.4, rough=0.5)
ASPAL = m.tex('aspal', 'asphalt_02', 4.0)
GENTENG = m.tex('genteng', 'clay_roof_tiles', 2.0)
BATA = m.tex('bata', 'brick_4', 1.8)
TEMBOK = [m.tex('tembok_krem', 'concrete_wall_008', 3.0, '#ffe4b8'), m.tex('tembok_biru', 'concrete_wall_008', 3.0, '#a8d0ff'), m.tex('tembok_pink', 'concrete_wall_008', 3.0, '#ffb0c4'), m.tex('tembok_hijau', 'concrete_wall_008', 3.0, '#b6eab0')]
BETON = m.tex('beton', 'concrete_tiles', 3.0)
KACA = m.flat('kaca_gedung', '#7fb2cc', 0.08, 0.6)
AWAN = m.flat('awan', '#ffffff', 0.9)
PAPAN = m.tex('papan', 'blue_painted_planks', 1.6)
MOBIL = [m.flat(f'mobil{i}', c, 0.25, 0.3) for i, c in enumerate(('#e0332b', '#f2c21a', '#2f6fd0', '#3aa655'))]


FACADE = 'modular_urban_apartments_facade'
PANEL = ('wall_window_centered_double_01', 'wall_standard_standard_01', 'wall_window_centered_large_01')
KACA_FACADE = {'wall_window_centered_double_01': 'window_centered_double_01', 'wall_window_centered_large_01': 'window_centered_large_01'}


def sisi(a0, a1, f, along, out, atap, h, i):
    """satu sisi gedung dari panel fasad 3×3 m, dipasang terbalik: kaki jendela menghadap langit"""
    n = max(1, round((a1 - a0) / 3))
    w = (a1 - a0) / n
    rows = max(1, int((h - atap) / 3))
    hh = (h - atap) / rows
    # model menghadap -y; dibalik sumbu x menjadi +y
    rot = {('x', -1): 3.14159, ('x', 1): 0, ('y', 1): 1.5708, ('y', -1): -1.5708}[(along, out)]
    for r in range(rows):
        for c in range(n):
            t = a0 + (c + 0.5) * w
            pid = PANEL[(c + r * 2 + i) % 3]
            x, y = (t, f) if along == 'x' else (f, t)
            k.scan(FACADE, x, y, rot=rot, z=atap + (r + 1) * hh, w=w, tris=180, tex=1024, keep=pid, flip=True)
            if pid in KACA_FACADE:
                dx, dy = (0, out * 0.02) if along == 'x' else (out * 0.02, 0)
                k.scan(FACADE, x + dx, y + dy, rot=rot, z=atap + (r + 1) * hh - 0.34, h=2.3 * w / 3, tris=180, tex=1024, keep=KACA_FACADE[pid], flip=True)


def gedung(x0, y0, x1, y1, h, i, atap=2.2):
    """berdiri di atas pucuk atapnya: atap di bawah, pintu dan pondasi di puncak"""
    t = TEMBOK[i % 4]
    m.prism(x0, y0, x1, y1, atap, 0, GENTENG, 'x' if x1 - x0 > y1 - y0 else 'y', over=0.3)
    m.block(x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, atap, h, t)
    sisi(x0, x1, y0, 'x', -1, atap, h, i)
    sisi(x0, x1, y1, 'x', 1, atap, h, i + 1)
    sisi(y0, y1, x0, 'y', -1, atap, h, i + 2)
    sisi(y0, y1, x1, 'y', 1, atap, h, i)
    m.solid((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0 + 0.5, y1 - y0 + 0.5, h)
    m.block(x0 - 0.3, y0 - 0.3, x1 + 0.3, y1 + 0.3, h, h + 0.5, BETON)
    # tangga darurat dan AC ikut terbalik
    k.scan('modular_fire_escape', x0 + 2.6, y0 - 0.45, rot=3.14159, z=h - 0.4, w=4.8, tris=500, tex=512, keep='modular_fire_escape_platform_middle', flip=True)
    k.scan('exterior_aircon_unit', x1 - 1.2, y1 + 0.4, rot=0, z=h - 2.6, h=0.7, tris=500, keep='exterior_aircon_unit_rusted', flip=True)
    # pintu di puncak dan tangga yang terbalik
    m.box(((x0 + x1) / 2, y0 - 0.06, h - 1.1), (1.1, 0.1, 2.1), PAPAN)
    for s in range(3):
        m.box(((x0 + x1) / 2, y0 - 0.3 - s * 0.3, h + s * 0.0 - 0.1 - s * 0.2), (1.6, 0.3, 0.2), BETON)
    # sudut bawah atap: celah sembunyi
    m.spot(x0 - 0.75, y0 - 0.75, -0.7, -0.7, 'nempel')
    m.spot(x1 + 0.75, y1 + 0.75, 0.7, 0.7, 'ringkuk')


def frange(a, b, step):
    out = []
    while a <= b:
        out.append(a)
        a += step
    return out


def mobil_langit(x, y, rot, i):
    """mobil menempel di jalan langit, rodanya ke atas"""
    k.scan(MOBIL_GLTF[i % len(MOBIL_GLTF)], x, y, rot=rot + 1.5708, z=LANGIT, w=4.2, tris=1500, tex=512, flip=True)


def lampu_langit(x, y):
    k.scan('street_lamp_01', x, y, 4, rot=1.5708 if y > 0 else -1.5708, z=LANGIT, tris=700, tex=512, flip=True)


def awan(x, y, z, s):
    for i in range(5):
        m.ball((x + (i - 2) * s * 0.9, y + m.rnd.uniform(-0.5, 0.5) * s, z + m.rnd.uniform(-0.3, 0.3) * s), s * (0.8 + m.rnd.random() * 0.5), AWAN, (1.3, 1, 0.7))


KAYKIT = 'D:/dev/asset-src/kaykit-city/x/KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf/'
MOBIL_GLTF = [KAYKIT + n + '.gltf' for n in ('car_sedan', 'car_taxi', 'car_hatchback', 'car_stationwagon', 'car_police')]


def rambu(x, y):
    m.cyl((x, y, 1.2), 0.05, 2.4, k.besi, 8, solid=True)
    m.box((x, y, 0.24), (0.7, 0.08, 0.7), k.kuning, 0.8)


# ---------- plaza ----------
m.block(-26, -19, 26, 19, -0.5, 0, PLAZA)
m.block(-26, -19, 26, 19, -3, -0.5, BETON)
for x0, y0, x1, y1 in ((-26, -19.3, 26, -19), (-26, 19, 26, 19.3), (-26.3, -19, -26, 19), (26, -19, 26.3, 19)):
    m.block(x0, y0, x1, y1, 0, 1.1, k.besi, solid=False)
m.solid(0, -19.4, 52, 0.8, 3)
m.solid(0, 19.4, 52, 0.8, 3)
m.solid(-25.8, 0, 0.8, 39, 3)
m.solid(25.8, 0, 0.8, 39, 3)

# ---------- gedung terbalik ----------
for i, g in enumerate((
    (-23, 6, -14, 15, 10), (-11, 8, -3, 16, 12), (4, 7, 12, 16, 9), (15, 5, 23, 15, 13),
    (-23, -15, -15, -7, 11), (-11, -16, -2, -8, 9), (5, -15, 13, -7, 12), (16, -16, 24, -8, 10),
)):
    gedung(*g, i)

# ---------- jalan di langit ----------
m.block(-26, -4.5, 26, 4.5, LANGIT, LANGIT + 0.6, ASPAL)
m.block(-4.5, -19, 4.5, 19, LANGIT, LANGIT + 0.6, ASPAL)
for x in range(-24, 25, 6):
    m.block(x, -0.14, x + 3, 0.14, LANGIT - 0.02, LANGIT, k.putih)
for i, (x, y, r) in enumerate(((-18, -2.4, 0), (-7, 2.2, 3.14), (9, -2.2, 0), (19, 2.4, 3.14), (2, 11, 1.57), (-2, -12, -1.57))):
    mobil_langit(x, y, r, i)
for x in (-22, -12, 12, 22):
    lampu_langit(x, 4.6)
    lampu_langit(x, -4.6)
for x, y, h in ((-9, 4.9, 7), (9, -4.9, 6.5), (20, 4.9, 6), (-20, -4.9, 7)):
    m.foliage_gltf(MK / 'CommonTree_1.gltf', (x, y, LANGIT), h, x, flip=True)

# ---------- pohon normal dan perabot jalan di plaza ----------
for x, y in ((-1, 4.5), (1, -5.2), (14, 1)):
    m.foliage_gltf(MK / 'Bush_Common_Flowers.gltf', (x, y, 0), 1.4, x)
    m.solid(x, y, 1.1, 1.1, 1.0)
    m.spot(x + 0.95, y, 1, 0, 'ringkuk')
for x, y in ((-20, 2), (-8, -3), (7, 3), (20, -3)):
    rambu(x, y)
for x, y in ((-13, 3.6), (11, -3.6)):
    k.bangku(x, y, 3, PAPAN)
    m.spot(x + 2, y, 1, 0, 'duduk')
k.tong(-5, 4.8, k.hijau)
k.tong(16, 3.8, k.biru)
k.tong(-16, -4, k.merah)
for i, (x, y) in enumerate(((-4, 1.8), (6, -2.2))):
    # mobil yang jatuh dan mendarat terbalik di plaza
    k.scan(MOBIL_GLTF[i + 2], x, y, rot=0.4 + 1.5708, z=1.55, w=4.2, tris=1500, tex=512, flip=True)
    m.solid(x, y, 4, 1.8, 1.3, 0.4)
    m.spot(x + 2.4, y + 1, 1, 0, 'nempel')

# ---------- perabot jalan ----------
k.lantai(40, -25, -18, 25, 18, 0.02)
k.scan('covered_car', -21.5, 3.4, 1.55, rot=0.1, tris=2400, tex=512, solid=True)
m.spot(-21.5, 0.9, 0, -1, 'ringkuk')
for x, y, r in ((-19, -3.2, 0), (19, 3.4, 3.14)):
    k.scan('concrete_road_barrier_02', x, y, 0.85, rot=r, tris=500, solid=True)
for x, y in ((10, 4.3), (-10, -4.4)):
    k.scan('fire_hydrant', x, y, 0.8, tris=500, tex=512)
k.scan('korean_public_payphone_01', 3.2, 5.4, 2.0, rot=0, tris=1200, tex=512, solid=True, spot='nempel')
k.scan('modular_street_seating', 17, -4.2, 0.9, rot=3.14, tris=1500, tex=512, solid=True)
for i, (x, y) in enumerate(((-5.6, 5.6), (6.4, 4.4), (15, -5))):
    k.scan(('trashbag', 'cardboard_box_01', 'old_tyre')[i], x, y, 0.5, tris=300)

# ---------- awan rendah ----------
for x, y, z, s in ((-18, 0, 7.5, 1.2), (18, 1, 6, 1.0), (0, -3, 10, 1.3), (-2, 18, 2.2, 1.5), (24, -18, 2.5, 1.4), (-24, -18, 1.6, 1.3)):
    awan(x, y, z, s)

m.spawn['seeker'] = [[24.5, -0.8], [24.5, 0.8]]
m.spawn['hider'] = [[-6, 0.4], [-3, 0.4], [0, 0.4], [3, 0.4], [-12, 0.4], [-14, 0.4], [12, 0.4], [14, 0.4]]
m.life['merpati'] = [[-10, 0.05, 0.5], [12, 0.05, -1.5]]
m.life['kucing'] = [[[-24, 0], [-2, -0.6], [2, 6], [2, -5.5], [24, 0], [2, 1], [-2, -6.5]]]
m.life['warga'] = [[[-24, 1], [24, 1], [24, -1], [-24, -1]], [[0, -5.8], [0, 5.8], [-13, 5], [-13, -5.8]]]
m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 3.4, 6.0, (1.0, 0.95, 0.85), min_elevation=62)
m.finish()
