# Ilustrasi menu Dapur Kacau: burger raksasa bertopi koki, pizza, maki, ramen, dan wajan menyala di atas panggung bulat.
# Barangnya diambil dari props.glb (masak_props.py) supaya tile sama persis dengan isi game. Dimodel di Blender, bukan AI.
# Jalankan: blender --background --python scripts/blender/masak.py -- brand/illustrations/masak src/assets/masak/models
# Lanjutkan dengan: python -I scripts/blender/export.py masak
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

PROPS = GLB_DIR / 'props.glb'


def load_props():
    bpy.ops.import_scene.gltf(filepath=str(PROPS.resolve()))
    out = {}
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            out[o.name] = o
            o.hide_render = True
    return out


def put(src, name, loc, scale=1.0, rot=0.0):
    o = src[name].copy()
    o.data = src[name].data.copy()
    bpy.context.scene.collection.objects.link(o)
    o.hide_render = False
    o.location = loc
    o.scale = (scale, scale, scale)
    o.rotation_euler = (0, 0, rot)
    return o


def scene_tile():
    clear()
    src = load_props()
    cyl((0, 0.2, 0.1), 2.15, 0.2, pbr('#ffcae9', 0.6), verts=64, b=0.02)
    # genangan saus di panggung
    for x, y, r, c in ((-1.2, -0.7, 0.45, '#ff37a6'), (1.3, -0.9, 0.38, '#5cf64a')):
        sphere((x, y, 0.21), r, pbr(c, 0.2), (1.35, 1, 0.06), seg=24, sub=False)
    # burger raksasa di tengah, diberi topi koki
    s = 5.0
    z = 0.2
    put(src, 'piring', (0, 0.25, z), s * 0.9)
    z += 0.03 * s
    for name, h in (('roti_bawah', 0.04), ('daging_cooked', 0.055), ('keju_lapis', 0.012), ('tomat_lapis', 0.02), ('selada_lapis', 0.02), ('roti_atas', 0.13)):
        put(src, name, (0, 0.25, z), s)
        z += h * s
    put(src, 'topi_koki', (0.05, 0.25, z - 0.06 * s), 3.2, 0.3)
    # hidangan lain mengelilingi
    put(src, 'piring', (-1.45, 0.75, 0.2), 2.4)
    put(src, 'adonan_baked', (-1.45, 0.75, 0.27), 2.4)
    put(src, 'pizza_saus', (-1.45, 0.75, 0.33), 2.4)
    put(src, 'pizza_keju', (-1.45, 0.75, 0.345), 2.4)
    put(src, 'pizza_tomat', (-1.45, 0.75, 0.36), 2.2)
    put(src, 'piring', (1.5, 0.6, 0.2), 2.2)
    put(src, 'maki_ikan', (1.5, 0.6, 0.27), 2.2)
    put(src, 'mangkuk', (1.0, -0.6, 0.2), 2.0)
    put(src, 'kuah', (1.0, -0.6, 0.42), 2.0)
    put(src, 'mie_cooked', (1.0, -0.6, 0.4), 1.9)
    put(src, 'telur_cooked', (1.05, -0.55, 0.47), 1.6)
    # wajan menyala: wajan dari cincin + lidah api bercahaya
    cyl((-1.0, -0.6, 0.32), 0.5, 0.16, pbr('#26282c', 0.35, 0.8), verts=40, r2=0.42, b=0.02)
    tube([(-1.5, -0.6, 0.4), (-2.1, -0.75, 0.55)], 0.05, pbr('#121212', 0.5))
    fire = pbr('#ff6b35', 0.4, emit=6.0)
    core = pbr('#ffcc1f', 0.4, emit=8.0)
    for i, (dx, dy, h) in enumerate(((0, 0, 0.9), (-0.22, 0.1, 0.65), (0.2, -0.08, 0.7), (0.05, 0.2, 0.55))):
        sphere((-1.0 + dx, -0.6 + dy, 0.45 + h / 2), 0.16, fire, (1, 1, h / 0.32), seg=16, sub=False)
        sphere((-1.0 + dx, -0.6 + dy, 0.42 + h / 3), 0.09, core, (1, 1, h / 0.3), seg=12, sub=False)


OUT_DIR.mkdir(parents=True, exist_ok=True)
scene_tile()
studio(4.7, (1200, 1000), (3.2, -6.2, 3.6), (0, 0.15, 1.0), 3.2)
render(str((OUT_DIR / 'tile-masak.png').resolve()))
