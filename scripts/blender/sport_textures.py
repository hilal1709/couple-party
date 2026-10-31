"""Tekstur PBR Sport Kacau dari Poly Haven (CC0): JPG 1K → WebP.

Sumber (unduh lewat api.polyhaven.com, simpan di luar repo): D:/dev/asset-src/polyhaven/tex-sport
Jalankan: python -I scripts/blender/sport_textures.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path('D:/dev/asset-src/polyhaven/tex-sport')
OUT = ROOT / 'src' / 'assets' / 'sport' / 'tex'

# nama di app → id Poly Haven
TEX = {
    'lapangan': 'concrete_floor_painted',
    'rumput': 'leafy_grass',
    'beton': 'concrete_wall_003',
    'logam': 'metal_plate',
    'kain': 'denim_fabric',
    'karpet': 'dirty_carpet',
    'kulit': 'fabric_leather_01',
    'kayu': 'wood_floor_worn',
    'laminasi': 'laminate_floor_02',
    'papan': 'brown_planks_07',
}
SIZE = {'diff': (1024, 82), 'nor': (1024, 85), 'rough': (512, 70)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, pid in TEX.items():
        for kind, (size, q) in SIZE.items():
            im = Image.open(SRC / f'{pid}_{kind}.jpg').convert('RGB').resize((size, size), Image.LANCZOS)
            im.save(OUT / f'{name}_{kind}.webp', 'WEBP', quality=q, method=6)
            print(name, kind)


if __name__ == '__main__':
    main()
