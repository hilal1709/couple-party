# Kit Tali Jodoh: benda interaktif dan hiasan tiap tema, semuanya satu GLB (src/assets/tali/models/kit.glb).
# Tiap benda = satu objek bernama dengan titik asal di jangkarnya (lihat komentar per benda).
# Awalan nama material dibaca shader three.js: sway_ bergoyang angin, glow_ berpendar, kaca_ tembus pandang.
# Jalankan: python -I scripts/blender/tali_kit.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tali_lib import *  # noqa: E402,F403

M = {}


def mats():
    M.update(
        bambu=pbr('bambu', '#c9b26a', rough=0.5, coat=0.3),
        bambu_tua=pbr('bambu_tua', '#8f7a3e', rough=0.6),
        tali=pbr('tali_serat', '#d9a65b', rough=0.85, sheen=0.5),
        kayu=pbr('kayu', '#8a5a34', rough=0.7),
        kayu_tua=pbr('kayu_tua', '#5e3b22', rough=0.75),
        cat_merah=pbr('cat_merah', '#d8333a', rough=0.45, coat=0.3),
        cat_kuning=pbr('cat_kuning', '#ffc93c', rough=0.45, coat=0.3),
        cat_biru=pbr('cat_biru', '#2f7fd8', rough=0.45, coat=0.3),
        cat_hijau=pbr('cat_hijau', '#43b929', rough=0.45, coat=0.3),
        cat_pink=pbr('cat_pink', '#ff37a6', rough=0.4, coat=0.4),
        putih=pbr('putih', '#fff4fa', rough=0.5),
        logam=pbr('logam', '#9aa3ad', rough=0.35, metal=1),
        logam_gelap=pbr('logam_gelap', '#4a5058', rough=0.45, metal=0.8),
        karat=pbr('karat', '#8c4a2b', rough=0.8, metal=0.3),
        batu=pbr('batu', '#8d877d', rough=0.85),
        batu_candi=pbr('batu_candi', '#6f6a62', rough=0.9),
        lumut=pbr('lumut', '#4f7a2d', rough=0.9),
        daun=pbr('sway_daun', '#3f9a2f', rough=0.6, sheen=0.4),
        daun_muda=pbr('sway_daun_muda', '#87e752', rough=0.55, sheen=0.4),
        padi=pbr('sway_padi', '#b8c94a', rough=0.6, sheen=0.5),
        janur=pbr('sway_janur', '#e6d36a', rough=0.5, sheen=0.4),
        kain=pbr('sway_kain', '#ff5fb4', rough=0.7, sheen=0.6),
        kain2=pbr('sway_kain2', '#5cf64a', rough=0.7, sheen=0.6),
        kain3=pbr('sway_kain3', '#ffcae9', rough=0.7, sheen=0.6),
        tanah=pbr('tanah', '#6b4a2e', rough=0.95),
        jerami=pbr('jerami', '#c9a24a', rough=0.9, sheen=0.4),
        permen=pbr('permen_kapas', '#ff9bd0', rough=0.9, sheen=1),
        lampu=pbr('glow_lampu', '#ffd27a', rough=0.3, emit=6),
        lampion=pbr('glow_lampion', '#ff4a5a', rough=0.5, emit=2.5),
        kristal=pbr('glow_kristal', '#6ee7ff', rough=0.1, emit=3),
        jamur=pbr('glow_jamur', '#b7ff5c', rough=0.4, emit=2),
        lava=pbr('glow_lava', '#ff7a1a', rough=0.6, emit=4),
        hitam=pbr('hitam', '#1d1a22', rough=0.6),
        genteng=pbr('genteng', '#b5512d', rough=0.7),
        kaca=pbr('kaca_jendela', '#9fd3ff', rough=0.05, coat=1, emit=0.4),
        gunung=pbr('gunung', '#5f7f6a', rough=1),
        gunung_jauh=pbr('gunung_jauh', '#8fa8b8', rough=1),
        pasir=pbr('pasir', '#9c8f7e', rough=1),
        buah_oranye=pbr('buah_oranye', '#ff9a1f', rough=0.4, coat=0.4),
        buah_ungu=pbr('buah_ungu', '#6a2a6e', rough=0.3, coat=0.5),
        kerupuk=pbr('kerupuk', '#f3dfb0', rough=0.8, sheen=0.4),
    )


def finish(parts, name, pivot=(0, 0, 0)):
    o = join(parts, name)
    at_origin(o, pivot)
    return o


# ---------- benda interaktif ----------

def kait():
    """pasak bambu dengan lingkar tali; asal = titik pegangan"""
    p = [cyl((0, 0.2, 0.32), 0.05, 0.6, M['bambu'], rot=(math.pi / 2, 0, 0), verts=12)]
    p.append(torus((0, 0, 0.05), 0.12, 0.022, M['tali'], rot=(math.pi / 2, 0, 0)))
    p.append(tube([(0, -0.05, 0.32), (0, -0.02, 0.2), (0, 0, 0.17)], 0.02, M['tali']))
    return finish(p, 'kait')


