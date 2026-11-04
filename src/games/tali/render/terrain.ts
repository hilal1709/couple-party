// Bentuk tampilan pijakan: bukan balok polos, tapi profil organik (sudut membulat, tebing tak rata,
// bevel) yang diekstrusi ke kedalaman dan diberi bahan triplanar per jenis permukaan.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Hazard, LevelDef, Skin, SolidDef } from '../levels/types'
import type { Box } from '../sim/physics'
import { meshesOf, type Kit, type TexPair } from './assets'
import { groundMaterial, hazardMaterial, patchGlow, patchSway } from './shaders'
import { DEFAULT_SKINS, type Scatter, type SkinLook, type Theme } from './themes'

/** kedalaman tanah tebal: depan dan belakang */
export const FRONT = 1.4
export const BACK = -2.6
const BEVEL = 0.1

const rand = (seed: number) => {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** noise 1D halus untuk tepi tebing */
function wobble(x: number, seed: number) {
  return Math.sin(x * 2.1 + seed) * 0.5 + Math.sin(x * 5.3 + seed * 1.7) * 0.25 + Math.sin(x * 11.7 + seed * 0.3) * 0.12
}

export const isThin = (b: Box) => b[3] < 1.2

/** profil 2D sebuah pijakan (koordinat dunia x, y) */
function profile(b: Box, seed: number): THREE.Shape {
  const [x, y, w, h] = b
  const top = y + h
  const thin = isThin(b)
  const inset = BEVEL
  const r = Math.min(thin ? h * 0.45 : 0.28, w * 0.3)
  const s = new THREE.Shape()
  const x0 = x + inset
  const x1 = x + w - inset
  const yt = top - inset
  const yb = y + inset
  if (thin) {
    s.moveTo(x0 + r, yb)
    s.lineTo(x1 - r, yb)
    s.quadraticCurveTo(x1, yb, x1, yb + r)
    s.lineTo(x1, yt - r)
    s.quadraticCurveTo(x1, yt, x1 - r, yt)
    s.lineTo(x0 + r, yt)
    s.quadraticCurveTo(x0, yt, x0, yt - r)
    s.lineTo(x0, yb + r)
    s.quadraticCurveTo(x0, yb, x0 + r, yb)
    return s
  }
  // tebing: tepi samping bergelombang, makin ke bawah makin menjorok/masuk tak beraturan
  const steps = Math.max(4, Math.ceil(h / 0.5))
  const side = (sx: number, sgn: number, t: number) => sx + sgn * (wobble(t * h * 0.9, seed + sgn) * 0.16 * Math.min(1, t * 4))
  // atas: hampir rata (permukaan fisika), sedikit bergelombang
  const n = Math.max(2, Math.ceil(w / 0.8))
  s.moveTo(x0, yt - r)
  s.quadraticCurveTo(x0, yt, x0 + r, yt)
  for (let i = 1; i < n; i++) {
    const px = x0 + r + ((x1 - x0 - 2 * r) * i) / n
    s.lineTo(px, yt + wobble(px * 1.7, seed) * 0.015)
  }
  s.lineTo(x1 - r, yt)
  s.quadraticCurveTo(x1, yt, x1, yt - r)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    s.lineTo(side(x1, 1, t), yt - r - (yt - r - yb) * t)
  }
  s.lineTo(x0, yb)
  for (let i = steps - 1; i >= 1; i--) {
    const t = i / steps
    s.lineTo(side(x0, -1, t), yt - r - (yt - r - yb) * t)
  }
  s.closePath()
  return s
}

export function solidGeometry(b: Box, seed: number, front = FRONT, back = BACK): THREE.BufferGeometry {
  const thin = isThin(b)
  const f = thin ? Math.min(front, 0.8) : front
  const k = thin ? Math.max(back, -0.8) : back
  const g = new THREE.ExtrudeGeometry(profile(b, seed), {
    depth: f - k - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL * 0.9,
    bevelSegments: 3,
    curveSegments: 6,
    steps: thin ? 1 : 3,
  })
  g.translate(0, 0, k + BEVEL)
  // permukaan sisi depan ikut bergelombang sedikit (tidak datar seperti kardus)
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const top = b[1] + b[3]
  if (!thin) {
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i)
      const py = pos.getY(i)
      const pz = pos.getZ(i)
      if (py < top - 0.35 && pz > f - 0.2) pos.setZ(i, pz + wobble(px * 0.8 + py * 1.3, seed) * 0.18)
    }
    g.computeVertexNormals()
  }
  g.setAttribute('aTop', new THREE.BufferAttribute(new Float32Array(pos.count).fill(top), 1))
  return g
}

