import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addPulse, addRim, addWind, type Clock } from '@/games/sport/render/shaders'
import type { Tree } from '../mountains'
import { ITEMS, type ItemId } from '../sim/items'
import { rng } from '../sim/noise'
import { CELL, type ChestKind, type Deck, type Rope, type Solid, type Terrain } from '../sim/terrain'
import { loadTex, packedPbr } from './textures'

// ---------- geometri dasar ----------

/** batang meruncing, sedikit bengkok, uv kulit kayu diulang menurut tinggi */
function trunk(h: number, r0: number, r1: number, bend: number, seed: number, seg = 8) {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg, 8, true)
  g.translate(0, h / 2, 0)
  const p = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  const r = rng(seed)
  const wob = Array.from({ length: 9 }, () => (r() - 0.5) * r0 * 0.25)
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const t = y / h
    const ring = Math.round(t * 8)
    const a = Math.atan2(p.getZ(i), p.getX(i))
    // akar melebar di pangkal, lekuk kecil di sepanjang batang
    const flare = 1 + Math.max(0, 0.25 - t) * 2.4 * (1 + Math.sin(a * 5) * 0.3)
    p.setX(i, p.getX(i) * flare + Math.sin(t * Math.PI * 0.5) * bend * h + wob[ring])
    p.setZ(i, p.getZ(i) * flare + wob[(ring + 3) % 9])
    uv.setXY(i, uv.getX(i) * 2, (y / 2.2) * (1 / Math.max(0.6, r0 * 3)))
  }
  g.computeVertexNormals()
  return g
}

/** awan kartu daun: kartu-kartu acak dalam bola, normal mengarah keluar supaya cahayanya membulat */
function leafCluster(cx: number, cy: number, cz: number, rad: number, cards: number, seed: number, flat = 1) {
  const r = rng(seed)
  const parts: THREE.BufferGeometry[] = []
  const c = new THREE.Vector3(cx, cy, cz)
  for (let i = 0; i < cards; i++) {
    const s = rad * (0.55 + r() * 0.5)
    const q = new THREE.PlaneGeometry(s, s)
    q.rotateX(r() * Math.PI)
    q.rotateY(r() * Math.PI * 2)
    q.rotateZ(r() * Math.PI)
    const u = r() * Math.PI * 2
    const v = Math.acos(r() * 2 - 1)
    const d = rad * Math.cbrt(r()) * 0.75
    q.translate(cx + Math.sin(v) * Math.cos(u) * d, cy + Math.cos(v) * d * flat, cz + Math.sin(v) * Math.sin(u) * d)
    parts.push(q)
  }
  const g = mergeGeometries(parts)!
  const p = g.attributes.position as THREE.BufferAttribute
  const n = g.attributes.normal as THREE.BufferAttribute
  const tmp = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    tmp.set(p.getX(i), p.getY(i), p.getZ(i)).sub(c).normalize()
    n.setXYZ(i, tmp.x, tmp.y * 0.8 + 0.3, tmp.z)
  }
  return g
}

/** daun palem: pita panjang melengkung ke bawah */
function frond(len: number, wid: number, yaw: number, droop: number, y: number) {
  const g = new THREE.PlaneGeometry(wid, len, 1, 8)
  g.translate(0, len / 2, 0)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const d = -p.getZ(i)
    p.setY(i, p.getY(i) + y - (d / len) ** 2 * droop + d * 0.25)
    p.setX(i, p.getX(i) * (1 - (d / len) * 0.6))
  }
  g.rotateY(yaw)
  g.computeVertexNormals()
  return g
}

function cone(rad: number, h: number, y: number, cards: number, seed: number) {
  const r = rng(seed)
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < cards; i++) {
    const a = (i / cards) * Math.PI * 2 + r() * 0.4
    const q = new THREE.PlaneGeometry(rad * 1.2, h * 1.1)
    q.translate(0, -h * 0.25, rad * 0.45)
    q.rotateX(0.75)
    q.rotateY(a)
    q.translate(0, y, 0)
    parts.push(q)
  }
  const g = mergeGeometries(parts)!
  const n = g.attributes.normal as THREE.BufferAttribute
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), (p.getY(i) - y) * 0.5 + 0.6, p.getZ(i)).normalize()
    n.setXYZ(i, v.x, v.y, v.z)
  }
  return g
}

