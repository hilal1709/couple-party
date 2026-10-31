# Ilustrasi Sport Kacau: tile menu dari model game yang sama (chibi.blend + pin & bola).
# Jalankan setelah sport_chars.py & sport_world.py:
# blender --background brand/illustrations/sport/chibi.blend --python scripts/blender/sport.py
import math
from pathlib import Path

import bpy

ROOT = Path(bpy.data.filepath).resolve().parents[3]
OUT = ROOT / 'brand' / 'illustrations' / 'sport'
scene = bpy.context.scene


def colored(name, hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    bpy.data.materials[name].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin, 1)


bpy.ops.import_scene.gltf(filepath=str(ROOT / 'src/assets/sport/models/bowling-props.glb'))
pin = bpy.data.objects['pin']
ball = bpy.data.objects['ball']
arm = bpy.data.objects['rig']

colored('shirt', '#ff37a6')
colored('hair', '#121212')
colored('pants', '#21252e')
colored('skin', '#e0a878')
for o in bpy.data.objects:
    if o.name.startswith(('hair_', 'acc_')):
        o.hide_render = o.name != 'hair_1'

# karakter menghadap kamera sambil memeluk bola, pin di belakangnya
arm.animation_data.action = bpy.data.actions['ready']
scene.frame_set(0)
arm.location = (-0.3, 0, 0)
arm.rotation_mode = 'XYZ'
arm.rotation_euler = (0, 0, math.radians(14))

spots = [(0, 0), (-0.5, 1), (0.5, 1), (-1, 2), (0, 2), (1, 2)]
for c, r in spots:
    p = pin.copy()
    scene.collection.objects.link(p)
    for ch in pin.children:
        q = ch.copy()
        q.parent = p
        scene.collection.objects.link(q)
    p.rotation_mode = 'XYZ'
    p.rotation_euler = (0, 0, 0)
    p.location = (0.72 + c * 0.42, 0.25 + r * 0.42, 0)
    p.scale = (2.1, 2.1, 2.1)
pin.hide_render = True
for ch in pin.children:
    ch.hide_render = True
ball.rotation_mode = 'XYZ'
ball.location = (-0.26, -0.5, 0.62)
ball.scale = (1.7, 1.7, 1.7)
ball.rotation_euler = (1.2, 0.3, 0.3)
bpy.data.materials['ball'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.75, 0.06, 1)

floor = bpy.data.meshes.new('lantai')
floor.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
fo = bpy.data.objects.new('lantai', floor)
scene.collection.objects.link(fo)
fo.is_shadow_catcher = True

scene.render.engine = 'CYCLES'
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = 900
w = bpy.data.worlds.new('w')
w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (1, 0.92, 0.97, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.85
scene.world = w
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(45), math.radians(-20), math.radians(-50))
sun.data.energy = 3.4
sun.data.angle = math.radians(12)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = (0.2, -3.9, 1.0)
cam.rotation_euler = (math.radians(87), 0, 0)
cam.data.lens = 62

scene.render.filepath = str(OUT / 'tile-sport.png')
bpy.ops.render.render(write_still=True)
print('RENDERED', scene.render.filepath)
