# Benda bersama map Petak Cat: material dasar dan perabot kecil. Gang Kampung punya versinya sendiri di petak_gang.py.
import math
from pathlib import Path

import numpy as np
from petak_lib import bpy, noise

MK = Path('D:/dev/asset-src/quaternius-megakit/x/glTF')


def decal_set(m, seed=3):
    """tempelan prosedural: noda hujan, lumut, retak, tanah, noda oli, poster, dan coretan"""
    rng = np.random.default_rng(seed)
    size = 256
    y, x = np.mgrid[0:size, 0:size] / size

    def rgba(color, alpha):
        c = np.ones((size, size, 3), dtype=np.float32) * np.array(color, dtype=np.float32) if not isinstance(color, np.ndarray) else color
        return np.dstack([c, np.clip(alpha, 0, 1)])

    edge = np.clip(np.minimum.reduce([x, 1 - x, y, 1 - y]) * 6, 0, 1)
    n = noise(size, rng, 6)
    # noda air: mengalir dari atas ke bawah, memudar
    streak = noise(size, rng, 10, 2)
    streak = np.repeat(streak[:1, :], size, axis=0) * 0.7 + noise(size, rng, 4) * 0.3
    noda = m.decal_tex('decal_noda', rgba((0.12, 0.1, 0.08), (streak - 0.42) * 2.6 * (1 - y) ** 0.8 * np.clip(x * (1 - x) * 8, 0, 1)))
    lumut = m.decal_tex('decal_lumut', rgba(np.dstack([0.13 + n * 0.1, 0.17 + n * 0.14, 0.08 + n * 0.05]), (n * 1.5 - 0.72 + y * 0.42) * 2.2 * edge * 0.45))
    tanah = m.decal_tex('decal_tanah', rgba((0.2, 0.15, 0.1), (n - 0.34 - np.hypot(x - 0.5, y - 0.5) * 0.6) * 4))
    oli = m.decal_tex('decal_oli', rgba((0.03, 0.03, 0.04), (noise(size, rng, 4) - 0.28 - np.hypot(x - 0.5, y - 0.5) * 0.75) * 7))
    # retak: jalan acak bercabang
    a = np.zeros((size, size), dtype=np.float32)
    for i in range(5):
        p = rng.random(2) * size
        d = rng.random() * 6.28
        for _ in range(170):
            d += rng.normal(0, 0.35)
            p = p + (math.cos(d) * 1.4, math.sin(d) * 1.4)
            iy, ix = int(p[1]) % size, int(p[0]) % size
            a[max(0, iy - 1):iy + 1, max(0, ix - 1):ix + 1] = 1
    retak = m.decal_tex('decal_retak', rgba((0.04, 0.035, 0.03), a * 0.85 * edge))
    # poster sobek: blok warna dan garis judul
    posters = []
    for i, (bg, fg) in enumerate((((0.95, 0.85, 0.3), (0.8, 0.1, 0.15)), ((0.15, 0.55, 0.75), (0.98, 0.95, 0.85)), ((0.9, 0.3, 0.45), (0.1, 0.1, 0.12)))):
        c = np.ones((size, size, 3), dtype=np.float32) * np.array(bg, dtype=np.float32)
        c[(y > 0.1) & (y < 0.3) & (x > 0.1) & (x < 0.9)] = fg
        for r in range(4):
            c[(np.abs(y - (0.42 + r * 0.1)) < 0.018) & (x > 0.14) & (x < 0.6 + 0.25 * rng.random())] = fg
        c[np.hypot(x - 0.72, y - 0.74) < 0.14] = fg
        c *= (0.75 + noise(size, rng, 8) * 0.4)[..., None]
        torn = (noise(size, rng, 7) - 0.3 + np.minimum.reduce([x, 1 - x, y, 1 - y]) * 3) > 0.1
        posters.append(m.decal_tex(f'decal_poster{i}', rgba(np.clip(c, 0, 1), torn.astype(np.float32))))
    # coretan: garis cat semprot
    g = np.zeros((size, size), dtype=np.float32)
    for i in range(3):
        cy = 0.28 + i * 0.22
        wave = cy + np.sin(x * (9 + i * 3) + i) * 0.08
        g = np.maximum(g, 1 - np.clip(np.abs(y - wave) * 34 - 0.3, 0, 1))
    coret = m.decal_tex('decal_coret', rgba((0.08, 0.1, 0.5), g * edge * 0.85))
    return {'noda': noda, 'lumut': lumut, 'tanah': tanah, 'oli': oli, 'retak': retak, 'poster': posters, 'coret': coret}