def lampion():
    """lampion kertas merah tergantung; asal = cincin pegangan di bawahnya"""
    body = sphere((0, 0, 0.55), 0.28, M['lampion'], scale=(1, 1, 1.2), seg=24, sub=1)
    p = [body, cyl((0, 0, 0.88), 0.12, 0.08, M['cat_kuning']), cyl((0, 0, 0.22), 0.12, 0.08, M['cat_kuning'])]
    for i in range(8):
        a = i / 8 * math.tau
        p.append(tube([(math.cos(a) * 0.12, math.sin(a) * 0.12, 0.88), (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.55), (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.22)], 0.008, M['cat_kuning']))
    p.append(torus((0, 0, 0.05), 0.11, 0.02, M['cat_kuning'], rot=(math.pi / 2, 0, 0)))
    p.append(cyl((0, 0, 0.14), 0.012, 0.14, M['tali']))
    for i in range(5):
        p.append(cyl((math.cos(i) * 0.05, math.sin(i) * 0.05, 0.08), 0.01, 0.16, M['sway_kain' if False else 'cat_kuning']))
    return finish(p, 'lampion')


def jepit():
    """jepitan jemuran kayu di tali; asal = titik pegangan"""
    p = [cube((0, 0, 0.14), (0.06, 0.05, 0.26), M['kayu'], bev=0.015), cube((0.035, 0, 0.14), (0.02, 0.055, 0.2), M['logam'], bev=0.005)]
    p.append(torus((0, 0, 0.02), 0.1, 0.02, M['tali'], rot=(math.pi / 2, 0, 0)))
    return finish(p, 'jepit')


def lampu():
    """bohlam pasar malam berpayung; asal = pegangan"""
    p = [sphere((0, 0, 0.2), 0.13, M['lampu'], seg=16), cyl((0, 0, 0.38), 0.22, 0.12, M['cat_merah'], r2=0.05, verts=20)]
    p.append(torus((0, 0, 0.04), 0.1, 0.02, M['logam'], rot=(math.pi / 2, 0, 0)))
    return finish(p, 'lampu')


def tombol():
    """tombol injak: dasar batu dan tutup merah (objek terpisah, ditekan di three); asal = permukaan atas"""
    base = finish([cyl((0, 0, -0.06), 0.78, 0.14, M['batu'], verts=32, bev=0.03)], 'tombol_dasar')
    cap = finish([cyl((0, 0, 0.04), 0.6, 0.12, M['cat_merah'], verts=32, bev=0.035), cyl((0, 0, 0.11), 0.3, 0.03, M['cat_kuning'], verts=24, bev=0.01)], 'tombol_tutup')
    return [base, cap]


def tuas():
    """tuas: dasar kayu dan gagang (berputar di asal); asal = permukaan lantai"""
    base = finish([cube((0, 0, 0.12), (0.7, 0.45, 0.24), M['kayu_tua'], bev=0.05), cube((0, 0, 0.26), (0.5, 0.3, 0.06), M['logam_gelap'], bev=0.02)], 'tuas_dasar')
    arm = finish([cyl((0, 0, 0.45), 0.04, 0.9, M['logam'], verts=12), sphere((0, 0, 0.92), 0.1, M['cat_merah'], seg=16)], 'tuas_gagang', pivot=(0, 0, 0))
    arm.location = (0, 0, 0.28)
    return [base, arm]


def bendera():
    """checkpoint: tiang bambu, umbul-umbul janur; asal = kaki tiang"""
    p = [cyl((0, 0, 1.3), 0.05, 2.6, M['bambu'], verts=12)]
    for z in (0.5, 1.1, 1.7, 2.3):
        p.append(torus((0, 0, z), 0.055, 0.012, M['bambu_tua'], seg=14))
    flag = tube([(0.05, 0, 2.5), (0.5, 0, 2.38), (0.95, 0, 2.2), (1.3, 0, 1.95)], 0.12, M['janur'], taper=lambda f: 1 - f * 0.85)
    flag.scale = (1, 0.15, 1)
    p.append(flag)
    p.append(tube([(0, 0, 2.6), (0.15, 0, 2.75), (0.3, 0.02, 2.6), (0.42, 0.03, 2.35)], 0.025, M['janur'], taper=lambda f: 1 - f * 0.7))
    p.append(sphere((0, 0, 0.05), 0.16, M['batu'], scale=(1, 1, 0.45), seg=12))
    return finish(p, 'bendera')


