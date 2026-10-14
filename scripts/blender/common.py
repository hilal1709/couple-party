# Helper bersama untuk ilustrasi Couple Party yang dimodel manual di Blender (bukan AI).
# Diimpor oleh scene.py (maskot) dan snakes.py (aset Ular Tangga).
import math

import bpy
from mathutils import Vector

PAL = {
    'electric': (0x5c, 0xf6, 0x4a),
    'grass': (0x87, 0xe7, 0x52),
    'fern': (0x43, 0xb9, 0x29),
    'petal': (0xff, 0xca, 0xe9),
    'rose': (0xff, 0x37, 0xa6),
    'ink': (0x12, 0x12, 0x12),
    'paper': (0xff, 0xf4, 0xfa),
    'yellow': (0xff, 0xcc, 0x1f),
}


def srgb(c):
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (*[lin(x) for x in c], 1.0)


# ---------- reset ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

_mats = {}


def mat(name, rough=0.55):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = srgb(PAL[name])
    bsdf.inputs['Roughness'].default_value = rough
    _mats[name] = m
    return m


def stripe_mat(a, b, name, scale=10.0):
    """Garis miring dua warna (untuk silinder Memphis)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.5
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, math.radians(35), 0)
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.inputs['Scale'].default_value = scale
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = srgb(PAL[a])
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = srgb(PAL[b])
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], wave.inputs['Vector'])
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def terrazzo_mat(base, name):
    """Terrazzo: serpihan warna dari Voronoi di atas warna dasar."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.4
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 7.0
    vor.feature = 'F1'
    noise = nt.nodes.new('ShaderNodeTexWhiteNoise')
    noise.noise_dimensions = '3D'
    cell = nt.nodes.new('ShaderNodeTexVoronoi')
    cell.inputs['Scale'].default_value = 9.0
    cell.feature = 'F1'
    # warna serpihan dari warna sel Voronoi -> ramp konstan
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].color = srgb(PAL['rose'])
    els[1].position = 0.33
    els[1].color = srgb(PAL['fern'])
    e = els.new(0.66)
    e.color = srgb(PAL['ink'])
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(vor.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Red'], ramp.inputs['Fac'])
    # serpihan hanya di sel yang jaraknya kecil (titik kecil)
    lt = nt.nodes.new('ShaderNodeMath')
    lt.operation = 'LESS_THAN'
    lt.inputs[1].default_value = 0.2
    nt.links.new(vor.outputs['Distance'], lt.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = srgb(PAL[base])
    nt.links.new(lt.outputs['Value'], mix.inputs['Factor'])
    nt.links.new(ramp.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    return m


NOLINES = bpy.data.collections.new('nolines')
scene.collection.children.link(NOLINES)
FACE_YAW = math.atan2(3.2, 6.2)  # hadapkan wajah ke kamera


def no_lines(o):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    NOLINES.objects.link(o)


def shade_smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


def add(obj, m):
    obj.data.materials.append(m)
    return obj


# ---------- benda ----------
def eye(x, y, z, parent, size=0.11, look=(0, -1, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=size, location=(x, y, z), segments=24, ring_count=16)
    e = bpy.context.object
    e.scale = (1, 0.7, 1.25)
    add(e, mat('ink', 0.2))
    shade_smooth(e)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=size * 0.32, location=(x + size * 0.3, y - size * 0.62, z + size * 0.45), segments=12, ring_count=8)
    hl = bpy.context.object
    add(hl, mat('paper', 0.1))
    for o in (e, hl):
        no_lines(o)
        o.parent = parent
        o.matrix_parent_inverse = parent.matrix_world.inverted()
    return e


def cheek(x, y, z, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(x, y, z), segments=16, ring_count=8)
    c = bpy.context.object
    c.scale = (1.4, 0.35, 0.8)
    add(c, mat('petal', 0.6) if parent.name == 'Mochi' else mat('rose', 0.6))
    no_lines(c)
    c.parent = parent
    c.matrix_parent_inverse = parent.matrix_world.inverted()


def mouth(x, y, z, parent, happy=True):
    curve = bpy.data.curves.new('mouth', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.022
    sp = curve.splines.new('BEZIER')
    sp.bezier_points.add(2)
    d = -0.07 if happy else 0.06
    pts = [(x - 0.11, y, z), (x, y, z + d), (x + 0.11, y, z)]
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('mouth', curve)
    NOLINES.objects.link(o)
    add(o, mat('ink', 0.3))
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()


def mochi(loc, tilt=0.0, happy=True):
    """Maskot 1: bulatan pink (C)."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=loc, segments=48, ring_count=32)
    b = bpy.context.object
    b.name = 'Mochi'
    b.scale = (1, 0.92, 0.9)
    add(b, mat('rose', 0.45))
    shade_smooth(b)
    x, y, z = loc
    eye(x - 0.2, y - 0.53, z + 0.12, b)
    eye(x + 0.2, y - 0.53, z + 0.12, b)
    cheek(x - 0.34, y - 0.48, z - 0.08, b)
    cheek(x + 0.34, y - 0.48, z - 0.08, b)
    mouth(x, y - 0.555, z - 0.08, b, happy)
    b.rotation_euler = (0, math.radians(tilt), FACE_YAW)
    return b


def pip(loc, tilt=0.0, happy=True):
    """Maskot 2: kapsul hijau tinggi (P)."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=loc, segments=48, ring_count=32)
    b = bpy.context.object
    b.name = 'Pip'
    b.scale = (1, 0.95, 1.75)
    add(b, mat('electric', 0.45))
    shade_smooth(b)
    x, y, z = loc
    eye(x - 0.15, y - 0.4, z + 0.32, b, 0.1)
    eye(x + 0.15, y - 0.4, z + 0.32, b, 0.1)
    cheek(x - 0.28, y - 0.37, z + 0.14, b)
    cheek(x + 0.28, y - 0.37, z + 0.14, b)
    mouth(x, y - 0.45, z + 0.13, b, happy)
    # antena squiggle kecil
    curve = bpy.data.curves.new('antena', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.03
    sp = curve.splines.new('POLY')
    pts = [(x, y, z + 0.75 + i * 0.05) for i in range(1)]
    sp.points.add(5)
    for i, p in enumerate(sp.points):
        p.co = (x + 0.06 * math.sin(i * 1.6), y, z + 0.76 + i * 0.07, 1)
    o = bpy.data.objects.new('antena', curve)
    scene.collection.objects.link(o)
    add(o, mat('ink', 0.3))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(x + 0.06 * math.sin(5 * 1.6), y, z + 0.76 + 5 * 0.07))
    ball = bpy.context.object
    add(ball, mat('yellow', 0.3))
    for o2 in (o, ball):
        o2.parent = b
        o2.matrix_parent_inverse = b.matrix_world.inverted()
    b.rotation_euler = (0, math.radians(tilt), FACE_YAW)
    return b


def pedestal(loc, w=2.6, d=1.3, h=0.35):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    p = bpy.context.object
    p.scale = (w, d, h)
    bev = p.modifiers.new('bev', 'BEVEL')
    bev.width = 0.04
    bev.segments = 3
    add(p, terrazzo_mat('paper', 'terrazzo'))
    return p


def stripe_cylinder(loc, r=0.28, h=0.9):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, vertices=48)
    c = bpy.context.object
    add(c, stripe_mat('grass', 'ink', 'stripes', 8))
    shade_smooth(c)
    return c


def cone(loc, r=0.3, h=0.7, color='rose'):
    bpy.ops.mesh.primitive_cone_add(radius1=r, depth=h, location=loc, vertices=48)
    c = bpy.context.object
    add(c, mat(color, 0.45))
    shade_smooth(c)
    return c


def squiggle_tube(loc, length=1.6, color='rose'):
    curve = bpy.data.curves.new('sq', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.06
    curve.bevel_resolution = 4
    sp = curve.splines.new('NURBS')
    n = 9
    sp.points.add(n - 1)
    for i, p in enumerate(sp.points):
        t = i / (n - 1)
        p.co = (loc[0] - length / 2 + t * length, loc[1], loc[2] + 0.13 * math.sin(t * math.pi * 4), 1)
    sp.use_endpoint_u = True
    sp.order_u = 4
    o = bpy.data.objects.new('squiggle', curve)
    scene.collection.objects.link(o)
    add(o, mat(color, 0.4))
    return o


def crown(loc):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.26, depth=0.16, location=loc, vertices=40)
    base = bpy.context.object
    add(base, mat('yellow', 0.25))
    for i in range(5):
        a = i / 5 * math.tau
        bpy.ops.mesh.primitive_cone_add(radius1=0.08, depth=0.2, location=(loc[0] + 0.22 * math.cos(a), loc[1] + 0.22 * math.sin(a), loc[2] + 0.16))
        add(bpy.context.object, mat('yellow', 0.25))
    return base


def tear(loc):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=loc)
    t = bpy.context.object
    t.scale = (0.8, 0.6, 1.3)
    add(t, srgb_mat_blue())


def srgb_mat_blue():
    m = bpy.data.materials.new('tear')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = srgb((0x2f, 0x7b, 0xff))
    return m


def ink_lines(thickness=4.0):
    """Garis tinta kartun (Freestyle) untuk semua objek kecuali koleksi NOLINES."""
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode = 'ABSOLUTE'
    scene.render.line_thickness = thickness
    fs = scene.view_layers[0].freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = srgb(PAL['ink'])[:3]
    ls.linestyle.thickness = thickness
    ls.select_by_visibility = True
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = False
    ls.select_by_collection = True
    ls.collection = NOLINES
    ls.collection_negation = 'EXCLUSIVE'


def studio(ortho_scale, res, cam_loc=(3.2, -6.2, 3.4), target=(0, 0, 0.55), line=4.0):
    """Kamera ortho, matahari, dunia pink pucat, Eevee transparan."""
    cam_data = bpy.data.cameras.get('cam') or bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.get('cam') or bpy.data.objects.new('cam', cam_data)
    if cam.name not in scene.collection.objects:
        scene.collection.objects.link(cam)
    cam.location = Vector(cam_loc)
    direction = Vector(target) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam

    if not bpy.data.objects.get('sun'):
        sun = bpy.data.lights.new('sun', 'SUN')
        sun.energy = 3.2
        sun_o = bpy.data.objects.new('sun', sun)
        sun_o.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
        scene.collection.objects.link(sun_o)

    if not scene.world:
        world = bpy.data.worlds.new('w')
        world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 0.92, 0.96, 1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
        scene.world = world

    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    ink_lines(line)


def render(out):
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out)
