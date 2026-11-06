# Lingkungan di luar dinding Dapur Kacau: jalan kota, atap gedung, taman kolam, rel, gurun, salju, laut, kawah.
# Satu GLB + lightmap terpisah per dapur (<id>-luar.glb, <id>-luar-lm.webp) supaya lightmap dapur tetap tajam.
# Dinding dapur ikut sebagai penghalang cahaya saat bake (bayangannya jatuh ke luar) tapi tidak diekspor.
# Sisi kanan (x > W/2) di sekitar loket dibiarkan lapang: pelanggan antre di sana (render/world.ts).
# Nama material: belt_* bergeser (dapur yang melaju), daun_* bergoyang, air_* beriak, neon_* menyala,
# lewat_* / bobot_* = templat benda bergerak yang digandakan three.js (tidak ikut lightmap).
# Jalankan: blender --background --python scripts/blender/masak_luar.py -- brand/illustrations/masak src/assets/masak/maps <id> [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_lib import CELL, DATA, TOP  # noqa: E402
from petak_lib import Map, bpy, noise, set_sky  # noqa: E402

import numpy as np  # noqa: E402

KID = sys.argv[sys.argv.index('--') + 3] if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 3 else 'burger'
D = DATA[KID]
W, H = D['w'] * CELL, D['h'] * CELL
m = Map(f'{KID}-luar', 31, lm=1024)
rng = np.random.default_rng(5)
R = m.rnd

# loket di sisi kanan: jalur antrean dibiarkan kosong
SERVE_Y = [s['y'] for s in D['stations'] if s['kind'] == 'serve']
QY0, QY1 = min(SERVE_Y) - 1.2, max(SERVE_Y) + 1.2
EX = W / 2 + 0.2  # tepi luar dinding samping
FRONT = -H / 2


def lane_free(x, y, r=0.6):
    """titik ini tidak mengganggu jalur antrean: dari loket ke kanan lalu turun ke arah kamera"""
    in_queue = EX - r < x < EX + 2.4 + r and FRONT - 3.5 - r < y < QY1 + r
    return not in_queue


# ---------- material buatan sendiri ----------
def leaf_tex(base, seed, spots=None):
    t = np.clip(np.array(base, np.float32)[None, None] * (0.75 + noise(256, np.random.default_rng(seed), 14)[..., None] * 0.5), 0, 1)
    if spots:
        mask = noise(256, np.random.default_rng(seed + 1), 30) > 0.68
        t = np.where(mask[..., None], np.array(spots, np.float32), t)
    return t


def window_tex(seed, lit=0.45):
    """fasad: kisi jendela gelap, sebagian menyala hangat"""
    size = 256
    r = np.random.default_rng(seed)
    t = np.ones((size, size, 3), np.float32) * np.array((0.5, 0.36, 0.3), np.float32)
    t *= (0.85 + noise(size, r, 10)[..., None] * 0.3)
    for gy in range(4):
        for gx in range(4):
            x0, y0 = gx * 64 + 14, gy * 64 + 12
            on = r.random() < lit
            col = (1.0, 0.82, 0.5) if on else (0.16, 0.2, 0.26)
            t[y0:y0 + 38, x0:x0 + 36] = col
            t[y0 + 18:y0 + 20, x0:x0 + 36] = (0.85, 0.82, 0.78)
            t[y0:y0 + 38, x0 + 17:x0 + 19] = (0.85, 0.82, 0.78)
    return np.clip(t, 0, 1)


