import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addWind, type Clock } from '@/games/sport/render/shaders'
import type { Tree } from '../mountains'
import { CELL, heightAt, slopeAt, type DecorKind, type Solid, type Terrain } from '../sim/terrain'
import { inkInstanced } from './ink'
import { noFlip } from './props'

/**
 * Prop alam CC0 (Quaternius, lewat scripts/blender/puncak_props.py) di src/assets/puncak/props.
 * Tiap model dipecah per material jadi satu geometri, lalu digambar sebagai InstancedMesh:
 * ratusan pohon cukup beberapa draw call.
 */
const GLB = import.meta.glob('/src/assets/puncak/props/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const url = (name: string) => GLB[`/src/assets/puncak/props/${name}.glb`]
export const hasProp = (name: string) => !!url(name)

type Part = { geo: THREE.BufferGeometry; mat: THREE.Material }
export type PropModels = Map<string, Part[]>

const loader = new GLTFLoader()
const cache = new Map<string, Promise<Part[]>>()

function split(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    const groups = g.groups.length ? g.groups : [{ start: 0, count: (g.index ?? g.getAttribute('position')).count, materialIndex: 0 }]
    for (const gr of groups) {
      const mat = mats[gr.materialIndex ?? 0] ?? mats[0]
      const part = g.clone()
      part.clearGroups()
      if (part.index) part.setIndex(Array.from(part.index.array).slice(gr.start, gr.start + gr.count))
      // samakan atribut supaya bisa digabung
      for (const k of Object.keys(part.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) part.deleteAttribute(k)
      const list = byMat.get(mat) ?? []
      list.push(part)
      byMat.set(mat, list)
    }
  })
  const out: Part[] = []
  for (const [mat, geos] of byMat) {
    const keys = Object.keys(geos[0].attributes).sort().join()
    const same = geos.filter((g) => Object.keys(g.attributes).sort().join() === keys)
    const geo = same.length > 1 ? mergeGeometries(same) : same[0]
    if (geo) out.push({ geo, mat })
  }
  return out
}

/**
 * Bahan kaca (KHR_materials_transmission, mis. lentera Poly Haven) membuat three.js menggambar ulang SEMUA
 * benda buram ke render target tambahan tiap frame (draw call ×2). Diganti kaca transparan biasa.
 */
function noTransmission(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined
    // transparan dua sisi digambar dua kali (belakang lalu depan): cukup sekali untuk prop kecil
    if (m && m.transparent && m.side === THREE.DoubleSide) m.forceSinglePass = true
    if (!m || !('transmission' in m) || !(m.transmission > 0)) return
    m.transmission = 0
    m.transparent = true
    m.opacity = Math.min(m.opacity, 0.4)
    m.depthWrite = false
    m.forceSinglePass = true
  })
  return root
}

/** muat prop yang ada (yang tidak ada dilewati; pemanggil memakai bentuk prosedural) */
export async function loadProps(names: string[]): Promise<PropModels> {
  const out: PropModels = new Map()
  await Promise.all(
    [...new Set(names)].filter(hasProp).map(async (n) => {
      let p = cache.get(n)
      if (!p) {
        p = loader.loadAsync(url(n)).then((g) => split(noTransmission(g.scene)))
        cache.set(n, p)
      }
      out.set(n, await p)
    }),
  )
  return out
}

/** varian model tiap jenis pohon; salju = versi bersalju bila ada */
const VARIANTS: Partial<Record<Tree | 'batu', { base: string[]; snow?: string[]; moss?: string[] }>> = {
  palem: { base: ['palem-1', 'palem-2', 'palem-3'] },
  jati: { base: ['jati-1', 'jati-2', 'jati-3'] },
  beringin: { base: ['beringin-1', 'beringin-2'] },
  pinus: { base: ['pinus-1', 'pinus-2'], snow: ['pinus-salju-1', 'pinus-salju-2'] },
  kering: { base: ['kering-1', 'kering-2'], snow: ['kering-salju-1'] },
  semak: { base: ['semak-1', 'semak-2'], snow: ['semak-salju-1'] },
  teh: { base: ['teh-1', 'teh-2'] },
  batu: { base: ['batu-1', 'batu-2', 'batu-3'], snow: ['batu-salju-1'], moss: ['batu-lumut-1'] },
}
/** tinggi asal model (= ukuran ekspor di puncak_props.py) */
const MODEL_H: Partial<Record<Tree, number>> = { palem: 9, jati: 11, beringin: 16, pinus: 12, kering: 7, semak: 1.3, teh: 1.1 }

