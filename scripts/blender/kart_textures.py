# Tekstur & langit Kart Kacau dari Poly Haven (CC0): JPG 1K → WebP, HDRI 2K → HDR 1K.
# Sumber (unduh manual lewat api.polyhaven.com, simpan di luar repo): D:/dev/asset-src/polyhaven/{tex,hdri}
# Jalankan: blender --background --python scripts/blender/kart_textures.py -- [folder-sumber] [folder-tujuan]
import sys
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = Path(argv[0] if argv else 'D:/dev/asset-src/polyhaven')
OUT = Path(argv[1] if len(argv) > 1 else 'src/assets/kart/tex')
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
}
HDRI = {'siang': 'kloofendal_43d_clear_puresky', 'senja': 'belfast_sunset_puresky', 'malam': 'kloppenheim_02_puresky'}


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
    for kind, size, q in (('diff', 1024, 82), ('nor', 1024, 88), ('rough', 512, 70)):
        f = SRC / 'tex' / f'{pid}_{kind}.jpg'
        if not f.exists():
            print('HILANG', f)
            continue
        img = bpy.data.images.load(str(f))
        if kind != 'diff':
            img.colorspace_settings.name = 'Non-Color'
        save(img, OUT / f'{name}_{kind}.webp', 'WEBP', (size, size), q)

for name, pid in HDRI.items():
    f = SRC / 'hdri' / f'{pid}_2k.hdr'
    img = bpy.data.images.load(str(f))
    save(img, OUT / f'langit-{name}.hdr', 'HDR', (1024, 512))
