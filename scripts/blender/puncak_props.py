# Prop alam Puncak Berdua dari paket CC0 (itch.io), dipakai ulang dari folder sumber Kart:
#   D:/dev/asset-src/quaternius-megakit  quaternius.itch.io/stylized-nature-megakit (Standard, CC0) — glTF bertekstur
#   D:/dev/asset-src/quaternius-nature   quaternius.itch.io/ultimate-nature-pack     (CC0)           — FBX warna polos
# Impor → samakan ukuran (tinggi/lebar meter) → decimate untuk HP → ekspor GLB (tekstur WebP ≤512 px)
# ke src/assets/puncak/props/<nama>.glb. Nama berakhiran -<n> = varian jenis yang sama.
# Jalankan: blender --background --python scripts/blender/puncak_props.py -- [folder-sumber] [folder-glb] [nama ...]
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = Path(argv[0] if argv else 'D:/dev/asset-src')
OUT = Path(argv[1] if len(argv) > 1 else 'src/assets/puncak/props')
ONLY = set(argv[2:])

MK = SRC / 'quaternius-megakit/x/glTF'
UN = SRC / 'quaternius-nature/x/FBX'

# nama → (file, ukuran meter, sumbu 'h' tinggi / 'w' lebar terbesar)
# Ukuran tinggi pohon = TREE_DIMS di sim/terrain.ts (dikalikan skala per pohon saat main).
PROPS = {
    'palem-1': (UN / 'PalmTree_1.fbx', 9, 'h'),
    'palem-2': (UN / 'PalmTree_2.fbx', 9, 'h'),
    'palem-3': (UN / 'PalmTree_3.fbx', 9, 'h'),
    'jati-1': (MK / 'CommonTree_1.gltf', 11, 'h'),
    'jati-2': (MK / 'CommonTree_3.gltf', 11, 'h'),
    'jati-3': (MK / 'CommonTree_5.gltf', 11, 'h'),
    'beringin-1': (MK / 'CommonTree_2.gltf', 16, 'h'),
    'beringin-2': (MK / 'CommonTree_4.gltf', 16, 'h'),
    'pinus-1': (MK / 'Pine_2.gltf', 12, 'h'),
    'pinus-2': (MK / 'Pine_4.gltf', 12, 'h'),
    'pinus-salju-1': (UN / 'PineTree_Snow_1.fbx', 12, 'h'),
    'pinus-salju-2': (UN / 'PineTree_Snow_3.fbx', 12, 'h'),
    'kering-1': (MK / 'DeadTree_1.gltf', 7, 'h'),
    'kering-2': (MK / 'DeadTree_3.gltf', 7, 'h'),
    'kering-salju-1': (UN / 'CommonTree_Dead_Snow_2.fbx', 7, 'h'),
    'semak-1': (MK / 'Bush_Common_Flowers.gltf', 1.3, 'h'),
    'semak-2': (MK / 'Bush_Common.gltf', 1.3, 'h'),
    'semak-salju-1': (UN / 'Bush_Snow_1.fbx', 1.3, 'h'),
    'teh-1': (UN / 'Bush_1.fbx', 1.1, 'h'),
    'teh-2': (UN / 'Bush_2.fbx', 1.1, 'h'),
    'batu-1': (MK / 'Rock_Medium_1.gltf', 2, 'w'),
    'batu-2': (MK / 'Rock_Medium_2.gltf', 2, 'w'),
    'batu-3': (MK / 'Rock_Medium_3.gltf', 2, 'w'),
    'batu-lumut-1': (UN / 'Rock_Moss_2.fbx', 2, 'w'),
    'batu-salju-1': (UN / 'Rock_Snow_3.fbx', 2, 'w'),
    # hiasan kecil tanpa tabrakan (ditabur di tanah datar)
    'hias-bunga-1': (MK / 'Flower_3_Group.gltf', 0.6, 'h'),
    'hias-bunga-2': (MK / 'Flower_4_Group.gltf', 0.6, 'h'),
    'hias-pakis-1': (MK / 'Fern_1.gltf', 1.0, 'h'),
    'hias-jamur-1': (MK / 'Mushroom_Common.gltf', 0.45, 'h'),
    'hias-jamur-2': (MK / 'Mushroom_Laetiporus.gltf', 0.4, 'w'),
    'hias-kerikil-1': (MK / 'Pebble_Round_2.gltf', 0.5, 'w'),
    'hias-kerikil-2': (MK / 'Pebble_Square_3.gltf', 0.45, 'w'),
    'hias-kayu-1': (UN / 'WoodLog_Moss.fbx', 2.2, 'w'),
    'hias-tunggul-1': (UN / 'TreeStump.fbx', 0.9, 'w'),
    'hias-kaktus-1': (UN / 'CactusFlower_1.fbx', 1.6, 'h'),
    'hias-kaktus-2': (UN / 'Cactus_3.fbx', 2.2, 'h'),
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
    if path.suffix.lower() == '.fbx':
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in list(bpy.context.scene.objects):
        if o.type not in ('MESH', 'EMPTY'):
            bpy.data.objects.remove(o, do_unlink=True)
    root = bpy.data.objects.new('root', None)
    bpy.context.scene.collection.objects.link(root)
    for o in bpy.context.scene.objects:
        if o.parent is None and o is not root:
            o.parent = root
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    dim = hi - lo
    k = size / (dim.z if axis == 'h' else max(dim.x, dim.y))
    root.scale = (k, k, k)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    # ratusan salinan per gunung: pohon ±1200 poligon, hiasan ±250
    cap = 250 if name.startswith('hias') else 1200
    total = sum(len(o.data.polygons) for o in meshes)
    if total > cap:
        for o in meshes:
            d = o.modifiers.new('dec', 'DECIMATE')
            d.ratio = max(0.1, cap / total)
    for img in bpy.data.images:
        if img.size[0] > 512:
            img.scale(512, max(1, int(512 * img.size[1] / img.size[0])))
    dest = (OUT / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', export_yup=True, export_apply=True, export_image_format='WEBP', export_materials='EXPORT')
    dg = bpy.context.evaluated_depsgraph_get()
    print('GLB', name, sum(len(o.evaluated_get(dg).data.polygons) for o in meshes), 'poligon', dest.stat().st_size // 1024, 'KB')


OUT.mkdir(parents=True, exist_ok=True)
for name, (path, size, axis) in PROPS.items():
    if ONLY and name not in ONLY:
        continue
    if not path.exists():
        print('HILANG', path)
        continue
    convert(name, path, size, axis)
