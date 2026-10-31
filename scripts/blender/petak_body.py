# Karakter Petak Cat: bunglon putih satu kulit tanpa sambungan, supaya cat menyambung di seluruh badan.
# Primitif digabung lewat voxel remesh → dihaluskan → didecimate → UV otomatis → bobot dihitung dari jarak ke tulang.
# Pupil mesh terpisah (menempel ke tulang kepala) dan disembunyikan saat pemain membeku.
# Jalankan: blender --background --python scripts/blender/petak_body.py -- brand/illustrations/petak src/assets/petak/models
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

import bmesh  # noqa: E402
from mathutils import Euler, Vector  # noqa: E402

SUB['n'] = 0
TARGET_TRIS = 6000
SKIN = pbr('#ffffff', 0.6)
SKIN.name = 'cat'
PUPIL = pbr('#16121a', 0.15, coat=1.0)
PUPIL.name = 'pupil'

# nama, kepala, ekor, induk. Karakter menghadap -Y; sisi kiri karakter ada di +X.
BONES = [
    ('root', (0, 0, 0.40), (0, 0, 0.52), None),
    ('spine', (0, 0, 0.52), (0, -0.02, 0.76), 'root'),
    ('head', (0, -0.02, 0.76), (0, -0.05, 1.18), 'spine'),
    ('upper_L', (0.21, 0, 0.69), (0.33, -0.02, 0.55), 'spine'),
    ('fore_L', (0.33, -0.02, 0.55), (0.43, -0.05, 0.40), 'upper_L'),
    ('upper_R', (-0.21, 0, 0.69), (-0.33, -0.02, 0.55), 'spine'),
    ('fore_R', (-0.33, -0.02, 0.55), (-0.43, -0.05, 0.40), 'upper_R'),
    ('thigh_L', (0.14, 0, 0.38), (0.16, -0.01, 0.20), 'root'),
    ('shin_L', (0.16, -0.01, 0.20), (0.17, -0.06, 0.02), 'thigh_L'),
    ('thigh_R', (-0.14, 0, 0.38), (-0.16, -0.01, 0.20), 'root'),
    ('shin_R', (-0.16, -0.01, 0.20), (-0.17, -0.06, 0.02), 'thigh_R'),
    ('tail_1', (0, 0.18, 0.36), (0, 0.42, 0.26), 'root'),
    ('tail_2', (0, 0.42, 0.26), (0, 0.63, 0.38), 'tail_1'),
    ('tail_3', (0, 0.63, 0.38), (0, 0.46, 0.54), 'tail_2'),
]