export type Looks = (skin: Skin | undefined) => { look: SkinLook; mat: THREE.MeshStandardMaterial }

/** bahan per jenis permukaan, sekali per level */
export function makeLooks(theme: Theme, tex: Map<string, TexPair>): Looks {
  const made = new Map<string, { look: SkinLook; mat: THREE.MeshStandardMaterial }>()
  return (skin) => {
    const k = skin ?? 'tanah'
    let m = made.get(k)
    if (!m) {
      const look = theme.skins[k] ?? DEFAULT_SKINS[k]
      const base = tex.get(look.tex)!
      const cap = look.cap ? tex.get(look.cap.tex)! : null
      m = {
        look,
        mat: groundMaterial({
          map: base.map,
          normal: base.normal,
          scale: look.scale,
          tint: look.tint,
          gain: look.gain,
          cap: cap && look.cap ? { map: cap.map, normal: cap.normal, scale: look.cap.scale, tint: look.cap.tint, depth: look.cap.depth, gain: look.cap.gain } : undefined,
          deep: look.deep ?? 0.08,
          glow: look.glow,
        }),
      }
      made.set(k, m)
    }
    return m
  }
}

/** tekstur yang dibutuhkan tema ini */
export function texNeeds(theme: Theme, def: LevelDef): string[] {
  const out = new Set<string>()
  const skins = new Set(def.solids.map((s) => s.k ?? 'tanah'))
  for (const k of skins) {
    const l = theme.skins[k] ?? DEFAULT_SKINS[k]
    out.add(l.tex)
    if (l.cap) out.add(l.cap.tex)
  }
  out.add(theme.floor.tex)
  if (theme.wall) out.add(theme.wall.look.tex)
  return [...out]
}

export const isDynamic = (s: SolidDef) => !!(s.move || s.orbit || s.lift || s.door !== undefined || s.crumble)

/** pijakan diam digabung per bahan jadi satu mesh */
export function buildStatic(def: LevelDef, looks: Looks, shadows: boolean): THREE.Group {
  const g = new THREE.Group()
  const bySkin = new Map<Skin, THREE.BufferGeometry[]>()
  def.solids.forEach((s, i) => {
    if (isDynamic(s)) return
    const k = s.k ?? 'tanah'
    const list = bySkin.get(k) ?? []
    list.push(solidGeometry(s.b, i * 7.3 + 1))
    bySkin.set(k, list)
  })
  for (const [k, geos] of bySkin) {
    const merged = mergeGeometries(geos, false)
    geos.forEach((x) => x.dispose())
    const mesh = new THREE.Mesh(merged, looks(k).mat)
    mesh.castShadow = shadows
    mesh.receiveShadow = shadows
    g.add(mesh)
  }
  return g
}

/** bahaya: air/lava/setrum = kolam beranimasi, duri = deretan paku */
export function buildHazards(def: LevelDef, theme: Theme, shadows: boolean): THREE.Group {
  const g = new THREE.Group()
  for (const h of def.hazards) g.add(hazardMesh(h, theme, shadows))
  return g
}

function hazardMesh(h: Hazard, theme: Theme, shadows: boolean): THREE.Object3D {
  const [x, y, w, hh] = h.b
  const top = y + hh
  const tint = theme.hazard[h.k] ?? (h.k === 'air' ? '#4aa0c0' : h.k === 'lava' ? '#ff6a1a' : h.k === 'listrik' ? '#202a34' : '#777777')
  if (h.k === 'duri') {
    const grp = new THREE.Group()
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, FRONT - BACK), new THREE.MeshStandardMaterial({ color: '#3b3640', roughness: 0.9 }))
    base.position.set(x + w / 2, top - 0.75, (FRONT + BACK) / 2)
    grp.add(base)
    const cone = new THREE.ConeGeometry(0.16, 0.7, 7)
    const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35, metalness: 0.7 })
    const cols = Math.max(1, Math.floor(w / 0.36))
    const rows = 6
    const inst = new THREE.InstancedMesh(cone, mat, cols * rows)
    const rnd = rand(Math.floor(x * 10))
    const m = new THREE.Matrix4()
    let n = 0
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const s = 0.7 + rnd() * 0.6
        m.compose(
          new THREE.Vector3(x + (i + 0.5) * (w / cols) + (rnd() - 0.5) * 0.1, top - 0.6 + 0.35 * s, BACK + 0.3 + (j / (rows - 1)) * (FRONT - BACK - 0.6)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25)),
          new THREE.Vector3(s, s, s),
        )
        inst.setMatrixAt(n++, m)
      }
    }
    inst.castShadow = shadows
    grp.add(inst)
    return grp
  }
  const depth = FRONT - BACK + 0.6
  const geo = new THREE.BoxGeometry(w, Math.min(hh, 3), depth, Math.max(2, Math.ceil(w * 2)), 1, 12)
  geo.translate(x + w / 2, top - Math.min(hh, 3) / 2, (FRONT + BACK) / 2)
  const mesh = new THREE.Mesh(geo, hazardMaterial(h.k, tint))
  mesh.receiveShadow = shadows && h.k !== 'lava'
  return mesh
}

