# Map Pasar Malam (Petak Cat): malam penuh neon, lorong lapak, komidi putar, bianglala, dan panggung dangdut.
# Jalankan: blender --background --python scripts/blender/petak_pasar.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, set_sky  # noqa: E402
from petak_kit import MK, Kit  # noqa: E402

m = Map('pasar', 11, lm=4096)
k = Kit(m)

TANAH = m.tex('tanah', 'dirt_floor', 3.0)
KAYU = m.tex('kayu', 'plywood', 2.0)
PAPAN = m.tex('papan', 'distressed_painted_planks', 1.6)
PAPAN_TUA = m.tex('papan_tua', 'weathered_planks', 1.6)
SENG = m.tex('seng', 'rusty_corrugated_iron', 1.6, rough=0.6)
SENG2 = m.tex('seng_abu', 'corrugated_iron_02', 1.6, rough=0.5)
PANGGUNG = m.tex('panggung', 'old_wood_floor', 2.0)
KULIT = m.tex('jok', 'leather_red_02', 0.8)
TERPAL = [m.tex(f'sway_terpal{i}', 'denim_fabric', 1.2, c) for i, c in enumerate(('#ff6fb8', '#ffd24a', '#6fb4ff', '#7fe07a', '#ff8a4a'))]
KAIN = [m.tex(f'kain{i}', pid, 0.6, c) for i, (pid, c) in enumerate((('quatrefoil_jacquard_fabric', '#ff7ac4'), ('fabric_pattern_05', '#ffd24a'), ('fabric_pattern_07', '#8fe07a')))]
NEON = [m.flat(f'neon_{n}', c, 0.4, emit=7) for n, c in (('pink', '#ff37a6'), ('hijau', '#5cf64a'), ('biru', '#39c6ff'), ('kuning', '#ffd21f'))]
EMAS = m.flat('emas', '#d9a93a', 0.3, 0.8)
BARANG = [m.flat(f'barang{i}', c, 0.4) for i, c in enumerate(('#ff37a6', '#ffcc1f', '#3d8bff', '#e0332b', '#3aa655', '#ffffff'))]


BUAH = ('food_apple_01', 'food_lime_01', 'food_kiwi_01', 'food_pomegranate_01', 'food_avocado_01', 'lemon')
SAYUR = ('yellow_onion', 'sweet_potato', 'bananas')


def tumpuk(x, y, z, pid, n=5, h=0.17):
    """tumpukan buah di atas peti: model kecil dibesarkan sedikit supaya terbaca dari kamera"""
    for i in range(n):
        k.scan(pid, x + m.rnd.uniform(-0.12, 0.12), y + m.rnd.uniform(-0.11, 0.11), h, z=z + (i % 3) * 0.05, tris=90, tex=128)


def dagangan(x, y, z, i, jenis):
    """isi meja lapak menurut jenis dagangan"""
    if jenis == 0:
        k.scan('plastic_crate_02', x, y, 0.22, rot=0, z=z, tris=120)
        tumpuk(x, y, z + 0.16, BUAH[i % len(BUAH)])
    elif jenis == 1:
        k.scan(('rubber_duck_toy', 'boombox', 'Ukulele_01')[i % 3], x, y, (0.28, 0.3, 0.7)[i % 3], z=z, tris=420)
    elif jenis == 2:
        for t in range(3):
            m.box((x, y, z + 0.05 + t * 0.09), (0.4, 0.34, 0.08), KAIN[(i + t) % 3], 0.1 * t)
    elif jenis == 3:
        k.scan('wicker_basket_02', x, y, 0.26, z=z, tris=160)
        tumpuk(x, y, z + 0.14, SAYUR[i % len(SAYUR)], 4, 0.16)
    else:
        k.scan(('Lantern_01', 'CashRegister_01', 'plastic_crate_03')[i % 3], x, y, (0.36, 0.3, 0.26)[i % 3], z=z, tris=120)