/** hiasan kemah & penanda tempat (scripts/blender/puncak_kemah.py) per jenis di sim */
const DECOR_MODELS: Record<DecorKind, string[]> = {
  tenda: ['kemah-tenda-1', 'kemah-tenda-2', 'kemah-tenda-3'],
  kayu: ['kemah-kayu'],
  'peti-kemah': ['kemah-peti'],
  lentera: ['kemah-lentera'],
  papan: ['kemah-papan'],
  tugu: ['kemah-tugu'],
  'bendera-doa': ['kemah-bendera'],
}

const TREE_NAMES = Object.values(VARIANTS).flatMap((v) => [...v!.base, ...(v!.snow ?? []), ...(v!.moss ?? [])])
export const PROP_NAMES = [
  ...TREE_NAMES,
  // versi jauh (LOD) tiap pohon/batu
  ...TREE_NAMES.map((n) => `${n}-lod`),
  ...Object.values(DECOR_MODELS).flat(),
  'hias-bunga-1',
  'hias-bunga-2',
  'hias-pakis-1',
  'hias-jamur-1',
  'hias-jamur-2',
  'hias-kerikil-1',
  'hias-kerikil-2',
  'hias-kayu-1',
  'hias-tunggul-1',
  'hias-kaktus-1',
  'hias-kaktus-2',
]

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return s - Math.floor(s)
}

const prepared = new WeakSet<THREE.Material>()
/** daun & rumput model: potong alpha, dua sisi, bergoyang angin */
function prep(mat: THREE.Material, clock: Clock, height: number) {
  if (prepared.has(mat)) return
  prepared.add(mat)
  const m = mat as THREE.MeshStandardMaterial
  const leafy = !!m.map && (m.transparent || m.alphaTest > 0 || /leaf|leaves|bush|grass|flower|fern|pine/i.test(m.name))
  if (leafy) {
    m.transparent = false
    m.alphaTest = 0.5
    m.side = THREE.DoubleSide
    addWind(m, clock, { strength: 0.16, height })
    // kartu daun dua sisi: jangan balik normal sisi belakang (jadi hitam)
    noFlip(m)
  }
  m.needsUpdate = true
}

const snowAt = (t: Terrain, x: number, z: number) => {
  const i = Math.round((x + t.hx) / CELL)
  const j = Math.round((z + t.hz) / CELL)
  return (t.snow[Math.max(0, Math.min(t.nz - 1, j)) * t.nx + Math.max(0, Math.min(t.nx - 1, i))] ?? 0) / 255
}

/**
 * Pohon & batu dari model CC0. Mengembalikan solid yang belum punya model (kristal, karang) supaya
 * digambar dengan bentuk prosedural.
 *
 * LOD per jarak: dekat = model penuh (±1.200 poligon), sedang = versi `-lod` (±160 poligon, kartu daun
 * ditipiskan), jauh di luar `far` = tidak digambar (sudah tertelan kabut). Pembagian dihitung ulang lewat
 * `update(x, z)` saat kamera bergeser beberapa meter; jumlah draw call tetap (dua set per bagian model).
 */
