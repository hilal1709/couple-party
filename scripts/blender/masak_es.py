# Kafe Es (Dapur Kacau): kafe kayu di kutub, lantai es mengilap & retak, jendela bersalju, es menggantung.
# Jalankan: blender --background --python scripts/blender/masak_es.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum, pola  # noqa: E402
from masak_lib import CELL, Dapur, lamp, noise, set_sky  # noqa: E402

import numpy as np  # noqa: E402

D = Dapur('es', 71)
m = D.m
rng = np.random.default_rng(71)


def es_tex():
    """es biru pucat dengan retakan putih dan gelembung"""
    t = pola((0.72, 0.86, 0.95), 1, 8, 0.12)
    a = np.zeros((256, 256), dtype=np.float32)
    for _ in range(9):
        p = rng.random(2) * 256
        d = rng.random() * 6.28
        for _ in range(140):
            d += rng.normal(0, 0.3)
            p = p + (np.cos(d) * 1.5, np.sin(d) * 1.5)
            iy, ix = int(p[1]) % 256, int(p[0]) % 256
            a[iy, ix] = 1
    t = t * (1 - a[..., None] * 0) + a[..., None] * 0.25
    return np.clip(t + (noise(256, rng, 40) > 0.8)[..., None] * 0.08, 0, 1)


ES = m.image('lantai_es', es_tex(), 0.08, tile=CELL * 2)
m.mats['lantai_es'][0].node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.2
KAYU = m.tex('dinding_kabin', 'brown_planks_05', 1.6, tint='#c9d6e6', rough=0.6)
LIS = m.flat('lis_salju', '#f4f8fc', 0.7)
PUTIH = m.tex('lemari_putih', 'distressed_painted_planks', 1.2, tint='#eef6ff', rough=0.45)
BIRU = m.tex('lemari_biru', 'distressed_painted_planks', 1.2, tint='#6fb6e8', rough=0.45)
PINK = m.tex('loket_pink', 'plywood', 1.0, tint='#ff8fc6', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffd08a', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#7fd3ff', 0.3, emit=9.0)
NEON2 = m.flat('neon_papan2', '#ff8fc6', 0.3, emit=8.0)
PAPAN = m.flat('papan_menu', '#1b2230', 0.6)
SALJU = m.flat('salju', '#f7fbff', 0.9)
KACA = m.flat('neon_jendela_salju', '#d8ecff', 0.1, emit=2.0)
BEKU = m.flat('es_tetes', '#bfe3ff', 0.05, 0.1)

D.theme = {'badan': PUTIH, 'badan_kompor': BIRU, 'badan_loket': PINK, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT}

D.ruang(KAYU, LIS, tinggi=2.7, lantai=ES)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
m.box((0, yb - 0.04, 2.05), (3.0, 0.06, 0.75), PAPAN, bevel=0.02)
m.text('KAFE ES', (0, yb - 0.08, 2.18), 0.3, NEON, depth=0.02)
m.text('PANCAKE · MADU', (0, yb - 0.08, 1.88), 0.13, NEON2, depth=0.015)
# jendela bersalju di dinding belakang, es menggantung di tepi atas dinding
for x in (-4.6, -2.6, 2.6, 4.6):
    m.box((x, yb - 0.03, 1.8), (1.1, 0.05, 0.7), LIS, bevel=0.02)
    m.box((x, yb - 0.06, 1.8), (0.98, 0.02, 0.58), KACA, bevel=0.01)
    m.ball((x, yb - 0.08, 1.48), 0.3, SALJU, (1.6, 0.4, 0.25))
for i in range(28):
    x = -W / 2 + 0.2 + i * (W - 0.4) / 27
    ln = 0.12 + m.rnd.random() * 0.22
    m.cyl((x, yb - 0.1, 2.7 - ln / 2), 0.028, ln, BEKU, verts=6, r2=0.003)
# tumpukan salju di pojok depan
for sx in (-1, 1):
    m.ball((sx * (W / 2 + 0.6), -H / 2 + 0.4, 0), 0.8, SALJU, (1, 0.8, 0.45))

for x in (-3.6, 0, 3.6):
    lamp((x, 0.4, 2.6), 380, (1.0, 0.92, 0.82), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 650, (0.9, 0.95, 1.0), 1.2)
m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 1.4, 2.5, (0.9, 0.95, 1.0), min_elevation=50)
m.finish()
