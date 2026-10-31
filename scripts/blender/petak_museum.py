# Map Museum Seni (Petak Cat): dalam ruangan, lobi marmer, tiga galeri, patung, dan lukisan buatan sendiri.
# Jalankan: blender --background --python scripts/blender/petak_museum.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import colorsys
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, set_sky  # noqa: E402
from petak_kit import Kit  # noqa: E402

import numpy as np  # noqa: E402

m = Map('museum', 5, lm=4096)
k = Kit(m)
H = 5.0

MARMER = m.tex('marmer', 'marble_01', 2.4, rough=0.25)
PARKET = m.tex('parket', 'herringbone_parquet', 1.8, rough=0.35)
UBIN = m.tex('ubin', 'large_floor_tiles_02', 2.4, rough=0.35)
DINDING = [
    m.tex('dinding_krem', 'concrete_wall_008', 3.0, '#fff1d6'),
    m.tex('dinding_hijau', 'concrete_wall_008', 3.0, '#a9e0c4'),
    m.tex('dinding_merah', 'concrete_wall_008', 3.0, '#f7a9b0'),
    m.tex('dinding_biru', 'concrete_wall_008', 3.0, '#a7ccf5'),
]
PLAFON = m.flat('plafon', '#ece6da', 0.8)
MARMER_PATUNG = m.tex('patung', 'marble_01', 1.0, '#f4efe6', rough=0.3)
EMAS = m.flat('emas', '#c9a23a', 0.35, 0.8)
KAYU = m.tex('kayu', 'old_wood_floor', 1.4)
BELUDRU = m.tex('beludru', 'leather_red_02', 1.0)
PANEL = m.flat('neon_panel', '#fff2dc', 0.4, emit=3.5)


def seni(i, size=256):
    """lukisan prosedural: tiap gaya punya pola sendiri supaya bisa ditiru dengan cap pola"""
    r = np.random.default_rng(100 + i)
    y, x = np.mgrid[0:size, 0:size] / size
    style = i % 6
    pal = [np.array(colorsys.hsv_to_rgb((r.random() + j * 0.16) % 1, 0.65 + 0.3 * r.random(), 0.9)) for j in range(5)]
    if style == 0:  # matahari terbenam
        a = (pal[0] * (1 - y[..., None]) + pal[1] * y[..., None])
        c = (x - 0.5) ** 2 + (y - 0.58) ** 2 < 0.05
        a[c] = pal[2]
        for s in range(5):
            b = np.abs(y - (0.72 + s * 0.055) - 0.012 * np.sin(x * 20 + s)) < 0.012
            a[b] = pal[3]
    elif style == 1:  # bentuk Memphis
        a = np.ones((size, size, 3)) * (pal[4] * 0.4 + 0.6)
        for s in range(16):
            cx, cy, cr = r.random(), r.random(), 0.04 + r.random() * 0.1
            a[((x - cx) ** 2 + (y - cy) ** 2) < cr * cr] = pal[s % 4]
        for s in range(10):
            cx, cy = r.random(), r.random()
            a[(np.abs(x - cx) < 0.09) & (np.abs(y - cy) < 0.02)] = (0.07, 0.07, 0.07)
    elif style == 2:  # batik
        u = np.sin(x * 40) * np.sin(y * 40)
        v = np.sin((x + y) * 26) * np.cos((x - y) * 26)
        a = pal[0] * 0.25 + 0.05 + (u > 0.25)[..., None] * pal[1] * 0.8 + (v > 0.6)[..., None] * pal[2]
    elif style == 3:  # gunung berlapis
        a = np.ones((size, size, 3)) * (pal[0] * 0.3 + 0.7)
        for s in range(5):
            line = 0.3 + s * 0.14 + 0.08 * np.sin(x * (6 + s * 3) + s * 2) + 0.03 * np.sin(x * 31 + s)
            a[y > line] = pal[(s + 1) % 5] * (0.9 - s * 0.14)
    elif style == 4:  # kotak Mondrian
        a = np.ones((size, size, 3)) * 0.93
        xs, ys = sorted(r.random(4)), sorted(r.random(4))
        for px in xs:
            a[np.abs(x - px) < 0.012] = 0.05
        for py in ys:
            a[np.abs(y - py) < 0.012] = 0.05
        a[(x < xs[0]) & (y < ys[1])] = pal[0]
        a[(x > xs[2]) & (y > ys[2])] = pal[1]
        a[(x > xs[1]) & (x < xs[2]) & (y < ys[0])] = pal[2]
    else:  # titik-titik
        a = np.ones((size, size, 3)) * (pal[3] * 0.25 + 0.1)
        for s in range(900):
            cx, cy = r.integers(0, size, 2)
            a[max(0, cy - 3):cy + 3, max(0, cx - 3):cx + 3] = pal[s % 5] * (0.6 + 0.4 * r.random())
    return np.clip(a + r.normal(0, 0.018, (size, size, 1)), 0, 1)


