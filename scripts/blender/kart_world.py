# Landmark lintasan Kart Kacau, dimodel manual di Blender (bukan AI). Tahap 3: Pantai Kelapa.
# Mercusuar belang, dermaga kayu, perahu, pondok pantai beratap jerami, payung + handuk,
# rak papan selancar, burung camar, dan pelampung.
# Jalankan: blender --background --python scripts/blender/kart_world.py -- [folder-glb] [nama ...]
# Sumbu: depan = -Y Blender, atas = +Z. Ukuran dalam meter.
import math
import sys
from pathlib import Path

import bmesh
import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = Path(argv[0] if argv else 'src/assets/kart/models')
ONLY = set(argv[1:])


def srgb(hexs):
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (*[lin(int(hexs[i:i + 2], 16)) for i in (1, 3, 5)], 1.0)


_mats = {}


def pbr(color, rough=0.6, metal=0.0, emit=0.0):
    key = (color, rough, metal, emit)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(f'm{len(_mats)}')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = srgb(color)
        b.inputs['Emission Strength'].default_value = emit
    _mats[key] = m
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()


def last():
    return bpy.context.object


def finish(o, mat, smooth=True, bevel=0.0):
    o.data.materials.append(mat)
    if bevel:
        m = o.modifiers.new('bev', 'BEVEL')
        m.width = bevel
        m.segments = 2
        m.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def box(loc, size, mat, rot=(0, 0, 0), bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = last()
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, mat, False, bevel)


def cyl(loc, r, h, mat, rot=(0, 0, 0), verts=20, r2=None, bevel=0.02):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    return finish(last(), mat, True, bevel)


def ball(loc, r, mat, scale=(1, 1, 1), seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = last()
    o.scale = scale
    return finish(o, mat)


def torus(loc, R, r, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=24, minor_segments=10)
    return finish(last(), mat)


# ---------------------------------------------------------------------------

def mercusuar():
    """Mercusuar 28 m: menara meruncing belang merah-putih, balkon, ruang lampu kaca, kubah."""
    red = pbr('#ff3b5c', 0.45)
    white = pbr('#fff4fa', 0.5)
    stone = pbr('#b8b0a8', 0.9)
    box((0, 0, 1), (9, 9, 2), stone, bevel=0.3)
    segs = 7
    for k in range(segs):
        h = 20 / segs
        r0 = 3.4 - k * 0.28
        r1 = 3.4 - (k + 1) * 0.28
        cyl((0, 0, 2 + h * k + h / 2), r0, h, red if k % 2 == 0 else white, verts=28, r2=r1, bevel=0)
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        box((math.cos(a) * 2.6, math.sin(a) * 2.6, 6 + k * 3.5), (0.6, 0.15, 1.2), pbr('#2a4a6a', 0.2), rot=(0, 0, a + math.pi / 2))
    cyl((0, 0, 22.3), 2.9, 0.6, pbr('#2a2a34', 0.4, 0.5), verts=28)
    for k in range(16):
        a = k / 16 * math.tau
        cyl((math.cos(a) * 2.7, math.sin(a) * 2.7, 23.1), 0.06, 1.2, pbr('#2a2a34', 0.4, 0.5), verts=6)
    torus((0, 0, 23.7), 2.7, 0.07, pbr('#2a2a34', 0.4, 0.5))
    cyl((0, 0, 24.2), 1.6, 3, pbr('#bfe9ff', 0.05, 0.1), verts=16)
    ball((0, 0, 24.2), 0.9, pbr('#fff6c8', 0.1, emit=6))
    cyl((0, 0, 26.3), 2.0, 1.6, red, verts=16, r2=0.2)
    ball((0, 0, 27.3), 0.3, pbr('#ffcc1f', 0.3, 0.6))
    box((0, -3.45, 3.4), (1.4, 0.4, 2.6), pbr('#5a3a2a', 0.7))


def dermaga():
    """Dermaga kayu 44 m menjorok ke laut: papan, tiang, pagar tali, lampu."""
    plank = pbr('#b98a5a', 0.85)
    plank2 = pbr('#a07448', 0.85)
    post = pbr('#6a4a2a', 0.9)
    rope = pbr('#e8d4a8', 0.9)
    for k in range(55):
        box((0, -k * 0.8, 1.6), (4.4, 0.72, 0.18), plank if k % 3 else plank2, rot=(0, 0, (k % 5 - 2) * 0.004), bevel=0.02)
    for k in range(12):
        for s in (-1, 1):
            cyl((s * 2.1, -k * 4, 0.1), 0.22, 4.2, post, verts=10)
            if k < 11:
                bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=4, location=(s * 2.1, -k * 4 - 2, 2.6), rotation=(math.radians(90), 0, 0), vertices=6)
                finish(last(), rope)
    for k in (0, 5, 10):
        cyl((2.1, -k * 4, 3.4), 0.08, 1.6, post, verts=8)
        ball((2.1, -k * 4, 4.3), 0.25, pbr('#fff6c8', 0.2, emit=3))