def permen():
    """permen kapas di tusuk; asal = tengah gumpalan"""
    fluff = sphere((0, 0, 0), 0.26, M['permen'], scale=(1, 0.85, 0.95), seg=24, sub=2)
    bake_mods(fluff)
    noise_verts(fluff, 0.05, seed=4, scale=3)
    p = [fluff]
    rnd = random.Random(9)
    for _ in range(6):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.3, 1))).normalized()
        b = sphere(tuple(d * 0.2), 0.12, M['permen'], seg=12)
        p.append(b)
    p.append(cyl((0, 0, -0.38), 0.02, 0.36, M['kayu'], verts=8))
    return finish(p, 'permen')


def gapura():
    """gerbang finis: dua tiang berhias, lengkung, dan untaian janur; asal = tengah bawah, lebar 3,4 m"""
    p = []
    for sx in (-1, 1):
        x = sx * 1.7
        p.append(cube((x, 0, 1.6), (0.42, 0.42, 3.2), M['cat_putih'] if 'cat_putih' in M else M['putih'], bev=0.06))
        p.append(cube((x, 0, 0.15), (0.6, 0.6, 0.3), M['batu'], bev=0.05))
        p.append(cube((x, 0, 3.3), (0.6, 0.6, 0.2), M['cat_merah'], bev=0.05))
        p.append(cyl((x, 0, 3.55), 0.18, 0.4, M['cat_kuning'], r2=0.02, verts=16))
        for z in (0.9, 1.6, 2.3):
            p.append(cube((x, -0.22, z), (0.3, 0.03, 0.3), M['cat_merah'], rot=(0, math.pi / 4, 0), bev=0.01))
    arch = tube([(-1.7, 0, 3.3), (-0.9, 0, 3.95), (0, 0, 4.15), (0.9, 0, 3.95), (1.7, 0, 3.3)], 0.1, M['cat_merah'])
    p.append(arch)
    p.append(tube([(-1.6, -0.1, 3.1), (-0.8, -0.15, 2.7), (0, -0.15, 2.6), (0.8, -0.15, 2.7), (1.6, -0.1, 3.1)], 0.05, M['janur']))
    for i in range(9):
        x = -1.4 + i * 0.35
        z = 2.75 - math.sin(i / 8 * math.pi) * 0.12
        leaf = tube([(x, -0.15, z), (x + 0.04, -0.16, z - 0.25), (x, -0.16, z - 0.45)], 0.04, M['janur' if i % 2 else 'daun_muda'], taper=lambda f: 1 - f * 0.8)
        leaf.scale = (1, 0.3, 1)
        p.append(leaf)
    return finish(p, 'gapura')


def papan():
    """papan petunjuk kayu; asal = kaki"""
    p = [cyl((-0.5, 0, 0.6), 0.05, 1.2, M['kayu_tua'], verts=8), cyl((0.5, 0, 0.6), 0.05, 1.2, M['kayu_tua'], verts=8)]
    p.append(cube((0, -0.04, 1.05), (1.4, 0.08, 0.6), M['kayu'], bev=0.03))
    p.append(cube((0, -0.09, 1.05), (1.2, 0.02, 0.42), M['putih'], bev=0.01))
    return finish(p, 'papan')


def perahu():
    """perahu kayu sepanjang 4 m; asal = tengah permukaan dek"""
    hull = sphere((0, 0, -0.25), 1, M['cat_biru'], scale=(2.1, 0.75, 0.42), seg=32, sub=1)
    bake_mods(hull)
    bm = bmesh.new()
    bm.from_mesh(hull.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, -0.02), plane_no=(0, 0, 1), clear_outer=True)
    bm.to_mesh(hull.data)
    bm.free()
    p = [hull, cube((0, 0, -0.06), (3.9, 1.2, 0.08), M['kayu'], bev=0.02)]
    p.append(torus((0, 0, -0.03), 1, 0.05, M['cat_merah'], seg=48))
    p[-1].scale = (2.05, 0.72, 1)
    p.append(tube([(-2.05, 0, -0.05), (-2.3, 0, 0.25), (-2.25, 0, 0.5)], 0.06, M['kayu_tua']))
    p.append(tube([(2.05, 0, -0.05), (2.3, 0, 0.25), (2.25, 0, 0.5)], 0.06, M['kayu_tua']))
    return finish(p, 'perahu')


def gondola():
    """keranjang bianglala 3 m; asal = tengah lantai (jari penggantung naik ke pusat roda di three)"""
    p = [cube((0, 0, -0.2), (3, 1.3, 0.4), M['cat_merah'], bev=0.08)]
    p.append(cube((0, 0, 0.25), (3, 1.3, 0.1), M['cat_kuning'], bev=0.04))
    for sx in (-1, 1):
        p.append(cyl((sx * 1.4, 0, 0.9), 0.04, 1.4, M['logam']))
    p.append(cyl((0, 0, 1.75), 0.04, 2.9, M['logam'], rot=(0, math.pi / 2, 0)))
    p.append(cyl((0, 0, 1.9), 0.3, 0.3, M['cat_merah'], r2=0.05, verts=16))
    return finish(p, 'gondola')


