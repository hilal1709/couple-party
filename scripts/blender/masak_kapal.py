# Kapal Badai (Dapur Kacau): dapur di dek kapal kayu, dinding lambung berjendela bulat, tiang & tali, laut di sekeliling.
# Jalankan: blender --background --python scripts/blender/masak_kapal.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum  # noqa: E402
from masak_lib import Dapur, lamp, set_sky  # noqa: E402

D = Dapur('kapal', 81)
m = D.m

DEK = m.tex('dek_kayu', 'weathered_planks', 1.8, rough=0.6)
LAMBUNG = m.tex('lambung', 'brown_planks_05', 1.6, tint='#a8774f', rough=0.6)
LIS = m.flat('lis_lambung', '#d8322c', 0.5)
KAYU = m.tex('lemari_kayu', 'brown_planks_05', 1.2, tint='#d9a66a', rough=0.5)
BIRU = m.tex('lemari_navy', 'blue_painted_planks', 1.2, tint='#2f4c8c', rough=0.45)
MERAH = m.tex('loket_merah', 'plywood', 1.0, tint='#d8322c', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#ffcc1f', 0.3, emit=9.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
KUNINGAN = m.flat('kuningan', '#c9a24a', 0.25, 0.9)
KACA = m.flat('neon_jendela_laut', '#9fd3f0', 0.1, emit=2.0)
LAUT = m.flat('air_laut', '#1f5f86', 0.08, 0.0)
TALI = m.flat('tali_kapal', '#c8a36a', 0.8)

D.theme = {'badan': KAYU, 'badan_kompor': BIRU, 'badan_loket': MERAH, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT}

D.ruang(LAMBUNG, LIS, tinggi=2.6, lantai=DEK)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
m.box((0, yb - 0.04, 2.1), (3.0, 0.06, 0.6), PAPAN, bevel=0.02)
m.text('KAPAL BADAI', (0, yb - 0.08, 2.1), 0.26, NEON, depth=0.02)
# jendela bulat berbingkai kuningan
for x in (-5.0, -3.0, 3.0, 5.0):
    m.cyl((x, yb - 0.05, 1.75), 0.32, 0.06, KUNINGAN, verts=28, rot=(math.pi / 2, 0, 0))
    m.cyl((x, yb - 0.08, 1.75), 0.26, 0.02, KACA, verts=28, rot=(math.pi / 2, 0, 0))
# tiang layar di belakang dinding & tali ke pojok
m.cyl((0, yb + 0.8, 3.0), 0.18, 6.0, LAMBUNG, verts=16)
for sx in (-1, 1):
    m.rope((0, yb + 0.8, 5.5), (sx * (W / 2 + 0.1), yb, 2.6), 0.02, TALI, 0.3, 12, 5)
m.asset('lifebuoy', (W / 2 - 1.2, yb - 0.1, 1.5), rot=math.pi, width=0.6, tris=1200)
m.asset('wine_barrel_01', (-W / 2 - 0.8, H / 2 - 1.0, 0), height=0.9, tris=1500)
# laut di sekeliling kapal
m.block(-W * 2, -H * 2, W * 2, H * 2, -1.2, -1.15, LAUT)

for x in (-3.6, 0, 3.6):
    lamp((x, 0.4, 2.5), 360, (1.0, 0.85, 0.62), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 600, (0.85, 0.9, 1.0), 1.2)
m.sun = set_sky('belfast_sunset_puresky_2k.hdr', 0.9, 2.0, (0.8, 0.85, 1.0), min_elevation=45)
m.finish()