type Template = { wood: THREE.BufferGeometry | null; leaf: THREE.BufferGeometry | null; crystal?: THREE.BufferGeometry; tint: string; height: number }

/** bentuk tiap jenis pohon; tinggi = `height` sebelum diskalakan per pohon */
function template(kind: Tree): Template {
  switch (kind) {
    case 'palem': {
      const w = trunk(8.6, 0.32, 0.2, 0.16, 1)
      const tip = new THREE.Vector3(8.6 * 0.16, 8.6, 0)
      const fr = Array.from({ length: 9 }, (_, i) => frond(4.2, 1.2, (i / 9) * Math.PI * 2, 2.6, 0).translate(tip.x, tip.y, tip.z))
      return { wood: w, leaf: mergeGeometries([...fr, leafCluster(tip.x, tip.y, tip.z, 1.1, 6, 3)])!, tint: '#7fb046', height: 9 }
    }
    case 'jati': {
      const w = mergeGeometries([trunk(7, 0.42, 0.22, 0.04, 4), trunk(3, 0.18, 0.08, 0.3, 5).rotateZ(0.7).translate(0, 4.4, 0), trunk(3, 0.18, 0.08, 0.3, 6).rotateZ(-0.6).rotateY(2).translate(0, 5, 0)])!
      const leaf = mergeGeometries([leafCluster(0, 8.2, 0, 3.4, 26, 7, 0.7), leafCluster(1.8, 6.8, 0.6, 2.4, 14, 8), leafCluster(-1.6, 7, -1, 2.3, 14, 9)])!
      return { wood: w, leaf, tint: '#5f9a3a', height: 11 }
    }
    case 'beringin': {
      // pohon raksasa: banyak akar tunjang
      const roots = Array.from({ length: 7 }, (_, i) => trunk(4.5, 0.22, 0.12, 0.5, 20 + i).rotateZ(Math.PI - 0.5).rotateY((i / 7) * Math.PI * 2).translate(0, 4.6, 0))
      const w = mergeGeometries([trunk(13, 1.25, 0.6, 0.03, 10, 10), ...roots, trunk(6, 0.4, 0.15, 0.2, 11).rotateZ(1.0).translate(0, 9, 0), trunk(6, 0.4, 0.15, 0.2, 12).rotateZ(-1.0).rotateY(1.5).translate(0, 9.5, 0)])!
      const leaf = mergeGeometries([leafCluster(0, 15, 0, 6.5, 48, 13, 0.55), leafCluster(4.5, 12.5, 1, 4, 22, 14, 0.6), leafCluster(-4, 13, -2, 4, 22, 15, 0.6), leafCluster(1, 12, -4.5, 3.6, 18, 16, 0.6)])!
      return { wood: w, leaf, tint: '#4b8a30', height: 16 }
    }
    case 'pinus': {
      const w = trunk(11.5, 0.36, 0.08, 0, 30)
      const leaf = mergeGeometries([cone(3.4, 3, 4.6, 9, 31), cone(2.8, 2.8, 6.6, 8, 32), cone(2.1, 2.5, 8.5, 7, 33), cone(1.4, 2.2, 10.2, 6, 34), cone(0.8, 1.6, 11.6, 5, 35)])!
      return { wood: w, leaf, tint: '#2f5e2a', height: 12 }
    }
    case 'kering': {
      const w = mergeGeometries([
        trunk(6.5, 0.32, 0.1, 0.06, 40),
        trunk(2.6, 0.12, 0.03, 0.4, 41).rotateZ(0.9).translate(0, 3.6, 0),
        trunk(2.2, 0.1, 0.03, 0.3, 42).rotateZ(-0.8).rotateY(2.2).translate(0, 4.4, 0),
        trunk(1.8, 0.08, 0.02, 0.3, 43).rotateZ(0.7).rotateY(4).translate(0, 5.3, 0),
      ])!
      return { wood: w, leaf: null, tint: '#6b5a40', height: 7 }
    }
    case 'semak':
      return { wood: null, leaf: mergeGeometries([leafCluster(0, 0.6, 0, 1.0, 12, 50, 0.6), leafCluster(0.5, 0.45, 0.3, 0.7, 7, 51, 0.6)])!, tint: '#4f8a2e', height: 1.3 }
    case 'teh':
      return { wood: null, leaf: mergeGeometries([leafCluster(0, 0.55, 0, 0.9, 14, 60, 0.45), leafCluster(0.6, 0.5, 0, 0.75, 10, 61, 0.45), leafCluster(-0.6, 0.5, 0, 0.75, 10, 62, 0.45)])!, tint: '#3e7d24', height: 1.1 }
    case 'karang': {
      const parts = Array.from({ length: 6 }, (_, i) => {
        const c = new THREE.CylinderGeometry(0.06, 0.2, 1.4 + (i % 3) * 0.4, 6)
        c.translate(0, 0.7, 0)
        c.rotateZ((i - 2.5) * 0.25)
        c.rotateY(i * 1.1)
        return c
      })
      return { wood: null, leaf: null, crystal: mergeGeometries(parts)!, tint: '#ff7a8a', height: 2.2 }
    }
    case 'kristal': {
      const parts = Array.from({ length: 5 }, (_, i) => {
        const h = 2 + ((i * 7) % 5) * 0.7
        const body = new THREE.CylinderGeometry(0.32, 0.4, h, 6)
        body.translate(0, h / 2, 0)
        const tip = new THREE.ConeGeometry(0.32, 0.8, 6)
        tip.translate(0, h + 0.4, 0)
        const g = mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()])!
        g.rotateZ((i - 2) * 0.28)
        g.rotateY(i * 1.3)
        g.translate((i - 2) * 0.25, 0, ((i * 3) % 5) * 0.12 - 0.25)
        return g
      })
      const g = mergeGeometries(parts)!
      g.computeVertexNormals()
      return { wood: null, leaf: null, crystal: g, tint: '#9a6bff', height: 5 }
    }
  }
}

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return s - Math.floor(s)
}

