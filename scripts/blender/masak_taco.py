# Truk Taco (Dapur Kacau): dapur di bak truk, dinding seng kuning, jalan aspal bergerak di luar (material belt_).
# Jalankan: blender --background --python scripts/blender/masak_taco.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum  # noqa: E402
from masak_lib import Dapur, lamp, set_sky  # noqa: E402

D = Dapur('taco', 61)
m = D.m

LANTAI = m.tex('lantai_pelat', 'corrugated_iron_02', 0.6, tint='#8e939b', rough=0.45)
SENG = m.tex('dinding_seng', 'corrugated_iron_02', 1.2, tint='#ffcc1f', rough=0.5)
LIS = m.flat('lis_truk', '#121212', 0.5)
KUNING = m.tex('lemari_kuning', 'distressed_painted_planks', 1.2, tint='#ffb347', rough=0.45)
TOSKA = m.tex('lemari_toska', 'distressed_painted_planks', 1.2, tint='#2bb3a3', rough=0.45)
MERAH = m.tex('loket_merah', 'plywood', 1.0, tint='#e8432f', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#5cf64a', 0.3, emit=9.0)
NEON2 = m.flat('neon_papan2', '#ff37a6', 0.3, emit=8.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
ASPAL = m.tex('belt_jalan', 'asphalt_02', 3.0, rough=0.9)
MARKA = m.flat('belt_marka', '#f4f1ea', 0.6)
BAN = m.flat('ban', '#141416', 0.8)

D.theme = {'badan': KUNING, 'badan_kompor': TOSKA, 'badan_loket': MERAH, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT}

D.ruang(SENG, LIS, tinggi=2.4, lantai=LANTAI)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
m.box((0, yb - 0.04, 1.85), (3.0, 0.06, 0.7), PAPAN, bevel=0.02)
m.text('TRUK TACO', (0, yb - 0.08, 1.98), 0.28, NEON, depth=0.02)
m.text('TACO · TACO KEJU', (0, yb - 0.08, 1.7), 0.13, NEON2, depth=0.015)
# bak truk: rangka bawah, ban di empat sudut, jalan aspal lebar di bawahnya
m.block(-W / 2 - 0.2, -H / 2 - 0.2, W / 2 + 0.2, H / 2 + 0.2, -0.5, -0.04, LIS)
for sx in (-1, 1):
    for sy in (-1, 1):
        m.cyl((sx * (W / 2 - 1.6), sy * (H / 2 + 0.1), -0.45), 0.5, 0.42, BAN, verts=24, rot=(1.5708, 0, 0))
m.block(-W * 1.6, -H * 1.6, W * 1.6, H * 1.6, -0.97, -0.95, ASPAL)
for k in range(-12, 13):
    m.box((k * 2.4, -H / 2 - 1.8, -0.94), (1.2, 0.18, 0.01), MARKA, bevel=0)

for x in (-3.6, 0, 3.6):
    lamp((x, 0.4, 2.4), 360, (1.0, 0.9, 0.78), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 650, (1.0, 0.93, 0.85), 1.2)
m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 1.3, 3.0, (1.0, 0.92, 0.8), min_elevation=50)
m.finish()