def kereta():
    """kereta dorong pabrik 2,6 m; asal = tengah permukaan"""
    p = [cube((0, 0, -0.2), (2.6, 1.1, 0.4), M['logam_gelap'], bev=0.05), cube((0, 0, -0.02), (2.5, 1.0, 0.04), M['kayu'], bev=0.01)]
    for sx in (-0.9, 0.9):
        for sy in (-0.45, 0.45):
            p.append(cyl((sx, sy, -0.5), 0.2, 0.12, M['hitam'], rot=(math.pi / 2, 0, 0), verts=20))
    return finish(p, 'kereta')


def lift():
    """lantai lift peti kayu bertali; asal = tengah permukaan, lebar 2,4 m"""
    p = [cube((0, 0, -0.18), (2.4, 1.3, 0.36), M['kayu'], bev=0.04)]
    for sx in (-1.05, 1.05):
        p.append(cube((sx, 0, -0.18), (0.14, 1.36, 0.4), M['logam_gelap'], bev=0.02))
    return finish(p, 'lift')


def ventilasi():
    """lubang semburan uap; asal = tengah permukaan tanah"""
    p = [cyl((0, 0, 0.12), 1.2, 0.24, M['batu'], r2=0.8, verts=24, bev=0.04)]
    p.append(cyl((0, 0, 0.2), 0.75, 0.1, M['lava'], verts=24))
    return finish(p, 'ventilasi')


# ---------- hiasan tema ----------

def padi(name='padi'):
    """rumpun padi (bergoyang); asal = kaki"""
    rnd = random.Random(hash(name) % 1000)
    p = []
    for i in range(14):
        a = rnd.uniform(0, math.tau)
        r = rnd.uniform(0, 0.12)
        h = rnd.uniform(0.6, 0.95)
        lean = rnd.uniform(0.1, 0.3)
        x, y = math.cos(a) * r, math.sin(a) * r
        p.append(tube([(x, y, 0), (x + math.cos(a) * lean * 0.3, y + math.sin(a) * lean * 0.3, h * 0.6), (x + math.cos(a) * lean, y + math.sin(a) * lean, h)], 0.012, M['padi'], taper=lambda f: 1 - f * 0.7))
        if i % 2 == 0:
            p.append(sphere((x + math.cos(a) * lean * 1.1, y + math.sin(a) * lean * 1.1, h - 0.04), 0.03, M['jerami'], scale=(1, 1, 2.2), seg=8, sub=0))
    return finish(p, name)


def rumput():
    rnd = random.Random(5)
    p = []
    for i in range(10):
        a = rnd.uniform(0, math.tau)
        h = rnd.uniform(0.2, 0.42)
        x, y = math.cos(a) * 0.08, math.sin(a) * 0.08
        p.append(tube([(x, y, 0), (x * 2, y * 2, h * 0.6), (x * 3.4, y * 3.4, h)], 0.014, M['daun_muda' if i % 3 else 'daun'], taper=lambda f: 1 - f * 0.9))
    return finish(p, 'rumput')


def bunga():
    p = [tube([(0, 0, 0), (0.03, 0, 0.2), (0, 0, 0.38)], 0.012, M['daun'])]
    for i in range(5):
        a = i / 5 * math.tau
        p.append(sphere((math.cos(a) * 0.06, math.sin(a) * 0.06, 0.4), 0.05, M['kain' if True else 'putih'], scale=(1, 1, 0.4), seg=10))
    p.append(sphere((0, 0, 0.41), 0.035, M['cat_kuning'], seg=10))
    return finish(p, 'bunga')


def kelapa():
    """pohon kelapa melengkung; asal = kaki batang"""
    pts = [(0, 0, 0), (0.25, 0, 1.5), (0.7, 0, 3), (1.3, 0, 4.3)]
    p = [tube(pts, 0.17, M['kayu'], taper=lambda f: 1 - f * 0.4)]
    for i in range(7):
        z = 0.4 + i * 0.6
        x = 0.05 + (z / 4.3) ** 2 * 1.2
        p.append(torus((x, 0, z), 0.16 - i * 0.008, 0.025, M['kayu_tua'], seg=16))
    top = Vector((1.3, 0, 4.3))
    for i in range(8):
        a = i / 8 * math.tau
        d = Vector((math.cos(a), math.sin(a), 0))
        leaf = tube([tuple(top), tuple(top + d * 0.8 + Vector((0, 0, 0.45))), tuple(top + d * 1.7 + Vector((0, 0, 0.2))), tuple(top + d * 2.3 + Vector((0, 0, -0.5)))], 0.16, M['daun'], taper=lambda f: 0.25 + math.sin(f * math.pi) * 0.9)
        leaf.scale = (1, 1, 1)
        p.append(leaf)
    for i in range(3):
        a = i / 3 * math.tau
        p.append(sphere((1.3 + math.cos(a) * 0.15, math.sin(a) * 0.15, 4.12), 0.14, M['cat_hijau'], seg=12))
    return finish(p, 'sway_kelapa')


