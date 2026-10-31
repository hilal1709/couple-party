# Karakter chibi Sport Kacau: satu badan bertulang + rambut & aksesori yang bisa diganti.
# Bagian tubuh terpisah terikat kaku ke tulang (gaya Mii), material bernama diwarnai ulang di three.js.
# Jalankan: blender --background --python scripts/blender/sport_chars.py -- brand/illustrations/sport src/assets/sport/models
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import *  # noqa: E402,F403

import bmesh  # noqa: E402
from mathutils import Euler, Vector  # noqa: E402

SUB['n'] = 1
HEAD = (0, 0, 1.0)
HEAD_R = 0.29

# ---------- material bernama: skin/hair/shirt/pants diwarnai ulang saat main ----------
_named = {}


def named(name, color, rough=0.6, coat=0.0):
    if name in _named:
        return _named[name]
    m = pbr(color, rough, coat=coat)
    m = m.copy()
    m.name = name
    _named[name] = m
    return m


SKIN = named('skin', '#f6c9a4', 0.55)
SHIRT = named('shirt', '#ff37a6', 0.6)
PANTS = named('pants', '#21252e', 0.7)
HAIR = named('hair', '#4a2c17', 0.45, 0.3)
SHOE = named('shoe', '#fff4fa', 0.45)
SOLE = named('sole', '#121212', 0.7)
EYE = named('eye', '#16121a', 0.15, 1.0)
GLINT = named('glint', '#ffffff', 0.2)
IRIS = named('iris', '#5a3a1e', 0.2, 1.0)
BLUSH = named('blush', '#ff8fa8', 0.7)
ACC = named('acc', '#ff37a6', 0.5)
LENS = named('lens', '#121212', 0.25, 0.8)
GLOVE = named('glove', '#e0223c', 0.35, 0.6)
CUFF = named('cuff', '#fff4fa', 0.5)
WOOD = named('wood', '#8a5a2b', 0.45, 0.3)
STRING = named('string', '#fff4fa', 0.5)
FRAME = named('frame', '#ff37a6', 0.35, 0.5)
MESH = named('mesh', '#fff4fa', 0.8)


def bake(o):
    """terapkan modifier & transform supaya bisa digabung dan dikasih bobot"""
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def to(bone, *objs):
    for o in objs:
        bake(o)
        vg = o.vertex_groups.new(name=bone)
        vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    return list(objs)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    o.data.name = name
    return o


def transfer_weights(src, dst, rounds=8, keep=3):
    """bobot dari titik terdekat di bagian asal, dihaluskan lewat tetangga supaya sendi menekuk lembut"""
    from mathutils.kdtree import KDTree
    names = [g.name for g in src.vertex_groups]
    kd = KDTree(len(src.data.vertices))
    for v in src.data.vertices:
        kd.insert(v.co, v.index)
    kd.balance()
    weights = []
    for v in dst.data.vertices:
        _, i, _ = kd.find(v.co)
        weights.append({names[g.group]: g.weight for g in src.data.vertices[i].groups})
    near = [[] for _ in dst.data.vertices]
    for e in dst.data.edges:
        a, b = e.vertices
        near[a].append(b)
        near[b].append(a)
    for _ in range(rounds):
        nxt = []
        for i, w in enumerate(weights):
            sum_w = dict(w)
            for n in near[i]:
                for k, v in weights[n].items():
                    sum_w[k] = sum_w.get(k, 0) + v
            count = len(near[i]) + 1
            nxt.append({k: v / count for k, v in sum_w.items()})
        weights = nxt
    for name in names:
        dst.vertex_groups.new(name=name)
    for i, w in enumerate(weights):
        top = sorted(w.items(), key=lambda kv: -kv[1])[:keep]
        total = sum(v for _, v in top) or 1
        for k, v in top:
            dst.vertex_groups[k].add([i], v / total, 'REPLACE')


def unify(objs, name, voxel=0.011, ratio=0.1):
    """lebur bagian-bagian jadi satu kulit tanpa sambungan; bobot tulang disalin dari bagian asal lalu dihaluskan"""
    src = join(objs, f'{name}_asal')
    dup = src.copy()
    dup.data = src.data.copy()
    dup.name = name
    scene.collection.objects.link(dup)
    dup.vertex_groups.clear()
    bpy.ops.object.select_all(action='DESELECT')
    dup.select_set(True)
    bpy.context.view_layer.objects.active = dup
    r = dup.modifiers.new('r', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel
    r.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=r.name)
    d = dup.modifiers.new('d', 'DECIMATE')
    d.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=d.name)
    for p in dup.data.polygons:
        p.use_smooth = True
    transfer_weights(src, dup)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.data.objects.remove(src, do_unlink=True)
    return dup


