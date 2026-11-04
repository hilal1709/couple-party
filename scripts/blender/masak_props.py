# Barang yang dipegang koki di Dapur Kacau: bahan per tahap olahan, lapisan burger, piring, alat pemadam.
# Satu GLB, satu objek bernama per barang (titik asal di tengah alas), dipakai src/games/masak/render/props.ts.
# Jalankan: blender --background --python scripts/blender/masak_props.py -- brand/illustrations/masak src/assets/masak/models
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petak_lib import Map, bpy, noise, scene  # noqa: E402
from kart_lib import GLB_DIR  # noqa: E402

import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

m = Map('props', 9)
rng = np.random.default_rng(4)
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def pola(warna, seed, cells=10, amp=0.35, size=256):
    r = np.random.default_rng(seed)
    n = noise(size, r, cells)
    return np.clip(np.array(warna, dtype=np.float32)[None, None] * (1 - amp + n[..., None] * amp * 2), 0, 1)


def roti_tex(seed):
    """kulit roti: cokelat keemasan, lebih gelap di puncak, bintik wijen"""
    t = pola((0.85, 0.52, 0.2), seed, 6, 0.18, 512)
    y = np.linspace(0, 1, 512)[:, None, None]
    t = t * (0.8 + 0.3 * y)
    r = np.random.default_rng(seed + 7)
    for _ in range(140):
        cy, cx = r.integers(40, 300), r.integers(0, 512)
        t[cy:cy + 5, cx:cx + 3] = (0.98, 0.93, 0.8)
    return np.clip(t, 0, 1)


def daging_tex(color, seed, char=0.0):
    t = pola(color, seed, 48, 0.32, 256)
    if char:
        # garis panggangan
        y = np.arange(256)[:, None]
        t = t * (1 - char * ((y % 48) < 8)[..., None])
    return np.clip(t, 0, 1)


MAT = {
    'roti': m.image('roti', roti_tex(1), 0.5),
    'roti_dalam': m.image('roti_dalam', pola((0.97, 0.86, 0.62), 2, 30, 0.12), 0.85),
    'daging_raw': m.image('daging_mentah', daging_tex((0.8, 0.25, 0.25), 3), 0.55),
    'daging_cooked': m.image('daging_matang', daging_tex((0.42, 0.22, 0.11), 4, 0.45), 0.42),
    'daging_burnt': m.image('daging_gosong', daging_tex((0.09, 0.07, 0.06), 5, 0.3), 0.75),
    'selada': m.image('selada', pola((0.42, 0.78, 0.28), 6, 22, 0.3), 0.5),
    'selada_tua': m.image('selada_tua', pola((0.22, 0.55, 0.18), 7, 22, 0.3), 0.5),
    'tomat': m.image('tomat', pola((0.86, 0.14, 0.09), 8, 16, 0.1), 0.15),
    'tomat_dalam': m.image('tomat_dalam', pola((0.95, 0.34, 0.22), 9, 30, 0.2), 0.3),
    'keju': m.image('keju', np.clip(pola((1.0, 0.78, 0.2), 10, 14, 0.08) * (0.78 + (noise(256, rng, 18) > 0.38)[..., None] * 0.26), 0, 1), 0.38),
    'tangkai': m.flat('tangkai', '#3d8a2f', 0.6),
    'keramik': m.flat('keramik', '#fbfaf6', 0.12),
    'pinggir': m.flat('pinggir_piring', '#ff37a6', 0.2),
    'kotor': m.image('noda_piring', np.clip(np.where((noise(256, rng, 8) > 0.55)[..., None], np.array((0.62, 0.45, 0.28)), np.array((0.98, 0.97, 0.94))), 0, 1), 0.3),
}

made = []


def prop(name, build):
    """jalankan `build`, gabungkan semua bagiannya jadi satu objek bernama `name`"""
    keep = m.parts
    m.parts = []
    build()
    parts, m.parts = m.parts, keep
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(parts) > 1:
        bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    zs = [v.co.z for v in o.data.vertices]
    o.data.transform(Matrix.Translation((0, 0, -min(zs))))
    while len(o.data.uv_layers) > 1:
        o.data.uv_layers.remove(o.data.uv_layers[-1])
    bpy.ops.object.shade_smooth_by_angle(angle=0.9)
    o.location = (len(made) * 0.8, 0, 0)
    made.append(o)
    return o


