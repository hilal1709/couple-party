# Pustaka dapur Dapur Kacau di atas petak_lib.Map: denah dibaca dari masak_layouts.json (ditulis scripts/masak-layout.mts)
# supaya meja, kompor, dan peti di Blender tepat di petak yang sama dengan game. Satu stasiun = satu petak CELL.
# Benda statis digabung + lightmap (bake Cycles); barang yang dipegang pemain ada di masak_props.py.
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, noise, set_sky  # noqa: E402,F401

import numpy as np  # noqa: E402

DATA = json.loads((Path(__file__).resolve().parent / 'masak_layouts.json').read_text(encoding='utf-8'))
CELL = DATA['cell']
TOP = DATA['top']


def checker(size, a, b, grout, rng, n=2, grime=0.12):
    """ubin dua warna bernat, dengan noda halus: satu gambar = n × n keping"""
    y, x = np.mgrid[0:size, 0:size] / size
    cx = np.floor(x * n).astype(int)
    cy = np.floor(y * n).astype(int)
    c = np.where(((cx + cy) % 2 == 0)[..., None], np.array(a, dtype=np.float32), np.array(b, dtype=np.float32))
    fx = (x * n) % 1
    fy = (y * n) % 1
    edge = np.minimum.reduce([fx, 1 - fx, fy, 1 - fy])
    c = np.where((edge < 0.025)[..., None], np.array(grout, dtype=np.float32), c)
    # kilap tiap keping sedikit berbeda + noda
    tone = 0.96 + ((cx * 7 + cy * 13) % 5)[..., None] * 0.012
    dirt = noise(size, rng, 6)[..., None]
    return np.clip(c * tone * (1 - grime + dirt * grime * 2), 0, 1)


