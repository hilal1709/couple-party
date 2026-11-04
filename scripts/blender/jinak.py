# Aset Jinak Bom, dimodel manual lewat skrip Blender (bukan AI generatif).
# Model detail (bevel, sekrup, engsel, pegangan karet) dengan material prosedural (cat terkelupas di tepi,
# baja disikat, kuningan, plastik bertekstur, PCB, kayu, kertas) yang di-bake Cycles ke tekstur PBR per model:
# warna (dikali ambient occlusion), roughness, metallic, dan normal map. Hasilnya GLB bertekstur WebP.
#
# Jalankan (Blender biasa atau modul bpy dari PyPI):
#   blender --background --python scripts/blender/jinak.py -- [nama ...]
#   python scripts/blender/jinak.py [nama ...]          (pip install bpy)
# Tanpa nama = semua. Nama: casing panel blank timer button key terminal dial battery desk mug driver paper
#                         ill (ilustrasi tile/menang/kalah/peran, lanjutkan dengan: python -I scripts/blender/export.py jinak)
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT_MODELS = ROOT / 'src' / 'assets' / 'jinak' / 'models'
OUT_TEX = ROOT / 'src' / 'assets' / 'jinak' / 'tex'
OUT_ILL = ROOT / 'brand' / 'illustrations' / 'jinak'
BAKE_DIR = Path('/tmp/jinak-bake') if sys.platform != 'win32' else Path('D:/dev/asset-src/jinak-bake')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ONLY = set(a for a in argv if not a.endswith('.py'))
FAST = 'fast' in ONLY  # bake setengah resolusi untuk coba-coba
ONLY.discard('fast')


def want(name):
    return not ONLY or name in ONLY


# ---------- dasar ----------

def lin(h):
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        v = int(h[i:i + 2], 16) / 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = 16
    s.render.bake.margin = 6
    s.view_settings.view_transform = 'Standard'
    return s


def active(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def apply_mods(o):
    active(o)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def setmat(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    return o


def smooth(o, angle=40):
    active(o)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))