ART = [m.image(f'lukisan{i}', seni(i)) for i in range(12)]
art_i = [0]


def lukisan(x, y, axis, out, w=1.9, h=1.5, z=1.9):
    """bingkai + lukisan + label; `axis` x = dinding sepanjang sumbu x, out = arah menghadap"""
    i = art_i[0]
    art_i[0] += 1
    dx, dy = (0, out) if axis == 'x' else (out, 0)
    # bingkai berlapis: papan belakang, empat bilah emas, dan label kecil
    S = (lambda a, b: (a, 0.05, b)) if axis == 'x' else (lambda a, b: (0.05, a, b))
    U = (lambda t, q, zz: (x + t, y + dy * q, zz)) if axis == 'x' else (lambda t, q, zz: (x + dx * q, y + t, zz))
    m.box(U(0, 0.03, z), S(w + 0.1, h + 0.1), k.karet)
    for t, zz, a, b in ((0, z + h / 2 + 0.07, w + 0.28, 0.14), (0, z - h / 2 - 0.07, w + 0.28, 0.14), (-w / 2 - 0.07, z, 0.14, h + 0.28), (w / 2 + 0.07, z, 0.14, h + 0.28)):
        m.box(U(t, 0.06, zz), S(a, b), EMAS, bevel=0.03)
    m.box(U(w / 2 + 0.34, 0.02, 1.35), S(0.26, 0.16), k.putih, bevel=0)
    m.picture((x + dx * 0.085, y + dy * 0.085, z), w, h, ART[i % len(ART)], axis, out)
    lamp((x + dx * 0.9, y + dy * 0.9, H - 1.1), 90, (1.0, 0.86, 0.68), 0.3)
    # titik sembunyi bersebelahan dengan lukisan, menempel dinding
    t = w / 2 + 0.7
    px, py = (x + t, y) if axis == 'x' else (x, y + t)
    m.spot(px + dx * 0.42, py + dy * 0.42, dx, dy)


def tembok(x0, y0, x1, y1, mat):
    m.block(x0, y0, x1, y1, 0, H, mat, solid=True)


PATUNG = (('marble_bust_01', 0.95), ('horse_statue_01', 1.1), ('gothic_statue', 1.75), ('bronze_whale_statue', 0.75), ('concrete_cat_statue', 0.9), ('bronze_shark_statue', 0.7), ('bronze_ray_statue', 0.7))
patung_i = [0]


def patung(x, y, kind):
    pid, h = PATUNG[patung_i[0] % len(PATUNG)]
    patung_i[0] += 1
    # alas bertingkat
    m.box((x, y, 0.06), (1.3, 1.3, 0.12), KAYU)
    m.box((x, y, 0.55), (1.1, 1.1, 0.88), MARMER_PATUNG, solid=True, top=2.8)
    m.box((x, y, 1.03), (1.24, 1.24, 0.08), MARMER_PATUNG)
    k.scan(pid, x, y, h, rot=kind * 1.1, z=1.07, tris=3000, tex=512)
    m.box((x + 0.57, y, 0.72), (0.03, 0.34, 0.22), EMAS)
    m.spot(x + 0.82, y, 1, 0, 'patung')


