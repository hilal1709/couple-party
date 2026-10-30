# Rintangan & prop detail untuk 7 map Kart Kacau (selain Pantai), dimodel manual di Blender (bukan AI).
# Bagian bernama untuk animasi di three.js: kerbau → leg_F_L/leg_F_R/leg_B_L/leg_B_R, tail, head;
# kumbang → wing_L/wing_R; papan-neon → screen.
# Jalankan: blender --background --python scripts/blender/kart_hazards.py -- <folder-png> <folder-glb> [nama ...]
# Sumbu: depan = -Y Blender (= +Z three.js), atas = +Z. Ukuran dalam meter.
# Model "-ayun" (bandul) berpusat di titik asal; tali dibuat di game.
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

R90 = math.radians(90)




# ---------------------------------------------------------------------------
# Sawah Terasering

def kerbau():
    """Kerbau abu: badan besar, tanduk melengkung, telinga, moncong pink, ekor, empat kaki bernama."""
    hide = pbr('#5a5a66', 0.75)
    dark = pbr('#3a3a46', 0.8)
    horn = pbr('#fff0d8', 0.5)
    parts = [sphere((0, 0.3, 2.0), 1.15, hide, (0.95, 1.9, 0.9), seg=28)]
    head = empty('head', (0, -1.9, 2.3))
    h = [
        sphere((0, -2.3, 2.3), 0.62, hide, (0.95, 1.1, 0.9)),
        sphere((0, -2.85, 2.05), 0.42, pbr('#ffb0b8', 0.6), (1.1, 0.8, 0.75)),
        *[sphere((s * 0.18, -3.2, 2.05), 0.07, dark, seg=8, sub=False) for s in (-1, 1)],
        *eyes_on(0, -2.72, 2.55, 0.11),
    ]
    for s in (-1, 1):
        h.append(tube([(s * 0.35, -2.2, 2.75), (s * 1.0, -2.0, 3.05), (s * 1.25, -1.6, 3.4)], 0.11, horn))
        h.append(sphere((s * 0.62, -2.05, 2.55), 0.22, hide, (1.6, 0.5, 0.8)))
    parent(h, head)
    for name, x, y in (('leg_F_L', -0.55, -0.9), ('leg_F_R', 0.55, -0.9), ('leg_B_L', -0.55, 1.4), ('leg_B_R', 0.55, 1.4)):
        leg = empty(name, (x, y, 1.5))
        parent([cyl((x, y, 0.8), 0.24, 1.5, hide, verts=14), cyl((x, y, 0.1), 0.27, 0.2, dark, verts=14)], leg)
    tail = empty('tail', (0, 2.4, 2.4))
    parent([tube([(0, 2.4, 2.4), (0, 2.8, 1.9), (0.1, 2.9, 1.2)], 0.06, hide), sphere((0.1, 2.92, 1.1), 0.14, dark, (1, 1, 1.6), seg=10)], tail)
    # pelana anyaman pink khas desa
    parts.append(cube((0, 0.2, 2.95), (1.4, 1.2, 0.12), pbr('#ff37a6', 0.6), b=0.03))
    return parts


def jerami():
    """Gulungan jerami: silinder bergaris spiral, tali pengikat."""
    straw = pbr('#f0c95a', 0.95)
    straw2 = pbr('#d9ad3e', 0.95)
    parts = [cyl((0, 0, 1.8), 1.8, 2.4, straw, rot=(0, R90, 0), verts=32, b=0.15)]
    for k in range(5):
        parts.append(torus((0, 0, 1.8), 0.4 + k * 0.32, 0.05, straw2, rot=(0, R90, 0)))
    for x in (-0.7, 0.7):
        parts.append(torus((x, 0, 1.8), 1.81, 0.05, pbr('#8a5a2a', 0.8), rot=(0, R90, 0)))
    for k in range(10):
        a = k / 10 * math.tau
        parts.append(cyl((1.2, math.cos(a) * 1.5, 1.8 + math.sin(a) * 1.5), 0.04, 0.5, straw2, rot=(0, R90 + 0.3, a), verts=5, b=0))
    return parts