export type PropMats = { bark: THREE.MeshStandardMaterial; leaf: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; crystal: THREE.MeshStandardMaterial; coral: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial }

/**
 * Kartu daun/rumput dua sisi: normal TIDAK dibalik untuk sisi belakang (bawaan three membaliknya,
 * sehingga separuh kartu jadi hitam). Semua kartu diterangi dari arah normalnya.
 */
function noFlip(m: THREE.Material) {
  const prev = m.onBeforeCompile
  const key = m.customProgramCacheKey()
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r)
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `float faceDirection = 1.0;
       vec3 normal = normalize( vNormal );
       vec3 nonPerturbedNormal = normal;`,
    )
  }
  m.customProgramCacheKey = () => `${key}|noflip`
  m.needsUpdate = true
}

export async function propMaterials(clock: Clock, pbr: boolean, snowy: boolean): Promise<PropMats> {
  const bark = await packedPbr(new THREE.MeshStandardMaterial({ roughness: 1 }), 'kulit_kayu', 1, pbr)
  const leaf = new THREE.MeshStandardMaterial({ map: await loadTex('daun.webp', true), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 })
  addWind(leaf, clock, { strength: 0.18, height: 14 })
  noFlip(leaf)
  // tembus cahaya palsu: daun sedikit menyala dari warnanya sendiri
  leaf.emissive.set('#1c3510')
  leaf.emissiveIntensity = 0.35
  const rock = await packedPbr(new THREE.MeshStandardMaterial({ roughness: 1 }), snowy ? 'batu' : 'batu', 1, pbr)
  const crystal = new THREE.MeshStandardMaterial({ color: '#b48cff', emissive: '#6a3cff', emissiveIntensity: 1.6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 })
  addRim(crystal, '#e6d8ff', 0.9)
  addPulse(crystal, clock)
  const coral = await packedPbr(new THREE.MeshStandardMaterial({ color: '#ff8a7a', roughness: 1 }), 'batu', 0.5, pbr)
  const wood = await packedPbr(new THREE.MeshStandardMaterial({ color: '#c8a27a', roughness: 1 }), 'kulit_kayu', 1, pbr)
  const grass = new THREE.MeshStandardMaterial({ map: await loadTex('helai.webp', true), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })
  addWind(grass, clock, { strength: 0.12, height: 0.7 })
  noFlip(grass)
  grass.emissive.set('#2a2618')
  grass.emissiveIntensity = 0.25
  return { bark, leaf, rock, crystal, coral, wood, grass }
}