def pohon():
    """pohon rindang bulat; asal = kaki"""
    p = [tube([(0, 0, 0), (0.1, 0, 1.2), (0, 0, 2.2)], 0.22, M['kayu_tua'], taper=lambda f: 1 - f * 0.4)]
    rnd = random.Random(3)
    for _ in range(9):
        c = Vector((rnd.uniform(-0.9, 0.9), rnd.uniform(-0.5, 0.5), rnd.uniform(2.2, 3.4)))
        b = sphere(tuple(c), rnd.uniform(0.6, 0.95), M['daun'], seg=16)
        bake_mods(b)
        noise_verts(b, 0.08, seed=rnd.randint(0, 99), scale=2)
        p.append(b)
    return finish(p, 'sway_pohon')


def gubuk():
    """gubuk bambu beratap jerami; asal = tengah bawah"""
    p = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl((sx * 1.1, sy * 0.9, 1), 0.07, 2, M['bambu'], verts=10))
    p.append(cube((0, 0, 0.7), (2.4, 2, 0.1), M['bambu_tua'], bev=0.02))
    roof = cyl((0, 0, 2.5), 2.1, 1.2, M['jerami'], r2=0.1, verts=4, rot=(0, 0, math.pi / 4))
    roof.scale = (1.15, 1, 1)
    p.append(roof)
    return finish(p, 'gubuk')


def orang_sawah():
    p = [cyl((0, 0, 0.9), 0.04, 1.8, M['bambu_tua'], verts=8), cyl((0, 0, 1.35), 0.035, 1.3, M['bambu_tua'], rot=(0, math.pi / 2, 0), verts=8)]
    p.append(cube((0, 0, 1.2), (0.6, 0.3, 0.6), M['kain'], bev=0.05))
    p.append(sphere((0, 0, 1.75), 0.18, M['jerami'], seg=12))
    p.append(cyl((0, 0, 1.92), 0.4, 0.25, M['jerami'], r2=0.05, verts=20))
    return finish(p, 'orang_sawah')


def gunung(name='gunung', mat='gunung', h=14, w=22, seed=1):
    """gunung jauh berlekuk; asal = kaki tengah"""
    o = cyl((0, 0, h / 2), w / 2, h, M[mat], r2=w * 0.06, verts=48)
    bpy.context.view_layer.objects.active = o
    shade(o, 2)
    bake_mods(o)
    noise_verts(o, w * 0.03, seed=seed, scale=0.25)
    for v in o.data.vertices:
        if v.co.z < 0:
            v.co.z = 0
    return finish([o], name)


def batu_besar(name='batu_besar', seed=2, mat='batu'):
    o = sphere((0, 0, 0.4), 0.7, M[mat], scale=(1.3, 1, 0.8), seg=20, sub=2)
    bake_mods(o)
    noise_verts(o, 0.12, seed=seed, scale=2.3)
    p = [o]
    if mat == 'batu':
        moss = sphere((0.1, 0, 0.85), 0.5, M['lumut'], scale=(1.2, 0.9, 0.25), seg=16)
        bake_mods(moss)
        noise_verts(moss, 0.04, seed=seed + 1)
        p.append(moss)
    return finish(p, name)


def payung():
    p = [cyl((0, 0, 1.2), 0.04, 2.4, M['kayu_tua'], verts=8)]
    cone = cyl((0, 0, 2.45), 1.5, 0.5, M['kain'], r2=0.05, verts=12)
    p.append(cone)
    p.append(torus((0, 0, 2.2), 1.48, 0.03, M['cat_kuning'], seg=12))
    return finish(p, 'payung')


def keranjang():
    p = [cyl((0, 0, 0.2), 0.45, 0.4, M['jerami'], r2=0.35, verts=20, bev=0.02)]
    rnd = random.Random(8)
    for _ in range(9):
        m = M['buah_oranye'] if rnd.random() < 0.5 else M['buah_ungu']
        p.append(sphere((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), 0.45 + rnd.uniform(0, 0.12)), 0.11, m, seg=12))
    return finish(p, 'keranjang')


def menara_air():
    p = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(cyl((sx * 0.8, sy * 0.8, 1.5), 0.06, 3, M['logam_gelap'], verts=8))
    p.append(cyl((0, 0, 3.8), 1.2, 1.6, M['cat_biru'], verts=32, bev=0.04))
    p.append(cyl((0, 0, 4.85), 1.3, 0.5, M['logam'], r2=0.1, verts=32))
    return finish(p, 'menara_air')