def box(name, size, loc=(0, 0, 0), bevel=0.02, seg=3, m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    active(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('bev', 'BEVEL')
        b.width = bevel
        b.segments = seg
        b.limit_method = 'ANGLE'
        apply_mods(o)
    if m:
        setmat(o, m)
    smooth(o)
    return o


def cyl(name, r, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=40, bevel=0.0, m=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.name = name
    if bevel:
        b = o.modifiers.new('bev', 'BEVEL')
        b.width = bevel
        b.segments = 3
        b.limit_method = 'ANGLE'
        apply_mods(o)
    if m:
        setmat(o, m)
    smooth(o)
    return o


def lathe(name, profile, m, seg=48):
    """profil (r, z) diputar di sumbu Z"""
    mesh = bpy.data.meshes.new(name)
    verts, faces = [], []
    n = len(profile)
    for i in range(seg):
        a = i / seg * math.tau
        for r, z in profile:
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(n - 1):
            faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
    mesh.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    setmat(o, m)
    smooth(o, 60)
    return o


def tube(name, pts, r, m, res=6):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for p, co in zip(sp.bezier_points, pts):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(m)
    active(o)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    smooth(o, 60)
    return o


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    return o


# ---------- material prosedural ----------

class M:
    """Pembungkus node tree kecil supaya material prosedural ringkas ditulis."""

    def __init__(self, name):
        self.m = bpy.data.materials.new(name)
        self.m.use_nodes = True
        self.nt = self.m.node_tree
        self.p = self.nt.nodes['Principled BSDF']
        self.coord = self.n('ShaderNodeTexCoord').outputs['Object']

    def n(self, kind, **kw):
        node = self.nt.nodes.new(kind)
        for k, v in kw.items():
            setattr(node, k, v)
        return node

    def link(self, a, b):
        self.nt.links.new(a, b)

    def mapping(self, scale=(1, 1, 1)):
        mp = self.n('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = scale
        self.link(self.coord, mp.inputs['Vector'])
        return mp.outputs['Vector']

    def noise(self, scale, detail=6.0, rough=0.55, vec=None):
        t = self.n('ShaderNodeTexNoise')
        t.inputs['Scale'].default_value = scale
        t.inputs['Detail'].default_value = detail
        t.inputs['Roughness'].default_value = rough
        self.link(vec or self.coord, t.inputs['Vector'])
        return t.outputs['Fac']

    def voronoi(self, scale, feature='F1', vec=None, metric='EUCLIDEAN'):
        t = self.n('ShaderNodeTexVoronoi', feature=feature, distance=metric)
        t.inputs['Scale'].default_value = scale
        self.link(vec or self.coord, t.inputs['Vector'])
        return t

    def ramp(self, fac, stops):
        r = self.n('ShaderNodeValToRGB')
        els = r.color_ramp.elements
        for i, (pos, col) in enumerate(stops):
            e = els[i] if i < len(els) else els.new(pos)
            e.position = pos
            e.color = col if len(col) == 4 else (*col, 1)
        self.link(fac, r.inputs['Fac'])
        return r.outputs['Color']

    def mix(self, fac, a, b):
        x = self.n('ShaderNodeMix', data_type='RGBA')
        self.link(fac, x.inputs[0]) if not isinstance(fac, float) else setattr(x.inputs[0], 'default_value', fac)
        for sock, v in ((x.inputs[6], a), (x.inputs[7], b)):
            if isinstance(v, str):
                v = lin(v)
            if isinstance(v, tuple):
                sock.default_value = v
            else:
                self.link(v, sock)
        return x.outputs[2]

    def math(self, op, a, b=0.0):
        x = self.n('ShaderNodeMath', operation=op)
        for sock, v in ((x.inputs[0], a), (x.inputs[1], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            else:
                self.link(v, sock)
        return x.outputs[0]

    def range(self, v, a, b, c=0.0, d=1.0):
        x = self.n('ShaderNodeMapRange')
        self.link(v, x.inputs['Value'])
        x.inputs['From Min'].default_value = a
        x.inputs['From Max'].default_value = b
        x.inputs['To Min'].default_value = c
        x.inputs['To Max'].default_value = d
        return x.outputs['Result']

    def bump(self, height, strength=0.3, dist=0.02):
        b = self.n('ShaderNodeBump')
        b.inputs['Strength'].default_value = strength
        b.inputs['Distance'].default_value = dist
        self.link(height, b.inputs['Height'])
        self.link(b.outputs['Normal'], self.p.inputs['Normal'])

    def set(self, sock, v):
        if isinstance(v, (int, float)):
            self.p.inputs[sock].default_value = v
        elif isinstance(v, tuple):
            self.p.inputs[sock].default_value = v
        else:
            self.link(v, self.p.inputs[sock])


def scratches(mt, scale=6.0, density=0.985):
    """garis gores halus: voronoi jarak-ke-tepi yang ditarik memanjang"""
    v = mt.voronoi(scale, 'DISTANCE_TO_EDGE', vec=mt.mapping((1, 7, 1)))
    s = mt.math('LESS_THAN', v.outputs['Distance'], 0.015)
    n = mt.range(mt.noise(3.0, 2), 0.45, 0.65)
    return mt.math('MULTIPLY', s, n)


def paint(name, color, wear=1.0):
    """cat tebal di atas logam: tepi tajam & bintik acak terkelupas jadi baja"""
    mt = M(name)
    geo = mt.n('ShaderNodeNewGeometry')
    edge = mt.range(geo.outputs['Pointiness'], 0.52, 0.6)
    chip = mt.range(mt.noise(14, 8, 0.7), 0.5, 0.75)
    mask = mt.math('MINIMUM', mt.math('MULTIPLY', mt.math('ADD', edge, mt.math('MULTIPLY', chip, 0.35)), wear), 1.0)
    mask = mt.math('GREATER_THAN', mt.math('MULTIPLY', mask, mt.range(mt.noise(30, 4), 0.3, 0.7, 0.6, 1.4)), 0.5)
    dirt = mt.range(mt.noise(2.5, 6), 0.3, 0.75)
    base = mt.mix(mt.math('MULTIPLY', dirt, 0.18), color, lin('#3b3326'))
    steel = mt.ramp(mt.noise(40, 4), [(0.3, lin('#6e7378')), (0.7, lin('#a9aeb3'))])
    mt.set('Base Color', mt.mix(mask, base, steel))
    mt.set('Metallic', mask)
    mt.set('Roughness', mt.mix(mask, mt.range(mt.noise(9, 3), 0.3, 0.7, 0.42, 0.62), (0.32, 0.32, 0.32, 1)))
    peel = mt.math('MULTIPLY', mt.math('SUBTRACT', 1.0, mask), 0.6)
    grain = mt.math('MULTIPLY', mt.noise(120, 2), 0.25)
    mt.bump(mt.math('ADD', mt.math('ADD', peel, grain), mt.math('MULTIPLY', scratches(mt, 4), -0.4)), 0.35, 0.01)
    return mt.m


def steel(name='baja', tint='#b6bbc0', brushed=True):
    mt = M(name)
    hair = mt.noise(180, 2, 0.5, vec=mt.mapping((1, 60, 1) if brushed else (1, 1, 1)))
    mt.set('Base Color', mt.ramp(hair, [(0.35, lin('#80868c')), (0.65, lin(tint))]))
    mt.set('Metallic', 1.0)
    smudge = mt.range(mt.noise(3, 5), 0.35, 0.7, 0.22, 0.42)
    mt.set('Roughness', mt.math('ADD', smudge, mt.math('MULTIPLY', scratches(mt, 5), -0.12)))
    mt.bump(mt.math('ADD', mt.math('MULTIPLY', hair, 0.2), mt.math('MULTIPLY', scratches(mt, 5), -0.6)), 0.25, 0.006)
    return mt.m


def brass(name='kuningan'):
    mt = M(name)
    tarnish = mt.range(mt.noise(6, 6), 0.35, 0.7)
    mt.set('Base Color', mt.mix(tarnish, lin('#e0b45a'), lin('#8a6a2c')))
    mt.set('Metallic', 1.0)
    mt.set('Roughness', mt.range(tarnish, 0, 1, 0.22, 0.5))
    mt.bump(mt.noise(90, 3), 0.15, 0.004)
    return mt.m


def plastic(name, color, rough=0.45, grain=0.18):
    mt = M(name)
    var = mt.range(mt.noise(5, 4), 0.3, 0.7)
    mt.set('Base Color', mt.mix(mt.math('MULTIPLY', var, 0.12), color, lin('#000000')))
    mt.set('Roughness', mt.range(var, 0, 1, rough - 0.08, rough + 0.08))
    mt.bump(mt.noise(260, 2), grain, 0.003)
    return mt.m


def rubber(name='karet', color='#1d1d20'):
    mt = M(name)
    mt.set('Base Color', mt.ramp(mt.noise(8, 4), [(0.3, lin(color)), (0.8, lin('#34343a'))]))
    mt.set('Roughness', 0.82)
    knurl = mt.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Z')
    knurl.inputs['Scale'].default_value = 26
    mt.link(mt.coord, knurl.inputs['Vector'])
    mt.bump(mt.math('ADD', mt.math('MULTIPLY', knurl.outputs['Fac'], 0.5), mt.noise(200, 2)), 0.35, 0.01)
    return mt.m


def pcb(name='pcb'):
    """papan sirkuit hijau dengan jalur tembaga & pad emas"""
    mt = M(name)
    br = mt.n('ShaderNodeTexBrick')
    br.inputs['Scale'].default_value = 9
    br.inputs['Mortar Size'].default_value = 0.012
    br.inputs['Mortar Smooth'].default_value = 0.0
    br.offset = 0.37
    br.squash = 2.4
    mt.link(mt.coord, br.inputs['Vector'])
    trace = mt.math('LESS_THAN', br.outputs['Fac'], 0.5)
    pads = mt.voronoi(18)
    pad = mt.math('LESS_THAN', pads.outputs['Distance'], 0.11)
    base = mt.ramp(mt.noise(20, 3), [(0.3, lin('#0d4a2a')), (0.7, lin('#166b3d'))])
    col = mt.mix(trace, base, lin('#2d8a4f'))
    col = mt.mix(pad, col, lin('#d8a84a'))
    mt.set('Base Color', col)
    mt.set('Metallic', pad)
    mt.set('Roughness', mt.mix(pad, (0.45, 0.45, 0.45, 1), (0.25, 0.25, 0.25, 1)))
    mt.bump(mt.math('ADD', trace, mt.math('MULTIPLY', pad, 1.6)), 0.25, 0.004)
    return mt.m


def wood(name='kayu'):
    mt = M(name)
    w = mt.n('ShaderNodeTexWave', wave_type='RINGS', rings_direction='X', wave_profile='SAW')
    w.inputs['Scale'].default_value = 1.6
    w.inputs['Distortion'].default_value = 7
    w.inputs['Detail'].default_value = 6
    w.inputs['Detail Roughness'].default_value = 0.65
    mt.link(mt.mapping((0.25, 1.6, 1)), w.inputs['Vector'])
    fine = mt.noise(60, 4, 0.6, vec=mt.mapping((0.15, 10, 1)))
    grain = mt.math('ADD', mt.math('MULTIPLY', w.outputs['Fac'], 0.7), mt.math('MULTIPLY', fine, 0.3))
    mt.set('Base Color', mt.ramp(grain, [(0.15, lin('#4a2a17')), (0.5, lin('#8a5530')), (0.85, lin('#b47a45'))]))
    mt.set('Roughness', mt.range(grain, 0, 1, 0.35, 0.6))
    mt.bump(mt.math('ADD', grain, mt.math('MULTIPLY', scratches(mt, 2), -0.5)), 0.2, 0.01)
    return mt.m


def paper(name='kertas'):
    mt = M(name)
    fib = mt.noise(140, 8, 0.7, vec=mt.mapping((1, 3, 1)))
    stain_v = mt.voronoi(2.2)
    stain = mt.math('MULTIPLY', mt.range(stain_v.outputs['Distance'], 0.25, 0.32, 1, 0), mt.range(stain_v.outputs['Distance'], 0.0, 0.3, 0.0, 1.0))
    stain = mt.math('MULTIPLY', mt.math('GREATER_THAN', stain_v.outputs['Color'], 0.82), stain)
    base = mt.ramp(mt.noise(3, 6), [(0.3, lin('#f1e6cf')), (0.7, lin('#e3d2b0'))])
    base = mt.mix(mt.math('MULTIPLY', fib, 0.25), base, lin('#c9b58c'))
    mt.set('Base Color', mt.mix(mt.math('MULTIPLY', stain, 0.55), base, lin('#8a5a2b')))
    mt.set('Roughness', 0.9)
    mt.bump(fib, 0.2, 0.004)
    return mt.m


def label(name, color, ink='#121212'):
    mt = M(name)
    var = mt.noise(40, 6)
    mt.set('Base Color', mt.mix(mt.math('MULTIPLY', var, 0.15), color, lin('#5a4a3a')))
    mt.set('Roughness', 0.55)
    mt.bump(var, 0.08, 0.003)
    return mt.m


def flat(name, color, emit=0.0, rough=0.3):
    """material polos untuk bagian yang diganti/diwarnai di three.js (layar, LED, wajah tombol)"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(color)
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = lin(color)
        p.inputs['Emission Strength'].default_value = emit
    return m


# ---------- bake ----------

def _swap_emit(mat, sock):
    nt = mat.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    e = nt.nodes.new('ShaderNodeEmission')
    e.name = '__bake'
    inp = p.inputs[sock]
    if inp.is_linked:
        nt.links.new(inp.links[0].from_socket, e.inputs['Color'])
    else:
        v = inp.default_value
        e.inputs['Color'].default_value = tuple(v) if hasattr(v, '__len__') else (v, v, v, 1)
    nt.links.new(e.outputs['Emission'], out.inputs['Surface'])


def _restore(mat):
    nt = mat.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    e = nt.nodes.get('__bake')
    if e:
        nt.nodes.remove(e)
    nt.links.new(p.outputs['BSDF'], out.inputs['Surface'])


def bake(o, name, size=1024, ao=True, ao_dist=0.25):
    """bake semua material objek ke satu set tekstur, lalu ganti dengan satu material bertekstur"""
    if FAST:
        size //= 2
    scene = bpy.context.scene
    active(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')

    imgs = {}
    for k in ('col', 'rough', 'metal', 'nor', 'ao'):
        im = bpy.data.images.new(f'{name}_{k}', size, size, alpha=False)
        if k != 'col':
            im.colorspace_settings.name = 'Non-Color'
        imgs[k] = im
    mats = [s.material for s in o.material_slots if s.material]
    nodes = {}
    for mat in mats:
        tn = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tn.name = '__target'
        nodes[mat] = tn

    def run(kind, img, swap=None, samples=1, **kw):
        scene.cycles.samples = samples
        for mat in mats:
            nodes[mat].image = img
            mat.node_tree.nodes.active = nodes[mat]
            if swap:
                _swap_emit(mat, swap)
        bpy.ops.object.bake(type=kind, use_clear=True, margin=6, **kw)
        for mat in mats:
            _restore(mat)

    run('EMIT', imgs['col'], 'Base Color', 4)
    run('EMIT', imgs['rough'], 'Roughness', 4)
    run('EMIT', imgs['metal'], 'Metallic', 4)
    run('NORMAL', imgs['nor'], None, 8, normal_space='TANGENT')
    if ao:
        scene.world = scene.world or bpy.data.worlds.new('w')
        o_ao = scene.world.light_settings
        o_ao.distance = ao_dist
        run('AO', imgs['ao'], None, 48)

    # warna × AO (dilunakkan), roughness & metallic tetap terpisah: exporter glTF menggabungkannya
    px = np.empty(size * size * 4, dtype=np.float32)
    imgs['col'].pixels.foreach_get(px)
    if ao:
        a = np.empty_like(px)
        imgs['ao'].pixels.foreach_get(a)
        k = np.power(np.clip(a[0::4], 0, 1), 0.55) * 0.85 + 0.15
        for c in range(3):
            px[c::4] *= k
    imgs['col'].pixels.foreach_set(px)

    BAKE_DIR.mkdir(parents=True, exist_ok=True)
    for k, im in imgs.items():
        im.filepath_raw = str(BAKE_DIR / f'{name}_{k}.png')
        im.file_format = 'PNG'
        im.save()

    m = bpy.data.materials.new(f'{name}')
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']

    def tex(img):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img
        return t

    nt.links.new(tex(imgs['col']).outputs['Color'], p.inputs['Base Color'])
    nt.links.new(tex(imgs['rough']).outputs['Color'], p.inputs['Roughness'])
    nt.links.new(tex(imgs['metal']).outputs['Color'], p.inputs['Metallic'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tex(imgs['nor']).outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    o.data.materials.clear()
    o.data.materials.append(m)
    return o


def export(name, objs):
    OUT_MODELS.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_MODELS / f'{name}.glb'),
        export_format='GLB',
        use_selection=True,
        export_image_format='WEBP',
        export_image_quality=86,
        export_apply=True,
        export_yup=True,
    )
    print('EXPORTED', name, flush=True)


def screws(positions, z, r=0.028, m=None, along='Y'):
    """sekrup kepala bulat dengan alur minus"""
    out = []
    m = m or steel('sekrup', '#c8ccd0', brushed=False)
    dark = plastic('alur', '#18181a', 0.6, 0)
    for x, y in positions:
        if along == 'Y':
            h = cyl('sekrup', r, 0.02, (x, z, y), (math.pi / 2, 0, 0), 20, 0.006, m)
            s = box('alur', (r * 1.6, 0.012, r * 0.3), (x, z - 0.011, y), 0, 0, dark)
            s.rotation_euler = (0, 0.6 + x * 3 + y * 5, 0)
        else:
            h = cyl('sekrup', r, 0.02, (x, y, z), (0, 0, 0), 20, 0.006, m)
            s = box('alur', (r * 1.6, r * 0.3, 0.012), (x, y, z + 0.011), 0, 0, dark)
            s.rotation_euler = (0, 0, 0.6 + x * 3 + y * 5)
        out += [h, s]
    return out


# ---------- model ----------
# Ukuran (meter Blender, glTF: Y ke atas): muka depan menghadap -Y Blender (= +Z di three.js).
SLOT = 0.8
GAP = 0.1
COLS, ROWS = 4, 2
FRONT_W = COLS * SLOT + (COLS + 1) * GAP
FRONT_H = ROWS * SLOT + (ROWS + 1) * GAP
DEPTH = 1.0


def build_casing():
    paint_m = paint('cat-hijau', lin('#2f5d2a'))
    accent = paint('cat-pink', lin('#d92b8a'), 0.6)
    st = steel('rangka')
    rb = rubber()
    parts = []
    body = box('badan', (FRONT_W, DEPTH, FRONT_H), (0, 0, 0), 0.07, 5, paint_m)
    parts.append(body)
    fy = -DEPTH / 2
    # rel baja di antara slot
    for c in range(COLS + 1):
        x = -FRONT_W / 2 + GAP / 2 + c * (SLOT + GAP)
        parts.append(box('rel-v', (GAP * 0.8, 0.05, FRONT_H - 0.04), (x, fy - 0.012, 0), 0.012, 2, st))
    for r in range(ROWS + 1):
        z = -FRONT_H / 2 + GAP / 2 + r * (SLOT + GAP)
        parts.append(box('rel-h', (FRONT_W - 0.04, 0.055, GAP * 0.8), (0, fy - 0.014, z), 0.012, 2, st))
    pts = []
    for c in range(COLS + 1):
        for r in range(ROWS + 1):
            pts.append((-FRONT_W / 2 + GAP / 2 + c * (SLOT + GAP), -FRONT_H / 2 + GAP / 2 + r * (SLOT + GAP)))
    parts += screws(pts, fy - 0.045, 0.026)
    # pelindung sudut
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                parts.append(box('sudut', (0.2, 0.2, 0.2), (sx * (FRONT_W / 2 - 0.06), sy * (DEPTH / 2 - 0.06), sz * (FRONT_H / 2 - 0.06)), 0.05, 4, st))
    # pegangan karet di kiri & kanan
    for sx in (-1, 1):
        x = sx * (FRONT_W / 2 + 0.02)
        for dy in (-0.28, 0.28):
            parts.append(box('dudukan', (0.08, 0.12, 0.16), (x, dy, 0.35), 0.02, 2, st))
        parts.append(tube('pegangan', [(x + sx * 0.02, -0.28, 0.35), (x + sx * 0.16, -0.18, 0.36), (x + sx * 0.18, 0.0, 0.37), (x + sx * 0.16, 0.18, 0.36), (x + sx * 0.02, 0.28, 0.35)], 0.04, rb))
    # garis pink peringatan di atas & bawah
    for sz in (-1, 1):
        parts.append(box('strip', (FRONT_W - 0.5, DEPTH + 0.004, 0.06), (0, 0, sz * (FRONT_H / 2 - 0.2)), 0.004, 1, accent))
    # gesper di atas
    for x in (-1.1, 1.1):
        parts.append(box('gesper', (0.22, 0.1, 0.06), (x, fy + 0.15, FRONT_H / 2 + 0.02), 0.02, 3, st))
        parts.append(cyl('engsel', 0.025, 0.24, (x, fy + 0.2, FRONT_H / 2 + 0.03), (0, math.pi / 2, 0), 16, 0, st))
    # kaki karet
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(cyl('kaki', 0.09, 0.05, (sx * 1.6, sy * 0.35, -FRONT_H / 2 - 0.02), (0, 0, 0), 24, 0.01, rb))
    # dudukan baterai di atas: rel tipis
    parts.append(box('rak-baterai', (2.2, 0.5, 0.03), (0, 0.12, FRONT_H / 2 + 0.005), 0.01, 2, st))
    o = join(parts, 'casing')
    bake(o, 'casing', 2048, ao_dist=0.35)

    # pelat seri di sisi kanan & stiker kiri: diisi kanvas di three.js
    serial = box('serial', (0.01, 0.62, 0.28), (FRONT_W / 2 + 0.006, 0.0, -0.25), 0.004, 1, flat('seri', '#f4f1e8', 0, 0.5))
    sticker_spots = []
    for i, z in enumerate((0.25, -0.25)):
        sticker_spots.append(box(f'stiker{i}', (0.008, 0.5, 0.26), (-FRONT_W / 2 - 0.005, 0.0, z), 0.003, 1, flat(f'stiker{i}', '#ffffff', 0, 0.5)))
    export('casing', [o, serial, *sticker_spots])


def plate_base(name, extra=(), led=True):
    st = steel('pelat')
    parts = [box('pelat', (SLOT, 0.05, SLOT), (0, 0, 0), 0.015, 3, st)]
    parts += screws([(-0.34, -0.34), (0.34, -0.34), (-0.34, 0.34), (0.34, 0.34)], -0.03, 0.022)
    if led:
        parts.append(cyl('rumah-led', 0.055, 0.03, (0.3, -0.035, 0.3), (math.pi / 2, 0, 0), 24, 0.008, plastic('hitam', lin('#151517'), 0.4)))
    parts += list(extra)
    o = join(parts, name)
    return o


def build_panel():
    board = box('pcb', (0.62, 0.012, 0.5), (0, -0.031, -0.06), 0.004, 1, pcb())
    chips = [box('chip', (0.12, 0.02, 0.08), (x, -0.04, -0.26), 0.004, 1, plastic('ic', lin('#1a1a1c'), 0.35)) for x in (-0.18, 0.18)]
    caps = [cyl('kapasitor', 0.025, 0.05, (x, -0.06, 0.18), (math.pi / 2, 0, 0), 16, 0.004, plastic('kap', lin('#1f4fae'), 0.3)) for x in (-0.25, 0.25)]
    o = plate_base('panel', [board, *chips, *caps])
    bake(o, 'panel', 1024, ao_dist=0.12)
    led = cyl('led', 0.04, 0.02, (0.3, -0.05, 0.3), (math.pi / 2, 0, 0), 24, 0.004, flat('led', '#222222', 0, 0.15))
    export('panel', [o, led])


def build_blank():
    st = steel('pelat-ventilasi')
    vents = [box('kisi', (0.5, 0.03, 0.035), (0, -0.035, z), 0.012, 2, plastic('kisi', lin('#202024'), 0.5)) for z in (-0.2, -0.1, 0.0, 0.1, 0.2)]
    o = plate_base('blank', vents, led=False)
    o.data.materials.append(st)
    bake(o, 'blank', 512, ao_dist=0.1)
    export('blank', [o])


def build_timer():
    house = box('rumah-layar', (0.66, 0.06, 0.36), (0, -0.045, 0.05), 0.02, 3, plastic('rumah', lin('#141416'), 0.35))
    lbl = box('label', (0.4, 0.012, 0.08), (0, -0.033, -0.25), 0.004, 1, label('label-timer', lin('#ffcc1f')))
    o = plate_base('timer', [house, lbl], led=False)
    bake(o, 'timer', 1024, ao_dist=0.1)
    screen = box('screen', (0.58, 0.005, 0.28), (0, -0.077, 0.05), 0, 0, flat('screen', '#200404', 0, 0.1))
    export('timer', [o, screen])


def build_button():
    st = steel('cincin', '#c3c7cb', brushed=False)
    ring = lathe('cincin', [(0.0, 0.0), (0.2, 0.0), (0.205, 0.03), (0.19, 0.045), (0.16, 0.045), (0.155, 0.02)], st)
    ring.rotation_euler = (math.pi / 2, 0, 0)
    o = join([ring], 'button-base')
    bake(o, 'button-base', 512, ao_dist=0.06)
    cap = lathe('cap', [(0.0, 0.11), (0.06, 0.108), (0.11, 0.1), (0.14, 0.08), (0.15, 0.05), (0.15, 0.02)], plastic('tutup', lin('#e8e8ea'), 0.32, 0.08))
    cap.rotation_euler = (math.pi / 2, 0, 0)
    cap_o = join([cap], 'cap')
    bake(cap_o, 'button-cap', 512, ao=False)
    strip = box('strip', (0.07, 0.01, 0.5), (0.0, 0.0, 0.0), 0.003, 1, flat('strip', '#333333', 0, 0.2))
    strip.location = (0.3, -0.01, 0)
    export('button', [o, cap_o, strip])


def build_key():
    k = box('key', (0.2, 0.08, 0.2), (0, 0, 0), 0.03, 4, plastic('tuts', lin('#efe6d2'), 0.4, 0.12))
    o = join([k], 'key')
    bake(o, 'key', 512, ao_dist=0.04)
    face = box('face', (0.15, 0.002, 0.15), (0, -0.041, 0), 0, 0, flat('face', '#ffffff', 0, 0.4))
    export('key', [o, face])


def build_terminal():
    b = brass()
    hexnut = cyl('mur', 0.032, 0.025, (0, 0, 0.0125), (0, 0, 0), 6, 0.004, b)
    post = cyl('tiang', 0.016, 0.07, (0, 0, 0.05), (0, 0, 0), 16, 0.004, b)
    o = join([hexnut, post], 'terminal')
    o.rotation_euler = (math.pi / 2, 0, 0)
    bake(o, 'terminal', 256, ao_dist=0.03)
    export('terminal', [o])


def build_dial():
    st = steel('roda', '#9da3a8', brushed=False)
    # roda bergerigi: silinder 48 sisi, rusuk tiap sisi ganjil ditarik keluar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.12, vertices=48, rotation=(0, math.pi / 2, 0))
    w = bpy.context.object
    w.name = 'roda'
    me = w.data
    for i, v in enumerate(me.vertices):
        if (i // 2) % 2 == 0:
            v.co.x *= 1.08
            v.co.y *= 1.08
    b = w.modifiers.new('bev', 'BEVEL')
    b.width = 0.006
    b.segments = 2
    apply_mods(w)
    setmat(w, st)
    smooth(w, 30)
    o = join([w], 'dial')
    bake(o, 'dial', 512, ao_dist=0.03)
    export('dial', [o])


def build_battery():
    body = cyl('badan', 0.07, 0.36, (0, 0, 0), (0, math.pi / 2, 0), 40, 0.01, label('label-baterai', lin('#ff37a6')))
    band = cyl('pita', 0.0705, 0.12, (0.06, 0, 0), (0, math.pi / 2, 0), 40, 0, label('pita', lin('#121212')))
    capm = steel('kutub', '#d6d9dc', brushed=False)
    cap1 = cyl('kutub+', 0.03, 0.03, (0.19, 0, 0), (0, math.pi / 2, 0), 24, 0.006, capm)
    cap2 = cyl('kutub-', 0.065, 0.012, (-0.183, 0, 0), (0, math.pi / 2, 0), 32, 0.004, capm)
    o = join([body, band, cap1, cap2], 'battery')
    bake(o, 'battery', 512, ao_dist=0.05)
    export('battery', [o])


def build_desk():
    top = box('meja', (12, 8, 0.2), (0, 0, -0.1), 0.03, 2, wood())
    o = join([top], 'desk')
    bake(o, 'desk', 2048, ao=False)
    export('desk', [o])


def build_mug():
    cer = plastic('keramik', lin('#ff37a6'), 0.18, 0.03)
    prof = [(0.0, 0.0), (0.2, 0.0), (0.21, 0.02), (0.22, 0.4), (0.24, 0.43), (0.22, 0.44), (0.19, 0.42), (0.18, 0.05), (0.0, 0.05)]
    body = lathe('cangkir', prof, cer)
    handle = tube('gagang', [(0.2, 0, 0.33), (0.33, 0, 0.32), (0.35, 0, 0.2), (0.3, 0, 0.1), (0.2, 0, 0.1)], 0.03, cer)
    cof = cyl('kopi', 0.185, 0.01, (0, 0, 0.35), (0, 0, 0), 40, 0, plastic('kopi', lin('#2a160b'), 0.08, 0.02))
    o = join([body, handle, cof], 'mug')
    bake(o, 'mug', 512, ao_dist=0.1)
    export('mug', [o])


def build_driver():
    hm = plastic('gagang-obeng', lin('#ffcc1f'), 0.35, 0.1)
    handle = lathe('gagang', [(0.0, 0.0), (0.05, 0.0), (0.06, 0.03), (0.062, 0.25), (0.05, 0.3), (0.03, 0.33), (0.0, 0.33)], hm)
    stripe = cyl('pita', 0.063, 0.04, (0, 0, 0.12), (0, 0, 0), 32, 0, rubber('karet-obeng', '#121212'))
    shaft = cyl('batang', 0.012, 0.4, (0, 0, 0.53), (0, 0, 0), 16, 0.002, steel('batang'))
    tip = box('ujung', (0.03, 0.006, 0.05), (0, 0, 0.75), 0.002, 1, steel('ujung'))
    o = join([handle, stripe, shaft, tip], 'driver')
    o.rotation_euler = (0, math.pi / 2, 0)
    bake(o, 'driver', 512, ao_dist=0.04)
    export('driver', [o])


def build_paper():
    """tekstur kertas buku panduan, langsung WebP (bukan model)"""
    bpy.ops.mesh.primitive_plane_add(size=2)
    o = bpy.context.object
    setmat(o, paper())
    bake(o, 'paper', 1024, ao=False)
    OUT_TEX.mkdir(parents=True, exist_ok=True)
    src = BAKE_DIR / 'paper_col.png'
    try:
        from PIL import Image
        Image.open(src).convert('RGB').save(OUT_TEX / 'paper.webp', 'WEBP', quality=84, method=6)
    except ImportError:
        im = bpy.data.images.load(str(src))
        im.file_format = 'WEBP'
        im.save_render(str(OUT_TEX / 'paper.webp'))
    print('EXPORTED paper', flush=True)


BUILDERS = {
    'casing': build_casing,
    'panel': build_panel,
    'blank': build_blank,
    'timer': build_timer,
    'button': build_button,
    'key': build_key,
    'terminal': build_terminal,
    'dial': build_dial,
    'battery': build_battery,
    'desk': build_desk,
    'mug': build_mug,
    'driver': build_driver,
    'paper': build_paper,
}

if True:  # jalan sebagai skrip Blender maupun modul bpy
    for nm, fn in BUILDERS.items():
        if want(nm):
            reset()
            fn()
    if want('ill'):
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import jinak_ill  # noqa: E402

        jinak_ill.main(OUT_ILL, OUT_MODELS)
