"""Ekspor render Blender per game (brand/illustrations/<game>/*.png) ke WebP untuk app.

Jalankan:  python -I scripts/blender/export.py [snakes|draw|remi|domino|monopoly|ludo|spy|bom|emote]   (bawaan: snakes)
Sprite dipangkas ke tepi gambar (kecuali kepala ular: titik tengahnya = pangkal leher) lalu diperkecil.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
GAME = sys.argv[1] if len(sys.argv) > 1 else 'snakes'
SRC = ROOT / 'brand' / 'illustrations' / GAME
OUT = ROOT / 'src' / 'assets' / GAME


def size_for(name: str) -> int:
    if name.startswith(('tile-', 'snakes-', 'draw-', 'remi-', 'domino-', 'monopoly-', 'ludo-', 'spy-', 'bom-')):
        return 720
    if name.startswith(('mode-', 'landmark-', 'corner-', 'role-', 'mascot-', 'char-', 'kart-')) or name == 'bomb':
        return 240
    return 160


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for png in sorted(SRC.glob('*.png')):
        name = png.stem
        im = Image.open(png).convert('RGBA')
        if not name.startswith('snake-head'):
            box = im.getchannel('A').getbbox()
            if box:
                pad = max(4, round(max(box[2] - box[0], box[3] - box[1]) * 0.02))
                box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
                im = im.crop(box)
        im.thumbnail((size_for(name), size_for(name)), Image.LANCZOS)
        dest = OUT / f'{name}.webp'
        im.save(dest, 'WEBP', quality=88, method=6)
        meta = {
            'prompt': f'Origin: hand-modeled in Blender 5.2.2 (no generative AI). Source script scripts/blender/{GAME}.py, asset "{name}"; '
                      f'Eevee render with Freestyle ink lines, transparent background; exported by scripts/blender/export.py. '
                      f'Master PNG: brand/illustrations/{GAME}/{name}.png.\n',
            'createdAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
        }
        dest.with_suffix('.webp.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
        print(f'{dest.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}')


if __name__ == '__main__':
    main()