def antena():
    p = [cyl((0, 0, 1.2), 0.03, 2.4, M['logam'], verts=6)]
    for i, w in enumerate((1.2, 0.9, 0.6)):
        p.append(cyl((0, 0, 1.6 + i * 0.35), 0.015, w, M['logam'], rot=(0, math.pi / 2, 0), verts=6))
    return finish(p, 'antena')


def gedung(name, w, h, color, seed):
    """fasad gedung jauh dengan jendela menyala; asal = kaki tengah"""
    wall = pbr(f'dinding_{name}', color, rough=0.85)
    p = [cube((0, 0, h / 2), (w, 3, h), wall, bev=0.06)]
    rnd = random.Random(seed)
    for row in range(int(h // 1.6)):
        for col in range(int(w // 1.4)):
            x = -w / 2 + 0.9 + col * 1.4
            z = 1.2 + row * 1.6
            if x > w / 2 - 0.5:
                continue
            lit = rnd.random() < 0.4
            p.append(cube((x, -1.52, z), (0.7, 0.06, 0.9), M['lampu'] if lit else M['kaca'], bev=0.01))
    p.append(cube((0, 0, h + 0.15), (w + 0.3, 3.3, 0.3), M['genteng'], bev=0.05))
    return finish(p, name)


def cerobong():
    p = [cube((0, 0, 0.8), (0.6, 0.6, 1.6), M['genteng'], bev=0.04), cube((0, 0, 1.65), (0.75, 0.75, 0.15), M['batu'], bev=0.03)]
    return finish(p, 'cerobong')


def baju(name='baju', mat='kain'):
    """baju di jemuran (bergoyang); asal = jepitan atas"""
    p = [cube((0, 0, -0.35), (0.6, 0.04, 0.7), M[mat], bev=0.02), cube((-0.4, 0, -0.15), (0.25, 0.04, 0.3), M[mat], bev=0.02), cube((0.4, 0, -0.15), (0.25, 0.04, 0.3), M[mat], bev=0.02)]
    return finish(p, name)


def rak_kerupuk():
    p = []
    for sx in (-1, 1):
        p.append(cyl((sx * 1.2, 0, 1), 0.05, 2, M['bambu'], verts=8))
    for z in (0.5, 1.1, 1.7):
        p.append(cube((0, 0, z), (2.4, 0.9, 0.05), M['bambu_tua'], bev=0.01))
        rnd = random.Random(int(z * 10))
        for _ in range(7):
            c = cyl((rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.3), z + 0.05), 0.18, 0.03, M['kerupuk'], verts=14)
            bake_mods(c)
            noise_verts(c, 0.02, seed=rnd.randint(0, 99), scale=5)
            p.append(c)
    return finish(p, 'rak_kerupuk')


def pipa():
    p = [tube([(-3, 0, 3), (-1, 0, 3), (0, 0, 2.6), (0.5, 0, 1.2), (0.5, 0, 0)], 0.18, M['logam'])]
    for z in (0.5, 1.6):
        p.append(torus((0.5, 0, z), 0.2, 0.04, M['karat'], seg=16))
    return finish(p, 'pipa')


def tong():
    o = cyl((0, 0, 0.5), 0.4, 1, M['cat_biru'], verts=24, bev=0.03)
    p = [o]
    for z in (0.2, 0.8):
        p.append(torus((0, 0, z), 0.41, 0.025, M['logam_gelap'], seg=24))
    return finish(p, 'tong')


def stalaktit():
    """batu tetes menggantung; asal = pangkal atas"""
    p = []
    rnd = random.Random(4)
    for i in range(3):
        x = (i - 1) * 0.35
        h = rnd.uniform(0.9, 1.8)
        o = cyl((x, 0, -h / 2), 0.2, h, M['batu'], r2=0.02, verts=10)
        o.rotation_euler = (math.pi, 0, 0)
        bake_mods(o)
        noise_verts(o, 0.03, seed=i)
        p.append(o)
    return finish(p, 'stalaktit')


def kristal():
    p = []
    rnd = random.Random(6)
    for i in range(5):
        a = rnd.uniform(-0.5, 0.5)
        h = rnd.uniform(0.4, 0.9)
        o = cyl((0, 0, h / 2), 0.1, h, M['kristal'], r2=0.0, verts=6)
        o.rotation_euler = (rnd.uniform(-0.4, 0.4), a, 0)
        o.location.x += (i - 2) * 0.12
        p.append(o)
    return finish(p, 'kristal')


def jamur():
    p = []
    for i, (x, s) in enumerate([(0, 1), (0.22, 0.7), (-0.18, 0.55)]):
        p.append(cyl((x, 0, 0.12 * s), 0.035 * s, 0.24 * s, M['putih'], verts=8))
        p.append(sphere((x, 0, 0.25 * s), 0.13 * s, M['jamur'], scale=(1, 1, 0.55), seg=14))
    return finish(p, 'jamur')


def kelelawar():
    p = [sphere((0, 0, 0), 0.12, M['hitam'], scale=(1, 0.9, 1.1), seg=12)]
    for sx in (-1, 1):
        w = tube([(sx * 0.08, 0, 0.03), (sx * 0.3, 0, 0.12), (sx * 0.5, 0, 0)], 0.07, M['hitam'], taper=lambda f: 0.4 + math.sin(f * math.pi))
        w.scale = (1, 0.15, 1)
        p.append(w)
    for sx in (-1, 1):
        p.append(sphere((sx * 0.04, -0.1, 0.04), 0.018, M['lampu'], seg=6))
    return finish(p, 'kelelawar')


def stupa():
    """stupa batu berlubang; asal = kaki"""
    p = [cyl((0, 0, 0.25), 1.2, 0.5, M['batu_candi'], verts=8, bev=0.04)]
    bell = sphere((0, 0, 1.2), 1.0, M['batu_candi'], scale=(1, 1, 0.95), seg=24, sub=1)
    p.append(bell)
    for i in range(8):
        a = i / 8 * math.tau
        p.append(cube((math.cos(a) * 0.92, math.sin(a) * 0.92, 1.25), (0.22, 0.22, 0.3), M['hitam'], rot=(0, 0, a + math.pi / 4), bev=0.02))
    p.append(cyl((0, 0, 2.25), 0.2, 0.5, M['batu_candi'], verts=8))
    p.append(cyl((0, 0, 2.7), 0.12, 0.5, M['batu_candi'], r2=0.03, verts=8))
    return finish(p, 'stupa')


def arca():
    p = [cube((0, 0, 0.3), (0.9, 0.7, 0.6), M['batu_candi'], bev=0.05)]
    p.append(sphere((0, 0, 0.95), 0.4, M['batu_candi'], scale=(1, 0.8, 0.9), seg=16))
    p.append(sphere((0, 0, 1.55), 0.25, M['batu_candi'], seg=16))
    p.append(cyl((0, 0, 1.85), 0.12, 0.2, M['batu_candi'], r2=0.04, verts=10))
    p.append(sphere((0, 0, 1.0), 0.45, M['lumut'], scale=(1.1, 0.85, 0.2), seg=12))
    return finish(p, 'arca')


def kamboja():
    p = [tube([(0, 0, 0), (0.3, 0, 1), (0.1, 0, 1.8), (0.6, 0, 2.4)], 0.13, M['kayu_tua'], taper=lambda f: 1 - f * 0.5)]
    p.append(tube([(0.15, 0, 1.4), (-0.4, 0, 1.9), (-0.7, 0, 2.3)], 0.08, M['kayu_tua']))
    rnd = random.Random(12)
    for c in ((0.6, 0, 2.6), (-0.7, 0, 2.45), (0.1, 0, 2.3)):
        b = sphere(c, 0.55, M['daun'], seg=14)
        bake_mods(b)
        noise_verts(b, 0.06, seed=rnd.randint(0, 99))
        p.append(b)
        for _ in range(5):
            f = Vector(c) + Vector((rnd.uniform(-0.5, 0.5), -0.45, rnd.uniform(-0.2, 0.4)))
            p.append(sphere(tuple(f), 0.07, M['putih'], scale=(1, 0.4, 1), seg=8))
    return finish(p, 'sway_kamboja')


def candi_jauh():
    """siluet candi di kejauhan; asal = kaki tengah"""
    p = []
    for i, (w, h) in enumerate([(9, 2), (7.5, 2), (6, 2), (4.5, 1.8), (3, 1.6)]):
        z = sum(hh for _, hh in [(9, 2), (7.5, 2), (6, 2), (4.5, 1.8), (3, 1.6)][:i])
        p.append(cube((0, 0, z + h / 2), (w, w * 0.6, h), M['batu_candi'], bev=0.12))
    p.append(cyl((0, 0, 10.2), 0.8, 2.4, M['batu_candi'], r2=0.1, verts=8))
    return finish(p, 'candi_jauh')


def pura():
    """gapura bentar terbelah; asal = tengah bawah"""
    p = []
    for sx in (-1, 1):
        for i, w in enumerate((1.6, 1.3, 1.0, 0.7)):
            p.append(cube((sx * 1.4, 0, 0.6 + i * 1.1), (w, 1.2, 1.1), M['batu_candi'], bev=0.05))
    return finish(p, 'pura')


def tenda():
    p = []
    for sx in (-1, 1):
        p.append(cyl((sx * 1.3, 0, 1.2), 0.05, 2.4, M['logam'], verts=8))
    roof = cube((0, 0, 2.5), (3, 1.8, 0.1), M['kain'], bev=0.03, rot=(0.2, 0, 0))
    p.append(roof)
    for i in range(6):
        p.append(cube((-1.25 + i * 0.5, -0.92, 2.25), (0.5, 0.02, 0.35), M['kain' if i % 2 else 'kain3'], bev=0.01))
    p.append(cube((0, 0, 0.5), (2.6, 1, 1), M['kayu'], bev=0.04))
    for i in range(5):
        p.append(sphere((-1 + i * 0.5, -0.1, 1.15), 0.14, M['buah_oranye' if i % 2 else 'permen'], seg=10))
    return finish(p, 'tenda')


def bianglala():
    """rangka roda bianglala (jari berputar di three); asal = pusat roda; jari-jari 4 m"""
    rim = [torus((0, 0.5, 0), 4, 0.07, M['logam'], rot=(math.pi / 2, 0, 0), seg=64), torus((0, -0.5, 0), 4, 0.07, M['logam'], rot=(math.pi / 2, 0, 0), seg=64)]
    for i in range(16):
        a = i / 16 * math.tau
        for y in (0.5, -0.5):
            rim.append(cyl((math.cos(a) * 2, y, math.sin(a) * 2), 0.035, 4, M['logam'], rot=(0, math.pi / 2 - a, 0), verts=6))
    for i in range(24):
        a = i / 24 * math.tau
        rim.append(sphere((math.cos(a) * 4, -0.6, math.sin(a) * 4), 0.08, M['lampu'], seg=8, sub=0))
    rim.append(cyl((0, 0, 0), 0.35, 1.3, M['cat_merah'], rot=(math.pi / 2, 0, 0), verts=20))
    wheel = finish(rim, 'bianglala_roda')
    legs = []
    for sx in (-1, 1):
        for y in (0.9, -0.9):
            legs.append(tube([(0, y, 0), (sx * 3, y, -5.4)], 0.12, M['cat_merah']))
    stand = finish(legs, 'bianglala_kaki')
    return [wheel, stand]


def untaian():
    """untaian lampu sepanjang 6 m; asal = ujung kiri"""
    p = [tube([(0, 0, 0), (1.5, 0, -0.5), (3, 0, -0.65), (4.5, 0, -0.5), (6, 0, 0)], 0.015, M['hitam'])]
    cols = [M['lampu'], M['lampion'], M['kristal'], M['jamur']]
    for i in range(12):
        x = 0.25 + i * 0.5
        z = -0.65 * math.sin(x / 6 * math.pi) - 0.12
        p.append(sphere((x, 0, z), 0.07, cols[i % 4], seg=8, sub=0))
    return finish(p, 'untaian')


def kembang_api():
    """percikan kembang api statis (berpendar); asal = pusat"""
    p = []
    rnd = random.Random(21)
    for i in range(18):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.3), rnd.uniform(-1, 1))).normalized()
        p.append(tube([(0, 0, 0), tuple(d * 0.8), tuple(d * 1.4 + Vector((0, 0, -0.2)))], 0.03, M['lampu' if i % 2 else 'lampion'], taper=lambda f: 1 - f * 0.8))
    return finish(p, 'kembang_api')


