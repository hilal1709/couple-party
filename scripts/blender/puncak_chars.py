# Pendaki gendut Puncak Berdua: badan bulat bertulang + topi, wajah, ransel yang bisa diganti.
# Bagian tubuh terpisah dilebur jadi satu kulit (voxel remesh) dan diberi bobot dari bagian asal,
# material bernama diwarnai ulang di three.js (skin/jacket/pants/cap/pack/hair).
# Jalankan: blender --background --python scripts/blender/puncak_chars.py -- brand/illustrations/puncak src/assets/puncak/models
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sport_chars import action, bake, join, key, limb, named, skin, to, unify  # noqa: E402
from kart_lib import *  # noqa: E402,F403

import bmesh  # noqa: E402

SUB['n'] = 1
HEAD = (0, 0, 0.99)
HEAD_R = 0.275

SKIN = named('skin', '#f6c9a4', 0.55)
JACKET = named('jacket', '#ff37a6', 0.62)
PANTS = named('pants', '#3a4250', 0.75)
CAP = named('cap', '#5cf64a', 0.7)
PACK = named('pack', '#ffcc1f', 0.6)
HAIR = named('hair', '#4a2c17', 0.5, 0.2)
GLOVE_M = named('glove', '#ff6b35', 0.8)
BOOT = named('boot', '#6b4428', 0.55)
SOLE_M = named('sole', '#121212', 0.7)
EYE_M = named('eye', '#16121a', 0.15, 1.0)
WHITE = named('glint', '#ffffff', 0.2)
BLUSH_M = named('blush', '#ff8fa8', 0.7)
ROLL = named('roll', '#3a6fe0', 0.8)
STRAP = named('strap', '#121212', 0.6)
METAL = named('metal', '#d8d8d8', 0.25)
LAMP = named('lamp', '#fff4a8', 0.2)
LENS = named('lens', '#121212', 0.25, 0.8)

SH = 0.3  # lebar bahu


def smooth_all(objs):
    for o in objs:
        if o.type == 'MESH':
            for p in o.data.polygons:
                p.use_smooth = True
    return objs


def dome(center, r, scale, cut, m, seg=24):
    """kubah: bola yang bagian bawahnya dipotong pada z < cut (relatif pusat, satuan r)"""
    o = sphere(center, r, m, scale, seg=seg, sub=False)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < cut * r], context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    return o