def clumps(n, r, length, m, zmin=1.12, seed=1, lean=0.6):
    """gumpalan helai rambut di kubah kepala: kerucut ramping yang mengikuti arah sisir"""
    import random
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        a = rnd.random() * math.tau
        k = 0.15 + rnd.random() * 0.8
        x, y = math.cos(a) * k * HEAD_R, math.sin(a) * k * HEAD_R
        z = HEAD[2] + math.sqrt(max(0.01, 1 - k * k)) * HEAD_R * 1.0
        if z < zmin:
            continue
        L = length * (0.75 + rnd.random() * 0.5)
        base = Vector((x * 1.02, y * 1.02, z))
        # helai rebah mengikuti kepala: arah sisir dibuang komponen tegak lurusnya
        n = (base - Vector(HEAD)).normalized()
        comb = Vector((0.25 * math.copysign(1, x), lean, -1))
        comb = (comb - n * comb.dot(n)).normalized()
        tip = base + comb * L + n * 0.02
        bpy.ops.mesh.primitive_cone_add(radius1=r * (0.8 + rnd.random() * 0.5), radius2=0.002, depth=(tip - base).length, location=(base + tip) / 2, vertices=6)
        o = last()
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(tip - base)
        o.data.materials.append(m)
        for p in o.data.polygons:
            p.use_smooth = True
        out.append(o)
    return out


def shell(r, scale, cut, m, center=HEAD, seg=20):
    """kubah rambut: bola yang bagian bawahnya dipotong; `cut` = batas bawah relatif pusat, satuan r"""
    o = sphere(center, r, m, scale, seg=seg, sub=False)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    # garis rambut naik di depan supaya dahi & alis terlihat, dan turun menutupi kepala belakang
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < cut * r + max(0, -v.co.y) * 0.62 - max(0, v.co.y) * 1.1], context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    return o


def limb(a, b, r, m, r2=None):
    """batang lengan/kaki yang ujungnya membulat, dari titik a ke b"""
    A, B = Vector(a), Vector(b)
    d = B - A
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r if r2 is None else r2, depth=d.length, location=(A + B) / 2, vertices=10)
    o = last()
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    return [o, sphere(a, r, m, seg=10, sub=False), sphere(b, r if r2 is None else r2, m, seg=10, sub=False)]


# ---------- tubuh ----------
def build_body():
    parts = []
    # kepala
    head = [
        sphere(HEAD, HEAD_R, SKIN, (1.04, 1, 0.97), seg=32, sub=False),
        sphere((0, -0.015, 0.9), 0.19, SKIN, (1.05, 0.98, 0.75), seg=16, sub=False),  # dagu bulat
        sphere((-HEAD_R * 1.02, 0.01, 0.98), 0.055, SKIN, (0.6, 0.9, 1.1), seg=12, sub=False),
        sphere((HEAD_R * 1.02, 0.01, 0.98), 0.055, SKIN, (0.6, 0.9, 1.1), seg=12, sub=False),
        sphere((0, -0.285, 0.965), 0.026, SKIN, (1.1, 0.8, 0.9), seg=10, sub=False),  # hidung
        limb((0, 0, 0.74), (0, 0, 0.78), 0.07, SKIN)[0],
    ]
    # wajah: dibuat agak maju dari permukaan kepala supaya tidak tenggelam
    for s in (-1, 1):
        x = s * 0.115
        head.append(sphere((x, -0.255, 1.03), 0.058, GLINT, (0.95, 0.42, 1.25), seg=14, sub=False))
        head.append(sphere((x, -0.277, 1.03), 0.044, IRIS, (0.92, 0.4, 1.2), seg=14, sub=False))
        head.append(sphere((x, -0.292, 1.03), 0.026, EYE, (0.92, 0.35, 1.15), seg=12, sub=False))
        head.append(sphere((x + 0.014, -0.304, 1.052), 0.011, GLINT, (1, 0.5, 1), seg=8, sub=False))
        head.append(sphere((s * 0.19, -0.222, 0.945), 0.042, BLUSH, (1.15, 0.35, 0.65), seg=10, sub=False))
        brow = limb((x - 0.05, -0.265, 1.118 - s * 0.006), (x + 0.05, -0.262, 1.118 + s * 0.006), 0.0105, HAIR)
        head.extend(brow)
    head.append(tube([(-0.052, -0.279, 0.905), (0, -0.289, 0.885), (0.052, -0.279, 0.905)], 0.009, EYE, res=1, steps=4))
    bpy.context.view_layer.update()
    for o in head:
        if o.type == 'CURVE':
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
    parts += to('head', *head)

    # badan
    cloth = to('spine', sphere((0, 0, 0.6), 0.215, SHIRT, (1, 0.8, 1.02), seg=22, sub=False), torus((0, 0, 0.725), 0.075, 0.018, SHIRT, seg=16))
    legs = to('hips', sphere((0, 0, 0.45), 0.195, PANTS, (1, 0.82, 0.62), seg=16, sub=False))
    limbs = []

    # lengan
    for side, s in (('R', -1), ('L', 1)):
        sh = (s * 0.215, 0, 0.7)
        el = (s * 0.262, 0, 0.53)
        wr = (s * 0.285, 0, 0.385)
        cloth += to(f'upper_{side}', *limb(sh, el, 0.066, SHIRT, 0.056))
        arm_skin = to(f'fore_{side}', *limb(el, wr, 0.05, SKIN, 0.043))
        hand = [sphere((wr[0], wr[1], wr[2] - 0.045), 0.06, SKIN, (0.85, 0.95, 1.1), seg=12, sub=False)]
        hand.append(sphere((wr[0] - s * 0.04, wr[1] - 0.025, wr[2] - 0.035), 0.024, SKIN, (1, 1, 1.3), seg=8, sub=False))
        arm_skin += to(f'hand_{side}', *hand)
        limbs.append(unify(arm_skin, f'lengan_{side}', voxel=0.009, ratio=0.22))
        hp = (s * 0.1, 0, 0.42)
        kn = (s * 0.105, 0, 0.25)
        an = (s * 0.105, 0, 0.1)
        legs += to(f'thigh_{side}', *limb(hp, kn, 0.082, PANTS, 0.07))
        legs += to(f'shin_{side}', *limb(kn, an, 0.066, PANTS, 0.056))
        foot = [
            sphere((s * 0.105, -0.05, 0.062), 0.082, SHOE, (0.88, 1.5, 0.72), seg=14, sub=False),
            sphere((s * 0.105, -0.05, 0.022), 0.082, SOLE, (0.92, 1.54, 0.3), seg=14, sub=False),
        ]
        parts += to(f'foot_{side}', *foot)
    parts += [unify(cloth, 'baju'), unify(legs, 'celana'), *limbs]
    return join(parts, 'body')