def build():
    clear_scene()
    mats()
    objs = []
    for fn in (kait, lampion, jepit, lampu, bendera, permen, gapura, papan, perahu, gondola, kereta, lift, ventilasi, rumput, bunga, kelapa, pohon, gubuk, orang_sawah,
               payung, keranjang, menara_air, antena, cerobong, rak_kerupuk, pipa, tong, stalaktit, kristal, jamur, kelelawar, stupa, arca, kamboja, candi_jauh, pura, tenda, untaian, kembang_api):
        r = fn()
        objs += r if isinstance(r, list) else [r]
    objs += tombol() + tuas() + bianglala()
    objs.append(padi())
    objs.append(gunung('gunung', 'gunung', 14, 26, 1))
    objs.append(gunung('gunung_jauh', 'gunung_jauh', 22, 40, 2))
    objs.append(gunung('bromo', 'pasir', 16, 36, 3))
    objs.append(batu_besar('batu_besar', 2, 'batu'))
    objs.append(batu_besar('batu_vulkanik', 5, 'hitam'))
    objs.append(baju('baju', 'kain'))
    objs.append(baju('baju2', 'kain2'))
    objs.append(baju('baju3', 'kain3'))
    for i, (w, h, c) in enumerate([(6, 9, '#e8d6b8'), (5, 13, '#c9e4d6'), (7, 7, '#f2c6c6'), (4.5, 11, '#d8d2f0')]):
        objs.append(gedung(f'gedung{i}', w, h, c, i))
    # sebar di grid supaya mudah dilihat di Blender; posisi diabaikan di three (dipakai per nama)
    for i, o in enumerate(objs):
        if o.parent is None:
            o.location = ((i % 10) * 9, (i // 10) * 9, 0)
    export(OUT / 'models' / 'kit.glb', objs)


if __name__ == '__main__':
    build()