def lapak(x0, front, w, arah, warna):
    """lapak terbuka ke lorong: `arah` +1 = tubuh lapak ke utara dari garis depan"""
    d = 3.4
    back = front + arah * d
    x1 = x0 + w
    y0, y1 = min(front, back), max(front, back)
    m.block(x0, y0, x1, y1, 0, 0.06, KAYU)
    m.block(x0, back, x1, back + arah * 0.1, 0, 2.5, PAPAN_TUA, solid=True)
    m.block(x0, y0, x0 + 0.1, y1, 0, 2.5, SENG, solid=True)
    m.block(x1 - 0.1, y0, x1, y1, 0, 2.5, SENG2, solid=True)
    m.block(x0 - 0.15, y0 - 0.5, x1 + 0.15, y1 + 0.5, 2.5, 2.56, TERPAL[warna % len(TERPAL)])
    # meja depan, sisakan celah untuk masuk ke belakang
    m.block(x0 + 1.7, front, x1 - 0.1, front + arah * 0.7, 0.06, 0.95, PAPAN, solid=True)
    for i in range(int(w * 1.6)):
        x = x0 + 1.9 + i * 0.5
        if x > x1 - 0.3:
            break
        dagangan(x, front + arah * 0.35, 0.95, i + warna, warna % 5)
    # rak belakang
    for z in (1.0, 1.65):
        m.block(x0 + 0.3, back - arah * 0.5, x1 - 0.3, back - arah * 0.1, z, z + 0.05, PAPAN_TUA)
        for i in range(int(w * 1.3)):
            if i % 3 == 2:
                k.scan('cardboard_box_01', x0 + 0.55 + i * 0.68, back - arah * 0.3, 0.3, z=z + 0.05, tris=120)
            else:
                m.box((x0 + 0.55 + i * 0.68, back - arah * 0.3, z + 0.19), (0.3, 0.26, 0.3), BARANG[(i * 2 + warna + int(z)) % len(BARANG)])
    # renteng dagangan bergoyang di bibir atap
    for i in range(int(w * 2)):
        x = x0 + 0.3 + i * 0.5
        m.cloth((x, front - arah * 0.2, 2.5), 0.2, 0.55, KAIN[i % 3], 0, sway=0.1, cols=2, rows=4)
    m.block(x0 + 0.4, front - arah * 0.46, x1 - 0.4, front - arah * 0.42, 2.58, 3.0, NEON[warna % 4])
    k.kotor('x', back - arah * 0.1, x0 + 0.2, x1 - 0.2, -arah, 2.5, 2.6, False)
    k.kotor('x', back + arah * 0.1, x0, x1, arah, 2.5, 2.4)
    k.scan('caged_hanging_light', (x0 + x1) / 2, (front + back) / 2, 0.4, rot=0, z=2.08, tris=400)
    k.scan('plastic_crate_03', x0 + 0.5, front + arah * 0.5, 0.3, z=0.06, tris=120)
    k.scan('wicker_basket_01', x0 + 0.95, back - arah * 0.7, 0.34, z=0.06, tris=160)
    # di bawah sangkar lampu, supaya cahayanya tidak tertahan model
    lamp(((x0 + x1) / 2, (front + back) / 2, 1.92), 300, (1.0, 0.75, 0.5))
    m.spot(x0 + 0.5, back - arah * 1.1, 1, 0, 'nempel')
    m.spot(x1 - 0.5, back - arah * 1.1, -1, 0, 'nempel')


# ---------- tanah & pagar ----------
m.block(-25, -20, 25, 20, -0.4, 0, TANAH)
for x0, y0, x1, y1 in ((-25, -20, 25, -19), (-25, 19, 25, 20), (-25, -20, -24, 20), (24, -20, 25, 20)):
    m.block(x0, y0, x1, y1, 0, 3.4, SENG, solid=True)
k.kotor('x', -19, -24, 24, 1, 3.4, 3.4)
k.kotor('x', 19, -24, 24, -1, 3.4, 3.4)
k.kotor('y', -24, -19, 19, 1, 3.4, 3.4)
k.kotor('y', 24, -19, 19, -1, 3.4, 3.4)
k.lantai(44, -23, -18, 23, 18)

# ---------- lorong lapak ----------
for i, x in enumerate(range(-22, 18, 7)):
    lapak(x, 9.5, 6, 1, i)
    lapak(x, -9.5, 6, -1, i + 2)

# ---------- panggung dangdut ----------
m.block(-23.5, -6, -18, 6, 0, 0.9, PANGGUNG, solid=True)
m.block(-23.8, -6.2, -23.5, 6.2, 0, 5.2, KULIT, solid=True)
m.text('DANGDUT MALAM MINGGU', (-23.4, 0, 4.2), 0.7, NEON[0], rot=(math.pi / 2, 0, math.pi / 2))
for y in (-5.4, 5.4):
    m.box((-19.2, y, 1.75), (0.8, 0.8, 1.7), k.karet, solid=True)
    for z, r in ((1.28, 0.28), (1.95, 0.22), (2.42, 0.1)):
        m.cyl((-18.78, y, z), r, 0.04, k.besi, 18, rot=(0, math.pi / 2, 0))
        m.cyl((-18.76, y, z), r * 0.45, 0.04, EMAS, 12, rot=(0, math.pi / 2, 0))
    m.cyl((-23, y, 3.0), 0.08, 6.0, k.besi, 8, solid=True)
    m.spot(-17.4, y, 1, 0, 'ringkuk')
