# Koki hewan Dapur Kacau: satu badan bertulang (jaket koki, celemek, topi, tangan melayang) + 8 kepala hewan.
# Bagian terikat kaku ke tulang. Material `apron` diwarnai ulang per pemain, `jaket` per pelanggan (NPC).
# Klip berlapis: badan (root/body/head/foot_*) dan tangan (hand_*) dimainkan bersamaan; klip penuh menyetel semuanya.
# Jalankan: blender --background --python scripts/blender/masak_koki.py -- brand/illustrations/masak src/assets/masak/models
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Euler, Vector  # noqa: E402

SUB['n'] = 0
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

ANIMALS = ['kucing', 'beruang', 'bebek', 'kodok', 'panda', 'rubah', 'kelinci', 'ayam']
HEAD = Vector((0, 0, 0.86))
HEAD_R = 0.27


# ---------- tekstur buatan sendiri: warna + normal map dari larik numpy ----------
def fbm(size, seed, cells=8, octaves=4, stretch=1.0):
    r = np.random.default_rng(seed)
    out = np.zeros((size, size), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cx = cells * 2 ** o
        cy = max(1, int(cx / stretch))
        g = r.random((cy + 1, cx + 1)).astype(np.float32)
        g[:, -1] = g[:, 0]
        g[-1, :] = g[0, :]
        ys = np.linspace(0, cy, size, endpoint=False)
        xs = np.linspace(0, cx, size, endpoint=False)
        y0, x0 = ys.astype(int), xs.astype(int)
        fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        a = g[y0][:, x0]
        b = g[y0][:, x0 + 1]
        c = g[y0 + 1][:, x0]
        d = g[y0 + 1][:, x0 + 1]
        out += amp * (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy)
        tot += amp
        amp *= 0.5
    return out / tot


def normal_from(h, strength=2.0):
    dy, dx = np.gradient(h)
    n = np.dstack((-dx * strength * h.shape[0] / 64, -dy * strength * h.shape[0] / 64, np.ones_like(h)))
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def _img(name, px, color=True):
    h, w, _ = px.shape
    img = bpy.data.images.new(name, w, h, alpha=False)
    if not color:
        img.colorspace_settings.name = 'Non-Color'
    buf = np.ones((h, w, 4), np.float32)
    buf[:, :, :3] = px[::-1]
    img.pixels.foreach_set(buf.ravel())
    img.pack()
    return img


_tex = {}


def textured(name, color, kind='fur', rough=0.75, size=256, seed=1, sheen=0.0):
    """material bernama dengan tekstur warna & normal map; `kind` fur = helai searah, cloth = anyaman, skin = pori halus"""
    if name in _tex:
        return _tex[name]
    base = np.array(srgb(tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)))[:3], np.float32)
    # srgb() memberi linear; gambar disimpan sRGB
    base = np.where(base <= 0.0031308, base * 12.92, 1.055 * np.power(base, 1 / 2.4) - 0.055)
    if kind == 'fur':
        h = 0.5 * fbm(size, seed, 20, 3, stretch=2.2) + 0.5 * fbm(size, seed + 1, 6, 3)
        shade = 0.84 + 0.3 * h
    elif kind == 'cloth':
        y, x = np.mgrid[0:size, 0:size]
        weave = (np.sin(x * math.pi / 2) * np.sin(y * math.pi / 2)) * 0.5 + 0.5
        h = 0.6 * weave + 0.4 * fbm(size, seed, 10, 3)
        shade = 0.92 + 0.12 * h
    else:
        h = fbm(size, seed, 16, 4)
        shade = 0.94 + 0.1 * h
    px = np.clip(base[None, None] * shade[..., None], 0, 1)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n['Principled BSDF']
    t = n.new('ShaderNodeTexImage')
    t.image = _img(f'{name}_warna', px)
    l.new(t.outputs['Color'], b.inputs['Base Color'])
    tn = n.new('ShaderNodeTexImage')
    tn.image = _img(f'{name}_normal', normal_from(h, 1.1 if kind == 'fur' else 0.8), color=False)
    nm = n.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = 1.0
    l.new(tn.outputs['Color'], nm.inputs['Color'])
    l.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen
    _tex[name] = m
    return m


PLAIN = {}


def plain(name, color, rough=0.4, coat=0.0, emit=0.0):
    m = pbr(color, rough, coat=coat, emit=emit).copy()
    m.name = name
    PLAIN[name] = color
    return m


