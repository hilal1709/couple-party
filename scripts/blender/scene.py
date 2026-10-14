# Ilustrasi Couple Party, dimodel manual di Blender (bukan AI).
# Jalankan: blender --background --python scripts/blender/scene.py -- <varian> <output.png>
# varian: hero | win | lose | waiting
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['hero', 'out.png']
VARIANT, OUT = argv[0], argv[1]

# ---------- komposisi ----------
if VARIANT == 'hero':
    pedestal((0, 0, -0.18))
    mochi((-0.52, 0, 0.62), tilt=8)
    pip((0.48, 0.05, 0.78), tilt=-12)  # bersandar ke Mochi
    stripe_cylinder((1.55, 0.25, 0.25))
    cone((-1.6, 0.3, 0.2), color='fern')
    squiggle_tube((0, -0.75, 0.05), 2.2, 'rose')
elif VARIANT == 'win':
    pedestal((0, 0, -0.18), w=1.6, d=1.1, h=0.35)
    pedestal((0, 0, 0.17), w=1.1, d=0.9, h=0.35)
    mochi((-0.18, 0, 0.95), tilt=6)
    pip((0.45, 0.05, 1.1), tilt=-14)
    crown((-0.18, 0, 1.58))
    squiggle_tube((0, -0.6, -0.05), 1.6, 'electric')
elif VARIANT == 'lose':
    pedestal((0, 0, -0.18), w=1.8, d=1.1, h=0.35)
    mochi((-0.35, 0, 0.55), tilt=-4, happy=False)
    # (air mata dihapus: mulut sedih sudah cukup)
    stripe_cylinder((0.8, 0.1, 0.45), 0.24, 0.9)
else:  # waiting
    pedestal((0, 0, -0.18), w=1.9, d=1.1, h=0.35)
    pip((-0.2, 0, 0.78), tilt=10)
    cone((0.75, 0.1, 0.35), r=0.28, h=0.7, color='rose')
    squiggle_tube((0.2, -0.6, 0.02), 1.4, 'fern')

# ---------- kamera, cahaya, render ----------
studio(4.4 if VARIANT == 'hero' else 3.4, (1200, 1000 if VARIANT == 'hero' else 1100))
render(OUT)
