import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Model 3D: GLB hasil Blender (scripts/blender/kart.py) atau kit CC0 Kenney di src/assets/kart/models.
 * Tiap model diratakan jadi SATU geometri berwarna verteks supaya bisa di-instance murah di HP.
 * Kalau GLB belum ada, dipakai bentuk sederhana bawaan di bawah.
 */
const GLB = import.meta.glob('/src/assets/kart/models/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const glbUrl = (name: string) => GLB[`/src/assets/kart/models/${name}.glb`]

const cache = new Map<string, THREE.BufferGeometry>()
/** adegan GLB mentah, untuk diratakan ulang dengan warna lain */
const scenes = new Map<string, THREE.Object3D>()
const loader = new GLTFLoader()

/** satukan semua mesh dalam objek jadi satu geometri dengan atribut warna dari material */
export function flatten(root: THREE.Object3D, tint?: string): THREE.BufferGeometry {
  const tintColor = tint ? new THREE.Color(tint) : null
  root.updateMatrixWorld(true)
  const parts: THREE.BufferGeometry[] = []
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    let g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    g = g.index ? g.toNonIndexed() : g
    const n = g.getAttribute('position').count
    const col = new Float32Array(n * 3)
    const vc = g.getAttribute('color')
    const groups = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }]
    for (const gr of groups) {
      const mt = (mats[gr.materialIndex ?? 0] ?? mats[0]) as THREE.MeshStandardMaterial
      // material "tint" (dari Blender) diganti warna pembalap
      const c = tintColor && mt.name.startsWith('tint') ? tintColor : (mt.color ?? new THREE.Color('#ffffff'))
      for (let v = gr.start; v < gr.start + gr.count; v++) {
        const k = vc ? [vc.getX(v), vc.getY(v), vc.getZ(v)] : [1, 1, 1]
        col[v * 3] = c.r * k[0]
        col[v * 3 + 1] = c.g * k[1]
        col[v * 3 + 2] = c.b * k[2]
      }
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    const out = new THREE.BufferGeometry()
    out.setAttribute('position', g.getAttribute('position'))
    out.setAttribute('normal', g.getAttribute('normal'))
    out.setAttribute('color', new THREE.BufferAttribute(col, 3))
    parts.push(out)
  })
  return parts.length ? mergeGeometries(parts) : new THREE.BoxGeometry(1, 1, 1)
}

/** muat semua model yang dibutuhkan lintasan ini (GLB paralel, sisanya bentuk bawaan) */
export async function loadModels(names: string[]): Promise<void> {
  await Promise.all(
    [...new Set(names)].map(async (name) => {
      if (cache.has(name)) return
      const url = glbUrl(name)
      if (url) {
        try {
          const gltf = await loader.loadAsync(url)
          scenes.set(name, gltf.scene)
          // geometri rata dibuat saat dibutuhkan saja (lihat geometry())
          return
        } catch {
          // jatuh ke bentuk bawaan
        }
      }
      cache.set(name, fallback(name))
    }),
  )
}

export function geometry(name: string): THREE.BufferGeometry {
  let g = cache.get(name)
  if (!g) {
    const sc = scenes.get(name)
    g = sc ? flatten(sc) : fallback(name)
    cache.set(name, g)
  }
  return g
}

export const hasGlb = (name: string) => scenes.has(name)

/** nama varian GLB yang tersedia: `pohon`, `pohon-2`, `pohon-3`, … */
export function variants(name: string): string[] {
  const out = glbUrl(name) ? [name] : []
  for (let i = 2; glbUrl(`${name}-${i}`); i++) out.push(`${name}-${i}`)
  return out
}

/** semua nama GLB yang perlu dimuat untuk prop `name` (termasuk variannya) */
export const withVariants = (names: string[]) => names.flatMap((n) => (variants(n).length ? variants(n) : [n]))