def taper(points, m):
    """tabung kurva dengan jari-jari per titik: (x, y, z, r)"""
    cu = bpy.data.curves.new('ekor', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 3
    cu.resolution_u = 16
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, (x, y, z, r) in zip(sp.bezier_points, points):
        bp.co = (x, y, z)
        bp.radius = r
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('ekor', cu)
    scene.collection.objects.link(o)
    o.data.materials.append(m)
    return o


def build_skin():
    parts = [
        sphere((0, 0, 0.52), 0.30, SKIN, (0.86, 0.80, 1.08)),
        sphere((0, -0.05, 0.96), 0.31, SKIN, (1.0, 1.04, 0.90)),
        sphere((0, -0.31, 0.90), 0.17, SKIN, (1.08, 1.2, 0.74)),
        # jengger khas bunglon
        sphere((0, 0.10, 1.20), 0.19, SKIN, (0.34, 1.05, 0.72)),
        sphere((0, 0.24, 1.09), 0.13, SKIN, (0.32, 1.0, 0.72)),
    ]
    for s in (-1, 1):
        parts += [
            sphere((s * 0.235, -0.17, 1.05), 0.115, SKIN),
            taper([(s * 0.20, 0, 0.70, 0.085), (s * 0.33, -0.02, 0.55, 0.07), (s * 0.43, -0.05, 0.40, 0.066)], SKIN),
            sphere((s * 0.45, -0.07, 0.36), 0.095, SKIN, (1, 1.15, 0.86)),
            taper([(s * 0.14, 0, 0.40, 0.115), (s * 0.16, -0.01, 0.20, 0.095), (s * 0.17, -0.03, 0.06, 0.085)], SKIN),
            sphere((s * 0.17, -0.09, 0.05), 0.10, SKIN, (1.05, 1.55, 0.55)),
        ]
    parts.append(taper([
        (0, 0.14, 0.40, 0.13), (0, 0.42, 0.25, 0.095), (0, 0.64, 0.36, 0.07),
        (0, 0.56, 0.56, 0.052), (0, 0.42, 0.46, 0.04), (0, 0.49, 0.38, 0.03),
    ], SKIN))
    to_meshes()
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    # samakan semua transform & modifier dulu, lalu gabung jadi satu objek
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'badan'
    o.data.remesh_voxel_size = 0.012
    bpy.ops.object.voxel_remesh()
    m = o.modifiers.new('halus', 'SMOOTH')
    m.factor = 0.8
    m.iterations = 12
    bpy.ops.object.modifier_apply(modifier='halus')
    m = o.modifiers.new('kurangi', 'DECIMATE')
    m.ratio = min(1.0, TARGET_TRIS / max(1, len(o.data.polygons) * 2))
    bpy.ops.object.modifier_apply(modifier='kurangi')
    o.data.materials.clear()
    o.data.materials.append(SKIN)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    for p in o.data.polygons:
        p.use_smooth = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.012)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def build_pupils():
    out = []
    for s in (-1, 1):
        p = sphere((s * 0.262, -0.262, 1.052), 0.042, PUPIL, sub=False)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        out.append(p)
    bpy.ops.object.select_all(action='DESELECT')
    for p in out:
        p.select_set(True)
    bpy.context.view_layer.objects.active = out[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = 'pupil'
    g = o.vertex_groups.new(name='head')
    g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
    return o


def build_rig():
    data = bpy.data.armatures.new('rig')
    arm = bpy.data.objects.new('rig', data)
    scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, a, b, par in BONES:
        e = data.edit_bones.new(name)
        e.head, e.tail = a, b
        if par:
            e.parent = data.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


def reaches(n, p):
    """wilayah tiap tulang: kepala besar dan dekat bahu, jadi jarak saja membuat lengan ikut menarik kepala"""
    if (n.endswith('_L') and p.x < -0.04) or (n.endswith('_R') and p.x > 0.04):
        return False
    if n.startswith('tail'):
        return p.y > 0.1
    if n.startswith('upper'):
        return abs(p.x) > 0.17 and 0.32 < p.z < 0.80
    if n.startswith('fore'):
        return abs(p.x) > 0.27 and p.z < 0.68
    if n.startswith('thigh'):
        return p.z < 0.46 and p.y < 0.2
    if n.startswith('shin'):
        return p.z < 0.28 and p.y < 0.2
    if n == 'head':
        return p.z > 0.70
    if n == 'spine':
        return 0.36 < p.z < 0.90
    return True


def weigh(o):
    """bobot = kebalikan jarak ke tulang berpangkat tinggi, hanya dari tulang yang wilayahnya mencakup titik itu"""
    groups = {n: o.vertex_groups.new(name=n) for n, *_ in BONES}
    segs = [(n, Vector(a), Vector(b)) for n, a, b, _ in BONES]
    for v in o.data.vertices:
        p = v.co
        ws = [(n, seg_dist(p, a, b)) for n, a, b in segs if reaches(n, p)]
        ws.sort(key=lambda w: w[1])
        top = [(n, 1 / max(d, 0.01) ** 5) for n, d in ws[:3]]
        total = sum(w for _, w in top)
        for n, w in top:
            groups[n].add([v.index], w / total, 'REPLACE')


def skin(o, arm):
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE')
    m.object = arm


# ---------- pose: sudut dalam ruang armature (derajat), sama seperti sport_chars.py ----------
def key(arm, frame, pose, loc=(0, 0, 0)):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        e = pose.get(pb.name, (0, 0, 0))
        R = Euler(tuple(math.radians(v) for v in e)).to_matrix().to_4x4()
        B = pb.bone.matrix_local.to_3x3().to_4x4()
        pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = arm.pose.bones['root']
    root.location = root.bone.matrix_local.to_3x3().inverted() @ Vector(loc)
    root.keyframe_insert('location', frame=frame)


def action(arm, name, frames):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for f, pose, *rest in frames:
        key(arm, f, pose, *rest)


def animate(arm):
    stand = {'upper_L': (0, -8, 0), 'upper_R': (0, 8, 0)}
    action(arm, 'idle', [(0, stand), (30, {**stand, 'spine': (3, 0, 0), 'tail_3': (-12, 0, 0)}, (0, 0, -0.012)), (60, stand)])
    a = {'thigh_L': (-30, 0, 0), 'shin_L': (15, 0, 0), 'thigh_R': (28, 0, 0), 'shin_R': (30, 0, 0), 'upper_L': (24, -8, 0), 'upper_R': (-24, 8, 0), 'tail_1': (0, 0, 12)}
    b = {'thigh_L': (28, 0, 0), 'shin_L': (30, 0, 0), 'thigh_R': (-30, 0, 0), 'shin_R': (15, 0, 0), 'upper_L': (-24, -8, 0), 'upper_R': (24, 8, 0), 'tail_1': (0, 0, -12)}
    action(arm, 'walk', [(0, a), (10, b, (0, 0, 0.02)), (20, a)])
    shock = {'upper_L': (0, -70, 0), 'upper_R': (0, 70, 0), 'fore_L': (0, -30, 0), 'fore_R': (0, 30, 0), 'head': (-12, 0, 0), 'tail_2': (-40, 0, 0)}
    action(arm, 'kaget', [(0, stand), (6, shock, (0, 0, 0.16)), (16, shock, (0, 0, 0.02))])
    # pose beku: satu kunci saja
    curl = {'spine': (46, 0, 0), 'head': (24, 0, 0), 'thigh_L': (-96, 0, 0), 'shin_L': (118, 0, 0), 'thigh_R': (-96, 0, 0), 'shin_R': (118, 0, 0),
            'upper_L': (-66, 8, 0), 'upper_R': (-66, -8, 0), 'fore_L': (-60, 0, 0), 'fore_R': (-60, 0, 0), 'tail_1': (24, 0, 0), 'tail_2': (46, 0, 0), 'tail_3': (40, 0, 0)}
    action(arm, 'pose_ringkuk', [(0, curl, (0, 0, -0.27))])
    flat = {'upper_L': (0, -44, 0), 'upper_R': (0, 44, 0), 'fore_L': (0, -8, 0), 'fore_R': (0, 8, 0), 'thigh_L': (0, -12, 0), 'thigh_R': (0, 12, 0), 'tail_1': (40, 0, 0), 'tail_2': (34, 0, 0)}
    action(arm, 'pose_nempel', [(0, flat)])
    sit = {'thigh_L': (-88, -8, 0), 'shin_L': (84, 0, 0), 'thigh_R': (-88, 8, 0), 'shin_R': (84, 0, 0), 'upper_L': (-18, -6, 0), 'upper_R': (-18, 6, 0), 'fore_L': (-34, 0, 0), 'fore_R': (-34, 0, 0)}
    action(arm, 'pose_duduk', [(0, sit, (0, 0, -0.17))])
    prone = {'root': (84, 0, 0), 'head': (-62, 0, 0), 'upper_L': (86, -24, 0), 'upper_R': (86, 24, 0), 'thigh_L': (-6, -8, 0), 'thigh_R': (-6, 8, 0), 'tail_1': (-16, 0, 0)}
    action(arm, 'pose_tiarap', [(0, prone, (0, -0.1, -0.21))])
    statue = {'upper_L': (0, -128, 0), 'fore_L': (0, -18, 0), 'upper_R': (0, 30, 0), 'fore_R': (0, -80, 0), 'head': (-10, 0, 16), 'thigh_R': (-26, 0, 0), 'shin_R': (26, 0, 0)}
    action(arm, 'pose_patung', [(0, statue)])
    tree = {'upper_L': (0, -118, 0), 'fore_L': (0, 18, 0), 'upper_R': (0, 118, 0), 'fore_R': (0, -18, 0), 'thigh_R': (-58, 26, 0), 'shin_R': (82, 0, 0), 'head': (-8, 0, 0), 'tail_1': (34, 0, 0)}
    action(arm, 'pose_pohon', [(0, tree)])
    limp = {'spine': (58, 0, 0), 'head': (34, 0, 0), 'upper_L': (70, -6, 0), 'upper_R': (70, 6, 0), 'thigh_L': (-14, 0, 0), 'thigh_R': (-14, 0, 0), 'shin_L': (22, 0, 0), 'shin_R': (22, 0, 0), 'tail_1': (-20, 0, 0)}
    action(arm, 'pose_menggantung', [(0, limp, (0, 0.04, -0.05))])
    squat = {'thigh_L': (-104, -18, 0), 'shin_L': (118, 0, 0), 'thigh_R': (-104, 18, 0), 'shin_R': (118, 0, 0), 'spine': (20, 0, 0), 'upper_L': (-46, -2, 0), 'upper_R': (-46, 2, 0), 'fore_L': (-70, 0, 0), 'fore_R': (-70, 0, 0)}
    action(arm, 'pose_jongkok', [(0, squat, (0, 0, -0.22))])
    lean = {'root': (0, 16, 0), 'spine': (0, 14, 0), 'head': (0, -8, 0), 'upper_L': (0, -8, 0), 'upper_R': (0, 40, 0), 'thigh_L': (0, -16, 0), 'thigh_R': (0, -16, 0), 'tail_1': (0, 0, 26)}
    action(arm, 'pose_miring', [(0, lean, (0.08, 0, -0.03))])
    gape = {'head': (-20, 0, 0), 'upper_L': (0, 22, 0), 'upper_R': (0, -22, 0), 'fore_L': (-36, 0, 0), 'fore_R': (-36, 0, 0), 'spine': (-8, 0, 0), 'tail_2': (-30, 0, 0)}
    action(arm, 'pose_kaget', [(0, gape)])
    bow = {'spine': (34, 0, 0), 'head': (46, 0, 0), 'upper_L': (-30, 34, 0), 'upper_R': (-30, -34, 0), 'fore_L': (-92, 0, 0), 'fore_R': (-92, 0, 0), 'thigh_L': (-22, 0, 0), 'thigh_R': (-22, 0, 0), 'shin_L': (26, 0, 0), 'shin_R': (26, 0, 0)}
    action(arm, 'pose_sembah', [(0, bow, (0, 0, -0.04))])
    arm.animation_data.action = None


def main():
    GLB_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    arm = build_rig()
    body = build_skin()
    weigh(body)
    pupils = build_pupils()
    skin(body, arm)
    skin(pupils, arm)
    animate(arm)
    print('SEGITIGA', len(body.data.polygons), 'titik', len(body.data.vertices))
    bpy.ops.object.select_all(action='DESELECT')
    for o in (arm, body, pupils):
        o.select_set(True)
    path = (GLB_DIR / 'bunglon.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_materials='EXPORT')
    print('GLB', path, path.stat().st_size // 1024, 'KB')
    bpy.ops.wm.save_as_mainfile(filepath=str((OUT_DIR / 'bunglon.blend').resolve()))


if __name__ == '__main__':
    main()
