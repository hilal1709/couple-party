# Render pratinjau GLB Tali Jodoh (Cycles CPU) untuk pengecekan visual.
# Jalankan: python -I scripts/blender/tali_preview.py <out.png> <glb> [<glb> ...] [--dist 3] [--frame N --action nama]
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tali_lib import *  # noqa: E402,F403

args = sys.argv[1:]
out = args.pop(0)
dist = 3.0
action = None
frame = 0
glbs = []
while args:
    a = args.pop(0)
    if a == '--dist':
        dist = float(args.pop(0))
    elif a == '--action':
        action = args.pop(0)
    elif a == '--frame':
        frame = int(args.pop(0))
    else:
        glbs.append(a)
clear_scene()
x = 0.0
for g in glbs:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=g)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    for o in roots:
        o.location.x += x
        if action and o.type == 'ARMATURE' and action in bpy.data.actions:
            o.animation_data_create()
            o.animation_data.action = bpy.data.actions[action]
    x += 1.1
bpy.context.scene.frame_set(frame)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.samples = 48
sc.cycles.device = 'CPU'
sc.render.resolution_x = 900
sc.render.resolution_y = 600
sc.render.film_transparent = False
w = bpy.data.worlds.new('w')
w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.85, 1.0, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.8
sc.world = w
cx = (x - 1.1) / 2
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
cam.location = (cx + dist * 0.35, -dist, 0.6 + dist * 0.15)
look = Vector((cx, 0, 0.0)) - cam.location
cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.5
sun.rotation_euler = (0.8, 0.3, 0.6)
sc.collection.objects.link(sun)
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