/** `variety` = jumlah varian model paling banyak per jenis pohon (Hemat: 1, tiap varian = draw call sendiri) */
export function modelForest(t: Terrain, solids: Solid[], models: PropModels, clock: Clock, shadows: boolean, outline = false, near = 38, far = 230, variety = 9) {
  const group = new THREE.Group()
  const rest: Solid[] = []
  const byName = new Map<string, { s: Solid; scale: number }[]>()
  for (const s of solids) {
    const v = VARIANTS[s.kind]
    if (!v) {
      rest.push(s)
      continue
    }
    const snowy = snowAt(t, s.x, s.z) > 0.45 && v.snow
    const mossy = s.kind === 'batu' && v.moss && t.m.zones.some((z) => z.ground.includes('lumut')) && hash(s.z, s.x) < 0.5
    const pool = (snowy ? v.snow : mossy ? v.moss : v.base)!.filter((n) => models.has(n)).slice(0, variety)
    if (!pool.length) {
      rest.push(s)
      continue
    }
    const name = pool[Math.floor(hash(s.x, s.z) * pool.length) % pool.length]
    // batu: model selebar 2 m → skala = jari-jari; pohon: tinggi dibagi tinggi model
    const scale = s.kind === 'batu' ? s.r : (s.top - s.y) / (MODEL_H[s.kind as Tree] ?? 10)
    const list = byName.get(name) ?? []
    list.push({ s, scale })
    byName.set(name, list)
  }
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const pos = new THREE.Vector3()
  const sc = new THREE.Vector3()
  type Set = { list: { s: Solid; m: THREE.Matrix4; c: THREE.Color }[]; full: THREE.InstancedMesh[]; lod: THREE.InstancedMesh[] }
  const sets: Set[] = []
  for (const [name, list] of byName) {
    const tall = !name.startsWith('batu') && !name.startsWith('semak') && !name.startsWith('teh')
    const items = list.map(({ s, scale }) => {
      q.setFromAxisAngle(up, hash(s.x, s.z) * 6.28)
      const squash = name.startsWith('batu') ? 0.8 + hash(s.z, s.x) * 0.5 : 1
      sc.set(scale * (1 + hash(s.z + 3, s.x) * 0.15), scale * squash, scale)
      pos.set(s.x, s.y - (name.startsWith('batu') ? s.r * 0.15 : 0.08), s.z)
      return { s, m: new THREE.Matrix4().compose(pos, q, sc), c: new THREE.Color().setScalar(0.88 + hash(s.x + 1, s.z) * 0.24) }
    })
    const make = (parts: Part[], cast: boolean, ink: boolean) =>
      parts.map((part) => {
        prep(part.mat, clock, tall ? 14 : 2)
        const im = new THREE.InstancedMesh(part.geo, part.mat, items.length)
        items.forEach((it, k) => {
          im.setMatrixAt(k, it.m)
          im.setColorAt(k, it.c)
        })
        im.castShadow = shadows && tall && cast
        im.receiveShadow = shadows
        // batas tampil dihitung ulang dari isi yang aktif
        im.frustumCulled = false
        group.add(im)
        // garis tinta pada bagian padat (batang, batu); daun ber-alpha tidak
        const solid = (part.mat as THREE.MeshStandardMaterial).alphaTest === 0
        if (ink && outline && solid) {
          const line = inkInstanced(im, name.startsWith('batu') ? 0.03 : 0.025)
          line.frustumCulled = false
          im.userData.line = line
          group.add(line)
        }
        return im
      })
    const lodParts = models.get(`${name}-lod`)
    sets.push({ list: items, full: make(models.get(name)!, true, true), lod: lodParts ? make(lodParts, false, false) : [] })
  }
  let lastX = Infinity
  let lastZ = Infinity
  /** bagi ulang pohon dekat/sedang/jauh di sekitar (x, z) */
  const update = (x: number, z: number) => {
    if (Math.hypot(x - lastX, z - lastZ) < 4) return
    lastX = x
    lastZ = z
    for (const set of sets) {
      let nf = 0
      let nl = 0
      for (const it of set.list) {
        const d = Math.hypot(it.s.x - x, it.s.z - z)
        if (d > far) continue
        const target = d < near || !set.lod.length ? set.full : set.lod
        const k = target === set.full ? nf++ : nl++
        for (const im of target) {
          im.setMatrixAt(k, it.m)
          im.setColorAt(k, it.c)
        }
      }
      const fix = (ims: THREE.InstancedMesh[], n: number) => {
        for (const im of ims) {
          im.count = n
          im.visible = n > 0
          const line = im.userData.line as THREE.InstancedMesh | undefined
          if (line) {
            line.count = n
            line.visible = n > 0
          }
          im.instanceMatrix.needsUpdate = true
          if (im.instanceColor) im.instanceColor.needsUpdate = true
        }
      }
      fix(set.full, nf)
      fix(set.lod, nl)
    }
  }
  return { group, rest, update }
}