def vitrin(x, y, pid, h):
    """pajangan benda berharga di alas kayu, dengan rangka kuningan"""
    m.box((x, y, 0.45), (0.9, 0.9, 0.9), KAYU, solid=True, top=2.1)
    k.scan(pid, x, y, h, z=0.9, tris=1600, tex=512)
    for dx, dy in ((-0.42, -0.42), (0.42, -0.42), (-0.42, 0.42), (0.42, 0.42)):
        m.cyl((x + dx, y + dy, 1.5), 0.012, 1.2, EMAS, 6)
    m.box((x, y, 2.12), (0.94, 0.94, 0.05), KAYU)
    m.spot(x + 0.95, y, 1, 0, 'ringkuk')


def lis(axis, f, a0, a1, out):
    """plint, panel kursi, dan lis plafon di sepanjang dinding"""
    t, L = (a0 + a1) / 2, a1 - a0
    P = (lambda q, z: (t, f + out * q, z)) if axis == 'x' else (lambda q, z: (f + out * q, t, z))
    S = (lambda d, z: (L, d, z)) if axis == 'x' else (lambda d, z: (d, L, z))
    m.box(P(0.03, 0.12), S(0.07, 0.24), KAYU)
    m.box(P(0.02, 0.98), S(0.05, 0.05), KAYU)
    m.box(P(0.05, H - 0.14), S(0.11, 0.2), k.putih)
    m.box(P(0.03, H - 0.32), S(0.06, 0.05), EMAS)


def rantai(x0, y0, x1, y1):
    """tiang pembatas beludru, hiasan: tidak menghalangi jalan"""
    for x, y in ((x0, y0), (x1, y1)):
        m.cyl((x, y, 0.48), 0.04, 0.96, EMAS, 8)
        m.cyl((x, y, 0.02), 0.16, 0.04, EMAS, 10)
    m.rope((x0, y0, 0.88), (x1, y1, 0.88), 0.022, BELUDRU, 0.14, 8)


def panel_bebas(x, y, axis, mat, panjang=6.0):
    """panel lukisan berdiri bebas di tengah galeri, dua sisi"""
    if axis == 'x':
        m.block(x - panjang / 2, y - 0.15, x + panjang / 2, y + 0.15, 0, 3.4, mat, solid=True)
        lukisan(x - 1.3, y + 0.15, 'x', 1)
        lukisan(x + 1.3, y - 0.15, 'x', -1)
    else:
        m.block(x - 0.15, y - panjang / 2, x + 0.15, y + panjang / 2, 0, 3.4, mat, solid=True)
        lukisan(x + 0.15, y - 1.3, 'y', 1)
        lukisan(x - 0.15, y + 1.3, 'y', -1)


# ---------- lantai, plafon, dinding luar ----------
XA, XB, YA, YB = -23, 23, -16, 16
m.block(XA, YA, XB, YB, -0.3, 0, UBIN)
m.block(-6.5, -16, 6.5, 5, 0, 0.02, MARMER)
m.block(-23, -16, -6.5, 5, 0, 0.02, PARKET)
m.block(6.5, -16, 23, 5, 0, 0.02, PARKET)
m.block(XA, YA, XB, YB, H, H + 0.3, PLAFON)
tembok(XA - 0.4, YA - 0.4, XB + 0.4, YA, DINDING[0])
tembok(XA - 0.4, YB, XB + 0.4, YB + 0.4, DINDING[0])
tembok(XA - 0.4, YA, XA, YB, DINDING[2])
tembok(XB, YA, XB + 0.4, YB, DINDING[3])

# dinding pemisah dengan pintu lebar
for y0, y1 in ((-16, -2), (2, 5.2)):
    tembok(-6.7, y0, -6.3, y1, DINDING[2])
    tembok(6.3, y0, 6.7, y1, DINDING[3])