def perahu():
    """Perahu nelayan kecil bercadik: lambung melengkung, garis warna, tiang & layar."""
    hull = pbr('#2f7bff', 0.5)
    stripe = pbr('#fff4fa', 0.5)
    wood = pbr('#b98a5a', 0.8)
    o = ball((0, 0, 0.6), 1.2, hull, (1, 3.4, 0.6), seg=24)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for v in [v for v in bm.verts if v.co.z > 0.35]:
        bm.verts.remove(v)
    bm.to_mesh(o.data)
    bm.free()
    o.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.08
    torus((0, 0, 0.82), 1.0, 0.07, stripe).scale = (1.15, 3.35, 1)
    box((0, 0, 0.55), (1.6, 5.5, 0.08), wood)
    for y in (-1.2, 1.2):
        box((0, y, 0.75), (2.3, 0.3, 0.12), wood)
    cyl((0, -0.6, 2.8), 0.08, 4.5, wood, verts=8)
    bm2 = bpy.data.meshes.new('layar')
    bmm = bmesh.new()
    a = bmm.verts.new((0, -0.5, 1.2))
    b = bmm.verts.new((0, -0.5, 4.8))
    c = bmm.verts.new((0, 1.6, 1.4))
    bmm.faces.new((a, b, c))
    bmm.to_mesh(bm2)
    bmm.free()
    sail = bpy.data.objects.new('layar', bm2)
    bpy.context.scene.collection.objects.link(sail)
    finish(sail, pbr('#ff37a6', 0.7), smooth=False)
    sail.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.03
    for s in (-1, 1):
        cyl((s * 2.4, 0, 0.5), 0.18, 4.5, pbr('#fff4fa', 0.5), rot=(math.radians(90), 0, 0), verts=10)
        box((s * 1.4, 0, 0.75), (2.0, 0.12, 0.1), wood)


def pondok():
    """Pondok pantai: panggung kayu, dinding anyaman, atap jerami rumbai, papan nama."""
    wood = pbr('#b98a5a', 0.85)
    dark = pbr('#6a4a2a', 0.9)
    thatch = pbr('#e2b66a', 0.95)
    weave = pbr('#d9b884', 0.9)
    for x in (-2.6, 2.6):
        for y in (-2.2, 2.2):
            cyl((x, y, 1.6), 0.18, 3.2, dark, verts=8)
    box((0, 0, 0.6), (6, 5, 0.25), wood)
    box((0, 1.4, 2.0), (5.4, 0.2, 2.6), weave)
    for s in (-1, 1):
        box((s * 2.6, 0.4, 2.0), (0.2, 2.2, 2.6), weave)
    cyl((0, 0, 4.4), 4.6, 2.4, thatch, verts=4, r2=0.2, bevel=0).rotation_euler = (0, 0, math.radians(45))
    for k in range(28):
        a = k / 28 * math.tau
        box((math.cos(a) * 3.05, math.sin(a) * 3.05, 3.05), (0.5, 0.15, 0.5), thatch, rot=(0.6 * math.sin(a), -0.6 * math.cos(a), a))
    box((0, -2.6, 3.3), (3, 0.12, 0.8), pbr('#ff37a6', 0.6))
    box((-1.6, -2.0, 1.4), (1.2, 0.8, 0.9), pbr('#13bfae', 0.6))