const isTextured = (root: THREE.Object3D) => {
  let t = false
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && ((m.material as THREE.MeshStandardMaterial).map || (m.material as THREE.MeshStandardMaterial).normalMap)) t = true
  })
  return t
}

/** bahan standar (PBR) untuk model berwarna verteks: kena cahaya & pantulan langit */
export const vertexMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 })

/**
 * Banyak salinan satu model dalam satu InstancedMesh per bagian (per material).
 * Model bertekstur memakai material aslinya; model polos memakai geometri rata berwarna verteks.
 */
export function instanced(name: string, matrices: THREE.Matrix4[], shadow = true): THREE.Group {
  const g = new THREE.Group()
  if (!matrices.length) return g
  const sc = scenes.get(name)
  if (sc && isTextured(sc)) {
    sc.updateMatrixWorld(true)
    sc.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld)
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      // daun & rumput bertekstur alfa (bidang dua sisi / transparan): potong, jangan transparan
      // (lebih murah & tanpa salah urutan)
      if (mat.map && (mat.transparent || mat.side === THREE.DoubleSide)) {
        mat.transparent = false
        mat.alphaTest = 0.45
        mat.side = THREE.DoubleSide
      }
      const im = new THREE.InstancedMesh(geo, mat, matrices.length)
      matrices.forEach((mx, i) => im.setMatrixAt(i, mx))
      im.castShadow = shadow
      im.receiveShadow = true
      im.computeBoundingSphere()
      g.add(im)
    })
    return g
  }
  const im = new THREE.InstancedMesh(geometry(name), vertexMaterial(), matrices.length)
  matrices.forEach((mx, i) => im.setMatrixAt(i, mx))
  im.castShadow = shadow
  im.receiveShadow = true
  im.computeBoundingSphere()
  g.add(im)
  return g
}

/** salinan utuh satu model (untuk landmark tunggal) */
export function placed(name: string): THREE.Object3D {
  const sc = scenes.get(name)
  if (sc) {
    const c = sc.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return c
  }
  const m = new THREE.Mesh(geometry(name), vertexMaterial())
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/** geometri GLB dengan bagian "tint" diwarnai `color` */
export function tinted(name: string, color: string): THREE.BufferGeometry {
  const key = `${name}@${color}`
  let g = cache.get(key)
  if (!g) {
    const sc = scenes.get(name)
    g = sc ? flatten(sc, color) : geometry(name)
    cache.set(key, g)
  }
  return g
}

// ---------------------------------------------------------------------------
// Bentuk bawaan: low-poly sederhana dari primitif, diwarnai per bagian.

type Part = [THREE.BufferGeometry, string, [number, number, number]?, [number, number, number]?, [number, number, number]?]

function build(parts: Part[]): THREE.BufferGeometry {
  const g = new THREE.Group()
  for (const [geo, color, pos, rot, scale] of parts) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }))
    if (pos) m.position.set(...pos)
    if (rot) m.rotation.set(...rot)
    if (scale) m.scale.set(...scale)
    g.add(m)
  }
  return flatten(g)
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg)
const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg)
const ball = (r: number, seg = 8) => new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2))
const torus = (r: number, t: number) => new THREE.TorusGeometry(r, t, 6, 14)