m.block(-23, -6, -18.5, 6, 5.0, 5.1, k.besi)
lamp((-20.5, 3, 4.6), 420, (1.0, 0.3, 0.7))
lamp((-20.5, -3, 4.6), 420, (0.3, 0.7, 1.0))
for y in (-2.1, -1.3):
    m.block(-18, y, -17.2, y + 0.8, 0, 0.42, PANGGUNG, solid=True)
# rangka lampu, stan mik, dan peralatan band
for y0, y1 in ((-6, 0), (0, 6)):
    m.rope((-18.5, y0, 5.05), (-18.5, y1, 5.05), 0.04, k.besi, 0, 1, 8)
    m.rope((-18.5, y0, 5.05), (-18.5, (y0 + y1) / 2, 0.9), 0.02, k.besi, 0, 1, 6)
    m.rope((-18.5, y1, 5.05), (-18.5, (y0 + y1) / 2, 0.9), 0.02, k.besi, 0, 1, 6)
for y in (-2.2, 0, 2.2):
    m.cyl((-19.4, y, 1.55), 0.015, 1.3, k.besi, 6)
    m.ball((-19.4, y, 2.22), 0.04, k.karet)
    m.cyl((-19.4, y, 0.92), 0.14, 0.03, k.besi, 12)
k.scan('boombox', -21.5, 2.6, 0.5, rot=1.57, z=0.9, tris=600)
k.scan('Ukulele_01', -22.4, -2.2, 1.1, rot=1.2, z=0.9, tris=500)
k.scan('portable_generator', -22.6, 7.3, 0.8, rot=0.4, tris=800, tex=512, solid=True, spot='ringkuk')
m.rope((-22.2, 7.2, 0.3), (-23.4, 5.6, 0.92), 0.02, k.kabel, 0.5, 8)

def kuda(x, y, z, a, warna, surai):
    """kuda komidi putar: menghadap arah putaran, kaki berlari"""
    fx, fy = -math.sin(a), math.cos(a)
    sx, sy = fy, -fx
    p = lambda l, h, s=0.0: (x + fx * l + sx * s, y + fy * l + sy * s, z + h)  # noqa: E731
    m.ball(p(0, 0), 0.3, warna, (0.72, 1.7, 0.86), a)
    m.ball(p(0.34, 0.06), 0.28, warna, (0.76, 0.9, 0.9), a)
    m.rope(p(0.42, 0.14), p(0.68, 0.52), 0.11, warna, 0, 1, 10)
    m.ball(p(0.8, 0.52), 0.15, warna, (0.8, 1.7, 0.85), a)
    m.ball(p(0.68, 0.56), 0.13, warna, (0.9, 1, 1), a)
    for s in (-0.065, 0.065):
        m.cyl(p(0.66, 0.74, s), 0.03, 0.12, warna, 6, 0.004)
        m.ball(p(0.9, 0.58, s * 1.3), 0.022, k.karet)
    for i in range(6):
        t = i / 5
        m.ball(p(0.34 + t * 0.32, 0.26 + t * 0.42), 0.075, surai, (0.6, 1.2, 1), a)
    m.ball(p(0, 0.25), 0.24, EMAS, (0.95, 1.2, 0.26), a)
    for s in (-0.12, 0.12):
        m.rope(p(0.34, -0.1, s), p(0.55, -0.34, s), 0.06, warna, 0, 1, 8)
        m.rope(p(0.55, -0.34, s), p(0.82, -0.3, s), 0.045, warna, 0, 1, 8)
        m.rope(p(-0.34, -0.12, s), p(-0.58, -0.36, s), 0.065, warna, 0, 1, 8)
        m.rope(p(-0.58, -0.36, s), p(-0.84, -0.46, s), 0.045, warna, 0, 1, 8)
    m.rope(p(-0.46, 0.14), p(-0.76, -0.04), 0.05, surai, 0, 1, 8)
    m.rope(p(-0.76, -0.04), p(-0.92, -0.3), 0.035, surai, 0, 1, 8)


# ---------- komidi putar ----------
R = 4.6
for rot in (0, math.pi / 4):
    m.solid(0, 0, R * 1.86, R * 1.86, 3, rot)
