# Map Gang Kampung (Petak Cat): sore hari, gang berbentuk T, lapangan mangga, warung, jemuran, dan pos ronda.
# Jalankan: blender --background --python scripts/blender/petak_gang.py -- brand/illustrations/petak src/assets/petak/maps [sampel]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, lamp, set_sky  # noqa: E402
from petak_kit import decal_set  # noqa: E402

MK = Path('D:/dev/asset-src/quaternius-megakit/x/glTF')
m = Map('gang', lm=4096)
DEC = decal_set(m)

# ---------- material ----------
PLESTER = [
    m.tex('plester_krem', 'concrete_wall_008', 3.2, '#ffe6b0'),
    m.tex('plester_toska', 'blue_plaster_weathered', 2.4, '#bfe7dc'),
    m.tex('plester_pink', 'peeling_painted_wall', 2.4, '#f6b7c0'),
    m.tex('plester_hijau', 'damaged_plaster', 2.4, '#b8d98a'),
    m.tex('plester_kuning', 'concrete_wall_008', 3.2, '#ffd24f'),
    m.tex('plester_lumut', 'worn_mossy_plasterwall', 2.6),
]
BATA = m.tex('bata', 'brick_4', 1.6)
BATA_CAT = m.tex('bata_cat', 'painted_worn_brick', 1.8, '#e9e3d6')
GENTENG = m.tex('genteng', 'clay_roof_tiles', 2.0)
SENG = m.tex('seng', 'rusty_corrugated_iron', 1.6, rough=0.6)
SENG2 = m.tex('seng_abu', 'corrugated_iron_02', 1.6, rough=0.5)
PAPAN_BIRU = m.tex('papan_biru', 'blue_painted_planks', 1.6)
PAPAN = m.tex('papan', 'distressed_painted_planks', 1.6)
PAPAN_TUA = m.tex('papan_tua', 'weathered_planks', 1.6)
BETON = m.tex('beton', 'dirty_concrete', 3.0)
BETON2 = m.tex('beton_dinding', 'concrete_wall_008', 2.4)
PAVING = m.tex('paving', 'rectangular_paving', 2.4)
TANAH = m.tex('tanah', 'dirt_floor', 3.0)
TERASO = m.tex('teraso', 'terrazzo_tiles', 1.6, rough=0.3)
ROLLING = m.tex('rolling', 'painted_metal_shutter', 2.0, '#4e8f7a', rough=0.5)

KACA = m.flat('kaca', '#6f8f9e', 0.08, 0.5)
BESI = m.flat('besi', '#2b2d30', 0.45, 0.7)
BESI_HIJAU = m.flat('besi_hijau', '#2f7d52', 0.45, 0.2)
PUTIH = m.flat('putih', '#f1ece2', 0.5)
MERAH = m.flat('merah', '#d8322c', 0.5)
BIRU = m.flat('biru', '#2f6fd0', 0.35)
KUNING = m.flat('kuning', '#f2c21a', 0.35)
HIJAU_PLASTIK = m.flat('hijau_plastik', '#3aa655', 0.35)
TANAH_LIAT = m.flat('tanah_liat', '#b4623a', 0.8)
KARET = m.flat('karet', '#191a1c', 0.8)
GALON = m.flat('galon', '#7fc4e8', 0.12)
KABEL = m.flat('kabel', '#141414', 0.7)
KAIN_TIRAI = [m.flat(f'tirai{i}', c, 0.9) for i, c in enumerate(('#f2e6c8', '#e7a4b4', '#9fd0c8'))]
# kain bermotif ala batik dan sarung; warna dikalikan dengan tekstur
KAIN = [m.tex(f'sway_kain{i}', pid, 0.5, c, rough=0.85) for i, (pid, c) in enumerate((
    ('quatrefoil_jacquard_fabric', '#ff7ac4'), ('fabric_pattern_05', '#ffd24a'), ('denim_fabric', '#7fb0ff'),
    ('fabric_pattern_07', '#8fe07a'), ('quatrefoil_jacquard_fabric', '#fff2dc'), ('fabric_pattern_05', '#ff9a5c'),
))]
UMBUL_M = m.flat('sway_merah', '#e02a2a', 0.8)
UMBUL_P = m.flat('sway_putih', '#f5f2ea', 0.8)
LAMPU = m.flat('neon_lampu', '#ffd9a0', 0.4, emit=5)
NEON_WARUNG = m.flat('neon_warung', '#5cf64a', 0.4, emit=3)
AIR = m.flat('air_selokan', '#31453f', 0.1)
KROM = m.flat('krom', '#c6ccd2', 0.2, 1.0)
TEMBAGA = m.flat('kayu_kusen', '#6d4a2c', 0.6)
SACHET = [m.flat(f'sachet{i}', c, 0.35) for i, c in enumerate(('#ff37a6', '#ffcc1f', '#2f6fd0', '#e0332b', '#3aa655'))]


# ---------- rumah ----------
T = 0.22