def payung():
    """Payung pantai belang + handuk + kursi lipat."""
    stripe = [pbr('#ff37a6', 0.6), pbr('#fff4fa', 0.6)]
    cyl((0, 0, 1.6), 0.06, 3.4, pbr('#fff4fa', 0.4, 0.3), verts=8)
    for k in range(8):
        a0 = k / 8 * math.tau
        bm = bpy.data.meshes.new('kain')
        b = bmesh.new()
        c = b.verts.new((0, 0, 3.5))
        p0 = b.verts.new((math.cos(a0) * 2.2, math.sin(a0) * 2.2, 2.7))
        p1 = b.verts.new((math.cos(a0 + math.tau / 8) * 2.2, math.sin(a0 + math.tau / 8) * 2.2, 2.7))
        b.faces.new((c, p0, p1))
        b.to_mesh(bm)
        b.free()
        o = bpy.data.objects.new('kain', bm)
        bpy.context.scene.collection.objects.link(o)
        finish(o, stripe[k % 2], smooth=False)
        o.modifiers.new('tebal', 'SOLIDIFY').thickness = 0.03
    box((1.6, -0.4, 0.03), (1.0, 2.0, 0.04), pbr('#ffcc1f', 0.8), bevel=0.01)
    box((1.6, -0.4, 0.05), (1.0, 0.25, 0.05), pbr('#2f7bff', 0.8), bevel=0.01)
    box((-1.4, 0.3, 0.5), (0.9, 1.6, 0.08), pbr('#13bfae', 0.6), rot=(math.radians(-20), 0, 0), bevel=0.01)


def selancar():
    """Rak kayu berisi 4 papan selancar warna-warni."""
    wood = pbr('#8f6438', 0.85)
    for x in (-2, 2):
        cyl((x, 0, 1.2), 0.1, 2.4, wood, verts=8)
    box((0, 0, 2.3), (4.4, 0.18, 0.18), wood)
    box((0, 0, 0.5), (4.4, 0.18, 0.18), wood)
    for k, c in enumerate(['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff']):
        b = ball((-1.4 + k * 0.95, 0.25, 1.4), 0.38, pbr(c, 0.3), (1, 0.12, 3.6), seg=16)
        b.rotation_euler = (math.radians(-12), 0, 0)
        box((-1.4 + k * 0.95, 0.3, 1.4), (0.05, 0.05, 2.4), pbr('#fff4fa', 0.4), bevel=0)


def camar():
    """Burung camar sederhana dengan sayap terbentang (berputar di langit lewat kode)."""
    white = pbr('#fff4fa', 0.6)
    ball((0, 0, 0), 0.35, white, (0.8, 1.6, 0.7))
    ball((0, -0.55, 0.15), 0.22, white)
    cyl((0, -0.85, 0.12), 0.07, 0.25, pbr('#ffcc1f', 0.4), rot=(math.radians(90), 0, 0), verts=8, r2=0.01)
    for s in (-1, 1):
        w = box((s * 0.95, 0, 0.12), (1.5, 0.5, 0.06), white, rot=(0, s * 0.25, 0), bevel=0.02)
        box((s * 1.6, 0.05, 0.28), (0.4, 0.45, 0.065), pbr('#3a3a44', 0.6), rot=(0, s * 0.25, 0), bevel=0.01)
        del w
    box((0, 0.6, 0), (0.4, 0.4, 0.05), white)


def pelampung():
    """Pelampung tanda batas: bola merah-putih dengan tiang lampu."""
    ball((0, 0, 0.4), 0.8, pbr('#ff3b5c', 0.4))
    torus((0, 0, 0.5), 0.78, 0.12, pbr('#fff4fa', 0.5))
    cyl((0, 0, 1.6), 0.06, 1.6, pbr('#2a2a34', 0.4, 0.6), verts=8)
    ball((0, 0, 2.5), 0.18, pbr('#ffcc1f', 0.2, emit=4))


MODELS = {
    'mercusuar': mercusuar,
    'dermaga': dermaga,
    'perahu': perahu,
    'pondok': pondok,
    'payung': payung,
    'selancar': selancar,
    'camar': camar,
    'pelampung': pelampung,
}

OUT.mkdir(parents=True, exist_ok=True)
for name, build in MODELS.items():
    if ONLY and name not in ONLY:
        continue
    reset()
    build()
    dest = (OUT / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT')
    print('GLB', dest)