m.cyl((0, 0, 0.15), R + 0.2, 0.3, PAPAN, 24)
lamp((0, 0, 7.2), 900, (1.0, 0.8, 0.55))
with m.moving('putar_komidi', (0, 0, 0)):
    m.cyl((0, 0, 0.4), R, 0.2, EMAS, 24)
    m.cyl((0, 0, 2.2), 0.45, 4.4, KULIT, 12)
    m.fan((0, 0, 4.2), R + 0.5, 6.0, [TERPAL[0], TERPAL[1]])
    m.ball((0, 0, 6.05), 0.22, EMAS)
    # jumbai kain di bibir atap
    for i in range(30):
        a = i / 30 * math.tau
        m.box((math.cos(a) * (R + 0.5), math.sin(a) * (R + 0.5), 4.0), (0.05, 0.92, 0.4), TERPAL[i % 2], a)
    m.cyl((0, 0, 4.1), R + 0.25, 0.28, EMAS, 24)
    for i in range(10):
        a = i / 10 * math.tau
        x, y = math.cos(a) * (R - 0.8), math.sin(a) * (R - 0.8)
        m.cyl((x, y, 2.3), 0.04, 3.6, EMAS, 8)
        kuda(x, y, 1.62 + 0.14 * (i % 2), a, BARANG[i % len(BARANG)], BARANG[(i + 2) % len(BARANG)])
        m.cyl((math.cos(a + 0.3) * (R + 0.15), math.sin(a + 0.3) * (R + 0.15), 4.1), 0.09, 0.14, NEON[i % 4], 8)

# ---------- bianglala ----------
BX, BZ, BR = 19.5, 8.2, 6.6
for dx in (-1.6, 1.6):
    for dy in (-3.2, 3.2):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=1, vertices=8, location=(0, 0, 0))
        o = bpy.context.object
        ax, ay = BX + dx, dy
        o.scale = (1, 1, math.hypot(BZ, dy))
        bpy.ops.object.transform_apply(scale=True)
        m._keep(o, k.besi)
        o.rotation_euler = (math.atan2(-dy, BZ), 0, 0)
        o.location = (ax, ay / 2, BZ / 2)
m.block(BX - 2.4, -3.6, BX + 2.4, 3.6, 0, 0.3, PAPAN)
m.solid(BX, 0, 4.8, 7.2, 3)
m.spot(BX - 2.9, -2.2, -1, 0, 'nempel')
m.spot(BX - 2.9, 2.2, -1, 0, 'nempel')
with m.moving('putar_bianglala', (BX, 0, BZ)):
    for r, mat in ((BR, EMAS), (BR - 0.5, EMAS)):
        for s in (-0.9, 0.9):
            bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.07, major_segments=36, minor_segments=5, location=(0, 0, 0), rotation=(0, math.pi / 2, 0))
            o = bpy.context.object
            bpy.ops.object.transform_apply(rotation=True)
            m._keep(o, mat)
            o.location = (BX + s, 0, BZ)
    for i in range(8):
        a = i / 8 * math.tau
        y, z = math.cos(a) * BR, math.sin(a) * BR
        for s in (-0.9, 0.9):
            m.rope((BX + s, 0, BZ), (BX + s, y, BZ + z), 0.04, k.besi, 0, 1)
        # kabin terbuka: lantai, sandaran, atap, dan tiang
        g = BZ + z
        m.box((BX, y, g - 0.46), (1.5, 1.0, 0.08), PAPAN)
        m.box((BX, y + 0.46, g - 0.2), (1.5, 0.06, 0.5), TERPAL[i % len(TERPAL)])
        m.box((BX, y - 0.46, g - 0.2), (1.5, 0.06, 0.5), TERPAL[i % len(TERPAL)])
        m.box((BX, y, g + 0.5), (1.6, 1.1, 0.07), TERPAL[(i + 2) % len(TERPAL)])
        for dx, dy in ((-0.7, -0.46), (0.7, -0.46), (-0.7, 0.46), (0.7, 0.46)):
            m.cyl((BX + dx, y + dy, g + 0.1), 0.02, 0.8, EMAS, 6)
        m.cyl((BX + 0.95, y * 0.82, BZ + z * 0.82), 0.1, 0.1, NEON[i % 4], 8, rot=(0, math.pi / 2, 0))

# ---------- gerobak dan tempat makan ----------
def gerobak(x, y, warna):
    k.gerobak(x, y, 0, PAPAN, [TERPAL[warna], k.putih])
    k.scan('small_lpg_tank', x + 1.2, y - 0.2, 0.55, tris=300)
    k.scan('wooden_stool_02', x - 0.8, y - 1.2, 0.45, tris=300)
    lamp((x, y, 1.9), 70)


