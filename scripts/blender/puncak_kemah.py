# Hiasan kemah & penanda Punggung Hijau (hanya tampilan, tanpa tabrakan) → src/assets/puncak/props/kemah-*.glb
#   tenda-1..3   tenda segitiga buatan sendiri (kain + tiang + tali), tiga warna
#   kayu         tumpukan kayu bakar dari WoodLog Quaternius Ultimate Nature (CC0)
#   peti         wooden_crate_01 Poly Haven (CC0), didecimate, tekstur 512 px
#   lentera      Lantern_01 Poly Haven (CC0)
#   papan        papan arah kayu buatan sendiri
#   tugu         tumpukan batu dari Pebble_Round Quaternius Stylized Nature MegaKit (CC0)
#   bendera      tali bendera warna-warni di antara dua tiang (warna per titik: satu material)
# Jalankan: blender --background --python scripts/blender/puncak_kemah.py -- [folder-sumber] [folder-glb] [nama ...]
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = Path(argv[0] if argv else 'D:/dev/asset-src')
OUT = Path(argv[1] if len(argv) > 1 else 'src/assets/puncak/props')
ONLY = set(argv[2:])
MK = SRC / 'quaternius-megakit/x/glTF'
UN = SRC / 'quaternius-nature/x/FBX'
PH = SRC / 'polyhaven/models'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, rough=0.85, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 2.0
    return m


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def obj_from_bm(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = False
    return o


def cylinder(name, r, h, material, loc=(0, 0, 0), rot=(0, 0, 0), verts=6):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    return o


def box(name, size, material, loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    o.data.materials.append(material)
    return o


def export(name):
    for o in bpy.context.scene.objects:
        o.select_set(o.type == 'MESH')
    for img in bpy.data.images:
        if img.size[0] > 512:
            img.scale(512, max(1, int(512 * img.size[1] / img.size[0])))
    dest = (OUT / f'kemah-{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', export_yup=True, export_apply=True, export_image_format='WEBP', export_materials='EXPORT')
    dg = bpy.context.evaluated_depsgraph_get()
    polys = sum(len(o.evaluated_get(dg).data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    print('GLB', name, polys, 'poligon', dest.stat().st_size // 1024, 'KB')


def tent(color):
    """tenda segitiga 2,3 × 1,7 × 1,3 m, pintu depan setengah terbuka, kain sedikit melendut"""
    reset()
    cloth = mat('kain', srgb(color), 0.9)
    floor = mat('alas', srgb('#4b4a3c'), 0.95)
    pole = mat('tiang', srgb('#3a3a3a'), 0.5)
    L, W, H = 2.3, 1.7, 1.3
    bm = bmesh.new()
    seg = 6
    rows = []
    # dua sisi atap: tiap sisi grid seg × 3, ditekuk ke dalam (melendut) di tengah bentang
    for side in (-1, 1):
        grid = []
        for i in range(seg + 1):
            y = -L / 2 + L * i / seg
            line = []
            for k in range(4):
                t = k / 3
                x = side * (W / 2) * (1 - t)
                z = H * t
                sag = 0.07 * math.sin(math.pi * i / seg) * math.sin(math.pi * t)
                line.append(bm.verts.new((x - side * sag, y, z - sag * 0.5)))
            grid.append(line)
        for i in range(seg):
            for k in range(3):
                a, b, c, d = grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]
                bm.faces.new((a, b, c, d) if side > 0 else (d, c, b, a))
        rows.append(grid)
    # dinding belakang segitiga
    back = [rows[0][0][0], rows[1][0][0], bm.verts.new((0, -L / 2, H))]
    bm.faces.new(back)
    # pintu depan: dua daun tergulung ke samping (segitiga kecil)
    for side in (-1, 1):
        p0 = bm.verts.new((side * W / 2, L / 2, 0))
        p1 = bm.verts.new((side * W * 0.18, L / 2 + 0.25, 0))
        p2 = bm.verts.new((0, L / 2, H))
        bm.faces.new((p0, p1, p2) if side > 0 else (p2, p1, p0))
    o = obj_from_bm('tenda', bm, cloth)
    sol = o.modifiers.new('tebal', 'SOLIDIFY')
    sol.thickness = 0.02
    box('alas', (W * 1.05, L * 1.02, 0.03), floor, loc=(0, 0, 0.015))
    for y in (-L / 2, L / 2):
        cylinder('tiang', 0.02, H + 0.15, pole, loc=(0, y, (H + 0.15) / 2), verts=5)
    # tali pancang dari ujung bubungan ke tanah
    for y, dy in ((-L / 2, -0.7), (L / 2, 0.7)):
        a = Vector((0, y, H + 0.1))
        b = Vector((0, y + dy, 0))
        mid = (a + b) / 2
        d = b - a
        o = cylinder('tali', 0.008, d.length, pole, loc=mid, verts=4)
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())


def import_any(path):
    if path.suffix.lower() == '.fbx':
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.context.selected_objects]
    for o in list(bpy.context.scene.objects):
        if o.type not in ('MESH', 'EMPTY'):
            bpy.data.objects.remove(o, do_unlink=True)
    return [o for o in new if o.name in bpy.context.scene.objects and o.type == 'MESH']


def fit(objs, size, axis='h'):
    """satukan ke satu induk, skala ke ukuran meter, alas di z=0 & pusat di sumbu"""
    root = bpy.data.objects.new('root', None)
    bpy.context.scene.collection.objects.link(root)
    for o in objs:
        top = o
        while top.parent:
            top = top.parent
        if top is not root:
            top.parent = root
    bpy.context.view_layer.update()

    def bounds():
        pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
        return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))

    lo, hi = bounds()
    dim = hi - lo
    k = size / (dim.z if axis == 'h' else max(dim.x, dim.y))
    root.scale = (k, k, k)
    bpy.context.view_layer.update()
    lo, hi = bounds()
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    return root