_warna = None


def warna_mat():
    """satu material untuk semua bagian berwarna polos (mata, kancing, pipi, hidung...): warnanya di vertex color"""
    global _warna
    if _warna:
        return _warna
    m = bpy.data.materials.new('warna')
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    c = n.new('ShaderNodeVertexColor')
    c.layer_name = 'Col'
    l.new(c.outputs['Color'], n['Principled BSDF'].inputs['Base Color'])
    n['Principled BSDF'].inputs['Roughness'].default_value = 0.35
    n['Principled BSDF'].inputs['Coat Weight'].default_value = 0.4
    _warna = m
    return m


def merge_plain(o):
    """bagian ber-material polos dilebur jadi satu material vertex color: satu draw call, bukan satu per warna"""
    me = o.data
    col = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    mats = [m.name if m else '' for m in me.materials]
    if 'warna' not in mats:
        me.materials.append(warna_mat())
        mats.append('warna')
    wi = mats.index('warna')
    for p in me.polygons:
        name = mats[p.material_index]
        hexc = PLAIN.get(name)
        rgb = srgb(tuple(int(hexc[i:i + 2], 16) for i in (1, 3, 5))) if hexc else (1, 1, 1, 1)
        for li in p.loop_indices:
            col.data[li].color = (rgb[0], rgb[1], rgb[2], 1.0)
        if hexc:
            p.material_index = wi
    # buang slot material yang tak terpakai lagi
    used = {p.material_index for p in me.polygons}
    # materials.pop menggeser indeks muka sendiri
    for i in reversed(range(len(me.materials))):
        if i not in used:
            me.materials.pop(index=i)


JAKET = textured('jaket', '#efe6d6', 'cloth', 0.8, seed=3)
# putih: warnanya diberi three.js per koki (warna x tekstur)
APRON = textured('apron', '#f4f2ee', 'cloth', 0.7, seed=4)
TOPI = textured('topi', '#fffdf8', 'cloth', 0.85, seed=5)
SARUNG = textured('sarung', '#fbfaf7', 'cloth', 0.6, seed=6)
KANCING = plain('kancing', '#2a2a30', 0.3, coat=0.6)
SEPATU = plain('sepatu', '#2b2622', 0.5, coat=0.3)
MATA = plain('mata', '#141218', 0.12, coat=1.0)
KILAU = plain('kilau', '#ffffff', 0.1, emit=1.5)
PIPI = plain('pipi', '#ff8fa8', 0.7)
HIDUNG = plain('hidung', '#2a1c1c', 0.25, coat=0.6)
PINK = textured('pink_dalam', '#f7a4b4', 'skin', 0.6, seed=7)
PARUH = textured('paruh', '#ffa21a', 'skin', 0.45, seed=8)
JENGGER = textured('jengger', '#e3242b', 'skin', 0.5, seed=9)
GIGI = plain('gigi', '#fffdf5', 0.3)


# ---------- UV bola di sekitar titik pusat (untuk tekstur bulu/kain pada bagian kaku) ----------
def sph_uv(o, center, tile=1.0):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    uv = bm.loops.layers.uv.verify()
    mw = o.matrix_world
    for f in bm.faces:
        for lp in f.loops:
            p = mw @ lp.vert.co - Vector(center)
            u = (math.atan2(p.x, -p.y) / math.tau + 0.5) * 3 * tile
            v = (math.atan2(p.z, math.hypot(p.x, p.y)) / math.pi + 0.5) * 2 * tile
            lp[uv].uv = (u, v)
    # jahitan atan2: muka yang melintasi batas diluruskan
    for f in bm.faces:
        us = [lp[uv].uv.x for lp in f.loops]
        if max(us) - min(us) > 1.5 * tile:
            for lp in f.loops:
                if lp[uv].uv.x < 1.5 * tile:
                    lp[uv].uv.x += 3 * tile
    bm.to_mesh(o.data)
    bm.free()


def mesh(o):
    if o.type != 'MESH':
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
        o = bpy.context.object
    return o


