import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addWind, type Clock } from '@/games/sport/render/shaders'
import type { Tree } from '../mountains'
import { CELL, heightAt, slopeAt, type Solid, type Terrain } from '../sim/terrain'
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

/** muat prop yang ada (yang tidak ada dilewati; pemanggil memakai bentuk prosedural) */
export async function loadProps(names: string[]): Promise<PropModels> {
  const out: PropModels = new Map()
  await Promise.all(
    [...new Set(names)].filter(hasProp).map(async (n) => {
      let p = cache.get(n)
      if (!p) {
        p = loader.loadAsync(url(n)).then((g) => split(g.scene))
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

export const PROP_NAMES = [
  ...Object.values(VARIANTS).flatMap((v) => [...v!.base, ...(v!.snow ?? []), ...(v!.moss ?? [])]),
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
  const i = Math.round((x + t.half) / CELL)
  const j = Math.round((z + t.half) / CELL)
  return (t.snow[Math.max(0, Math.min(t.n - 1, j)) * t.n + Math.max(0, Math.min(t.n - 1, i))] ?? 0) / 255
}

/**
 * Pohon & batu dari model CC0. Mengembalikan solid yang belum punya model (kristal, karang)
 * supaya digambar dengan bentuk prosedural.
 */
export function modelForest(t: Terrain, solids: Solid[], models: PropModels, clock: Clock, shadows: boolean, outline = false) {
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
    const pool = (snowy ? v.snow : mossy ? v.moss : v.base)!.filter((n) => models.has(n))
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
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const pos = new THREE.Vector3()
  const sc = new THREE.Vector3()
  const col = new THREE.Color()
  for (const [name, list] of byName) {
    const tall = !name.startsWith('batu') && !name.startsWith('semak') && !name.startsWith('teh')
    for (const part of models.get(name)!) {
      prep(part.mat, clock, tall ? 14 : 2)
      const im = new THREE.InstancedMesh(part.geo, part.mat, list.length)
      list.forEach(({ s, scale }, i) => {
        q.setFromAxisAngle(up, hash(s.x, s.z) * 6.28)
        const squash = name.startsWith('batu') ? 0.8 + hash(s.z, s.x) * 0.5 : 1
        sc.set(scale * (1 + hash(s.z + 3, s.x) * 0.15), scale * squash, scale)
        pos.set(s.x, s.y - (name.startsWith('batu') ? s.r * 0.15 : 0.08), s.z)
        m4.compose(pos, q, sc)
        im.setMatrixAt(i, m4)
        col.setScalar(0.88 + hash(s.x + 1, s.z) * 0.24)
        im.setColorAt(i, col)
      })
      im.castShadow = shadows && tall
      im.receiveShadow = shadows
      group.add(im)
      // garis tinta pada bagian padat (batang, batu); daun ber-alpha tidak
      const solid = (part.mat as THREE.MeshStandardMaterial).alphaTest === 0
      if (outline && solid) group.add(inkInstanced(im, name.startsWith('batu') ? 0.03 : 0.025))
    }
  }
  return { group, rest }
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
  const cells = Math.ceil(t.size / CH)
  const dry = (t.m.sea?.y ?? -99) + 0.5
  const out: THREE.InstancedMesh[] = []
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  for (let cj = 0; cj < cells; cj++) {
    for (let ci = 0; ci < cells; ci++) {
      const byName = new Map<string, THREE.Matrix4[]>()
      for (let z = cj * CH - t.half; z < (cj + 1) * CH - t.half; z += step) {
        for (let x = ci * CH - t.half; x < (ci + 1) * CH - t.half; x += step) {
          const jx = x + (hash(x, z) - 0.5) * step
          const jz = z + (hash(z, x) - 0.5) * step
          if (hash(jx * 1.3, jz * 0.7) > 0.22) continue
          const y = heightAt(t, jx, jz)
          if (y < dry || slopeAt(t, jx, jz) > 0.4) continue
          const i = Math.round((jx + t.half) / CELL)
          const j = Math.round((jz + t.half) / CELL)
          if (i < 0 || j < 0 || i >= t.n || j >= t.n) continue
          const pool = decorFor(t, t.zone[j * t.n + i], t.snow[j * t.n + i] / 255).filter((n) => models.has(n))
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
          im.userData.cx = ci * CH - t.half + CH / 2
          im.userData.cz = cj * CH - t.half + CH / 2
          out.push(im)
        }
      }
    }
  }
  return out
}