class Dapur:
    """`theme` = nama material per bagian; diisi skrip tiap dapur"""

    def __init__(self, kid, seed=11, lm=2048):
        self.kid = kid
        self.d = DATA[kid]
        self.m = Map(kid, seed, lm=lm)
        self.W = self.d['w'] * CELL
        self.H = self.d['h'] * CELL
        rng = np.random.default_rng(seed)
        m = self.m
        # bahan bersama
        self.BATA = m.tex('bata', 'brick_4', 1.0, rough=0.85)
        self.BATU = m.tex('batu_oven', 'concrete_tiles', 0.8, tint='#c9bba8', rough=0.8)
        self.BARA = m.flat('neon_bara', '#ff5a1f', 0.5, emit=8.0)
        self.SABUK = m.image('belt_sabuk', np.clip(np.repeat(np.where((np.arange(256) % 32) < 3, 0.05, 0.14)[None, :, None], 256, axis=0) * np.ones((1, 1, 3)) + noise(256, rng, 20)[..., None] * 0.05, 0, 1).astype(np.float32), 0.7, tile=0.6)
        self.BAJA = m.flat('baja', '#c9ced4', 0.28, 0.85)
        self.BAJA_GELAP = m.flat('baja_gelap', '#2c2f35', 0.4, 0.7)
        self.KARET = m.flat('karet', '#18191c', 0.7)
        self.AIR = m.flat('air_wastafel', '#8cc4dc', 0.05, 0.1)
        self.LANTAI = m.image('lantai', checker(512, (0.93, 0.9, 0.84), (0.3, 0.29, 0.33), (0.6, 0.57, 0.53), rng), 0.35, tile=CELL * 2)
        # baja tergosok: goresan halus searah supaya puncak meja tidak tampak plastik
        y, x = np.mgrid[0:256, 0:256] / 256
        streak = np.repeat(noise(256, rng, 64, 2)[:1], 256, axis=0) * 0.6 + noise(256, rng, 12) * 0.4
        sikat = np.clip(np.array((0.8, 0.82, 0.85), dtype=np.float32)[None, None] * (0.86 + streak[..., None] * 0.2), 0, 1)
        self.MARMER = m.image('baja_meja', sikat, 0.32, tile=0.6)
        m.mats['baja_meja'][0].node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.55
        self.TALENAN = m.tex('talenan', 'plywood', 0.8, tint='#e6b07a', rough=0.6)

    # ---------- koordinat ----------
    @property
    def stations(self):
        return self.d['stations']

    def facing(self, st):
        """sudut Z menghadap lantai (arah buka pertama), 0 = menghadap -Y Blender"""
        if not st['open']:
            return 0.0
        dx, dy = st['open'][0]
        return math.atan2(dx, -dy)

    # ---------- bagian dapur ----------
    def lemari(self, st, badan, puncak, tinggi=TOP):
        """lemari dapur: badan bertekstur, pintu bergaris, puncak tebal sedikit menjorok"""
        m = self.m
        x, y = st['x'], st['y']
        m.box((x, y, (tinggi - 0.06) / 2), (CELL * 0.98, CELL * 0.98, tinggi - 0.06), badan, bevel=0.02)
        m.box((x, y, tinggi - 0.03), (CELL, CELL, 0.06), puncak, bevel=0.015, cont=True)
        # alas hitam & pegangan pintu di sisi terbuka
        m.box((x, y, 0.04), (CELL * 0.96, CELL * 0.96, 0.08), self.KARET, bevel=0.01)
        for dx, dy in st['open']:
            ox, oy = x + dx / CELL * (CELL * 0.49 + 0.005), y + dy / CELL * (CELL * 0.49 + 0.005)
            along = 'x' if abs(dy) > abs(dx) else 'y'
            sz = (0.36, 0.02, 0.025) if along == 'x' else (0.02, 0.36, 0.025)
            m.box((ox, oy, tinggi - 0.18), sz, self.BAJA, bevel=0.006)
            # celah antar pintu
            gap = (0.006, 0.01, tinggi - 0.32) if along == 'x' else (0.01, 0.006, tinggi - 0.32)
            m.box((ox, oy, (tinggi - 0.24) / 2 + 0.12), gap, self.KARET, bevel=0)

    def kompor(self, st):
        m = self.m
        x, y = st['x'], st['y']
        self.lemari(st, self.theme['badan_kompor'], self.BAJA_GELAP)
        # tungku: cincin api + kisi (wajan/panci adalah barang yang bisa diangkat, ada di props.glb)
        m.cyl((x, y, TOP + 0.004), 0.3, 0.01, self.BAJA_GELAP, verts=32)
        m.cyl((x, y, TOP + 0.012), 0.2, 0.008, self.BARA, verts=24)
        for a in range(4):
            m.box((x, y, TOP + 0.02), (0.56 if a % 2 == 0 else 0.03, 0.03 if a % 2 == 0 else 0.56, 0.02), self.KARET, rot=a * math.pi / 4, bevel=0.004)
        # kenop di depan
        for dx, dy in st['open'][:1]:
            for i in (-1, 1):
                along = abs(dy) > abs(dx)
                ox = x + dx * 0.41 + (i * 0.18 if along else 0)
                oy = y + dy * 0.41 + (0 if along else i * 0.18)
                m.cyl((ox, oy, TOP - 0.12), 0.035, 0.03, self.KARET, verts=16, rot=(math.pi / 2, 0, self.facing(st)))

    def talenan(self, st):
        m = self.m
        self.lemari(st, self.theme['badan'], self.MARMER)
        m.asset('wooden_cutting_board', (st['x'], st['y'], TOP), rot=self.facing(st) + math.pi / 2, width=0.82, tris=1200)

    def peti(self, st, isi):
        """lemari + peti kayu terbuka berisi bahan"""
        m = self.m
        self.lemari(st, self.theme['badan'], self.MARMER)
        m.asset('wooden_crate_02', (st['x'], st['y'], TOP), rot=self.facing(st), width=0.98, tris=1500, keep='wooden_crate_02_crate')
        isi(st)

    def wastafel(self, st):
        m = self.m
        x, y = st['x'], st['y']
        self.lemari(st, self.theme['badan'], self.BAJA)
        m.block(x - 0.42, y - 0.36, x + 0.42, y + 0.36, TOP - 0.2, TOP + 0.005, self.BAJA_GELAP)
        m.block(x - 0.38, y - 0.32, x + 0.38, y + 0.32, TOP - 0.12, TOP - 0.1, self.AIR)
        # keran melengkung dari sisi belakang
        bx = x - (st['open'][0][0] / CELL) * 0.48 if st['open'] else x
        by = y - (st['open'][0][1] / CELL) * 0.48 if st['open'] else y + 0.48
        m.rope((bx, by, TOP), (bx, by, TOP + 0.42), 0.025, self.BAJA, 0, 1, 12)
        m.rope((bx, by, TOP + 0.42), (x + (bx - x) * 0.35, y + (by - y) * 0.35, TOP + 0.36), 0.022, self.BAJA, 0, 1, 12)

    def tong(self, st):
        m = self.m
        m.asset('metal_trash_can', (st['x'], st['y'], 0), rot=self.facing(st), height=TOP + 0.02, tris=1800, keep='metal_trash_can')

    def loket(self, st):
        """loket saji: meja berwarna + rak atas berlampu hangat"""
        m = self.m
        x, y = st['x'], st['y']
        self.lemari(st, self.theme['badan_loket'], self.theme['puncak_loket'])
        m.cyl((x, y, 1.75), 0.03, 0.02, self.BAJA, verts=8)
        m.box((x, y, 1.72), (CELL * 0.9, 0.3, 0.06), self.BAJA, bevel=0.01)
        m.box((x, y, 1.69), (CELL * 0.8, 0.22, 0.02), self.theme['lampu_hangat'], bevel=0)

    def piring(self, st):
        self.lemari(st, self.theme['badan'], self.BAJA)

    def oven(self, st):
        """oven pizza: lemari bata, lantai batu, kubah bata di separuh belakang dengan bara menyala"""
        m = self.m
        x, y = st['x'], st['y']
        self.lemari(st, self.BATA, self.BATU)
        dx, dy = st['open'][0] if st['open'] else (0, -CELL)
        bx, by = x - dx / CELL * 0.32, y - dy / CELL * 0.32
        rot = self.facing(st)
        # kubah: setengah bola bata, mulut menghadap lantai
        m.ball((bx, by, TOP), 0.42, self.BATA, (1, 0.7, 0.75), rot=rot)
        m.box((bx + dx / CELL * 0.2, by + dy / CELL * 0.2, TOP + 0.14), (0.36 if abs(dy) > abs(dx) else 0.06, 0.06 if abs(dy) > abs(dx) else 0.36, 0.24), self.BARA, rot=0, bevel=0.01)
        m.cyl((bx, by, TOP + 0.5), 0.07, 0.4, self.BAJA_GELAP, verts=16)

    def sabuk(self, st):
        """sabuk berjalan: rangka baja rendah, karet gelap di atas (tekstur bergeser di game)"""
        m = self.m
        x, y = st['x'], st['y']
        m.box((x, y, (TOP - 0.1) / 2), (CELL * 0.96, CELL * 0.96, TOP - 0.1), self.theme['badan'], bevel=0.02)
        m.box((x, y, TOP - 0.05), (CELL, CELL, 0.1), self.BAJA, bevel=0.012, cont=True)
        m.box((x, y, TOP - 0.004), (CELL * 0.86, CELL * 0.86, 0.012), self.SABUK, bevel=0, cont=True)

    def loket_lift(self, st, i):
        """loket berlift: rana gulung di atas loket turun saat lift turun (bergerak di game)"""
        self.loket(st)
        m = self.m
        x, y = st['x'], st['y']
        with m.moving(f'rana_{i}', (x, y, TOP + 0.95)):
            for k in range(7):
                m.box((x, y, TOP + 0.65 + k * 0.09), (0.12, CELL * 0.92, 0.085), self.BAJA, bevel=0.01)

    def meja(self, st):
        self.lemari(st, self.theme['badan'], self.MARMER)

    # ---------- ruang ----------
    def ruang(self, dinding, lis, tinggi=3.0, lantai=None):
        """lantai ubin, dinding belakang & samping. Sisi depan terbuka untuk kamera.
        Sambungan gerbong (`gap`): lantai dibelah, di bawahnya jurang rel, jembatan pelat = benda bergerak"""
        m = self.m
        W, H = self.W, self.H
        lantai = lantai or self.LANTAI
        gap = self.d.get('gap') or []
        if gap:
            gx = gap[0][0]
            m.block(-W / 2, -H / 2, gx - CELL / 2, H / 2, -0.04, 0.0, lantai, cont=True)
            m.block(gx + CELL / 2, -H / 2, W / 2, H / 2, -0.04, 0.0, lantai, cont=True)
            # jurang: rel & bantalan jauh di bawah, terlihat saat jembatan terangkat
            m.block(gx - CELL / 2, -H / 2, gx + CELL / 2, H / 2, -1.2, -1.15, self.KARET)
            for k in range(-4, 5):
                m.box((gx, k * 0.6, -1.12), (CELL * 0.9, 0.18, 0.06), self.theme.get('bantalan', self.KARET), bevel=0.01)
            for side in (-0.36, 0.36):
                m.box((gx + side, 0, -1.05), (0.06, H, 0.08), self.BAJA, bevel=0.01)
            ys = [g[1] for g in gap]
            with m.moving('jembatan', (gx, sum(ys) / len(ys), 0)):
                m.block(gx - CELL / 2, min(ys) - CELL / 2, gx + CELL / 2, max(ys) + CELL / 2, -0.03, 0.0, self.theme.get('pelat', self.BAJA))
        elif any(self.d.get('lava') or []):
            # lantai per petak; petak lava = kolam bara di bawah + pelat batu yang turun saat lava naik (benda bergerak)
            cells = {(round(x, 2), round(y, 2)): g for g, grp in enumerate(self.d['lava']) for x, y in grp}
            for r in range(self.d['h']):
                for c in range(self.d['w']):
                    x = (c - (self.d['w'] - 1) / 2) * CELL
                    y = -(r - (self.d['h'] - 1) / 2) * CELL
                    if (round(x, 2), round(y, 2)) in cells:
                        continue
                    m.block(x - CELL / 2, y - CELL / 2, x + CELL / 2, y + CELL / 2, -0.04, 0.0, lantai, cont=True)
            for (x, y), g in cells.items():
                m.block(x - CELL / 2, y - CELL / 2, x + CELL / 2, y + CELL / 2, -0.5, -0.32, self.theme['lava'])
                m.block(x - CELL / 2, y - CELL / 2, x + CELL / 2, y + CELL / 2, -0.32, -0.3, self.theme['lava_kerak'])
            for g, grp in enumerate(self.d['lava']):
                if not grp:
                    continue
                cx = sum(p[0] for p in grp) / len(grp)
                cy = sum(p[1] for p in grp) / len(grp)
                with m.moving(f'kisi_{g}', (cx, cy, 0)):
                    for x, y in grp:
                        m.block(x - CELL / 2 + 0.02, y - CELL / 2 + 0.02, x + CELL / 2 - 0.02, y + CELL / 2 - 0.02, -0.05, 0.0, self.theme['kisi'])
        else:
            m.block(-W / 2, -H / 2, W / 2, H / 2, -0.04, 0.0, lantai, cont=True)
        t = 0.2
        m.block(-W / 2 - t, H / 2, W / 2 + t, H / 2 + t, 0, tinggi, dinding, cont=True)
        m.block(-W / 2 - t, -H / 2, -W / 2, H / 2 + t, 0, tinggi * 0.55, dinding, cont=True)
        m.block(W / 2, -H / 2, W / 2 + t, H / 2 + t, 0, tinggi * 0.55, dinding, cont=True)
        # lis bawah
        m.block(-W / 2, H / 2 - 0.02, W / 2, H / 2, 0, 0.14, lis)
        # lantai luar yang gelap supaya dapur terbaca sebagai panggung
        m.block(-W, -H, W, -H / 2, -0.06, -0.04, self.KARET)

    def build(self, isi_peti):
        lifts = 0
        for st in self.stations:
            k = st['kind']
            if k == 'serve' and self.d.get('gimmick') == 'lift':
                self.loket_lift(st, lifts)
                lifts += 1
                continue
            if k == 'oven':
                self.oven(st)
            elif k == 'belt':
                self.sabuk(st)
            elif k == 'stove':
                self.kompor(st)
            elif k == 'board':
                self.talenan(st)
            elif k == 'crate':
                self.peti(st, isi_peti)
            elif k == 'sink':
                self.wastafel(st)
            elif k == 'trash':
                self.tong(st)
            elif k == 'serve':
                self.loket(st)
            elif k == 'plates':
                self.piring(st)
            else:
                self.meja(st)
