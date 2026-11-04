# Tekstur prosedural Tali Jodoh yang di-bake Cycles jadi gambar tileable 512 px:
# genteng (atap), anyaman bambu, dan kain batik. Warna (_diff) dan normal (_nor) disimpan WebP.
# Tekstur lain (tanah, batu, kayu, logam) memakai ulang tekstur CC0 Poly Haven di src/assets/kart & sport.
# Jalankan: python -I scripts/blender/tali_textures.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tali_lib import *  # noqa: E402,F403

SIZE = 512
DEST = OUT / 'tex'


def node(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    for k, v in inputs.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def ramp(nt, stops):
    r = nt.nodes.new('ShaderNodeValToRGB')
    els = r.color_ramp.elements
    while len(els) > len(stops):
        els.remove(els[-1])
    while len(els) < len(stops):
        els.new(0.5)
    for e, (pos, col) in zip(els, stops):
        e.position = pos
        e.color = hexrgb(col)
    return r


def material(name, build):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    out = nt.nodes['Material Output']
    bsdf = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    color, height = build(nt, tc.outputs['UV'])
    nt.links.new(color, bsdf.inputs['Base Color'])
    bump = node(nt, 'ShaderNodeBump', Strength=1.0, Distance=0.02)
    nt.links.new(height, bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    # warna dibake lewat emisi supaya tanpa bayangan
    emit = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(color, emit.inputs['Color'])
    m['emit'] = emit.name
    m['bsdf'] = bsdf.name
    m['out'] = out.name
    return m


def genteng(nt, uv):
    brick = node(nt, 'ShaderNodeTexBrick', Scale=1.0, offset=0.5, offset_frequency=2, squash=1.0, squash_frequency=1)
    brick.inputs['Mortar Size'].default_value = 0.012
    brick.inputs['Brick Width'].default_value = 0.25
    brick.inputs['Row Height'].default_value = 0.125
    brick.inputs['Color1'].default_value = hexrgb('#c0582f')
    brick.inputs['Color2'].default_value = hexrgb('#9d4424')
    brick.inputs['Mortar'].default_value = hexrgb('#4a2214')
    nt.links.new(uv, brick.inputs['Vector'])
    # tiap baris genteng melengkung: gelombang gergaji searah V
    wave = node(nt, 'ShaderNodeTexWave', wave_type='BANDS', bands_direction='Y', wave_profile='SAW', Scale=8.0 / 1.0)
    wave.inputs['Distortion'].default_value = 0
    nt.links.new(uv, wave.inputs['Vector'])
    curve = node(nt, 'ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', wave_profile='SIN', Scale=4.0)
    nt.links.new(uv, curve.inputs['Vector'])
    mix = node(nt, 'ShaderNodeMath', operation='MULTIPLY')
    nt.links.new(wave.outputs['Fac'], mix.inputs[0])
    nt.links.new(curve.outputs['Fac'], mix.inputs[1])
    col = node(nt, 'ShaderNodeMixRGB', blend_type='MULTIPLY', Fac=0.35)
    nt.links.new(brick.outputs['Color'], col.inputs['Color1'])
    nt.links.new(wave.outputs['Color'], col.inputs['Color2'])
    h = node(nt, 'ShaderNodeMath', operation='ADD')
    nt.links.new(mix.outputs[0], h.inputs[0])
    nt.links.new(brick.outputs['Fac'], h.inputs[1])
    return col.outputs['Color'], h.outputs[0]


def bambu(nt, uv):
    # anyaman: pita mendatar dan tegak bergantian seperti papan catur
    ch = node(nt, 'ShaderNodeTexChecker', Scale=8.0)
    ch.inputs['Color1'].default_value = (1, 1, 1, 1)
    ch.inputs['Color2'].default_value = (0, 0, 0, 1)
    nt.links.new(uv, ch.inputs['Vector'])
    wx = node(nt, 'ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', wave_profile='SIN', Scale=16.0)
    wy = node(nt, 'ShaderNodeTexWave', wave_type='BANDS', bands_direction='Y', wave_profile='SIN', Scale=16.0)
    for w in (wx, wy):
        w.inputs['Distortion'].default_value = 0
        nt.links.new(uv, w.inputs['Vector'])
    sel = node(nt, 'ShaderNodeMix', data_type='FLOAT')
    nt.links.new(ch.outputs['Fac'], sel.inputs['Factor'])
    nt.links.new(wx.outputs['Fac'], sel.inputs['A'])
    nt.links.new(wy.outputs['Fac'], sel.inputs['B'])
    r = ramp(nt, [(0.0, '#6e5a26'), (0.45, '#b99a52'), (1.0, '#e3cd8a')])
    nt.links.new(sel.outputs['Result'], r.inputs['Fac'])
    return r.outputs['Color'], sel.outputs['Result']


def batik(nt, uv):
    vor = node(nt, 'ShaderNodeTexVoronoi', Scale=6.0, feature='F1', distance='EUCLIDEAN')
    vor.inputs['Randomness'].default_value = 0.0
    nt.links.new(uv, vor.inputs['Vector'])
    rings = node(nt, 'ShaderNodeMath', operation='SINE')
    mul = node(nt, 'ShaderNodeMath', operation='MULTIPLY', )
    mul.inputs[1].default_value = 28.0
    nt.links.new(vor.outputs['Distance'], mul.inputs[0])
    nt.links.new(mul.outputs[0], rings.inputs[0])
    kawung = ramp(nt, [(0.0, '#ff37a6'), (0.48, '#ff37a6'), (0.52, '#ffcae9'), (0.8, '#ffcae9'), (0.86, '#43b929')])
    nt.links.new(rings.outputs[0], kawung.inputs['Fac'])
    return kawung.outputs['Color'], rings.outputs[0]


def bake(name, build):
    clear_scene()
    bpy.ops.mesh.primitive_plane_add(size=1)
    plane = last()
    m = material(name, build)
    plane.data.materials.append(m)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 4
    nt = m.node_tree
    out = nt.nodes[m['out']]
    for kind in ('diff', 'nor'):
        img = bpy.data.images.new(f'{name}_{kind}', SIZE, SIZE, alpha=False, float_buffer=False)
        if kind == 'nor':
            img.colorspace_settings.name = 'Non-Color'
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        nt.nodes.active = tex
        if kind == 'diff':
            nt.links.new(nt.nodes[m['emit']].outputs[0], out.inputs['Surface'])
            bpy.ops.object.bake(type='EMIT', margin=0)
        else:
            nt.links.new(nt.nodes[m['bsdf']].outputs[0], out.inputs['Surface'])
            bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', margin=0)
        DEST.mkdir(parents=True, exist_ok=True)
        png = DEST / f'{name}_{kind}.png'
        img.filepath_raw = str(png)
        img.file_format = 'PNG'
        img.save()
        nt.nodes.remove(tex)
        print('bake', png, flush=True)


if __name__ == '__main__':
    for name, fn in (('genteng', genteng), ('bambu', bambu), ('batik', batik)):
        bake(name, fn)
