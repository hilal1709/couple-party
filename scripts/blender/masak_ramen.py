# Ramen Kereta (Dapur Kacau): dua gerbong kereta, jembatan sambungan di tengah yang sesekali terangkat.
# Jalankan: blender --background --python scripts/blender/masak_ramen.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum  # noqa: E402
from masak_lib import CELL, Dapur, lamp, set_sky  # noqa: E402

D = Dapur('ramen', 51)
m = D.m

LANTAI = m.tex('lantai_gerbong', 'herringbone_parquet', 1.6, tint='#c9a27a', rough=0.5)
DINDING = m.tex('dinding_gerbong', 'blue_painted_planks', 1.8, tint='#e9f1f6', rough=0.6)
LIS = m.flat('lis_gerbong', '#d8322c', 0.4)
KREM = m.tex('lemari_krem', 'distressed_painted_planks', 1.2, tint='#fff1dc', rough=0.45)
BIRU = m.tex('lemari_biru', 'blue_painted_planks', 1.2, tint='#3f73c8', rough=0.45)
MERAH = m.tex('loket_merah', 'plywood', 1.0, tint='#d8322c', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
KACA = m.flat('neon_jendela', '#bfe3ff', 0.1, emit=2.5)
BINGKAI = m.flat('bingkai_jendela', '#2c2f35', 0.4, 0.6)
NEON = m.flat('neon_papan', '#ff37a6', 0.3, emit=9.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
PELAT = m.tex('pelat_sambungan', 'corrugated_iron_02', 0.4, tint='#9aa0a8', rough=0.5)
BANTALAN = m.tex('bantalan_rel', 'weathered_planks', 1.0, rough=0.9)

D.theme = {'badan': KREM, 'badan_kompor': BIRU, 'badan_loket': MERAH, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT, 'pelat': PELAT, 'bantalan': BANTALAN}

D.ruang(DINDING, LIS, tinggi=2.7, lantai=LANTAI)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
gx = D.d['gap'][0][0]
# jendela gerbong berpendar langit di dinding belakang, dua gerbong
for x in (-5.4, -3.6, -1.6, 1.8, 3.6, 5.4):
    if abs(x - gx) < 1.0:
        continue
    m.box((x, yb - 0.03, 1.75), (1.3, 0.04, 0.7), BINGKAI, bevel=0.02)
    m.box((x, yb - 0.06, 1.75), (1.18, 0.02, 0.58), KACA, bevel=0.01)
# sekat sambungan antar gerbong: bingkai pintu karet
m.box((gx, yb - 0.1, 1.35), (CELL * 1.1, 0.2, 2.7), m.flat('karet_sambungan', '#2a2b2f', 0.8), bevel=0.04)
m.box((0, yb - 0.04, 2.35), (2.6, 0.06, 0.5), PAPAN, bevel=0.02)
m.text('RAMEN KERETA', (0, yb - 0.08, 2.35), 0.24, NEON, depth=0.02)
# pegangan tangan di langit-langit gerbong
for side in (-1, 1):
    x0 = gx + side * 0.9
    x1 = side * (W / 2 - 0.4)
    m.rope((x0, 0.0, 2.5), (x1, 0.0, 2.5), 0.02, D.BAJA, 0, 1, 8)

for x in (-3.6, 3.6):
    lamp((x, 0.4, 2.6), 380, (1.0, 0.9, 0.78), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 650, (1.0, 0.93, 0.85), 1.2)
m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 1.2, 2.5, (1.0, 0.92, 0.8), min_elevation=45)
m.finish()