def decimate(objs, cap):
    total = sum(len(o.data.polygons) for o in objs)
    if total > cap:
        for o in objs:
            d = o.modifiers.new('dec', 'DECIMATE')
            d.ratio = max(0.05, cap / total)


def woodpile():
    reset()
    logs = []
    layout = [(-0.32, 0, 0.12), (0, 0, 0.12), (0.32, 0, 0.12), (-0.16, 0, 0.36), (0.16, 0, 0.36), (0, 0, 0.6)]
    for i, (x, y, z) in enumerate(layout):
        objs = import_any(UN / ('WoodLog_Moss.fbx' if i % 3 == 1 else 'WoodLog.fbx'))
        r = fit(objs, 1.3, 'w')
        r.location = (r.location.x + x, r.location.y + y, z - 0.12)
        r.rotation_euler = (0, 0, math.pi / 2 + (i * 0.37 % 0.3) - 0.15)
        logs += objs
    decimate(logs, 900)


def crate():
    reset()
    objs = import_any(PH / 'wooden_crate_01/wooden_crate_01.gltf')
    fit(objs, 0.7, 'w')
    decimate(objs, 300)


def lantern():
    reset()
    objs = import_any(PH / 'Lantern_01/Lantern_01.gltf')
    fit(objs, 0.42, 'h')
    decimate(objs, 600)
    # nyala hangat di kaca (dibaca adegan: material ber-emisi berkedip pelan)
    glow = mat('nyala', srgb('#ffcf7a'), 0.4, emit=srgb('#ffb347'))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.06, location=(0, 0, 0.17))
    bpy.context.active_object.data.materials.append(glow)