def bake(o):
    o = mesh(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def to(bone, objs, center=None):
    out = []
    for o in objs:
        o = bake(o)
        sph_uv(o, center or HEAD)
        for p in o.data.polygons:
            p.use_smooth = True
        vg = o.vertex_groups.new(name=bone)
        vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        out.append(o)
    return out


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    o.data.name = name
    return o


def ball(loc, r, m, scale=(1, 1, 1), seg=20, rot=(0, 0, 0)):
    return sphere(tuple(loc), r, m, scale, seg=seg, sub=False, rot=rot)


def limb(a, b, r, m, r2=None, verts=10, caps=True):
    A, B = Vector(a), Vector(b)
    d = B - A
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r if r2 is None else r2, depth=d.length, location=(A + B) / 2, vertices=verts)
    o = last()
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    o.data.materials.append(m)
    if not caps:
        return [o]
    return [o, ball(a, r, m, seg=10), ball(b, r if r2 is None else r2, m, seg=10)]


def at_head(dx, dy, dz):
    return HEAD + Vector((dx, dy, dz))


# ---------- badan bersama ----------
BODY_C = Vector((0, 0, 0.4))


def build_body():
    parts = []
    # badan telur berjaket koki, kancing dua baris, kerah
    torso = [ball(BODY_C, 0.27, JAKET, (1, 0.9, 1.02), seg=28)]
    for s in (-1, 1):
        # kancing hanya di dada, di atas celemek
        for z, y in ((0.56, -0.205), (0.515, -0.228)):
            torso.append(ball((s * 0.065, y, z), 0.016, KANCING, (1, 0.6, 1), seg=8))
    torso.append(torus((0, -0.01, 0.6), 0.15, 0.03, JAKET, rot=(math.radians(-8), 0, 0), seg=24))
    # celemek: kulit bola sedikit lebih besar di sisi depan bawah, tali di pinggang & leher
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.283, location=tuple(BODY_C), segments=28, ring_count=16)
    ap = last()
    ap.scale = (1, 0.91, 1.02)
    bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new()
    bm.from_mesh(ap.data)
    # transform_apply juga menerapkan lokasi: titik sudah dalam koordinat dunia
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -0.06 or v.co.z - BODY_C.z > 0.09 or abs(v.co.x) > 0.2 + max(0, BODY_C.z - v.co.z) * 0.2], context='VERTS')
    bm.to_mesh(ap.data)
    bm.free()
    sol = ap.modifiers.new('s', 'SOLIDIFY')
    sol.thickness = 0.012
    ap.data.materials.append(APRON)
    # celemek & syal objek sendiri: pelanggan (NPC) memakai badan yang sama tanpa seragam koki
    apron = [ap, torus((0, 0, 0.47), 0.255, 0.014, APRON, rot=(0, 0, 0), seg=32), torus((0, -0.01, 0.62), 0.12, 0.026, APRON, rot=(math.radians(-10), 0, 0), seg=20), ball((0, -0.13, 0.6), 0.04, APRON, (1.3, 0.6, 1), seg=10)]
    celemek = join(to('body', apron, BODY_C), 'celemek')
    parts += to('body', torso, BODY_C)
    for side, s in (('L', 1), ('R', -1)):
        foot = [ball((s * 0.11, -0.04, 0.055), 0.075, SEPATU, (0.9, 1.35, 0.7), seg=14)]
        parts += to(f'foot_{side}', foot, (s * 0.11, 0, 0.05))
        # tangan melayang bersarung putih
        hc = (s * 0.31, -0.05, 0.36)
        hand = [ball(hc, 0.072, SARUNG, (0.95, 0.85, 1.05), seg=16), ball((hc[0] - s * 0.05, hc[1] - 0.035, hc[2] + 0.02), 0.03, SARUNG, (1, 1, 1.2), seg=10)]
        parts += to(f'hand_{side}', hand, hc)
    # topi koki: pita celemek + mahkota mengembang
    hat = [cyl(tuple(at_head(0, 0.05, 0.22)), 0.11, 0.09, TOPI, verts=28, b=0.01)]
    hat.append(cyl(tuple(at_head(0, 0.05, 0.19)), 0.115, 0.03, APRON, verts=28, b=0.005))
    for i in range(6):
        a = i / 6 * math.tau
        hat.append(ball(at_head(math.cos(a) * 0.065, 0.05 + math.sin(a) * 0.065, 0.3), 0.068, TOPI, (1, 1, 0.85), seg=16))
    hat.append(ball(at_head(0, 0.05, 0.32), 0.08, TOPI, (1, 1, 0.8), seg=18))
    topi = join(to('head', hat, at_head(0, 0, 0.3)), 'topi')
    return join(parts, 'badan'), celemek, topi


