# Pustaka map Petak Cat: material Poly Haven, kotak ber-UV skala meter, data tabrakan/titik sembunyi,
# satu lightmap untuk seluruh map (bake Cycles), lalu ekspor <map>.glb + <map>-lm.webp + <map>.json.
# Semua benda statis digabung jadi satu mesh; nama material memberi tahu shader di three.js:
#   sway_* bergoyang angin (UV ketiga berisi amplitudo), neon_* berkedip, air_* beriak.
# Sumbu Blender (x, y, z) menjadi three (x, z, -y).
import json
import math
import random
import sys
from contextlib import contextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kart_lib import GLB_DIR, argv, bpy, last, scene, srgb  # noqa: E402

import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

SRC = Path('D:/dev/asset-src/polyhaven')
# harus sama dengan LM_RANGE di src/games/petak/render/world.ts
LM_RANGE = 3.0
LM_SIZE = 2048
BEVEL = 0.012
MODELS = SRC / 'models'
SAMPLES = int(argv[2]) if len(argv) > 2 and argv[2].isdigit() else 96


def rgb(color):
    return srgb(tuple(int(color[i:i + 2], 16) for i in (1, 3, 5)))


def noise(size, rng, cells=8, octaves=4):
    """derau halus berulang, 0..1, untuk decal dan kotoran"""
    out = np.zeros((size, size), dtype=np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = cells * 2 ** o
        grid = rng.random((n, n)).astype(np.float32)
        xs = np.arange(size) * n / size
        i0 = xs.astype(int) % n
        i1 = (i0 + 1) % n
        t = (xs - np.floor(xs))[None, :]
        t = t * t * (3 - 2 * t)
        rows = grid[i0][:, i0] * (1 - t) + grid[i0][:, i1] * t
        rows2 = grid[i1][:, i0] * (1 - t) + grid[i1][:, i1] * t
        v = t.T
        out += (rows * (1 - v) + rows2 * v) * amp
        total += amp
        amp *= 0.5
    return out / total


class Map:
    def __init__(self, name, rng=7, lm=LM_SIZE):
        self.name = name
        self.lm = lm
        self.masters = {}
        self.rnd = random.Random(rng)
        self.mats = {}
        self.parts = []
        self.foliage = []
        self.boxes = []
        self.spots = []
        self.spawn = {'hider': [], 'seeker': []}
        self.life = {'merpati': [], 'kucing': [], 'warga': [], 'asap': [], 'atap': [], 'ayam': [], 'burung': []}
        self.movers = []
        # glTF tidak membawa node Multiply: warna tint disimpan di JSON dan dipasang saat dimuat
        self.tints = {}
        self.sun = None

    # ---------- material ----------
    def tex(self, name, pid, tile=2.0, tint=None, rough=0.8):
        """material bertekstur; `tile` = lebar satu tile dalam meter, disimpan untuk UV"""
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        n, l = m.node_tree.nodes, m.node_tree.links
        b = n['Principled BSDF']
        uv = n.new('ShaderNodeUVMap')
        uv.uv_map = 'UVMap'

        def img(kind, data):
            t = n.new('ShaderNodeTexImage')
            hd = SRC / 'tex2k' / f'{pid}_{kind}.jpg'
            path = str(hd if hd.exists() else SRC / 'tex' / f'{pid}_{kind}.jpg')
            t.image = bpy.data.images.load(path, check_existing=True)
            if data:
                t.image.colorspace_settings.name = 'Non-Color'
            l.new(uv.outputs['UV'], t.inputs['Vector'])
            return t

        l.new(img('diff', False).outputs['Color'], b.inputs['Base Color'])
        if tint:
            self.tints[name] = [round(v, 4) for v in rgb(tint)[:3]]
            # warna rumah berbeda tapi tekstur sama: dikalikan, supaya pantulan cahaya di bake ikut berwarna
            mix = n.new('ShaderNodeMixRGB')
            mix.blend_type = 'MULTIPLY'
            mix.inputs[0].default_value = 1.0
            mix.inputs[1].default_value = (1, 1, 1, 1)
            mix.inputs[2].default_value = rgb(tint)
            l.new(b.inputs['Base Color'].links[0].from_socket, mix.inputs[1])
            l.new(mix.outputs[0], b.inputs['Base Color'])
        nm = n.new('ShaderNodeNormalMap')
        nm.uv_map = 'UVMap'
        l.new(img('nor', True).outputs['Color'], nm.inputs['Color'])
        l.new(nm.outputs['Normal'], b.inputs['Normal'])
        b.inputs['Roughness'].default_value = rough
        if (SRC / 'tex2k' / f'{pid}_rough.jpg').exists():
            l.new(img('rough', True).outputs['Color'], b.inputs['Roughness'])
        self.mats[name] = (m, tile)
        return name

    def decal_tex(self, name, rgba):
        """material beralpha dari larik tinggi × lebar × 4; nama `decal_*` membuat shader menempelkannya di atas permukaan"""
        h, w, _ = rgba.shape
        img = bpy.data.images.new(name, w, h, alpha=True)
        img.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
        img.pack()
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        n, l = m.node_tree.nodes, m.node_tree.links
        t = n.new('ShaderNodeTexImage')
        t.image = img
        b = n['Principled BSDF']
        l.new(t.outputs['Color'], b.inputs['Base Color'])
        l.new(t.outputs['Alpha'], b.inputs['Alpha'])
        b.inputs['Roughness'].default_value = 0.85
        m.surface_render_method = 'BLENDED'
        self.mats[name] = (m, 1.0)
        return name

    def decal(self, center, w, h, mat, axis='z', out=1):
        """tempelan: axis 'z' = di lantai, 'x'/'y' = di dinding sepanjang sumbu itu, menghadap `out`"""
        x, y, z = center
        if axis == 'z':
            vs = [(x - w / 2, y - h / 2, z), (x + w / 2, y - h / 2, z), (x + w / 2, y + h / 2, z), (x - w / 2, y + h / 2, z)]
        elif axis == 'x':
            s = -out
            vs = [(x - s * w / 2, y, z - h / 2), (x + s * w / 2, y, z - h / 2), (x + s * w / 2, y, z + h / 2), (x - s * w / 2, y, z + h / 2)]
        else:
            vs = [(x, y - out * w / 2, z - h / 2), (x, y + out * w / 2, z - h / 2), (x, y + out * w / 2, z + h / 2), (x, y - out * w / 2, z + h / 2)]
        me = bpy.data.meshes.new('decal')
        me.from_pydata(vs, [], [(0, 1, 2, 3)])
        me.update()
        o = bpy.data.objects.new('decal', me)
        scene.collection.objects.link(o)
        me.materials.append(self.mats[mat][0])
        layer = me.uv_layers.new(name='UVMap')
        for li, uv in zip(me.polygons[0].loop_indices, ((0, 0), (1, 0), (1, 1), (0, 1))):
            layer.data[li].uv = uv
        o['sway'] = 0.0
        self.parts.append(o)
        return o

    def _master(self, key, tris, tex, keep=None, pid=None):
        """model Poly Haven: digabung, poligon disusutkan, tekstur diperkecil; disimpan sekali, disalin tiap dipakai"""
        pid = pid or key
        if key in self.masters:
            return self.masters[key]
        before = set(bpy.data.objects)
        # `pid` berakhiran .gltf = berkas di luar pustaka Poly Haven
        bpy.ops.import_scene.gltf(filepath=pid if pid.endswith('.gltf') else str(MODELS / pid / f'{pid}.gltf'))
        new = [o for o in bpy.data.objects if o not in before]
        # beberapa model berisi beberapa varian di satu berkas; `keep` memilih satu, nama bisa berakhiran .001 saat diimpor ulang
        meshes = [o for o in new if o.type == 'MESH' and (keep is None or o.name == keep or o.name.rsplit('.', 1)[0] == keep)]
        names = [e.name for e in new]
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:
            # mesh yang dipakai bersama dan shape key menolak transform_apply dan decimate
            o.data = o.data.copy()
            if o.data.shape_keys:
                o.shape_key_clear()
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if len(meshes) > 1:
            bpy.ops.object.join()
        o = bpy.context.object
        for n in names:
            e = bpy.data.objects.get(n)
            if e is not None and e is not o:
                bpy.data.objects.remove(e, do_unlink=True)
        o.parent = None
        count = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if count > tris:
            d = o.modifiers.new('kurangi', 'DECIMATE')
            d.ratio = tris / count
            bpy.ops.object.modifier_apply(modifier='kurangi')
        # decimate membuang normal halus; tepi tajam tetap tajam, permukaan lengkung halus lagi
        bpy.ops.object.shade_smooth_by_angle(angle=0.7)
        o.data.uv_layers[0].name = 'UVMap'
        while len(o.data.uv_layers) > 1:
            o.data.uv_layers.remove(o.data.uv_layers[1])
        for mat in o.data.materials:
            nt = mat.node_tree if mat else None
            for b in (n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED') if nt else ():
                # WebP tidak menerima gambar satu kanal, dan di prop kecil warna + normal sudah cukup
                for name, value in (('Roughness', 0.65), ('Metallic', 0.0), ('Alpha', 1.0)):
                    for link in list(b.inputs[name].links):
                        nt.links.remove(link)
                    b.inputs[name].default_value = value
            for n in nt.nodes if nt else ():
                if n.type == 'TEX_IMAGE' and n.image and max(n.image.size) > tex:
                    n.image.scale(tex, tex)
                # gambar abu-abu 8-bit ditolak WebP: salin ke gambar RGB biasa
                if n.type == 'TEX_IMAGE' and n.image and n.image.depth <= 16:
                    w, h = n.image.size
                    px = np.empty(w * h * 4, dtype=np.float32)
                    n.image.pixels.foreach_get(px)
                    rgb_img = bpy.data.images.new(n.image.name + '_rgb', w, h, alpha=False)
                    rgb_img.pixels.foreach_set(px)
                    rgb_img.pack()
                    n.image = rgb_img
        # titik asal ke tengah alas, supaya mudah diletakkan
        zs = [v.co.z for v in o.data.vertices]
        xs = [v.co.x for v in o.data.vertices]
        ys = [v.co.y for v in o.data.vertices]
        o.data.transform(Matrix.Translation((-(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2, -min(zs))))
        size = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
        scene.collection.objects.unlink(o)
        self.masters[key] = (o, size)
        return self.masters[key]

    def asset(self, pid, loc, rot=0.0, height=None, tris=1800, tex=512, solid=False, spot=None, keep=None, width=None, flip=False):
        """salinan model scan. `height`/`width` menyamakan tinggi atau sisi terpanjang; `solid` menambah kotak tabrakan;
        `spot` = pose titik sembunyi; `flip` = terbalik, alasnya menempel di `loc` dan tubuhnya menggantung ke bawah"""
        master, size = self._master(pid + (keep or ''), tris, tex, keep, pid)
        o = master.copy()
        o.data = master.data.copy()
        scene.collection.objects.link(o)
        s = width / max(size[0], size[1]) if width else height / size[2] if height else 1.0
        o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Rotation(math.pi if flip else 0, 4, 'X') @ Matrix.Scale(s, 4)
        o['sway'] = 0.0
        self.parts.append(o)
        if solid:
            self.solid(loc[0], loc[1], size[0] * s, size[1] * s, loc[2] + size[2] * s, rot)
        if spot:
            r = max(size[0], size[1]) * s / 2 + 0.45
            self.spot(loc[0] + r, loc[1], 1, 0, spot)
        return o

    def scatter(self, name, path, points, height):
        """serakan kecil: satu model disalin ke banyak titik, jadi satu objek `detail_*` yang disembunyikan di tingkat Hemat"""
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(path))
        new = [o for o in bpy.data.objects if o not in before]
        meshes = [o for o in new if o.type == 'MESH']
        names = [e.name for e in new]
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if len(meshes) > 1:
            bpy.ops.object.join()
        base = bpy.context.object
        base.parent = None
        for n in names:
            e = bpy.data.objects.get(n)
            if e is not None and e is not base:
                bpy.data.objects.remove(e, do_unlink=True)
        top = max(v.co.z for v in base.data.vertices)
        s0 = height / top
        copies = []
        for x, y in points:
            c = base.copy()
            c.data = base.data.copy()
            scene.collection.objects.link(c)
            s = s0 * (0.7 + self.rnd.random() * 0.6)
            c.matrix_world = Matrix.Translation((x, y, 0.03)) @ Matrix.Rotation(self.rnd.random() * 6.28, 4, 'Z') @ Matrix.Scale(s, 4)
            copies.append(c)
        bpy.data.objects.remove(base, do_unlink=True)
        bpy.ops.object.select_all(action='DESELECT')
        for c in copies:
            c.select_set(True)
        bpy.context.view_layer.objects.active = copies[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bpy.ops.object.join()
        o = bpy.context.object
        o.name = name
        for mat in o.data.materials:
            if mat and not mat.name.startswith('daun_'):
                mat.name = 'daun_' + mat.name
        self.foliage.append(o)
        return o

    def flat(self, name, color, rough=0.55, metal=0.0, emit=0.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = rgb(color)
        b.inputs['Roughness'].default_value = rough
        b.inputs['Metallic'].default_value = metal
        if emit:
            b.inputs['Emission Color'].default_value = rgb(color)
            b.inputs['Emission Strength'].default_value = emit
        self.mats[name] = (m, 1.0)
        return name

    def image(self, name, pixels, rough=0.45, tile=1.0):
        """material dari larik gambar buatan sendiri (tinggi × lebar × 3, nilai 0..1 sRGB)"""
        h, w, _ = pixels.shape
        img = bpy.data.images.new(name, w, h, alpha=False)
        px = np.ones((h, w, 4), dtype=np.float32)
        px[:, :, :3] = pixels[::-1]
        img.pixels.foreach_set(px.ravel())
        img.pack()
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        n, l = m.node_tree.nodes, m.node_tree.links
        t = n.new('ShaderNodeTexImage')
        t.image = img
        l.new(t.outputs['Color'], n['Principled BSDF'].inputs['Base Color'])
        n['Principled BSDF'].inputs['Roughness'].default_value = rough
        self.mats[name] = (m, tile)
        return name

    @contextmanager
    def moving(self, name, pivot):
        """benda yang dibuat di dalam blok ini bergerak saat main: tidak ikut lightmap, jadi satu objek berpusat di `pivot`"""
        keep = self.parts
        self.parts = []
        yield
        parts, self.parts = self.parts, keep
        self.movers.append((name, pivot, parts))

    # ---------- bentuk ----------
    def _uv(self, o, tile, base=None):
        """UV dari ruang lokal menurut sumbu normal terbesar, supaya 1 tile = `tile` meter sebelum diputar.
        `base` = geser menurut posisi dunia, supaya panel dinding yang bersebelahan menyambung tanpa jahitan"""
        bm = bmesh.new()
        bm.from_mesh(o.data)
        uv = bm.loops.layers.uv.verify()
        ox, oy = self.rnd.random() * 3, self.rnd.random() * 3
        if base is not None:
            ox = oy = 0.0
        for f in bm.faces:
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            a, b = {0: (1, 2), 1: (0, 2), 2: (0, 1)}[ax]
            for lp in f.loops:
                c = lp.vert.co
                if base is not None:
                    c = c + Vector(base)
                lp[uv].uv = (c[a] / tile + ox, c[b] / tile + oy)
        bm.to_mesh(o.data)
        bm.free()

    def _keep(self, o, mat, sway=0.0, base=None):
        m, tile = self.mats[mat]
        o.data.materials.append(m)
        self._uv(o, tile, base)
        o['sway'] = sway
        self.parts.append(o)
        return o

    def box(self, loc, size, mat, rot=0.0, solid=False, top=None, sway=0.0, bevel=BEVEL, cont=False):
        """kotak berpusat di `loc`, tepinya ditumpulkan; solid=True menambah kotak tabrakan setinggi puncaknya.
        cont=True = tekstur menyambung dengan kotak tetangga"""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
        o = last()
        o.scale = size
        bpy.ops.object.transform_apply(scale=True)
        w = min(bevel, min(size) * 0.3)
        if w > 0.002:
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.bevel(bm, geom=bm.edges[:] + bm.verts[:], offset=w, segments=1, profile=0.5, affect='EDGES')
            bm.to_mesh(o.data)
            bm.free()
        self._keep(o, mat, sway, loc if cont else None)
        o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z')
        if solid:
            self.solid(loc[0], loc[1], size[0], size[1], top if top is not None else loc[2] + size[2] / 2, rot)
        return o

    def block(self, x0, y0, x1, y1, z0, z1, mat, solid=False, sway=0.0, cont=False):
        """kotak dari dua sudut, paling enak untuk tata letak"""
        return self.box(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), mat, solid=solid, sway=sway, cont=cont)

    def cyl(self, loc, r, h, mat, verts=12, r2=None, rot=(0, 0, 0), solid=False, sway=0.0):
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r if r2 is None else r2, depth=h, vertices=verts, location=(0, 0, 0))
        o = last()
        self._keep(o, mat, sway)
        for p in o.data.polygons:
            p.use_smooth = len(p.vertices) == 4
        o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
        if solid:
            self.solid(loc[0], loc[1], r * 1.7, r * 1.7, loc[2] + h / 2)
        return o

    def ball(self, loc, r, mat, scale=(1, 1, 1), rot=0.0):
        """bola halus; `scale` menurut sumbu lokal sebelum diputar `rot` di sumbu Z"""
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=r, location=(0, 0, 0))
        o = last()
        o.scale = scale
        bpy.ops.object.transform_apply(scale=True)
        self._keep(o, mat)
        for p in o.data.polygons:
            p.use_smooth = True
        o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z')
        return o

    def fan(self, center, r, apex, mats, n=20):
        """atap kerucut bergaris: irisan segitiga berselang warna"""
        x, y, z = center
        for i in range(n):
            a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
            vs = [(x + math.cos(a0) * r, y + math.sin(a0) * r, z), (x + math.cos(a1) * r, y + math.sin(a1) * r, z), (x, y, apex)]
            me = bpy.data.meshes.new('irisan')
            me.from_pydata(vs, [], [(0, 1, 2)])
            me.update()
            o = bpy.data.objects.new('irisan', me)
            scene.collection.objects.link(o)
            self._keep(o, mats[i % len(mats)])

    def gable(self, a0, a1, fixed, z0, ridge, mat, along, out):
        """dinding segitiga di ujung atap pelana; `along` = sumbu lebar segitiga"""
        mid = (a0 + a1) / 2
        P = (lambda t, z: (t, fixed, z)) if along == 'x' else (lambda t, z: (fixed, t, z))
        vs = [P(a0, z0), P(a1, z0), P(mid, ridge)]
        flip = (out > 0) == (along == 'y')
        me = bpy.data.meshes.new('gable')
        me.from_pydata(vs, [], [(0, 1, 2) if flip else (2, 1, 0)])
        me.update()
        o = bpy.data.objects.new('gable', me)
        scene.collection.objects.link(o)
        return self._keep(o, mat, base=(0, 0, 0))

    def prism(self, x0, y0, x1, y1, z0, ridge, mat, along='x', over=0.5, ends=True):
        """atap pelana: bubungan sepanjang sumbu `along`, teritis `over` meter; ends=False = ujung terbuka untuk `gable`"""
        x0, y0, x1, y1 = x0 - over, y0 - over, x1 + over, y1 + over
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if along == 'x':
            vs = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, cy, ridge), (x1, cy, ridge)]
            fs = [(0, 1, 5, 4), (2, 3, 4, 5), (3, 0, 4), (1, 2, 5), (3, 2, 1, 0)]
        else:
            vs = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (cx, y0, ridge), (cx, y1, ridge)]
            fs = [(1, 2, 5, 4), (3, 0, 4, 5), (0, 1, 4), (2, 3, 5), (3, 2, 1, 0)]
        if not ends:
            fs = [f for f in fs if len(f) == 4]
        me = bpy.data.meshes.new('atap')
        me.from_pydata(vs, [], fs)
        me.update()
        o = bpy.data.objects.new('atap', me)
        scene.collection.objects.link(o)
        m, tile = self.mats[mat]
        o.data.materials.append(m)
        # genteng mengikuti kemiringan: U sepanjang bubungan, V naik ke bubungan
        bm = bmesh.new()
        bm.from_mesh(me)
        if ridge < z0:
            # atap terbalik: bubungan di bawah
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        uv = bm.loops.layers.uv.verify()
        a = 0 if along == 'x' else 1
        b = 1 - a
        for f in bm.faces:
            for lp in f.loops:
                c = lp.vert.co
                lp[uv].uv = (c[a] / tile, (abs(c[b] - (cy if along == 'x' else cx)) + c[2]) / tile)
        bm.to_mesh(me)
        bm.free()
        o['sway'] = 0.0
        self.parts.append(o)
        return o

    def picture(self, center, w, h, mat, axis, out):
        """bidang gambar ber-UV 0..1 menempel dinding; `out` = arah menghadap (+1/-1) pada sumbu tegak lurus `axis`"""
        x, y, z = center
        if axis == 'x':
            s = out * -1
            vs = [(x - s * w / 2, y, z - h / 2), (x + s * w / 2, y, z - h / 2), (x + s * w / 2, y, z + h / 2), (x - s * w / 2, y, z + h / 2)]
        else:
            s = out
            vs = [(x, y - s * w / 2, z - h / 2), (x, y + s * w / 2, z - h / 2), (x, y + s * w / 2, z + h / 2), (x, y - s * w / 2, z + h / 2)]
        me = bpy.data.meshes.new('gambar')
        me.from_pydata(vs, [], [(0, 1, 2, 3)])
        me.update()
        o = bpy.data.objects.new('gambar', me)
        scene.collection.objects.link(o)
        me.materials.append(self.mats[mat][0])
        layer = me.uv_layers.new(name='UVMap')
        for li, uv in zip(me.polygons[0].loop_indices, ((0, 0), (1, 0), (1, 1), (0, 1))):
            layer.data[li].uv = uv
        o['sway'] = 0.0
        self.parts.append(o)
        return o

    def text(self, body, loc, size, mat, rot=(math.pi / 2, 0, 0), depth=0.03):
        cu = bpy.data.curves.new('teks', 'FONT')
        cu.body = body
        cu.size = size
        cu.extrude = depth
        cu.align_x = 'CENTER'
        cu.align_y = 'CENTER'
        o = bpy.data.objects.new('teks', cu)
        scene.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
        o = bpy.context.object
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.data.materials.clear()
        return self._keep(o, mat)

    def cloth(self, top, w, h, mat, rot=0.0, sway=0.3, cols=6, rows=8, shirt=False):
        """kain bersegmen menggantung dari titik atas `top`; shirt=True memberi lengan dan menyempitkan pinggang"""
        vs, fs = [], []
        for r in range(rows + 1):
            t = r / rows
            for c in range(cols + 1):
                u = c / cols - 0.5
                width = w
                if shirt:
                    # badan kaus lebih sempit di bawah lengan
                    width = w * (1.5 if t < 0.28 else 0.92)
                # gelombang lipatan kain supaya tidak rata sempurna
                y = math.sin(u * 9 + top[0]) * 0.012 + math.cos(t * 7) * 0.006
                vs.append((u * width, y, -t * h))
        for r in range(rows):
            for c in range(cols):
                a = r * (cols + 1) + c
                fs.append((a, a + 1, a + cols + 2, a + cols + 1))
        me = bpy.data.meshes.new('kain')
        me.from_pydata(vs, [], fs)
        me.update()
        o = bpy.data.objects.new('kain', me)
        scene.collection.objects.link(o)
        for p in me.polygons:
            p.use_smooth = True
        self._keep(o, mat, sway)
        # UV kain: sepanjang lebar dan tinggi, bukan menurut sumbu normal
        bm = bmesh.new()
        bm.from_mesh(me)
        uv = bm.loops.layers.uv.verify()
        tile = self.mats[mat][1]
        ox, oy = self.rnd.random(), self.rnd.random()
        for f in bm.faces:
            for lp in f.loops:
                lp[uv].uv = (lp.vert.co.x / tile + ox, lp.vert.co.z / tile + oy)
        bm.to_mesh(me)
        bm.free()
        o.matrix_world = Matrix.Translation(top) @ Matrix.Rotation(rot, 4, 'Z')
        return o

    def rope(self, a, b, r, mat, sag=0.0, seg=10, verts=5):
        """kabel/tali melengkung dari tabung pendek"""
        for i in range(seg):
            t0, t1 = i / seg, (i + 1) / seg
            p = [Vector(a).lerp(Vector(b), t) - Vector((0, 0, sag * 4 * t * (1 - t))) for t in (t0, t1)]
            mid = (p[0] + p[1]) / 2
            d = p[1] - p[0]
            bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, vertices=verts, location=(0, 0, 0))
            o = last()
            self._keep(o, mat)
            for p in o.data.polygons:
                p.use_smooth = verts > 5 and len(p.vertices) == 4
            o.matrix_world = Matrix.Translation(mid) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()

    # ---------- data permainan ----------
    def solid(self, x, y, sx, sy, top, rot=0.0):
        self.boxes.append({'x': round(x, 3), 'z': round(-y, 3), 'hx': round(sx / 2, 3), 'hz': round(sy / 2, 3), 'yaw': round(rot, 4), 'top': round(top, 3)})

    def spot(self, x, y, nx, ny, pose='nempel'):
        """titik sembunyi bot: (nx, ny) = arah menjauhi permukaan yang ditiru"""
        self.spots.append({'x': round(x, 2), 'z': round(-y, 2), 'yaw': round(math.atan2(nx, -ny), 3), 'pose': pose})

    def grid(self, x0, y0, x1, y1, z, n, mat):
        """bidang bersegmen, untuk permukaan yang bergelombang di shader"""
        vs = [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * j / n, z) for j in range(n + 1) for i in range(n + 1)]
        fs = [(j * (n + 1) + i, j * (n + 1) + i + 1, (j + 1) * (n + 1) + i + 1, (j + 1) * (n + 1) + i) for j in range(n) for i in range(n)]
        me = bpy.data.meshes.new('kisi')
        me.from_pydata(vs, [], fs)
        me.update()
        o = bpy.data.objects.new('kisi', me)
        scene.collection.objects.link(o)
        for p in me.polygons:
            p.use_smooth = True
        return self._keep(o, mat)

    def foliage_gltf(self, path, loc, height, rot=0.0, flip=False):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(path))
        new = [o for o in bpy.data.objects if o not in before]
        meshes = [o for o in new if o.type == 'MESH']
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box]
        s = height / max(zs)
        for o in new:
            if o.parent is None:
                o.scale = [v * s for v in o.scale]
                o.rotation_mode = 'XYZ'
                o.rotation_euler = (o.rotation_euler[0] + (math.pi if flip else 0), o.rotation_euler[1], rot)
                o.location = loc
        self.foliage += meshes
        for o in new:
            if o.type != 'MESH':
                continue
            for i, m in enumerate(o.data.materials):
                if m and not m.name.startswith('daun_'):
                    m.name = 'daun_' + m.name

    # ---------- penyatuan ----------
    def join(self):
        bpy.ops.object.select_all(action='DESELECT')
        # amplitudo goyang disimpan di UV ketiga supaya sampai ke shader
        for o in self.parts:
            o.select_set(True)
            s = float(o['sway'])
            me = o.data
            layer = me.uv_layers.new(name='Sway')
            zs = [v.co.z for v in me.vertices]
            top = max(zs)
            span = max(0.01, top - min(zs))
            for p in me.polygons:
                for li in p.loop_indices:
                    v = me.vertices[me.loops[li].vertex_index]
                    # tepi atas terikat ke tali, makin bawah makin bebas
                    layer.data[li].uv = (s * (top - v.co.z) / span, 0.0)
        bpy.context.view_layer.objects.active = self.parts[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bpy.ops.object.join()
        o = bpy.context.object
        o.name = 'statis'
        o.data.uv_layers[0].name = 'UVMap'
        lm = o.data.uv_layers.new(name='Lightmap')
        o.data.uv_layers.active = lm
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.004)
        bpy.ops.object.mode_set(mode='OBJECT')
        return o

    def join_movers(self):
        out = []
        for name, pivot, parts in self.movers:
            bpy.ops.object.select_all(action='DESELECT')
            for o in parts:
                o.select_set(True)
            bpy.context.view_layer.objects.active = parts[0]
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            if len(parts) > 1:
                bpy.ops.object.join()
            o = bpy.context.object
            o.name = name
            o.data.transform(Matrix.Translation((-pivot[0], -pivot[1], -pivot[2])))
            o.location = pivot
            # tidak ikut menyumbang bayangan diam di lightmap
            o.hide_render = True
            out.append(o)
        return out

    def bake(self, o):
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = SAMPLES
        scene.cycles.device = 'CPU'
        scene.cycles.max_bounces = 4
        scene.cycles.use_denoising = False
        img = bpy.data.images.new('lm_float', self.lm, self.lm, alpha=False, float_buffer=True)
        img.colorspace_settings.name = 'Non-Color'
        added = []
        for m in o.data.materials:
            t = m.node_tree.nodes.new('ShaderNodeTexImage')
            t.image = img
            m.node_tree.nodes.active = t
            added.append((m, t))
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        o.data.uv_layers.active = o.data.uv_layers['Lightmap']
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=4, uv_layer='Lightmap')
        for m, t in added:
            m.node_tree.nodes.remove(t)
        o.data.uv_layers.active = o.data.uv_layers['UVMap']
        return img

    def save_lm(self, img, path):
        size = self.lm
        px0 = np.empty(size * size * 4, dtype=np.float32)
        img.pixels.foreach_get(px0)
        a = px0.reshape(size, size, 4)[:, :, :3]
        # buram 3×3 meredam bintik bake tanpa denoiser
        s = np.zeros_like(a)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                s += np.roll(np.roll(a, dy, 0), dx, 1)
        a = np.clip(s / 9 / LM_RANGE, 0, 1)
        enc = np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)
        out = bpy.data.images.new('lm', size, size, alpha=False)
        out.colorspace_settings.name = 'Non-Color'
        px = np.ones((size, size, 4), dtype=np.float32)
        px[:, :, :3] = enc
        out.pixels.foreach_set(px.ravel())
        out.filepath_raw = str(path)
        out.file_format = 'WEBP'
        scene.render.image_settings.quality = 86
        out.save()
        print('LM', path.name, path.stat().st_size // 1024, 'KB', 'rata2', round(float(a.mean()) * LM_RANGE, 3))

    def finish(self):
        GLB_DIR.mkdir(parents=True, exist_ok=True)
        movers = self.join_movers()
        o = self.join()
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        print('SEGITIGA', tris, 'kotak', len(self.boxes), 'titik', len(self.spots))
        img = self.bake(o)
        self.save_lm(img, (GLB_DIR / f'{self.name}-lm.webp').resolve())
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        for f in self.foliage + movers:
            f.select_set(True)
        path = (GLB_DIR / f'{self.name}.glb').resolve()
        bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                                  export_image_format='WEBP', export_image_quality=65, export_materials='EXPORT', export_texcoords=True)
        print('GLB', path.name, path.stat().st_size // 1024, 'KB')
        data = {'boxes': self.boxes, 'spots': self.spots, 'spawn': self.spawn, 'life': self.life, 'tint': self.tints}
        if self.sun:
            data['sun'] = [round(v, 3) for v in self.sun]
        (GLB_DIR / f'{self.name}.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')


def set_sky(hdri, strength=1.0, sun_energy=3.0, sun_color=(1.0, 0.8, 0.6), min_elevation=16):
    """dunia dari HDRI; lampu matahari mengikuti arah titik terang HDRI, dinaikkan sedikit supaya gang tidak tertutup bayangan"""
    img = bpy.data.images.load(str(SRC / 'hdri' / hdri))
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    lum = px[:, :, :3].sum(axis=2)
    y, x = np.unravel_index(int(lum.argmax()), lum.shape)
    # baris Blender mulai dari bawah gambar
    el = max((y / h - 0.5) * math.pi, math.radians(min_elevation))
    az = (x / w - 0.5) * 2 * math.pi
    world = bpy.data.worlds.new('dunia')
    world.use_nodes = True
    n, l = world.node_tree.nodes, world.node_tree.links
    t = n.new('ShaderNodeTexEnvironment')
    t.image = img
    l.new(t.outputs['Color'], n['Background'].inputs['Color'])
    n['Background'].inputs['Strength'].default_value = strength
    scene.world = world
    d = Vector((math.cos(el) * math.cos(az - math.pi / 2) * -1, math.cos(el) * math.sin(az - math.pi / 2) * -1, math.sin(el)))
    s = bpy.data.lights.new('sun', 'SUN')
    s.energy = sun_energy
    s.angle = math.radians(3)
    s.color = sun_color
    so = bpy.data.objects.new('sun', s)
    scene.collection.objects.link(so)
    so.rotation_mode = 'QUATERNION'
    so.rotation_quaternion = d.to_track_quat('Z', 'Y')
    print('MATAHARI', [round(v, 3) for v in d], 'elevasi', round(math.degrees(el), 1))
    return d


def lamp(loc, energy, color=(1.0, 0.72, 0.42), r=0.1):
    p = bpy.data.lights.new('lampu', 'POINT')
    p.energy = energy
    p.color = color
    p.shadow_soft_size = r
    o = bpy.data.objects.new('lampu', p)
    scene.collection.objects.link(o)
    o.location = loc
    return o