def signpost():
    reset()
    wood = mat('kayu', srgb('#8a6440'), 0.9)
    dark = mat('kayu-gelap', srgb('#5d4128'), 0.9)
    cylinder('tiang', 0.06, 1.9, dark, loc=(0, 0, 0.95), verts=6)
    # dua papan panah: ke depan-atas (jalur naik) dan sedikit ke samping
    for z, yaw, ln in ((1.55, 0.0, 0.9), (1.2, 0.5, 0.75)):
        bm = bmesh.new()
        w, t = 0.2, 0.04
        pts = [(-0.08, -w / 2), (ln - 0.18, -w / 2), (ln, 0), (ln - 0.18, w / 2), (-0.08, w / 2)]
        bot = [bm.verts.new((x, -t / 2, y)) for x, y in pts]
        top = [bm.verts.new((x, t / 2, y)) for x, y in pts]
        bm.faces.new(bot[::-1])
        bm.faces.new(top)
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            bm.faces.new((bot[i], bot[j], top[j], top[i]))
        o = obj_from_bm('panah', bm, wood)
        # panah menunjuk +y (maju) di Blender; diputar sedikit ke samping
        o.rotation_euler = (0, 0, math.pi / 2 + yaw)
        o.location = (0, 0, z)


def cairn():
    reset()
    stones = []
    rad = [0.42, 0.34, 0.28, 0.22, 0.16, 0.11]
    z = 0.0
    for i, r in enumerate(rad):
        objs = import_any(MK / f'Pebble_Round_{1 + i % 5}.gltf')
        root = fit(objs, r * 2, 'w')
        root.location = (root.location.x + (i % 2 - 0.5) * 0.05, root.location.y + ((i * 7) % 3 - 1) * 0.03, z)
        root.rotation_euler = (0, 0, i * 1.1)
        bpy.context.view_layer.update()
        pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
        z = max(p.z for p in pts) - r * 0.18
        stones += objs
    decimate(stones, 500)


def flags():
    """tali bendera 8 m di antara dua tiang 2,4 m; 14 bendera segitiga warna-warni (warna per titik)"""
    reset()
    pole = mat('tiang', srgb('#6b4b30'), 0.9)
    cloth = mat('bendera', (1, 1, 1), 0.85)
    span, hgt = 8.0, 2.4
    for x in (-span / 2, span / 2):
        cylinder('tiang', 0.05, hgt, pole, loc=(x, 0, hgt / 2), verts=6)
    bm = bmesh.new()
    col = bm.loops.layers.color.new('Col')
    colors = ['#d94a3c', '#e8b13a', '#3f8f5a', '#3b6fb6', '#f2efe6']
    n = 14
    rope = lambda u: (-span / 2 + span * u, 0, hgt - 0.05 - 0.55 * math.sin(math.pi * u))
    # tali: pita tipis
    pts = [rope(i / 20) for i in range(21)]
    for i in range(20):
        a, b = pts[i], pts[i + 1]
        v = [bm.verts.new((a[0], -0.006, a[2])), bm.verts.new((b[0], -0.006, b[2])), bm.verts.new((b[0], 0.006, b[2] - 0.012)), bm.verts.new((a[0], 0.006, a[2] - 0.012))]
        f = bm.faces.new(v)
        for lp in f.loops:
            lp[col] = (*srgb('#d8d0bc'), 1)
    for i in range(n):
        u0 = (i + 0.15) / n
        u1 = (i + 0.85) / n
        a, b = rope(u0), rope(u1)
        tip = ((a[0] + b[0]) / 2, 0.03, (a[2] + b[2]) / 2 - 0.34)
        c = srgb(colors[i % len(colors)])
        for side in (1, -1):
            vs = [bm.verts.new(a), bm.verts.new(b), bm.verts.new(tip)]
            f = bm.faces.new(vs if side > 0 else vs[::-1])
            for lp in f.loops:
                lp[col] = (*c, 1)
    o = obj_from_bm('bendera', bm, cloth)
    # glTF: warna per titik dikalikan warna dasar material
    o.data.color_attributes.active_color = o.data.color_attributes[0]


BUILD = {
    'tenda-1': lambda: tent('#e2683c'),
    'tenda-2': lambda: tent('#2f8f8a'),
    'tenda-3': lambda: tent('#e7b53c'),
    'kayu': woodpile,
    'peti': crate,
    'lentera': lantern,
    'papan': signpost,
    'tugu': cairn,
    'bendera': flags,
}

OUT.mkdir(parents=True, exist_ok=True)
for name, fn in BUILD.items():
    if ONLY and name not in ONLY:
        continue
    fn()
    export(name)