for x0, x1 in ((-23, -15.4), (-12.6, -1.4), (1.4, 12.6), (15.4, 23)):
    tembok(x0, 5, x1, 5.4, DINDING[1])

for a, f, a0, a1, o in (('x', YA, XA, -6.7, 1), ('x', YA, -6.3, 6.3, 1), ('x', YA, 6.7, XB, 1), ('x', YB, XA, XB, -1), ('y', XA, YA, YB, 1), ('y', XB, YA, YB, -1)):
    lis(a, f, a0, a1, o)
for y0, y1 in ((-16, -2), (2, 5)):
    for f, o in ((-6.7, -1), (-6.3, 1), (6.3, -1), (6.7, 1)):
        lis('y', f, y0, y1, o)
for x0, x1 in ((-23, -15.4), (-12.6, -6.7), (-6.3, -1.4), (1.4, 6.3), (6.7, 12.6), (15.4, 23)):
    lis('x', 5, x0, x1, -1)
    lis('x', 5.4, x0, x1, 1)

# balok plafon
for x in range(-20, 21, 8):
    m.box((x, 0, H - 0.16), (0.34, 32, 0.32), k.putih)
for y in range(-14, 15, 7):
    m.box((0, y, H - 0.16), (46, 0.34, 0.32), k.putih)

# panel cahaya langit-langit
for x in (-15, 0, 15):
    for y in (-11, -4, 10.5):
        m.block(x - 3, y - 0.7, x + 3, y + 0.7, H - 0.04, H, PANEL)
        m.block(x - 3.1, y - 0.8, x + 3.1, y - 0.7, H - 0.1, H, EMAS)
        m.block(x - 3.1, y + 0.7, x + 3.1, y + 0.8, H - 0.1, H, EMAS)
        lamp((x, y, 3.6), 1300, (1.0, 0.93, 0.82), 1.2)

# ---------- lobi ----------
m.block(-4, -15.8, 4, -15, 0, 1.1, KAYU, solid=True)
m.text('MUSEUM SENI', (0, -15.95, 3.6), 0.7, EMAS, rot=(math.pi / 2, 0, math.pi))
patung(0, -4.5, 1)
rantai(-1.6, -6, 1.6, -6)
rantai(-1.6, -3, 1.6, -3)
for x in (-4.6, 4.6):
    m.cyl((x, -9, H / 2), 0.32, H, MARMER, 16, solid=True)
    m.cyl((x, 0.5, H / 2), 0.32, H, MARMER, 16, solid=True)
    m.spot(x + 0.5 if x < 0 else x - 0.5, -9, 1 if x < 0 else -1, 0, 'nempel')
k.bangku(-3.6, 3.4, 2.4, KAYU)
k.bangku(3.6, 3.4, 2.4, KAYU)
# karpet merah, lampu gantung, dan ruang tunggu
m.block(-1.5, -14.8, 1.5, -6.4, 0.02, 0.035, BELUDRU)
for x in (-1.46, 1.46):
    m.block(x - 0.05, -14.8, x + 0.05, -6.4, 0.035, 0.04, EMAS)
k.scan('Chandelier_01', 0, -9.6, 1.4, rot=0, z=H - 1.42, tris=2400, tex=512)
k.scan('Chandelier_03', 0, 10.5, 1.4, rot=0, z=H - 1.42, tris=2400, tex=512)
k.scan('Sofa_01', -5.3, -13, 0.85, rot=-1.57, tris=1800, tex=512, solid=True)
k.scan('ArmChair_01', 5.3, -13, 0.9, rot=1.57, tris=1400, tex=512, solid=True)
k.scan('Ottoman_01', 4.6, -11.4, 0.45, tris=700, solid=True)
k.scan('vintage_grandfather_clock_01', -5.85, 4.5, 2.3, rot=1.57, tris=1400, tex=512, solid=True)
k.scan('ornate_mirror_01', 6.25, -6, 1.6, rot=-1.57, z=1.1, tris=900, tex=512)
k.scan('WetFloorSign_01', 2.2, -13.5, 0.62, rot=0.5, tris=300)