# ---------- tubuh ----------
def build_body():
    parts = []
    head = [
        sphere(HEAD, HEAD_R, SKIN, (1.06, 1.0, 0.96), seg=32, sub=False),
        sphere((0, -0.02, 0.88), 0.2, SKIN, (1.12, 0.98, 0.72), seg=16, sub=False),  # pipi & dagu tembam
        sphere((-HEAD_R * 1.04, 0.02, 0.98), 0.055, SKIN, (0.6, 0.9, 1.1), seg=12, sub=False),
        sphere((HEAD_R * 1.04, 0.02, 0.98), 0.055, SKIN, (0.6, 0.9, 1.1), seg=12, sub=False),
        sphere((0, -0.27, 0.955), 0.042, SKIN, (1.15, 0.9, 0.95), seg=12, sub=False),  # hidung bulat
        limb((0, 0, 0.76), (0, 0, 0.8), 0.09, SKIN)[0],
    ]
    for s in (-1, 1):
        x = s * 0.11
        head.append(sphere((x, -0.247, 1.02), 0.05, WHITE, (0.95, 0.42, 1.2), seg=14, sub=False))
        head.append(sphere((x, -0.268, 1.015), 0.034, EYE_M, (0.92, 0.38, 1.15), seg=12, sub=False))
        head.append(sphere((x + 0.012, -0.283, 1.035), 0.01, WHITE, (1, 0.5, 1), seg=8, sub=False))
        head.append(sphere((s * 0.18, -0.215, 0.92), 0.05, BLUSH_M, (1.15, 0.35, 0.65), seg=10, sub=False))
        head.extend(limb((x - 0.045, -0.258, 1.1 - s * 0.004), (x + 0.045, -0.255, 1.1 + s * 0.004), 0.012, HAIR))
    head.append(tube([(-0.06, -0.262, 0.87), (0, -0.276, 0.85), (0.06, -0.262, 0.87)], 0.011, EYE_M, res=1, steps=4))
    bpy.context.view_layer.update()
    for o in head:
        if o.type == 'CURVE':
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
    parts += to('head', *head)

    # jaket gendut: perut bulat, kerah tebal
    jacket = to('spine',
                sphere((0, -0.01, 0.58), 0.3, JACKET, (1.06, 0.98, 1.0), seg=24, sub=False),
                torus((0, 0, 0.8), 0.12, 0.04, JACKET, seg=18))
    legs = to('hips', sphere((0, 0, 0.37), 0.25, PANTS, (1.0, 0.9, 0.62), seg=18, sub=False))
    arms = []
    for side, s in (('R', -1), ('L', 1)):
        sh = (s * SH, 0, 0.72)
        el = (s * 0.38, 0, 0.56)
        wr = (s * 0.41, 0, 0.43)
        jacket += to(f'upper_{side}', *limb(sh, el, 0.085, JACKET, 0.078))
        sleeve = to(f'fore_{side}', *limb(el, wr, 0.078, JACKET, 0.072))
        arms.append(unify(sleeve, f'lengan_{side}', voxel=0.012, ratio=0.2))
        # sarung tangan tebal (mitten): ibu jari terpisah
        mit = [
            sphere((wr[0], wr[1], wr[2] - 0.06), 0.085, GLOVE_M, (0.85, 0.95, 1.12), seg=14, sub=False),
            sphere((wr[0] - s * 0.055, wr[1] - 0.04, wr[2] - 0.04), 0.035, GLOVE_M, (1, 1, 1.3), seg=10, sub=False),
            torus((wr[0], wr[1], wr[2] - 0.005), 0.07, 0.022, GLOVE_M, seg=14),
        ]
        parts += [join(to(f'hand_{side}', *smooth_all(mit)), f'mitten_{side}')]
        hp = (s * 0.12, 0, 0.32)
        kn = (s * 0.13, 0, 0.2)
        an = (s * 0.13, 0, 0.1)
        legs += to(f'thigh_{side}', *limb(hp, kn, 0.1, PANTS, 0.092))
        legs += to(f'shin_{side}', *limb(kn, an, 0.09, PANTS, 0.085))
        boot = [
            cyl((s * 0.13, -0.01, 0.115), 0.09, 0.09, BOOT, verts=14, b=0.0),
            sphere((s * 0.13, -0.05, 0.065), 0.1, BOOT, (0.92, 1.45, 0.7), seg=14, sub=False),
            sphere((s * 0.13, -0.05, 0.022), 0.1, SOLE_M, (0.96, 1.5, 0.3), seg=14, sub=False),
        ]
        parts += to(f'foot_{side}', *smooth_all(boot))
    parts += [unify(jacket, 'jaket', voxel=0.013), unify(legs, 'celana', voxel=0.013), *arms]
    # ritsleting & kantong jaket menempel di badan
    zip_ = cube((0, -0.29, 0.6), (0.018, 0.02, 0.36), METAL, b=0.004)
    pocket = [cube((s * 0.14, -0.27, 0.5), (0.11, 0.03, 0.08), JACKET, rot=(math.radians(-14), 0, 0), b=0.012) for s in (-1, 1)]
    parts += to('spine', zip_, *pocket)
    return join(parts, 'body')


# ---------- ransel ----------
def backpack():
    o = [
        cube((0, 0.32, 0.62), (0.42, 0.24, 0.46), PACK, b=0.08),
        cube((0, 0.45, 0.54), (0.3, 0.08, 0.22), PACK, b=0.04),  # kantong depan
        cyl((0, 0.32, 0.92), 0.085, 0.5, ROLL, rot=(0, math.radians(90), 0), verts=16, b=0.01),  # matras gulung
        cube((0, 0.32, 0.86), (0.44, 0.27, 0.02), STRAP, b=0.0),
    ]
    for s in (-1, 1):
        o.append(cube((s * 0.17, 0.13, 0.66), (0.05, 0.1, 0.36), STRAP, b=0.01))  # tali bahu
        o.append(cyl((s * 0.22, 0.32, 0.92), 0.088, 0.03, STRAP, rot=(0, math.radians(90), 0), verts=16, b=0))
    return join(to('spine', *smooth_all(o)), 'pack')