def lumpy(o, amount, scale=18, seed=0):
    """geser titik menurut derau supaya permukaan organik, bukan primitif"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for v in bm.verts:
        c = v.co
        n = math.sin(c.x * scale + seed) * math.sin(c.y * scale * 1.1 + seed * 1.7) * math.sin(c.z * scale * 0.9 + seed * 0.6)
        v.co = c + v.normal * n * amount
    bm.to_mesh(o.data)
    bm.free()


def ball(loc, r, mat, scale=(1, 1, 1), rot=0.0, segs=24, bump=0.0, seed=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=segs // 2, radius=r, location=(0, 0, 0))
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    if bump:
        lumpy(o, bump, seed=seed)
    m._keep(o, mat)
    for p in o.data.polygons:
        p.use_smooth = True
    o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z')
    return o


def disc(loc, r, h, mat, segs=32, bump=0.0, seed=0, top_mat=None, r2=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=r, depth=h, location=(0, 0, 0))
    o = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(h * 0.4, r * 0.25), segments=3, profile=0.6, affect='EDGES')
    if r2 is not None:
        for v in bm.verts:
            if v.co.z > 0:
                v.co.x *= r2 / r
                v.co.y *= r2 / r
    bm.to_mesh(o.data)
    bm.free()
    if bump:
        lumpy(o, bump, seed=seed)
    m._keep(o, mat)
    for p in o.data.polygons:
        p.use_smooth = True
    o.location = loc
    return o


def bun_top(z=0.0):
    o = ball((0, 0, z), 0.2, MAT['roti'], (1, 1, 0.62), bump=0.004, seed=1)
    # potong separuh bawah
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    disc((0, 0, z + 0.006), 0.198, 0.012, MAT['roti_dalam'], segs=40)


def lettuce_layer(z=0.0, r=0.23):
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=r, fill_type='NGON', location=(0, 0, 0))
    o = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    for v in bm.verts:
        a = math.atan2(v.co.y, v.co.x)
        d = v.co.length / r
        v.co.z = math.sin(a * 9) * 0.018 * d ** 2 + math.sin(a * 23) * 0.006 * d
        v.co.x *= 1 + math.sin(a * 7) * 0.08 * d
        v.co.y *= 1 + math.sin(a * 7) * 0.08 * d
    bm.to_mesh(o.data)
    bm.free()
    sol = o.modifiers.new('tebal', 'SOLIDIFY')
    sol.thickness = 0.008
    bpy.ops.object.modifier_apply(modifier='tebal')
    m._keep(o, MAT['selada'])
    o.location = (0, 0, z)


# ---------- bahan utuh ----------
prop('roti_raw', lambda: (disc((0, 0, 0.025), 0.19, 0.05, MAT['roti'], r2=0.18), bun_top(0.05)))
prop('roti_atas', lambda: bun_top(0.0))
prop('roti_bawah', lambda: disc((0, 0, 0.02), 0.19, 0.04, MAT['roti'], top_mat=MAT['roti_dalam'], r2=0.185))
for s in ('raw', 'cooked', 'burnt'):
    prop(f'daging_{s}', lambda s=s: disc((0, 0, 0.03), 0.175 if s == 'raw' else 0.165, 0.05 if s == 'raw' else 0.06, MAT[f'daging_{s}'], segs=36, bump=0.006, seed=3))


def tomato():
    ball((0, 0, 0.1), 0.11, MAT['tomat'], (1, 1, 0.86), bump=0.003, seed=2)
    for i in range(5):
        a = i * 1.256
        ball((math.cos(a) * 0.03, math.sin(a) * 0.03, 0.19), 0.025, MAT['tangkai'], (1.6, 0.4, 0.2), rot=a)


def tomato_slices(n=3, spread=0.09):
    for i in range(n):
        a = i * 2.1
        disc((math.cos(a) * spread * (i > 0), math.sin(a) * spread * (i > 0), 0.012 + i * 0.004), 0.085, 0.018, MAT['tomat_dalam'], segs=28)


def lettuce_head():
    for j in range(5):
        a = j * 1.3
        ball((math.cos(a) * 0.03, math.sin(a) * 0.03, 0.1 + j * 0.008), 0.13 - j * 0.012, MAT['selada' if j % 2 else 'selada_tua'], (1, 0.92, 0.78), rot=a, bump=0.012, seed=j)


def lettuce_shred():
    for j in range(9):
        a = j * 2.4
        r = 0.04 + (j % 3) * 0.04
        ball((math.cos(a) * r, math.sin(a) * r, 0.02 + (j % 2) * 0.01), 0.05, MAT['selada'], (1.4, 0.5, 0.25), rot=a, segs=12, bump=0.004, seed=j)


def cheese_block():
    m.box((0, 0, 0.05), (0.24, 0.17, 0.1), MAT['keju'], bevel=0.012)


def cheese_slices():
    for i in range(3):
        m.box((i * 0.02, -i * 0.015, 0.006 + i * 0.011), (0.2, 0.2, 0.01), MAT['keju'], rot=i * 0.35, bevel=0.003)


prop('tomat_raw', tomato)
prop('tomat_cut', tomato_slices)
prop('tomat_lapis', lambda: tomato_slices(3, 0.075))
prop('selada_raw', lettuce_head)
prop('selada_cut', lettuce_shred)
prop('selada_lapis', lambda: lettuce_layer(0.0))
prop('keju_raw', cheese_block)
prop('keju_cut', cheese_slices)
prop('keju_lapis', lambda: m.box((0, 0, 0.005), (0.25, 0.25, 0.01), MAT['keju'], rot=0.78, bevel=0.003))
# gosong umum untuk sayur & keju
prop('arang', lambda: [ball((math.cos(i * 2.1) * 0.06, math.sin(i * 2.1) * 0.06, 0.03), 0.06, MAT['daging_burnt'], (1.3, 1, 0.5), segs=12, bump=0.01, seed=i) for i in range(4)])


# ---------- Tahap 3: bahan pizza, sushi, ramen, taco ----------
def lathe(prof, mat, steps=48):
    me = bpy.data.meshes.new('bubut')
    verts = [(x, 0, z) for x, z in prof]
    me.from_pydata(verts, [(i, i + 1) for i in range(len(verts) - 1)], [])
    o = bpy.data.objects.new('bubut', me)
    scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    sc = o.modifiers.new('bubut', 'SCREW')
    sc.steps = steps
    sc.render_steps = steps
    sc.use_merge_vertices = True
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.modifier_apply(modifier='bubut')
    m._keep(o, mat)
    for f in o.data.polygons:
        f.use_smooth = True
    return o


def tex_pola(name, color, seed, cells=20, amp=0.2, rough=0.5):
    return m.image(name, pola(color, seed, cells, amp), rough)


def kerak(seed):
    """pinggiran pizza: keemasan dengan bintik gosong"""
    t = pola((0.86, 0.6, 0.3), seed, 18, 0.22, 256)
    spots = (noise(256, np.random.default_rng(seed), 30) > 0.72)[..., None]
    return np.clip(np.where(spots, t * 0.55, t), 0, 1)


MAT.update({
    'adonan': tex_pola('adonan', (0.96, 0.9, 0.76), 20, 40, 0.06, 0.8),
    'kerak': m.image('kerak_pizza', kerak(21), 0.6),
    'saus': tex_pola('saus_tomat', (0.72, 0.12, 0.06), 22, 30, 0.18, 0.3),
    'keju_leleh': tex_pola('keju_leleh', (1.0, 0.86, 0.45), 23, 14, 0.12, 0.35),
    'jamur': tex_pola('jamur', (0.78, 0.66, 0.52), 24, 24, 0.15, 0.6),
    'jamur_dalam': tex_pola('jamur_dalam', (0.95, 0.9, 0.82), 25, 30, 0.08, 0.7),
    'nasi': tex_pola('nasi', (0.98, 0.97, 0.94), 26, 90, 0.08, 0.7),
    'karung_beras': tex_pola('karung_beras', (0.84, 0.75, 0.56), 27, 70, 0.15, 0.95),
    'salmon': m.image('salmon', np.clip(pola((0.98, 0.5, 0.33), 28, 16, 0.08) * (0.9 + (np.sin(np.linspace(0, 60, 256))[None, :, None] > 0.6) * 0.18), 0, 1), 0.35),
    'nori': tex_pola('nori', (0.07, 0.12, 0.08), 29, 50, 0.3, 0.5),
    'timun': tex_pola('timun', (0.2, 0.5, 0.18), 30, 30, 0.2, 0.35),
    'timun_dalam': tex_pola('timun_dalam', (0.75, 0.9, 0.55), 31, 30, 0.1, 0.4),
    'mie': tex_pola('mie', (0.98, 0.85, 0.5), 32, 60, 0.12, 0.45),
    'telur': tex_pola('kulit_telur', (0.93, 0.85, 0.74), 33, 20, 0.06, 0.4),
    'putih_telur': tex_pola('putih_telur', (0.98, 0.97, 0.94), 34, 10, 0.03, 0.2),
    'kuning_telur': tex_pola('kuning_telur', (1.0, 0.62, 0.1), 35, 10, 0.05, 0.25),
    'bawang': tex_pola('daun_bawang', (0.32, 0.68, 0.24), 36, 20, 0.15, 0.45),
    'bawang_putih': tex_pola('pangkal_bawang', (0.93, 0.95, 0.85), 37, 20, 0.1, 0.5),
    'tortilla': tex_pola('tortilla', (0.95, 0.86, 0.62), 38, 40, 0.1, 0.75),
    'tortilla_bakar': m.image('tortilla_bakar', kerak(39), 0.7),
    'kuah': m.flat('kuah_ramen', '#b86a2c', 0.08, 0.0),
    'mangkuk': m.flat('mangkuk', '#d8322c', 0.15),
    'mangkuk_dalam': m.flat('mangkuk_dalam', '#f4efe6', 0.12),
})


def dough_ball():
    ball((0, 0, 0.08), 0.13, MAT['adonan'], (1, 1, 0.7), bump=0.008, seed=4)


def dough_flat():
    disc((0, 0, 0.012), 0.24, 0.024, MAT['adonan'], segs=48, bump=0.002, seed=5)


def pizza_base(burnt=False):
    disc((0, 0, 0.014), 0.25, 0.028, MAT['daging_burnt' if burnt else 'kerak'], segs=56, r2=0.24)
    if not burnt:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.235, minor_radius=0.022, major_segments=56, minor_segments=10, location=(0, 0, 0.03))
        o = bpy.context.object
        lumpy(o, 0.004, 40)
        m._keep(o, MAT['kerak'])


def mushroom():
    for i in range(3):
        a = i * 2.1
        x, y = math.cos(a) * 0.06, math.sin(a) * 0.06
        m.cyl((x, y, 0.03), 0.022, 0.06, MAT['jamur_dalam'], verts=12)
        ball((x, y, 0.07), 0.055, MAT['jamur'], (1, 1, 0.6), segs=16, bump=0.004, seed=i)


def mushroom_slices(spread=0.1, n=5):
    for i in range(n):
        a = i * 2.4
        r = spread * (0.4 + (i % 3) * 0.3)
        m.box((math.cos(a) * r, math.sin(a) * r, 0.006), (0.06, 0.012, 0.05), MAT['jamur_dalam'], rot=a, bevel=0.004)


def rice_sack():
    """bahan nasi mentah = beras dalam mangkuk kayu kecil"""
    lathe([(0, 0), (0.1, 0), (0.15, 0.05), (0.16, 0.09), (0.15, 0.09), (0.13, 0.06), (0, 0.05)], MAT['karung_beras'])
    ball((0, 0, 0.07), 0.13, MAT['nasi'], (1, 1, 0.25), segs=24, bump=0.004, seed=6)


def rice_mound():
    ball((0, 0, 0.05), 0.12, MAT['nasi'], (1.1, 0.9, 0.6), segs=24, bump=0.01, seed=7)


def fish_fillet():
    m.box((0, 0, 0.03), (0.28, 0.14, 0.06), MAT['salmon'], rot=0.2, bevel=0.025)


def fish_slices():
    for i in range(4):
        m.box((-0.09 + i * 0.06, 0, 0.012 + i * 0.002), (0.05, 0.12, 0.022), MAT['salmon'], rot=0.15, bevel=0.008)


def nori_sheet():
    for i in range(3):
        m.box((i * 0.01, i * 0.008, 0.003 + i * 0.004), (0.2, 0.18, 0.004), MAT['nori'], rot=i * 0.1, bevel=0.001)


def cucumber():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.04, depth=0.26, location=(0, 0, 0.04), rotation=(0, math.pi / 2, 0.3))
    o = bpy.context.object
    lumpy(o, 0.003, 30)
    m._keep(o, MAT['timun'])


def cucumber_slices():
    for i in range(5):
        a = i * 1.9
        disc((math.cos(a) * 0.07 * (i > 0), math.sin(a) * 0.07 * (i > 0), 0.008 + i * 0.002), 0.04, 0.014, MAT['timun_dalam'], segs=20)


def noodle_block():
    m.box((0, 0, 0.035), (0.2, 0.15, 0.07), MAT['mie'], bevel=0.02)
    lumpy(m.parts[-1], 0.006, 60)


def noodle_swirl(z=0.0, r=0.14):
    """mie matang: tumpukan untaian melingkar"""
    for j in range(6):
        bpy.ops.mesh.primitive_torus_add(major_radius=r * (0.4 + j * 0.11), minor_radius=0.012, major_segments=40, minor_segments=6, location=(0, 0, z + 0.015 + (j % 3) * 0.008))
        o = bpy.context.object
        lumpy(o, 0.006, 25, seed=j)
        m._keep(o, MAT['mie'])


def egg():
    ball((0, 0, 0.06), 0.055, MAT['telur'], (1, 1, 1.25), segs=24)


def egg_halves():
    for i, x in enumerate((-0.05, 0.05)):
        ball((x, 0, 0.0), 0.05, MAT['putih_telur'], (1, 1.25, 0.8), segs=20)
        ball((x, 0, 0.035), 0.028, MAT['kuning_telur'], (1, 1, 0.5), segs=16)


def scallion():
    for i in range(3):
        a = i * 0.3 - 0.3
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.014, depth=0.3, location=(0, i * 0.03 - 0.03, 0.015), rotation=(0, math.pi / 2, a))
        m._keep(bpy.context.object, MAT['bawang'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.016, depth=0.07, location=(-0.17 * math.cos(a), i * 0.03 - 0.03 - 0.17 * math.sin(a), 0.015), rotation=(0, math.pi / 2, a))
        m._keep(bpy.context.object, MAT['bawang_putih'])


def scallion_rings(spread=0.09):
    for i in range(10):
        a = i * 2.3
        r = spread * (0.3 + (i % 4) * 0.22)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.012, minor_radius=0.004, major_segments=10, minor_segments=4, location=(math.cos(a) * r, math.sin(a) * r, 0.006))
        m._keep(bpy.context.object, MAT['bawang'])


def tortilla(toasted=False):
    disc((0, 0, 0.008), 0.2, 0.012, MAT['tortilla_bakar' if toasted else 'tortilla'], segs=40, bump=0.002, seed=8)


def taco_shell():
    """tortilla terlipat setengah lingkaran, terbuka ke atas"""
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.16, depth=0.12, location=(0, 0, 0.16), rotation=(math.pi / 2, 0, 0))
    o = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y > 0.0 or abs(f.normal.z) > 0.9], context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    sol = o.modifiers.new('tebal', 'SOLIDIFY')
    sol.thickness = 0.01
    bpy.ops.object.modifier_apply(modifier='tebal')
    m._keep(o, MAT['tortilla_bakar'])


def bowl():
    lathe([(0, 0), (0.12, 0), (0.14, 0.02), (0.24, 0.13), (0.26, 0.16), (0.245, 0.165), (0.225, 0.13), (0.12, 0.035), (0, 0.03)], MAT['mangkuk'])
    lathe([(0, 0.032), (0.12, 0.037), (0.222, 0.128), (0.243, 0.16), (0.24, 0.16)], MAT['mangkuk_dalam'])


prop('adonan_raw', dough_ball)
prop('adonan_cut', dough_flat)
prop('adonan_baked', pizza_base)
prop('pizza_saus', lambda: disc((0, 0, 0.004), 0.205, 0.006, MAT['saus'], segs=48))
prop('pizza_keju', lambda: disc((0, 0, 0.006), 0.19, 0.01, MAT['keju_leleh'], segs=48, bump=0.004, seed=9))
prop('pizza_jamur', lambda: mushroom_slices(0.16, 9))
prop('pizza_tomat', lambda: tomato_slices(5, 0.12))
prop('jamur_raw', mushroom)
prop('jamur_cut', mushroom_slices)
prop('nasi_raw', rice_sack)
prop('nasi_cooked', rice_mound)
prop('ikan_raw', fish_fillet)
prop('ikan_cut', fish_slices)
prop('nori_raw', nori_sheet)
prop('timun_raw', cucumber)
prop('timun_cut', cucumber_slices)
prop('mie_raw', noodle_block)
prop('mie_cooked', noodle_swirl)
prop('telur_raw', egg)
prop('telur_cooked', egg_halves)
prop('bawang_raw', scallion)
prop('bawang_cut', scallion_rings)
prop('tortilla_raw', tortilla)
prop('tortilla_cooked', lambda: tortilla(True))
prop('taco_cangkang', taco_shell)
prop('mangkuk', bowl)
prop('kuah', lambda: disc((0, 0, 0.0), 0.215, 0.01, MAT['kuah'], segs=48))


def maki(filling):
    """enam potong maki: nori di luar, nasi, isi di tengah"""
    for i in range(6):
        a = i * math.pi / 3
        x, y = math.cos(a) * 0.1, math.sin(a) * 0.1
        m.cyl((x, y, 0.03), 0.045, 0.06, MAT['nori'], verts=20)
        m.cyl((x, y, 0.061), 0.038, 0.004, MAT['nasi'], verts=20)
        m.cyl((x, y, 0.064), 0.014, 0.004, MAT[filling], verts=12)


def nigiri():
    for i, x in enumerate((-0.08, 0.08)):
        ball((x, 0, 0.03), 0.06, MAT['nasi'], (1.3, 0.8, 0.55), segs=16, bump=0.005, seed=i)
        m.box((x, 0, 0.065), (0.17, 0.09, 0.02), MAT['salmon'], bevel=0.008)


prop('maki_ikan', lambda: maki('salmon'))
prop('maki_timun', lambda: maki('timun'))
prop('nigiri', nigiri)


# ---------- Tahap 4: pancake, nasi goreng, sate ----------
MAT.update({
    'adonan_cair': tex_pola('adonan_cair', (0.98, 0.9, 0.7), 40, 30, 0.05, 0.25),
    'pancake': m.image('pancake', np.clip(pola((0.86, 0.58, 0.28), 41, 20, 0.15) * (0.85 + (noise(256, np.random.default_rng(41), 40) > 0.6)[..., None] * 0.2), 0, 1), 0.55),
    'stroberi': tex_pola('stroberi', (0.86, 0.1, 0.16), 42, 26, 0.1, 0.25),
    'stroberi_dalam': tex_pola('stroberi_dalam', (0.98, 0.55, 0.55), 43, 26, 0.12, 0.35),
    'madu': m.flat('madu', '#e8a317', 0.1),
    'toples': m.flat('toples', '#f4efe8', 0.15),
    'pisang_kulit': tex_pola('pisang_kulit', (0.98, 0.84, 0.22), 44, 30, 0.1, 0.45),
    'pisang_dalam': tex_pola('pisang_dalam', (0.98, 0.94, 0.78), 45, 30, 0.06, 0.5),
    'nasgor': m.image('nasi_goreng', np.clip(pola((0.78, 0.52, 0.28), 46, 90, 0.18) * (0.85 + (noise(256, np.random.default_rng(46), 50) > 0.7)[..., None] * 0.3), 0, 1), 0.6),
    'udang': tex_pola('udang', (0.72, 0.62, 0.6), 47, 30, 0.12, 0.35),
    'udang_masak': tex_pola('udang_masak', (1.0, 0.45, 0.2), 48, 30, 0.12, 0.35),
    'ayam': tex_pola('ayam', (0.95, 0.75, 0.7), 49, 30, 0.1, 0.5),
    'ayam_bakar': m.image('ayam_bakar', kerak(50), 0.55),
    'tusuk': m.flat('tusuk_sate', '#c8a36a', 0.7),
    'kacang': tex_pola('saus_kacang', (0.55, 0.3, 0.12), 51, 50, 0.15, 0.4),
    'daun_pisang': tex_pola('daun_pisang', (0.25, 0.55, 0.2), 52, 20, 0.15, 0.5),
    'lontong': tex_pola('lontong', (0.92, 0.95, 0.85), 53, 60, 0.06, 0.7),
})


def batter_bowl():
    lathe([(0, 0), (0.1, 0), (0.15, 0.06), (0.16, 0.1), (0.15, 0.1), (0.13, 0.07), (0, 0.06)], MAT['toples'])
    disc((0, 0, 0.075), 0.13, 0.01, MAT['adonan_cair'], segs=32)


def pancake_stack(n=1):
    for i in range(n):
        disc((0.004 * i, -0.003 * i, 0.012 + i * 0.026), 0.15, 0.024, MAT['pancake'], segs=40, bump=0.002, seed=i)


def strawberry():
    for i in range(3):
        a = i * 2.1
        ball((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.05), 0.045, MAT['stroberi'], (1, 1, 1.2), segs=16, bump=0.003, seed=i)
        ball((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.1), 0.02, MAT['tangkai'], (1.5, 1.5, 0.3), segs=8)


def strawberry_halves(spread=0.08, n=5):
    for i in range(n):
        a = i * 2.3
        ball((math.cos(a) * spread, math.sin(a) * spread, 0.012), 0.032, MAT['stroberi_dalam'], (1, 1.2, 0.4), segs=14, rot=a)


def honey_jar():
    lathe([(0, 0), (0.07, 0), (0.08, 0.02), (0.08, 0.12), (0.06, 0.14), (0.06, 0.16), (0, 0.16)], MAT['toples'])
    m.cyl((0, 0, 0.07), 0.074, 0.1, MAT['madu'], verts=24)


def banana():
    for i in range(3):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.025, major_segments=24, minor_segments=8, location=(0, i * 0.035 - 0.035, 0.03))
        o = bpy.context.object
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -0.04], context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
        m._keep(o, MAT['pisang_kulit'])


def banana_slices(spread=0.08, n=6):
    for i in range(n):
        a = i * 2.2
        disc((math.cos(a) * spread, math.sin(a) * spread, 0.008), 0.028, 0.012, MAT['pisang_dalam'], segs=16)


def shrimp(cooked):
    mat = MAT['udang_masak' if cooked else 'udang']
    for i in range(3):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.04, minor_radius=0.016, major_segments=16, minor_segments=8, location=(i * 0.07 - 0.07, 0, 0.018), rotation=(0, 0, i))
        o = bpy.context.object
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x < -0.03 and v.co.y > 0], context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
        m._keep(o, mat)


def fried_rice():
    ball((0, 0, 0.04), 0.15, MAT['nasgor'], (1.1, 0.95, 0.5), segs=28, bump=0.01, seed=11)


def chicken_chunk():
    for i in range(3):
        a = i * 2.1
        m.box((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.03), (0.08, 0.07, 0.06), MAT['ayam'], rot=a, bevel=0.02)


def skewers(mat):
    for i in range(3):
        y = (i - 1) * 0.06
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.005, depth=0.34, location=(0, y, 0.025), rotation=(0, math.pi / 2, 0))
        m._keep(bpy.context.object, MAT['tusuk'])
        for j in range(4):
            m.box((-0.08 + j * 0.05, y, 0.025), (0.04, 0.035, 0.035), MAT[mat], rot=j * 0.4, bevel=0.012)


def peanut_bowl():
    lathe([(0, 0), (0.06, 0), (0.09, 0.03), (0.095, 0.05), (0.088, 0.05), (0.07, 0.03), (0, 0.025)], MAT['toples'])
    disc((0, 0, 0.042), 0.08, 0.01, MAT['kacang'], segs=24)


def lontong_whole():
    for i in range(2):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.04, depth=0.24, location=(0, i * 0.09 - 0.045, 0.04), rotation=(0, math.pi / 2, 0))
        m._keep(bpy.context.object, MAT['daun_pisang'])


def lontong_slices(spread=0.07, n=4):
    for i in range(n):
        a = i * 1.7
        disc((math.cos(a) * spread, math.sin(a) * spread, 0.015), 0.036, 0.03, MAT['lontong'], segs=16)


prop('pancake_raw', batter_bowl)
prop('pancake_cooked', lambda: pancake_stack(1))
prop('pancake_tumpuk', lambda: pancake_stack(3))
prop('stroberi_raw', strawberry)
prop('stroberi_cut', strawberry_halves)
prop('madu_raw', honey_jar)
prop('madu_siram', lambda: disc((0, 0, 0.002), 0.1, 0.006, MAT['madu'], segs=24, bump=0.003, seed=3))
prop('pisang_raw', banana)
prop('pisang_cut', banana_slices)
prop('beras_raw', rice_sack)
prop('beras_cooked', fried_rice)
prop('udang_raw', lambda: shrimp(False))
prop('udang_cooked', lambda: shrimp(True))
prop('ayam_raw', chicken_chunk)
prop('ayam_cut', lambda: skewers('ayam'))
prop('ayam_cooked', lambda: skewers('ayam_bakar'))
prop('kacang_raw', peanut_bowl)
prop('lontong_raw', lontong_whole)
prop('lontong_cut', lontong_slices)


# ---------- piring ----------
def plate(dirty=False):
    prof = [(0, 0), (0.2, 0), (0.24, 0.015), (0.3, 0.035), (0.31, 0.045), (0.295, 0.047), (0.23, 0.025), (0.0, 0.022)]
    me = bpy.data.meshes.new('piring')
    verts = [(x, 0, z) for x, z in prof]
    me.from_pydata(verts, [(i, i + 1) for i in range(len(verts) - 1)], [])
    o = bpy.data.objects.new('piring', me)
    scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    sc = o.modifiers.new('bubut', 'SCREW')
    sc.steps = 48
    sc.render_steps = 48
    sc.use_merge_vertices = True
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.modifier_apply(modifier='bubut')
    m._keep(o, MAT['kotor' if dirty else 'keramik'])
    for p in o.data.polygons:
        p.use_smooth = True
    # garis pinggir merah muda
    bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.006, major_segments=48, minor_segments=6, location=(0, 0, 0.044))
    m._keep(bpy.context.object, MAT['pinggir'])


prop('piring', plate)
prop('piring_kotor', lambda: plate(True))


def chef_hat():
    """topi koki: pita tegak + mahkota mengembang berlipit, kain putih bertekstur"""
    kain = MAT['topi']
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.16, depth=0.12, location=(0, 0, 0.06))
    o = bpy.context.object
    m._keep(o, kain)
    for p in o.data.polygons:
        p.use_smooth = True
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=0.2, location=(0, 0, 0))
    c = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(c.data)
    for v in bm.verts:
        a = math.atan2(v.co.y, v.co.x)
        # lipatan vertikal & puncak rata sedikit
        k = 1 + math.cos(a * 8) * 0.06 * max(0.0, v.co.z / 0.2 + 0.3)
        v.co.x *= k
        v.co.y *= k
        v.co.z = v.co.z * 0.72 + 0.2
    bm.to_mesh(c.data)
    bm.free()
    m._keep(c, kain)
    for p in c.data.polygons:
        p.use_smooth = True




def banana_peel():
    """kulit pisang: empat kelopak kuning melengkung terbuka dari pangkal cokelat"""
    for i in range(4):
        a = i * math.pi / 2 + 0.3
        ball((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.012), 0.11, MAT['pisang'], (1.25, 0.42, 0.12), rot=a, segs=16, bump=0.004, seed=i)
    ball((0, 0, 0.04), 0.045, MAT['pisang'], (1, 1, 1.2), segs=12)
    m.cyl((0, 0, 0.09), 0.012, 0.05, MAT['pangkal'], verts=8)


def flour_sack():
    """karung tepung kecil dengan ikatan di atas"""
    ball((0, 0, 0.16), 0.16, MAT['karung'], (1, 0.85, 1.05), bump=0.01, seed=5)
    m.cyl((0, 0, 0.32), 0.05, 0.05, MAT['karung'], verts=12)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.055, minor_radius=0.012, major_segments=20, minor_segments=6, location=(0, 0, 0.3))
    m._keep(bpy.context.object, MAT['tali'])


MAT['pisang'] = m.image('kulit_pisang', np.clip(pola((0.98, 0.84, 0.22), 12, 30, 0.12) * (0.85 + (noise(256, rng, 40) > 0.75)[..., None] * -0.4), 0, 1), 0.45)
MAT['pangkal'] = m.flat('pangkal_pisang', '#4a3218', 0.7)
MAT['karung'] = m.image('karung', np.clip(pola((0.93, 0.89, 0.8), 13, 80, 0.12), 0, 1), 0.95)
MAT['tali'] = m.flat('tali_karung', '#b0452c', 0.8)
prop('kulit_pisang', banana_peel)
prop('karung_tepung', flour_sack)
MAT['topi'] = m.image('kain_topi', np.clip(pola((0.97, 0.96, 0.94), 11, 60, 0.05), 0, 1), 0.9)
prop('topi_koki', chef_hat)
# alat pemadam scan Poly Haven, setinggi 55 cm
prop('pemadam', lambda: m.asset('korean_fire_extinguisher_01', (0, 0, 0), height=0.55, tris=2500, tex=512))

GLB_DIR.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for o in made:
    o.select_set(True)
path = (GLB_DIR / 'props.glb').resolve()
bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_image_format='WEBP', export_image_quality=80, export_materials='EXPORT')
print('GLB', path.name, path.stat().st_size // 1024, 'KB', [o.name for o in made])