# ---------- rambut & aksesori: objek terpisah, ditampilkan satu per satu ----------
def fringe():
    return sphere((0.05, -0.235, 1.185), 0.15, HAIR, (1.25, 0.42, 0.3), seg=14, sub=False, rot=(0, math.radians(-10), 0))


def hair_0():
    return [shell(0.305, (1.05, 1.03, 1), 0.05, HAIR), fringe(), *clumps(30, 0.05, 0.11, HAIR, seed=2)]


def hair_1():
    out = [shell(0.3, (1.05, 1.02, 0.98), 0.15, HAIR)]
    for i in range(11):
        a = i / 11 * math.tau
        rr = 0.17 if i % 2 else 0.1
        x, y = math.cos(a) * rr, math.sin(a) * rr
        tilt = (math.radians(-28) * math.sin(a) * (rr / 0.17), math.radians(28) * math.cos(a) * (rr / 0.17), 0)
        out.append(cyl((x * 1.25, y * 1.25 - 0.02, 1.33), 0.085, 0.2, HAIR, rot=tilt, verts=10, r2=0.0, b=0))
    out.append(cyl((0, -0.27, 1.24), 0.09, 0.2, HAIR, rot=(math.radians(62), 0, 0), verts=10, r2=0.0, b=0))
    return out


def hair_2():
    return [
        shell(0.31, (1.07, 1.05, 1.02), 0.02, HAIR),
        fringe(),
        sphere((-0.265, 0.03, 0.97), 0.13, HAIR, (0.7, 1.15, 1.45), seg=14, sub=False),
        sphere((0.265, 0.03, 0.97), 0.13, HAIR, (0.7, 1.15, 1.45), seg=14, sub=False),
        sphere((0, 0.17, 0.96), 0.24, HAIR, (1.12, 0.65, 1.05), seg=14, sub=False),
        *clumps(36, 0.055, 0.16, HAIR, zmin=1.0, seed=3, lean=1.0),
    ]


def hair_3():
    out = [shell(0.305, (1.05, 1.03, 1), 0.05, HAIR), fringe(), *clumps(30, 0.05, 0.12, HAIR, seed=4)]
    out.append(torus((0, 0.3, 1.13), 0.04, 0.016, ACC, rot=(math.radians(90), 0, 0), seg=12))
    for i, (y, z, r) in enumerate(((0.35, 1.12, 0.075), (0.41, 1.03, 0.085), (0.44, 0.92, 0.075), (0.45, 0.83, 0.05))):
        out.append(sphere((0, y, z), r, HAIR, seg=12, sub=False))
    return out


def acc_1():
    """topi"""
    return [
        shell(0.345, (1.05, 1.04, 0.95), 0.08, ACC),
        cube((0, -0.385, 1.2), (0.36, 0.24, 0.022), ACC, rot=(math.radians(-14), 0, 0), b=0.008),
        sphere((0, 0, 1.335), 0.03, SHOE, seg=10, sub=False),
    ]