const FALLBACK: Record<string, () => Part[]> = {
  kelapa: () => [
    [cyl(0.35, 0.55, 9, 6), '#9a6a3a', [0.6, 4.5, 0], [0, 0, -0.12]],
    ...[0, 1, 2, 3, 4].map((i): Part => [box(5, 0.2, 1.2), '#43b929', [1.2 + Math.cos((i * Math.PI * 2) / 5) * 2, 9, Math.sin((i * Math.PI * 2) / 5) * 2], [0, (-i * Math.PI * 2) / 5, -0.35]]),
  ],
  payung: () => [[cyl(0.1, 0.1, 4), '#fff4fa', [0, 2, 0]], [cone(2.6, 1.2, 8), '#ff37a6', [0, 4.2, 0]]],
  batu: () => [[new THREE.DodecahedronGeometry(2), '#8a8a96', [0, 1, 0], [0.3, 0.6, 0], [1, 0.7, 1.2]]],
  kerang: () => [[ball(1.2, 6), '#ffcae9', [0, 0.5, 0], [0, 0, 0], [1, 0.5, 1]]],
  'istana-pasir': () => [[box(4, 2, 4), '#e9c77a', [0, 1, 0]], [cyl(0.8, 0.8, 3.4, 6), '#f6dc9a', [1.6, 1.7, 1.6]], [cyl(0.8, 0.8, 3.4, 6), '#f6dc9a', [-1.6, 1.7, -1.6]], [cone(1, 1.2, 6), '#ff37a6', [1.6, 4, 1.6]]],
  kepiting: () => [[ball(1.4, 7), '#ff3b5c', [0, 0.9, 0], [0, 0, 0], [1.3, 0.6, 1]], [ball(0.5, 6), '#ff3b5c', [1.7, 1, 0.8]], [ball(0.5, 6), '#ff3b5c', [1.7, 1, -0.8]], [ball(0.25, 5), '#121212', [1, 1.6, 0.4]], [ball(0.25, 5), '#121212', [1, 1.6, -0.4]]],
  'kelapa-ayun': () => [[ball(1.6, 8), '#7a4a2a', [0, 0, 0]]],
  padi: () => [[cone(1.2, 2.4, 5), '#9ad84a', [0, 1.2, 0]], [cone(0.8, 2, 5), '#c8e85a', [1.2, 1, 0.6]]],
  'orang-orangan': () => [[cyl(0.15, 0.15, 4), '#7a5a3a', [0, 2, 0]], [box(3, 0.3, 0.3), '#7a5a3a', [0, 3, 0]], [box(1.6, 1.8, 0.8), '#2f7bff', [0, 2.6, 0]], [cone(1.1, 0.8, 8), '#ffcc1f', [0, 4.4, 0]]],
  'orang-orangan-ayun': () => [[box(1.6, 3, 0.8), '#2f7bff', [0, 0, 0]], [cone(1.1, 0.8, 8), '#ffcc1f', [0, 2, 0]]],
  gubuk: () => [[box(5, 3, 4), '#b98a5a', [0, 2.5, 0]], [cone(4.4, 2.6, 4), '#7a5a3a', [0, 5.3, 0], [0, Math.PI / 4, 0]], [box(0.4, 1.2, 0.4), '#5a3e24', [2, 0.6, 1.6]], [box(0.4, 1.2, 0.4), '#5a3e24', [-2, 0.6, -1.6]]],
  pohon: () => [[cyl(0.4, 0.6, 4, 6), '#7a5a3a', [0, 2, 0]], [ball(3, 7), '#43b929', [0, 5.6, 0]], [ball(2, 6), '#5cf64a', [1.4, 6.6, 0.6]]],
  jerami: () => [[cyl(1.8, 1.8, 2.4, 10), '#ffcc1f', [0, 1.8, 0], [Math.PI / 2, 0, 0]]],
  'gerobak-padi': () => [[box(4, 1.6, 2.6), '#b98a5a', [0, 1.6, 0]], [cyl(0.9, 0.9, 0.4, 10), '#5a3e24', [1.2, 0.9, 1.5], [Math.PI / 2, 0, 0]], [cyl(0.9, 0.9, 0.4, 10), '#5a3e24', [1.2, 0.9, -1.5], [Math.PI / 2, 0, 0]], [cone(1.8, 1.6, 6), '#c8e85a', [0, 3.2, 0]]],
  kerbau: () => [[box(4, 2, 1.8), '#5a5a66', [0, 1.8, 0]], [box(1.2, 1.2, 1.2), '#4a4a56', [2.4, 2.2, 0]], [cone(0.25, 1.4, 5), '#fff4fa', [2.6, 3.1, 0.7], [0, 0, -0.8]], [cone(0.25, 1.4, 5), '#fff4fa', [2.6, 3.1, -0.7], [0, 0, -0.8]], ...[[1.4, 0.7], [1.4, -0.7], [-1.4, 0.7], [-1.4, -0.7]].map(([x, z]): Part => [box(0.5, 1, 0.5), '#3a3a46', [x, 0.5, z]])],
  'jamur-merah': () => [[cyl(0.9, 1.2, 4, 8), '#fff4fa', [0, 2, 0]], [ball(3.2, 9), '#ff3b5c', [0, 4.2, 0], [0, 0, 0], [1, 0.55, 1]], [ball(0.5, 5), '#fff4fa', [1.4, 5.4, 0.8]], [ball(0.5, 5), '#fff4fa', [-1, 5.5, -1]]],
  'jamur-ungu': () => [[cyl(0.7, 1, 3, 8), '#ffcae9', [0, 1.5, 0]], [ball(2.6, 9), '#8a55ff', [0, 3.3, 0], [0, 0, 0], [1, 0.5, 1]]],
  'jamur-pantul': () => [[cyl(0.6, 0.8, 1, 8), '#fff4fa', [0, 0.5, 0]], [ball(3.6, 10), '#ff37a6', [0, 1, 0], [0, 0, 0], [1, 0.35, 1]]],
  'kayu-tumbang': () => [[cyl(1, 1.1, 9, 8), '#7a5a3a', [0, 1, 0], [0, 0, Math.PI / 2]]],
  'akar-ayun': () => [[ball(1.8, 7), '#5a3a2a', [0, 0, 0]]],
  kumbang: () => [[ball(1.4, 8), '#2f7bff', [0, 1.1, 0], [0, 0, 0], [1.3, 0.8, 1]], [ball(0.6, 6), '#121212', [1.6, 1.2, 0]]],
  stupa: () => [[cyl(3, 3.6, 2, 8), '#c9a26a', [0, 1, 0]], [ball(2.8, 8), '#c9a26a', [0, 3.2, 0], [0, 0, 0], [1, 0.8, 1]], [cyl(0.3, 0.6, 2.4, 6), '#b98a5a', [0, 6, 0]]],
  pilar: () => [[cyl(1, 1, 7, 8), '#d9b884', [0, 3.5, 0]], [box(2.6, 0.8, 2.6), '#c9a26a', [0, 7.2, 0]]],
  'pilar-runtuh': () => [[cyl(1.1, 1.1, 3, 8), '#d9b884', [0, 1.5, 0]], [cyl(1.1, 1.1, 2.6, 8), '#c9a26a', [1.6, 1.1, 0.4], [0.2, 0, 1.4]]],
  arca: () => [[box(2.4, 1, 2.4), '#b98a5a', [0, 0.5, 0]], [box(1.6, 2.6, 1.4), '#c9a26a', [0, 2.3, 0]], [ball(0.9, 7), '#c9a26a', [0, 4.2, 0]]],
  kaktus: () => [[cyl(0.6, 0.7, 5, 7), '#43b929', [0, 2.5, 0]], [cyl(0.4, 0.4, 2, 6), '#43b929', [1, 3, 0], [0, 0, -0.9]], [cyl(0.4, 0.4, 1.8, 6), '#43b929', [-0.9, 2.4, 0], [0, 0, 0.9]]],
  'gulungan-semak': () => [[new THREE.IcosahedronGeometry(1.6, 0), '#b98a5a', [0, 1.6, 0]]],
  'gada-batu': () => [[new THREE.DodecahedronGeometry(2.2), '#8a7a6a', [0, 0, 0]]],
  gedung: () => [[box(10, 30, 10), '#3a2a66', [0, 15, 0]], [box(8, 0.6, 10.2), '#ff37a6', [0, 22, 0]], [box(10.2, 0.6, 8), '#5cf64a', [0, 12, 0]], [box(4, 6, 4), '#2a1a4a', [0, 33, 0]]],
  lampu: () => [[cyl(0.2, 0.25, 8, 6), '#5a5a76', [0, 4, 0]], [box(2.4, 0.3, 0.6), '#5a5a76', [1, 8, 0]], [box(0.9, 0.4, 0.7), '#fff6b0', [2, 7.8, 0]]],
  'papan-neon': () => [[box(0.4, 6, 0.4), '#5a5a76', [-3, 3, 0]], [box(0.4, 6, 0.4), '#5a5a76', [3, 3, 0]], [box(8, 3.6, 0.5), '#ff37a6', [0, 7, 0]], [box(6.6, 2.2, 0.6), '#13bfae', [0, 7, 0]]],
  bus: () => [[box(2.8, 3, 9), '#5cf64a', [0, 2, 0]], [box(2.9, 1, 8), '#121212', [0, 2.6, 0]], ...[[1.4, 3], [-1.4, 3], [1.4, -3], [-1.4, -3]].map(([x, z]): Part => [cyl(0.6, 0.6, 0.4, 8), '#121212', [x, 0.6, z], [0, 0, Math.PI / 2]])],
  kerucut: () => [[cone(0.7, 1.6, 8), '#ff8a1c', [0, 0.8, 0]], [box(1.4, 0.15, 1.4), '#ff8a1c', [0, 0.08, 0]], [cyl(0.42, 0.5, 0.25, 8), '#fff4fa', [0, 0.8, 0]]],
  pembatas: () => [[box(5, 1.2, 1), '#fff4fa', [0, 0.6, 0]], [box(5.1, 0.4, 1.05), '#ff3b5c', [0, 0.8, 0]]],
  'palang-parkir': () => [[box(0.8, 0.8, 0.8), '#ffcc1f', [0, 0, 0]]],
  lolipop: () => [[cyl(0.2, 0.2, 6, 6), '#fff4fa', [0, 3, 0]], [cyl(2, 2, 0.6, 14), '#ff37a6', [0, 7, 0], [Math.PI / 2, 0, 0]], [torus(1.2, 0.3), '#fff4fa', [0, 7, 0.32]]],
  donat: () => [[torus(1.8, 0.9), '#e9a25a', [0, 1, 0], [Math.PI / 2, 0, 0]], [torus(1.8, 0.92), '#ff37a6', [0, 1.3, 0], [Math.PI / 2, 0, 0], [1, 1, 0.5]]],
  'permen-tongkat': () => [[cyl(0.5, 0.5, 6, 8), '#fff4fa', [0, 3, 0]], [torus(1, 0.5), '#ff3b5c', [1, 6, 0]]],
  kue: () => [[cyl(2.6, 2.6, 2, 12), '#ffcae9', [0, 1, 0]], [cyl(2.7, 2.7, 0.4, 12), '#fff4fa', [0, 2.1, 0]], [ball(0.6, 6), '#ff3b5c', [0, 2.6, 0]]],
  'palu-permen': () => [[cyl(1.6, 1.6, 3, 10), '#ff37a6', [0, 0, 0], [0, 0, Math.PI / 2]]],
  'bola-permen': () => [[ball(2, 10), '#13bfae', [0, 2, 0]]],
  cemara: () => [[cyl(0.4, 0.5, 2, 6), '#7a5a3a', [0, 1, 0]], [cone(3, 4, 7), '#2f8a5a', [0, 3.5, 0]], [cone(2.3, 3.4, 7), '#3f9b6a', [0, 5.5, 0]], [cone(1.5, 2.4, 7), '#f4fbff', [0, 7.4, 0]]],
  'manusia-salju': () => [[ball(1.6, 8), '#f4fbff', [0, 1.4, 0]], [ball(1.1, 8), '#f4fbff', [0, 3.4, 0]], [cone(0.2, 0.9, 5), '#ff8a1c', [0.9, 3.4, 0], [0, 0, -Math.PI / 2]], [cyl(0.8, 0.8, 0.9, 8), '#121212', [0, 4.6, 0]]],
  'batu-es': () => [[new THREE.OctahedronGeometry(2.2), '#bfe9ff', [0, 1.6, 0], [0, 0.4, 0], [1, 1.2, 1]]],
  'bola-salju': () => [[new THREE.IcosahedronGeometry(2.6, 1), '#f4fbff', [0, 2.6, 0]]],
  'es-ayun': () => [[new THREE.OctahedronGeometry(2), '#9ad8ff', [0, 0, 0]]],
  'batu-api': () => [[new THREE.DodecahedronGeometry(2.2), '#3a2a2a', [0, 1.3, 0], [0.4, 0.2, 0]], [new THREE.DodecahedronGeometry(0.9), '#ff8a1c', [0.8, 2.6, 0.4]]],
  tulang: () => [[cyl(0.3, 0.3, 4, 6), '#fff4e0', [0, 0.4, 0], [0, 0, Math.PI / 2]], [ball(0.5, 6), '#fff4e0', [2, 0.4, 0.3]], [ball(0.5, 6), '#fff4e0', [-2, 0.4, -0.3]]],
  kristal: () => [[cone(1, 4, 5), '#ff37a6', [0, 2, 0]], [cone(0.7, 3, 5), '#8a55ff', [1, 1.4, 0.4], [0, 0, -0.4]]],
  'rantai-api': () => [[new THREE.DodecahedronGeometry(1.9), '#ff5a1a', [0, 0, 0]]],
  'bola-api': () => [[new THREE.IcosahedronGeometry(2.2, 1), '#ff8a1c', [0, 2.2, 0]]],
  'batu-jatuh': () => [[new THREE.DodecahedronGeometry(2.6), '#5a3a2a', [0, 0, 0]]],
  // ---- item ----
  'item-box': () => [[box(2, 2, 2), '#fff4fa', [0, 0, 0]]],
  pisang: () => [[new THREE.TorusGeometry(0.9, 0.35, 5, 10, Math.PI), '#ffcc1f', [0, 0.4, 0], [Math.PI / 2, 0, 0]]],
  roket: () => [[cone(0.6, 2.2, 6), '#fff4fa', [0, 0, 0.8], [Math.PI / 2, 0, 0]], [box(1.8, 0.1, 1), '#ff37a6', [0, 0, -0.2]]],
  petasan: () => [[cyl(0.5, 0.5, 1.8, 8), '#ff3b5c', [0, 0, 0]], [cyl(0.05, 0.05, 0.8, 4), '#121212', [0, 1.2, 0]]],
}