gerobak(-9, 5.5, 1)
gerobak(-10, -5.5, 2)
gerobak(9, -5.5, 3)
gerobak(8.5, 6, 4)
for x, y, r in ((-13.5, 4, 0.3), (-12.5, 6.6, 1.2), (-14, -4.2, 2), (12.8, -6, 0.8), (13.5, -3.8, 2.4), (13, 5.4, 1.6)):
    k.scan('plastic_monobloc_chair_01', x, y, 0.85, rot=r, tris=500, solid=True)
k.scan('CoffeeCart_01', -2.6, 8.1, 1.5, rot=0, tris=1200, tex=512, solid=True, spot='nempel')

# ---------- tiang dan tali lampu ----------
tiang = [(-16, 7.5), (-6, 7.5), (6, 7.5), (15, 8), (-16, -7.5), (-6, -7.5), (6, -7.5), (15, -8)]
for x, y in tiang:
    m.cyl((x, y, 2.6), 0.07, 5.2, k.besi, 8, solid=True)
for a, b in ((0, 1), (1, 2), (2, 3), (4, 5), (5, 6), (6, 7), (1, 5), (2, 6)):
    p, q = tiang[a], tiang[b]
    k.bola_lampu((p[0], p[1], 5.0), (q[0], q[1], 5.0), 14)
for p, e in (((-11, 7.5, 4.3), 90), ((0, 7.5, 4.3), 90), ((10, 7.5, 4.3), 90), ((-11, -7.5, 4.3), 90), ((0, -7.5, 4.3), 90), ((10, -7.5, 4.3), 90), ((-6, 0, 4.3), 80), ((6, 0, 4.3), 80)):
    lamp(p, e * 5.5)

# ---------- belakang lapak ----------
for x in (-19, -8, 3, 14):
    k.peti(x, 15.6, PAPAN, 3)
    k.peti(x + 3, -15.6, PAPAN_TUA, 2)
k.tong(-14, 16.4)
k.tong(8, -16.4, k.merah)
k.tong(20, 16.4, k.hijau)
m.box((-3, -16.6, 0.55), (1.5, 0.9, 1.1), k.karet, solid=True)
m.spot(-1.9, -16.6, 1, 0, 'nempel')
m.spot(-22, 16.5, 1, 0, 'nempel')
m.spot(22, -16.5, -1, 0, 'nempel')
m.spot(22, 16.8, 0, -1, 'nempel')
for x, y, h in ((-22.5, -17, 6.5), (22, 15, 7), (-22, 17, 6)):
    m.foliage_gltf(MK / 'CommonTree_3.gltf', (x, y, 0), h, x)
    m.solid(x, y, 0.5, 0.5, 3)

# ---------- sampah dan rumput ----------
sisi = [(m.rnd.uniform(-22, 16), m.rnd.choice((-8.6, 8.6))) for _ in range(14)]
for i, (x, y) in enumerate(sisi):
    k.scan(('cardboard_box_01', 'trashbag', 'plastic_bottle_gallon', 'old_tyre')[i % 4], x, y, (0.34, 0.5, 0.3, 0.3)[i % 4], tris=300)
kaki = [(m.rnd.uniform(-23, 23), m.rnd.choice((-18.6, 18.6))) for _ in range(36)] + [(m.rnd.choice((-23.6, 23.6)), m.rnd.uniform(-18, 18)) for _ in range(24)]
m.scatter('detail_rumput', MK / 'Grass_Common_Short.gltf', kaki, 0.32)
m.scatter('detail_kerikil', MK / 'Pebble_Round_2.gltf', [(m.rnd.uniform(-20, 20), m.rnd.uniform(-9, 9)) for _ in range(40)], 0.07)

# ---------- pos pencari: bilik karcis timur ----------
m.spawn['seeker'] = [[22.6, -5.5], [22.6, -7]]
m.spawn['hider'] = [[-7, 1], [-7, -1], [6.5, 1], [6.5, -1], [-3, 7], [3, 7], [-3, -7], [3, -7]]
m.life['merpati'] = [[-2, 0.05, -7.6], [11, 0.05, 7.8]]
m.life['kucing'] = [[[-14, 0], [-7, 8], [7, 8], [14, 0], [7, -8], [-7, -8]]]
m.life['warga'] = [[[-15, 8], [15, 8], [15, -8], [-15, -8]], [[7, -7.5], [-14, -7.5], [-14, 7.5], [7, 7.5]], [[-16, 3], [-6, 8.4], [6, 8.4], [13, 2], [6, -8.4], [-6, -8.4]]]

m.sun = set_sky('kloppenheim_02_puresky_2k.hdr', 3.0, 0.5, (0.6, 0.7, 1.0), min_elevation=50)
m.finish()