def acc_2():
    """kacamata"""
    rot = (math.radians(90), 0, 0)
    out = [torus((s * 0.115, -0.285, 1.03), 0.075, 0.011, LENS, rot=rot, seg=20) for s in (-1, 1)]
    out += limb((-0.04, -0.293, 1.04), (0.04, -0.293, 1.04), 0.009, LENS)
    for s in (-1, 1):
        out += limb((s * 0.19, -0.28, 1.04), (s * 0.3, -0.05, 1.03), 0.008, LENS)
    return out


def acc_3():
    """bando"""
    t = torus((0, 0.02, 1.13), 0.3, 0.02, ACC, rot=(math.radians(-12), 0, 0), seg=28)
    t.scale = (1.06, 1.04, 1)
    return [t]


def gloves():
    """sarung tinju: hanya tampil di cabang tinju"""
    parts = []
    for side, s in (('R', -1), ('L', 1)):
        wr = (s * 0.285, 0, 0.385)
        o = [
            sphere((wr[0], wr[1] - 0.012, wr[2] - 0.075), 0.098, GLOVE, (0.95, 1.05, 1.1), seg=14, sub=False),
            sphere((wr[0] - s * 0.075, wr[1] - 0.04, wr[2] - 0.06), 0.04, GLOVE, (1, 1, 1.35), seg=10, sub=False),
            cyl((wr[0], wr[1], wr[2] + 0.005), 0.062, 0.05, CUFF, verts=12, b=0),
        ]
        parts += to(f'hand_{side}', *o)
    return join(parts, 'gloves')


def racket():
    """raket di tangan kanan: gagang menyambung dari genggaman, kepala di ujung"""
    wr = (-0.285, -0.02, 0.33)
    head_z = wr[2] - 0.46
    parts = [
        cyl((wr[0], wr[1], wr[2] - 0.13), 0.016, 0.34, FRAME, verts=8, b=0),
        cyl((wr[0], wr[1], wr[2] - 0.03), 0.024, 0.12, CUFF, verts=8, b=0),
    ]
    ring = torus((wr[0], wr[1], head_z), 0.15, 0.014, FRAME, rot=(0, math.radians(90), 0), seg=20)
    ring.scale = (1, 1, 1.25)
    net = cyl((wr[0], wr[1], head_z), 0.15, 0.003, MESH, rot=(0, math.radians(90), 0), verts=20, b=0)
    net.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    return join(to('hand_R', *parts, ring, net), 'racket')


def bow():
    """busur di tangan kiri, hanya tampil di cabang panahan"""
    wr = (0.285, -0.03, 0.335)
    limbs = tube([(wr[0], wr[1] - 0.12, wr[2] + 0.5), (wr[0], wr[1] - 0.22, wr[2] + 0.28), (wr[0], wr[1] - 0.05, wr[2]), (wr[0], wr[1] - 0.22, wr[2] - 0.28), (wr[0], wr[1] - 0.12, wr[2] - 0.5)], 0.016, WOOD, res=1, steps=6)
    cord = tube([(wr[0], wr[1] - 0.12, wr[2] + 0.5), (wr[0], wr[1] - 0.12, wr[2] - 0.5)], 0.004, STRING, res=0, steps=1)
    grip = cyl(wr, 0.024, 0.13, CUFF, verts=8, b=0)
    bpy.context.view_layer.update()
    for o in (limbs, cord):
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
    return join(to('hand_L', bpy.data.objects[limbs.name], bpy.data.objects[cord.name], grip), 'bow')


def attach(objs, name):
    for o in objs:
        if o.type == 'MESH':
            for p in o.data.polygons:
                p.use_smooth = True
    return join(to('head', *objs), name)


# ---------- tulang ----------
BONES = [
    # nama, kepala, ekor, induk
    ('root', (0, 0, 0), (0, 0, 0.1), None),
    ('hips', (0, 0, 0.42), (0, 0, 0.52), 'root'),
    ('spine', (0, 0, 0.52), (0, 0, 0.72), 'hips'),
    ('head', (0, 0, 0.74), (0, 0, 1.0), 'spine'),
]
for side, s in (('R', -1), ('L', 1)):
    BONES += [
        (f'upper_{side}', (s * 0.215, 0, 0.7), (s * 0.262, 0, 0.53), 'spine'),
        (f'fore_{side}', (s * 0.262, 0, 0.53), (s * 0.285, 0, 0.385), f'upper_{side}'),
        (f'hand_{side}', (s * 0.285, 0, 0.385), (s * 0.285, 0, 0.3), f'fore_{side}'),
        (f'thigh_{side}', (s * 0.1, 0, 0.42), (s * 0.105, 0, 0.25), 'hips'),
        (f'shin_{side}', (s * 0.105, 0, 0.25), (s * 0.105, 0, 0.1), f'thigh_{side}'),
        (f'foot_{side}', (s * 0.105, 0, 0.1), (s * 0.105, -0.12, 0.06), f'shin_{side}'),
    ]


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


