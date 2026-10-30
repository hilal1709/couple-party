"""Satukan frame stiker emote (brand/illustrations/emote/frames) jadi WebP animasi di src/assets/emote.

Jalankan:  python -I scripts/blender/emote_anim.py
Semua frame satu stiker dipangkas ke kotak yang sama supaya gambarnya tidak melompat.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'brand' / 'illustrations' / 'emote' / 'frames'
OUT = ROOT / 'src' / 'assets' / 'emote'
SIZE = 160
FRAME_MS = 90


def union_box(frames):
    boxes = [f.getchannel('A').getbbox() for f in frames]
    boxes = [b for b in boxes if b]
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)


def main():
    names = sorted({p.stem.rsplit('-', 1)[0] for p in SRC.glob('*.png')})
    for name in names:
        paths = sorted(SRC.glob(f'{name}-*.png'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
        frames = [Image.open(p).convert('RGBA') for p in paths]
        box = union_box(frames)
        pad = 6
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(frames[0].width, box[2] + pad), min(frames[0].height, box[3] + pad))
        small = []
        for f in frames:
            im = f.crop(box)
            im.thumbnail((SIZE, SIZE), Image.LANCZOS)
            small.append(im)
        dest = OUT / f'{name}-anim.webp'
        small[0].save(dest, 'WEBP', save_all=True, append_images=small[1:], duration=FRAME_MS, loop=0, quality=80, method=6)
        meta = {
            'prompt': f'Origin: hand-modeled in Blender 5.2.2 (no generative AI). Source script scripts/blender/emote.py, asset "{name}"; '
                      f'{len(frames)} Eevee frames with Freestyle ink lines, assembled by scripts/blender/emote_anim.py.\n',
            'createdAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
        }
        dest.with_suffix('.webp.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
        print(f'{dest.relative_to(ROOT)}  {small[0].size[0]}x{small[0].size[1]}  {dest.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
