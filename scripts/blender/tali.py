# Ilustrasi tile Tali Jodoh: Onde dan Klepon terikat tali di atas bukit rumput, dengan kait bambu.
# Render Cycles, latar transparan → brand/illustrations/tali/tile-tali.png, lalu ekspor:
#   python -I scripts/blender/tali.py && python -I scripts/blender/export.py tali
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tali_lib import *  # noqa: E402,F403

DEST = ROOT / 'brand' / 'illustrations' / 'tali' / 'tile-tali.png'


def load(path, loc, action, frame, yaw):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.parent is None:
            o.location = loc
            o.rotation_euler = (0, 0, yaw)
            if o.type == 'ARMATURE':
                acts = [a for a in bpy.data.actions if a.name.split('.')[0] == action and a.name not in seen]
                if acts:
                    o.animation_data_create()
                    o.animation_data.action = acts[-1]
                    seen.add(acts[-1].name)
    return new


seen: set = set()


def main():
    clear_scene()
    models = OUT / 'models'
    load(models / 'onde.glb', (-0.7, 0, 0.42 + 0.3), 'cheer', 6, -0.4)
    load(models / 'klepon.glb', (0.85, 0, 0.42), 'brace', 4, 0.5)
    bpy.context.scene.frame_set(5)
    grass = pbr('rumput_bukit', '#5cc23a', rough=0.7, sheen=0.5)
    soil = pbr('tanah_bukit', '#7a5232', rough=0.9)
    hill = sphere((0, 0, -0.77), 2.2, grass, scale=(1.15, 0.7, 0.35), seg=40, sub=2)
    bake_mods(hill)
    noise_verts(hill, 0.05, seed=2, scale=2)
    under = sphere((0, 0, -0.92), 2.15, soil, scale=(1.13, 0.68, 0.35), seg=32, sub=1)
    rope = pbr('tali_serat', '#d9a65b', rough=0.85, sheen=0.5)
    tube([(-0.7, -0.05, 0.6), (-0.3, -0.25, 0.25), (0.2, -0.25, 0.2), (0.6, -0.1, 0.3)], 0.035, rope)
    leaf = pbr('rumput_helai', '#87e752', rough=0.6)
    rnd = random.Random(4)
    for _ in range(40):
        x = rnd.uniform(-2.2, 2.2)
        y = rnd.uniform(-1.2, 0.4)
        z = -0.77 + 0.77 * math.sqrt(max(0, 1 - (x / 2.53) ** 2 - (y / 1.54) ** 2)) - 0.04
        h = rnd.uniform(0.15, 0.32)
        tube([(x, y, z), (x + 0.03, y, z + h * 0.6), (x + 0.08, y, z + h)], 0.018, leaf, taper=lambda f: 1 - f * 0.9)
    pole = pbr('bambu', '#c9b26a', rough=0.5, coat=0.3)
    cyl((-1.9, 0.3, 1.0), 0.06, 2.4, pole)
    flag = pbr('janur', '#ffcc1f', rough=0.5)
    f = tube([(-1.86, 0.3, 2.1), (-1.4, 0.3, 1.95), (-0.95, 0.3, 1.75)], 0.16, flag, taper=lambda t: 1 - t * 0.8)
    f.scale = (1, 0.2, 1)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 96
    sc.cycles.device = 'CPU'
    sc.render.resolution_x = sc.render.resolution_y = 1100
    sc.render.film_transparent = True
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (1, 0.93, 0.97, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    sc.world = w
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.data.lens = 50
    cam.location = (0.2, -7.8, 1.9)
    cam.rotation_euler = (Vector((0, 0, 0.55)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.2
    sun.rotation_euler = (0.9, 0.2, 0.7)
    sc.collection.objects.link(sun)
    fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'AREA'))
    fill.data.energy = 300
    fill.data.size = 4
    fill.location = (-3, -4, 3)
    fill.rotation_euler = (Vector((0, 0, 0)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
    sc.collection.objects.link(fill)
    DEST.parent.mkdir(parents=True, exist_ok=True)
    sc.render.filepath = str(DEST)
    bpy.ops.render.render(write_still=True)
    print('render', DEST)
    del under


if __name__ == '__main__':
    main()