def skin(o, arm):
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE')
    m.object = arm


# ---------- animasi: sudut ditulis dalam ruang armature, derajat ----------
# Karakter menghadap -Y. rx negatif = lengan/paha ke depan; rx positif pada spine = condong ke depan.
# Sisi kanan karakter ada di -X: ry positif mengangkat lengan kanan ke samping, ry negatif untuk lengan kiri.
def key(arm, frame, pose, loc=(0, 0, 0)):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        e = pose.get(pb.name, (0, 0, 0))
        R = Euler(tuple(math.radians(v) for v in e)).to_matrix().to_4x4()
        B = pb.bone.matrix_local.to_3x3().to_4x4()
        pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = arm.pose.bones['root']
    B = root.bone.matrix_local.to_3x3()
    root.location = B.inverted() @ Vector(loc)
    root.keyframe_insert('location', frame=frame)


def action(arm, name, frames):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for f, pose, *rest in frames:
        key(arm, f, pose, *rest)
    return act


REST = {'upper_L': (0, -6, 0), 'upper_R': (0, 6, 0), 'fore_L': (-10, 0, 0), 'fore_R': (-10, 0, 0)}


def p(*dicts):
    out = dict(REST)
    for d in dicts:
        out.update(d)
    return out


HOLD = {'upper_R': (-30, 12, 0), 'fore_R': (-95, 0, 0), 'upper_L': (-28, -12, 0), 'fore_L': (-92, 0, 22), 'hand_L': (0, 0, 10)}


