# Karakter Tali Jodoh: Onde (bola merah muda bertabur wijen) dan Klepon (bola hijau berparut kelapa).
# Dimodel dan dianimasikan lewat skrip; tiap karakter diekspor ke GLB sendiri dengan klip yang sama.
# Jalankan:  python -I scripts/blender/tali_chars.py   (butuh modul bpy)
# Klip: idle run jump fall hang brace reel cheer land
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tali_lib import *  # noqa: E402,F403

FPS = 24

LOOK = {
    'onde': dict(body='#ff5fb4', shade='#e83d98', foot='#c92d80', seed='#fff1d6', blush='#ff9bcf', accent='#ffd2ea'),
    'klepon': dict(body='#4fd63c', shade='#35b22b', foot='#2a8f22', seed='#fffaf0', blush='#ff8fb8', accent='#7a4a1f'),
}


def body_parts(kind, c):
    parts = []
    body = sphere((0, 0, 0.02), 0.37, pbr(f'{kind}_kulit', c['body'], rough=0.42, coat=0.35, sheen=0.4), scale=(1, 0.94, 0.95), seg=32, sub=2)
    bake_mods(body)
    noise_verts(body, 0.006, seed=3 if kind == 'onde' else 5, scale=2)
    parts.append(body)
    rnd = random.Random(11 if kind == 'onde' else 17)
    if kind == 'onde':
        # wijen di separuh atas, menghadap keluar dari permukaan
        seed = pbr('onde_wijen', c['seed'], rough=0.35, coat=0.2)
        for _ in range(70):
            th = rnd.uniform(0, math.tau)
            ph = rnd.uniform(0.12, 1.25)
            n = Vector((math.cos(th) * math.sin(ph), math.sin(th) * math.sin(ph), math.cos(ph)))
            if n.y < -0.55 and -0.25 < n.z < 0.55:
                continue  # wajah dibiarkan bersih
            p = n * 0.36 + Vector((0, 0, 0.02))
            s = sphere(tuple(p), 0.02, seed, scale=(1, 0.45, 0.3), seg=8, sub=0)
            s.rotation_mode = 'QUATERNION'
            s.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(n) @ Euler((0, 0, rnd.uniform(0, 3))).to_quaternion()
            parts.append(s)
        # jambul kecil
        parts.append(tube([(0, 0.02, 0.36), (0.03, 0, 0.45), (0.1, -0.02, 0.48), (0.13, -0.04, 0.42)], 0.028, pbr('onde_jambul', c['shade'], rough=0.4), taper=lambda f: 1 - f * 0.6))
    else:
        # parutan kelapa: helai putih pendek menutupi bagian atas
        flake = pbr('klepon_kelapa', c['seed'], rough=0.7, sheen=0.6)
        for _ in range(150):
            th = rnd.uniform(0, math.tau)
            ph = rnd.uniform(0, 0.95)
            n = Vector((math.cos(th) * math.sin(ph), math.sin(th) * math.sin(ph), math.cos(ph)))
            p = n * 0.365 + Vector((0, 0, 0.02))
            o = cyl(tuple(p), 0.008, rnd.uniform(0.035, 0.06), flake, verts=5)
            o.rotation_mode = 'QUATERNION'
            o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((n + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)) * 0.9).normalized())
            parts.append(o)
        # lelehan gula merah
        gula = pbr('klepon_gula', c['accent'], rough=0.15, coat=1)
        for i, (x, y) in enumerate([(0.27, 0.1), (-0.25, 0.14), (0.06, 0.3)]):
            parts.append(sphere((x, y, 0.16 - i * 0.02), 0.04, gula, scale=(1, 0.8, 1.6), seg=12))
        # tunas daun pandan
        leaf = pbr('klepon_pandan', '#2f9e3a', rough=0.45, sheen=0.3)
        parts.append(tube([(0, 0, 0.36), (0.02, 0.01, 0.46), (-0.06, 0, 0.55), (-0.15, -0.02, 0.56)], 0.03, leaf, taper=lambda f: 0.3 + math.sin(f * math.pi) * 0.9))
        parts.append(tube([(0, 0, 0.36), (0.04, 0, 0.44), (0.11, 0.01, 0.48)], 0.022, leaf, taper=lambda f: 0.3 + math.sin(f * math.pi) * 0.9))
    # tali di pinggang dan simpulnya
    rope = pbr('tali_serat', '#d9a65b', rough=0.8, sheen=0.5)
    band = torus((0, 0, -0.13), 0.33, 0.024, rope, seg=36)
    band.scale = (1, 0.94, 1)
    parts.append(band)
    parts.append(sphere((0.3, 0.12, -0.13), 0.045, rope, seg=10))
    # pipi dan mulut
    blush = pbr(f'{kind}_pipi', c['blush'], rough=0.6)
    for sx in (-1, 1):
        parts.append(sphere((sx * 0.19, -0.3, -0.02), 0.055, blush, scale=(1, 0.3, 0.6), seg=12))
    mouth = pbr('mulut', '#3a1020', rough=0.4)
    parts.append(tube([(-0.045, -0.345, -0.02), (0, -0.355, -0.05), (0.045, -0.345, -0.02)], 0.011, mouth))
    return join(parts, f'{kind}_badan')


