import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import treeUrl from '@/assets/kart/models/pohon.glb?url'
import type { Tier } from '@/games/kart/render/quality'
import { nextRand } from '../../rng'
import { BLOCKS, CEILINGS, HALF, PATHS, PROPS, ROOFS, TREES, ZONES, type Block, type Mat, type Prop, type Roof } from '../map'
import { glimmer, groundBlend, windSway } from './shaders'
import { bambooBark, bananaLeaf, matWeave, oldPhoto, windowTex, type Textures } from './textures'

const GROUND = 2 * HALF + 16

/** ambient occlusion murah lewat warna verteks: pangkal dinding & sudut bawah lebih gelap */
function ao(geo: THREE.BufferGeometry, y0: number) {
  const pos = geo.attributes.position
  const col = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) - y0
    const k = 0.42 + 0.58 * THREE.MathUtils.smoothstep(y, 0, 1.3)
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
}

/** UV dunia per sisi (tekstur menyambung antar balok), `tile` meter per ulangan */
function worldUv(geo: THREE.BufferGeometry, tile: number) {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i))
    const ny = Math.abs(nor.getY(i))
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const [u, v] = ny > 0.6 ? [x, z] : nx > 0.6 ? [z, y] : [x, y]
    uv[i * 2] = u / tile
    uv[i * 2 + 1] = v / tile
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

function boxGeo(b: Block, tile: number) {
  const g = new THREE.BoxGeometry(b.hx * 2, b.y1 - b.y0, b.hz * 2)
  g.translate(0, (b.y0 + b.y1) / 2, 0)
  if (b.yaw) g.rotateY(b.yaw)
  g.translate(b.x, 0, b.z)
  worldUv(g, tile)
  ao(g, Math.min(b.y0, 0.3))
  return g
}

/**
 * Atap joglo: dua kemiringan (penanggap landai di bawah, brunjung curam di atas) ke satu bubungan.
 * Dibuat dari tiga cincin: tepi atap, patahan, dan bubungan.
 */
function roofGeo(r: Roof, tile: number, under: boolean) {
  const rings = [
    { hx: r.hx, hz: r.hz, y: r.y },
    { hx: r.ridge / 2 + (r.hx - r.ridge / 2) * 0.5, hz: r.hz * 0.5, y: r.y + r.h * 0.32 },
    { hx: r.ridge / 2, hz: 0.001, y: r.y + r.h },
  ]
  const pos: number[] = []
  const uv: number[] = []
  const corner = (ring: (typeof rings)[number], sx: number, sz: number) => new THREE.Vector3(r.x + sx * ring.hx, ring.y, r.z + sz * ring.hz)
  // empat sisi: (arah sudut kiri, arah sudut kanan) dilihat dari luar
  const sides: [number, number, number, number][] = [
    [-1, 1, 1, 1],
    [1, 1, 1, -1],
    [1, -1, -1, -1],
    [-1, -1, -1, 1],
  ]
  for (const [ax, az, bx, bz] of sides) {
    let v0 = 0
    for (let k = 0; k < 2; k++) {
      const a0 = corner(rings[k], ax, az)
      const b0 = corner(rings[k], bx, bz)
      const a1 = corner(rings[k + 1], ax, az)
      const b1 = corner(rings[k + 1], bx, bz)
      const mid0 = a0.clone().add(b0).multiplyScalar(0.5)
      const mid1 = a1.clone().add(b1).multiplyScalar(0.5)
      const v1 = v0 + mid0.distanceTo(mid1)
      const t = b0.clone().sub(a0).normalize()
      const u = (p: THREE.Vector3) => p.dot(t)
      const quad = [a0, b0, b1, a0, b1, a1]
      const vs = [v0, v0, v1, v0, v1, v1]
      const order = under ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5]
      for (const i of order) {
        const p = quad[i]
        pos.push(p.x, under ? p.y - 0.06 : p.y, p.z)
        uv.push(u(p) / tile, vs[i] / tile)
      }
      v0 = v1
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  const col = new Float32Array((pos.length / 3) * 3).fill(under ? 0.55 : 1)
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

function plane(x0: number, z0: number, x1: number, z1: number, y: number, tile: number, down: boolean) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0)
  g.rotateX(down ? Math.PI / 2 : -Math.PI / 2)
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2)
  worldUv(g, tile)
  const col = new Float32Array(g.attributes.position.count * 3).fill(0.7)
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