# ---------- galeri barat ----------
for x in (-20, -15.5, -11):
    lukisan(x, -15.9, 'x', 1)
for y in (-13, -9, -5, 3):
    lukisan(-22.9, y, 'y', 1)
for y in (-12, -6):
    lukisan(-6.8, y, 'y', -1)
panel_bebas(-15, -8, 'x', DINDING[1])
panel_bebas(-15, -1, 'x', DINDING[3])
patung(-20.5, -2.5, 0)
patung(-10, 2.5, 2)
k.bangku(-11, -11.5, 2.4, KAYU, math.pi / 2)

# ---------- galeri timur ----------
for x in (11, 15.5, 20):
    lukisan(x, -15.9, 'x', 1)
for y in (-12, -6, 3):
    lukisan(22.9, y, 'y', -1)
for y in (-12, -6):
    lukisan(6.8, y, 'y', 1)
panel_bebas(14.5, -7.5, 'y', DINDING[2], 7)
patung(10, 2.5, 1)
patung(19.5, 2.8, 2)
k.bangku(19, -7, 2.4, KAYU, math.pi / 2)

# ---------- aula utara ----------
for x in (-21, -16, -9, -4, 4, 9, 16, 21):
    if abs(x) != 4:
        lukisan(x, 15.9, 'x', -1)
for x in (-19, -8, 8, 19):
    lukisan(x, 5.45, 'x', 1)
for y in (8, 13):
    lukisan(-22.9, y, 'y', 1)
    lukisan(22.9, y, 'y', -1)
patung(-12, 10.5, 2)
patung(12, 10.5, 0)

# kerangka raksasa di tengah aula: bunglon purba dari tulang marmer
for i in range(11):
    t = i / 10
    x = -5.2 + t * 10.4
    z = 1.5 + math.sin(t * math.pi) * 1.1
    m.cyl((x, 10.5, z), 0.13, 0.4, MARMER_PATUNG, 8, rot=(0, math.pi / 2, 0))
    # tulang rusuk: dua lengkung dari tulang punggung, makin pendek ke arah ekor
    panjang = 0.95 * (1 - abs(t - 0.45)) + 0.1
    for s in (-1, 1):
        titik = [(x, 10.5 + s * math.sin(a) * panjang * 0.9, z - (1 - math.cos(a)) * panjang) for a in (0.15, 0.7, 1.25, 1.8, 2.3)]
        for p, q in zip(titik, titik[1:]):
            m.rope(p, q, 0.05, MARMER_PATUNG, 0, 1, 6)
# tengkorak bunglon purba: jengger, rahang, dan rongga mata
m.ball((6.1, 10.5, 1.75), 0.55, MARMER_PATUNG, (1.2, 0.8, 0.85))
m.ball((6.85, 10.5, 1.55), 0.3, MARMER_PATUNG, (1.2, 0.72, 0.5))
m.ball((5.7, 10.5, 2.3), 0.3, MARMER_PATUNG, (1, 0.28, 0.9))
for s in (-1, 1):
    m.ball((6.3, 10.5 + s * 0.42, 1.85), 0.13, k.karet)
# kaki dan ekor melingkar
for x, s in ((-3.2, 1), (-3.2, -1), (3, 1), (3, -1)):
    m.rope((x, 10.5 + s * 0.3, 1.6), (x + 0.2, 10.5 + s * 0.75, 0.95), 0.08, MARMER_PATUNG, 0, 1, 6)
    m.rope((x + 0.2, 10.5 + s * 0.75, 0.95), (x + 0.5, 10.5 + s * 0.8, 0.42), 0.07, MARMER_PATUNG, 0, 1, 6)