# ---------- topi: ditampilkan satu per satu ----------
def hat_0():
    """kupluk berpompom"""
    return [
        dome((0, 0.01, HEAD[2]), 0.3, (1.06, 1.04, 1.08), 0.42, CAP),
        torus((0, 0.01, HEAD[2] + 0.14), 0.268, 0.042, CAP, seg=28),
        sphere((0, 0.03, HEAD[2] + 0.36), 0.085, WHITE, seg=14, sub=False),
    ]


def hat_1():
    """topi rimba (bucket) dengan tali dagu"""
    return [
        dome((0, 0.01, HEAD[2]), 0.3, (1.06, 1.04, 1.0), 0.44, CAP),
        cyl((0, 0.01, HEAD[2] + 0.145), 0.42, 0.025, CAP, verts=28, r2=0.36, b=0.008),
        torus((0, 0.01, HEAD[2] + 0.17), 0.275, 0.014, STRAP, seg=24),
    ]


def hat_2():
    """helm panjat dengan lampu"""
    return [
        dome((0, 0.01, HEAD[2]), 0.31, (1.06, 1.05, 1.02), 0.38, CAP),
        cyl((0, -0.27, HEAD[2] + 0.19), 0.055, 0.05, METAL, rot=(math.radians(76), 0, 0), verts=14, b=0.006),
        cyl((0, -0.3, HEAD[2] + 0.2), 0.04, 0.02, LAMP, rot=(math.radians(76), 0, 0), verts=14, b=0),
        torus((0, 0.01, HEAD[2] + 0.125), 0.29, 0.014, STRAP, seg=24),
    ]


def hat_3():
    """ikat kepala + rambut ikal pendek"""
    out = [dome(HEAD, 0.29, (1.06, 1.03, 1.0), 0.2, HAIR)]
    for i in range(9):
        a = i / 9 * math.tau
        out.append(sphere((math.cos(a) * 0.17, math.sin(a) * 0.17, HEAD[2] + 0.24), 0.08, HAIR, seg=10, sub=False))
    out.append(torus((0, 0, HEAD[2] + 0.13), 0.272, 0.03, CAP, seg=26))
    out.append(cube((0.02, 0.3, HEAD[2] + 0.06), (0.05, 0.03, 0.16), CAP, rot=(0, math.radians(20), 0), b=0.01))
    return out


# ---------- wajah tambahan ----------
def face_1():
    """kumis tebal"""
    return [sphere((s * 0.05, -0.272, 0.9), 0.05, HAIR, (1.3, 0.5, 0.55), seg=12, sub=False, rot=(0, s * math.radians(12), 0)) for s in (-1, 1)]


def face_2():
    """jenggot bulat"""
    return [sphere((0, -0.17, 0.82), 0.19, HAIR, (1.15, 0.7, 0.75), seg=16, sub=False),
            sphere((0, -0.262, 0.9), 0.06, HAIR, (1.5, 0.5, 0.45), seg=12, sub=False)]


def face_3():
    """kacamata bundar"""
    rot = (math.radians(90), 0, 0)
    out = [torus((s * 0.11, -0.275, 1.02), 0.068, 0.012, LENS, rot=rot, seg=20) for s in (-1, 1)]
    out += limb((-0.04, -0.283, 1.03), (0.04, -0.283, 1.03), 0.009, LENS)
    for s in (-1, 1):
        out += limb((s * 0.18, -0.27, 1.03), (s * 0.28, -0.05, 1.01), 0.008, LENS)
    return out


def attach(objs, name, bone='head'):
    smooth_all(objs)
    return join(to(bone, *objs), name)