function fallback(name: string): THREE.BufferGeometry {
  const f = FALLBACK[name]
  return f ? build(f()) : build([[box(2, 2, 2), '#ff37a6', [0, 1, 0]]])
}

// ---------------------------------------------------------------------------
// Kart & pembalap

const BODY_FALLBACK: Record<string, (c: string) => Part[]> = {
  bajaj: (c) => [
    [box(1.9, 0.7, 3), c, [0, 0.75, 0]],
    [box(1.8, 1.2, 1.3), c, [0, 1.5, -0.6]],
    [box(1.95, 0.15, 1.8), '#121212', [0, 2.15, -0.3]],
    [box(0.8, 0.5, 0.8), '#fff4fa', [0, 1.1, 1.3]],
  ],
  gerobak: (c) => [
    [box(2.2, 0.9, 3.2), '#b98a5a', [0, 0.85, 0]],
    [box(2.3, 0.2, 3.3), c, [0, 1.35, 0]],
    [box(0.3, 1, 0.3), '#7a5a3a', [0.9, 1.8, -1.3]],
    [box(0.3, 1, 0.3), '#7a5a3a', [-0.9, 1.8, -1.3]],
    [box(2.4, 0.15, 1.2), c, [0, 2.3, -1.3]],
  ],
  bebek: (c) => [
    [ball(1.3, 10), c, [0, 1, 0], [0, 0, 0], [0.8, 0.55, 1.4]],
    [cone(0.5, 1, 8), '#ffcc1f', [0, 1, 2.1], [Math.PI / 2, 0, 0]],
    [cyl(0.4, 0.55, 0.8, 8), '#121212', [0, 0.9, -1.8], [Math.PI / 2, 0, 0]],
    [box(2.8, 0.12, 0.8), c, [0, 1.1, -1]],
  ],
}