/** hiasan per zona menurut jenis pohonnya */
function decorFor(t: Terrain, zone: number, snow: number): string[] {
  if (snow > 0.5) return ['hias-kerikil-1', 'hias-kerikil-2']
  const z = t.m.zones[zone]
  const tr = new Set(z.trees)
  const out: string[] = []
  if (tr.has('jati') || tr.has('beringin')) out.push('hias-pakis-1', 'hias-pakis-1', 'hias-jamur-1', 'hias-jamur-2', 'hias-bunga-1', 'hias-kayu-1', 'hias-tunggul-1')
  if (tr.has('pinus')) out.push('hias-jamur-1', 'hias-tunggul-1', 'hias-kerikil-1', 'hias-bunga-2')
  if (tr.has('palem')) out.push('hias-kerikil-1', 'hias-kerikil-2', 'hias-bunga-2')
  if (tr.has('teh') || tr.has('semak')) out.push('hias-bunga-1', 'hias-bunga-2')
  if (tr.has('kering')) out.push(...(t.id === 'ngarai' ? ['hias-kaktus-1', 'hias-kaktus-2', 'hias-kaktus-1'] : []), 'hias-kerikil-2', 'hias-tunggul-1')
  if (!z.trees.length && !tr.has('kristal')) out.push('hias-kerikil-1', 'hias-kerikil-2')
  return out
}

/**
 * Hiasan kecil tanpa tabrakan (bunga, pakis, jamur, kerikil, kaktus) di tanah datar,
 * dibagi per potongan 24 m supaya hanya yang dekat kamera digambar (pakai daftar rumput adegan).
 */
export function decor(t: Terrain, models: PropModels, clock: Clock, density: number, shadows: boolean): THREE.InstancedMesh[] {
  const CH = 24
  const step = 2.2 / Math.sqrt(Math.max(0.2, density))
  const cellsX = Math.ceil(t.sx / CH)
  const cellsZ = Math.ceil(t.sz / CH)
  const dry = (t.m.sea?.y ?? -99) + 0.5
  const out: THREE.InstancedMesh[] = []
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  for (let cj = 0; cj < cellsZ; cj++) {
    for (let ci = 0; ci < cellsX; ci++) {
      const byName = new Map<string, THREE.Matrix4[]>()
      for (let z = cj * CH - t.hz; z < (cj + 1) * CH - t.hz; z += step) {
        for (let x = ci * CH - t.hx; x < (ci + 1) * CH - t.hx; x += step) {
          const jx = x + (hash(x, z) - 0.5) * step
          const jz = z + (hash(z, x) - 0.5) * step
          if (hash(jx * 1.3, jz * 0.7) > 0.22) continue
          const y = heightAt(t, jx, jz)
          if (y < dry || slopeAt(t, jx, jz) > 0.4) continue
          const i = Math.round((jx + t.hx) / CELL)
          const j = Math.round((jz + t.hz) / CELL)
          if (i < 0 || j < 0 || i >= t.nx || j >= t.nz) continue
          const pool = decorFor(t, t.zone[j * t.nx + i], t.snow[j * t.nx + i] / 255).filter((n) => models.has(n))
          if (!pool.length) continue
          const name = pool[Math.floor(hash(jz, jx * 3.1) * pool.length) % pool.length]
          q.setFromAxisAngle(up, hash(jx, jz * 2) * 6.28)
          const s = 0.75 + hash(jx * 2, jz) * 0.6
          const list = byName.get(name) ?? []
          list.push(new THREE.Matrix4().compose(new THREE.Vector3(jx, y - 0.03, jz), q.clone(), new THREE.Vector3(s, s, s)))
          byName.set(name, list)
        }
      }
      for (const [name, mats] of byName) {
        for (const part of models.get(name)!) {
          prep(part.mat, clock, 1.2)
          const im = new THREE.InstancedMesh(part.geo, part.mat, mats.length)
          mats.forEach((m, k) => im.setMatrixAt(k, m4.copy(m)))
          im.castShadow = shadows && name.startsWith('hias-kaktus')
          im.receiveShadow = shadows
          im.userData.cx = ci * CH - t.hx + CH / 2
          im.userData.cz = cj * CH - t.hz + CH / 2
          im.userData.r = CH * 0.71
          out.push(im)
        }
      }
    }
  }
  return out
}