/** semua pohon & batu besar: satu InstancedMesh per jenis & bagian */
export function forest(solids: Solid[], mats: PropMats, shadows: boolean, snow: number) {
  const group = new THREE.Group()
  const byKind = new Map<string, Solid[]>()
  for (const s of solids) byKind.set(s.kind, [...(byKind.get(s.kind) ?? []), s])
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const col = new THREE.Color()
  for (const [kind, list] of byKind) {
    if (kind === 'batu') {
      const g = new THREE.IcosahedronGeometry(1, 3)
      const p = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))
        const n = Math.sin(v.x * 3.1 + v.y * 1.7) * 0.12 + Math.sin(v.z * 4.3 - v.x * 2.1) * 0.08 + Math.sin(v.y * 7 + v.z * 5) * 0.04
        v.multiplyScalar(1 + n)
        v.y = v.y > 0 ? v.y * 0.85 : v.y * 0.5
        p.setXYZ(i, v.x, v.y, v.z)
      }
      g.computeVertexNormals()
      const im = new THREE.InstancedMesh(g, mats.rock, list.length)
      list.forEach((s, i) => {
        q.setFromAxisAngle(up, hash(s.x, s.z) * 6.28)
        const k = s.r
        m4.compose(new THREE.Vector3(s.x, s.y + k * 0.15, s.z), q, new THREE.Vector3(k * (1 + hash(s.z, s.x) * 0.4), k * 0.95, k))
        im.setMatrixAt(i, m4)
        col.setScalar(0.85 + hash(s.x + 1, s.z) * 0.3)
        im.setColorAt(i, col)
      })
      im.castShadow = shadows
      im.receiveShadow = shadows
      group.add(im)
      continue
    }
    const tpl = template(kind as Tree)
    const parts: [THREE.BufferGeometry | null | undefined, THREE.Material][] = [
      [tpl.wood, mats.bark],
      [tpl.leaf, mats.leaf],
      [tpl.crystal, kind === 'karang' ? mats.coral : mats.crystal],
    ]
    for (const [geo, mat] of parts) {
      if (!geo) continue
      const im = new THREE.InstancedMesh(geo, mat, list.length)
      list.forEach((s, i) => {
        const sc = (s.top - s.y) / tpl.height
        q.setFromAxisAngle(up, hash(s.x, s.z) * 6.28)
        m4.compose(new THREE.Vector3(s.x, s.y - 0.1, s.z), q, new THREE.Vector3(sc, sc, sc))
        im.setMatrixAt(i, m4)
        if (mat === mats.leaf) {
          // warna daun tiap pohon sedikit beda; di zona salju lebih pucat
          col.set(tpl.tint).offsetHSL((hash(s.z, s.x) - 0.5) * 0.06, 0, (hash(s.x, s.z * 2) - 0.5) * 0.12)
          if (snow > 0.3) col.lerp(new THREE.Color('#e8eef5'), Math.min(0.55, snow * 0.5))
          im.setColorAt(i, col)
        }
      })
      im.castShadow = shadows && kind !== 'semak' && kind !== 'teh'
      im.receiveShadow = shadows
      group.add(im)
    }
  }
  return group
}