def eyes(kind):
    ink = pbr('mata', '#14101a', rough=0.08, coat=1)
    white = pbr('mata_kilau', '#ffffff', rough=0.2, emit=0.6)
    parts = []
    for sx in (-1, 1):
        parts.append(sphere((sx * 0.115, -0.31, 0.09), 0.062, ink, scale=(0.85, 0.45, 1.15), seg=16))
        parts.append(sphere((sx * 0.115 + 0.02, -0.34, 0.12), 0.019, white, seg=8))
        parts.append(sphere((sx * 0.115 - 0.015, -0.34, 0.06), 0.009, white, seg=6))
    return join(parts, f'{kind}_mata')


def limb_parts(kind, c):
    foot = pbr(f'{kind}_kaki', c['foot'], rough=0.5, coat=0.2)
    hand = pbr(f'{kind}_tangan', c['shade'], rough=0.45, coat=0.25)
    out = {}
    for side, sx in (('L', 1), ('R', -1)):
        out[f'foot.{side}'] = join([sphere((sx * 0.14, -0.06, -0.345), 0.1, foot, scale=(0.95, 1.35, 0.65), seg=16)], f'{kind}_kaki.{side}')
        out[f'hand.{side}'] = join([sphere((sx * 0.37, -0.04, -0.05), 0.075, hand, scale=(0.9, 0.9, 1.05), seg=14)], f'{kind}_tangan.{side}')
    return out


BONES = {
    'root': ((0, 0, -0.42), (0, 0, -0.32), None),
    'body': ((0, 0, -0.32), (0, 0, 0.3), 'root'),
    'eyes': ((0, -0.31, 0.04), (0, -0.31, 0.14), 'body'),
    'foot.L': ((0.14, 0, -0.42), (0.14, 0, -0.3), 'root'),
    'foot.R': ((-0.14, 0, -0.42), (-0.14, 0, -0.3), 'root'),
    'hand.L': ((0.33, 0, -0.1), (0.33, 0, 0.0), 'body'),
    'hand.R': ((-0.33, 0, -0.1), (-0.33, 0, 0.0), 'body'),
}