def house(x0, y0, x1, y1, h, wall, front, ridge_along='x', roof=GENTENG, door_mat=None, wins=2, ridge=1.5, atas=False):
    """`front` = sisi ke gang. Dinding depan benar-benar berlubang: jendela dan pintu masuk ke dalam dinding"""
    axis = 'x' if front in 'SN' else 'y'
    out = {'S': -1, 'N': 1, 'W': -1, 'E': 1}[front]
    face = (y0 if out < 0 else y1) if axis == 'x' else (x0 if out < 0 else x1)
    a0, a1 = (x0, x1) if axis == 'x' else (y0, y1)
    P = (lambda t, d, z: (t, face + out * d, z)) if axis == 'x' else (lambda t, d, z: (face + out * d, t, z))
    S = (lambda w, d, z: (w, d, z)) if axis == 'x' else (lambda w, d, z: (d, w, z))
    rot = {'S': 0, 'N': math.pi, 'E': math.pi / 2, 'W': -math.pi / 2}[front]
    # inti rumah mundur setebal dinding depan
    cx0, cy0, cx1, cy1 = x0, y0, x1, y1
    if front == 'S':
        cy0 += T
    elif front == 'N':
        cy1 -= T
    elif front == 'W':
        cx0 += T
    else:
        cx1 -= T
    m.block(cx0, cy0, cx1, cy1, 0, h, wall, cont=True)
    m.solid((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, h)
    m.prism(x0, y0, x1, y1, h, h + ridge, roof, ridge_along, ends=False)
    # ujung atap: dinding segitiga, bukan genteng
    if ridge_along == 'x':
        m.gable(y0, y1, x0, h, h + ridge, wall, 'y', -1)
        m.gable(y0, y1, x1, h, h + ridge, wall, 'y', 1)
    else:
        m.gable(x0, x1, y0, h, h + ridge, wall, 'x', -1)
        m.gable(x0, x1, y1, h, h + ridge, wall, 'x', 1)

    span = a1 - a0
    door_t = a0 + span * 0.32
    win_t = [a0 + span * (0.55 + 0.32 * i / max(1, wins - 1) if wins > 1 else 0.68) for i in range(wins)]
    # kolom bukaan: (t0, t1, [(z0, z1), ...])
    cols = [(door_t - 0.52, door_t + 0.52, [(0, 2.2)] + ([(3.5, 4.7)] if atas else []))]
    for t in win_t:
        cols.append((t - 0.62, t + 0.62, [(1.05, 2.25)] + ([(3.5, 4.7)] if atas else [])))
    cols.sort()

    def panel(t0, t1, z0, z1):
        if t1 - t0 > 0.01 and z1 - z0 > 0.01:
            m.box(P((t0 + t1) / 2, -T / 2, (z0 + z1) / 2), S(t1 - t0, T, z1 - z0), wall, bevel=0, cont=True)

    c = a0
    for t0, t1, zs in cols:
        panel(c, t0, 0, h)
        z = 0
        for z0, z1 in zs:
            panel(t0, t1, z, z0)
            z = z1
        panel(t0, t1, z, h)
        c = t1
    panel(c, a1, 0, h)

    # lis bata dan penutup semen, terputus di pintu
    for p0, p1 in ((a0, cols[0][0]), (cols[0][1], a1)):
        if cols[0][2][0][0] == 0 and p1 - p0 > 0.05:
            m.box(P((p0 + p1) / 2, 0.03, 0.42), S(p1 - p0, 0.07, 0.84), BATA)
            m.box(P((p0 + p1) / 2, 0.05, 0.86), S(p1 - p0, 0.12, 0.05), BETON2)

    def frame(t, z0, z1, w, mat, tebal=0.07):
        for u in (t - w / 2 + tebal / 2, t + w / 2 - tebal / 2):
            m.box(P(u, -0.05, (z0 + z1) / 2), S(tebal, 0.1, z1 - z0), mat)
        m.box(P(t, -0.05, z1 - tebal / 2), S(w, 0.1, tebal), mat)

    def jendela(t, z0, z1):
        w = 1.24
        m.box(P(t, -T + 0.015, (z0 + z1) / 2), S(w, 0.02, z1 - z0), KACA, bevel=0)
        # tirai di balik kaca, setengah tinggi
        m.box(P(t, -T + 0.04, z1 - (z1 - z0) * 0.27), S(w - 0.1, 0.012, (z1 - z0) * 0.54), KAIN_TIRAI[m.rnd.randrange(3)], bevel=0)
        frame(t, z0, z1, w, PUTIH)
        m.box(P(t, -0.1, (z0 + z1) / 2), S(0.05, 0.04, z1 - z0), PUTIH)
        m.box(P(t, 0.02, z0 - 0.03), S(w + 0.2, 0.2, 0.06), BETON2)
        m.box(P(t, 0.02, z1 + 0.05), S(w + 0.16, 0.14, 0.07), BETON2)
        for i in range(1, 6):
            m.cyl(P(t - w / 2 + w * i / 6, 0.015, (z0 + z1) / 2), 0.008, z1 - z0, BESI_HIJAU, 5)
        for z in (z0 + 0.3, z1 - 0.3):
            m.box(P(t, 0.015, z), S(w, 0.02, 0.02), BESI_HIJAU, bevel=0)
        # noda hujan dari ambang
        m.decal(P(t + m.rnd.uniform(-0.3, 0.3), 0.012, z0 - 0.52), 0.9, 0.95, DEC['noda'], axis, out)

    def pintu(t):
        w, z1 = 1.04, 2.2
        frame(t, 0, z1, w, TEMBAGA, 0.08)
        d = door_mat or PAPAN_BIRU
        m.box(P(t, -T + 0.05, z1 / 2), S(w - 0.1, 0.06, z1 - 0.06), d)
        for z in (0.55, 1.5):
            m.box(P(t, -T + 0.09, z), S(w - 0.36, 0.03, 0.72), d)
        m.ball(P(t + 0.36, -T + 0.12, 1.02), 0.035, KROM)
        m.box(P(t, 0.3, 0.09), S(1.6, 0.6, 0.18), BETON, solid=True)
        m.box(P(t, 0.42, 0.2), S(0.7, 0.3, 0.02), MERAH)
        m.box(P(t, 0.44, z1 + 0.32), S(1.5, 0.76, 0.05), SENG2)

    pintu(door_t)
    for tc in win_t:
        jendela(tc, 1.05, 2.25)
    if atas:
        for t0, t1, _ in cols:
            jendela((t0 + t1) / 2, 3.5, 4.7)

    # listplang, talang, usuk, dan pipa turun
    mid = (a0 + a1) / 2
    m.box(P(mid, 0.5, h + 0.02), S(span + 1.0, 0.04, 0.16), PUTIH)
    m.rope(P(a0 - 0.5, 0.56, h - 0.02), P(a1 + 0.5, 0.56, h - 0.02), 0.05, SENG2, 0, 1, 8)
    down = a1 - 0.14
    m.rope(P(down, 0.56, h - 0.02), P(down, 0.1, h - 0.34), 0.035, SENG2, 0, 1, 6)
    m.rope(P(down, 0.1, h - 0.34), P(down, 0.1, 0.1), 0.035, SENG2, 0, 1, 6)
    for i in range(int(span / 0.9)):
        m.box(P(a0 + 0.3 + i * 0.9, 0.24, h - 0.05), S(0.06, 0.5, 0.09), PAPAN_TUA)
    if ridge_along == 'x':
        m.rope((x0 - 0.5, (y0 + y1) / 2, h + ridge + 0.02), (x1 + 0.5, (y0 + y1) / 2, h + ridge + 0.02), 0.11, TANAH_LIAT, 0, 1, 8)
    else:
        m.rope(((x0 + x1) / 2, y0 - 0.5, h + ridge + 0.02), ((x0 + x1) / 2, y1 + 0.5, h + ridge + 0.02), 0.11, TANAH_LIAT, 0, 1, 8)

    # AC, meteran, dan kabel masuk
    m.asset('exterior_aircon_unit', P(a1 - 1.0, 0.3, 2.45), rot, height=0.55, keep='exterior_aircon_unit_rusted')
    m.asset('utility_box_02', P(a0 + span * 0.18, 0.06, 1.25), rot, height=0.42)
    m.rope(P(a0 + span * 0.18, 0.1, 1.68), P(a0 + span * 0.18, 0.1, h), 0.012, KABEL, 0, 1, 5)

    # kotoran: lumut di kaki dinding, retak, dan poster
    for i in range(int(span / 2.2)):
        t = a0 + 0.9 + i * 2.2 + m.rnd.uniform(-0.3, 0.3)
        m.decal(P(t, 0.075, 0.46), 1.4, 0.8, DEC['lumut'], axis, out)
    m.decal(P(a0 + span * 0.12, 0.012, 2.2), 1.6, 1.6, DEC['retak'], axis, out)
    m.decal(P(a1 - span * 0.1, 0.012, 2.6), 1.3, 1.3, DEC['noda'], axis, out)
    if m.rnd.random() < 0.7:
        m.decal(P(door_t - 1.05, 0.012, 1.55), 0.56, 0.78, m.rnd.choice(DEC['poster']), axis, out)
    if m.rnd.random() < 0.4:
        m.decal(P(a0 + span * 0.2, 0.012, 1.3), 1.8, 0.9, DEC['coret'], axis, out)

    # sisi lain rumah: lis, angin-angin, noda, dan pipa
    sisi = [('y', x0, -1, y0, y1), ('y', x1, 1, y0, y1), ('x', y0, -1, x0, x1), ('x', y1, 1, x0, x1)]
    for ax, f, o2, b0, b1 in sisi:
        if ax == axis and o2 == out:
            continue
        Q = (lambda t, d, z: (t, f + o2 * d, z)) if ax == 'x' else (lambda t, d, z: (f + o2 * d, t, z))
        U = (lambda w, d, z: (w, d, z)) if ax == 'x' else (lambda w, d, z: (d, w, z))
        m.box(Q((b0 + b1) / 2, 0.03, 0.42), U(b1 - b0, 0.07, 0.84), BATA)
        n = max(1, int((b1 - b0) / 3))
        for i in range(n):
            t = b0 + (i + 0.5) * (b1 - b0) / n
            m.decal(Q(t, 0.012, h * 0.62), 2.0, 1.9, m.rnd.choice((DEC['noda'], DEC['retak'])), ax, o2)
            m.decal(Q(t + 0.7, 0.075, 0.46), 1.4, 0.8, DEC['lumut'], ax, o2)
            for q in range(3):
                m.box(Q(t, 0.02, 2.5 + q * 0.14), U(0.7, 0.06, 0.07), BETON2)

    # titik sembunyi: dinding polos di tepi rumah dan lis bata
    nx, ny = (0, out) if axis == 'x' else (out, 0)
    px, py, _ = P(a0 + span * 0.1, 0, 0)
    m.spot(px + nx * 0.42, py + ny * 0.42, nx, ny)
    px, py, _ = P(a0 + span * 0.46, 0, 0)
    m.spot(px + nx * 0.42, py + ny * 0.42, nx, ny, 'ringkuk')


def awning(x0, y0, x1, y1, z, mat=SENG, tilt=0.35):
    m.block(x0, y0, x1, y1, z, z + 0.06, mat)
    for x in (x0 + 0.1, x1 - 0.1):
        m.cyl((x, min(y0, y1) + 0.05, z / 2), 0.05, z, BESI, 8)


# ---------- benda ----------
def pot(x, y, big=False):
    h = 0.42 if big else 0.3
    m.asset('planter_pot_clay', (x, y, 0), m.rnd.random() * 6, height=h, tris=700, tex=256)
    m.solid(x, y, h * 1.1, h * 1.1, h)
    m.foliage_gltf(MK / m.rnd.choice(('Fern_1.gltf', 'Bush_Common_Flowers.gltf', 'Plant_1.gltf')), (x, y, h * 0.9), 0.9 if big else 0.55, m.rnd.random() * 6)


def tong(x, y, mat=BIRU):
    m.asset('metal_trash_can', (x, y, 0), m.rnd.random() * 6, height=0.95, tris=1600, solid=True, spot='ringkuk')
    m.asset('trashbag', (x + 0.5, y - 0.35, 0), m.rnd.random() * 6, height=0.5, tris=900, tex=256)


def galon(x, y, z=0.0):
    m.asset('plastic_bottle_gallon', (x, y, z), m.rnd.random() * 6, height=0.46, tris=500, tex=256)


def kursi(x, y, rot=0.0, mat=MERAH):
    m.asset('plastic_monobloc_chair_01', (x, y, 0), rot, height=0.86, tris=1500)
    m.solid(x, y, 0.46, 0.46, 0.46, rot)


def motor(x, y, rot, body=MERAH):
    """motor bebek: rangka lengkung, tameng depan, jok, velg jari-jari, spion, dan knalpot"""
    c, s = math.cos(rot), math.sin(rot)
    at = lambda f, z, g=0.0: (x + c * f - s * g, y + s * f + c * g, z)  # noqa: E731
    for f in (-0.62, 0.62):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.25, minor_radius=0.05, major_segments=22, minor_segments=7, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.object
        bpy.ops.object.transform_apply(rotation=True)
        m._keep(o, KARET)
        for p in o.data.polygons:
            p.use_smooth = True
        o.rotation_euler = (0, 0, rot)
        o.location = at(f, 0.3)
        m.cyl(at(f, 0.3), 0.07, 0.1, KROM, 12, rot=(math.pi / 2, 0, rot))
        for i in range(8):
            a = i / 8 * math.tau
            m.rope(at(f + math.cos(a) * 0.05, 0.3 + math.sin(a) * 0.05), at(f + math.cos(a) * 0.22, 0.3 + math.sin(a) * 0.22), 0.005, KROM, 0, 1, 4)
    m.ball(at(-0.28, 0.62), 0.3, body, (1.45, 0.62, 0.72), rot)
    m.ball(at(0.46, 0.72), 0.22, body, (0.34, 1.05, 1.5), rot)
    m.rope(at(0.08, 0.5), at(0.42, 0.68), 0.08, body, 0, 1, 8)
    m.rope(at(0.08, 0.5), at(-0.2, 0.42), 0.09, body, 0, 1, 8)
    m.ball(at(-0.34, 0.88), 0.27, KARET, (1.5, 0.72, 0.28), rot)
    m.rope(at(0.54, 0.3), at(0.5, 1.02), 0.03, KROM, 0, 1, 6)
    m.ball(at(0.56, 1.02), 0.11, body, (0.8, 1.2, 0.8), rot)
    m.ball(at(0.65, 1.02), 0.06, LAMPU)
    m.rope(at(0.5, 1.06, -0.34), at(0.5, 1.06, 0.34), 0.016, KROM, 0, 1, 6)
    for g in (-0.34, 0.34):
        m.rope(at(0.5, 1.06, g), at(0.5, 1.06, g * 1.2), 0.024, KARET, 0, 1, 6)
        m.rope(at(0.48, 1.06, g * 0.8), at(0.46, 1.34, g), 0.007, KROM, 0, 1, 4)
        m.ball(at(0.46, 1.36, g), 0.05, KARET, (1, 0.4, 0.8), rot)
    m.rope(at(-0.05, 0.26, -0.13), at(-0.82, 0.32, -0.13), 0.042, KROM, 0, 1, 8)
    m.ball(at(-0.72, 0.68), 0.09, MERAH, (1.3, 1.6, 0.5), rot)
    m.solid(x, y, 1.7, 0.5, 1.1, rot)
    m.spot(x - s * 0.6, y + c * 0.6, -s, c, 'ringkuk')


def gerobak(x, y, rot):
    """gerobak bakso: lemari kaca, panci berasap, payung bergaris, dan roda jari-jari"""
    c, s = math.cos(rot), math.sin(rot)
    at = lambda f, z, g=0.0: (x + c * f - s * g, y + s * f + c * g, z)  # noqa: E731
    m.box(at(0, 0.85), (1.7, 0.8, 0.9), PAPAN, rot, solid=True, top=1.3)
    m.box(at(0, 0.42), (1.74, 0.84, 0.04), BESI, rot)
    m.box(at(0, 1.33), (1.86, 0.92, 0.05), PUTIH, rot)
    for f in (-0.55, 0.0, 0.55):
        m.box(at(f, 0.86, 0.41), (0.46, 0.02, 0.62), m.rnd.choice(KAIN_TIRAI), rot)
    # lemari kaca kecil
    m.box(at(-0.4, 1.66), (0.72, 0.62, 0.58), GALON, rot)
    m.box(at(-0.4, 1.98), (0.8, 0.7, 0.05), BESI, rot)
    for f, g in ((-0.77, -0.3), (-0.03, -0.3), (-0.77, 0.3), (-0.03, 0.3)):
        m.cyl(at(f, 1.65, g), 0.015, 0.6, BESI, 6)
    # panci
    m.cyl(at(0.5, 1.56), 0.24, 0.42, KROM, 16)
    m.cyl(at(0.5, 1.8), 0.25, 0.04, KROM, 16)
    m.ball(at(0.5, 1.86), 0.04, KARET)
    # roda
    for g in (-0.5, 0.5):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.03, major_segments=22, minor_segments=6, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.object
        bpy.ops.object.transform_apply(rotation=True)
        m._keep(o, KARET)
        o.rotation_euler = (0, 0, rot)
        o.location = at(0.2, 0.31, g)
        for i in range(8):
            a = i / 8 * math.tau
            m.rope(at(0.2, 0.31, g), at(0.2 + math.cos(a) * 0.29, 0.31 + math.sin(a) * 0.29, g), 0.008, BESI, 0, 1, 4)
    # gagang dan payung
    m.rope(at(-0.85, 1.05, -0.3), at(-1.4, 1.1, -0.3), 0.025, PAPAN_TUA, 0, 1, 6)
    m.rope(at(-0.85, 1.05, 0.3), at(-1.4, 1.1, 0.3), 0.025, PAPAN_TUA, 0, 1, 6)
    m.cyl(at(0.86, 1.8), 0.025, 1.6, BESI, 8)
    m.fan(at(0.2, 2.5), 1.25, 2.86, [MERAH, PUTIH], n=12)
    m.life['asap'].append([at(0.5, 0)[0], 1.95, -at(0.5, 0)[1]])
    m.spot(x - s * 0.8, y + c * 0.8, -s, c, 'ringkuk')


def peti(x, y, n=2, rot=0.0):
    pid = m.rnd.choice(('wooden_crate_01', 'plastic_crate_01', 'cardboard_box_01'))
    z = 0.0
    for i in range(n):
        o = m.asset(pid, (x, y, z), rot + i * 0.2, height=0.42, tris=900)
        z += 0.42
    m.solid(x, y, 0.75, 0.6, z, rot)
    m.spot(x + 0.75, y, 1, 0, 'ringkuk')


def bata_tumpuk(x, y):
    for lv in range(4):
        m.box((x, y, 0.13 + lv * 0.26), (1.1 - lv * 0.14, 0.7, 0.26), BATA, lv * 0.04, solid=lv == 0, top=1.04)
    m.spot(x + 0.75, y, 1, 0, 'ringkuk')


def ban(x, y, n=3):
    z = 0.0
    for i in range(n):
        m.asset('old_tyre', (x, y, z), i * 1.3, height=0.22, tris=900, tex=256)
        z += 0.21
    m.solid(x, y, 0.8, 0.8, z)


def tiang(x, y):
    m.cyl((x, y, 3.6), 0.13, 7.2, BETON2, 14, 0.09, solid=True)
    m.box((x, y, 6.8), (1.5, 0.08, 0.08), BESI)
    m.box((x, y, 6.2), (1.1, 0.07, 0.07), BESI)
    for dx in (-0.6, 0.0, 0.6):
        m.cyl((x + dx, y, 6.92), 0.045, 0.16, PUTIH, 8, 0.03)
    # trafo dan kotak meteran
    m.cyl((x + 0.26, y, 5.4), 0.21, 0.8, BESI_HIJAU, 14)
    m.box((x + 0.26, y, 5.84), (0.34, 0.34, 0.08), BESI)
    for i in range(3):
        m.rope((x + 0.26, y, 5.86), (x - 0.6 + i * 0.6, y, 6.84), 0.012, KABEL, 0, 1, 4)
    m.asset('utility_box_01', (x, y - 0.26, 1.2), 0.0, height=0.7, tris=800)
    # kabel kusut melilit tiang
    for i in range(5):
        a = i * 1.3
        m.rope((x + math.cos(a) * 0.14, y + math.sin(a) * 0.14, 2.2 + i * 0.5), (x + math.cos(a + 1.3) * 0.14, y + math.sin(a + 1.3) * 0.14, 2.7 + i * 0.5), 0.012, KABEL, 0, 1, 4)
    return (x, y, 6.85)


def street_lamp(x, y, dx):
    m.cyl((x, y, 2.3), 0.05, 4.6, BESI, 8)
    m.box((x + dx * 0.4, y, 4.55), (0.85, 0.05, 0.05), BESI)
    m.box((x + dx * 0.72, y, 4.46), (0.32, 0.16, 0.1), LAMPU)
    m.solid(x, y, 0.15, 0.15, 3)
    lamp((x + dx * 0.72, y, 4.3), 90)


def jemuran(x0, y0, x1, y1):
    """dua tiang + tali + kain yang bergoyang"""
    for x, y in ((x0, y0), (x1, y1)):
        m.cyl((x, y, 1.1), 0.05, 2.2, BESI, 8, solid=True)
    a, b = (x0, y0, 2.15), (x1, y1, 2.15)
    m.rope(a, b, 0.012, KABEL, 0.05, 6)
    n = int(math.hypot(x1 - x0, y1 - y0) / 0.75)
    for i in range(n):
        t = (i + 0.5) / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        h = 0.7 + m.rnd.random() * 0.45
        rot = math.atan2(y1 - y0, x1 - x0)
        m.cloth((x, y, 2.12), 0.55 + m.rnd.random() * 0.12, h, KAIN[i % len(KAIN)], rot, sway=0.32, shirt=i % 3 == 1)


def umbul(x, y, h=4.5):
    m.cyl((x, y, h / 2), 0.03, h, PAPAN_TUA, 6, 0.015)
    m.cloth((x + 0.22, y, h), 0.42, 0.75, UMBUL_M, 0.0, sway=0.14)
    m.cloth((x + 0.22, y, h - 0.75), 0.42, 0.75, UMBUL_P, 0.0, sway=0.2)


def mural(x, y0, y1, side):
    """dinding gambar warga: bentuk Memphis ditempel tipis"""
    colors = (MERAH, KUNING, BIRU, HIJAU_PLASTIK, PUTIH)
    for i in range(14):
        cy = y0 + (y1 - y0) * (i + 0.5) / 14
        cz = 0.7 + m.rnd.random() * 1.7
        s = 0.4 + m.rnd.random() * 0.7
        m.box((x + side * 0.02, cy, cz), (0.02, s, s * (0.6 + m.rnd.random())), colors[i % 5], 0.0)


# ---------- tanah & jalan ----------
m.block(-25, -20, 25, 20, -0.4, 0, TANAH)
m.block(-25, -3, 25, 3, 0, 0.04, PAVING)
m.block(-3, 3, 3, 20, 0, 0.04, PAVING)
m.block(-3, -19, 4, -3, 0, 0.04, BETON)
m.block(-22, -18.5, -3, -11.6, 0, 0.03, BETON)

# selokan di sisi utara gang, ditutup lempeng beton sebagian
m.block(-25, 3.0, 25, 3.5, -0.25, 0.02, BETON2)
m.block(-25, 3.12, 25, 3.38, -0.03, 0.03, AIR)
for i in range(-5, 5):
    m.block(i * 5 + 1.2, 2.96, i * 5 + 2.6, 3.54, 0.02, 0.1, BETON)

# pagar keliling: fasad tetangga menutup map
for x0, y0, x1, y1, w, h in (
    (-25, -20, 25, -19, 3, 6), (-25, 19, 25, 20, 2, 7),
    (-25, -20, -24, 20, 0, 6), (24, -20, 25, 20, 4, 6),
):
    m.block(x0, y0, x1, y1, 0, h, PLESTER[w], solid=True)
    m.block(x0 - 0.2, y0 - 0.2, x1 + 0.2, y1 + 0.2, h, h + 0.14, SENG2)


def fasad(axis, f, a0, a1, out, h):
    """rumah tetangga yang menutup map: deretan jendela, lis bata, noda, dan pipa di dinding keliling"""
    P = (lambda t, d, z: (t, f + out * d, z)) if axis == 'x' else (lambda t, d, z: (f + out * d, t, z))
    S = (lambda w, d, z: (w, d, z)) if axis == 'x' else (lambda w, d, z: (d, w, z))
    m.box(P((a0 + a1) / 2, 0.04, 0.5), S(a1 - a0, 0.08, 1.0), BATA)
    n = int((a1 - a0) / 3.4)
    for i in range(n):
        t = a0 + (i + 0.5) * (a1 - a0) / n
        for z in (2.0, 4.4):
            m.box(P(t, 0.03, z), S(1.5, 0.06, 1.4), PUTIH)
            m.box(P(t, 0.065, z), S(1.3, 0.03, 1.2), KACA)
            m.box(P(t, 0.08, z + 0.26), S(1.26, 0.012, 0.6), KAIN_TIRAI[m.rnd.randrange(3)], bevel=0)
            m.box(P(t, 0.09, z), S(0.05, 0.03, 1.2), PUTIH)
            m.box(P(t, 0.09, z - 0.76), S(1.7, 0.18, 0.06), BETON2)
            m.decal(P(t + m.rnd.uniform(-0.4, 0.4), 0.012, z - 1.15), 1.0, 0.8, DEC['noda'], axis, out)
        if i % 2 == 0:
            d = t + (a1 - a0) / n / 2
            m.rope(P(d, 0.09, h), P(d, 0.09, 0.05), 0.035, SENG2, 0, 1, 6)
            m.decal(P(d, 0.012, 2.8), 2.2, 2.4, DEC['noda'], axis, out)
        m.decal(P(t, 0.085, 0.5), 1.8, 0.9, DEC['lumut'], axis, out)
    m.box(P((a0 + a1) / 2, 0.14, h - 0.1), S(a1 - a0, 0.28, 0.1), BETON2)


fasad('x', -19, -24, 25, 1, 6)
fasad('x', 19, -24, 24, -1, 7)
fasad('y', -24, -19, 19, 1, 6)
fasad('y', 24, -19, 19, -1, 6)

# ---------- rumah ----------
house(-23, 4, -14, 11, 3.4, PLESTER[0], 'S', 'x')
house(-13.5, 4, -4, 10, 3.2, PLESTER[1], 'S', 'x', door_mat=PAPAN)
house(-13, 11.5, -3.6, 18, 3.3, BATA_CAT, 'E', 'y')
house(3.6, 4, 12, 11, 3.3, PLESTER[2], 'S', 'x')
house(12.5, 4, 23, 10.5, 5.6, PLESTER[4], 'S', 'x', roof=SENG, door_mat=PAPAN, wins=3, atas=True)
house(3.6, 12, 10, 18.5, 3.1, PLESTER[3], 'W', 'y')
house(-23, -11, -12, -3.6, 3.4, PLESTER[5], 'N', 'x', roof=SENG2, door_mat=PAPAN)
house(-11.5, -10, -3.2, -3.6, 3.2, PLESTER[2], 'N', 'x')

# teras seng
awning(-21, 2.2, -16, 3.95, 2.5)
awning(5, 2.2, 10, 3.95, 2.5, SENG2)
awning(-20, -3.5, -14, -2.1, 2.5)

# dinding belakang halaman jemuran, dinding mural
m.block(-23, -11.5, -3.2, -11, 0, 1.8, BETON2)
m.solid(-13.1, -11.25, 19.8, 0.5, 1.8)
# dinding mural berpintu: satu-satunya jalan ke halaman jemuran
m.block(-3.2, -18.5, -3, -14.6, 0, 2.2, BATA_CAT, solid=True)
m.block(-3.2, -12.4, -3, -10, 0, 2.2, BATA_CAT, solid=True)
mural(-2.98, -18.3, -14.8, 1)
mural(-2.98, -12.2, -10.2, 1)
for y in (-17.6, -16, -11.2):
    m.spot(-2.5, y, 1, 0, 'nempel')

# ---------- warung (terbuka ke barat, menghadap lapangan) ----------
WX0, WX1, WY0, WY1 = 15, 23, -12.5, -3.6
m.block(WX0, WY0, WX1, WY1, 0, 0.12, TERASO)
m.block(WX0, WY0 - 0.2, WX1, WY0, 0, 3.0, PLESTER[3], solid=True)
m.block(WX0, WY1, WX1, WY1 + 0.2, 0, 3.0, PLESTER[3], solid=True)
m.block(WX1 - 0.2, WY0, WX1, WY1, 0, 3.0, PLESTER[3], solid=True)
m.block(WX0 - 1.8, WY0 - 0.3, WX1 + 0.1, WY1 + 0.3, 3.0, 3.06, SENG)
for y in (WY0, WY1):
    m.cyl((WX0 - 1.7, y, 1.5), 0.06, 3.0, BESI, 8, solid=True)
# etalase dan rak
m.block(17, -11.5, 18, -4.8, 0.12, 1.05, PAPAN, solid=True)
m.block(16.95, -11.55, 18.05, -4.75, 1.05, 1.1, KACA)
for z in (0.9, 1.5, 2.1):
    m.block(22.2, -12, 22.8, -4, z, z + 0.05, PAPAN_TUA)
    for i in range(12):
        y = -11.7 + i * 0.66
        m.box((22.5, y, z + 0.2), (0.3, 0.5, 0.32), SACHET[(i + int(z * 3)) % 5])
m.solid(22.5, -8, 0.6, 8, 2.4)
# renteng sachet menggantung dari atap
for i in range(16):
    y = -11.8 + i * 0.5
    m.cloth((16.2, y, 2.95), 0.16, 1.0, SACHET[i % 5], math.pi / 2, sway=0.1, cols=1, rows=5)
m.box((14.4, -8, 3.5), (0.08, 6.2, 0.9), PAPAN_BIRU)
m.box((14.34, -8, 3.5), (0.05, 5.6, 0.34), NEON_WARUNG)
lamp((19, -8, 2.7), 70)
lamp((14.5, -8, 2.7), 40)
for y in (-11.4, -10.9, -10.4):
    galon(16.0, y)
m.solid(16, -10.9, 0.5, 1.5, 0.6)
kursi(13.2, -6.2, 0.4)
kursi(13.6, -9.4, -0.6, BIRU)
kursi(12.8, -8, 2.0, KUNING)
m.block(13, -8.3, 14, -7.5, 0.6, 0.66, PAPAN, solid=True)
m.spot(16.2, -5.3, 1, 0, 'ringkuk')
m.spot(15.5, -4.2, 0, -1, 'nempel')
m.spot(15.5, -12.0, 0, 1, 'nempel')

# ---------- pos ronda (kurungan pencari saat fase sembunyi) ----------
PX0, PX1, PY0, PY1 = 19.5, 24, -3, 3
m.block(PX0, PY0, PX1, PY1, 0.04, 0.36, PAPAN_TUA, solid=False)
m.solid(21.75, 0, 4.5, 6, 0.36)
for x, y in ((PX0, PY0), (PX0, PY1), (PX1 - 0.3, PY0), (PX1 - 0.3, PY1)):
    m.cyl((x, y, 1.6), 0.09, 3.2, PAPAN_TUA, 8, solid=True)
m.block(PX0 - 0.4, PY0 - 0.5, PX1 + 0.1, PY1 + 0.5, 3.2, 3.28, SENG)
m.block(PX0 + 0.3, PY0, PX1, PY0 + 0.1, 0.36, 1.2, PAPAN_BIRU)
m.cyl((PX0 + 0.3, 1.6, 2.6), 0.2, 0.7, PAPAN, 10)
lamp((21.5, 0, 2.9), 30)
m.spawn['seeker'] = [[21.3, 0.8], [21.3, -0.8]]

# ---------- gapura barat ----------
for y in (-3, 3):
    m.box((-22.5, y, 2.1), (0.9, 0.9, 4.2), MERAH if y < 0 else PUTIH, solid=True)
m.box((-22.5, 0, 4.5), (0.9, 7.6, 0.8), PUTIH)
for y in (-2.4, -0.8, 0.8, 2.4):
    m.box((-22.5, y, 4.5), (0.92, 0.7, 0.82), MERAH)
m.spot(-22.5, -2.4, 0, 1, 'nempel')

# ---------- tiang listrik & kabel ----------
tops = [tiang(-17, -3.2), tiang(-2.6, 3.3), tiang(11, -3.4), tiang(23, 11)]
for a, b in zip(tops, tops[1:]):
    for dz in (0, -0.2):
        m.rope((a[0] - 0.6, a[1], a[2] + dz), (b[0] - 0.6, b[1], b[2] + dz), 0.012, KABEL, 0.5)
        m.rope((a[0] + 0.6, a[1], a[2] + dz), (b[0] + 0.6, b[1], b[2] + dz), 0.012, KABEL, 0.45)
m.rope((tops[1][0], tops[1][1], 6.7), (-2.6, 18, 4), 0.012, KABEL, 0.4)
street_lamp(-9, -3.3, 1)
street_lamp(7, 3.0, -1)
street_lamp(2.8, 14, -1)

# ---------- isi gang ----------
for x in (-19, -16.5, -8, -6, 6, 9, 15, 18):
    pot(x, 3.75, x in (-16.5, 6))
pot(-15, -3.3, True)
pot(-7, -3.3)
motor(-11, 2.1, 0.08)
motor(8.2, -2.3, 3.1, BIRU)
motor(2.3, 9, 1.6, HIJAU_PLASTIK)
gerobak(3.2, -1.9, 0.0)
tong(-3.2, 2.5)
tong(13, 2.6, HIJAU_PLASTIK)
peti(-4.6, -3.1)
peti(12.2, -3.0, 3)
bata_tumpuk(-1.8, 10.5)
ban(2.5, 16.5)
for x in (-14, -5, 2, 12):
    umbul(x, 2.85)
m.spot(-3.2, 13, 1, 0, 'nempel')
m.spot(3.1, 6.5, -1, 0, 'nempel')

# ---------- halaman jemuran (selatan-barat) ----------
jemuran(-20, -13, -8, -13)
jemuran(-20, -16, -8, -16.4)
bata_tumpuk(-21, -17.5)
tong(-6, -17.6, MERAH)
peti(-16, -18, 2)
peti(-9.5, -18.2, 3)
m.spot(-18, -11.9, 0, -1, 'ringkuk')
m.spot(-12, -18.6, 0, 1, 'nempel')

# ---------- lapangan mangga ----------
for x, y, h, r in ((10, -11, 8.5, 0.5), (6.2, -15.5, 6.5, 2.0)):
    m.foliage_gltf(MK / 'CommonTree_1.gltf' if h > 8 else MK / 'CommonTree_3.gltf', (x, y, 0), h, r)
    m.solid(x, y, 0.6, 0.6, 3)
m.spot(10.5, -11.4, 1, 0, 'nempel')
gerobak(11, -15.2, 1.1)
m.block(5, -7.5, 8.4, -6.9, 0.42, 0.5, PAPAN, solid=True)
m.cyl((5.3, -7.2, 0.21), 0.05, 0.42, BESI, 6)
m.cyl((8.1, -7.2, 0.21), 0.05, 0.42, BESI, 6)
peti(19, -15, 3, 0.2)
ban(14, -17.5, 4)
bata_tumpuk(5.5, -17.8)
for x in (16, 18.5, 21):
    pot(x, -18.4, True)
m.spot(8, -18.5, 0, 1, 'nempel')

# kebun kecil timur laut di balik pagar
m.block(11.5, 11.5, 23, 11.62, 0, 1.4, BESI_HIJAU, solid=True)
for x, y, h in ((15, 15, 5.5), (20, 16.5, 6.5), (13, 17.5, 3)):
    m.foliage_gltf(MK / 'CommonTree_2.gltf', (x, y, 0), h, x)
    m.solid(x, y, 0.5, 0.5, 3)
for x in (17, 19, 21):
    m.foliage_gltf(MK / 'Bush_Common.gltf', (x, 13.2, 0), 1.2, x)
m.spot(10.5, 15, 1, 0, 'nempel')
m.spot(17, 18.6, 0, -1, 'nempel')

# ---------- benda kecil yang membuat gang terasa ditinggali ----------
m.asset('ladder_sectioned_01', (-4.5, 10.2, 0), 1.2, height=2.6, tris=900)
m.asset('wicker_basket_01', (-18.2, -3.3, 0), 0.4, height=0.4, tris=900, tex=256)
m.asset('wooden_bucket_01', (7.6, 3.75, 0), 1.0, height=0.34, tris=800, tex=256)
m.asset('watering_can_metal_01', (-7.8, 3.75, 0), 2.1, height=0.3, tris=800, tex=256)
m.asset('wooden_stool_01', (14.2, -5, 0), 0.7, height=0.46, tris=800, tex=256)
m.asset('barrel_03', (20, -17.6, 0), 0.0, height=1.0, tris=1200, solid=True, spot='ringkuk')
m.asset('concrete_road_barrier', (0.4, -16.5, 0), 1.57, height=0.8, tris=800, solid=True)
m.asset('steel_frame_shelves_01', (20.8, -4.3, 0.12), 0.0, height=2.0, tris=1600)
for x, y in ((-10, 0), (6, 0.5), (0.3, 12)):
    m.asset('water_manhole_cover', (x, y, 0.045), 0.3, height=0.04, tris=500, tex=256)
# sangkar burung digantung di teras
for x, y in ((-18, 2.6), (7, 2.6)):
    m.rope((x, y, 2.5), (x, y, 2.05), 0.006, KABEL, 0, 1, 3)
    for i in range(10):
        a = i / 10 * math.tau
        m.rope((x + math.cos(a) * 0.15, y + math.sin(a) * 0.15, 1.72), (x + math.cos(a) * 0.15, y + math.sin(a) * 0.15, 1.95), 0.004, TEMBAGA, 0, 1, 3)
    m.ball((x, y, 1.97), 0.16, TEMBAGA, (1, 1, 0.5))
    m.cyl((x, y, 1.7), 0.17, 0.04, TEMBAGA, 12)
    m.ball((x, y, 1.82), 0.05, KUNING, (1, 1.3, 1))
# kabel antar rumah dan tali lampu kecil
for a, b in (((-14, 4, 3.2), (-13.5, -3.4, 3.1)), ((-4, 4, 3.3), (3.6, 4, 3.4)), ((3.6, 12, 3), (-3.6, 11.5, 3.2)), ((12, 4, 3.2), (11, -3.4, 5.6))):
    m.rope(a, b, 0.012, KABEL, 0.3, 8)

# tempelan tanah: noda, retak jalan, dan tanah yang merayap ke paving
for i in range(26):
    x, y = m.rnd.uniform(-23, 23), m.rnd.choice((-2.7, -2.4, 2.6, 2.3)) + m.rnd.uniform(-0.2, 0.2)
    m.decal((x, y, 0.046), m.rnd.uniform(1.2, 2.6), m.rnd.uniform(0.7, 1.3), DEC['tanah'])
for i in range(10):
    m.decal((m.rnd.uniform(-22, 22), m.rnd.uniform(-2.4, 2.4), 0.047), 1.8, 1.8, DEC['retak'])
for x, y in ((-11, 2.1), (8.2, -2.3), (2.3, 9)):
    m.decal((x, y, 0.048), 1.5, 0.9, DEC['oli'])
for i in range(8):
    m.decal((m.rnd.uniform(-20, -5), m.rnd.uniform(-18, -12), 0.036), 2.2, 2.2, DEC['tanah'])
for y in (-17, -10):
    m.decal((-1, y, 0.046), 3, 3, DEC['retak'])

# rumput liar: kaki dinding, retakan, dan lapangan
kaki = [(m.rnd.uniform(-23, 23), m.rnd.choice((3.65, 3.72, -3.5, -3.42))) for _ in range(46)]
kaki += [(m.rnd.choice((-3.32, 3.3)), m.rnd.uniform(4, 18)) for _ in range(20)]
m.scatter('detail_rumput', MK / 'Grass_Common_Short.gltf', kaki, 0.28)
lapang = [(m.rnd.uniform(4.8, 14.4), m.rnd.uniform(-18.4, -3.6)) for _ in range(46)] + [(m.rnd.uniform(11.8, 23.5), m.rnd.uniform(12, 18.7)) for _ in range(40)]
m.scatter('detail_rumput2', MK / 'Grass_Common_Short.gltf', lapang, 0.34)
m.scatter('detail_kerikil', MK / 'Pebble_Round_2.gltf', [(m.rnd.uniform(4.6, 14), m.rnd.uniform(-18, -4)) for _ in range(34)], 0.08)

# ---------- kehidupan & titik muncul ----------
m.spawn['hider'] = [[-6, -0.8], [-4, 1], [-2, -1], [0, 1], [2, -0.6], [4, 1], [6, 0], [-8, 0.5]]
m.life['merpati'] = [[-1, 0.05, 0.6], [6.5, 0.05, 8.5], [-16, 0.05, 0.5], [-13, 0.05, 15.0], [12, 0.05, 12]]
m.life['kucing'] = [[[-12, 1], [-4, 1], [-0.5, 1], [0.5, 7], [0.5, 15], [0.5, 7], [0, 1], [6, 0.6], [12, 0.6]], [[0.5, -5], [1, -13], [0.5, -5], [1, -1], [5, -0.8], [12, -0.8]]]
m.life['burung'] = [[-4, 0.05, -1.5], [9, 0.05, -2], [0.5, 0.05, 9]]
m.life['ayam'] = [[[-3, -2], [1, -3], [3, 3], [-1, 4]], [[4, -1], [10, -2], [13, 1], [6, 1.5]], [[-12, -1], [-7, -0.8], [-8, 1], [-13, 1]]]
m.life['warga'] = [[[-22, -1], [-6, -1.8], [1, -1], [1.5, 9], [0, 17.5], [-1, 9], [-1.5, 1.8], [-22, 1]], [[1, -17], [0, -5], [1, 0], [12, -1], [20, -1]], [[0.5, 16], [0.5, 5], [-1, 1], [-12, 1], [-22, 0]]]

m.sun = set_sky('belfast_sunset_puresky_2k.hdr', 2.4, 6.5, (1.0, 0.78, 0.55), min_elevation=30)
m.finish()