def gerobak_padi():
    wood = pbr('#b98a5a', 0.85)
    dark = pbr('#6a4a2a', 0.9)
    rice = pbr('#d8e86a', 0.9)
    parts = [cube((0, 0, 1.4), (2.6, 4.0, 0.25), wood, b=0.05)]
    for s in (-1, 1):
        parts.append(cube((s * 1.25, 0, 1.9), (0.12, 4.0, 0.8), wood, b=0.03))
        parts.append(torus((s * 1.45, 0.6, 0.9), 0.75, 0.1, dark, rot=(0, R90, 0)))
        for k in range(8):
            a = k / 8 * math.tau
            parts.append(cyl((s * 1.45, 0.6 + math.cos(a) * 0.37, 0.9 + math.sin(a) * 0.37), 0.04, 0.74, dark, rot=(a, 0, 0), verts=6, b=0))
        parts.append(tube([(s * 0.5, -2.0, 1.4), (s * 0.45, -3.2, 1.3), (s * 0.4, -4.2, 1.1)], 0.07, dark))
    for k in range(9):
        parts.append(sphere(((k % 3 - 1) * 0.7, (k // 3 - 1) * 1.1, 2.4 + (k % 2) * 0.2), 0.75, rice, (1, 1.2, 0.7), seg=12))
    parts.append(cyl((0.7, -1.2, 3.2), 0.05, 1.2, dark, verts=6))
    parts.append(cube((1.1, -1.2, 3.6), (0.7, 0.03, 0.45), pbr('#ff3b5c', 0.6), b=0.01))
    return parts


def orang_orangan(swing=False):
    """Orang-orangan sawah: tiang, baju kotak-kotak, topi caping, wajah karung tersenyum, jerami mencuat."""
    pole = pbr('#7a5a3a', 0.85)
    shirt = pbr('#2f7bff', 0.75)
    shirt2 = pbr('#ff3b5c', 0.75)
    sack = pbr('#e8d4a8', 0.9)
    straw = pbr('#f0c95a', 0.9)
    z0 = -1.4 if swing else 2.6
    parts = []
    if not swing:
        parts.append(cyl((0, 0, 2.0), 0.12, 4.0, pole, verts=8))
    parts.append(cyl((0, 0, z0 + 0.6), 0.09, 3.2, pole, rot=(0, R90, 0), verts=8))
    parts.append(cube((0, 0, z0 + 0.2), (1.3, 0.6, 1.5), shirt, b=0.15))
    for k in range(3):
        parts.append(cube((0, -0.31, z0 - 0.3 + k * 0.45), (1.32, 0.02, 0.12), shirt2, b=0))
        parts.append(cube((-0.4 + k * 0.4, -0.31, z0 + 0.2), (0.1, 0.02, 1.5), shirt2, b=0))
    for s in (-1, 1):
        parts.append(cube((s * 1.15, 0, z0 + 0.6), (1.0, 0.45, 0.4), shirt, b=0.1))
        for k in range(4):
            parts.append(cyl((s * 1.75, 0, z0 + 0.55 + (k - 1.5) * 0.08), 0.03, 0.4, straw, rot=(0, R90 + s * (k - 1.5) * 0.25, 0), verts=4, b=0))
    parts.append(sphere((0, 0, z0 + 1.45), 0.5, sack, (1, 0.9, 1.05)))
    parts += eyes_on(0, -0.42, z0 + 1.55, 0.08)
    parts.append(tube([(-0.2, -0.46, z0 + 1.3), (0, -0.5, z0 + 1.2), (0.2, -0.46, z0 + 1.3)], 0.03, pbr('#5a3a2a', 0.6)))
    parts.append(cyl((0, 0, z0 + 1.95), 1.0, 0.45, pbr('#d9b884', 0.9), verts=24, r2=0.05, b=0))
    return parts


# ---------------------------------------------------------------------------
# Hutan Jamur

def jamur_pantul():
    """Jamur pantul: tudung lebar pink berbintik putih, batang pendek gemuk, tepi bawah bergaris."""
    cap = pbr('#ff37a6', 0.35, coat=0.6)
    dots = pbr('#fff4fa', 0.4)
    parts = [cyl((0, 0, 0.6), 0.9, 1.2, pbr('#fff0e0', 0.7), verts=20, r2=0.75)]
    parts.append(sphere((0, 0, 1.3), 3.6, cap, (1, 1, 0.32), seg=32))
    parts.append(cyl((0, 0, 1.2), 3.4, 0.12, pbr('#ffcae9', 0.6), verts=40, b=0))
    for k in range(12):
        a = k / 12 * math.tau
        r = 1.2 + (k % 3) * 0.7
        parts.append(sphere((math.cos(a) * r, math.sin(a) * r, 1.3 + 1.1 * (1 - (r / 3.6) ** 2) ** 0.5), 0.32, dots, (1, 1, 0.4), seg=12))
    parts += eyes_on(0, -0.92, 0.7, 0.14)
    return parts


def akar_ayun():
    """Bongkah akar & batang kayu berlumut tergantung."""
    bark = pbr('#5a3a2a', 0.9)
    moss = pbr('#5cb845', 0.85)
    parts = [cyl((0, 0, 0), 0.9, 3.0, bark, rot=(0, R90, 0), verts=14, b=0.1)]
    for x in (-1.5, 1.5):
        parts.append(sphere((x, 0, 0), 0.9, pbr('#c89a6a', 0.8), (0.12, 1, 1), seg=16))
    for k in range(6):
        a = k / 6 * math.tau
        parts.append(tube([(0, math.cos(a) * 0.8, math.sin(a) * 0.8), (0.5 * (k % 2 - 0.5), math.cos(a) * 1.5, math.sin(a) * 1.5 - 0.6)], 0.12, bark))
    parts.append(sphere((0, 0, 0.75), 0.9, moss, (1.4, 0.8, 0.35), seg=14))
    return parts


def kumbang():
    """Kumbang biru mengilap: cangkang terbelah, sayap tipis bernama, tanduk, enam kaki."""
    shell = pbr('#2f7bff', 0.15, metal=0.3, coat=1)
    dark = pbr('#121220', 0.4)
    parts = [sphere((0, 0.3, 1.2), 1.1, shell, (1, 1.35, 0.75), seg=28), sphere((0, -1.15, 1.15), 0.62, dark, seg=20)]
    parts.append(cube((0, 0.3, 1.95), (0.04, 2.6, 0.06), dark, b=0))
    parts.append(tube([(0, -1.6, 1.3), (0, -2.2, 1.9), (0, -2.0, 2.4)], 0.12, dark))
    parts += eyes_on(0, -1.66, 1.35, 0.12)
    for s, name in ((-1, 'wing_L'), (1, 'wing_R')):
        w = empty(name, (s * 0.3, -0.2, 1.8))
        parent([sphere((s * 1.0, 0.6, 1.95), 0.9, pbr('#bfe9ff', 0.05, alpha=0.4, coat=1), (0.55, 1.3, 0.05), seg=16)], w)
        for k in range(3):
            parts.append(tube([(s * 0.6, -0.4 + k * 0.6, 0.9), (s * 1.3, -0.5 + k * 0.6, 0.8), (s * 1.6, -0.6 + k * 0.6, 0.0)], 0.07, dark))
    return parts


# ---------------------------------------------------------------------------
# Gurun Candi

STONE = '#c9a26a'


def pilar_runtuh():
    stone = pbr(STONE, 0.9)
    stone2 = pbr('#b58c56', 0.9)
    parts = [cube((0, 0, 0.3), (3.0, 3.0, 0.6), stone2, b=0.08)]
    for k in range(3):
        parts.append(cyl((0, 0, 0.6 + 0.55 + k * 1.1), 1.0, 1.0, stone if k % 2 else stone2, verts=16, b=0.06))
        for j in range(12):
            a = j / 12 * math.tau
            parts.append(cube((math.cos(a) * 0.98, math.sin(a) * 0.98, 0.6 + 0.55 + k * 1.1), (0.08, 0.08, 0.95), stone2, rot=(0, 0, a), b=0))
    parts.append(cyl((1.9, 0.6, 0.7), 0.95, 2.0, stone, rot=(0.15, R90, 0.3), verts=16, b=0.06))
    for k in range(4):
        parts.append(rock((-1.4 + k * 0.9, -1.4, 0.25), 0.35, stone2, seed=k))
    return parts


def arca():
    """Arca penjaga bersila di atas umpak berukir."""
    stone = pbr('#a89272', 0.9)
    moss = pbr('#7aa04a', 0.9)
    parts = [cube((0, 0, 0.5), (2.6, 2.6, 1.0), stone, b=0.08), cube((0, 0, 1.15), (2.2, 2.2, 0.3), stone, b=0.05)]
    for k in range(4):
        parts.append(cube((-0.9 + k * 0.6, -1.31, 0.5), (0.35, 0.04, 0.6), pbr('#8a7458', 0.9), b=0.01))
    parts.append(sphere((0, 0, 1.75), 1.0, stone, (1.3, 0.9, 0.45)))
    parts.append(sphere((0, 0.05, 2.6), 0.75, stone, (0.95, 0.75, 1.05)))
    parts.append(sphere((0, 0, 3.6), 0.55, stone))
    parts.append(cyl((0, 0, 4.25), 0.3, 0.6, stone, verts=12, r2=0.08))
    for s in (-1, 1):
        parts.append(tube([(s * 0.65, 0, 3.0), (s * 0.85, -0.3, 2.3), (s * 0.3, -0.6, 2.05)], 0.17, stone))
        parts.append(sphere((s * 0.18, -0.5, 3.65), 0.07, pbr('#5a4a3a', 0.8), (1.4, 0.5, 0.6), seg=8, sub=False))
    parts.append(sphere((0.6, -0.4, 1.3), 0.4, moss, (1.4, 0.6, 0.3), seg=10))
    return parts


def gulungan_semak():
    """Tumbleweed: bola ranting kering berongga."""
    twig = pbr('#b98a5a', 0.95)
    import random
    rnd = random.Random(7)
    parts = []
    for k in range(26):
        a, b = rnd.random() * math.tau, rnd.random() * math.pi
        p = [(math.sin(b) * math.cos(a) * 1.5, math.sin(b) * math.sin(a) * 1.5, 1.6 + math.cos(b) * 1.5)]
        a2, b2 = a + rnd.uniform(1, 2.5), b + rnd.uniform(-1, 1)
        p.append((math.sin(b2) * math.cos(a2) * 1.1, math.sin(b2) * math.sin(a2) * 1.1, 1.6 + math.cos(b2) * 1.1))
        a3 = a + rnd.uniform(2.5, 4)
        p.append((math.sin(b) * math.cos(a3) * 1.6, math.sin(b) * math.sin(a3) * 1.6, 1.6 + math.cos(b) * 1.6))
        parts.append(tube(p, 0.045, twig, res=1))
    return parts


def gada_batu():
    """Gada batu berduri tergantung (diayun di atas jalan)."""
    stone = pbr('#8a7a6a', 0.9)
    parts = [rock((0, 0, 0), 1.9, stone, seed=3)]
    for k in range(10):
        a = k / 10 * math.tau
        el = (k % 3 - 1) * 0.7
        d = (math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el))
        parts.append(cyl((d[0] * 1.8, d[1] * 1.8, d[2] * 1.8), 0.35, 0.9, pbr('#6a5a4a', 0.8), rot=(math.atan2(-d[1], d[2]), math.asin(max(-1, min(1, d[0]))), 0), verts=8, r2=0.02, b=0))
    parts.append(torus((0, 0, 1.85), 0.35, 0.1, pbr('#3a3a44', 0.4, metal=0.8)))
    return parts


def stupa():
    stone = pbr(STONE, 0.9)
    stone2 = pbr('#b58c56', 0.9)
    parts = []
    for k in range(3):
        parts.append(cube((0, 0, 0.35 + k * 0.7), (6.6 - k * 1.2, 6.6 - k * 1.2, 0.7), stone if k % 2 else stone2, b=0.08))
    parts.append(sphere((0, 0, 2.9), 2.2, stone, (1, 1, 0.85), seg=28))
    for k in range(16):
        a = k / 16 * math.tau
        parts.append(cyl((math.cos(a) * 2.2, math.sin(a) * 2.2, 2.4), 0.07, 0.6, stone2, verts=6, b=0))
    parts.append(cube((0, 0, 4.75), (0.9, 0.9, 0.5), stone2, b=0.05))
    parts.append(cyl((0, 0, 5.8), 0.3, 1.8, stone, verts=12, r2=0.05))
    return parts


def pilar():
    stone = pbr(STONE, 0.9)
    parts = [cube((0, 0, 0.3), (2.4, 2.4, 0.6), stone, b=0.06), cyl((0, 0, 3.8), 0.9, 6.4, stone, verts=16, b=0.05)]
    for j in range(16):
        a = j / 16 * math.tau
        parts.append(cube((math.cos(a) * 0.88, math.sin(a) * 0.88, 3.8), (0.08, 0.08, 6.2), pbr('#b58c56', 0.9), rot=(0, 0, a), b=0))
    parts.append(cube((0, 0, 7.2), (2.6, 2.6, 0.6), stone, b=0.06))
    parts.append(sphere((0.4, -0.7, 7.5), 0.35, pbr('#7aa04a', 0.9), (1.5, 0.8, 0.4), seg=10))
    return parts


# ---------------------------------------------------------------------------
# Kota Neon

def bus():
    """Bus kota hijau: jendela kaca, garis neon, lampu depan emisif, pintu, roda bervelg."""
    paint = pbr('#5cf64a', 0.3, coat=0.8)
    glass = pbr('#1a2a40', 0.05, metal=0.2, coat=1)
    dark = pbr('#1c1c22', 0.8)
    parts = [cube((0, 0, 2.0), (2.8, 9.0, 2.8), paint, b=0.3)]
    for s in (-1, 1):
        parts.append(cube((s * 1.41, 0.3, 2.6), (0.04, 7.6, 1.1), glass, b=0))
        parts.append(cube((s * 1.42, 0, 1.3), (0.04, 8.8, 0.18), pbr('#ff37a6', 0.3, emit=3), b=0))
        for y in (-3.0, 3.0):
            parts.append(torus((s * 1.3, y, 0.65), 0.45, 0.2, dark, rot=(0, R90, 0)))
            parts.append(cyl((s * 1.42, y, 0.65), 0.28, 0.1, pbr('#c9c9d4', 0.25, metal=0.9), rot=(0, R90, 0), verts=16, b=0))
    parts.append(cube((0, -4.51, 2.7), (2.5, 0.04, 1.3), glass, b=0))
    for s in (-1, 1):
        parts.append(sphere((s * 1.0, -4.52, 1.2), 0.22, pbr('#fff6c8', 0.1, emit=6), (1, 0.4, 1), seg=12, sub=False))
        parts.append(sphere((s * 1.1, 4.52, 1.3), 0.2, pbr('#ff3b5c', 0.1, emit=5), (1, 0.4, 1), seg=12, sub=False))
    parts.append(cube((0, -4.52, 3.55), (2.0, 0.05, 0.4), pbr('#ffcc1f', 0.2, emit=3), b=0))
    parts.append(cube((0, 0, 3.45), (2.2, 6.0, 0.15), pbr('#e8e8f0', 0.3, metal=0.5), b=0.04))
    return parts


def pembatas():
    """Pembatas jalan beton dengan garis reflektor merah-putih & lampu kedip."""
    parts = [cube((0, 0, 0.6), (5.0, 1.0, 1.2), pbr('#e8e8f0', 0.6), b=0.12)]
    for k in range(5):
        parts.append(cube((-2.0 + k * 1.0, -0.51, 0.75), (0.5, 0.03, 0.55), pbr('#ff3b5c', 0.4), rot=(0, 0.5, 0), b=0))
    for x in (-2.2, 2.2):
        parts.append(sphere((x, 0, 1.35), 0.15, pbr('#ff8a1c', 0.2, emit=5), seg=10, sub=False))
    return parts


def palang_parkir():
    """Ujung palang parkir bergaris yang diayun (bandul)."""
    parts = [cube((0, 0, 0), (0.6, 0.6, 3.0), pbr('#ffcc1f', 0.4), b=0.05)]
    for k in range(4):
        parts.append(cube((0, 0, -1.2 + k * 0.8), (0.62, 0.62, 0.3), pbr('#121212', 0.5), b=0.02))
    parts.append(sphere((0, 0, -1.6), 0.25, pbr('#ff3b5c', 0.2, emit=4), seg=10, sub=False))
    return parts


def papan_neon():
    """Papan reklame neon: tiang, bingkai, layar bernama `screen` (diwarnai/diganti di game), tabung neon."""
    steel = pbr('#3a3a50', 0.4, metal=0.7)
    parts = [cyl((x, 0, 3.5), 0.18, 7.0, steel, verts=10) for x in (-3, 3)]
    parts.append(cube((0, 0, 7.2), (8.4, 0.5, 4.0), steel, b=0.05))
    scr = cube((0, -0.27, 7.2), (7.8, 0.05, 3.4), pbr('#ff37a6', 0.3, emit=2.5), b=0)
    scr.name = 'screen'
    parts.append(scr)
    for z in (5.0, 9.4):
        parts.append(cyl((0, -0.3, z), 0.08, 8.4, pbr('#13bfae', 0.2, emit=6), rot=(0, R90, 0), verts=8, b=0))
    parts.append(text3d('KACAU', (0, -0.33, 7.2), 1.6, pbr('#fff4fa', 0.2, emit=4), extrude=0.05))
    return parts


# ---------------------------------------------------------------------------
# Pabrik Permen

def palu_permen():
    """Palu permen raksasa (bandul): kepala belang spiral, gagang lolipop."""
    pink = pbr('#ff37a6', 0.3, coat=0.8)
    white = pbr('#fff4fa', 0.4, coat=0.6)
    parts = [cyl((0, 0, 0), 1.6, 3.2, white, rot=(0, R90, 0), verts=28, b=0.25)]
    for k in range(6):
        parts.append(torus((-1.3 + k * 0.52, 0, 0), 1.6, 0.12, pink, rot=(0, R90, 0)))
    for x in (-1.62, 1.62):
        parts.append(cyl((x, 0, 0), 1.3, 0.1, pink, rot=(0, R90, 0), verts=28, b=0))
    parts.append(cyl((0, 0, 2.5), 0.3, 3.2, pbr('#ffcc1f', 0.3, coat=0.6), verts=14))
    return parts


def bola_permen():
    """Bola permen karet bergaris, menggelinding."""
    parts = [sphere((0, 0, 2.0), 2.0, pbr('#13bfae', 0.15, coat=1), seg=32)]
    for k in range(3):
        parts.append(torus((0, 0, 2.0), 2.0, 0.14, pbr('#fff4fa', 0.2, coat=1), rot=(0, k * math.pi / 3, 0), seg=40))
    parts.append(sphere((0.8, -1.5, 3.0), 0.3, pbr('#ffffff', 0.05, emit=1.5), (1, 0.4, 1.4), seg=10, sub=False))
    return parts


def lolipop():
    """Lolipop raksasa: cakram pink dengan spiral putih timbul di kedua muka, pita kuning."""
    parts = [cyl((0, 0, 3.0), 0.2, 6.0, pbr('#fff4fa', 0.5), verts=10)]
    parts.append(sphere((0, 0, 7.6), 2.1, pbr('#ff37a6', 0.25, coat=1), (1, 0.2, 1), seg=16, sub=False))
    # prop ini ditanam ratusan kali di Pabrik Permen, jadi spiralnya hemat segitiga
    for y in (-0.36, 0.36):
        pts = [(math.cos(k * 0.6) * (0.1 + k * 0.048), y, 7.6 + math.sin(k * 0.6) * (0.1 + k * 0.048)) for k in range(40)]
        parts.append(tube(pts, 0.11, pbr('#fff4fa', 0.3, coat=1), res=1, steps=1))
    parts.append(torus((0, 0, 5.6), 0.28, 0.08, pbr('#ffcc1f', 0.4), seg=12))
    parts.append(cube((0.35, 0, 5.4), (0.5, 0.05, 0.35), pbr('#ffcc1f', 0.4), rot=(0, 0.6, 0), b=0.01))
    return parts


# ---------------------------------------------------------------------------
# Puncak Salju

def bola_salju():
    snow = pbr('#f4fbff', 0.6)
    parts = [rock((0, 0, 2.6), 2.6, snow, seed=11, sub=2)]
    for k in range(5):
        a = k / 5 * math.tau
        parts.append(rock((math.cos(a) * 2.2, math.sin(a) * 2.2, 2.6 + (k % 2 - 0.5)), 0.5, snow, seed=k + 20))
    parts.append(cyl((0.4, -2.5, 3.0), 0.08, 1.2, pbr('#6a4a2a', 0.9), rot=(R90, 0.4, 0), verts=6))
    return parts


def es_ayun():
    """Bongkah es runcing tergantung, bening kebiruan."""
    ice = pbr('#9ad8ff', 0.05, alpha=0.75, coat=1)
    parts = [cyl((0, 0, -0.3), 1.3, 2.4, ice, verts=6, r2=0.0, rot=(math.pi, 0, 0), b=0)]
    parts.append(cyl((0, 0, 0.9), 1.3, 0.8, ice, verts=6, r2=0.9, b=0.05))
    for k in range(5):
        a = k / 5 * math.tau
        parts.append(cyl((math.cos(a) * 0.9, math.sin(a) * 0.9, -0.2), 0.35, 1.4, ice, verts=6, r2=0.0, rot=(math.pi, 0, a), b=0))
    parts.append(sphere((0, 0, 1.4), 1.2, pbr('#f4fbff', 0.6), (1, 1, 0.35), seg=16))
    return parts


# ---------------------------------------------------------------------------
# Kawah Berapi

LAVA = '#ff5a1a'


def batu_api():
    """Batu vulkanik hitam dengan retakan lava menyala."""
    basalt = pbr('#2a2228', 0.85)
    glow = pbr(LAVA, 0.3, emit=6)
    parts = [rock((0, 0, 1.3), 2.0, basalt, (1.1, 1, 0.75), seed=5)]
    import random
    rnd = random.Random(2)
    for k in range(7):
        a = rnd.random() * math.tau
        z = 0.8 + rnd.random() * 1.3
        p = [(math.cos(a) * 1.9, math.sin(a) * 1.9, z)]
        for j in range(3):
            a += rnd.uniform(-0.4, 0.4)
            z += rnd.uniform(-0.3, 0.3)
            p.append((math.cos(a) * (1.95 - j * 0.05), math.sin(a) * (1.95 - j * 0.05), z))
        parts.append(tube(p, 0.07, glow, res=1))
    parts.append(rock((0.9, -0.6, 2.4), 0.6, pbr('#ff8a1c', 0.3, emit=4), seed=9))
    return parts


def kristal():
    parts = []
    for k, (x, y, h, r, c) in enumerate(((0, 0, 4.2, 0.8, '#ff37a6'), (0.9, 0.3, 2.8, 0.55, '#8a55ff'), (-0.8, 0.4, 3.0, 0.55, '#ff37a6'), (0.2, -0.8, 2.2, 0.45, '#ffcc1f'))):
        mat = pbr(c, 0.05, emit=1.5, coat=1)
        tilt = (0.25 * (k % 2 * 2 - 1), 0.2 * ((k + 1) % 2 * 2 - 1), 0)
        parts.append(cyl((x, y, h * 0.4), r, h * 0.8, mat, rot=tilt, verts=6, b=0))
        parts.append(cyl((x + tilt[1] * h * 0.8, y - tilt[0] * h * 0.8, h * 0.8 + h * 0.15), r, h * 0.3, mat, rot=tilt, verts=6, r2=0.0, b=0))
    parts.append(rock((0, 0, 0.3), 1.6, pbr('#2a2228', 0.85), (1.2, 1.2, 0.4), seed=4))
    return parts


def rantai_api():
    """Bola besi berduri menyala di ujung rantai (bandul)."""
    iron = pbr('#3a3034', 0.4, metal=0.8)
    glow = pbr(LAVA, 0.3, emit=5)
    parts = [sphere((0, 0, 0), 1.5, iron, seg=24)]
    for k in range(14):
        a = k / 14 * math.tau
        el = ((k % 3) - 1) * 0.8
        d = (math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el))
        parts.append(cyl((d[0] * 1.6, d[1] * 1.6, d[2] * 1.6), 0.3, 0.8, glow, rot=(math.atan2(-d[1], d[2]), math.asin(max(-1, min(1, d[0]))), 0), verts=6, r2=0.0, b=0))
    for k in range(4):
        parts.append(torus((0, 0, 1.8 + k * 0.55), 0.25, 0.08, iron, rot=(0, (k % 2) * R90, 0)))
    return parts


def bola_api():
    """Bola lava menggelinding: inti menyala, kerak hitam retak."""
    parts = [sphere((0, 0, 2.2), 2.1, pbr(LAVA, 0.3, emit=5), seg=24)]
    import random
    rnd = random.Random(8)
    for k in range(34):
        # sebaran merata (spiral Fibonacci) supaya kerak menutup bola dengan celah retak menyala
        b = math.acos(1 - 2 * (k + 0.5) / 34)
        a = k * 2.39996 + rnd.random() * 0.3
        d = (math.sin(b) * math.cos(a), math.sin(b) * math.sin(a), math.cos(b))
        c = rock((d[0] * 1.9, d[1] * 1.9, 2.2 + d[2] * 1.9), 0.62, pbr('#2a2228', 0.85), (1, 1, 0.45), seed=k)
        c.rotation_mode = 'QUATERNION'
        from mathutils import Vector
        c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(d))
        parts.append(c)
    return parts


def batu_jatuh():
    """Batu api yang jatuh dari langit (berasap di game)."""
    parts = [rock((0, 0, 0), 2.4, pbr('#3a2a2a', 0.85), seed=13)]
    for k in range(6):
        a = k / 6 * math.tau
        parts.append(rock((math.cos(a) * 1.9, math.sin(a) * 1.9, (k % 3 - 1) * 0.9), 0.55, pbr('#ff8a1c', 0.3, emit=4), seed=k + 30))
    return parts


def tulang():
    bone = pbr('#fff0d8', 0.6)
    parts = [cyl((0, 0, 0.35), 0.3, 4.0, bone, rot=(0, R90, 0.2), verts=12)]
    for s in (-1, 1):
        for d in (-1, 1):
            parts.append(sphere((s * 2.0, d * 0.32 + s * 0.4, 0.35), 0.42, bone, seg=14))
    parts.append(sphere((2.8, 1.8, 0.9), 1.0, bone, (1, 1.1, 0.9), seg=20))
    for s in (-1, 1):
        parts.append(sphere((2.8 + s * 0.35, 0.95, 1.05), 0.22, pbr('#1a1018', 0.8), seg=10, sub=False))
    return parts


GLB = {
    'kerbau': kerbau, 'jerami': jerami, 'gerobak-padi': gerobak_padi,
    'orang-orangan': lambda: orang_orangan(False), 'orang-orangan-ayun': lambda: orang_orangan(True),
    'jamur-pantul': jamur_pantul, 'akar-ayun': akar_ayun, 'kumbang': kumbang,
    'pilar-runtuh': pilar_runtuh, 'arca': arca, 'gulungan-semak': gulungan_semak, 'gada-batu': gada_batu,
    'stupa': stupa, 'pilar': pilar,
    'bus': bus, 'pembatas': pembatas, 'palang-parkir': palang_parkir, 'papan-neon': papan_neon,
    'palu-permen': palu_permen, 'bola-permen': bola_permen, 'lolipop': lolipop,
    'bola-salju': bola_salju, 'es-ayun': es_ayun, 'batu-es': lambda: [rock((0, 0, 1.8), 2.2, pbr('#9ad8ff', 0.08, alpha=0.85, coat=1), (1, 1, 1.2), seed=17, sub=0)],
    'batu-api': batu_api, 'kristal': kristal, 'rantai-api': rantai_api, 'bola-api': bola_api, 'batu-jatuh': batu_jatuh, 'tulang': tulang,
}

GLB_DIR.mkdir(parents=True, exist_ok=True)
for name, build in GLB.items():
    if ONLY and name not in ONLY:
        continue
    SUB['n'] = 1
    reset()
    build()
    export(name)