ekor = [(-5.2, 10.5, 1.5), (-6.0, 10.5, 1.1), (-6.2, 10.5, 0.75), (-5.8, 10.5, 0.6), (-5.6, 10.5, 0.8)]
for p, q in zip(ekor, ekor[1:]):
    m.rope(p, q, 0.08, MARMER_PATUNG, 0, 1, 6)
m.block(-6, 9.5, 6, 11.5, 0, 0.35, KAYU, solid=True)
for x in (-4, 0, 4):
    m.cyl((x, 10.5, 1.0), 0.05, 1.3, EMAS, 8)
rantai(-6.5, 8.8, 6.5, 8.8)
rantai(-6.5, 12.2, 6.5, 12.2)
m.spot(0, 12, 0, -1, 'ringkuk')
k.bangku(0, 14.7, 3, KAYU)

# ---------- pajangan, kepala trofi, dan keamanan ----------
for x, y, pid, h in ((-20.5, -9.5, 'carved_wooden_elephant', 0.5), (-10, -5, 'ceramic_vase_01', 0.62), (19.5, -12, 'antique_ceramic_vase_01', 0.62), (19.5, -3.2, 'treasure_chest', 0.42), (-18, 10.5, 'brass_vase_01', 0.56), (-7.8, 14, 'katana_stand_01', 0.42), (8, 14, 'ceramic_vase_02', 0.62), (10, -13, 'mantel_clock_01', 0.36)):
    vitrin(x, y, pid, h)
for x, pid, r in ((-22.85, 'lion_head', 1.57), (22.85, 'bull_head', -1.57)):
    k.scan(pid, x, 10.5, 0.8, rot=r, z=2.4, tris=1500, tex=512)
k.scan('horse_head', 0, 15.85, 0.8, rot=3.14, z=2.8, tris=1500, tex=512)
k.scan('kite_shield', -22.8, -7, 0.9, rot=1.57, z=1.5, tris=500)
for x, y, r in ((-22.7, -15.7, 0.8), (22.7, -15.7, -0.8), (-22.7, 15.7, 2.3), (0, 5.5, 0)):
    k.scan('security_camera_01', x, y, 0.28, rot=r, z=H - 0.6, tris=400)
for x, y, r in ((-6.2, -1.7, -1.57), (6.2, -1.7, 1.57), (-1.2, 4.9, 3.14)):
    k.scan('korean_fire_extinguisher_01', x, y, 0.6, rot=r, tris=500)
    k.scan('fire_alarm', x, y, 0.16, rot=r, z=1.45, tris=200)
for x, y in ((-22, -15), (22, -15), (-22, 15), (-1.4, 15)):
    k.scan('potted_plant_01', x, y, 1.3, tris=1200, tex=512, solid=True)

# ---------- ruang satpam (kurungan pencari) ----------
m.block(18.8, 10.6, 23, 11, 0, H, DINDING[3], solid=True)
m.block(18.4, 13.2, 18.8, 16, 0, H, DINDING[3], solid=True)
m.block(18.4, 11, 18.8, 11.4, 0, H, DINDING[3], solid=True)
m.spawn['seeker'] = [[20.8, -14.5], [20.8, -12.8]]
m.spawn['hider'] = [[-2.5, 11], [2.5, 11], [-2.5, 8], [2.5, 8], [-2.5, 13], [2.5, 13], [0, 1.2], [0, -2.5]]
m.life['warga'] = [[[0, -12], [-2, 0], [-9, 0], [-9, -13.5], [-20, -13.5], [-9, -13.5], [-9, 0], [9, 0], [9, -13.5], [20, -13.5], [9, -13.5], [9, 0], [2, 0]], [[0, 3], [0, 8], [-14, 7.5], [-14, 14], [14, 14], [14, 7.5], [0, 8]]]
m.life['kucing'] = []
m.life['merpati'] = []
m.life['atap'] = [[-26, -26, 26, 26]]

m.sun = set_sky('kloofendal_43d_clear_puresky_2k.hdr', 0.1, 0.0, min_elevation=40)
m.finish()
