# Dapur Kedai Burger (Dapur Kacau): diner lantai catur, dinding ubin merah muda, rak bumbu, papan menu neon.
# Jalankan: blender --background --python scripts/blender/masak_burger.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_lib import CELL, TOP, Dapur, lamp, noise, set_sky  # noqa: E402

import numpy as np  # noqa: E402

D = Dapur('burger', 23)
m = D.m
rng = np.random.default_rng(5)


def pola(warna, seed, cells=10, amp=0.35):
    r = np.random.default_rng(seed)
    n = noise(256, r, cells)
    return np.clip(np.array(warna, dtype=np.float32)[None, None] * (1 - amp + n[..., None] * amp * 2), 0, 1)


UBIN = m.tex('ubin_dinding', 'large_floor_tiles_02', 0.9, tint='#ffc7df', rough=0.18)
CAT = m.tex('cat_bawah', 'distressed_painted_planks', 1.4, tint='#ff5aa8', rough=0.5)
KREM = m.tex('lemari_krem', 'distressed_painted_planks', 1.2, tint='#fff1dc', rough=0.45)
MERAH = m.tex('lemari_merah', 'distressed_painted_planks', 1.2, tint='#ff3b5c', rough=0.45)
HIJAU = m.tex('loket_hijau', 'plywood', 1.0, tint='#5cf64a', rough=0.35)
KAYU = m.tex('rak_kayu', 'old_wood_floor', 1.5, rough=0.5)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#ff37a6', 0.3, emit=9.0)
NEON2 = m.flat('neon_papan2', '#5cf64a', 0.3, emit=7.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
TOMAT = m.image('tomat', pola((0.86, 0.14, 0.09), 1, 16, 0.12), 0.18)
DAUN = m.flat('tangkai', '#3d8a2f', 0.6)
SELADA = m.image('selada', pola((0.42, 0.78, 0.28), 2, 22, 0.3), 0.55)
KEJU = m.image('keju', np.clip(pola((1.0, 0.8, 0.22), 3, 14, 0.1) * (0.75 + (noise(256, rng, 18) > 0.38)[..., None] * 0.3), 0, 1), 0.4)
DAGING = m.image('daging_mentah', pola((0.78, 0.22, 0.22), 4, 40, 0.3), 0.6)
KERTAS = m.flat('kertas', '#f4ecdc', 0.8)

D.theme = {'badan': KREM, 'badan_kompor': MERAH, 'badan_loket': MERAH, 'puncak_loket': HIJAU, 'lampu_hangat': HANGAT}


def isi_peti(st):
    """bahan yang menyembul dari peti; titik tengah dibiarkan rendah supaya barang yang diambil tetap terlihat"""
    x, y = st['x'], st['y']
    z = TOP + 0.08
    ing = st['ing']
    pts = [(-0.24, -0.2), (0.0, -0.24), (0.24, -0.18), (-0.22, 0.12), (0.22, 0.14), (0.02, 0.2)]
    for i, (dx, dy) in enumerate(pts):
        px, py = x + dx, y + dy
        a = m.rnd.random() * 6.28
        if ing == 'roti':
            m.asset('hamburger_buns', (px, py, z - 0.02), rot=a, width=0.24, tris=900, keep='hamburger_buns_01')
        elif ing == 'tomat':
            m.ball((px, py, z + 0.07), 0.09, TOMAT, (1, 1, 0.85))
            m.cyl((px, py, z + 0.15), 0.012, 0.03, DAUN, verts=6)
        elif ing == 'selada':
            for j in range(3):
                m.ball((px + 0.02 * j, py - 0.015 * j, z + 0.08 + 0.015 * j), 0.11 - 0.02 * j, SELADA, (1, 0.9, 0.8), rot=a + j)
        elif ing == 'keju':
            m.box((px, py, z + 0.03 + (i % 2) * 0.05), (0.2, 0.14, 0.06), KEJU, rot=a, bevel=0.01)
        elif ing == 'daging':
            m.cyl((px, py, z + 0.005), 0.12, 0.01, KERTAS, verts=16)
            m.cyl((px, py, z + 0.035), 0.1, 0.045, DAGING, verts=20)


D.ruang(UBIN, CAT)
# dinding bawah bercat sampai setinggi meja, ubin di atasnya
W, H = D.W, D.H
m.block(-W / 2, H / 2 - 0.005, W / 2, H / 2, 0, TOP + 0.3, CAT)
D.build(isi_peti)

# ---------- hiasan dinding belakang ----------
yb = H / 2 - 0.02
# papan menu neon di tengah
m.box((0, yb - 0.04, 2.25), (3.0, 0.06, 0.95), PAPAN, bevel=0.02)
m.text('KEDAI BURGER', (0, yb - 0.08, 2.42), 0.3, NEON, depth=0.02)
m.text('BURGER · KEJU · KOMPLIT', (0, yb - 0.08, 2.06), 0.14, NEON2, depth=0.015)
# rak kayu kiri & kanan dengan barang dapur scan
for sx in (-1, 1):
    cx = sx * (W / 2 - 2.0)
    for z in (1.75, 2.35):
        m.box((cx, yb - 0.16, z), (2.2, 0.28, 0.04), KAYU, bevel=0.008)
        for bx in (-0.9, 0.9):
            m.box((cx + bx, yb - 0.05, z - 0.08), (0.03, 0.06, 0.14), D.BAJA_GELAP, bevel=0.004)
    items = ('jug_01', 'vintage_electric_kettle', 'pot_enamel_01', 'CheeseBox_01') if sx < 0 else ('russian_food_cans_01', 'tea_set_01', 'wooden_bowl_01', 'jug_01')
    for i, pid in enumerate(items):
        z = 1.77 if i < 2 else 2.37
        bx = cx + (-0.5 if i % 2 == 0 else 0.45)
        m.asset(pid, (bx, yb - 0.17, z), rot=m.rnd.random() * 0.6 - 0.3 + math.pi, width=0.42 if pid != 'russian_food_cans_01' else 0.5, tris=1200, tex=512)
# panci & wajan tergantung di rel atas kompor
xk = max(st['x'] for st in D.stations if st['kind'] == 'stove')
m.rope((xk - 1.6, yb - 0.1, 2.1), (xk + 0.2, yb - 0.1, 2.1), 0.018, D.BAJA, 0, 1, 10)
for i, pid in enumerate(('brass_pan_01', 'brass_pot_01')):
    m.asset(pid, (xk - 1.2 + i * 0.9, yb - 0.25, 1.55), rot=math.pi / 2, width=0.5, tris=1200, flip=False)

# lampu di atas meja tengah (tanpa model: dari kamera atas kap lampu hanya menutupi meja)
for x in (-1.8, 1.8):
    lamp((x, 0.0, 2.6), 300, (1.0, 0.82, 0.62), 0.4)
for x in (-4.2, 0, 4.2):
    lamp((x, H / 2 - 1.0, 2.6), 420, (1.0, 0.9, 0.78), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 700, (1.0, 0.93, 0.85), 1.2)

# papan lantai basah di pojok depan
m.asset('WetFloorSign_01', (-W / 2 + 0.9, -H / 2 + 0.6, 0), rot=0.4, height=0.62, tris=600)

m.sun = set_sky('kloppenheim_02_puresky_2k.hdr', 1.0, 2.5, (1.0, 0.9, 0.78), min_elevation=50)
m.finish()