class Kit:
    def __init__(self, m, seed=3):
        self.m = m
        self.dec = decal_set(m, seed)
        self.besi = m.flat('besi', '#2b2d30', 0.45, 0.7)
        self.karet = m.flat('karet', '#191a1c', 0.8)
        self.putih = m.flat('putih', '#f1ece2', 0.5)
        self.merah = m.flat('merah', '#d8322c', 0.45)
        self.biru = m.flat('biru', '#2f6fd0', 0.4)
        self.kuning = m.flat('kuning', '#f2c21a', 0.4)
        self.hijau = m.flat('hijau_plastik', '#3aa655', 0.4)
        self.kabel = m.flat('kabel', '#141414', 0.7)
        self.kaca = m.flat('kaca', '#6f8f9e', 0.08, 0.5)
        self.lampu = m.flat('neon_lampu', '#ffd9a0', 0.4, emit=6)
        self.warna = (self.merah, self.biru, self.kuning, self.hijau, self.putih)

    def scan(self, pid, x, y, h=None, rot=None, z=0.0, tris=500, tex=256, solid=False, spot=None, keep=None, w=None, flip=False):
        """model scan berukuran kecil; `rot` kosong = diputar acak supaya deretan tidak seragam"""
        m = self.m
        return m.asset(pid, (x, y, z), m.rnd.random() * 6.28 if rot is None else rot, h, tris, tex, solid, spot, keep, w, flip)

    def kotor(self, axis, f, a0, a1, out, h, step=3.2, poster=True):
        """noda hujan, retak, lumut, dan poster sepanjang dinding; `f` = letak bidang dinding"""
        m, d = self.m, self.dec
        P = (lambda t, q, z: (t, f + out * q, z)) if axis == 'x' else (lambda t, q, z: (f + out * q, t, z))
        n = max(1, int((a1 - a0) / step))
        for i in range(n):
            t = a0 + (i + 0.5) * (a1 - a0) / n
            m.decal(P(t, 0.012, h * 0.62), 2.2, h * 0.7, m.rnd.choice((d['noda'], d['retak'])), axis, out)
            if i % 3 == 0:
                m.decal(P(t + 0.8, 0.014, 0.42), 1.5, 0.8, d['lumut'], axis, out)
            if poster and i % 4 == 1:
                m.decal(P(t - 0.7, 0.016, 1.55), 0.62, 0.86, m.rnd.choice(d['poster']), axis, out)

    def lantai(self, n, x0, y0, x1, y1, z=0.02):
        """noda tanah, oli, dan retak di lantai"""
        m, d = self.m, self.dec
        for i in range(n):
            s = 1.2 + m.rnd.random() * 2.2
            m.decal((m.rnd.uniform(x0, x1), m.rnd.uniform(y0, y1), z + i * 0.0004), s, s, m.rnd.choice((d['tanah'], d['oli'], d['retak'], d['tanah'])))

    def roda(self, at, rot, r, mat, tebal=0.04, jari=None, jari_mat=None):
        """roda torus; `jari` = jumlah jari-jari; `at` = titik tengah"""
        m = self.m
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=tebal, major_segments=20, minor_segments=6, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.object
        bpy.ops.object.transform_apply(rotation=True)
        m._keep(o, mat)
        for p in o.data.polygons:
            p.use_smooth = True
        o.rotation_euler = (0, 0, rot)
        o.location = at
        c, s = math.cos(rot), math.sin(rot)
        for i in range(jari or 0):
            a = i / jari * math.tau
            m.rope(at, (at[0] + c * math.cos(a) * r, at[1] + s * math.cos(a) * r, at[2] + math.sin(a) * r), 0.007, jari_mat or mat, 0, 1, 4)

    def gerobak(self, x, y, rot, badan, payung, asap=True):
        """gerobak kaki lima: lemari kaca, panci, payung, dan roda jari-jari"""
        m = self.m
        c, s = math.cos(rot), math.sin(rot)
        at = lambda f, z, g=0.0: (x + c * f - s * g, y + s * f + c * g, z)  # noqa: E731
        m.box(at(0, 0.85), (1.7, 0.8, 0.9), badan, rot, solid=True, top=1.3)
        m.box(at(0, 0.42), (1.74, 0.84, 0.04), self.besi, rot)
        m.box(at(0, 1.33), (1.86, 0.92, 0.05), self.putih, rot)
        m.box(at(-0.4, 1.66), (0.72, 0.62, 0.58), self.kaca, rot)
        m.box(at(-0.4, 1.98), (0.8, 0.7, 0.05), self.besi, rot)
        for f, g in ((-0.77, -0.3), (-0.03, -0.3), (-0.77, 0.3), (-0.03, 0.3)):
            m.cyl(at(f, 1.65, g), 0.015, 0.6, self.besi, 6)
        m.cyl(at(0.5, 1.56), 0.24, 0.42, self.besi, 16)
        m.cyl(at(0.5, 1.8), 0.25, 0.04, self.putih, 16)
        for g in (-0.5, 0.5):
            self.roda(at(0.2, 0.31, g), rot, 0.3, self.karet, 0.03, 8, self.besi)
        for g in (-0.3, 0.3):
            m.rope(at(-0.85, 1.05, g), at(-1.4, 1.1, g), 0.025, self.besi, 0, 1, 6)
        m.cyl(at(0.86, 1.8), 0.025, 1.6, self.besi, 8)
        m.fan(at(0.2, 2.5), 1.25, 2.86, payung, n=12)
        if asap:
            m.life['asap'].append([at(0.5, 0)[0], 1.95, -at(0.5, 0)[1]])
        m.spot(x - s * 0.8, y + c * 0.8, -s, c, 'ringkuk')

    def motor(self, x, y, rot, body):
        """motor bebek parkir: rangka lengkung, tameng depan, jok, velg, spion, dan knalpot"""
        m = self.m
        c, s = math.cos(rot), math.sin(rot)
        at = lambda f, z, g=0.0: (x + c * f - s * g, y + s * f + c * g, z)  # noqa: E731
        for f in (-0.62, 0.62):
            self.roda(at(f, 0.3), rot, 0.25, self.karet, 0.05, 8, self.besi)
        m.ball(at(-0.28, 0.62), 0.3, body, (1.45, 0.62, 0.72), rot)
        m.ball(at(0.46, 0.72), 0.22, body, (0.34, 1.05, 1.5), rot)
        m.rope(at(0.08, 0.5), at(0.42, 0.68), 0.08, body, 0, 1, 8)
        m.rope(at(0.08, 0.5), at(-0.2, 0.42), 0.09, body, 0, 1, 8)
        m.ball(at(-0.34, 0.88), 0.27, self.karet, (1.5, 0.72, 0.28), rot)
        m.rope(at(0.54, 0.3), at(0.5, 1.02), 0.03, self.besi, 0, 1, 6)
        m.ball(at(0.56, 1.02), 0.11, body, (0.8, 1.2, 0.8), rot)
        m.ball(at(0.65, 1.02), 0.06, self.lampu)
        m.rope(at(0.5, 1.06, -0.34), at(0.5, 1.06, 0.34), 0.016, self.besi, 0, 1, 6)
        m.rope(at(-0.05, 0.26, -0.13), at(-0.82, 0.32, -0.13), 0.042, self.besi, 0, 1, 8)
        m.solid(x, y, 1.7, 0.5, 1.1, rot)
        m.spot(x - s * 0.6, y + c * 0.6, -s, c, 'ringkuk')

    def peti(self, x, y, mat, n=2, rot=0.0, spot=True):
        m = self.m
        for i in range(n):
            m.box((x, y, 0.25 + i * 0.46), (0.75, 0.55, 0.46), mat, rot + i * 0.15, solid=i == 0, top=0.25 + n * 0.46)
        if spot:
            m.spot(x + 0.75, y, 1, 0, 'ringkuk')

    def tong(self, x, y, mat=None):
        m = self.m
        m.cyl((x, y, 0.48), 0.32, 0.96, mat or self.biru, 14, solid=True)
        m.spot(x + 0.5, y, 1, 0, 'ringkuk')

    def kursi(self, x, y, rot=0.0, mat=None):
        m = self.m
        mat = mat or self.merah
        m.box((x, y, 0.44), (0.42, 0.42, 0.05), mat, rot, solid=True)
        c, s = math.cos(rot), math.sin(rot)
        m.box((x - s * 0.2, y + c * 0.2, 0.72), (0.42, 0.05, 0.5), mat, rot)
        for ax, ay in ((-0.18, -0.18), (0.18, -0.18), (-0.18, 0.18), (0.18, 0.18)):
            m.cyl((x + ax * c - ay * s, y + ax * s + ay * c, 0.21), 0.022, 0.42, mat, 6)

    def bangku(self, x, y, panjang, mat, rot=0.0):
        """bangku panjang kayu; `rot` 0 = memanjang di sumbu x"""
        m = self.m
        m.box((x, y, 0.45), (panjang, 0.5, 0.08), mat, rot, solid=True, top=0.5)
        c, s = math.cos(rot), math.sin(rot)
        m.box((x + s * 0.24, y - c * 0.24 + 0.48 * c, 0.8), (panjang, 0.06, 0.4), mat, rot)
        for f in (-0.42, 0.42):
            m.box((x + c * f * panjang, y + s * f * panjang, 0.21), (0.08, 0.46, 0.42), self.besi, rot)

    def bola_lampu(self, a, b, n, kendur=0.35):
        """tali lampu: kabel melengkung dan bola menyala"""
        m = self.m
        m.rope(a, b, 0.01, self.kabel, kendur, 8)
        for i in range(n):
            t = (i + 0.5) / n
            z = a[2] + (b[2] - a[2]) * t - kendur * 4 * t * (1 - t) - 0.07
            bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.055, location=(0, 0, 0))
            o = bpy.context.object
            m._keep(o, self.lampu)
            o.location = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z)
