# Prop bertekstur Kart Kacau dari paket CC0 (itch.io): Quaternius "Stylized Nature MegaKit" & KayKit
# (Platformer, City Builder, Holiday Bits). Impor glTF → samakan ukuran → tekstur maks 512 px →
# ekspor GLB dengan tekstur WebP ke src/assets/kart/models/<nama>.glb (varian: <nama>-2, -3, …).
#
# Sumber (unduh manual, simpan di luar repo, ekstrak tiap zip ke subfolder x/):
#   D:/dev/asset-src/quaternius-megakit  quaternius.itch.io/stylized-nature-megakit  (Standard, CC0)
#   D:/dev/asset-src/kaykit-platformer   kaylousberg.itch.io/kaykit-platformer        (Free, CC0)
#   D:/dev/asset-src/kaykit-city         kaylousberg.itch.io/city-builder-bits        (Free, CC0)
#   D:/dev/asset-src/kaykit-holiday      kaylousberg.itch.io/holiday-bits             (Free, CC0)
# Jalankan: blender --background --python scripts/blender/kart_props_hd.py -- [folder-sumber] [folder-glb] [nama ...]
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = Path(argv[0] if argv else 'D:/dev/asset-src')
OUT = Path(argv[1] if len(argv) > 1 else 'src/assets/kart/models')
ONLY = set(argv[2:])

MK = SRC / 'quaternius-megakit/x/glTF'
PF = SRC / 'kaykit-platformer/x/KayKit_Platformer_Pack_1.0_FREE/Assets/gltf'
CT = SRC / 'kaykit-city/x/KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf'
HD = SRC / 'kaykit-holiday/x/KayKit_Holiday_Bits_1.0_FREE/Assets/gltf'

# nama → (file, ukuran meter, sumbu: 'h' tinggi / 'w' lebar terbesar / 'l' panjang ke depan)
PROPS = {
    # alam (MegaKit)
    'pohon': (MK / 'CommonTree_1.gltf', 12, 'h'),
    'pohon-2': (MK / 'CommonTree_3.gltf', 11, 'h'),
    'pohon-3': (MK / 'TwistedTree_2.gltf', 10, 'h'),
    'cemara-hijau': (MK / 'Pine_2.gltf', 14, 'h'),
    'semak': (MK / 'Bush_Common_Flowers.gltf', 2.4, 'h'),
    'semak-2': (MK / 'Bush_Common.gltf', 2.2, 'h'),
    'batu': (MK / 'Rock_Medium_1.gltf', 3.4, 'h'),
    'batu-2': (MK / 'Rock_Medium_2.gltf', 3.0, 'h'),
    'batu-3': (MK / 'Rock_Medium_3.gltf', 2.6, 'h'),
    'rumput-kecil': (MK / 'Grass_Common_Tall.gltf', 0.9, 'h'),
    'rumput-kecil-2': (MK / 'Grass_Wispy_Tall.gltf', 1.0, 'h'),
    'bunga': (MK / 'Flower_3_Group.gltf', 0.7, 'h'),
    'bunga-2': (MK / 'Flower_4_Group.gltf', 0.7, 'h'),
    'pakis': (MK / 'Fern_1.gltf', 1.1, 'h'),
    'kerikil-kecil': (MK / 'Pebble_Round_2.gltf', 0.45, 'w'),
    'kerikil-kecil-2': (MK / 'Pebble_Square_3.gltf', 0.4, 'w'),
    'jamur-merah': (MK / 'Mushroom_Common.gltf', 7, 'h'),
    'jamur-ungu': (MK / 'Mushroom_Laetiporus.gltf', 5, 'w'),
    # perlengkapan sirkuit (KayKit Platformer)
    'kit-arah-kiri': (PF / 'neutral/signage_arrows_left.gltf', 1.3, 'h'),
    'kit-arah-kanan': (PF / 'neutral/signage_arrows_right.gltf', 1.3, 'h'),
    'kit-bendera': (PF / 'red/flag_A_red.gltf', 2.2, 'h'),
    'kit-bendera-2': (PF / 'blue/flag_B_blue.gltf', 2.2, 'h'),
    'kit-bendera-3': (PF / 'yellow/flag_C_yellow.gltf', 2.2, 'h'),
    'kit-bendera-4': (PF / 'green/flag_A_green.gltf', 2.2, 'h'),
    'kerucut': (PF / 'red/cone_red.gltf', 1.4, 'h'),
    # kota (KayKit City Builder)
    'gedung': (CT / 'building_A.gltf', 26, 'h'),
    'gedung-2': (CT / 'building_C.gltf', 30, 'h'),
    'gedung-3': (CT / 'building_E.gltf', 22, 'h'),
    'gedung-4': (CT / 'building_G.gltf', 34, 'h'),
    'mobil': (CT / 'car_taxi.gltf', 5, 'l'),
    'mobil-2': (CT / 'car_sedan.gltf', 5, 'l'),
    'lampu': (CT / 'streetlight.gltf', 8, 'h'),
    # salju & permen (KayKit Holiday)
    'manusia-salju': (HD / 'snowman_A.gltf', 3.2, 'h'),
    'permen-tongkat': (HD / 'candycane_small.gltf', 6, 'h'),
    'kue': (HD / 'gingerbread_house_decorated.gltf', 7, 'h'),
    'donat': (HD / 'cookie.gltf', 4.5, 'w'),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def convert(name, path, size, axis):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    root = bpy.data.objects.new('root', None)
    bpy.context.scene.collection.objects.link(root)
    for o in bpy.context.scene.objects:
        if o.parent is None and o is not root:
            o.parent = root
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    dim = hi - lo
    if axis == 'l' and dim.x > dim.y:
        root.rotation_euler = (0, 0, 1.5708)
        bpy.context.view_layer.update()
        lo, hi = bounds(meshes)
        dim = hi - lo
    k = size / (dim.z if axis == 'h' else max(dim.x, dim.y))
    root.scale = (k, k, k)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    # batas poligon untuk HP: prop ±1500, detail kecil ±300 (ratusan salinan per lintasan)
    cap = 300 if name.startswith(('rumput', 'bunga', 'pakis', 'kerikil')) else 1500
    total = sum(len(o.data.polygons) for o in meshes)
    if total > cap:
        for o in meshes:
            d = o.modifiers.new('dec', 'DECIMATE')
            d.ratio = max(0.08, cap / total)
    # tekstur maks 512 px (HP)
    for img in bpy.data.images:
        if img.size[0] > 512:
            img.scale(512, max(1, int(512 * img.size[1] / img.size[0])))
    dest = (OUT / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', export_yup=True, export_apply=True, export_image_format='WEBP', export_materials='EXPORT')
    dg = bpy.context.evaluated_depsgraph_get()
    print('GLB', dest, sum(len(o.evaluated_get(dg).data.polygons) for o in meshes), 'poligon')


OUT.mkdir(parents=True, exist_ok=True)
for name, (path, size, axis) in PROPS.items():
    if ONLY and name not in ONLY:
        continue
    if not path.exists():
        print('HILANG', path)
        continue
    convert(name, path, size, axis)