# ---------- wajah & kepala per hewan ----------
def eyes(y=-0.235, z=0.04, gap=0.105, r=0.05, m=MATA):
    out = []
    for s in (-1, 1):
        x = s * gap
        out.append(ball(at_head(x, y, z), r, m, (0.9, 0.55, 1.15), seg=14))
        out.append(ball(at_head(x + s * 0.004 + 0.012, y - 0.03, z + 0.022), r * 0.3, KILAU, (1, 0.5, 1), seg=8))
    return out


def blush(y=-0.2, z=-0.04, gap=0.17):
    return [ball(at_head(s * gap, y, z), 0.04, PIPI, (1.2, 0.4, 0.7), seg=10) for s in (-1, 1)]


def skull(m, scale=(1.08, 1, 0.95)):
    return ball(HEAD, HEAD_R, m, scale, seg=30)


def ear_tri(m, inner, x, tilt, h=0.15, w=0.09):
    out = []
    base = at_head(x, 0.02, 0.18)
    rot = (math.radians(-8), math.radians(tilt), 0)
    out.append(cyl(tuple(base + Vector((0, 0, h / 2))), w, h, m, rot=rot, verts=4, r2=0.006, b=0.02))
    out.append(cyl(tuple(base + Vector((0, -0.025, h / 2 - 0.01))), w * 0.6, h * 0.8, inner, rot=rot, verts=4, r2=0.004, b=0.01))
    return out


def tail_ball(m, r=0.07, y=0.25, z=0.28):
    return ball((0, y, z), r, m, seg=14)


def kucing():
    fur = textured('bulu_kucing', '#f0973a', 'fur', 0.8, seed=11, sheen=0.4)
    stripe = textured('belang_kucing', '#c2611e', 'fur', 0.8, seed=12)
    putih = textured('bulu_putih', '#fff6ea', 'fur', 0.8, seed=13, sheen=0.4)
    head = [skull(fur)]
    # belang di pipi kiri-kanan
    for s in (-1, 1):
        for k in range(2):
            head.append(ball(at_head(s * 0.245, -0.07, 0.03 - k * 0.06), 0.06, stripe, (0.3, 0.9, 0.22), seg=10, rot=(0, 0, math.radians(s * 40))))
    head += [ball(at_head(0, -0.19, -0.07), 0.12, putih, (1.35, 0.7, 0.75), seg=18)]
    head.append(ball(at_head(0, -0.27, -0.03), 0.026, PINK, (1.3, 0.8, 0.8), seg=10))
    for s in (-1, 1):
        head += ear_tri(fur, PINK, s * 0.19, s * 30)
        for k in (-1, 0, 1):
            head += limb(at_head(s * 0.12, -0.27, -0.06 + k * 0.02), at_head(s * 0.3, -0.22, -0.05 + k * 0.05), 0.004, HIDUNG, verts=4, caps=False)
    head += eyes() + blush()
    tail = [*limb((0, 0.22, 0.2), (0.05, 0.38, 0.38), 0.04, fur, 0.035), ball((0.06, 0.4, 0.46), 0.045, stripe, seg=10)]
    return head, tail


def beruang():
    fur = textured('bulu_beruang', '#8a5a33', 'fur', 0.85, seed=21, sheen=0.4)
    muka = textured('moncong_beruang', '#e0b98a', 'fur', 0.8, seed=22)
    head = [skull(fur, (1.12, 1, 0.94))]
    for s in (-1, 1):
        head.append(ball(at_head(s * 0.22, 0.0, 0.17), 0.08, fur, (1, 0.6, 1), seg=14))
        head.append(ball(at_head(s * 0.22, -0.035, 0.17), 0.048, muka, (1, 0.4, 1), seg=10))
    head.append(ball(at_head(0, -0.2, -0.07), 0.12, muka, (1.2, 0.85, 0.8), seg=18))
    head.append(ball(at_head(0, -0.3, -0.03), 0.04, HIDUNG, (1.3, 0.8, 0.85), seg=12))
    head += eyes(z=0.05, gap=0.11) + blush()
    return head, [tail_ball(fur, 0.06)]