/**
 * Tenda, kayu bakar, papan arah, tumpukan batu, tali bendera: satu InstancedMesh per bagian model.
 * Jumlahnya sedikit (±20), jadi tidak dipecah per potongan.
 */
export function campDecor(t: Terrain, models: PropModels, shadows: boolean) {
  const group = new THREE.Group()
  const byName = new Map<string, Terrain['decor']>()
  for (const d of t.decor) {
    const pool = DECOR_MODELS[d.kind].filter((n) => models.has(n))
    if (!pool.length) continue
    const name = pool[Math.floor(hash(d.x, d.z) * pool.length) % pool.length]
    const list = byName.get(name) ?? []
    list.push(d)
    byName.set(name, list)
  }
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const pos = new THREE.Vector3()
  const sc = new THREE.Vector3()
  for (const [name, list] of byName) {
    for (const part of models.get(name)!) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, list.length)
      list.forEach((d, i) => {
        q.setFromAxisAngle(up, d.yaw)
        // alas sedikit masuk ke tanah supaya tidak melayang di lereng
        pos.set(d.x, d.y - 0.06 * d.s, d.z)
        sc.setScalar(d.s)
        m4.compose(pos, q, sc)
        im.setMatrixAt(i, m4)
      })
      im.castShadow = shadows
      im.receiveShadow = shadows
      group.add(im)
    }
  }
  return group
}

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const

/**
 * Hemat memori tekstur setelah adegan dimuat:
 * - tekstur yang sama (nama & ukuran sama) dari GLB berbeda dipakai bersama, bukan diunggah berkali-kali;
 * - `lean` (profil Hemat): normal/roughness/metal/AO map dibuang (tanpa PBR) dan tekstur yang lebih besar
 *   dari `max` px diperkecil lewat kanvas.
 * Medan (texture array) dan langit tidak disentuh.
 */
export function slimTextures(root: THREE.Object3D, lean: boolean, max = 256) {
  const shared = new Map<string, THREE.Texture>()
  const small = new Map<THREE.Texture, THREE.Texture>()
  const shrink = (t: THREE.Texture) => {
    const im = t.image as { width: number; height: number } | undefined
    if (!lean || !im || !(im.width > max) || (t as THREE.DataTexture).isDataTexture) return t
    let s = small.get(t)
    if (!s) {
      const k = max / Math.max(im.width, im.height)
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(im.width * k))
      c.height = Math.max(1, Math.round(im.height * k))
      c.getContext('2d')!.drawImage(im as CanvasImageSource, 0, 0, c.width, c.height)
      s = t.clone()
      s.image = c
      s.needsUpdate = true
      small.set(t, s)
    }
    return s
  }
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.material || mesh.parent?.name === 'medan') return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mm = m as THREE.MeshStandardMaterial & Record<string, unknown>
      for (const key of TEX_KEYS) {
        let t = mm[key] as THREE.Texture | null | undefined
        if (!t) continue
        if (lean && key !== 'map' && key !== 'emissiveMap') {
          mm[key] = null
          m.needsUpdate = true
          continue
        }
        const im = t.image as { width?: number } | undefined
        if (t.name) {
          const id = `${key}|${t.name}|${im?.width}|${t.flipY}`
          const s = shared.get(id)
          if (s && s !== t) t = s
          else shared.set(id, t)
        }
        const out = shrink(t)
        if (out !== mm[key]) {
          mm[key] = out
          m.needsUpdate = true
        }
      }
    }
  })
}