/** topeng tanah: R = jalan batu, G = rumput; 4 px per meter */
function groundMask() {
  const px = 512
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')!
  const k = px / GROUND
  const P = (v: number) => (v + GROUND / 2) * k
  g.fillStyle = '#000'
  g.fillRect(0, 0, px, px)
  let r = 101
  const rand = () => {
    let v: number
    ;[v, r] = nextRand(r)
    return v
  }
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 260; i++) {
    const x = rand() * px
    const y = rand() * px
    const s = 6 + rand() * 30
    const grad = g.createRadialGradient(x, y, 0, x, y, s)
    grad.addColorStop(0, 'rgba(0,200,0,0.9)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(x - s, y - s, s * 2, s * 2)
  }
  g.globalCompositeOperation = 'source-over'
  // halaman rumah & sekitar bangunan diinjak-injak: tanah
  g.fillStyle = 'rgba(0,0,0,0.85)'
  for (const z of ZONES.filter((z) => z.id !== 'kebun' && z.id !== 'bambu')) g.fillRect(P(z.x0) - 10, P(z.z0) - 10, (z.x1 - z.x0) * k + 20, (z.z1 - z.z0) * k + 20)
  g.filter = 'blur(2px)'
  g.strokeStyle = 'rgb(255,0,0)'
  g.lineCap = g.lineJoin = 'round'
  g.lineWidth = 1.7 * k
  for (const p of PATHS) {
    g.beginPath()
    p.forEach(([x, z], i) => (i ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z))))
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.flipY = false
  return t
}

export type Built = {
  group: THREE.Group
  /** daun & kain yang memakai uTime */
  ferns: THREE.InstancedMesh | null
  gate: THREE.Object3D
}

/** semua benda diam di map */
export async function buildWorld(tx: Textures, tier: Tier, rand0 = 1): Promise<Built> {
  const group = new THREE.Group()
  const byMat = new Map<Mat, THREE.BufferGeometry[]>()
  const add = (m: Mat, g: THREE.BufferGeometry) => {
    if (!byMat.has(m)) byMat.set(m, [])
    byMat.get(m)!.push(g)
  }
  for (const b of BLOCKS) add(b.mat, boxGeo(b, tx.tile(b.mat)))
  for (const r of ROOFS) {
    add(r.mat, roofGeo(r, tx.tile(r.mat), false))
    add(r.mat === 'seng' ? 'seng' : 'kayu', roofGeo(r, tx.tile('kayu'), true))
  }
  for (const c of CEILINGS) add('papan', plane(c.x0, c.z0, c.x1, c.z1, c.y - 0.02, tx.tile('papan'), true))

  for (const [m, list] of byMat) {
    const geo = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)))
    const mesh = new THREE.Mesh(geo, tx.mat(m))
    mesh.castShadow = tier.shadow > 0 && m !== 'papan'
    mesh.receiveShadow = tier.shadow > 0
    mesh.matrixAutoUpdate = false
    group.add(mesh)
  }

  // tanah
  const [rumput, batu] = await Promise.all([tx.tex('rumput_diff'), tx.tex('batu_diff')])
  const tanah = await tx.pbr('tanah')
  const groundMat = new THREE.MeshStandardMaterial({ ...tanah, roughness: 1, color: 0x9a8e7e })
  groundBlend(groundMat, groundMask(), rumput, batu, GROUND)
  if (groundMat.normalMap) groundMat.normalScale.setScalar(0.9)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND).rotateX(-Math.PI / 2), groundMat)
  // UV normal & roughness memakai uv bawaan: perbanyak ulangan supaya sebanding
  for (const t of [groundMat.normalMap, groundMat.roughnessMap]) t?.repeat.setScalar(GROUND / 3.2)
  ground.receiveShadow = tier.shadow > 0
  group.add(ground)

  await addTrees(group, tx, tier)
  const ferns = await addFerns(group, tx, tier, rand0)
  const gate = await addProps(group, tx, tier)
  addWindows(group)
  return { group, ferns, gate }
}