/** rumput instans per potongan medan; hanya potongan dekat kamera yang digambar */
export function meadow(t: Terrain, mats: PropMats, density: number, grassLayer: number) {
  const blade = mergeGeometries([new THREE.PlaneGeometry(0.75, 0.55).translate(0, 0.27, 0), new THREE.PlaneGeometry(0.75, 0.55).translate(0, 0.27, 0).rotateY(Math.PI / 2)])!
  // normal menghadap atas: rumput diterangi seperti tanah di bawahnya, tidak gelap dari belakang
  {
    const nn = blade.attributes.normal as THREE.BufferAttribute
    for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0)
  }
  const patches: THREE.InstancedMesh[] = []
  const CH = 24
  const cells = Math.ceil(t.size / CH)
  const r = rng(91)
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const col = new THREE.Color()
  const per = Math.round(CH * CH * 1.1 * density)
  for (let cj = 0; cj < cells; cj++) {
    for (let ci = 0; ci < cells; ci++) {
      const pts: [number, number, number, number, number][] = []
      for (let k = 0; k < per; k++) {
        const x = ci * CH - t.half + r() * CH
        const z = cj * CH - t.half + r() * CH
        const i = Math.round((x + t.half) / CELL)
        const j = Math.round((z + t.half) / CELL)
        if (i < 1 || j < 1 || i >= t.n - 1 || j >= t.n - 1) continue
        const idx = j * t.n + i
        const zone = t.zone[idx]
        const zn = t.m.zones[zone]
        if (!zn.grass || t.snow[idx] > 90) continue
        // tidak di tengah jalan setapak (slot 1 tinggi), tidak di muka batu
        const w = 1 - t.w[idx * 4 + 1] / 255
        if (w < 0.45) continue
        const h = t.h[idx]
        const gx = (t.h[idx + 1] - t.h[idx - 1]) / (2 * CELL)
        const gz = (t.h[idx + t.n] - t.h[idx - t.n]) / (2 * CELL)
        if (Math.hypot(gx, gz) > 0.8 || (t.m.sea && h < t.m.sea.y + 0.3)) continue
        if (r() > (zn.grass === 'kering' ? 0.85 : 0.6)) continue
        pts.push([x, h, z, w, zn.grass === 'kering' ? 1 : 0])
      }
      if (!pts.length) continue
      const im = new THREE.InstancedMesh(blade, mats.grass, pts.length)
      pts.forEach(([x, y, z, w, dry], i) => {
        q.setFromAxisAngle(up, r() * 6.28)
        // rumput kering: rumpun tinggi keemasan seperti gambar referensi
        const s = (0.55 + r() * 0.55 * w) * (dry ? 1.35 : 1)
        m4.compose(new THREE.Vector3(x, y - 0.05, z), q, new THREE.Vector3(s, s * (dry ? 1.5 + r() * 0.6 : 0.8 + r() * 0.5), s))
        im.setMatrixAt(i, m4)
        if (dry) col.setHSL(0.11 + r() * 0.025, 0.55 + r() * 0.15, 0.4 + r() * 0.1)
        else col.setHSL(0.24 + r() * 0.06, 0.55, 0.42 + r() * 0.14)
        im.setColorAt(i, col)
      })
      im.computeBoundingSphere()
      im.userData.cx = ci * CH - t.half + CH / 2
      im.userData.cz = cj * CH - t.half + CH / 2
      patches.push(im)
    }
  }
  void grassLayer
  return patches
}

// ---------- benda kecil ----------

const stdCache = new Map<string, THREE.MeshStandardMaterial>()
export function std(color: string, rough = 0.7, metal = 0, emissive?: string, ei = 1) {
  const key = `${color}${rough}${metal}${emissive}${ei}`
  let m = stdCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
    if (emissive) {
      m.emissive.set(emissive)
      m.emissiveIntensity = ei
    }
    stdCache.set(key, m)
  }
  return m
}

/** peti kayu bersabuk logam / sarang burung berisi telur / ransel pendaki */
export function chest(kind: ChestKind, wood: THREE.Material) {
  const g = new THREE.Group()
  if (kind === 'peti') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), wood)
    body.position.y = 0.3
    const lid = new THREE.Group()
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), wood)
    top.position.z = 0.35
    lid.add(top)
    lid.position.set(0, 0.6, -0.35)
    lid.name = 'lid'
    const metal = std('#b59a56', 0.35, 0.85)
    for (const x of [-0.42, 0.42]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.72), metal)
      band.position.set(x, 0.31, 0)
      g.add(band)
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), metal)
    lock.position.set(0, 0.55, 0.37)
    g.add(body, lid, lock)
  } else if (kind === 'sarang') {
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.18, 8, 18).rotateX(Math.PI / 2), std('#8a6a3a', 1))
    nest.position.y = 0.16
    g.add(nest)
    const egg = new THREE.SphereGeometry(0.12, 12, 10).scale(1, 1.3, 1)
    ;[0, 2, 4].forEach((i) => {
      const e = new THREE.Mesh(egg, std(i ? '#f4ecd8' : '#bfe0ff', 0.5))
      e.position.set(Math.cos(i) * 0.14, 0.2, Math.sin(i) * 0.14)
      e.name = 'egg'
      g.add(e)
    })
  } else {
    const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.4, 6, 12), std('#d0452f', 0.8))
    bag.position.y = 0.45
    bag.scale.set(1, 1, 0.7)
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.2), std('#8a2e20', 0.8))
    pocket.position.set(0, 0.35, 0.22)
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12).rotateZ(Math.PI / 2), std('#3a6fe0', 0.8))
    roll.position.y = 0.9
    g.add(bag, pocket, roll)
  }
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true))
  return g
}