def rig(kind):
    arm_data = bpy.data.armatures.new(f'{kind}_rig')
    arm = bpy.data.objects.new(kind, arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (h, t, parent) in BONES.items():
        b = arm_data.edit_bones.new(name)
        b.head = h
        b.tail = t
        if parent:
            b.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def attach(arm, o, bone):
    mw = o.matrix_world.copy()
    o.parent = arm
    o.parent_type = 'BONE'
    o.parent_bone = bone
    o.matrix_world = mw


# semua tulang menghadap ke atas: lokal (x, y, z) = dunia (x, z, -y)
def W(dx=0.0, dy=0.0, dz=0.0):
    return (dx, dz, -dy)


def R(pitch=0.0, roll=0.0, yaw=0.0):
    """pitch: condong ke depan (+), roll: miring ke kanan, yaw: menoleh; derajat"""
    return (math.radians(pitch), math.radians(yaw), math.radians(-roll))


def key(arm, frame, pose):
    for bone, v in pose.items():
        pb = arm.pose.bones[bone]
        pb.rotation_mode = 'XYZ'
        pb.location = v.get('loc', (0, 0, 0))
        pb.rotation_euler = v.get('rot', (0, 0, 0))
        s = v.get('s', (1, 1, 1))
        # skala: (lebar, tinggi, tebal) dunia → lokal (x, y, z)
        pb.scale = (s[0], s[1], s[2])
        pb.keyframe_insert('location', frame=frame)
        pb.keyframe_insert('rotation_euler', frame=frame)
        pb.keyframe_insert('scale', frame=frame)


REST = {b: {} for b in BONES}


def P(**over):
    out = {b: {} for b in BONES}
    for k, v in over.items():
        out[k.replace('_', '.')] = v
    return out


def action(arm, name, frames):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data.action = act
    for f, pose in frames:
        key(arm, f, pose)
    return act


def S(w=1.0, h=1.0):
    return (w, h, w)


def animate(arm):
    arm.animation_data_create()
    blink = P(eyes={'s': (1, 0.12, 1)})
    action(arm, 'idle', [
        (0, P()),
        (12, P(body={'s': S(1.025, 0.97), 'loc': W(dz=-0.01)}, hand_L={'loc': W(dz=0.02)}, hand_R={'loc': W(dz=0.02)})),
        (24, P()),
        (36, P(body={'s': S(1.025, 0.97), 'loc': W(dz=-0.01)}, hand_L={'loc': W(dz=0.02)}, hand_R={'loc': W(dz=0.02)})),
        (40, blink),
        (42, P()),
        (48, P()),
    ])
    def run_pose(phase):
        fl = 1 if phase == 0 else -1
        return P(
            root={'loc': W(dz=0.02)},
            body={'rot': R(pitch=9), 'loc': W(dz=0.035 if phase == 0 else 0.035), 's': S(0.98, 1.03)},
            foot_L={'loc': W(dy=-0.13 * fl, dz=0.07 if fl > 0 else 0)},
            foot_R={'loc': W(dy=0.13 * fl, dz=0.07 if fl < 0 else 0)},
            hand_L={'loc': W(dy=0.1 * fl, dz=0.04)},
            hand_R={'loc': W(dy=-0.1 * fl, dz=0.04)},
        )
    down = P(root={'loc': W(dz=-0.01)}, body={'rot': R(pitch=9), 's': S(1.04, 0.95)})
    action(arm, 'run', [(0, run_pose(0)), (4, down), (8, run_pose(1)), (12, down), (16, run_pose(0))])
    up = dict(hand_L={'loc': W(dx=-0.05, dz=0.25)}, hand_R={'loc': W(dx=0.05, dz=0.25)})
    action(arm, 'jump', [
        (0, P(body={'s': S(0.9, 1.14)}, foot_L={'loc': W(dz=0.08)}, foot_R={'loc': W(dz=0.08)}, **up)),
        (8, P(body={'s': S(0.96, 1.05)}, foot_L={'loc': W(dz=0.1, dy=-0.05)}, foot_R={'loc': W(dz=0.06, dy=0.05)}, **up)),
    ])
    action(arm, 'fall', [
        (0, P(hand_L={'loc': W(dx=0.04, dz=0.3)}, hand_R={'loc': W(dx=-0.04, dz=0.24)}, foot_L={'loc': W(dz=-0.04)}, foot_R={'loc': W(dz=0.02)})),
        (6, P(hand_L={'loc': W(dx=0.04, dz=0.24)}, hand_R={'loc': W(dx=-0.04, dz=0.3)}, foot_L={'loc': W(dz=0.02)}, foot_R={'loc': W(dz=-0.04)})),
        (12, P(hand_L={'loc': W(dx=0.04, dz=0.3)}, hand_R={'loc': W(dx=-0.04, dz=0.24)}, foot_L={'loc': W(dz=-0.04)}, foot_R={'loc': W(dz=0.02)})),
    ])
    hang = lambda sway: P(  # noqa: E731
        body={'rot': R(roll=sway), 's': S(0.95, 1.08)},
        hand_L={'loc': W(dx=-0.2, dz=0.5)},
        hand_R={'loc': W(dx=0.2, dz=0.5)},
        foot_L={'loc': W(dz=-0.06, dy=-0.02 * sway)},
        foot_R={'loc': W(dz=-0.06, dy=0.02 * sway)},
    )
    action(arm, 'hang', [(0, hang(4)), (12, hang(-4)), (24, hang(4))])
    brace = lambda grip: P(  # noqa: E731
        root={'loc': W(dz=-0.04)},
        body={'rot': R(pitch=-14), 's': S(1.08, 0.87)},
        foot_L={'loc': W(dx=0.07, dy=-0.06)},
        foot_R={'loc': W(dx=-0.07, dy=0.06)},
        hand_L={'loc': W(dx=-0.12, dy=-0.22 - grip, dz=0.02)},
        hand_R={'loc': W(dx=0.12, dy=-0.18 + grip, dz=0.02)},
    )
    action(arm, 'brace', [(0, brace(0)), (12, brace(0.02)), (24, brace(0))])
    action(arm, 'reel', [(0, brace(0.12)), (6, brace(-0.12)), (12, brace(0.12))])
    cheer = lambda h, w: P(  # noqa: E731
        root={'loc': W(dz=h)},
        body={'s': S(1 / w, w)},
        hand_L={'loc': W(dx=0.05, dz=0.34)},
        hand_R={'loc': W(dx=-0.05, dz=0.34 - h)},
        foot_L={'loc': W(dz=h * 0.3)},
        foot_R={'loc': W(dz=h * 0.3)},
    )
    action(arm, 'cheer', [(0, cheer(0, 0.88)), (5, cheer(0.22, 1.1)), (10, cheer(0.3, 1.02)), (15, cheer(0.1, 1.06)), (20, cheer(0, 0.88))])
    action(arm, 'land', [(0, P(body={'s': S(1.18, 0.78)}, root={'loc': W(dz=-0.05)})), (3, P(body={'s': S(0.95, 1.06)})), (6, P())])
    arm.animation_data.action = bpy.data.actions['idle']


def build(kind):
    clear_scene()
    c = LOOK[kind]
    arm = rig(kind)
    attach(arm, body_parts(kind, c), 'body')
    attach(arm, eyes(kind), 'eyes')
    for bone, o in limb_parts(kind, c).items():
        attach(arm, o, bone)
    animate(arm)
    bpy.context.scene.render.fps = FPS
    export(OUT / 'models' / f'{kind}.glb', [arm], anim=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)


if __name__ == '__main__':
    for k in sys.argv[1:] or ['onde', 'klepon']:
        build(k)
