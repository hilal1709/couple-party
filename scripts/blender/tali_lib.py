# Pustaka bersama skrip Blender Tali Jodoh: material PBR, primitif halus, gabung objek, ekspor GLB.
# Semua dimodel lewat skrip (bukan AI generatif). Sumbu Blender Z ke atas; ekspor glTF menjadi Y ke atas.
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import bpy, srgb  # noqa: E402  (common mereset scene)

import bmesh  # noqa: E402
from mathutils import Euler, Matrix, Vector  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src' / 'assets' / 'tali'
_mats: dict = {}


def hexrgb(c):
    return srgb(tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)))


def pbr(name, color, rough=0.55, metal=0.0, emit=0.0, coat=0.0, sheen=0.0, alpha=1.0):
    """Material Principled; nama material dibaca shader di three.js (awalan glow_, sway_, kaca_)."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    rgb = hexrgb(color)
    b.inputs['Base Color'].default_value = rgb
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen
    if emit:
        b.inputs['Emission Color'].default_value = rgb
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    _mats[name] = m
    return m


def last():
    return bpy.context.object


def shade(o, sub=2, smooth=True):
    if sub:
        m = o.modifiers.new('sub', 'SUBSURF')
        m.levels = m.render_levels = sub
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def bevel(o, w=0.03, seg=3):
    m = o.modifiers.new('bev', 'BEVEL')
    m.width = w
    m.segments = seg
    m.limit_method = 'ANGLE'
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def sphere(loc, r, mat, scale=(1, 1, 1), seg=20, sub=1, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=max(8, seg // 2), rotation=rot)
    o = last()
    o.data.materials.append(mat)
    o.scale = scale
    return shade(o, sub)


def cube(loc, size, mat, rot=(0, 0, 0), bev=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = last()
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return bevel(o, bev) if bev else o


def cyl(loc, r, depth, mat, rot=(0, 0, 0), verts=16, bev=0.0, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = last()
    o.data.materials.append(mat)
    if bev:
        bevel(o, bev)
    else:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def torus(loc, R, r, mat, rot=(0, 0, 0), seg=24, mseg=10):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=seg, minor_segments=mseg)
    o = last()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def tube(points, r, mat, res=6, taper=None, closed=False):
    """kurva bezier halus melewati titik-titik, diberi ketebalan"""
    cu = bpy.data.curves.new('tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    cu.resolution_u = res
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS')
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (*p, 1)
    sp.use_endpoint_u = True
    sp.order_u = min(4, len(points))
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new('tube', cu)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    if taper:
        for i, p in enumerate(sp.points):
            p.radius = taper(i / max(1, len(points) - 1))
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = last()
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def bake_mods(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def join(objs, name):
    """terapkan modifier lalu gabung jadi satu objek bernama"""
    objs = [o for o in objs if o]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        if o.type != 'MESH':
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
        bake_mods(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = last()
    o.name = name
    o.data.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def at_origin(o, pivot=(0, 0, 0)):
    """geser titik asal objek ke `pivot` (koordinat dunia), lalu taruh objek di (0,0,0)"""
    pv = Vector(pivot)
    o.data.transform(Matrix.Translation(-pv))
    o.location = (0, 0, 0)
    return o


def noise_verts(o, amp, seed=1, scale=1.0):
    """geser tiap verteks sedikit secara acak tapi mulus (bentuk organik, tidak kaku)"""
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    for v in o.data.vertices:
        p = v.co
        n = (math.sin(p.x * 3.1 * scale + ph[0]) * math.cos(p.y * 2.7 * scale + ph[1]) + math.sin(p.z * 3.7 * scale + ph[2]) * 0.6 + math.sin((p.x + p.y) * 7.3 * scale + ph[3]) * 0.3) / 1.9
        v.co = p + v.normal * n * amp
    return o


def scatter(fn, n, seed, xr, yr, zr=(0, 0)):
    rnd = random.Random(seed)
    return [fn(rnd, (rnd.uniform(*xr), rnd.uniform(*yr), rnd.uniform(*zr))) for _ in range(n)]


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def export(path: Path, objs=None, anim=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    if objs:
        for o in objs:
            o.select_set(True)
            for c in o.children_recursive:
                c.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format='GLB',
        use_selection=bool(objs),
        export_apply=True,
        export_animations=anim,
        export_animation_mode='ACTIONS' if anim else 'ACTIONS',
        export_force_sampling=True,
        export_draco_mesh_compression_enable=False,
        export_yup=True,
    )
    print('ekspor', path, round(path.stat().st_size / 1024), 'KB', flush=True)


__all__ = ['bpy', 'bmesh', 'math', 'random', 'Vector', 'Matrix', 'Euler', 'OUT', 'ROOT', 'pbr', 'hexrgb', 'last', 'shade', 'bevel', 'sphere', 'cube', 'cyl', 'torus', 'tube', 'join', 'at_origin', 'noise_verts', 'scatter', 'clear_scene', 'export', 'bake_mods']
