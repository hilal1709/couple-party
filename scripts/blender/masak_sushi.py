# Sushi Sabuk (Dapur Kacau): kedai kayu ala Jepang, sabuk berjalan melingkar di tengah, lentera & tirai noren.
# Jalankan: blender --background --python scripts/blender/masak_sushi.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum  # noqa: E402
from masak_lib import TOP, Dapur, lamp, set_sky  # noqa: E402

D = Dapur('sushi', 41)
m = D.m

KAYU_LANTAI = m.tex('lantai_kayu', 'old_wood_floor', 2.0, rough=0.45)
DINDING = m.tex('dinding_krem', 'worn_mossy_plasterwall', 2.0, tint='#f4e6cf', rough=0.8)
LIS = m.tex('lis_kayu', 'brown_planks_05', 1.0, rough=0.5)
KAYU = m.tex('lemari_kayu', 'plywood', 1.0, tint='#d9b48a', rough=0.45)
GELAP = m.tex('lemari_gelap', 'brown_planks_05', 1.0, tint='#6b4a33', rough=0.45)
MERAH = m.tex('loket_merah', 'plywood', 1.0, tint='#c8302c', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#ff3b3b', 0.3, emit=9.0)
NEON2 = m.flat('neon_papan2', '#fff4e0', 0.3, emit=6.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
NOREN = m.flat('sway_noren', '#1f3a68', 0.8)
LENTERA = m.flat('neon_lentera', '#ffcf8a', 0.5, emit=5.0)

D.theme = {'badan': KAYU, 'badan_kompor': GELAP, 'badan_loket': MERAH, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT}

D.ruang(DINDING, LIS, tinggi=2.8, lantai=KAYU_LANTAI)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
# rangka kayu di dinding belakang
for x in range(-6, 7, 2):
    m.box((x * 1.0, yb - 0.05, 1.4), (0.12, 0.08, 2.8), GELAP, bevel=0.01)
m.box((0, yb - 0.05, 2.7), (W, 0.1, 0.12), GELAP, bevel=0.01)
m.box((0, yb - 0.04, 2.0), (3.0, 0.06, 0.75), PAPAN, bevel=0.02)
m.text('SUSHI SABUK', (0, yb - 0.08, 2.12), 0.28, NEON, depth=0.02)
m.text('MAKI · NIGIRI', (0, yb - 0.08, 1.84), 0.13, NEON2, depth=0.015)
# tirai noren di atas pintu dapur (kiri belakang)
m.cloth((-W / 2 + 2.2, yb - 0.12, 2.4), 1.6, 0.6, NOREN, 0, sway=0.2, cols=4, rows=4)
# lentera kertas tergantung
for x in (-3.2, 3.2):
    m.rope((x, 0, 2.8), (x, 0, 2.35), 0.008, D.KARET, 0, 1, 5)
    m.ball((x, 0, 2.2), 0.18, LENTERA, (1, 1, 1.3))
    lamp((x, 0, 2.2), 220, (1.0, 0.8, 0.55), 0.3)
for x in (-1.2, 1.2):
    m.asset('wooden_lantern_01', (x * 4.6, yb - 0.4, 0), height=0.9, tris=1200)
m.asset('tea_set_01', (W / 2 - 1.6, yb - 0.2, 1.72), rot=math.pi, width=0.5, tris=1200)
m.box((W / 2 - 1.6, yb - 0.16, 1.7), (1.6, 0.28, 0.04), GELAP, bevel=0.008)

lamp((0, H / 2 - 1.0, 2.6), 420, (1.0, 0.9, 0.78), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 650, (1.0, 0.93, 0.85), 1.2)
lamp((0, 0, 2.6), 260, (1.0, 0.92, 0.8), 0.8)
m.sun = set_sky('kloppenheim_02_puresky_2k.hdr', 1.0, 2.5, (1.0, 0.9, 0.78), min_elevation=50)
m.finish()