def bebek():
    fur = textured('bulu_bebek', '#ffd23f', 'fur', 0.7, seed=31, sheen=0.5)
    head = [skull(fur, (1.04, 1, 1.0))]
    head.append(ball(at_head(0, -0.26, -0.06), 0.11, PARUH, (1.25, 0.9, 0.32), seg=18))
    head.append(ball(at_head(0, -0.25, -0.1), 0.095, PARUH, (1.15, 0.85, 0.22), seg=16))
    for i in range(3):
        head += limb(at_head(0, -0.05, 0.2), at_head((i - 1) * 0.05, -0.1, 0.33), 0.018, fur, 0.006, verts=6, caps=False)
    head += eyes(z=0.07, gap=0.1) + blush(z=0.0)
    tail = [cyl((0, 0.27, 0.32), 0.08, 0.12, fur, rot=(math.radians(-60), 0, 0), verts=8, r2=0.01, b=0.01)]
    return head, tail


def kodok():
    fur = textured('kulit_kodok', '#6cc24a', 'skin', 0.45, seed=41)
    perut = textured('perut_kodok', '#d9f0a3', 'skin', 0.5, seed=42)
    head = [skull(fur, (1.18, 1, 0.82))]
    for s in (-1, 1):
        head.append(ball(at_head(s * 0.12, -0.08, 0.17), 0.09, fur, seg=16))
        head.append(ball(at_head(s * 0.12, -0.15, 0.18), 0.055, MATA, (0.9, 0.6, 1.05), seg=14))
        head.append(ball(at_head(s * 0.12 + 0.015, -0.19, 0.205), 0.017, KILAU, seg=8))
        head.append(ball(at_head(s * 0.1, -0.21, 0.24), 0.05, fur, (1.2, 0.5, 0.35), seg=10))  # kelopak
    head.append(ball(at_head(0, -0.14, -0.1), 0.15, perut, (1.3, 0.7, 0.5), seg=18))
    head.append(tube([tuple(at_head(-0.15, -0.24, -0.02)), tuple(at_head(0, -0.285, -0.06)), tuple(at_head(0.15, -0.24, -0.02))], 0.01, HIDUNG, res=1, steps=6))
    head += blush(z=-0.03, gap=0.2)
    return head, []


def panda():
    fur = textured('bulu_panda', '#fbfaf6', 'fur', 0.85, seed=51, sheen=0.4)
    hitam = textured('bulu_panda_hitam', '#23232a', 'fur', 0.8, seed=52, sheen=0.3)
    head = [skull(fur, (1.12, 1, 0.94))]
    for s in (-1, 1):
        head.append(ball(at_head(s * 0.22, 0.0, 0.17), 0.08, hitam, (1, 0.6, 1), seg=14))
        head.append(ball(at_head(s * 0.105, -0.215, 0.035), 0.075, hitam, (0.9, 0.5, 1.2), seg=14, rot=(0, math.radians(s * -25), 0)))
    head.append(ball(at_head(0, -0.2, -0.07), 0.11, fur, (1.2, 0.85, 0.8), seg=18))
    head.append(ball(at_head(0, -0.3, -0.035), 0.035, HIDUNG, (1.3, 0.8, 0.85), seg=12))
    head += eyes(y=-0.265, z=0.04, gap=0.11, r=0.04) + blush()
    return head, [tail_ball(hitam, 0.055)]


def rubah():
    fur = textured('bulu_rubah', '#e8662a', 'fur', 0.8, seed=61, sheen=0.4)
    putih = textured('bulu_rubah_putih', '#fff3e4', 'fur', 0.8, seed=62)
    head = [skull(fur, (1.1, 1, 0.92))]
    for s in (-1, 1):
        head += ear_tri(fur, putih, s * 0.19, s * 26, h=0.21, w=0.1)
        head.append(ball(at_head(s * 0.12, -0.17, -0.08), 0.1, putih, (1.1, 0.8, 0.7), seg=14))
    head.append(cyl(tuple(at_head(0, -0.27, -0.06)), 0.08, 0.16, putih, rot=(math.radians(90), 0, 0), verts=14, r2=0.03, b=0.02))
    head.append(ball(at_head(0, -0.36, -0.055), 0.03, HIDUNG, (1.2, 0.8, 0.8), seg=10))
    head += eyes(z=0.05, gap=0.11) + blush(z=-0.02)
    tail = [ball((0.02, 0.33, 0.3), 0.11, fur, (0.85, 1.6, 0.85), seg=16, rot=(math.radians(-35), 0, 0)), ball((0.03, 0.46, 0.4), 0.065, putih, (0.9, 1.1, 0.9), seg=12)]
    return head, tail


