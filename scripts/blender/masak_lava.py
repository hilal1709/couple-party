# Dapur Gunung Api (Dapur Kacau): warung sate di bibir kawah, lantai basal, petak lava di bawah kisi batu.
# Jalankan: blender --background --python scripts/blender/masak_lava.py -- brand/illustrations/masak src/assets/masak/maps [sampel]
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masak_isi import isi_umum, pola  # noqa: E402
from masak_lib import Dapur, lamp, noise, set_sky  # noqa: E402

import numpy as np  # noqa: E402

D = Dapur('lava', 91)
m = D.m
rng = np.random.default_rng(91)

BASAL = m.tex('lantai_basal', 'dirty_concrete', 1.6, tint='#4a4548', rough=0.8)
TEBING = m.tex('dinding_tebing', 'painted_worn_brick', 1.6, tint='#5b4a46', rough=0.85)
LIS = m.flat('lis_bara', '#2a1a16', 0.7)
GELAP = m.tex('lemari_gelap', 'weathered_planks', 1.2, tint='#6b4a33', rough=0.6)
MERAH = m.tex('lemari_merah', 'distressed_painted_planks', 1.2, tint='#c8302c', rough=0.5)
JINGGA = m.tex('loket_jingga', 'plywood', 1.0, tint='#ff7a2f', rough=0.4)
HANGAT = m.flat('neon_lampu_saji', '#ffb347', 0.4, emit=6.0)
NEON = m.flat('neon_papan', '#ff5a1f', 0.3, emit=10.0)
PAPAN = m.flat('papan_menu', '#1b1c22', 0.6)
lava_px = np.clip(pola((1.0, 0.35, 0.05), 3, 12, 0.3) + (noise(256, rng, 20) > 0.62)[..., None] * np.array((0.0, 0.35, 0.2)), 0, 1)
LAVA = m.image('neon_lava', lava_px.astype(np.float32), 0.4)
b = m.mats['neon_lava'][0].node_tree.nodes['Principled BSDF']
b.inputs['Emission Color'].default_value = (1.0, 0.35, 0.05, 1)
b.inputs['Emission Strength'].default_value = 6.0
KERAK = m.flat('lava_kerak', '#2a1510', 0.9)
KISI = m.tex('kisi_batu', 'cobblestone_01', 0.6, tint='#5a5050', rough=0.85)

D.theme = {'badan': GELAP, 'badan_kompor': MERAH, 'badan_loket': JINGGA, 'puncak_loket': D.MARMER, 'lampu_hangat': HANGAT, 'lava': LAVA, 'lava_kerak': KERAK, 'kisi': KISI}

D.ruang(TEBING, LIS, tinggi=2.8, lantai=BASAL)
W, H = D.W, D.H
D.build(lambda st: isi_umum(D, st))

yb = H / 2 - 0.02
m.box((0, yb - 0.04, 2.05), (3.4, 0.06, 0.7), PAPAN, bevel=0.02)
m.text('SATE GUNUNG API', (0, yb - 0.08, 2.05), 0.24, NEON, depth=0.02)
# sungai lava di luar dinding belakang & bebatuan di pojok
m.block(-W, yb + 0.6, W, yb + 3.0, -0.3, -0.2, LAVA)
for sx in (-1, 1):
    for i in range(3):
        m.ball((sx * (W / 2 + 0.7 + i * 0.4), -H / 2 + 0.6 + i * 0.9, 0.1), 0.5 - i * 0.1, TEBING, (1.2, 1, 0.8))

for x in (-3.6, 0, 3.6):
    lamp((x, 0.4, 2.6), 320, (1.0, 0.7, 0.45), 0.6)
lamp((0, -H / 2 + 0.5, 3.2), 550, (1.0, 0.85, 0.7), 1.2)
m.sun = set_sky('belfast_sunset_puresky_2k.hdr', 0.8, 2.0, (1.0, 0.6, 0.4), min_elevation=40)
m.finish()
