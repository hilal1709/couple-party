# Prop lintasan Kart Kacau dari paket CC0 Quaternius (itch.io): impor OBJ, samakan ukuran & arah,
# lalu ekspor GLB low-poly ke src/assets/kart/models/<nama>.glb (nama = nama prop di tracks.ts).
#
# Sumber (unduh manual, simpan di luar repo):
#   D:/dev/asset-src/quaternius-nature  "Ultimate Nature Pack by Quaternius.zip"  quaternius.itch.io/150-lowpoly-nature-models
#   D:/dev/asset-src/quaternius-farm    "Farm Buildings by Quaternius.zip"         quaternius.itch.io/lowpoly-farm-buildings
#   D:/dev/asset-src/quaternius-cars    "Realistic Car Pack - Nov 2018.zip"        quaternius.itch.io/lowpoly-cars
#   D:/dev/asset-src/quaternius-street  "Modular Street Pack by Quaternius.zip"    quaternius.itch.io/lowpoly-modular-street
# Semua CC0. Ekstrak tiap zip ke subfolder x/.
#
# Jalankan: blender --background --python scripts/blender/kart_props.py -- [folder-sumber] [folder-glb]
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = Path(argv[0] if argv else 'D:/dev/asset-src')
OUT = Path(argv[1] if len(argv) > 1 else 'src/assets/kart/models')

NATURE = SRC / 'quaternius-nature/x/OBJ'
FARM = SRC / 'quaternius-farm/x/OBJ'
CARS = SRC / 'quaternius-cars/x/Realistic Car Pack - Nov 2018/OBJ'
STREET = SRC / 'quaternius-street/x/OBJ'

# nama prop → (file OBJ, ukuran target meter, sumbu ukuran: 'h' tinggi / 'l' panjang)
PROPS = {
    'kelapa': (NATURE / 'PalmTree_1.obj', 13, 'h'),
    'pohon': (NATURE / 'CommonTree_1.obj', 11, 'h'),
    'semak': (NATURE / 'Bush_1.obj', 2.6, 'h'),
    'cemara': (NATURE / 'PineTree_Snow_1.obj', 13, 'h'),
    'batu': (NATURE / 'Rock_1.obj', 3.8, 'h'),
    'batu-es': (NATURE / 'Rock_Snow_3.obj', 4, 'h'),
    'kaktus': (NATURE / 'Cactus_1.obj', 6, 'h'),
    'padi': (NATURE / 'Wheat.obj', 2.2, 'h'),
    'kayu-tumbang': (NATURE / 'WoodLog_Moss.obj', 9, 'l'),
    'gubuk': (FARM / 'SmallBarn.obj', 9, 'h'),
    'kincir': (FARM / 'Windmill.obj', 16, 'h'),
    'mobil': (CARS / 'Taxi.obj', 5, 'l'),
    'mobil-2': (CARS / 'NormalCar1.obj', 5, 'l'),
    'lampu': (STREET / 'Streetlight_Single.obj', 8, 'h'),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_obj(path: Path):
    bpy.ops.wm.obj_import(filepath=str(path))
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def normalize(o, size, axis):
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    dim = hi - lo
    # benda memanjang: sumbu panjang ke Y (depan kart = -Y → +Z three.js)
    if axis == 'l' and dim.x > dim.y:
        o.rotation_euler = (0, 0, 1.5708)
        bpy.ops.object.transform_apply(rotation=True)
        return normalize(o, size, axis)
    k = size / (dim.z if axis == 'h' else max(dim.x, dim.y))
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        v.co = Vector(((p.x - (lo.x + hi.x) / 2) * k, (p.y - (lo.y + hi.y) / 2) * k, (p.z - lo.z) * k))
    o.matrix_world.identity()
    return o


OUT.mkdir(parents=True, exist_ok=True)
for name, (path, size, axis) in PROPS.items():
    if not path.exists():
        print('HILANG', path)
        continue
    reset()
    o = import_obj(path)
    normalize(o, size, axis)
    dest = (OUT / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', use_selection=False, export_yup=True, export_materials='EXPORT')
    print('GLB', dest, len(o.data.polygons), 'poligon')