def kelinci():
    fur = textured('bulu_kelinci', '#e6cfb4', 'fur', 0.85, seed=71, sheen=0.5)
    head = [skull(fur, (1.06, 1, 0.98))]
    for s in (-1, 1):
        e = at_head(s * 0.15, 0.06, 0.2)
        rot = (math.radians(-14), math.radians(s * 28), 0)
        head.append(ball(e + Vector((s * 0.09, 0, 0.17)), 0.07, fur, (0.75, 0.45, 2.6), seg=14, rot=rot))
        head.append(ball(e + Vector((s * 0.095, -0.028, 0.17)), 0.045, PINK, (0.7, 0.3, 2.3), seg=10, rot=rot))
        head.append(ball(at_head(s * 0.05, -0.23, -0.07), 0.06, fur, (1.1, 0.8, 0.8), seg=12))
    head.append(ball(at_head(0, -0.28, -0.03), 0.025, PINK, (1.3, 0.8, 0.8), seg=10))
    head.append(cube(tuple(at_head(0, -0.265, -0.13)), (0.05, 0.015, 0.045), GIGI, b=0.005))
    head += eyes(z=0.05, gap=0.11) + blush()
    return head, [tail_ball(fur, 0.075)]


def ayam():
    fur = textured('bulu_ayam', '#fff3d6', 'fur', 0.8, seed=81, sheen=0.5)
    head = [skull(fur, (1.02, 1, 1.02))]
    for i in range(3):
        head.append(ball(at_head(0, -0.2 + i * 0.045, 0.2 + i * 0.02), 0.045, JENGGER, (0.45, 0.9, 1.1), seg=12))
    head.append(cyl(tuple(at_head(0, -0.29, -0.03)), 0.07, 0.1, PARUH, rot=(math.radians(90), 0, 0), verts=4, r2=0.005, b=0.01))
    head.append(ball(at_head(0, -0.25, -0.12), 0.04, JENGGER, (0.7, 0.6, 1.3), seg=10))
    head += eyes(z=0.05, gap=0.1) + blush()
    tail = [cyl((s * 0.05, 0.27, 0.36), 0.05, 0.14, fur, rot=(math.radians(-55), math.radians(s * 20), 0), verts=6, r2=0.01, b=0.01) for s in (-1, 0, 1)]
    return head, tail


BUILD = {'kucing': kucing, 'beruang': beruang, 'bebek': bebek, 'kodok': kodok, 'panda': panda, 'rubah': rubah, 'kelinci': kelinci, 'ayam': ayam}


def build_animal(name):
    head, tail = BUILD[name]()
    parts = to('head', head, HEAD)
    if tail:
        parts += to('body', tail, (0, 0.3, 0.3))
    return join(parts, f'hewan_{name}')


# ---------- tulang ----------
BONES = [
    ('root', (0, 0, 0), (0, 0, 0.1), None),
    ('body', (0, 0, 0.13), (0, 0, 0.6), 'root'),
    ('head', (0, 0, 0.62), (0, 0, 1.0), 'body'),
    ('hand_L', (0.31, -0.05, 0.36), (0.31, -0.05, 0.46), 'body'),
    ('hand_R', (-0.31, -0.05, 0.36), (-0.31, -0.05, 0.46), 'body'),
    ('foot_L', (0.11, 0, 0.08), (0.11, -0.12, 0.08), 'root'),
    ('foot_R', (-0.11, 0, 0.08), (-0.11, -0.12, 0.08), 'root'),
]
BODY_BONES = ['root', 'body', 'head', 'foot_L', 'foot_R']
HAND_BONES = ['hand_L', 'hand_R']


def build_rig():
    data = bpy.data.armatures.new('rig')
    arm = bpy.data.objects.new('rig', data)
    scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, a, b, par in BONES:
        e = data.edit_bones.new(name)
        e.head, e.tail = a, b
        if par:
            e.parent = data.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def skin(o, arm):
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE')
    m.object = arm


# ---------- animasi ----------
# Pose per tulang dalam ruang armature: r = putaran derajat (rx positif = condong ke depan untuk tulang tegak),
# l = geser meter, s = skala (sumbu armature). Karakter menghadap -Y.
def key(arm, frame, pose, bones):
    for name in bones:
        pb = arm.pose.bones[name]
        pb.rotation_mode = 'QUATERNION'
        e = pose.get(name, {})
        B = pb.bone.matrix_local.to_3x3()
        R = Euler(tuple(math.radians(v) for v in e.get('r', (0, 0, 0)))).to_matrix()
        pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
        pb.location = B.inverted() @ Vector(e.get('l', (0, 0, 0)))
        sa = e.get('s', (1, 1, 1))
        # sumbu lokal tulang i searah sumbu armature terbesar kolom i
        pb.scale = tuple(sa[max(range(3), key=lambda k: abs(B[k][i]))] for i in range(3))
        pb.keyframe_insert('rotation_quaternion', frame=frame)
        pb.keyframe_insert('location', frame=frame)
        pb.keyframe_insert('scale', frame=frame)