# ---------- tulang ----------
BONES = [
    ('root', (0, 0, 0), (0, 0, 0.1), None),
    ('hips', (0, 0, 0.3), (0, 0, 0.42), 'root'),
    ('spine', (0, 0, 0.42), (0, 0, 0.76), 'hips'),
    ('head', (0, 0, 0.78), (0, 0, 1.05), 'spine'),
]
for side, s in (('R', -1), ('L', 1)):
    BONES += [
        (f'upper_{side}', (s * SH, 0, 0.72), (s * 0.38, 0, 0.56), 'spine'),
        (f'fore_{side}', (s * 0.38, 0, 0.56), (s * 0.41, 0, 0.43), f'upper_{side}'),
        (f'hand_{side}', (s * 0.41, 0, 0.43), (s * 0.41, 0, 0.34), f'fore_{side}'),
        (f'thigh_{side}', (s * 0.12, 0, 0.32), (s * 0.13, 0, 0.2), 'hips'),
        (f'shin_{side}', (s * 0.13, 0, 0.2), (s * 0.13, 0, 0.1), f'thigh_{side}'),
        (f'foot_{side}', (s * 0.13, 0, 0.1), (s * 0.13, -0.12, 0.05), f'shin_{side}'),
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


# ---------- animasi (derajat, ruang armature; menghadap -Y; rx negatif = ke depan/atas) ----------
REST = {'upper_L': (0, -10, 0), 'upper_R': (0, 10, 0), 'fore_L': (-12, 0, 0), 'fore_R': (-12, 0, 0)}


def p(*dicts):
    out = dict(REST)
    for d in dicts:
        out.update(d)
    return out


def animate(arm):
    action(arm, 'idle', [
        (0, p()),
        (30, p({'spine': (3, 0, 0), 'head': (-3, 0, 2), 'upper_L': (0, -13, 0), 'upper_R': (0, 13, 0)}), (0, 0, -0.01)),
        (60, p()),
    ])
    # jalan gendut: badan bergoyang ke kiri-kanan
    wa = p({'spine': (4, 0, 6), 'thigh_L': (-30, 0, 0), 'thigh_R': (26, 0, 0), 'shin_R': (30, 0, 0), 'upper_L': (22, -12, 0), 'upper_R': (-22, 12, 0)})
    wb = p({'spine': (4, 0, -6), 'thigh_R': (-30, 0, 0), 'thigh_L': (26, 0, 0), 'shin_L': (30, 0, 0), 'upper_R': (22, 12, 0), 'upper_L': (-22, -12, 0)})
    action(arm, 'walk', [(0, wa), (10, wb, (0, 0, 0.025)), (20, wa)])
    ra = p({'spine': (16, 0, 5), 'head': (-10, 0, 0), 'thigh_L': (-55, 0, 0), 'shin_L': (30, 0, 0), 'thigh_R': (40, 0, 0), 'shin_R': (70, 0, 0), 'upper_L': (40, -14, 0), 'upper_R': (-50, 14, 0), 'fore_L': (-60, 0, 0), 'fore_R': (-70, 0, 0)})
    rb = p({'spine': (16, 0, -5), 'head': (-10, 0, 0), 'thigh_R': (-55, 0, 0), 'shin_R': (30, 0, 0), 'thigh_L': (40, 0, 0), 'shin_L': (70, 0, 0), 'upper_R': (40, 14, 0), 'upper_L': (-50, -14, 0), 'fore_L': (-70, 0, 0), 'fore_R': (-60, 0, 0)})
    action(arm, 'run', [(0, ra), (7, rb, (0, 0, 0.05)), (14, ra)])
    up = p({'spine': (-6, 0, 0), 'head': (-10, 0, 0), 'upper_L': (-20, -60, 0), 'upper_R': (-20, 60, 0), 'fore_L': (-30, 0, 0), 'fore_R': (-30, 0, 0), 'thigh_L': (-40, 0, 0), 'shin_L': (70, 0, 0), 'thigh_R': (-10, 0, 0), 'shin_R': (30, 0, 0)})
    action(arm, 'jump', [(0, p({'spine': (14, 0, 0), 'thigh_L': (-30, 0, 0), 'thigh_R': (-30, 0, 0), 'shin_L': (50, 0, 0), 'shin_R': (50, 0, 0)}), (0, 0, -0.06)), (6, up), (20, up)])
    fa = p({'head': (-14, 0, 0), 'upper_L': (-60, -80, 0), 'upper_R': (-40, 80, 0), 'fore_L': (-20, 0, 0), 'fore_R': (-30, 0, 0), 'thigh_L': (-30, 0, 0), 'shin_L': (40, 0, 0), 'thigh_R': (10, 0, 0), 'shin_R': (20, 0, 0)})
    fb = p(fa, {'upper_L': (-40, -80, 0), 'upper_R': (-60, 80, 0), 'thigh_L': (10, 0, 0), 'shin_L': (20, 0, 0), 'thigh_R': (-30, 0, 0), 'shin_R': (40, 0, 0)})
    action(arm, 'fall', [(0, fa), (6, fb), (12, fa)])
    # memanjat: menghadap dinding (-Y), kedua tangan di atas kepala, kaki menapak
    ci = p({'spine': (10, 0, 0), 'head': (-24, 0, 0), 'upper_L': (-160, -14, 0), 'upper_R': (-150, 14, 0), 'fore_L': (-24, 0, 0), 'fore_R': (-30, 0, 0),
            'thigh_L': (-40, -6, 0), 'shin_L': (60, 0, 0), 'thigh_R': (-12, 6, 0), 'shin_R': (30, 0, 0), 'foot_L': (-20, 0, 0)})
    action(arm, 'climb_idle', [(0, ci), (40, p(ci, {'spine': (12, 0, 0)}), (0, 0.01, -0.01)), (80, ci)])
    c1 = p(ci, {'upper_L': (-178, -12, 0), 'fore_L': (-8, 0, 0), 'upper_R': (-120, 16, 0), 'fore_R': (-50, 0, 0), 'thigh_L': (-12, 0, 0), 'shin_L': (24, 0, 0), 'thigh_R': (-62, 0, 0), 'shin_R': (88, 0, 0), 'spine': (10, 0, 5)})
    c2 = p(ci, {'upper_R': (-178, 12, 0), 'fore_R': (-8, 0, 0), 'upper_L': (-120, -16, 0), 'fore_L': (-50, 0, 0), 'thigh_R': (-12, 0, 0), 'shin_R': (24, 0, 0), 'thigh_L': (-62, 0, 0), 'shin_L': (88, 0, 0), 'spine': (10, 0, -5)})
    action(arm, 'climb_up', [(0, c1), (12, c2, (0, 0, 0.04)), (24, c1)])
    s1 = p(ci, {'upper_L': (-140, -50, 0), 'upper_R': (-150, 30, 0), 'thigh_L': (-30, -24, 0), 'thigh_R': (-20, 10, 0), 'spine': (10, 0, 0)})
    s2 = p(ci, {'upper_L': (-150, -30, 0), 'upper_R': (-140, 50, 0), 'thigh_L': (-20, -10, 0), 'thigh_R': (-30, 24, 0), 'spine': (10, 0, 0)})
    action(arm, 'climb_side', [(0, s1), (12, s2, (0, 0, 0.02)), (24, s1)])
    crouch = p(ci, {'spine': (20, 0, 0), 'upper_L': (-120, -20, 0), 'upper_R': (-120, 20, 0), 'fore_L': (-60, 0, 0), 'fore_R': (-60, 0, 0), 'thigh_L': (-80, 0, 0), 'thigh_R': (-80, 0, 0), 'shin_L': (110, 0, 0), 'shin_R': (110, 0, 0)})
    reach = p(ci, {'spine': (0, 0, 0), 'head': (-30, 0, 0), 'upper_L': (-178, -8, 0), 'upper_R': (-178, 8, 0), 'fore_L': (0, 0, 0), 'fore_R': (0, 0, 0), 'thigh_L': (0, 0, 0), 'thigh_R': (0, 0, 0), 'shin_L': (10, 0, 0), 'shin_R': (10, 0, 0)})
    action(arm, 'lunge', [(0, crouch, (0, 0.05, -0.08)), (6, reach, (0, 0, 0.1)), (18, ci)])
    hang = p({'spine': (4, 0, 0), 'head': (-20, 0, 0), 'upper_L': (-172, -6, 0), 'upper_R': (-172, 6, 0), 'fore_L': (-6, 0, 0), 'fore_R': (-6, 0, 0), 'thigh_L': (-30, 0, 0), 'shin_L': (40, 0, 0), 'thigh_R': (-24, 0, 0), 'shin_R': (36, 0, 0)})
    action(arm, 'hang', [(0, hang), (30, p(hang, {'spine': (4, 0, 4), 'thigh_L': (-20, 0, 0)})), (60, hang)])
    sl = p({'spine': (-24, 0, 0), 'head': (-6, 0, 0), 'upper_L': (30, -60, 0), 'upper_R': (30, 60, 0), 'fore_L': (-20, 0, 0), 'fore_R': (-20, 0, 0), 'thigh_L': (-80, 0, 0), 'thigh_R': (-80, 0, 0), 'shin_L': (30, 0, 0), 'shin_R': (30, 0, 0)})
    action(arm, 'slide', [(0, sl, (0, 0, -0.16)), (8, p(sl, {'upper_L': (20, -70, 0), 'upper_R': (40, 70, 0)}), (0, 0, -0.16)), (16, sl, (0, 0, -0.16))])
    sw1 = p({'root': (-70, 0, 0), 'head': (-50, 0, 0), 'upper_L': (-170, -20, 0), 'upper_R': (-40, 20, 0), 'thigh_L': (-10, 0, 0), 'thigh_R': (14, 0, 0)})
    sw2 = p(sw1, {'upper_L': (-40, -20, 0), 'upper_R': (-170, 20, 0), 'thigh_L': (14, 0, 0), 'thigh_R': (-10, 0, 0)})
    action(arm, 'swim', [(0, sw1, (0, 0, 0.35)), (16, sw2, (0, 0, 0.35)), (32, sw1, (0, 0, 0.35))])
    cu = p({'upper_R': (0, 150, 0), 'upper_L': (0, -150, 0), 'fore_R': (0, 12, 0), 'fore_L': (0, -12, 0), 'head': (-14, 0, 0)})
    cd = p(cu, {'upper_R': (0, 118, 0), 'upper_L': (0, -118, 0), 'thigh_L': (-28, 0, 0), 'thigh_R': (-28, 0, 0), 'shin_L': (54, 0, 0), 'shin_R': (54, 0, 0), 'foot_L': (-26, 0, 0), 'foot_R': (-26, 0, 0)})
    action(arm, 'cheer', [(0, cd, (0, 0, -0.08)), (8, cu, (0, 0, 0.14)), (16, cd, (0, 0, -0.08))])
    sad = p({'spine': (24, 0, 0), 'head': (26, 0, 0), 'upper_R': (8, 4, 0), 'upper_L': (8, -4, 0), 'fore_R': (0, 0, 0), 'fore_L': (0, 0, 0)})
    action(arm, 'sad', [(0, sad, (0, 0, -0.02)), (24, p(sad, {'head': (20, 0, 14)}), (0, 0, -0.02)), (48, p(sad, {'head': (20, 0, -14)}), (0, 0, -0.02)), (72, sad, (0, 0, -0.02))])
    eat = p({'upper_R': (-70, 30, 0), 'fore_R': (-120, 0, 30), 'head': (-4, 0, 0)})
    action(arm, 'eat', [(0, eat), (8, p(eat, {'head': (6, 0, 0), 'fore_R': (-128, 0, 30)})), (16, eat)])
    pull = p({'spine': (-16, 0, 0), 'head': (12, 0, 0), 'upper_L': (-40, -8, 0), 'upper_R': (-40, 8, 0), 'fore_L': (-30, 0, 0), 'fore_R': (-30, 0, 0), 'thigh_L': (-40, 0, 0), 'shin_L': (40, 0, 0), 'thigh_R': (20, 0, 0), 'shin_R': (20, 0, 0)})
    action(arm, 'pull', [(0, pull, (0, 0.05, -0.04)), (14, p(pull, {'spine': (-26, 0, 0), 'upper_L': (-20, -8, 0), 'upper_R': (-20, 8, 0)}), (0, 0.12, -0.06)), (28, pull, (0, 0.05, -0.04))])
    hurt = p({'spine': (-20, 0, 8), 'head': (-30, 0, 16), 'upper_R': (-20, 40, 0), 'upper_L': (-20, -40, 0)})
    limp = p({'root': (-86, 0, 0), 'head': (10, 0, 0), 'upper_R': (0, 60, 0), 'upper_L': (0, -60, 0), 'fore_R': (0, 0, 0), 'fore_L': (0, 0, 0), 'thigh_L': (-8, -10, 0), 'thigh_R': (-8, 10, 0)})
    action(arm, 'ko', [(0, hurt, (0, 0.2, -0.02)), (10, p(hurt, {'root': (-30, 0, 0)}), (0, 0.32, 0)), (24, limp, (0, 0.5, 0.2)), (40, limp, (0, 0.5, 0.2))])

    # ---------- v3: transisi supaya gerak tidak patah ----------
    # belok di tempat: kaki menyeret bergantian, badan memutar duluan
    t1 = p({'spine': (2, 0, 10), 'head': (0, 0, 8), 'thigh_L': (-18, 0, 0), 'shin_L': (26, 0, 0), 'upper_L': (10, -12, 0), 'upper_R': (-6, 12, 0)})
    t2 = p({'spine': (2, 0, 10), 'head': (0, 0, 8), 'thigh_R': (-18, 0, 0), 'shin_R': (26, 0, 0), 'upper_R': (10, 12, 0), 'upper_L': (-6, -12, 0)})
    action(arm, 'turn', [(0, t1), (8, t2, (0, 0, 0.015)), (16, t1)])
    # mendarat: lutut menekuk menahan berat, tangan terayun ke depan, lalu bangkit
    sq = p({'spine': (24, 0, 0), 'head': (-14, 0, 0), 'thigh_L': (-62, 0, 0), 'thigh_R': (-62, 0, 0), 'shin_L': (100, 0, 0), 'shin_R': (100, 0, 0), 'foot_L': (-36, 0, 0), 'foot_R': (-36, 0, 0),
            'upper_L': (-50, -30, 0), 'upper_R': (-50, 30, 0), 'fore_L': (-40, 0, 0), 'fore_R': (-40, 0, 0)})
    action(arm, 'land', [(0, sq, (0, 0, -0.14)), (5, p(sq, {'spine': (16, 0, 0)}), (0, 0, -0.1)), (14, p({'spine': (4, 0, 0)}), (0, 0, -0.01)), (18, p())])
    # meraih: satu tangan menjulur jauh ke atas, badan terentang, ujung kaki berjinjit
    re = p(ci, {'spine': (2, 0, -6), 'head': (-34, 0, -6), 'upper_R': (-180, 4, 0), 'fore_R': (0, 0, 0), 'hand_R': (-20, 0, 0), 'upper_L': (-140, -18, 0), 'fore_L': (-40, 0, 0),
                'thigh_L': (-6, 0, 0), 'shin_L': (12, 0, 0), 'foot_L': (30, 0, 0), 'thigh_R': (-30, 0, 0), 'shin_R': (50, 0, 0)})
    action(arm, 'reach', [(0, re, (0, 0, 0.03)), (20, p(re, {'upper_R': (-176, 8, 0), 'hand_R': (-34, 0, 0)}), (0, 0, 0.05)), (40, re, (0, 0, 0.03))])
    # naik tepian: badan sim sendiri yang meluncur naik lalu maju (mode 'mantle'), jadi klip hanya
    # memberi pose: tangan di bibir, siku menarik, lutut naik, berdiri. Akar nyaris tidak bergeser.
    m0 = p(hang, {'head': (-30, 0, 0)})
    m1 = p({'spine': (30, 0, 0), 'head': (-20, 0, 0), 'upper_L': (-100, -20, 0), 'upper_R': (-100, 20, 0), 'fore_L': (-110, 0, 0), 'fore_R': (-110, 0, 0), 'thigh_L': (-40, 0, 0), 'shin_L': (60, 0, 0), 'thigh_R': (-10, 0, 0), 'shin_R': (30, 0, 0)})
    m2 = p({'spine': (40, 0, 0), 'head': (-24, 0, 0), 'upper_L': (-30, -30, 0), 'upper_R': (-30, 30, 0), 'fore_L': (-30, 0, 0), 'fore_R': (-30, 0, 0), 'thigh_L': (-110, 0, 0), 'shin_L': (120, 0, 0), 'thigh_R': (10, 0, 0), 'shin_R': (40, 0, 0)})
    m3 = p({'spine': (14, 0, 0), 'thigh_L': (-30, 0, 0), 'shin_L': (40, 0, 0)})
    action(arm, 'pull_up', [(0, m0, (0, 0.06, 0)), (8, m1, (0, 0.04, -0.04)), (16, m2, (0, 0.02, -0.06)), (24, m3, (0, 0, -0.02)), (30, p())])
    # tergelincir: tangan mencakar-cakar ke bawah, kaki menendang mencari pijakan
    sa = p(ci, {'upper_L': (-130, -30, 0), 'fore_L': (-60, 0, 0), 'upper_R': (-170, 20, 0), 'fore_R': (-10, 0, 0), 'thigh_L': (-60, 0, 0), 'shin_L': (90, 0, 0), 'thigh_R': (10, 0, 0), 'head': (-10, 0, 10)})
    sb = p(ci, {'upper_R': (-130, 30, 0), 'fore_R': (-60, 0, 0), 'upper_L': (-170, -20, 0), 'fore_L': (-10, 0, 0), 'thigh_R': (-60, 0, 0), 'shin_R': (90, 0, 0), 'thigh_L': (10, 0, 0), 'head': (-10, 0, -10)})
    action(arm, 'slip', [(0, sa, (0, 0, 0.02)), (4, sb, (0.02, 0, -0.03)), (8, sa, (-0.02, 0, 0.0)), (12, sb, (0, 0, -0.03)), (16, sa, (0, 0, 0.02))])
    # luka: badan membungkuk memegang pinggang, kaki kanan diseret
    ih = p({'spine': (18, 0, -8), 'head': (6, 0, -6), 'upper_R': (-10, 50, 0), 'fore_R': (-100, 0, 40), 'upper_L': (4, -16, 0), 'thigh_R': (6, 0, 0)})
    action(arm, 'idle_hurt', [(0, ih, (0, 0, -0.03)), (36, p(ih, {'spine': (22, 0, -10), 'head': (10, 0, -4)}), (0, 0, -0.05)), (72, ih, (0, 0, -0.03))])
    wh1 = p(ih, {'thigh_L': (-34, 0, 0), 'shin_L': (40, 0, 0), 'thigh_R': (14, 0, 0), 'spine': (14, 0, 8), 'upper_L': (20, -14, 0)})
    wh2 = p(ih, {'thigh_L': (16, 0, 0), 'thigh_R': (-12, 0, 0), 'shin_R': (6, 0, 0), 'spine': (24, 0, -12), 'upper_L': (-16, -14, 0)})
    action(arm, 'walk_hurt', [(0, wh1, (0, 0, 0.0)), (10, wh2, (0, 0, -0.07)), (24, wh1, (0, 0, 0.0))])
    # bangun dari pingsan: dari pose terkapar (akhir 'ko') duduk, berlutut, berdiri
    sit = p({'root': (-40, 0, 0), 'spine': (30, 0, 0), 'head': (10, 0, 0), 'thigh_L': (-50, 0, 0), 'thigh_R': (-40, 0, 0), 'shin_L': (40, 0, 0), 'upper_L': (20, -40, 0), 'upper_R': (20, 40, 0)})
    kneel = p({'spine': (30, 0, 0), 'thigh_L': (-90, 0, 0), 'shin_L': (90, 0, 0), 'thigh_R': (10, 0, 0), 'shin_R': (110, 0, 0), 'upper_R': (-40, 20, 0), 'fore_R': (-30, 0, 0)})
    action(arm, 'recover', [(0, limp, (0, 0.5, 0.2)), (12, sit, (0, 0.3, -0.1)), (24, kneel, (0, 0.05, -0.22)), (36, p({'spine': (10, 0, 0)}), (0, 0, -0.02)), (42, p())])
    arm.animation_data.action = None


def main():
    GLB_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    arm = build_rig()
    body = build_body()
    skin(body, arm)
    extras = [backpack(), attach(hat_0(), 'hat_0'), attach(hat_1(), 'hat_1'), attach(hat_2(), 'hat_2'), attach(hat_3(), 'hat_3'),
              attach(face_1(), 'face_1'), attach(face_2(), 'face_2'), attach(face_3(), 'face_3')]
    for o in extras:
        skin(o, arm)
    animate(arm)
    tris = sum(sum(len(q.vertices) - 2 for q in o.data.polygons) for o in [body, *extras])
    print('SEGITIGA', tris)
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    body.select_set(True)
    for o in extras:
        o.select_set(True)
    path = (GLB_DIR / 'pendaki.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_materials='EXPORT')
    print('GLB', path, path.stat().st_size // 1024, 'KB')
    bpy.ops.wm.save_as_mainfile(filepath=str((OUT_DIR / 'pendaki.blend').resolve()))


if __name__ == '__main__':
    main()
