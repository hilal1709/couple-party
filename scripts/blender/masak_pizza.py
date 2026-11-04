# Pizzeria Atap (Dapur Kacau): dapur di atap gedung, oven bata, lampu tali, loket berlift dengan rana gulung.
# Jalankan: blender --background --python scripts/blender/masak_pizza.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum  # noqa: E402
from masak_lib import CELL, TOP, Dapur, checker, lamp, set_sky  # noqa: E402

import numpy as np  # noqa: E402

D = Dapur('pizza', 31)
m = D.m
rng = np.random.default_rng(8)

TERAKOTA = m.image('lantai_terakota', checker(512, (0.78, 0.42, 0.28), (0.7, 0.36, 0.24), (0.5, 0.44, 0.38), rng, n=4, grime=0.18), 0.6, tile=CELL * 2)
HIJAU = m.tex('lemari_hijau', 'distressed_painted_planks', 1.2, tint='#3e9c5a', rough=0.5)
KREM = m.tex('lemari_krem', 'distressed_painted_planks', 1.2, tint='#fff1dc', rough=0.45)
MERAH = m.tex('loket_merah', 'plywood', 1.0, tint='#e8432f', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#ff37a6', 0.3, emit=9.0)
NEON2 = m.flat('neon_papan2', '#5cf64a', 0.3, emit=7.0)
BOHLAM = m.flat('neon_bohlam', '#ffe2a0', 0.3, emit=12.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
KAYU = m.tex('rak_kayu', 'old_wood_floor', 1.5, rough=0.5)

D.theme = {'badan': KREM, 'badan_kompor': HIJAU, 'badan_loket': MERAH, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT}

D.ruang(D.BATA, D.BATA, tinggi=2.6, lantai=TERAKOTA)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
m.box((0, yb - 0.04, 2.0), (3.2, 0.06, 0.8), PAPAN, bevel=0.02)
m.text('PIZZERIA ATAP', (0, yb - 0.08, 2.14), 0.28, NEON, depth=0.02)
m.text('MARGHERITA · JAMUR', (0, yb - 0.08, 1.84), 0.13, NEON2, depth=0.015)
# lampu tali di atas dapur
for row in (-1.2, 1.6):
    a = (-W / 2, row, 2.6)
    b = (W / 2, row, 2.6)
    m.rope(a, b, 0.008, D.KARET, 0.35, 16, 5)
    for i in range(14):
        t = (i + 0.5) / 14
        sag = 0.35 * 4 * t * (1 - t)
        m.ball((a[0] + (b[0] - a[0]) * t, row, 2.6 - sag - 0.06), 0.045, BOHLAM)
# rak dinding & tanaman pot di pojok
for sx in (-1, 1):
    cx = sx * (W / 2 - 2.2)
    m.box((cx, yb - 0.16, 1.7), (2.0, 0.28, 0.04), KAYU, bevel=0.008)
    for i, pid in enumerate(('jug_01', 'wine_bottles_01', 'CheeseBox_01')):
        m.asset(pid, (cx - 0.6 + i * 0.6, yb - 0.17, 1.72), rot=math.pi, width=0.36, tris=1000, tex=512)
m.asset('potted_plant_01', (-W / 2 - 0.5, -H / 2 + 0.6, 0), height=1.1, tris=1500)
m.asset('potted_plant_01', (W / 2 + 0.5, -H / 2 + 0.6, 0), rot=1.4, height=1.0, tris=1500)

for x in (-3.6, 0, 3.6):
    lamp((x, 0.4, 2.7), 380, (1.0, 0.85, 0.65), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 650, (1.0, 0.93, 0.85), 1.2)
m.sun = set_sky('belfast_sunset_puresky_2k.hdr', 1.3, 3.0, (1.0, 0.78, 0.55), min_elevation=40)
m.finish()
