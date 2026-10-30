# Pustaka bersama skrip Blender Kart Kacau (kart_items.py, kart_hazards.py, kart_world2.py):
# material PBR, primitif halus bersubdivisi, tabung kurva, teks 3D, induk bernama, ekspor GLB.
# Argumen setelah `--`: <folder-png> <folder-glb> [nama ...]
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['brand/illustrations/kart', 'src/assets/kart/models']
OUT_DIR = Path(argv[0])
GLB_DIR = Path(argv[1])
ONLY = set(argv[2:])
SUB = {'n': 2}
_mats = {}


def pbr(color, rough=0.5, metal=0.0, emit=0.0, alpha=1.0, coat=0.0):
    key = (color, rough, metal, emit, alpha, coat)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(f'm{len(_mats)}')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    rgb = srgb(tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)))
    b.inputs['Base Color'].default_value = rgb
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = rgb
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    _mats[key] = m
    return m


def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'sun'):
            bpy.data.objects.remove(o, do_unlink=True)


def last():
    return bpy.context.object


def smooth(o, level=None):
    lv = SUB['n'] if level is None else level
    if lv:
        m = o.modifiers.new('sub', 'SUBSURF')
        m.levels = m.render_levels = lv
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def bev(o, w=0.04, seg=3):
    m = o.modifiers.new('bev', 'BEVEL')
    m.width = w
    m.segments = seg
    m.limit_method = 'ANGLE'
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def sphere(loc, r, mat, scale=(1, 1, 1), seg=24, sub=True, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=max(8, seg // 2), rotation=rot)
    o = last()
    o.data.materials.append(mat)
    o.scale = scale
    return smooth(o, None if sub else 0)


def cube(loc, size, mat, rot=(0, 0, 0), b=0.05, sub=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = last()
    o.scale = size
    o.data.materials.append(mat)
    bpy.ops.object.transform_apply(scale=True)
    return smooth(o) if sub else (bev(o, b) if b else o)


def cyl(loc, r, h, mat, rot=(0, 0, 0), verts=24, r2=None, b=0.02):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    o = last()
    o.data.materials.append(mat)
    return bev(o, b, 2) if b else smooth(o, 0)


def torus(loc, R, r, mat, rot=(0, 0, 0), seg=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=seg, minor_segments=12)
    o = last()
    o.data.materials.append(mat)
    return smooth(o, 0)


def tube(points, r, mat, res=3, steps=12):
    cu = bpy.data.curves.new('tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = res
    cu.resolution_u = steps
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, co in zip(sp.bezier_points, points):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('tube', cu)
    scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def text3d(body, loc, size, mat, extrude=0.08, rot=(math.radians(90), 0, 0)):
    cu = bpy.data.curves.new('teks', 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = 0.02
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('teks', cu)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.location = loc
    return e


def parent(children, p):
    bpy.context.view_layer.update()
    for c in children:
        mw = c.matrix_world.copy()
        c.parent = p
        c.matrix_world = mw
    return p


def eyes_on(x, y, z, r, look=(0, -1)):
    """sepasang mata kartun menghadap -Y"""
    out = []
    for s in (-1, 1):
        out.append(sphere((x + s * r * 1.2, y, z), r, pbr('#ffffff', 0.2, coat=0.6), (1, 0.6, 1.2)))
        out.append(sphere((x + s * r * 1.2, y - r * 0.5, z - r * 0.1), r * 0.55, pbr('#0a0a10', 0.2, coat=1), (1, 0.5, 1.2), sub=False))
        out.append(sphere((x + s * r * 1.2 + r * 0.2, y - r * 0.8, z + r * 0.25), r * 0.18, pbr('#ffffff', 0.1, emit=2), sub=False))
    return out



def to_meshes():
    bpy.ops.object.select_all(action='DESELECT')
    objs = [o for o in bpy.data.objects if o.type in ('CURVE', 'FONT')]
    for o in objs:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    if objs:
        bpy.ops.object.convert(target='MESH')


def export(name):
    to_meshes()
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.name not in ('cam', 'sun'):
            o.select_set(True)
    path = (GLB_DIR / f'{name}.glb').resolve()
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT')
    print('GLB', path)




def reset():
    """kosongkan adegan & cache material sebelum membangun model berikutnya"""
    _mats.clear()
    clear()

def rock(loc, r, mat, scale=(1, 1, 1), seed=0, sub=1):
    """batu tak beraturan: ico sphere dengan titik digeser acak lalu dihaluskan sedikit"""
    import random
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=2, location=loc)
    o = last()
    for v in o.data.vertices:
        v.co *= 0.82 + rnd.random() * 0.36
    o.scale = scale
    o.data.materials.append(mat)
    m = o.modifiers.new('sub', 'SUBSURF')
    m.levels = m.render_levels = sub
    return o
