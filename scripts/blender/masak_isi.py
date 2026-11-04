# Isi peti bahan Dapur Kacau: bentuk khas tiap bahan dengan tekstur derau, dipakai skrip dapur selain Kedai Burger.
import math

import numpy as np
from masak_lib import TOP, noise


def pola(warna, seed, cells=10, amp=0.35):
    r = np.random.default_rng(seed)
    n = noise(256, r, cells)
    return np.clip(np.array(warna, dtype=np.float32)[None, None] * (1 - amp + n[..., None] * amp * 2), 0, 1)


# warna isi peti per bahan: (warna, kerapatan derau, kekasaran)
ISI = {
    'tomat': ((0.86, 0.14, 0.09), 16, 0.18),
    'selada': ((0.42, 0.78, 0.28), 22, 0.55),
    'keju': ((1.0, 0.8, 0.22), 14, 0.4),
    'daging': ((0.78, 0.22, 0.22), 40, 0.6),
    'adonan': ((0.96, 0.9, 0.76), 40, 0.8),
    'jamur': ((0.78, 0.66, 0.52), 24, 0.6),
    'nasi': ((0.98, 0.97, 0.94), 90, 0.7),
    'nori': ((0.07, 0.12, 0.08), 50, 0.5),
    'mie': ((0.98, 0.85, 0.5), 60, 0.45),
    'telur': ((0.93, 0.85, 0.74), 20, 0.4),
    'bawang': ((0.32, 0.68, 0.24), 20, 0.45),
    'tortilla': ((0.95, 0.86, 0.62), 40, 0.75),
}


def isi_umum(D, st):
    m = D.m
    ing = st['ing']
    if not hasattr(D, '_isi'):
        D._isi = {}
    if ing not in D._isi:
        c, cells, rough = ISI.get(ing, ((0.8, 0.8, 0.8), 10, 0.5))
        D._isi[ing] = m.image(f'isi_{ing}', pola(c, len(ing) * 7, cells, 0.15), rough)
    mat = D._isi[ing]
    x, y = st['x'], st['y']
    z = TOP + 0.08
    pts = [(-0.24, -0.2), (0.0, -0.24), (0.24, -0.18), (-0.22, 0.12), (0.22, 0.14), (0.02, 0.2)]
    for i, (dx, dy) in enumerate(pts):
        px, py = x + dx, y + dy
        a = m.rnd.random() * 6.28
        if ing in ('tomat', 'adonan', 'telur'):
            r = {'tomat': 0.09, 'adonan': 0.1, 'telur': 0.055}[ing]
            m.ball((px, py, z + r * 0.8), r, mat, (1, 1, 1.25 if ing == 'telur' else 0.85))
        elif ing in ('selada', 'jamur'):
            for j in range(3):
                m.ball((px + 0.02 * j, py - 0.015 * j, z + 0.08 + 0.015 * j), 0.1 - 0.02 * j, mat, (1, 0.9, 0.7), rot=a + j)
        elif ing in ('keju', 'mie'):
            m.box((px, py, z + 0.03 + (i % 2) * 0.05), (0.2, 0.14, 0.06), mat, rot=a, bevel=0.012)
        elif ing == 'tortilla':
            m.cyl((px, py, z + 0.01 + i * 0.012), 0.12, 0.012, mat, verts=24)
        elif ing == 'nori':
            m.box((px, py, z + 0.004 + i * 0.006), (0.2, 0.18, 0.006), mat, rot=a, bevel=0.001)
        elif ing == 'nasi':
            m.ball((px, py, z + 0.02), 0.12, mat, (1, 1, 0.35))
        elif ing == 'bawang':
            m.cyl((px, py, z + 0.02), 0.016, 0.32, mat, verts=8, rot=(0, math.pi / 2, a))
        else:
            m.cyl((px, py, z + 0.035), 0.1, 0.045, mat, verts=20)