const HEAD_FALLBACK: Record<string, (c: string) => Part[]> = {
  moci: (c) => [[ball(0.7, 9), c, [0, 0, 0]], [cone(0.25, 0.5, 4), c, [0.4, 0.6, 0]], [cone(0.25, 0.5, 4), c, [-0.4, 0.6, 0]]],
  kroak: (c) => [[ball(0.72, 9), c, [0, 0, 0], [0, 0, 0], [1.2, 0.8, 1]], [ball(0.28, 7), '#fff4fa', [0.35, 0.5, 0.3]], [ball(0.28, 7), '#fff4fa', [-0.35, 0.5, 0.3]]],
  bubu: (c) => [[ball(0.78, 9), c, [0, 0, 0]], [ball(0.28, 7), c, [0.55, 0.55, 0]], [ball(0.28, 7), c, [-0.55, 0.55, 0]], [ball(0.3, 7), '#fff4fa', [0, -0.15, 0.62]]],
  ciko: (c) => [[ball(0.7, 9), c, [0, 0, 0]], [cone(0.2, 0.5, 5), '#ff8a1c', [0, 0, 0.8], [Math.PI / 2, 0, 0]], [box(0.15, 0.5, 0.5), '#ff3b5c', [0, 0.75, 0]]],
  gurit: (c) => [[ball(0.8, 9), c, [0, 0.2, 0], [0, 0, 0], [1, 1.2, 1]]],
  loreng: (c) => [[ball(0.76, 9), c, [0, 0, 0]], [box(0.12, 0.5, 0.2), '#121212', [0, 0.55, 0.45]], [cone(0.22, 0.4, 4), c, [0.45, 0.6, 0]], [cone(0.22, 0.4, 4), c, [-0.45, 0.6, 0]]],
  embek: (c) => [[ball(0.7, 9), c, [0, 0, 0]], [cone(0.15, 0.7, 5), '#fff4fa', [0.35, 0.7, -0.2], [-0.5, 0, -0.3]], [cone(0.15, 0.7, 5), '#fff4fa', [-0.35, 0.7, -0.2], [-0.5, 0, 0.3]]],
  komo: (c) => [[ball(0.7, 9), c, [0, 0, 0.15], [0, 0, 0], [0.9, 0.75, 1.4]], [ball(0.18, 6), '#ffcc1f', [0.3, 0.3, 0.5]], [ball(0.18, 6), '#ffcc1f', [-0.3, 0.3, 0.5]]],
}