/** api unggun: lingkar batu, kayu bersilang, bara (nyala diatur di scene) */
export function campfire(rock: THREE.Material, wood: THREE.Material) {
  const g = new THREE.Group()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), rock)
    s.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7)
    s.scale.set(1, 0.7, 1.2)
    g.add(s)
  }
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 8).rotateZ(Math.PI / 2 - 0.45), wood)
    log.rotation.y = (i / 4) * Math.PI
    log.position.y = 0.28
    g.add(log)
  }
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8).scale(1, 0.4, 1), std('#3a1a0a', 0.9, 0, '#ff5a14', 0))
  ember.position.y = 0.12
  ember.name = 'ember'
  g.add(ember)
  // batang duduk
  for (const a of [0.6, 2.6, 4.6]) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.6, 10).rotateZ(Math.PI / 2), wood)
    seat.position.set(Math.cos(a) * 2, 0.2, Math.sin(a) * 2)
    seat.rotation.y = -a + Math.PI / 2
    g.add(seat)
  }
  g.traverse((o) => {
    ;(o as THREE.Mesh).castShadow = true
    ;(o as THREE.Mesh).receiveShadow = true
  })
  return g
}

/** bendera puncak: kain berkibar */
export function summitFlag(clock: Clock) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4, 8), std('#e8e8e8', 0.3, 0.8))
  pole.position.y = 2
  const cloth = new THREE.MeshStandardMaterial({ color: '#ff37a6', side: THREE.DoubleSide, roughness: 0.8 })
  addWind(cloth, clock, { strength: 0.35, height: 1 })
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1, 12, 4).translate(0.8, 0, 0), cloth)
  flag.position.y = 3.4
  const heart = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), std('#5cf64a', 0.6, 0, '#5cf64a', 0.4))
  heart.position.set(0.8, 3.4, 0.01)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 10), std('#7a7068', 0.9))
  base.position.y = 0.2
  g.add(pole, flag, heart, base)
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true))
  return g
}

/** tali melengkung / sulur / tangga dari bibir ke bawah */
export function ropeMesh(r: Rope, wood: THREE.Material) {
  const g = new THREE.Group()
  const len = r.top - r.bottom
  if (r.kind === 'tangga') {
    const rail = new THREE.CylinderGeometry(0.04, 0.04, len, 6)
    for (const s of [-0.25, 0.25]) {
      const m = new THREE.Mesh(rail, wood)
      m.position.set(s, len / 2, 0)
      g.add(m)
    }
    for (let y = 0.3; y < len; y += 0.4) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6).rotateZ(Math.PI / 2), wood)
      rung.position.y = y
      g.add(rung)
    }
    g.position.set(r.x, r.bottom, r.z)
    g.rotation.y = Math.atan2(r.nx, r.nz)
    g.rotation.x = -0.12
    return g
  }
  const pts: THREE.Vector3[] = []
  const sway = r.kind === 'sulur' ? 0.25 : 0.12
  for (let i = 0; i <= 12; i++) {
    const k = i / 12
    const bow = Math.sin(k * Math.PI) * sway
    pts.push(new THREE.Vector3(r.x + r.nx * (0.25 + bow) + (r.tx - r.x) * Math.max(0, 1 - k * 6) * 0.15, r.top - k * len, r.z + r.nz * (0.25 + bow)))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const mat = r.kind === 'sulur' ? std('#3f6e24', 0.9) : std('#d9b778', 0.85)
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r.kind === 'sulur' ? 0.07 : 0.045, 6), mat)
  tube.castShadow = true
  g.add(tube)
  if (r.kind === 'sulur') {
    // daun kecil di sepanjang sulur
    for (let i = 1; i < 12; i += 2) {
      const p = curve.getPoint(i / 12)
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4).scale(1, 0.4, 0.7), std('#4f8a2e', 0.8))
      leaf.position.copy(p)
      leaf.rotation.set(i, i * 2, 0)
      g.add(leaf)
    }
  } else {
    const peg = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 6).rotateX(Math.PI), std('#9aa2ad', 0.3, 0.9))
    peg.position.set(r.x, r.top + 0.1, r.z)
    g.add(peg)
  }
  return g
}