def animate(arm):
    action(arm, 'idle', [
        (0, p({'spine': (0, 0, 0)})),
        (24, p({'spine': (3, 0, 0), 'head': (-3, 0, 0), 'upper_L': (0, -9, 0), 'upper_R': (0, 9, 0)}), (0, 0, -0.008)),
        (48, p({'spine': (0, 0, 0)})),
    ])
    ready = p(HOLD, {'spine': (10, 0, 0), 'head': (-8, 0, 0), 'thigh_L': (-8, 0, 0), 'thigh_R': (8, 0, 0), 'shin_R': (6, 0, 0)})
    action(arm, 'ready', [
        (0, ready),
        (24, p(ready, {'spine': (13, 0, 0)}), (0, 0, -0.012)),
        (48, ready),
    ])
    # langkah maju, ayun ke belakang, lepas di frame 40, gerak lanjut ke atas
    action(arm, 'bowl', [
        (0, ready),
        (12, p({'spine': (16, 0, 0), 'upper_R': (8, 8, 0), 'fore_R': (-20, 0, 0), 'upper_L': (-25, -30, 0), 'thigh_L': (-30, 0, 0), 'shin_L': (30, 0, 0), 'thigh_R': (12, 0, 0), 'shin_R': (14, 0, 0)}), (0, -0.25, -0.03)),
        (28, p({'spine': (30, 0, 0), 'head': (-22, 0, 0), 'upper_R': (62, 6, 0), 'fore_R': (-6, 0, 0), 'upper_L': (-45, -50, 0), 'thigh_R': (-22, 0, 0), 'shin_R': (50, 0, 0), 'thigh_L': (22, 0, 0), 'shin_L': (24, 0, 0)}), (0, -0.55, -0.1)),
        (40, p({'spine': (38, 0, 0), 'head': (-30, 0, 0), 'upper_R': (-22, 4, 0), 'fore_R': (-6, 0, 0), 'upper_L': (-30, -62, 0), 'thigh_L': (-58, 0, 0), 'shin_L': (70, 0, 0), 'thigh_R': (42, 0, 0), 'shin_R': (28, 0, 0)}), (0, -0.85, -0.2)),
        (52, p({'spine': (26, 0, 0), 'head': (-18, 0, 0), 'upper_R': (-128, 4, 0), 'fore_R': (-34, 0, 0), 'upper_L': (-15, -58, 0), 'thigh_L': (-50, 0, 0), 'shin_L': (60, 0, 0), 'thigh_R': (46, 0, 0), 'shin_R': (22, 0, 0)}), (0, -0.92, -0.17)),
        (72, p({'spine': (22, 0, 0), 'head': (-16, 0, 0), 'upper_R': (-112, 4, 0), 'fore_R': (-40, 0, 0), 'upper_L': (-12, -50, 0), 'thigh_L': (-46, 0, 0), 'shin_L': (54, 0, 0), 'thigh_R': (40, 0, 0), 'shin_R': (20, 0, 0)}), (0, -0.92, -0.15)),
    ])
    up = p({'upper_R': (0, 150, 0), 'upper_L': (0, -150, 0), 'fore_R': (0, 12, 0), 'fore_L': (0, -12, 0), 'head': (-14, 0, 0)})
    down = p(up, {'upper_R': (0, 118, 0), 'upper_L': (0, -118, 0), 'thigh_L': (-28, 0, 0), 'thigh_R': (-28, 0, 0), 'shin_L': (54, 0, 0), 'shin_R': (54, 0, 0), 'foot_L': (-26, 0, 0), 'foot_R': (-26, 0, 0)})
    action(arm, 'cheer', [(0, down, (0, 0, -0.1)), (8, up, (0, 0, 0.14)), (16, down, (0, 0, -0.1))])
    sad = p({'spine': (24, 0, 0), 'head': (28, 0, 0), 'upper_R': (8, 4, 0), 'upper_L': (8, -4, 0), 'fore_R': (0, 0, 0), 'fore_L': (0, 0, 0)})
    action(arm, 'sad', [
        (0, sad, (0, 0, -0.02)),
        (24, p(sad, {'head': (20, 0, 14)}), (0, 0, -0.02)),
        (48, p(sad, {'head': (20, 0, -14)}), (0, 0, -0.02)),
        (72, sad, (0, 0, -0.02)),
    ])
    a = p({'thigh_L': (-32, 0, 0), 'thigh_R': (28, 0, 0), 'shin_R': (32, 0, 0), 'upper_L': (24, -8, 0), 'upper_R': (-24, 8, 0), 'fore_L': (-24, 0, 0), 'fore_R': (-24, 0, 0)})
    b = p({'thigh_R': (-32, 0, 0), 'thigh_L': (28, 0, 0), 'shin_L': (32, 0, 0), 'upper_R': (24, 8, 0), 'upper_L': (-24, -8, 0), 'fore_L': (-24, 0, 0), 'fore_R': (-24, 0, 0)})
    action(arm, 'walk', [(0, a), (10, b, (0, 0, 0.02)), (20, a)])
    # tinju: siap, tangkis, dua pukulan (kena di frame 9), kena, dua hindar, KO
    box = p({'spine': (8, 0, 0), 'head': (-6, 0, 0), 'upper_R': (-48, 10, 0), 'fore_R': (-104, 0, 0), 'upper_L': (-48, -10, 0), 'fore_L': (-104, 0, 0),
             'thigh_L': (-14, 0, 0), 'shin_L': (16, 0, 0), 'thigh_R': (12, 0, 0), 'shin_R': (14, 0, 0)})
    action(arm, 'box', [(0, box, (0, 0, -0.02)), (12, p(box, {'spine': (11, 0, 3)}), (0.02, 0, -0.05)), (24, p(box, {'spine': (11, 0, -3)}), (-0.02, 0, -0.05)), (36, box, (0, 0, -0.02))])
    guard = p(box, {'spine': (16, 0, 0), 'head': (8, 0, 0), 'upper_R': (-62, -6, 0), 'fore_R': (-112, 0, 0), 'upper_L': (-62, 6, 0), 'fore_L': (-112, 0, 0)})
    action(arm, 'guard', [(0, guard, (0, 0, -0.06)), (12, guard, (0, 0, -0.08)), (24, guard, (0, 0, -0.06))])
    for side, s, off in (('R', 1, 'L'), ('L', -1, 'R')):
        reach = p(box, {'spine': (14, 0, s * 26), 'head': (-10, 0, -s * 18), f'upper_{side}': (-90, s * 4, 0), f'fore_{side}': (-6, 0, 0), f'upper_{off}': (-58, -s * 8, 0), f'fore_{off}': (-116, 0, 0)})
        load = p(box, {'spine': (6, 0, -s * 16), f'upper_{side}': (-22, s * 12, 0), f'fore_{side}': (-126, 0, 0)})
        action(arm, f'jab_{side}', [(0, box, (0, 0, -0.02)), (5, load, (0, 0.06, -0.05)), (9, reach, (0, -0.42, -0.04)), (12, reach, (0, -0.42, -0.04)), (20, box, (0, 0, -0.02))])
    hurt = p(box, {'spine': (-20, 0, 8), 'head': (-30, 0, 16), 'upper_R': (-20, 20, 0), 'upper_L': (-20, -20, 0), 'fore_R': (-60, 0, 0), 'fore_L': (-60, 0, 0)})
    action(arm, 'hit', [(0, box, (0, 0, -0.02)), (3, hurt, (0, 0.18, 0)), (8, hurt, (0, 0.2, -0.02)), (16, box, (0, 0, -0.02))])
    for side, s in (('L', 1), ('R', -1)):
        lean = p(box, {'spine': (10, s * 26, 0), 'head': (-4, s * 10, 0), 'thigh_L': (-14, s * 14, 0), 'thigh_R': (12, s * 14, 0)})
        action(arm, f'dodge_{side}', [(0, box, (0, 0, -0.02)), (4, lean, (s * 0.34, 0, -0.1)), (10, lean, (s * 0.36, 0, -0.1)), (16, box, (0, 0, -0.02))])
    # panahan: lengan kiri lurus ke samping-depan, tangan kanan menarik sampai dagu
    # hand_L membalik putaran lengan supaya busur tetap tegak
    bow_up = {'spine': (0, 0, 24), 'head': (0, 0, -24), 'upper_L': (-84, -10, 0), 'fore_L': (-2, 0, 0), 'hand_L': (86, 10, -24), 'thigh_L': (-6, -8, 0), 'thigh_R': (4, 8, 0)}
    aim = p(bow_up, {'upper_R': (-74, 24, 0), 'fore_R': (-16, 0, 40)})
    full = p(bow_up, {'upper_R': (-70, 60, 0), 'fore_R': (-20, 0, 128), 'hand_R': (0, 0, 20)})
    action(arm, 'bow_ready', [(0, aim), (24, p(aim, {'spine': (2, 0, 24)}), (0, 0, -0.01)), (48, aim)])
    action(arm, 'bow_draw', [(0, aim), (14, full, (0, 0, -0.02)), (30, full, (0, 0, -0.02))])
    action(arm, 'bow_loose', [(0, full, (0, 0, -0.02)), (3, p(full, {'upper_R': (-66, 92, 0), 'fore_R': (-10, 0, 90)})), (20, p(aim, {'upper_R': (-40, 80, 0), 'fore_R': (-10, 0, 40)})), (30, aim)])
    # penalti: ancang-ancang, tendang (kena di frame 16), kiper siap, menyelam, tangkap
    action(arm, 'kick', [
        (0, p({'spine': (6, 0, 0)})),
        (8, p({'spine': (14, 0, -10), 'thigh_L': (-30, 0, 0), 'shin_L': (24, 0, 0), 'thigh_R': (34, 0, 0), 'shin_R': (64, 0, 0), 'upper_L': (-30, -40, 0), 'upper_R': (20, 30, 0)}), (0, -0.55, 0.02)),
        (16, p({'spine': (-8, 0, 12), 'head': (6, 0, 0), 'thigh_L': (6, 0, 0), 'shin_L': (10, 0, 0), 'thigh_R': (-60, 0, 0), 'shin_R': (8, 0, 0), 'upper_L': (10, -50, 0), 'upper_R': (-30, 40, 0)}), (0, -1.0, 0.05)),
        (30, p({'spine': (-4, 0, 6), 'thigh_R': (-22, 0, 0), 'shin_R': (20, 0, 0), 'upper_L': (0, -20, 0), 'upper_R': (0, 20, 0)}), (0, -1.2, 0)),
    ])
    keep = p({'spine': (22, 0, 0), 'head': (-20, 0, 0), 'upper_R': (-30, 46, 0), 'upper_L': (-30, -46, 0), 'fore_R': (-40, 0, 0), 'fore_L': (-40, 0, 0), 'thigh_L': (-34, -14, 0), 'thigh_R': (-34, 14, 0), 'shin_L': (58, 0, 0), 'shin_R': (58, 0, 0), 'foot_L': (-24, 0, 0), 'foot_R': (-24, 0, 0)})
    action(arm, 'keep', [(0, keep, (0, 0, -0.1)), (10, p(keep, {'spine': (22, 0, 5)}), (0.06, 0, -0.12)), (20, p(keep, {'spine': (22, 0, -5)}), (-0.06, 0, -0.12)), (30, keep, (0, 0, -0.1))])
    for side, s in (('L', 1), ('R', -1)):
        fly = p({'root': (0, s * 74, 0), 'head': (0, -s * 20, 0), 'upper_R': (-10, 150, 0), 'upper_L': (-10, -150, 0), 'fore_R': (0, 10, 0), 'fore_L': (0, -10, 0), 'thigh_L': (-14, 0, 0), 'thigh_R': (10, 0, 0), 'shin_L': (24, 0, 0)})
        action(arm, f'dive_{side}', [(0, keep, (0, 0, -0.1)), (6, p(keep, {'root': (0, s * 34, 0)}), (s * 0.5, 0, 0.3)), (14, fly, (s * 1.5, 0, 0.5)), (24, fly, (s * 1.9, 0, 0.2)), (36, fly, (s * 2.0, 0, 0.14))])
    catch_ = p({'spine': (24, 0, 0), 'upper_R': (-82, 10, 0), 'upper_L': (-82, -10, 0), 'fore_R': (-36, 0, 0), 'fore_L': (-36, 0, 0), 'thigh_L': (-30, 0, 0), 'thigh_R': (-30, 0, 0), 'shin_L': (50, 0, 0), 'shin_R': (50, 0, 0)})
    action(arm, 'catch', [(0, keep, (0, 0, -0.1)), (8, catch_, (0, 0, 0.04)), (28, catch_, (0, 0, -0.06))])
    # raket: siap, pukulan kanan & kiri (kena di frame 10), servis/smash dari atas kepala
    rk = p({'spine': (14, 0, 0), 'head': (-10, 0, 0), 'upper_R': (-34, 24, 0), 'fore_R': (-52, 0, 0), 'upper_L': (-22, -16, 0), 'fore_L': (-50, 0, 0), 'thigh_L': (-16, -6, 0), 'thigh_R': (-16, 6, 0), 'shin_L': (28, 0, 0), 'shin_R': (28, 0, 0)})
    action(arm, 'rk_ready', [(0, rk, (0, 0, -0.05)), (10, rk, (0, 0, -0.08)), (20, rk, (0, 0, -0.05))])
    action(arm, 'swing_F', [
        (0, rk, (0, 0, -0.05)),
        (6, p(rk, {'spine': (10, 0, -36), 'upper_R': (14, 74, 0), 'fore_R': (-20, 0, 0)}), (0, 0, -0.06)),
        (10, p(rk, {'spine': (10, 0, 12), 'upper_R': (-74, 54, 0), 'fore_R': (-8, 0, 0)}), (0, -0.06, -0.06)),
        (17, p(rk, {'spine': (8, 0, 44), 'upper_R': (-106, -14, 0), 'fore_R': (-62, 0, 0)}), (0, -0.04, -0.04)),
        (26, rk, (0, 0, -0.05)),
    ])
    action(arm, 'swing_B', [
        (0, rk, (0, 0, -0.05)),
        (6, p(rk, {'spine': (10, 0, 44), 'upper_R': (-52, -46, 0), 'fore_R': (-88, 0, 0), 'upper_L': (-30, -30, 0)}), (0, 0, -0.06)),
        (10, p(rk, {'spine': (10, 0, 0), 'upper_R': (-80, 12, 0), 'fore_R': (-14, 0, 0)}), (0, -0.06, -0.06)),
        (17, p(rk, {'spine': (8, 0, -34), 'upper_R': (-104, 66, 0), 'fore_R': (-30, 0, 0)}), (0, -0.04, -0.04)),
        (26, rk, (0, 0, -0.05)),
    ])
    action(arm, 'rk_smash', [
        (0, rk, (0, 0, -0.05)),
        (6, p(rk, {'spine': (-12, 0, -14), 'upper_R': (-168, 32, 0), 'fore_R': (-46, 0, 0), 'upper_L': (-120, -20, 0), 'fore_L': (-10, 0, 0)}), (0, 0, 0.12)),
        (10, p(rk, {'spine': (18, 0, 10), 'upper_R': (-128, 10, 0), 'fore_R': (-6, 0, 0), 'upper_L': (-40, -20, 0)}), (0, -0.06, 0.16)),
        (17, p(rk, {'spine': (24, 0, 14), 'upper_R': (-24, 6, 0), 'fore_R': (-30, 0, 0)}), (0, -0.06, -0.02)),
        (26, rk, (0, 0, -0.05)),
    ])
    limp = p({'root': (-86, 0, 0), 'head': (10, 0, 0), 'upper_R': (0, 60, 0), 'upper_L': (0, -60, 0), 'fore_R': (0, 0, 0), 'fore_L': (0, 0, 0), 'thigh_L': (-8, -10, 0), 'thigh_R': (-8, 10, 0)})
    action(arm, 'ko', [(0, hurt, (0, 0.2, -0.02)), (10, p(hurt, {'root': (-30, 0, 0)}), (0, 0.32, 0)), (24, limp, (0, 0.5, 0.12)), (40, limp, (0, 0.5, 0.12))])
    arm.animation_data.action = None


def set_visible(prefix, keep):
    for o in bpy.data.objects:
        if o.name.startswith(prefix):
            on = o.name == keep
            o.hide_render = not on
            o.hide_viewport = not on


def main():
    GLB_DIR.mkdir(parents=True, exist_ok=True)
    arm = build_rig()
    body = build_body()
    skin(body, arm)
    extras = [gloves(), bow(), racket(), attach(hair_0(), 'hair_0'), attach(hair_1(), 'hair_1'), attach(hair_2(), 'hair_2'), attach(hair_3(), 'hair_3'),
              attach(acc_1(), 'acc_1'), attach(acc_2(), 'acc_2'), attach(acc_3(), 'acc_3')]
    for o in extras:
        skin(o, arm)
    animate(arm)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in [body, *extras])
    print('SEGITIGA', tris, 'badan', sum(len(p.vertices) - 2 for p in body.data.polygons))

    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    body.select_set(True)
    for o in extras:
        o.select_set(True)
    path = (GLB_DIR / 'chibi.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_materials='EXPORT')
    print('GLB', path, path.stat().st_size // 1024, 'KB')
    bpy.ops.wm.save_as_mainfile(filepath=str((OUT_DIR / 'chibi.blend').resolve()))


if __name__ == '__main__':
    main()
