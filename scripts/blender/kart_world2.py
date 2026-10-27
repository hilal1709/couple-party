# Landmark 7 map Kart Kacau (selain Pantai), dimodel manual di Blender (bukan AI).
# Model gerbang/terowongan ("gapura-*", "gerbang-*", "gua-es", "jembatan-*") berpusat di titik asal
# dan membentang sumbu X selebar 64 m (jalan + dinding), dipasang melintang di atas jalan oleh world.ts.
# Bagian bernama: kincir-angin → blades; menara-tv → light; pabrik-permen → smoke_1..3 (titik asap).
# Jalankan: blender --background --python scripts/blender/kart_world2.py -- <folder-png> <folder-glb> [nama ...]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

R90 = math.radians(90)
SPAN = 32  # setengah bentang gerbang (m)


def legs_and_beam(mat_leg, mat_beam, h=14, leg=3.0, beam=3.0):
    """kerangka gerbang dasar: dua kaki di luar dinding + balok atas"""
    parts = [cube((s * (SPAN - leg / 2), 0, h / 2), (leg, leg, h), mat_leg, b=0.2) for s in (-1, 1)]
    parts.append(cube((0, 0, h + beam / 2), (SPAN * 2 + 2, leg + 0.6, beam), mat_beam, b=0.2))
    return parts


# ---------------------------------------------------------------------------
# Sawah

def saung():
    """Saung bambu panggung beratap ijuk, tangga, bale."""
    bamboo = pbr('#c9a86a', 0.7)
    dark = pbr('#3a2a22', 0.95)
    parts = []
    for x in (-2.5, 2.5):
        for y in (-2.0, 2.0):
            parts.append(cyl((x, y, 2.0), 0.18, 4.0, bamboo, verts=10))
    parts.append(cube((0, 0, 1.5), (5.6, 4.6, 0.2), bamboo, b=0.03))
    for k in range(12):
        parts.append(cyl((-2.6 + k * 0.47, 0, 1.62), 0.1, 4.4, bamboo, rot=(R90, 0, 0), verts=8, b=0))
    roof = cyl((0, 0, 5.2), 4.6, 2.6, dark, verts=4, r2=0.1, b=0)
    roof.rotation_euler = (0, 0, math.radians(45))
    roof.scale = (1.25, 1.0, 1)
    parts.append(roof)
    parts.append(cube((0, 0, 6.55), (0.3, 4.6, 0.3), dark, b=0.05))
    for k in range(5):
        parts.append(cube((0, -2.6 - k * 0.32, 1.4 - k * 0.28), (1.4, 0.3, 0.08), bamboo, b=0.02))
    parts.append(cube((-1.2, 0.6, 1.9), (1.4, 1.0, 0.6), pbr('#ff37a6', 0.7), b=0.1))
    return parts


def kincir_angin():
    """Kincir bambu petani dengan baling-baling bernama `blades` (diputar di game)."""
    bamboo = pbr('#c9a86a', 0.7)
    parts = [cyl((0, 0, 4.5), 0.18, 9.0, bamboo, verts=10)]
    parts.append(cyl((0, -0.4, 9.0), 0.3, 0.8, pbr('#8a5a2a', 0.8), rot=(R90, 0, 0), verts=12))
    blades = empty('blades', (0, -0.9, 9.0))
    b = []
    for k in range(4):
        a = k / 4 * math.tau
        b.append(cube((math.cos(a) * 1.8, -0.9, 9.0 + math.sin(a) * 1.8), (3.4, 0.05, 0.6), pbr('#fff4fa', 0.8) if k % 2 else pbr('#ff3b5c', 0.7), rot=(0, -a, 0), b=0.02))
    parent(b, blades)
    parts.append(cube((0, 0.9, 9.0), (0.08, 1.6, 0.9), bamboo, b=0))
    return parts