def action(arm, name, bones, frames):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for f, pose in frames:
        key(arm, f, pose, bones)
    return act


def P(**bones):
    return {k: v for k, v in bones.items()}


ALL = BODY_BONES + HAND_BONES


def animate(arm):
    # --- lapis badan ---
    action(arm, 'idle', BODY_BONES, [
        (0, P()),
        (24, P(body={'s': (1.02, 1.02, 0.97)}, head={'r': (-3, 0, 2)})),
        (48, P()),
    ])
    st = {'L': {'l': (0, -0.09, 0.06), 'r': (-25, 0, 0)}, 'R': {'l': (0, 0.07, 0)}}
    a = P(root={'l': (0, 0, 0)}, body={'r': (6, 0, 5)}, foot_L=st['L'], foot_R=st['R'])
    mid = P(root={'l': (0, 0, 0.035)}, body={'r': (6, 0, 0), 's': (0.97, 0.97, 1.04)})
    b = P(root={'l': (0, 0, 0)}, body={'r': (6, 0, -5)}, foot_R=st['L'], foot_L=st['R'])
    action(arm, 'walk', BODY_BONES, [(0, a), (4, mid), (7, b), (11, mid), (14, a)])
    da = P(body={'r': (20, 0, 4), 's': (0.95, 0.95, 1.06)}, head={'r': (-10, 0, 0)}, foot_L={'l': (0, -0.12, 0.08), 'r': (-35, 0, 0)}, foot_R={'l': (0, 0.1, 0.02)})
    db = P(body={'r': (20, 0, -4), 's': (0.95, 0.95, 1.06)}, head={'r': (-10, 0, 0)}, foot_R={'l': (0, -0.12, 0.08), 'r': (-35, 0, 0)}, foot_L={'l': (0, 0.1, 0.02)})
    action(arm, 'dash', BODY_BONES, [(0, da), (4, db), (8, da)])
    # --- lapis tangan ---
    action(arm, 'h_idle', HAND_BONES, [(0, P()), (24, P(hand_L={'l': (0, 0, 0.015)}, hand_R={'l': (0, 0, 0.015)})), (48, P())])
    action(arm, 'h_walk', HAND_BONES, [
        (0, P(hand_L={'l': (0, 0.09, 0.02)}, hand_R={'l': (0, -0.09, 0.03)})),
        (7, P(hand_L={'l': (0, -0.09, 0.03)}, hand_R={'l': (0, 0.09, 0.02)})),
        (14, P(hand_L={'l': (0, 0.09, 0.02)}, hand_R={'l': (0, -0.09, 0.03)})),
    ])
    carry = P(hand_L={'l': (-0.14, -0.27, 0.1), 'r': (0, 0, 20)}, hand_R={'l': (0.14, -0.27, 0.1), 'r': (0, 0, -20)})
    carry2 = P(hand_L={'l': (-0.14, -0.27, 0.12), 'r': (0, 0, 20)}, hand_R={'l': (0.14, -0.27, 0.12), 'r': (0, 0, -20)})
    action(arm, 'h_carry', HAND_BONES, [(0, carry), (7, carry2), (14, carry)])
    hold = {'l': (-0.17, -0.3, 0.05), 'r': (0, 0, 15)}
    action(arm, 'h_chop', HAND_BONES, [
        (0, P(hand_L=hold, hand_R={'l': (0.2, -0.33, 0.2), 'r': (-30, 0, 0)})),
        (3, P(hand_L=hold, hand_R={'l': (0.2, -0.36, 0.03), 'r': (20, 0, 0)})),
        (8, P(hand_L=hold, hand_R={'l': (0.2, -0.33, 0.2), 'r': (-30, 0, 0)})),
    ])
    action(arm, 'h_wash', HAND_BONES, [
        (0, P(hand_L={'l': (-0.12, -0.32, 0.0)}, hand_R={'l': (0.12, -0.28, 0.0)})),
        (4, P(hand_L={'l': (-0.06, -0.35, -0.02)}, hand_R={'l': (0.18, -0.3, 0.02)})),
        (8, P(hand_L={'l': (-0.12, -0.28, 0.0)}, hand_R={'l': (0.12, -0.32, 0.0)})),
        (12, P(hand_L={'l': (-0.18, -0.3, 0.02)}, hand_R={'l': (0.06, -0.35, -0.02)})),
        (16, P(hand_L={'l': (-0.12, -0.32, 0.0)}, hand_R={'l': (0.12, -0.28, 0.0)})),
    ])
    spray = P(hand_L={'l': (-0.2, -0.36, 0.1)}, hand_R={'l': (0.2, -0.36, 0.1)})
    action(arm, 'h_spray', HAND_BONES, [(0, spray), (2, P(hand_L={'l': (-0.2, -0.38, 0.11)}, hand_R={'l': (0.2, -0.38, 0.11)})), (4, spray)])
    action(arm, 'h_throw', HAND_BONES, [
        (0, carry),
        (4, P(hand_L={'l': (-0.05, -0.1, 0.05)}, hand_R={'l': (0.05, 0.12, 0.25), 'r': (60, 0, 0)})),
        (8, P(hand_L={'l': (-0.05, -0.2, 0.0)}, hand_R={'l': (0.1, -0.42, 0.18), 'r': (-40, 0, 0)})),
        (16, P()),
    ])
    # --- klip penuh ---
    up = P(root={'l': (0, 0, 0.16)}, body={'s': (0.94, 0.94, 1.1)}, head={'r': (-12, 0, 0)}, hand_L={'l': (0.06, -0.05, 0.42)}, hand_R={'l': (-0.06, -0.05, 0.42)}, foot_L={'l': (0, 0, 0.04)}, foot_R={'l': (0, 0, 0.04)})
    down = P(root={'l': (0, 0, 0)}, body={'s': (1.08, 1.08, 0.9)}, hand_L={'l': (0.04, -0.05, 0.3)}, hand_R={'l': (-0.04, -0.05, 0.3)})
    action(arm, 'cheer', ALL, [(0, down), (6, up), (12, down)])
    sad = P(body={'r': (14, 0, 0), 's': (1.03, 1.03, 0.95)}, head={'r': (24, 0, 0)}, hand_L={'l': (-0.04, -0.06, -0.08)}, hand_R={'l': (0.04, -0.06, -0.08)})
    action(arm, 'sad', ALL, [(0, sad), (24, P(**{**sad, 'head': {'r': (22, 0, 12)}})), (48, P(**{**sad, 'head': {'r': (22, 0, -12)}})), (72, sad)])
    flail = P(body={'r': (-28, 0, 0)}, head={'r': (-15, 0, 0)}, root={'l': (0, 0, 0.08)}, foot_L={'l': (0, -0.18, 0.18), 'r': (-60, 0, 0)}, foot_R={'l': (0, -0.14, 0.12), 'r': (-50, 0, 0)},
              hand_L={'l': (0.1, 0.05, 0.38)}, hand_R={'l': (-0.1, 0.1, 0.3)})
    flail2 = P(**{**flail, 'hand_L': {'l': (0.12, 0.1, 0.28)}, 'hand_R': {'l': (-0.12, 0.05, 0.4)}})
    action(arm, 'slip', ALL, [(0, flail), (4, flail2), (8, flail)])
    arm.animation_data.action = None


def main():
    GLB_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    arm = build_rig()
    body, celemek, topi = build_body()
    for o in (body, celemek, topi):
        skin(o, arm)
    heads = [build_animal(n) for n in ANIMALS]
    for o in (body, *heads):
        merge_plain(o)
    for o in heads:
        skin(o, arm)
    animate(arm)
    tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
    print('SEGITIGA badan', tri(body), 'kepala', {o.name: tri(o) for o in heads})
    bpy.ops.object.select_all(action='DESELECT')
    for o in (arm, body, celemek, topi, *heads):
        o.select_set(True)
    path = (GLB_DIR / 'koki.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_materials='EXPORT',
                              export_image_format='WEBP', export_image_quality=85)
    print('GLB', path, path.stat().st_size // 1024, 'KB')
    bpy.ops.wm.save_as_mainfile(filepath=str((OUT_DIR / 'koki.blend').resolve()))


if __name__ == '__main__':
    main()
