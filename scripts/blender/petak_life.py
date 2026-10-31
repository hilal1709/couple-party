# Makhluk dunia Petak Cat: merpati (sayap dikepak shader), kucing, dan warga (bertulang, bagian kaku ala boneka).
# Jalankan: blender --background --python scripts/blender/petak_life.py -- brand/illustrations/petak src/assets/petak/models
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

SUB['n'] = 0


def key(arm, frame, pose, root_loc=(0, 0, 0)):
    from mathutils import Euler, Vector
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        e = pose.get(pb.name, (0, 0, 0))
        R = Euler(tuple(math.radians(v) for v in e)).to_matrix().to_4x4()
        B = pb.bone.matrix_local.to_3x3().to_4x4()
        pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = arm.pose.bones['root']
    root.location = root.bone.matrix_local.to_3x3().inverted() @ Vector(root_loc)
    root.keyframe_insert('location', frame=frame)


def action(arm, name, frames):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for f, pose, *rest in frames:
        key(arm, f, pose, *rest)


def rig(bones):
    data = bpy.data.armatures.new('rig')
    arm = bpy.data.objects.new('rig', data)
    scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, a, b, par in bones:
        e = data.edit_bones.new(name)
        e.head, e.tail = a, b
        if par:
            e.parent = data.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def bind(parts, arm, name):
    """gabung bagian kaku: tiap bagian = (objek, tulang)"""
    bpy.ops.object.select_all(action='DESELECT')
    for o, bone in parts:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        g = o.vertex_groups.new(name=bone)
        g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
        for p in o.data.polygons:
            p.use_smooth = True
        o.select_set(False)
    for o, _ in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0][0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE')
    m.object = arm
    return o


def save(objs, name, anim):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    path = (GLB_DIR / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_animations=anim, export_animation_mode='ACTIONS', export_skins=anim, export_materials='EXPORT')
    print('GLB', path.name, path.stat().st_size // 1024, 'KB')


def merpati():
    reset()
    g = pbr('#8c95a3', 0.6)
    d = pbr('#4d5564', 0.55)
    w = pbr('#d9dde2', 0.6)
    k = pbr('#e0764a', 0.5)
    parts = [
        sphere((0, 0, 0.11), 0.085, g, (0.8, 1.4, 0.8), seg=10, sub=False),
        sphere((0, -0.105, 0.19), 0.05, d, (0.9, 1, 1), seg=8, sub=False),
        cyl((0, -0.155, 0.185), 0.012, 0.05, k, rot=(math.radians(90), 0, 0), verts=5, r2=0.002, b=0),
        cube((0, 0.15, 0.1), (0.07, 0.14, 0.012), d, b=0),
        cube((0.13, 0.02, 0.135), (0.17, 0.12, 0.012), g, b=0),
        cube((-0.13, 0.02, 0.135), (0.17, 0.12, 0.012), g, b=0),
        cube((0.19, 0.02, 0.137), (0.05, 0.11, 0.012), w, b=0),
        cube((-0.19, 0.02, 0.137), (0.05, 0.11, 0.012), w, b=0),
    ]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'merpati'
    save([o], 'merpati', False)


def kucing():
    reset()
    fur = pbr('#e39a4a', 0.75)
    fur2 = pbr('#b4661f', 0.75)
    white = pbr('#f6efe2', 0.7)
    eye = pbr('#2a2a1a', 0.2, coat=1)
    pink = pbr('#e88a95', 0.6)
    bones = [
        ('root', (0, 0.0, 0.2), (0, 0.0, 0.3), None),
        ('head', (0, -0.2, 0.27), (0, -0.28, 0.4), 'root'),
        ('fl', (0.08, -0.17, 0.17), (0.08, -0.17, 0.0), 'root'),
        ('fr', (-0.08, -0.17, 0.17), (-0.08, -0.17, 0.0), 'root'),
        ('bl', (0.08, 0.18, 0.17), (0.08, 0.18, 0.0), 'root'),
        ('br', (-0.08, 0.18, 0.17), (-0.08, 0.18, 0.0), 'root'),
        ('tail', (0, 0.24, 0.24), (0, 0.3, 0.45), 'root'),
    ]
    arm = rig(bones)
    p = [(sphere((0, 0, 0.21), 0.12, fur, (0.85, 1.9, 0.9), seg=14, sub=False), 'root'),
         (sphere((0, 0.12, 0.31), 0.03, fur2, (2.2, 1.0, 0.3), seg=8, sub=False), 'root'),
         (sphere((0, -0.08, 0.31), 0.03, fur2, (2.2, 1.0, 0.3), seg=8, sub=False), 'root'),
         (sphere((0, -0.27, 0.32), 0.095, fur, (1.05, 0.95, 0.9), seg=14, sub=False), 'head'),
         (sphere((0, -0.35, 0.3), 0.04, white, (1.2, 0.8, 0.7), seg=8, sub=False), 'head'),
         (sphere((0, -0.385, 0.312), 0.011, pink, seg=6, sub=False), 'head')]
    for s in (-1, 1):
        p.append((cyl((s * 0.06, -0.27, 0.42), 0.04, 0.07, fur2, verts=4, r2=0.003, b=0), 'head'))
        p.append((sphere((s * 0.042, -0.355, 0.34), 0.014, eye, seg=6, sub=False), 'head'))
    for b, x, y in (('fl', 0.08, -0.17), ('fr', -0.08, -0.17), ('bl', 0.08, 0.18), ('br', -0.08, 0.18)):
        p.append((cyl((x, y, 0.09), 0.032, 0.18, fur, verts=7, r2=0.028, b=0), b))
        p.append((sphere((x, y - 0.01, 0.018), 0.033, white, (1, 1.3, 0.6), seg=7, sub=False), b))
    t = tube([(0, 0.25, 0.24), (0, 0.32, 0.34), (0, 0.27, 0.46)], 0.02, fur2, res=1, steps=5)
    p.append((t, 'tail'))
    o = bind(p, arm, 'kucing')
    a = {'fl': (22, 0, 0), 'br': (22, 0, 0), 'fr': (-22, 0, 0), 'bl': (-22, 0, 0), 'tail': (12, 0, 0)}
    b = {'fl': (-22, 0, 0), 'br': (-22, 0, 0), 'fr': (22, 0, 0), 'bl': (22, 0, 0), 'tail': (-12, 0, 0)}
    action(arm, 'jalan', [(0, a), (10, b), (20, a)])
    sit = {'root': (-34, 0, 0), 'head': (34, 0, 0), 'fl': (34, 0, 0), 'fr': (34, 0, 0), 'bl': (-60, 0, 0), 'br': (-60, 0, 0)}
    action(arm, 'duduk', [(0, {**sit, 'tail': (20, 0, 0)}, (0, 0.08, -0.05)), (40, {**sit, 'tail': (-20, 0, 0)}, (0, 0.08, -0.05)), (80, {**sit, 'tail': (20, 0, 0)}, (0, 0.08, -0.05))])
    arm.animation_data.action = None
    save([arm, o], 'kucing', True)


def taper(points, m):
    cu = bpy.data.curves.new('tungkai', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 3
    cu.resolution_u = 10
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, (x, y, z, r) in zip(sp.bezier_points, points):
        bp.co = (x, y, z)
        bp.radius = r
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('tungkai', cu)
    scene.collection.objects.link(o)
    o.data.materials.append(m)
    return o


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


def warga():
    """warga: satu kulit tanpa sambungan, baju dan celana dibagi dari wilayah badan, sendi menekuk halus"""
    from mathutils import Vector
    reset()
    shirt = pbr('#3d8bff', 0.7)
    shirt.name = 'shirt'
    pants = pbr('#2b2d33', 0.8)
    skin = pbr('#b57b52', 0.55)
    hair = pbr('#1b1410', 0.5)
    sandal = pbr('#c9382f', 0.6)
    eye = pbr('#17120f', 0.2, coat=1)
    bones = [
        ('root', (0, 0, 0.9), (0, 0, 1.05), None),
        ('spine', (0, 0, 1.05), (0, 0, 1.38), 'root'),
        ('head', (0, 0, 1.4), (0, 0, 1.72), 'spine'),
        ('al', (0.23, 0, 1.36), (0.28, 0, 1.08), 'spine'),
        ('fl', (0.28, 0, 1.08), (0.3, -0.04, 0.82), 'al'),
        ('ar', (-0.23, 0, 1.36), (-0.28, 0, 1.08), 'spine'),
        ('fr', (-0.28, 0, 1.08), (-0.3, -0.04, 0.82), 'ar'),
        ('ll', (0.1, 0, 0.9), (0.11, 0, 0.48), 'root'),
        ('sl', (0.11, 0, 0.48), (0.11, 0.02, 0.05), 'll'),
        ('lr', (-0.1, 0, 0.9), (-0.11, 0, 0.48), 'root'),
        ('sr', (-0.11, 0, 0.48), (-0.11, 0.02, 0.05), 'lr'),
    ]
    arm = rig(bones)
    parts = [
        sphere((0, 0, 1.14), 0.2, skin, (1.0, 0.68, 1.5), seg=16, sub=False),
        sphere((0, 0, 0.92), 0.19, skin, (0.95, 0.72, 0.6), seg=16, sub=False),
        sphere((0, 0, 1.58), 0.125, skin, (0.92, 1.0, 1.1), seg=16, sub=False),
        sphere((0, -0.12, 1.55), 0.028, skin, (0.8, 1.2, 1), seg=8, sub=False),
        taper([(0, 0, 1.36, 0.06), (0, 0, 1.47, 0.05)], skin),
    ]
    for s in (-1, 1):
        parts += [
            taper([(s * 0.21, 0, 1.36, 0.062), (s * 0.28, 0, 1.08, 0.048), (s * 0.3, -0.04, 0.84, 0.038)], skin),
            sphere((s * 0.305, -0.05, 0.79), 0.05, skin, (0.75, 0.95, 1.2), seg=10, sub=False),
            taper([(s * 0.1, 0, 0.9, 0.092), (s * 0.11, 0, 0.48, 0.066), (s * 0.11, 0.015, 0.09, 0.046)], skin),
            sphere((s * 0.11, -0.05, 0.035), 0.055, skin, (0.85, 1.9, 0.6), seg=10, sub=False),
        ]
    for o in parts:
        o.select_set(False)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'warga'
    o.data.remesh_voxel_size = 0.014
    bpy.ops.object.voxel_remesh()
    mod = o.modifiers.new('halus', 'SMOOTH')
    mod.factor = 0.7
    mod.iterations = 8
    bpy.ops.object.modifier_apply(modifier='halus')
    mod = o.modifiers.new('kurangi', 'DECIMATE')
    mod.ratio = min(1.0, 3600 / max(1, len(o.data.polygons) * 2))
    bpy.ops.object.modifier_apply(modifier='kurangi')
    o.data.materials.clear()
    for mat in (skin, shirt, pants, sandal):
        o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
        c = p.center
        if c.z < 0.075:
            p.material_index = 3
        elif c.z < 0.86 and abs(c.x) < 0.2:
            p.material_index = 2 if c.z > 0.14 else 0
        elif 0.86 <= c.z < 1.42 and (abs(c.x) < 0.22 or c.z > 1.12):
            p.material_index = 1
    segs = [(n, Vector(a), Vector(b)) for n, a, b, _ in bones]

    def reaches(n, p):
        if (n[-1] == 'l' and p.x < -0.03) or (n[-1] == 'r' and p.x > 0.03):
            return False
        if n[0] == 'a' or n[0] == 'f':
            return abs(p.x) > 0.17 and p.z > 0.72
        if n[0] in 'ls':
            return p.z < 0.98 and abs(p.x) < 0.22
        if n == 'head':
            return p.z > 1.38
        return True

    groups = {n: o.vertex_groups.new(name=n) for n, *_ in bones}
    for v in o.data.vertices:
        ws = sorted((seg_dist(v.co, a, b), n) for n, a, b in segs if reaches(n, v.co))[:3]
        top = [(n, 1 / max(d, 0.01) ** 5) for d, n in ws]
        total = sum(w for _, w in top)
        for n, w in top:
            groups[n].add([v.index], w / total, 'REPLACE')
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE')
    m.object = arm
    # rambut dan mata menempel kaku ke kepala
    extra = [(sphere((0, 0.02, 1.625), 0.135, hair, (1.0, 1.04, 0.82), seg=14, sub=False), 'head')]
    for s in (-1, 1):
        extra.append((sphere((s * 0.05, -0.105, 1.6), 0.016, eye, seg=6, sub=False), 'head'))
    h = bind(extra, arm, 'rambut')
    a = {'ll': (-26, 0, 0), 'sl': (10, 0, 0), 'lr': (22, 0, 0), 'sr': (34, 0, 0), 'al': (20, 0, 0), 'fl': (-12, 0, 0), 'ar': (-20, 0, 0), 'fr': (-22, 0, 0), 'spine': (3, 0, 4)}
    b = {'ll': (22, 0, 0), 'sl': (34, 0, 0), 'lr': (-26, 0, 0), 'sr': (10, 0, 0), 'al': (-20, 0, 0), 'fl': (-22, 0, 0), 'ar': (20, 0, 0), 'fr': (-12, 0, 0), 'spine': (3, 0, -4)}
    action(arm, 'jalan', [(0, a), (15, b, (0, 0, 0.018)), (30, a)])
    arm.animation_data.action = None
    print('WARGA segitiga', len(o.data.polygons))
    save([arm, o, h], 'warga', True)


def ayam():
    """ayam kampung: badan bulat, jengger, ekor tegak; klip jalan dan mematuk"""
    reset()
    bulu = pbr('#a8552a', 0.75)
    bulu2 = pbr('#2d2019', 0.6)
    krem = pbr('#e6c188', 0.75)
    merah = pbr('#d92a24', 0.5)
    kuning = pbr('#e8a82a', 0.5)
    eye = pbr('#101010', 0.2, coat=1)
    bones = [
        ('root', (0, 0, 0.2), (0, 0, 0.3), None),
        ('head', (0, -0.1, 0.28), (0, -0.14, 0.46), 'root'),
        ('tail', (0, 0.12, 0.26), (0, 0.24, 0.44), 'root'),
        ('kl', (0.05, 0, 0.14), (0.05, 0, 0.0), 'root'),
        ('kr', (-0.05, 0, 0.14), (-0.05, 0, 0.0), 'root'),
    ]
    arm = rig(bones)
    p = [(sphere((0, 0.02, 0.22), 0.11, bulu, (0.85, 1.25, 1), seg=14, sub=False), 'root'),
         (sphere((0, -0.07, 0.17), 0.075, krem, (0.9, 1, 0.9), seg=10, sub=False), 'root')]
    for s in (-1, 1):
        p.append((sphere((s * 0.09, 0.03, 0.23), 0.07, bulu2, (0.3, 1.4, 0.8), seg=10, sub=False), 'root'))
        p.append((sphere((s * 0.03, -0.185, 0.385), 0.009, eye, seg=6, sub=False), 'head'))
    p.append((taper([(0, -0.09, 0.28, 0.06), (0, -0.14, 0.38, 0.045)], bulu), 'head'))
    p.append((sphere((0, -0.15, 0.39), 0.05, bulu, seg=10, sub=False), 'head'))
    p.append((cyl((0, -0.21, 0.385), 0.018, 0.05, kuning, rot=(math.radians(90), 0, 0), verts=6, r2=0.002, b=0), 'head'))
    for i, (y, z) in enumerate(((-0.17, 0.445), (-0.145, 0.455), (-0.12, 0.44))):
        p.append((sphere((0, y, z), 0.018, merah, (0.5, 1, 1.3), seg=6, sub=False), 'head'))
    p.append((sphere((0, -0.19, 0.345), 0.014, merah, (0.6, 0.8, 1.4), seg=6, sub=False), 'head'))
    for i, a2 in enumerate((-0.5, -0.1, 0.3)):
        p.append((taper([(0, 0.12, 0.26, 0.03), (a2 * 0.06, 0.22, 0.36, 0.022), (a2 * 0.1, 0.28, 0.42 - i * 0.03, 0.006)], bulu2 if i % 2 else bulu), 'tail'))
    for s, b2 in ((1, 'kl'), (-1, 'kr')):
        p.append((cyl((s * 0.05, 0, 0.07), 0.013, 0.14, kuning, verts=6, b=0), b2))
        p.append((sphere((s * 0.05, -0.025, 0.01), 0.022, kuning, (1, 1.8, 0.35), seg=7, sub=False), b2))
    o = bind(p, arm, 'ayam')
    x = {'kl': (26, 0, 0), 'kr': (-26, 0, 0), 'head': (-8, 0, 0), 'tail': (6, 0, 0)}
    y = {'kl': (-26, 0, 0), 'kr': (26, 0, 0), 'head': (8, 0, 0), 'tail': (-6, 0, 0)}
    action(arm, 'jalan', [(0, x), (7, y, (0, 0, 0.012)), (14, x)])
    naik = {'head': (-6, 0, 0)}
    turun = {'root': (24, 0, 0), 'head': (62, 0, 0)}
    action(arm, 'duduk', [(0, naik), (14, turun, (0, 0, -0.01)), (20, turun, (0, 0, -0.01)), (34, naik), (70, naik)])
    arm.animation_data.action = None
    save([arm, o], 'ayam', True)


GLB_DIR.mkdir(parents=True, exist_ok=True)
merpati()
kucing()
warga()
ayam()
