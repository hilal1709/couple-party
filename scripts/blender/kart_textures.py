# Tekstur Kart Kacau dari Poly Haven (CC0): JPG 1K → WebP.
# Sumber (unduh manual lewat api.polyhaven.com, simpan di luar repo): D:/dev/asset-src/polyhaven/tex
# Jalankan: blender --background --python scripts/blender/kart_textures.py -- [folder-sumber] [folder-tujuan] [nama,nama]
import sys
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = Path(argv[0] if argv else 'D:/dev/asset-src/polyhaven')
OUT = Path(argv[1] if len(argv) > 1 else 'src/assets/kart/tex')
ONLY = set(argv[2].split(',')) if len(argv) > 2 else None
OUT.mkdir(parents=True, exist_ok=True)

# nama di app → id Poly Haven
TEX = {
    'aspal': 'asphalt_track',
    'pasir': 'coast_sand_01',
    'rumput': 'sparse_grass',
    'salju': 'snow_02',
    'kerikil': 'gravel_floor',
    'batu': 'rock_05',
    'papan': 'brown_planks_05',
    'cobble': 'cobblestone_floor_01',
    'pasir-basah': 'damp_beach_sand_02',
    'papan-tua': 'weathered_planks',
    'aspal-kota': 'asphalt_02',
    'paving': 'rectangular_paving',
    'beton': 'concrete_floor_worn_001',
    'tanah': 'farm_soil',
    'batu-lumut': 'mossy_cobblestone',
    'hutan': 'forest_ground_04',
    'batu-merah': 'red_sandstone_pavement',
    'aspal-salju': 'asphalt_snow',
    'basal': 'volcanic_rock_tiles',
}


def save(img, path, fmt, size=None, quality=82):
    if size:
        img.scale(*size)
    s = bpy.context.scene.render.image_settings
    s.file_format = fmt
    if fmt == 'WEBP':
        s.quality = quality
        s.color_mode = 'RGB'
    img.save_render(str(path.resolve()))
    print('OK', path)


for name, pid in TEX.items():
    if ONLY and name not in ONLY:
        continue
    for kind, size, q in (('diff', 1024, 82), ('nor', 1024, 88), ('rough', 512, 70)):
        f = SRC / 'tex' / f'{pid}_{kind}.jpg'
        if not f.exists():
            print('HILANG', f)
            continue
        img = bpy.data.images.load(str(f))
        if kind != 'diff':
            img.colorspace_settings.name = 'Non-Color'
        save(img, OUT / f'{name}_{kind}.webp', 'WEBP', (size, size), q)