/* ---------- pepohonan ---------- */

const dummy = new THREE.Object3D()

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], shadow: boolean) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length))
  list.forEach((mx, i) => m.setMatrixAt(i, mx))
  m.count = list.length
  m.castShadow = shadow
  m.receiveShadow = shadow
  m.computeBoundingSphere()
  m.frustumCulled = false
  return m
}

const at = (x: number, y: number, z: number, yaw: number, s: number, sy = s) => {
  dummy.position.set(x, y, z)
  dummy.rotation.set(0, yaw, 0)
  dummy.scale.set(s, sy, s)
  dummy.updateMatrix()
  return dummy.matrix.clone()
}

async function addTrees(group: THREE.Group, tx: Textures, tier: Tier) {
  const shadow = tier.shadow > 0
  // pohon besar dari pack alam CC0 (dipakai juga di Kart Kacau)
  const gltf = await new GLTFLoader().loadAsync(treeUrl)
  gltf.scene.updateMatrixWorld(true)
  const parts: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }[] = []
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld)
    if (mats.length === 1) parts.push({ geo, mat: mats[0] as THREE.MeshStandardMaterial })
    else {
      for (const gr of geo.groups) {
        const sub = geo.clone()
        sub.setIndex(Array.from((geo.index!.array as Uint16Array).slice(gr.start, gr.start + gr.count)))
        parts.push({ geo: sub, mat: mats[gr.materialIndex ?? 0] as THREE.MeshStandardMaterial })
      }
    }
  })
  const big = TREES.filter((t) => t.kind === 'pohon' || t.kind === 'kamboja').map((t) => at(t.x, 0, t.z, t.yaw, t.kind === 'kamboja' ? 0.45 * t.s : 0.8 * t.s))
  for (const p of parts) {
    const mat = p.mat.clone()
    const leaf = /leaves/i.test(mat.name)
    mat.color.multiplyScalar(leaf ? 0.55 : 0.6)
    if (leaf) {
      mat.alphaTest = 0.4
      mat.side = THREE.DoubleSide
      windSway(mat, 0.035, 2.5)
    }
    if (!tier.pbr) mat.normalMap = null
    group.add(instanced(p.geo, mat, big, shadow))
  }

  // pisang: batang semu + 7 pelepah daun lebar yang melengkung
  const bananas = TREES.filter((t) => t.kind === 'pisang')
  const bark = await tx.pbr('kulit', { nor: true, rough: false })
  const trunkMat = new THREE.MeshStandardMaterial({ ...bark, color: 0x7d8a5a, roughness: 0.9 })
  const trunk = new THREE.CylinderGeometry(0.11, 0.17, 2.6, 10, 1).translate(0, 1.3, 0)
  group.add(instanced(trunk, trunkMat, bananas.map((t) => at(t.x, 0, t.z, t.yaw, t.s)), shadow))
  const leafGeos: THREE.BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const g = new THREE.PlaneGeometry(0.7, 2.4, 1, 10)
    const pos = g.attributes.position
    for (let v = 0; v < pos.count; v++) {
      const t = (pos.getY(v) + 1.2) / 2.4
      // melengkung ke bawah di ujung, cekung di tengah
      pos.setZ(v, -t * t * 1.4 + Math.abs(pos.getX(v)) * 0.25)
      pos.setY(v, t * 2.4 - t * t * 0.6)
    }
    g.computeVertexNormals()
    g.rotateX(-0.5 - (i % 3) * 0.25)
    g.rotateY((i / 7) * Math.PI * 2 + (i % 2) * 0.3)
    g.translate(0, 2.45, 0)
    leafGeos.push(g)
  }
  const leafMat = new THREE.MeshStandardMaterial({ map: bananaLeaf(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, color: 0x8a9a78 })
  windSway(leafMat, 0.06, 2.3)
  group.add(instanced(mergeGeometries(leafGeos), leafMat, bananas.map((t) => at(t.x, 0, t.z, t.yaw, t.s)), shadow))

  // bambu: satu rumpun = 9..14 batang condong keluar, daun di pucuk
  const culms: THREE.Matrix4[] = []
  const tufts: THREE.Matrix4[] = []
  let r = 31
  const rand = () => {
    let v: number
    ;[v, r] = nextRand(r)
    return v
  }
  for (const t of TREES.filter((t) => t.kind === 'bambu')) {
    const n = 9 + Math.floor(rand() * 6)
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2
      const d = rand() * 0.55 * t.s
      const h = (6 + rand() * 4) * t.s
      const lean = 0.05 + rand() * 0.12
      dummy.position.set(t.x + Math.cos(a) * d, 0, t.z + Math.sin(a) * d)
      dummy.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean)
      dummy.scale.set(1, h, 1)
      dummy.updateMatrix()
      culms.push(dummy.matrix.clone())
      const top = new THREE.Vector3(0, 1, 0).applyMatrix4(dummy.matrix)
      for (let k = 0; k < 3; k++) {
        dummy.position.set(top.x + (rand() - 0.5) * 1.2, top.y - 0.6 - k * 1.1, top.z + (rand() - 0.5) * 1.2)
        dummy.rotation.set(0, rand() * Math.PI * 2, 0)
        dummy.scale.setScalar(1.6 + rand())
        dummy.updateMatrix()
        tufts.push(dummy.matrix.clone())
      }
    }
  }
  const culmMat = new THREE.MeshStandardMaterial({ map: bambooBark(), roughness: 0.6, color: 0x8c946a })
  culmMat.map!.repeat.set(1, 6)
  group.add(instanced(new THREE.CylinderGeometry(0.045, 0.06, 1, 7, 1, true).translate(0, 0.5, 0), culmMat, culms, shadow))
  const tuftGeo = mergeGeometries([0, 1, 2].map((k) => new THREE.PlaneGeometry(1, 1).rotateY((k * Math.PI) / 3)))
  const tuftMat = new THREE.MeshStandardMaterial({ map: await tx.tex('daun_diff'), alphaTest: 0.45, side: THREE.DoubleSide, color: 0x6f8f4a, roughness: 0.8 })
  windSway(tuftMat, 0.12, -0.5)
  group.add(instanced(tuftGeo, tuftMat, tufts, false))
}