/** bagian kart & pembalap yang dianimasikan race.ts (gabungan semua tingkat LOD) */
export type KartRig = {
  tilt: THREE.Group
  wheels: THREE.Object3D[]
  front: THREE.Object3D[]
  steer: THREE.Object3D[]
  body: THREE.Object3D[]
  head: THREE.Object3D[]
  armL: THREE.Object3D[]
  armR: THREE.Object3D[]
  /** titik knalpot (koordinat lokal kart) untuk api turbo */
  exhaust: THREE.Vector3[]
}

/** salinan adegan GLB dengan material "tint" diganti warna pembalap */
function tintedClone(name: string, color: string): THREE.Object3D {
  const c = scenes.get(name)!.clone(true)
  const paint = new Map<THREE.Material, THREE.Material>()
  c.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = true
    m.receiveShadow = true
    const mt = m.material as THREE.MeshStandardMaterial
    if (!mt.name.startsWith('tint')) return
    let t = paint.get(mt)
    if (!t) {
      const n = mt.clone()
      n.color.set(color)
      paint.set(mt, n)
      t = n
    }
    m.material = t
  })
  return c
}

/**
 * Kart lengkap: bodi + roda + pembalap. Dari GLB detail (scripts/blender/kart_hd.py) bila ada,
 * dengan LOD ringan untuk jarak jauh; kalau belum ada, bentuk primitif bawaan.
 */