def bendera_rp():
    """Tiang bendera merah-putih dengan umbul-umbul."""
    parts = [cyl((0, 0, 6), 0.12, 12, pbr('#e8e8f0', 0.3, metal=0.7), verts=10), sphere((0, 0, 12.1), 0.22, pbr('#ffcc1f', 0.3, metal=0.8))]
    parts.append(cube((1.6, 0, 11.2), (3.0, 0.04, 0.9), pbr('#ff3b5c', 0.6), b=0))
    parts.append(cube((1.6, 0, 10.3), (3.0, 0.04, 0.9), pbr('#fff4fa', 0.6), b=0))
    parts.append(cube((0, 0, 0.3), (1.4, 1.4, 0.6), pbr('#b8b0a8', 0.9), b=0.05))
    return parts


def gapura_sawah():
    """Gapura bambu desa melintang jalan: tiang bambu ikat, umbul-umbul, papan 'SELAMAT NGEBUT'."""
    bamboo = pbr('#c9a86a', 0.7)
    rope = pbr('#7a5a3a', 0.9)
    parts = []
    for s in (-1, 1):
        for d in (-0.6, 0.6):
            parts.append(cyl((s * (SPAN - 1.5) + d, 0, 6.5), 0.3, 13, bamboo, verts=10))
        for z in (3, 7, 11):
            parts.append(torus((s * (SPAN - 1.5), 0, z), 0.75, 0.08, rope))
        pole = tube([(s * (SPAN - 0.5), 0, 13), (s * (SPAN - 3), 0, 19), (s * (SPAN - 7), 0, 21)], 0.12, bamboo)
        parts.append(pole)
        parts.append(cube((s * (SPAN - 7.2), 0, 19.6), (0.6, 0.05, 3.0), pbr('#ff3b5c', 0.7), b=0))
    for k in range(9):
        parts.append(cyl((0, -0.3 + (k % 3) * 0.3, 13.2 + (k // 3) * 0.6), 0.3, SPAN * 2, bamboo, rot=(0, R90, 0), verts=10, b=0))
    parts.append(cube((0, -0.6, 11.2), (20, 0.15, 2.6), pbr('#fff4fa', 0.6), b=0.05))
    parts.append(text3d('SELAMAT NGEBUT', (0, -0.7, 11.2), 1.6, pbr('#43b929', 0.5), extrude=0.06))
    for k in range(14):
        x = -SPAN + 2 + k * (SPAN * 2 - 4) / 13
        parts.append(cyl((x, -0.5, 12.6), 0.55, 1.1, pbr(['#ff37a6', '#ffcc1f', '#5cf64a', '#2f7bff'][k % 4], 0.6), rot=(0, 0, 0), verts=3, r2=0.0, b=0))
    return parts


# ---------------------------------------------------------------------------
# Hutan Jamur

def jamur_raksasa():
    """Jamur raksasa 18 m bercahaya: tudung ungu berbintik menyala, insang, batang berbonggol."""
    parts = [cyl((0, 0, 7), 2.2, 14, pbr('#fff0e0', 0.6), verts=24, r2=1.6)]
    for k in range(5):
        parts.append(sphere((math.cos(k * 1.3) * 1.9, math.sin(k * 1.3) * 1.9, 2 + k * 2.4), 0.6, pbr('#ffe0c8', 0.7), (1, 1, 0.7), seg=12))
    parts.append(sphere((0, 0, 15), 9, pbr('#8a55ff', 0.35, coat=0.6), (1, 1, 0.42), seg=36))
    parts.append(cyl((0, 0, 14.2), 8.6, 0.6, pbr('#ffcae9', 0.6, emit=0.6), verts=48, r2=1.8, b=0))
    for k in range(18):
        a = k / 18 * math.tau
        r = 3 + (k % 3) * 1.8
        parts.append(sphere((math.cos(a) * r, math.sin(a) * r, 15 + 3.6 * (1 - (r / 9) ** 2) ** 0.5), 0.6, pbr('#5cf6ff', 0.3, emit=4), (1, 1, 0.4), seg=12))
    return parts


def rumah_jamur():
    """Rumah di dalam jamur: pintu bundar, jendela bercahaya, cerobong."""
    wall = pbr('#fff0e0', 0.7)
    parts = [cyl((0, 0, 2.6), 3.0, 5.2, wall, verts=28, r2=2.6)]
    parts.append(sphere((0, 0, 6.0), 4.6, pbr('#ff3b5c', 0.35, coat=0.6), (1, 1, 0.6), seg=32))
    for k in range(10):
        a = k / 10 * math.tau
        parts.append(sphere((math.cos(a) * 3.0, math.sin(a) * 3.0, 7.9), 0.5, pbr('#fff4fa', 0.4), (1, 1, 0.45), seg=12))
    parts.append(cyl((0, -2.9, 1.4), 1.0, 0.2, pbr('#8a5a2a', 0.8), rot=(R90, 0, 0), verts=24))
    for x in (-1.8, 1.8):
        parts.append(cyl((x, -2.6, 3.4), 0.55, 0.2, pbr('#ffcc1f', 0.2, emit=3), rot=(R90, 0, 0), verts=20, b=0))
    parts.append(cyl((1.8, 1.0, 9.2), 0.45, 2.0, pbr('#8a7a6a', 0.8), verts=12))
    return parts


def gerbang_akar():
    """Terowongan akar raksasa melengkung di atas jalan, berlumut, dengan lampion jamur."""
    bark = pbr('#5a3a2a', 0.9)
    moss = pbr('#5cb845', 0.85)
    parts = []
    for k in range(5):
        y = -6 + k * 3
        pts = [(-SPAN, y, 0), (-SPAN * 0.8, y + 1, 12), (0, y, 20 + (k % 2) * 2), (SPAN * 0.8, y - 1, 12), (SPAN, y, 0)]
        parts.append(tube(pts, 1.4 - (k % 2) * 0.4, bark, res=2))
        parts.append(tube(pts[1:4], 1.5 - (k % 2) * 0.4, moss, res=1))
    for k in range(8):
        x = -20 + k * 5.7
        parts.append(tube([(x, -3, 19 - abs(x) * 0.25), (x + 0.5, -3, 15 - abs(x) * 0.25)], 0.12, moss))
        parts.append(sphere((x + 0.5, -3, 14.6 - abs(x) * 0.25), 0.5, pbr('#5cf6ff', 0.3, emit=3), (1, 1, 0.6), seg=12))
    return parts


# ---------------------------------------------------------------------------
# Gurun Candi

STONE = '#c9a26a'


def candi():
    """Candi bertingkat: kaki berundak, badan bermotif relung, tangga di keempat sisi, atap bertingkat."""
    stone = pbr(STONE, 0.9)
    stone2 = pbr('#b58c56', 0.9)
    dark = pbr('#5a4a3a', 0.9)
    parts = []
    for k in range(4):
        w = 28 - k * 5
        parts.append(cube((0, 0, 1 + k * 2), (w, w, 2), stone if k % 2 else stone2, b=0.15))
        for j in range(int(w / 3)):
            for s in (-1, 1):
                parts.append(cube((-w / 2 + 1.5 + j * 3, s * (w / 2 + 0.05), 1 + k * 2), (1.6, 0.1, 1.2), dark, b=0))
    for a in range(4):
        r = a * R90
        for k in range(10):
            d = 14 + 1 - k * 0.9
            parts.append(cube((math.sin(r) * d, -math.cos(r) * d, k * 0.8 + 0.4), (4, 1.0, 0.8) if a % 2 == 0 else (1.0, 4, 0.8), stone2, b=0.04))
    parts.append(cube((0, 0, 11), (10, 10, 6), stone, b=0.15))
    for s in (-1, 1):
        parts.append(cube((0, s * 5.05, 11), (3, 0.2, 4), dark, b=0.05))
        parts.append(cube((s * 5.05, 0, 11), (0.2, 3, 4), dark, b=0.05))
    for k in range(4):
        parts.append(cube((0, 0, 14.5 + k * 1.6), (8 - k * 1.8, 8 - k * 1.8, 1.4), stone2 if k % 2 else stone, b=0.1))
        for x in (-1, 1):
            for y in (-1, 1):
                parts.append(cyl((x * (4 - k * 0.9), y * (4 - k * 0.9), 15.9 + k * 1.6), 0.4, 1.4, stone, verts=8, r2=0.05, b=0))
    parts.append(cyl((0, 0, 22.5), 1.2, 3.5, stone, verts=12, r2=0.1))
    return parts


def gapura_candi():
    """Gapura paduraksa melintang jalan: dua menara bata berundak dihubungkan ambang berukir."""
    brick = pbr('#c46a4a', 0.85)
    stone = pbr(STONE, 0.9)
    parts = []
    for s in (-1, 1):
        x = s * (SPAN - 3)
        for k in range(6):
            w = 6 - k * 0.7
            parts.append(cube((x, 0, 1.5 + k * 3), (w, w, 3), brick if k % 2 == 0 else stone, b=0.1))
        parts.append(cyl((x, 0, 20), 1.2, 3, stone, verts=8, r2=0.1))
    parts.append(cube((0, 0, 15.5), (SPAN * 2 - 6, 4, 3), brick, b=0.15))
    parts.append(cube((0, 0, 17.4), (SPAN * 2 - 10, 3.4, 0.8), stone, b=0.08))
    for k in range(12):
        parts.append(cube((-SPAN + 8 + k * 4.4, -2.05, 15.5), (1.6, 0.1, 1.6), pbr('#8a4a3a', 0.9), rot=(0, math.radians(45), 0), b=0))
    parts.append(sphere((0, -2.1, 15.5), 1.4, stone, (1.2, 0.4, 1)))
    return parts


def tenda():
    """Tenda pedagang gurun bergaris + unta kartun duduk."""
    cloth = [pbr('#ff8a1c', 0.8), pbr('#fff4fa', 0.8)]
    parts = [cyl((0, 0, 3.3), 3.8, 3.4, cloth[0], verts=8, r2=0.1, b=0)]
    for k in range(4):
        # garis putih di atap kerucut
        parts.append(cube((0, 0, 3.3), (0.35, 7.4, 0.05), cloth[1], rot=(0, -0.9, k * math.pi / 4), b=0))
    parts.append(cyl((0, 0, 0.8), 3.6, 1.6, cloth[1], verts=8, b=0))
    parts.append(cube((0, -3.35, 0.9), (1.6, 0.1, 1.8), pbr('#3a2a22', 0.8), b=0))
    parts.append(cyl((0, 0, 5.2), 0.08, 1.4, pbr('#8a6a4a', 0.8), verts=6))
    parts.append(cube((0.6, 0, 6.0), (1.0, 0.03, 0.6), pbr('#ff37a6', 0.6), b=0))
    fur = pbr('#d9a86a', 0.85)
    parts.append(sphere((6, 1, 1.2), 1.4, fur, (1.6, 1, 0.7)))
    parts.append(sphere((5.6, 1, 2.1), 0.7, fur, (1, 1, 1.1)))
    parts.append(tube([(4.2, 1, 1.4), (3.4, 1, 2.8), (3.2, 1, 3.6)], 0.32, fur))
    parts.append(sphere((3.0, 0.9, 3.8), 0.55, fur, (1.4, 0.9, 0.9)))
    parts += eyes_on(2.75, 0.4, 4.0, 0.1)
    return parts


# ---------------------------------------------------------------------------
# Kota Neon

def menara_tv():
    """Menara TV 60 m: kaki rangka, piringan pengamat bercahaya, antena berlampu `light`."""
    steel = pbr('#3a3a50', 0.35, metal=0.8)
    parts = []
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        parts.append(tube([(math.cos(a) * 7, math.sin(a) * 7, 0), (math.cos(a) * 3, math.sin(a) * 3, 20), (math.cos(a) * 1.2, math.sin(a) * 1.2, 42)], 0.5, steel, res=1))
    for z in (10, 20, 30):
        r = 7 - z * 0.14
        parts.append(torus((0, 0, z), r, 0.25, steel))
    parts.append(cyl((0, 0, 30), 1.3, 30, steel, verts=16, r2=0.9))
    parts.append(sphere((0, 0, 44), 5, pbr('#2a2a40', 0.2, metal=0.6, coat=1), (1, 1, 0.45), seg=28))
    parts.append(cyl((0, 0, 44), 5.05, 0.6, pbr('#ff37a6', 0.2, emit=5), verts=40, b=0))
    parts.append(cyl((0, 0, 52), 0.3, 12, steel, verts=8, r2=0.1))
    light = empty('light', (0, 0, 58.3))
    parent([sphere((0, 0, 58.3), 0.6, pbr('#ff3b5c', 0.1, emit=8), seg=12, sub=False)], light)
    return parts


def jembatan_layang():
    """Jembatan layang melintang di atas jalan: dek beton, tiang, pagar, lampu neon di bawah dek."""
    concrete = pbr('#8a8aa0', 0.7)
    parts = []
    for s in (-1, 1):
        for y in (-4, 4):
            parts.append(cyl((s * (SPAN - 2), y, 7), 1.4, 14, concrete, verts=16))
    parts.append(cube((0, 0, 15), (SPAN * 2 + 30, 12, 2), concrete, b=0.2))
    for y in (-6.2, 6.2):
        parts.append(cube((0, y, 16.6), (SPAN * 2 + 30, 0.3, 1.2), pbr('#e8e8f0', 0.5), b=0.03))
        parts.append(cyl((0, y * 0.98, 13.95), 0.12, SPAN * 2 + 30, pbr('#13bfae', 0.2, emit=6), rot=(0, R90, 0), verts=8, b=0))
    parts.append(cube((0, -6.1, 15), (24, 0.1, 1.6), pbr('#ff37a6', 0.3, emit=3), b=0))
    parts.append(text3d('KOTA NEON', (0, -6.2, 15), 1.3, pbr('#fff4fa', 0.2, emit=4), extrude=0.05))
    for k in range(5):
        x = -24 + k * 12
        parts.append(cyl((x, 6.0, 19), 0.15, 4, pbr('#5a5a76', 0.4, metal=0.6), verts=8))
        parts.append(sphere((x, 6.0, 21.2), 0.4, pbr('#fff6c8', 0.1, emit=5), seg=10, sub=False))
    return parts


# ---------------------------------------------------------------------------
# Pabrik Permen

def pabrik_permen():
    """Pabrik permen: gedung pink bergaris, atap gergaji, tiga cerobong (titik asap smoke_1..3), papan nama."""
    pink = pbr('#ffb0dc', 0.6)
    white = pbr('#fff4fa', 0.5)
    parts = [cube((0, 0, 6), (30, 18, 12), pink, b=0.3)]
    for k in range(6):
        parts.append(cube((-15 + k * 6 + 3, 0, 13.5), (5.6, 18, 3), white if k % 2 else pbr('#ff37a6', 0.5), rot=(0, 0.35, 0), b=0.1))
    for k in range(5):
        for z in (4, 8.5):
            parts.append(cube((-12 + k * 6, -9.05, z), (3, 0.1, 2.4), pbr('#fff6c8', 0.2, emit=2), b=0))
    for k, x in enumerate((-9, 0, 9)):
        parts.append(cyl((x, 4, 18), 1.4, 12, white, verts=16))
        for z in (14, 18, 22):
            parts.append(torus((x, 4, z), 1.42, 0.25, pbr('#ff3b5c', 0.4)))
        e = empty(f'smoke_{k + 1}', (x, 4, 24.5))
        del e
    parts.append(cube((0, -9.3, 12.6), (20, 0.3, 3), white, b=0.1))
    parts.append(text3d('PABRIK PERMEN', (0, -9.5, 12.6), 2.0, pbr('#ff37a6', 0.3, emit=1.5), extrude=0.08))
    parts.append(cube((0, -9.1, 2.5), (6, 0.2, 5), pbr('#8a5a7a', 0.6), b=0.05))
    return parts


def gerbang_permen():
    """Gerbang permen tongkat raksasa melintang jalan, berpita & lolipop."""
    parts = []
    for s in (-1, 1):
        x = s * (SPAN - 2)
        pts = [(x, 0, 0), (x, 0, 14), (x * 0.9, 0, 20), (x * 0.55, 0, 22)]
        parts.append(tube(pts, 1.4, pbr('#fff4fa', 0.3, coat=1), res=3))
        for k in range(10):
            z = 1 + k * 1.5
            parts.append(torus((x, 0, z), 1.42, 0.4, pbr('#ff3b5c', 0.3, coat=1), rot=(0.4, 0, 0)))
    parts.append(tube([(-SPAN * 0.55, 0, 22), (0, 0, 23.5), (SPAN * 0.55, 0, 22)], 1.3, pbr('#ff37a6', 0.3, coat=1)))
    parts.append(sphere((0, -0.5, 24), 3.2, pbr('#ffcc1f', 0.3, coat=1), (1, 0.25, 1), seg=28))
    for y in (-0.85, -0.2):
        pts = [(math.cos(k * 0.3) * (0.1 + k * 0.035), y - 0.05, 24 + math.sin(k * 0.3) * (0.1 + k * 0.035)) for k in range(85)]
        parts.append(tube(pts, 0.15, pbr('#fff4fa', 0.3, coat=1), res=2))
    return parts


# ---------------------------------------------------------------------------
# Puncak Salju

def pondok_ski():
    """Pondok kayu beratap salju tebal, cerobong, jendela hangat, papan ski bersandar."""
    log = pbr('#8a5a3a', 0.85)
    snow = pbr('#f4fbff', 0.6)
    parts = []
    for k in range(9):
        z = 0.4 + k * 0.7
        parts.append(cyl((0, -4, z), 0.38, 12, log, rot=(0, R90, 0), verts=10, b=0))
        parts.append(cyl((0, 4, z), 0.38, 12, log, rot=(0, R90, 0), verts=10, b=0))
        parts.append(cyl((-5.8, 0, z + 0.35), 0.38, 8.6, log, rot=(R90, 0, 0), verts=10, b=0))
        parts.append(cyl((5.8, 0, z + 0.35), 0.38, 8.6, log, rot=(R90, 0, 0), verts=10, b=0))
    for s in (-1, 1):
        r = cube((0, s * 2.6, 8.2), (13, 6.4, 0.5), pbr('#5a3a2a', 0.8), rot=(s * 0.55, 0, 0), b=0.05)
        parts.append(r)
        parts.append(cube((0, s * 2.6, 8.55), (13.4, 6.6, 0.6), snow, rot=(s * 0.55, 0, 0), sub=True))
    parts.append(cube((3.5, 2, 10), (1.4, 1.4, 4), pbr('#8a7a6a', 0.9), b=0.05))
    for x in (-3, 3):
        parts.append(cube((x, -4.4, 3.5), (2.2, 0.2, 1.8), pbr('#ffcc1f', 0.2, emit=2.5), b=0))
    for k, c in enumerate(('#ff37a6', '#2f7bff', '#5cf64a')):
        parts.append(cube((-5 + k * 0.8, -4.7, 2.0), (0.25, 0.1, 3.8), pbr(c, 0.4), rot=(0.25, 0, 0), b=0.02))
    return parts


def gua_es():
    """Terowongan gua es melintang jalan: lengkungan bongkah es bening + stalaktit."""
    ice = pbr('#9ad8ff', 0.08, alpha=0.8, coat=1)
    ice2 = pbr('#bfe9ff', 0.1, alpha=0.85, coat=1)
    snow = pbr('#f4fbff', 0.6)
    parts = []
    for k in range(18):
        a = math.pi * k / 17
        x = math.cos(a) * SPAN
        z = math.sin(a) * 20
        for y in (-5, 0, 5):
            parts.append(rock((x, y, z), 4.2, ice if (k + y) % 2 else ice2, (1, 1.2, 1), seed=k * 3 + y, sub=0))
        parts.append(rock((x, 0, z + 2.5), 3.6, snow, (1.2, 2.4, 0.6), seed=k + 100, sub=1))
    for k in range(14):
        x = -SPAN * 0.8 + k * SPAN * 1.6 / 13
        z = math.sqrt(max(0, 1 - (x / SPAN) ** 2)) * 20 - 3
        parts.append(cyl((x, (k % 3 - 1) * 3, z - 1.5), 0.7, 3 + (k % 3), ice2, rot=(math.pi, 0, 0), verts=6, r2=0.0, b=0))
    return parts


def menara_pengawas():
    """Menara pengawas lereng: kaki rangka kayu, kabin bersalju, bendera."""
    wood = pbr('#8a5a3a', 0.85)
    parts = [cyl((x, y, 5), 0.3, 10, wood, verts=8) for x in (-2, 2) for y in (-2, 2)]
    for z in (3, 7):
        for s in (-1, 1):
            parts.append(cube((0, s * 2, z), (4.4, 0.2, 0.2), wood, rot=(0, s * 0.6, 0), b=0))
    parts.append(cube((0, 0, 11), (5, 5, 3), pbr('#ff3b5c', 0.6), b=0.1))
    parts.append(cube((0, -2.55, 11.2), (3.6, 0.1, 1.4), pbr('#bfe9ff', 0.05, coat=1), b=0))
    parts.append(cyl((0, 0, 13.6), 4.2, 2.2, pbr('#f4fbff', 0.6), verts=4, r2=0.2, b=0))
    parts.append(cyl((0, 0, 16), 0.08, 3, pbr('#e8e8f0', 0.3, metal=0.7), verts=6))
    parts.append(cube((0.8, 0, 17), (1.4, 0.03, 0.8), pbr('#2f7bff', 0.6), b=0))
    return parts


# ---------------------------------------------------------------------------
# Kawah Berapi

def gunung_api():
    """Gunung berapi 70 m: lereng basalt berlekuk, kawah menyala, aliran lava di lereng."""
    import bmesh
    from mathutils import noise, Vector
    me = bpy.data.meshes.new('gunung')
    bm = bmesh.new()
    rings, segs = 26, 48
    grid = []
    for i in range(rings + 1):
        t = i / rings
        r = 60 * (1 - t) + 9 * t
        z = 70 * (1 - (1 - t) ** 1.6)
        row = []
        for j in range(segs):
            a = j / segs * math.tau
            n = noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, t * 4))) * 5
            row.append(bm.verts.new((math.cos(a) * (r + n), math.sin(a) * (r + n), z)))
        grid.append(row)
    for i in range(rings):
        for j in range(segs):
            bm.faces.new((grid[i][j], grid[i][(j + 1) % segs], grid[i + 1][(j + 1) % segs], grid[i + 1][j]))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('gunung', me)
    scene.collection.objects.link(o)
    o.data.materials.append(pbr('#2a2228', 0.9))
    for p in o.data.polygons:
        p.use_smooth = True
    parts = [o, cyl((0, 0, 68), 9.5, 2, pbr('#ff5a1a', 0.3, emit=6), verts=40, b=0)]
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        pts = [(math.cos(a) * (9 + d * 48) + math.sin(d * 9 + k) * 3, math.sin(a) * (9 + d * 48), 70 * (1 - (d) ** 0.9) + 0.6) for d in (0, 0.25, 0.5, 0.75, 1.0)]
        parts.append(tube(pts, 1.6 - k * 0.2, pbr('#ff8a1c', 0.3, emit=5), res=1))
    return parts


def kuil_obsidian():
    """Kuil batu hitam berundak dengan tiang api & kristal ungu."""
    obs = pbr('#1a1418', 0.25, coat=0.8)
    parts = []
    for k in range(3):
        parts.append(cube((0, 0, 1 + k * 2), (16 - k * 4, 12 - k * 3, 2), obs, b=0.15))
    for x in (-5, 5):
        parts.append(cyl((x, -3, 6), 0.8, 8, obs, verts=8))
        parts.append(cyl((x, -3, 10.3), 1.2, 0.6, pbr('#ff8a1c', 0.3, emit=6), verts=12, b=0))
    parts.append(cube((0, 0, 10), (10, 5, 0.8), obs, b=0.1))
    parts.append(cyl((0, 0, 11.5), 1, 3.5, pbr('#8a55ff', 0.05, emit=2, coat=1), verts=6, r2=0.0, b=0))
    for k in range(6):
        parts.append(cube((0, -7.5 + k * 0.6, 0.3 + k * 0.5), (4, 0.6, 0.5), obs, b=0.04))
    return parts


def jembatan_batu():
    """Jembatan batu lengkung di atas jalan, retakan lava menyala di bawah lengkung."""
    stone = pbr('#3a2a2a', 0.85)
    glow = pbr('#ff5a1a', 0.3, emit=5)
    parts = []
    for k in range(24):
        a = math.pi * k / 23
        x = math.cos(a) * SPAN
        z = math.sin(a) * 18
        parts.append(rock((x, 0, z), 3.4, stone, (1, 1.6, 1), seed=k + 50, sub=1))
    parts.append(cube((0, 0, 20), (SPAN * 2 + 6, 8, 2.4), stone, b=0.3))
    for s in (-1, 1):
        parts.append(cube((0, s * 3.8, 21.8), (SPAN * 2 + 6, 0.5, 1.2), stone, b=0.1))
    for k in range(10):
        x = -SPAN * 0.8 + k * SPAN * 1.6 / 9
        z = math.sqrt(max(0, 1 - (x / SPAN) ** 2)) * 18 - 2.6
        parts.append(tube([(x, -1.5, z), (x + 1.2, 0, z - 0.4), (x + 0.4, 1.5, z - 0.1)], 0.18, glow, res=1))
    return parts


GLB = {
    'saung': saung, 'kincir-angin': kincir_angin, 'bendera-rp': bendera_rp, 'gapura-sawah': gapura_sawah,
    'jamur-raksasa': jamur_raksasa, 'rumah-jamur': rumah_jamur, 'gerbang-akar': gerbang_akar,
    'candi': candi, 'gapura-candi': gapura_candi, 'tenda': tenda,
    'menara-tv': menara_tv, 'jembatan-layang': jembatan_layang,
    'pabrik-permen': pabrik_permen, 'gerbang-permen': gerbang_permen,
    'pondok-ski': pondok_ski, 'gua-es': gua_es, 'menara-pengawas': menara_pengawas,
    'gunung-api': gunung_api, 'kuil-obsidian': kuil_obsidian, 'jembatan-batu': jembatan_batu,
}

GLB_DIR.mkdir(parents=True, exist_ok=True)
for name, build in GLB.items():
    if ONLY and name not in ONLY:
        continue
    SUB['n'] = 1
    reset()
    build()
    export(name)