def stripe_tex(a, b, n=8):
    y = np.arange(256)[:, None]
    t = np.where(((y // (256 // n)) % 2 == 0)[..., None], np.array(a, np.float32), np.array(b, np.float32))
    return np.repeat(t, 256, axis=1).astype(np.float32)


def occluder():
    """dinding & bak dapur sebagai penghalang cahaya bake (tidak diekspor)"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.2))
    o = bpy.context.object
    o.scale = (W + 0.4, H + 0.4, 2.4)
    o.name = 'penghalang'
    mat = bpy.data.materials.new('penghalang')
    o.data.materials.append(mat)
    return o


def ring(mat, z0, z1, reach_x=14.0, reach_back=9.0, reach_front=10.0, pad=0.2):
    """tanah di sekeliling dapur (empat lempeng, bagian dapur dikosongkan)"""
    x0, x1 = -W / 2 - pad, W / 2 + pad
    y0, y1 = -H / 2, H / 2 + pad
    m.block(-W / 2 - reach_x, y1, W / 2 + reach_x, y1 + reach_back, z0, z1, mat, cont=True)
    m.block(-W / 2 - reach_x, y0 - reach_front, W / 2 + reach_x, y0, z0, z1, mat, cont=True)
    m.block(-W / 2 - reach_x, y0, x0, y1, z0, z1, mat, cont=True)
    m.block(x1, y0, W / 2 + reach_x, y1, z0, z1, mat, cont=True)


def tree(x, y, h, leaf, bark, kind='round', scale=1.0):
    """pohon bergaya: batang bertekstur, tajuk gumpalan bola (bergoyang di game)"""
    s = scale
    m.cyl((x, y, h * 0.3), 0.12 * s, h * 0.6, bark, verts=10, r2=0.08 * s)
    if kind == 'pine':
        for k in range(3):
            z = h * (0.45 + k * 0.18)
            m.cyl((x, y, z), (0.9 - k * 0.22) * s, h * 0.32, leaf, verts=12, r2=0.05)
        return
    for k in range(5):
        a = k / 5 * math.tau + R.random()
        rr = 0.45 * s
        m.ball((x + math.cos(a) * rr * 0.8, y + math.sin(a) * rr * 0.8, h * (0.72 + 0.1 * R.random())), (0.55 + 0.15 * R.random()) * s, leaf, (1, 1, 0.85))
    m.ball((x, y, h * 0.95), 0.7 * s, leaf, (1, 1, 0.85))


def rock(x, y, r, mat):
    m.ball((x, y, r * 0.25), r, mat, (1.0 + R.random() * 0.5, 0.8 + R.random() * 0.4, 0.55 + R.random() * 0.3), rot=R.random() * 6.28)


def facade(x0, x1, y, h, seed, base_mat):
    """deretan gedung di belakang: badan bata, atap datar, jendela bertekstur"""
    x = x0
    k = 0
    while x < x1:
        w = 3.2 + R.random() * 2.4
        hh = h + R.random() * 3.5
        win = m.image(f'jendela_{seed}_{k}', window_tex(seed * 10 + k), 0.5, tile=w / 1.0)
        m.block(x, y, x + w - 0.15, y + 3.0, 0, hh, base_mat, cont=True)
        m.block(x + 0.25, y - 0.02, x + w - 0.4, y, 1.2, hh - 0.5, win)
        m.block(x - 0.05, y - 0.15, x + w - 0.1, y + 3.0, hh, hh + 0.25, D_ATAP)
        x += w
        k += 1


def mover(name, pivot):
    return m.moving(name, pivot)


# ---------- tema per dapur ----------
D_ATAP = m.tex('atap_beton', 'concrete_wall_008', 2.0, tint='#9a948c', rough=0.9)
KULIT_KAYU = m.tex('kulit_kayu', 'weathered_planks', 0.8, tint='#6b4a33', rough=0.9)


def burger():
    trotoar = m.tex('trotoar', 'rectangular_paving', 1.6, rough=0.85)
    aspal = m.tex('aspal', 'asphalt_02', 3.0, rough=0.9)
    marka = m.flat('marka', '#f4f1ea', 0.6)
    bata = m.tex('bata_gedung', 'brick_4', 1.2, tint='#c98a74', rough=0.9)
    daun = m.image('daun_kota', leaf_tex((0.32, 0.62, 0.24), 3), 0.7, tile=0.8)
    pot = m.tex('pot_semen', 'concrete_tiles', 0.8, tint='#c9bfb2')
    rumput = m.tex('rumput', 'sparse_grass', 2.0, rough=0.95)
    # trotoar mengelilingi, jalan di depan & belakang gedung
    ring(trotoar, -0.06, -0.03, reach_front=3.2, reach_back=1.4)
    m.block(-W / 2 - 14, FRONT - 3.2 - 7.0, W / 2 + 14, FRONT - 3.2, -0.12, -0.1, aspal, cont=True)
    for k in range(-12, 13):
        m.block(k * 2.4 - 0.6, FRONT - 6.75, k * 2.4 + 0.6, FRONT - 6.6, -0.1, -0.095, marka)
    # tepi trotoar
    m.block(-W / 2 - 14, FRONT - 3.35, W / 2 + 14, FRONT - 3.2, -0.12, -0.02, pot)
    # jalan kecil di belakang, gedung di seberangnya
    m.block(-W / 2 - 14, H / 2 + 1.4, W / 2 + 14, H / 2 + 4.2, -0.12, -0.1, aspal, cont=True)
    m.block(-W / 2 - 14, H / 2 + 4.2, W / 2 + 14, H / 2 + 5.4, -0.06, -0.03, trotoar, cont=True)
    facade(-W / 2 - 13, W / 2 + 13, H / 2 + 5.4, 4.0, 1, bata)
    # taman kecil, bangku, meja luar, lampu jalan, hidran (sisi kiri & depan; kanan untuk antrean)
    for y in (H / 2 - 1.5, 0.0, FRONT + 1.5):
        m.block(-EX - 3.4, y - 0.9, -EX - 1.2, y + 0.9, -0.03, 0.25, pot)
        m.block(-EX - 3.3, y - 0.8, -EX - 1.3, y + 0.8, 0.25, 0.27, rumput)
        tree(-EX - 2.3, y, 3.4, daun, KULIT_KAYU)
    for i, x in enumerate((-4.5, -1.5, 1.5, 4.5)):
        m.asset('outdoor_table_chair_set_01', (x, FRONT - 1.4, -0.03), rot=R.random() * 0.6, width=1.6, tris=2200)
    for x in (-W / 2 - 0.8, -2.8, 2.8, W / 2 + 3.6):
        m.asset('street_lamp_01', (x, FRONT - 2.8, -0.03), rot=math.pi / 2, height=4.2, tris=1500)
    m.asset('fire_hydrant', (-EX - 0.7, FRONT - 2.4, -0.03), height=0.7, tris=1200)
    m.asset('metal_trash_can', (EX + 3.4, FRONT - 2.6, -0.03), height=0.9, tris=1200)
    # templat mobil yang lewat (three.js menggandakan & menggerakkan)
    car_templates()


def car_templates():
    cat = [m.flat(f'cat_mobil_{i}', c, 0.25, 0.4) for i, c in enumerate(('#ff37a6', '#2f9bff', '#ffb020', '#43b929'))]
    kaca = m.flat('kaca_mobil', '#1c2a36', 0.08, 0.6)
    ban = m.flat('ban_mobil', '#18191c', 0.7)
    lampu = m.flat('neon_lampu_mobil', '#fff3c4', 0.3, emit=3.0)
    for i, c in enumerate(cat):
        with mover(f'lewat_mobil_{i}', (0, -30 - i * 4, 0)):
            y = -30 - i * 4
            m.box((0, y, 0.45), (2.6, 1.3, 0.55), c, bevel=0.12)
            m.box((-0.15, y, 0.92), (1.5, 1.2, 0.45), c, bevel=0.15)
            m.box((-0.15, y, 0.92), (1.55, 1.24, 0.34), kaca, bevel=0.1)
            for dx in (-0.85, 0.85):
                for dy in (-0.62, 0.62):
                    m.cyl((dx, y + dy, 0.24), 0.24, 0.18, ban, verts=14, rot=(math.pi / 2, 0, 0))
            m.box((1.31, y - 0.4, 0.5), (0.04, 0.22, 0.12), lampu, bevel=0.01)
            m.box((1.31, y + 0.4, 0.5), (0.04, 0.22, 0.12), lampu, bevel=0.01)


def pizza():
    beton = m.tex('lantai_atap', 'concrete_floor_worn_001', 2.0, tint='#e8dccb', rough=0.9)
    bata = m.tex('tembok_atap', 'painted_worn_brick', 1.2, tint='#e0b49a', rough=0.9)
    genteng = m.tex('genteng', 'clay_roof_tiles', 1.4, rough=0.85)
    tangki = m.flat('tangki_air', '#7fb3c9', 0.35, 0.3)
    kain = [m.image(f'sway_jemuran_{i}', stripe_tex(a, b, 6), 0.8, tile=0.6) for i, (a, b) in enumerate((((1, 0.4, 0.66), (1, 1, 1)), ((0.36, 0.6, 1), (1, 0.95, 0.6)), ((0.55, 0.85, 0.35), (1, 1, 1))))]
    tali = m.flat('tali', '#3a3236', 0.7)
    daun = m.image('daun_pot', leaf_tex((0.3, 0.6, 0.25), 7), 0.7, tile=0.6)
    ring(beton, -0.06, -0.03, reach_x=6.0, reach_back=4.0, reach_front=3.6)
    # pagar tembok rendah di tepi atap
    m.block(-W / 2 - 6, FRONT - 3.6, W / 2 + 6, FRONT - 3.3, -0.03, 0.9, bata, cont=True)
    m.block(-W / 2 - 6.3, FRONT - 3.6, -W / 2 - 6, H / 2 + 4, -0.03, 0.9, bata, cont=True)
    m.block(W / 2 + 6, FRONT - 3.6, W / 2 + 6.3, H / 2 + 4, -0.03, 0.9, bata, cont=True)
    # atap-atap tetangga lebih rendah di kejauhan
    for k in range(8):
        x = -W / 2 - 12 + k * 4.6
        z = -3.5 - R.random() * 2
        m.block(x, H / 2 + 5, x + 4.2, H / 2 + 11, z - 6, z, bata, cont=True)
        m.prism(x, H / 2 + 5, x + 4.2, H / 2 + 11, z, z + 1.6, genteng, along='x')
    for sx, y in ((-1, H / 2 + 2.2), (1, H / 2 + 2.6)):
        x = sx * (W / 2 - 1.5)
        for dx in (-0.8, 0.8):
            for dy in (-0.8, 0.8):
                m.cyl((x + dx, y + dy, 0.9), 0.06, 1.9, tali, verts=6)
        m.cyl((x, y, 2.6), 1.1, 1.6, tangki, verts=20)
        m.cyl((x, y, 3.5), 1.12, 0.2, tangki, verts=20, r2=0.6)
    for x in (-W / 2 - 2.5, -W / 2 - 4.5):
        m.asset('exterior_aircon_unit', (x, 1.5, -0.03), rot=math.pi / 2, width=1.0, tris=1500)
    # jemuran di kiri: kain berkibar
    m.rope((-EX - 5.2, FRONT - 1.6, 1.9), (-EX - 1.0, FRONT - 1.6, 1.9), 0.015, tali, 0.15)
    for x in (-EX - 5.4, -EX - 0.8):
        m.cyl((x, FRONT - 1.6, 0.95), 0.04, 2.0, tali, verts=6)
    for i in range(4):
        m.cloth((-EX - 4.6 + i * 1.0, FRONT - 1.6, 1.88), 0.8, 0.9, kain[i % 3], sway=0.35)
    for x, y in ((EX + 4.5, H / 2 + 1.0), (-EX - 1.0, H / 2 + 0.8), (EX + 4.8, FRONT - 2.6)):
        m.asset('planter_pot_clay', (x, y, -0.03), height=0.55, tris=800)
        m.ball((x, y, 0.85), 0.42, daun, (1, 1, 0.9))
    m.asset('portable_generator', (-EX - 1.4, -1.2, -0.03), rot=0.3, width=0.9, tris=1500)


def sushi():
    rumput = m.tex('rumput_taman', 'sparse_grass', 2.0, rough=0.95)
    kerikil = m.tex('kerikil', 'gravel_floor', 1.4, rough=0.95)
    batu = m.tex('batu_taman', 'rock_05', 1.0, rough=0.9)
    kayu = m.tex('kayu_jembatan', 'brown_planks_05', 1.0, rough=0.7)
    air = m.flat('air_kolam', '#3f8fa8', 0.05, 0.1)
    dasar = m.tex('dasar_kolam', 'mossy_cobblestone', 1.5, tint='#5f7d63')
    sakura = m.image('daun_sakura', leaf_tex((1.0, 0.68, 0.8), 11, (1.0, 0.86, 0.92)), 0.7, tile=0.8)
    bambu = m.image('bambu', stripe_tex((0.55, 0.72, 0.32), (0.46, 0.6, 0.26), 12), 0.5, tile=0.8)
    teratai = m.flat('teratai', '#4f9a3a', 0.6)
    ring(rumput, -0.06, -0.03)
    # jalan kerikil di depan & jalur antrean
    m.block(-W / 2 - 14, FRONT - 2.2, W / 2 + 14, FRONT - 0.2, -0.03, -0.015, kerikil, cont=True)
    m.block(EX, QY0 - 1, EX + 2.6, H / 2 + 0.2, -0.03, -0.015, kerikil, cont=True)
    # kolam di kiri depan: dasar batu, air beriak, teratai
    cx, cy = -EX - 3.2, FRONT + 1.4
    m.block(cx - 2.4, cy - 2.6, cx + 2.4, cy + 2.6, -0.6, -0.5, dasar)
    m.block(cx - 2.4, cy - 2.6, cx + 2.4, cy + 2.6, -0.18, -0.16, air)
    for k in range(10):
        a = k / 10 * math.tau
        rock(cx + math.cos(a) * 2.5, cy + math.sin(a) * 2.7, 0.35, batu)
    for k in range(5):
        m.cyl((cx + R.uniform(-1.8, 1.8), cy + R.uniform(-2, 2), -0.15), 0.22, 0.01, teratai, verts=10)
    # jembatan kayu melengkung di atas kolam
    for k in range(7):
        t = k / 6
        m.box((cx - 1.8 + t * 3.6, cy - 1.0, 0.1 + math.sin(t * math.pi) * 0.35), (0.48, 1.1, 0.06), kayu, bevel=0.01)
    # lentera batu & pohon sakura
    for x, y in ((-EX - 1.2, H / 2 - 0.8), (EX + 3.6, FRONT - 1.4), (-EX - 6.0, H / 2 - 1.2)):
        m.cyl((x, y, 0.3), 0.18, 0.6, batu, verts=8)
        m.box((x, y, 0.75), (0.42, 0.42, 0.3), batu, bevel=0.03)
        m.cyl((x, y, 1.05), 0.36, 0.25, batu, verts=8, r2=0.05)
    for x, y, h in ((-EX - 6.5, -1.0, 3.6), (-EX - 1.6, 2.0, 3.0), (EX + 4.6, H / 2 - 0.5, 3.4), (EX + 5.2, FRONT - 3.0, 3.2)):
        tree(x, y, h, sakura, KULIT_KAYU)
    # pagar bambu di belakang
    for k in range(int((W + 20) / 0.18)):
        x = -W / 2 - 10 + k * 0.18
        m.cyl((x, H / 2 + 1.6, 0.9), 0.07, 1.8 + (k % 3) * 0.15, bambu, verts=8)


def ramen():
    kerikil = m.tex('belt_balas', 'gravel_floor', 1.2, rough=0.95)
    rumput = m.tex('belt_padang', 'sparse_grass', 2.4, rough=0.95)
    tanah = m.tex('belt_tanah', 'farm_soil', 2.0, rough=0.95)
    baja = m.flat('rel_baja', '#8d939b', 0.3, 0.8)
    gerbong = m.tex('kolong_gerbong', 'painted_metal_shutter', 1.2, tint='#c2362f', rough=0.6)
    roda = m.flat('roda', '#2c2f35', 0.4, 0.7)
    bukit = m.tex('bukit', 'forest_ground_04', 6.0, tint='#6f9a4e', rough=1.0)
    # rangka gerbong di bawah lantai dapur, rel & balas di tanah
    m.block(-W / 2 - 0.2, FRONT, W / 2 + 0.2, H / 2 + 0.2, -0.75, -0.04, gerbong, cont=True)
    for x in (-W / 2 + 1.6, -1.6, 1.6, W / 2 - 1.6):
        for y in (FRONT + 0.4, H / 2 - 0.4):
            m.cyl((x, y, -0.78), 0.32, 0.16, roda, verts=16, rot=(math.pi / 2, 0, 0))
    ring(kerikil, -1.15, -1.1, reach_x=14, reach_back=2.0, reach_front=2.0, pad=0.2)
    m.block(-W / 2 - 0.2, FRONT, W / 2 + 0.2, H / 2 + 0.2, -1.15, -1.1, kerikil, cont=True)
    for y in (FRONT + 0.4, H / 2 - 0.4):
        m.block(-W / 2 - 14, y - 0.05, W / 2 + 14, y + 0.05, -1.1, -1.0, baja)
    m.block(-W / 2 - 14, H / 2 + 2.2, W / 2 + 14, H / 2 + 12, -1.2, -1.15, rumput, cont=True)
    m.block(-W / 2 - 14, FRONT - 12, W / 2 + 14, FRONT - 2.0, -1.2, -1.15, tanah, cont=True)
    # bukit jauh di belakang (tidak bergeser: terlalu jauh untuk terlihat melaju)
    for k in range(6):
        x = -W / 2 - 14 + k * 7
        m.ball((x, H / 2 + 16, -2), 6 + R.random() * 3, bukit, (1.4, 0.8, 0.7))
    passing_templates()


def passing_templates():
    """benda yang lewat di luar dapur yang melaju: tiang listrik, pohon, batu, kaktus, rambu"""
    kayu = m.tex('tiang_kayu', 'weathered_planks', 0.6, tint='#7a5a3d')
    daun = m.image('daun_lewat', leaf_tex((0.3, 0.58, 0.22), 13), 0.7, tile=0.8)
    batu = m.tex('batu_lewat', 'rock_05', 1.0)
    kaktus = m.image('daun_kaktus', stripe_tex((0.35, 0.62, 0.3), (0.28, 0.5, 0.24), 10), 0.6, tile=0.5)
    rambu = m.flat('rambu', '#ffb020', 0.4)
    with mover('lewat_tiang', (0, -40, 0)):
        m.cyl((0, -40, 2.5), 0.12, 5.0, kayu, verts=8)
        m.box((0, -40, 4.6), (0.1, 1.6, 0.1), kayu, bevel=0.01)
    with mover('lewat_pohon', (0, -44, 0)):
        tree(0, -44, 3.6, daun, KULIT_KAYU)
    with mover('lewat_batu', (0, -48, 0)):
        rock(0, -48, 0.8, batu)
        rock(0.7, -47.6, 0.45, batu)
    with mover('lewat_kaktus', (0, -52, 0)):
        m.cyl((0, -52, 1.0), 0.22, 2.0, kaktus, verts=10)
        m.cyl((0.35, -52, 1.2), 0.13, 0.7, kaktus, verts=8)
        m.cyl((-0.32, -52, 1.45), 0.12, 0.6, kaktus, verts=8)
    with mover('lewat_rambu', (0, -56, 0)):
        m.cyl((0, -56, 1.0), 0.05, 2.0, kayu, verts=6)
        m.box((0, -56, 2.0), (0.06, 0.8, 0.8), rambu, rot=math.pi / 4, bevel=0.01)


def taco():
    pasir = m.tex('belt_gurun', 'coast_sand_01', 2.4, tint='#e2b87a', rough=0.95)
    bukit = m.tex('mesa', 'red_sandstone_pavement', 4.0, tint='#c9774a', rough=1.0)
    # gurun di kiri-kanan jalan (jalan aspal sudah ada di GLB dapur)
    m.block(-W / 2 - 16, H / 2 + 5.5, W / 2 + 16, H / 2 + 14, -1.0, -0.97, pasir, cont=True)
    m.block(-W / 2 - 16, FRONT - 14, W / 2 + 16, FRONT - 5.5, -1.0, -0.97, pasir, cont=True)
    for k in range(5):
        x = -W / 2 - 10 + k * 8
        m.block(x, H / 2 + 14, x + 5 + R.random() * 2, H / 2 + 17, -1, 2.5 + R.random() * 2.5, bukit)
    passing_templates()


def es():
    salju = m.tex('salju', 'snow_02', 2.0, rough=0.7)
    es_ = m.flat('es_kolam', '#bfe4f2', 0.05, 0.1)
    daun = m.image('daun_cemara', leaf_tex((0.16, 0.38, 0.28), 17, (0.95, 0.97, 1.0)), 0.75, tile=0.8)
    balok = m.tex('balok_es', 'snow_02', 0.6, tint='#d8f0ff', rough=0.3)
    wortel = m.flat('wortel', '#ff7a1a', 0.5)
    arang = m.flat('arang', '#1a1a1c', 0.6)
    pagar = m.tex('pagar_kayu', 'weathered_planks', 0.6, tint='#8a5a33')
    ring(salju, -0.06, -0.03)
    # kolam beku di kiri depan
    m.block(-EX - 5.5, FRONT - 3.0, -EX - 1.0, FRONT + 1.0, -0.03, -0.01, es_)
    # iglo dari balok es
    ix, iy = -EX - 3.6, H / 2 - 0.6
    m.ball((ix, iy, 0), 1.5, balok, (1, 1, 0.85))
    m.cyl((ix + 1.3, iy - 0.2, 0.45), 0.5, 0.9, balok, verts=12, rot=(0, math.pi / 2, 0))
    # manusia salju
    sx, sy = EX + 4.2, H / 2 - 0.4
    m.ball((sx, sy, 0.45), 0.55, salju)
    m.ball((sx, sy, 1.15), 0.38, salju)
    m.ball((sx, sy, 1.65), 0.27, salju)
    m.cyl((sx, sy - 0.32, 1.65), 0.04, 0.25, wortel, verts=8, r2=0.005, rot=(math.pi / 2, 0, 0))
    for dx in (-0.09, 0.09):
        m.ball((sx + dx, sy - 0.24, 1.73), 0.035, arang)
    for x, y, h in ((-EX - 7, 1.0, 4.0), (-EX - 1.4, FRONT - 2.6, 3.0), (EX + 5.5, FRONT - 2.4, 3.6), (EX + 6.2, 2.2, 4.2), (-6, H / 2 + 3, 4.6), (2, H / 2 + 3.4, 4.0), (7, H / 2 + 2.6, 4.4)):
        tree(x, y, h, daun, KULIT_KAYU, kind='pine')
    for k in range(14):
        x = -W / 2 - 1 + k * ((W + 2) / 13)
        m.box((x, H / 2 + 1.4, 0.5), (0.1, 0.08, 1.0), pagar, bevel=0.01)
    m.block(-W / 2 - 1, H / 2 + 1.36, W / 2 + 1, H / 2 + 1.44, 0.75, 0.83, pagar)
    penguin_template()


def penguin_template():
    hitam = m.flat('bulu_pinguin', '#1e2229', 0.5)
    putih = m.flat('perut_pinguin', '#f7f5f0', 0.6)
    oranye = m.flat('paruh_pinguin', '#ffa21a', 0.5)
    with mover('bobot_pinguin', (0, -60, 0)):
        y = -60
        m.ball((0, y, 0.38), 0.3, hitam, (1, 0.9, 1.35))
        m.ball((0, y - 0.1, 0.36), 0.24, putih, (0.9, 0.7, 1.2))
        m.ball((0, y, 0.78), 0.2, hitam)
        m.cyl((0, y - 0.22, 0.76), 0.05, 0.12, oranye, verts=6, r2=0.0, rot=(math.pi / 2, 0, 0))
        for dx in (-0.08, 0.08):
            m.ball((dx, y - 0.16, 0.84), 0.035, putih)
        for dx in (-0.1, 0.1):
            m.ball((dx, y - 0.08, 0.03), 0.08, oranye, (1, 1.5, 0.4))


def kapal():
    dek = m.tex('dek_luar', 'brown_planks_05', 1.2, rough=0.75)
    lambung = m.tex('lambung_luar', 'blue_painted_planks', 1.2, tint='#d9e4ee', rough=0.8)
    pasir = m.tex('pulau', 'coast_sand_01', 2.0, tint='#e8cf9a')
    daun = m.image('daun_kelapa', leaf_tex((0.28, 0.6, 0.22), 19), 0.7, tile=0.8)
    # dek kapal menjorok di depan & samping dapur, pagar lambung
    m.block(-W / 2 - 2.6, FRONT - 3.0, W / 2 + 2.6, H / 2 + 1.4, -0.06, -0.03, dek, cont=True)
    m.block(-W / 2 - 2.6, FRONT - 3.0, W / 2 + 2.6, H / 2 + 1.4, -1.25, -0.06, lambung, cont=True)
    for x in (-W / 2 - 2.6, W / 2 + 2.45):
        m.block(x, FRONT - 3.0, x + 0.15, H / 2 + 1.4, -0.03, 0.75, lambung)
    m.block(-W / 2 - 2.6, FRONT - 3.0, W / 2 + 2.6, FRONT - 2.85, -0.03, 0.75, lambung)
    for i, (x, y) in enumerate(((-W / 2 - 1.6, FRONT - 1.5), (W / 2 + 1.8, H / 2 + 0.6))):
        m.asset('wooden_barrels_01' if i == 0 else 'old_military_crate', (x, y, -0.03), width=1.2, tris=1500)
    m.asset('lifebuoy', (-W / 2 - 2.4, 0.6, 0.45), rot=math.pi / 2, width=0.7, tris=900)
    m.asset('cannon_01', (-W / 2 - 1.5, H / 2 - 0.6, -0.03), rot=math.pi, width=1.4, tris=2000)
    # pulau kecil berpohon kelapa di kejauhan
    for x, y in ((-18, 16), (20, 22)):
        m.ball((x, y, -1.6), 4.0, pasir, (1.4, 1.0, 0.25))
        for k in range(3):
            tree(x + k * 1.4 - 1.4, y, 4.0 + k * 0.5, daun, KULIT_KAYU, scale=0.8)
    with mover('bobot_pelampung', (0, -64, 0)):
        m.asset('ocean_buoy', (0, -64, -1.2), height=1.6, tris=1500)
    with mover('lewat_kapal', (0, -70, 0)):
        m.asset('dutch_ship_medium', (0, -70, -1.4), rot=math.pi / 2, width=7.0, tris=4000)


def lava():
    basal = m.tex('basal_luar', 'volcanic_rock_tiles', 1.6, rough=0.9)
    batu = m.tex('batu_kawah', 'rock_05', 1.2, tint='#5a4a46')
    lv = m.tex('neon_lava_luar', 'rock_05', 2.0, tint='#ff5a14', rough=0.6)
    kerak = m.tex('kerak_luar', 'volcanic_rock_tiles', 1.0, tint='#3a2a26')
    tali = m.flat('tali_jembatan', '#7a5a3d', 0.7)
    ring(basal, -0.06, -0.03, reach_front=2.2, reach_back=0.4)
    # sungai lava di depan dan kiri, jembatan papan di atasnya
    m.block(-W / 2 - 14, FRONT - 6.0, W / 2 + 14, FRONT - 2.2, -0.45, -0.4, lv, cont=True)
    m.block(-W / 2 - 14, FRONT - 7.5, W / 2 + 14, FRONT - 6.0, -0.06, -0.03, kerak, cont=True)
    for k in range(9):
        m.box((-2 + k * 0.0, FRONT - 2.4 - k * 0.42, 0.0), (1.2, 0.36, 0.06), m.tex('papan_jembatan', 'weathered_planks', 0.8, tint='#7a5a3d') if k == 0 else 'papan_jembatan', bevel=0.01)
    for dx in (-0.65, 0.65):
        m.rope((-2 + dx, FRONT - 2.2, 0.6), (-2 + dx, FRONT - 6.0, 0.6), 0.02, tali, 0.12)
    # tebing & batu runcing di sekitar
    for k in range(18):
        x = R.uniform(-W / 2 - 12, W / 2 + 12)
        y = R.uniform(H / 2 + 0.6, H / 2 + 7)
        m.cyl((x, y, 1.0), 0.6 + R.random() * 0.8, 2.0 + R.random() * 3.5, batu, verts=7, r2=0.1)
    for k in range(10):
        x = R.choice((R.uniform(-W / 2 - 10, -EX - 0.6), R.uniform(EX + 3.2, W / 2 + 10)))
        y = R.uniform(FRONT - 1.8, H / 2)
        if lane_free(x, y, 0.9):
            rock(x, y, 0.5 + R.random() * 0.6, batu)


BUILD = {'burger': burger, 'pizza': pizza, 'sushi': sushi, 'ramen': ramen, 'taco': taco, 'es': es, 'kapal': kapal, 'lava': lava}
SKY = {
    'burger': ('kloppenheim_02_puresky_2k.hdr', 1.0, 2.5, (1.0, 0.9, 0.78), 50),
    'pizza': ('belfast_sunset_puresky_2k.hdr', 1.3, 3.0, (1.0, 0.78, 0.55), 40),
    'sushi': ('kloppenheim_02_puresky_2k.hdr', 1.0, 2.5, (1.0, 0.9, 0.78), 50),
    'ramen': ('kloofendal_43d_clear_puresky_2k.hdr', 1.2, 2.5, (1.0, 0.92, 0.8), 45),
    'taco': ('kloofendal_43d_clear_puresky_2k.hdr', 1.3, 3.0, (1.0, 0.92, 0.8), 50),
    'es': ('kloofendal_43d_clear_puresky_2k.hdr', 1.4, 2.5, (0.9, 0.95, 1.0), 50),
    'kapal': ('belfast_sunset_puresky_2k.hdr', 0.9, 2.0, (0.8, 0.85, 1.0), 45),
    'lava': ('belfast_sunset_puresky_2k.hdr', 0.8, 2.0, (1.0, 0.6, 0.4), 40),
}

occluder()
BUILD[KID]()
# tekstur luar cukup 512 px: dilihat dari jauh, dan GLB tetap kecil untuk APK
for img in bpy.data.images:
    if img.size[0] > 512 and img.name not in ('lm_float', 'lm'):
        img.scale(512, max(1, int(512 * img.size[1] / img.size[0])))
hdr, s, e, c, el = SKY[KID]
m.sun = set_sky(hdr, s, e, c, min_elevation=el)
m.finish()