export function makeKart(charId: string, color: string, body: string, lite = false): THREE.Group {
  const g = new THREE.Group()
  const tilt = new THREE.Group()
  g.add(tilt)
  const rig: KartRig = { tilt, wheels: [], front: [], steer: [], body: [], head: [], armL: [], armR: [], exhaust: [] }
  const kartName = `kart-${body}`
  const charName = `char-${charId}`
  if (scenes.has(kartName) && scenes.has(charName)) {
    const levels: [string, number][] = lite || !scenes.has(`${kartName}`) ? [['-lod', 0]] : [['', 0], ['-lod', 42]]
    const lod = new THREE.LOD()
    for (const [suffix, dist] of levels) {
      const kn = scenes.has(kartName + suffix) ? kartName + suffix : kartName
      const cn = scenes.has(charName + suffix) ? charName + suffix : charName
      const level = new THREE.Group()
      const k = tintedClone(kn, color)
      const c = tintedClone(cn, color)
      level.add(k, c)
      level.traverse((o) => {
        const n = o.name
        if (/^wheel_/.test(n)) {
          o.rotation.order = 'YXZ'
          rig.wheels.push(o)
          if (/^wheel_F/.test(n)) rig.front.push(o)
        } else if (n === 'steer') rig.steer.push(o)
        else if (n === 'body') rig.body.push(o)
        else if (n === 'head') rig.head.push(o)
        else if (n === 'arm_L') rig.armL.push(o)
        else if (n === 'arm_R') rig.armR.push(o)
        else if (/^exhaust/.test(n) && suffix === levels[0][0]) rig.exhaust.push(o.position.clone())
      })
      lod.addLevel(level, dist)
    }
    tilt.add(lod)
    g.userData = rig
    return g
  }
  // bentuk primitif bawaan
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05 })
  tilt.add(new THREE.Mesh(build((BODY_FALLBACK[body] ?? BODY_FALLBACK.bajaj)(color)), mat))
  const wheelGeo = build([[cyl(0.48, 0.48, 0.45, 10), '#121212', [0, 0, 0], [0, 0, Math.PI / 2]], [cyl(0.24, 0.24, 0.48, 8), '#fff4fa', [0, 0, 0], [0, 0, Math.PI / 2]]])
  for (const [x, z] of [[1.05, 1.1], [-1.05, 1.1], [1.05, -1.1], [-1.05, -1.1]]) {
    const w = new THREE.Mesh(wheelGeo, mat)
    w.position.set(x, 0.48, z)
    w.rotation.order = 'YXZ'
    tilt.add(w)
    rig.wheels.push(w)
    if (z < 0) rig.front.push(w)
  }
  const driver = new THREE.Mesh(
    build([
      [cyl(0.55, 0.65, 1, 8), color, [0, 1.75, -0.25]],
      ...(HEAD_FALLBACK[charId] ?? HEAD_FALLBACK.moci)(color).map(([geo, c, p, r, s]): Part => [geo, c, [(p?.[0] ?? 0), (p?.[1] ?? 0) + 2.75, (p?.[2] ?? 0) - 0.2], r, s]),
      [cone(0.4, 0.9, 8), '#ffcc1f', [0, 3.75, -0.2]],
      [ball(0.12, 5), '#ff37a6', [0, 4.25, -0.2]],
    ]),
    mat,
  )
  tilt.add(driver)
  rig.exhaust.push(new THREE.Vector3(0, 0.9, -2))
  g.userData = rig
  return g
}