/** hiasan instanced dari kit: tiap mesh kit jadi satu InstancedMesh */
export function scatterProps(kit: Kit, items: { name: string; m: THREE.Matrix4 }[], shadows: boolean, sway: Set<string>): THREE.Group {
  const g = new THREE.Group()
  const byName = new Map<string, THREE.Matrix4[]>()
  for (const it of items) {
    const l = byName.get(it.name) ?? []
    l.push(it.m)
    byName.set(it.name, l)
  }
  for (const [name, mats] of byName) {
    const src = kit.get(name)
    if (!src) continue
    for (const mesh of meshesOf(src)) {
      const local = mesh.matrixWorld.clone()
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      const own = (mat as THREE.MeshStandardMaterial).clone()
      tuneKitMaterial(own, sway.has(name))
      const inst = new THREE.InstancedMesh(mesh.geometry, own, mats.length)
      mats.forEach((m, i) => inst.setMatrixAt(i, m.clone().multiply(local)))
      inst.castShadow = shadows && mats.length < 60
      inst.receiveShadow = shadows
      inst.computeBoundingSphere()
      g.add(inst)
    }
  }
  return g
}

/** aturan nama bahan dari Blender: sway_ bergoyang, glow_ berdenyut */
const tuned = new WeakSet<THREE.Material>()
export function tuneKitMaterial(m: THREE.Material, swayAll = false) {
  const sm = m as THREE.MeshStandardMaterial
  if (!sm.isMeshStandardMaterial || tuned.has(sm)) return
  tuned.add(sm)
  if (sm.name.startsWith('glow_')) patchGlow(sm)
  else if (sm.name.startsWith('sway_') || swayAll) patchSway(sm, sm.name.includes('kain') ? 0.1 : 0.06, sm.name.includes('kain') ? 2.6 : 1.5)
}

/** posisi hiasan latar per tema, acak tapi tetap (seed dari nama level) */
export function placeScatter(def: LevelDef, list: Scatter[], at: (x: number) => number | null, seed: number): { name: string; m: THREE.Matrix4 }[] {
  const out: { name: string; m: THREE.Matrix4 }[] = []
  const rnd = rand(seed)
  const [x0, x1] = def.bounds
  for (const sc of list) {
    const n = Math.round(((x1 - x0 + 20) / 10) * sc.per10)
    for (let i = 0; i < n; i++) {
      const x = x0 - 10 + rnd() * (x1 - x0 + 20)
      const y = sc.y ?? at(x)
      if (y === null || y === undefined) continue
      const z = sc.z[0] + rnd() * (sc.z[1] - sc.z[0])
      const s = sc.s[0] + rnd() * (sc.s[1] - sc.s[0])
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rnd() - 0.5) * 1.2, 0)), new THREE.Vector3(s, s, s))
      out.push({ name: sc.name, m })
    }
  }
  return out
}

/** tinggi permukaan pijakan diam tertinggi di x (untuk menaruh rumput di bibir) */
export function surfaceAt(def: LevelDef, x: number): number | null {
  let best: number | null = null
  for (const s of def.solids) {
    if (isDynamic(s) || s.oneway) continue
    const [bx, by, bw, bh] = s.b
    if (x < bx + 0.25 || x > bx + bw - 0.25 || bh < 0.35) continue
    const top = by + bh
    if (best === null || top > best) best = top
  }
  return best
}