/** pakis & semak rendah, rapatnya menurut tingkat grafis */
async function addFerns(group: THREE.Group, tx: Textures, tier: Tier, seed: number) {
  const n = Math.round(2600 * tier.detail)
  if (!n) return null
  const atlas = await tx.tex('daun2_diff')
  const geo = mergeGeometries([0, 1].map((k) => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY((k * Math.PI) / 2)))
  // potong atlas: pakis di kiri bawah
  const uv = geo.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + uv.getX(i) * 0.28, 0.02 + uv.getY(i) * 0.53)
  const mat = new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x5d6e46, roughness: 0.85 })
  windSway(mat, 0.08, 0.1)
  const list: THREE.Matrix4[] = []
  let r = seed * 7919
  const rand = () => {
    let v: number
    ;[v, r] = nextRand(r)
    return v
  }
  const busy = ZONES.filter((z) => z.id !== 'kebun' && z.id !== 'bambu')
  for (let i = 0; i < n * 3 && list.length < n; i++) {
    const x = (rand() * 2 - 1) * (HALF - 1)
    const z = (rand() * 2 - 1) * (HALF - 1)
    if (busy.some((b) => x > b.x0 - 1.5 && x < b.x1 + 1.5 && z > b.z0 - 1.5 && z < b.z1 + 1.5)) continue
    if (PATHS.some((p) => p.some(([px, pz], j) => j > 0 && segDist(x, z, p[j - 1], [px, pz]) < 1.6))) continue
    const s = 0.4 + rand() * 0.6
    list.push(at(x, 0, z, rand() * 6.3, s, s * (0.8 + rand() * 0.5)))
  }
  const m = instanced(geo, mat, list, false)
  group.add(m)
  return m
}

function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)
}

/* ---------- benda kecil ---------- */

function lathe(points: [number, number][], seg = 20) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg)
}