/** jembatan papan bertali, atau lempeng kristal yang bisa pecah */
export function bridge(d: Deck, wood: THREE.Material, crystal: THREE.Material) {
  const g = new THREE.Group()
  const len = d.hz * 2
  const slope = Math.atan2(d.y1 - d.y0, len)
  if (d.fragile) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(d.hx * 2, 0.18, len), crystal)
    plate.position.y = -0.09
    plate.name = 'plate'
    g.add(plate)
  } else {
    for (let z = -d.hz + 0.2; z < d.hz; z += 0.42) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(d.hx * 2, 0.08, 0.34), wood)
      plank.position.set(0, -0.04, z)
      plank.rotation.z = Math.sin(z * 7.1) * 0.03
      g.add(plank)
    }
    const ropeMat = std('#d9b778', 0.85)
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 5).rotateX(Math.PI / 2), ropeMat)
      rail.position.set(s * d.hx, 0.85, 0)
      g.add(rail)
      for (let z = -d.hz; z <= d.hz + 0.01; z += len / 4) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.95, 6), wood)
        post.position.set(s * d.hx, 0.45, z)
        g.add(post)
      }
    }
  }
  g.position.set(d.x, (d.y0 + d.y1) / 2, d.z)
  g.rotation.order = 'YXZ'
  g.rotation.y = d.yaw
  g.rotation.x = -slope
  g.traverse((o) => {
    ;(o as THREE.Mesh).castShadow = true
    ;(o as THREE.Mesh).receiveShadow = true
  })
  return g
}

/** barang di tanah: bungkusan berwarna item dengan cincin bercahaya */
export function dropMesh(item: ItemId) {
  const g = new THREE.Group()
  const c = ITEMS[item].color
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), std(c, 0.5, 0, c, 0.35))
  box.position.y = 0.45
  box.name = 'spin'
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24).rotateX(Math.PI / 2), std('#ffffff', 0.4, 0, '#fff3c4', 1.4))
  ring.position.y = 0.06
  g.add(box, ring)
  return g
}

export function crab() {
  const g = new THREE.Group()
  const red = std('#e2452f', 0.5)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10).scale(1.2, 0.55, 1), red)
  body.position.y = 0.25
  g.add(body)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5).rotateZ((Math.PI / 2.6) * s), red)
      leg.position.set(s * 0.38, 0.14, (i - 1) * 0.16)
      g.add(leg)
    }
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8).scale(1, 0.7, 1.4), red)
    claw.position.set(s * 0.28, 0.32, 0.38)
    g.add(claw)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), std('#121212', 0.3))
    eye.position.set(s * 0.1, 0.45, 0.22)
    g.add(eye)
  }
  return g
}

export function bat() {
  const g = new THREE.Group()
  const dark = std('#2a1f3a', 0.7)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8).scale(1, 0.9, 1.4), dark)
  g.add(body)
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.42, 3, 0, Math.PI * 0.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3a2a4f', side: THREE.DoubleSide, roughness: 0.8 }))
    wing.position.x = s * 0.12
    wing.scale.x = s
    wing.name = s < 0 ? 'wingL' : 'wingR'
    g.add(wing)
  }
  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), std('#ff2a2a', 0.3, 0, '#ff2a2a', 2))
  eyes.position.set(0, 0.04, 0.2)
  g.add(eyes)
  return g
}

export function hive() {
  const g = new THREE.Group()
  const m = std('#c98a2a', 0.8)
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.32 - i * 0.04, 0.12, 8, 16).rotateX(Math.PI / 2), m)
    t.position.y = i * 0.18
    g.add(t)
  }
  return g
}

export function boulder(rock: THREE.Material) {
  const g = new THREE.IcosahedronGeometry(0.85, 2)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const s = 1 + Math.sin(p.getX(i) * 4 + p.getY(i) * 3) * 0.1
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s)
  }
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, rock)
  m.castShadow = true
  return m
}

export function vent(rock: THREE.Material) {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.3, 8, 16).rotateX(Math.PI / 2), rock)
  ring.position.y = 0.05
  const crust = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16).rotateX(-Math.PI / 2), std('#d8c44a', 0.9, 0, '#ff7a1a', 0.4))
  crust.position.y = 0.08
  g.add(ring, crust)
  return g
}
