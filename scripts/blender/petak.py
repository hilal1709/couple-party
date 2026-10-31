# Ilustrasi menu Petak Cat: bunglon separuh tercat di meja, ember cat, dan genangan warna. Dimodel di Blender, bukan AI.
# Jalankan: blender --background --python scripts/blender/petak.py -- brand/illustrations/petak src/assets/petak/models
# Lanjutkan dengan: python -I scripts/blender/export.py petak
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

BODY = GLB_DIR / 'bunglon.glb'
SPLATS = [((-0.1, -0.3, 1.05), 0.2), ((0.05, -0.32, 0.55), 0.17), ((-0.24, -0.2, 0.3), 0.14), ((0.18, -0.25, 0.95), 0.1), ((0.0, 0.5, 0.4), 0.16)]


def bunglon(loc, scale):
    bpy.ops.import_scene.gltf(filepath=str(BODY.resolve()))
    body = bpy.data.objects['badan']
    pupil = bpy.data.objects['pupil']
    rig = bpy.data.objects['rig']
    for o in (body, pupil):
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        o.parent = None
    bpy.data.objects.remove(rig, do_unlink=True)
    white, rose, green, ink = pbr('#fff4fa', 0.6), pbr('#ff37a6', 0.45), pbr('#5cf64a', 0.45), pbr('#121212', 0.3)
    me = body.data
    me.materials.clear()
    for m in (white, rose, green):
        me.materials.append(m)
    for p in me.polygons:
        c = p.center
        # kiri sudah tercat merah muda, kanan masih putih, ada percikan hijau
        i = 1 if c.x < -0.02 + 0.08 * math.sin(c.z * 9) else 0
        for s, r in SPLATS:
            if (c - type(c)(s)).length < r:
                i = 2
        p.material_index = i
    pupil.data.materials.clear()
    pupil.data.materials.append(ink)
    for o in (body, pupil):
        o.location = loc
        o.scale = (scale, scale, scale)
        o.rotation_euler = (0, 0, math.radians(24))


def ember(loc, warna):
    x, y, z = loc
    cyl((x, y, z + 0.34), 0.42, 0.68, pbr('#fff4fa', 0.5), verts=32, r2=0.5, b=0.01)
    cyl((x, y, z + 0.69), 0.46, 0.05, pbr(warna, 0.25), verts=32, b=0)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.025, location=(x, y, z + 0.68), rotation=(math.radians(80), 0, 0))
    last().data.materials.append(pbr('#121212', 0.4))
    for dx in (-0.2, 0.05, 0.28):
        sphere((x + dx, y - 0.45, z + 0.46 - abs(dx)), 0.06, pbr(warna, 0.25), (1, 0.6, 2.4), seg=10, sub=False)


def scene_tile():
    clear()
    cyl((0, 0.2, 0.1), 2.15, 0.2, pbr('#ffcae9', 0.6), verts=64, b=0.02)
    for x, y, r, c in ((-1.15, -0.65, 0.55, '#ff37a6'), (1.25, -0.95, 0.42, '#5cf64a'), (0.15, -1.2, 0.3, '#ff37a6')):
        sphere((x, y, 0.21), r, pbr(c, 0.2), (1.35, 1, 0.06), seg=24, sub=False)
    bunglon((0, 0.2, 0.2), 2.1)
    ember((-1.55, 0.3, 0.2), '#ff37a6')
    ember((1.6, 0.75, 0.2), '#5cf64a')


OUT_DIR.mkdir(parents=True, exist_ok=True)
scene_tile()
studio(4.7, (1200, 1000), (3.2, -6.2, 3.4), (0, 0.15, 1.25), 3.2)
render(str((OUT_DIR / 'tile-petak.png').resolve()))