async function addProps(group: THREE.Group, tx: Textures, tier: Tier): Promise<THREE.Object3D> {
  const shadow = tier.shadow > 0
  const of = (k: Prop['kind']) => PROPS.filter((p) => p.kind === k)
  const mats = {
    batu: tx.mat('batu'),
    bata: tx.mat('bata'),
    kayu: tx.mat('kayu'),
    tanah: new THREE.MeshStandardMaterial({ ...(await tx.pbr('tanah')), color: 0x6b5a48, roughness: 1 }),
    kain: tx.mat('kain'),
    seng: tx.mat('seng'),
    pintu: tx.mat('pintu'),
    genteng: tx.mat('genteng'),
    tanahLiat: new THREE.MeshStandardMaterial({ map: (await tx.pbr('bata')).map, color: 0xb0704a, roughness: 0.85 }),
  }
  const plain = (m: THREE.MeshStandardMaterial) => {
    const c = m.clone()
    c.vertexColors = false
    return c
  }

  // nisan: papan batu berpuncak lengkung + gundukan tanah + kain putih yang lusuh di sebagian
  const nisanShape = new THREE.Shape()
  nisanShape.moveTo(-0.22, 0)
  nisanShape.lineTo(-0.22, 0.45)
  nisanShape.quadraticCurveTo(-0.22, 0.7, 0, 0.72)
  nisanShape.quadraticCurveTo(0.22, 0.7, 0.22, 0.45)
  nisanShape.lineTo(0.22, 0)
  const nisanGeo = new THREE.ExtrudeGeometry(nisanShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 })
  nisanGeo.translate(0, 0, -0.05)
  const graves = of('nisan')
  const nisanMats = graves.map((p) => at(p.x, 0, p.z - 0.9, p.yaw, p.s))
  group.add(instanced(nisanGeo, plain(mats.batu), nisanMats, shadow))
  group.add(instanced(nisanGeo, plain(mats.batu), graves.map((p) => at(p.x, 0, p.z + 0.9, p.yaw, p.s * 0.8)), shadow))
  const mound = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  mound.scale(0.45, 0.22, 1.05)
  group.add(instanced(mound, mats.tanah, graves.map((p) => at(p.x, 0, p.z, p.yaw, p.s)), shadow))

  // sumur
  for (const p of of('sumur')) {
    const g = new THREE.Group()
    g.position.set(p.x, p.y, p.z)
    const ring = lathe([[0.95, 0], [0.95, 0.85], [0.8, 0.85], [0.8, 0.0]], 24)
    g.add(new THREE.Mesh(ring, plain(mats.bata)))
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x020405, roughness: 0.05, metalness: 0.6 }))
    water.position.y = 0.25
    g.add(water)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8).rotateZ(Math.PI / 2), plain(mats.kayu))
    bar.position.y = 2.1
    g.add(bar)
    const roof = new THREE.Mesh(roofGeo({ x: 0, z: 0, hx: 1.6, hz: 1.1, y: 2.4, h: 0.7, ridge: 2.6, mat: 'genteng' }, 2, false), mats.genteng)
    g.add(roof)
    const bucket = new THREE.Mesh(lathe([[0.14, 0], [0.18, 0.28], [0.17, 0.28], [0.13, 0.01]], 14), plain(mats.seng))
    bucket.position.set(0.3, 0.86, 0.75)
    g.add(bucket)
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.9), new THREE.MeshStandardMaterial({ color: 0x6b5a3e }))
    rope.position.set(0, 1.15, 0)
    g.add(rope)
    g.traverse((o) => (o.castShadow = o.receiveShadow = shadow))
    group.add(g)
  }

  // bedug langgar
  for (const p of of('bedug')) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 24).rotateZ(Math.PI / 2), plain(mats.kayu))
    drum.position.set(p.x, p.y + 1.1, p.z)
    const head = new THREE.MeshStandardMaterial({ color: 0xc8b08a, roughness: 0.9 })
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24).rotateY((s * Math.PI) / 2), head)
      h.position.set(s * 0.48, 0, 0)
      drum.add(h)
    }
    group.add(drum)
  }

  // drum minyak berkarat
  const drumGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 20).translate(0, 0.45, 0)
  const rust = plain(mats.seng)
  rust.color.set(0x7a4a30)
  group.add(instanced(drumGeo, rust, of('drum').map((p) => at(p.x, p.y, p.z, p.yaw, p.s)), shadow))

  // karung goni
  const sack = new THREE.SphereGeometry(0.4, 14, 10)
  sack.scale(1, 0.75, 0.7).translate(0, 0.28, 0)
  const burlap = plain(mats.kain)
  burlap.color.set(0x9a8358)
  group.add(instanced(sack, burlap, of('karung').map((p) => at(p.x, p.y, p.z, p.yaw, p.s)), shadow))

  // tempayan air
  const jar = lathe([[0.01, 0], [0.3, 0.05], [0.42, 0.35], [0.38, 0.62], [0.24, 0.75], [0.27, 0.8], [0.24, 0.8]], 22)
  group.add(instanced(jar, mats.tanahLiat, of('tempayan').map((p) => at(p.x, p.y, p.z, p.yaw, p.s)), shadow))

  // tikar pandan
  const weave = new THREE.MeshStandardMaterial({ map: matWeave(), roughness: 0.95 })
  for (const p of of('tikar')) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8 * p.s, 2.4 * p.s).rotateX(-Math.PI / 2), weave)
    m.position.set(p.x, p.y, p.z)
    m.rotation.y = p.yaw
    m.receiveShadow = shadow
    group.add(m)
  }

  // kelambu: kain tipis menjuntai di atas dipan, ikut tertiup angin
  const net = new THREE.MeshStandardMaterial({ color: 0xe8e4da, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, roughness: 1 })
  windSway(net, 0.03, 0)
  for (const p of of('kelambu')) {
    const g = new THREE.BoxGeometry(2.8, 1.9, 2.4, 4, 6, 4).translate(0, 0.95, 0)
    const m = new THREE.Mesh(g, net)
    m.position.set(p.x, p.y, p.z)
    group.add(m)
    for (const [dx, dz] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.95), plain(mats.kayu))
      post.position.set(p.x + dx, p.y + 0.97, p.z + dz)
      group.add(post)
    }
  }

  // foto keluarga di dinding
  for (const p of of('foto')) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.76, 0.04), plain(mats.kayu))
    frame.position.set(p.x, p.y, p.z)
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.64), new THREE.MeshStandardMaterial({ map: oldPhoto(), roughness: 0.6 }))
    pic.position.z = 0.025
    frame.add(pic)
    frame.rotation.y = p.yaw
    frame.rotation.z = 0.06
    group.add(frame)
  }

  // pintu gerbang kayu dua daun (dibuka saat semua pusaka terkumpul)
  const gate = new THREE.Group()
  for (const p of of('gerbang')) {
    gate.position.set(p.x, p.y, p.z)
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.x = s * 2
      pivot.name = s < 0 ? 'kiri' : 'kanan'
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.12).translate(-s, 1.25, 0), plain(mats.pintu))
      leaf.castShadow = shadow
      pivot.add(leaf)
      for (const y of [0.4, 2.1]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.14).translate(-s, y, 0), new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.8, roughness: 0.5 }))
        pivot.add(band)
      }
      gate.add(pivot)
    }
    // gembok berkilau samar: petunjuk tujuan akhir
    const lockMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 1, roughness: 0.35 })
    glimmer(lockMat, 0x6a4a1a)
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08), lockMat)
    lock.position.set(0, 1.3, -0.1)
    lock.name = 'gembok'
    gate.add(lock)
    group.add(gate)
  }
  return gate
}

/** jendela berkisi pada dinding luar rumah & langgar */
function addWindows(group: THREE.Group) {
  const mat = new THREE.MeshStandardMaterial({ map: windowTex(), roughness: 0.9 })
  const list: [number, number, number][] = [
    [-3.4, 6.115, 0], [3.4, 6.115, 0], [-8.5, 6.115, 0], [8.5, 6.115, 0],
    [-8.5, -14.115, Math.PI], [8.5, -14.115, Math.PI], [-3.5, -14.115, Math.PI], [3.5, -14.115, Math.PI],
    [-12.115, 1, -Math.PI / 2], [-12.115, -9, -Math.PI / 2], [12.115, 1, Math.PI / 2],
    [32, -28.385, 0], [36, -28.385, 0], [30.385, -32, -Math.PI / 2], [37.615, -32, Math.PI / 2],
  ]
  for (const [x, z, yaw] of list) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), mat)
    m.position.set(x, 1.7, z)
    m.rotation.y = yaw
    group.add(m)
  }
}
