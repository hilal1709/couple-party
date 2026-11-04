import { MOUNTAINS, SURFACE_OF, texIndex, type Creature, type Mountain, type Surface, type Tree } from '../mountains'
import type { MountainId } from '../types'
import { fbm, loopNoise, noise2, ridge, rng } from './noise'

/** jarak antar sampel tinggi (m) */
export const CELL = 0.5
const TAU = Math.PI * 2

/** pohon, batu besar, pilar: lingkaran tegak yang menghalangi; bisa dipijak kalau rendah */
export type Solid = { x: number; z: number; r: number; y: number; top: number; kind: Tree | 'batu' }
/** jembatan / papan: kotak berputar yang bisa dipijak */
/** y0/y1 = tinggi papan di ujung belakang/depan sumbu panjang (miring mengikuti tanah); top = yang tertinggi */
export type Deck = { id: number; x: number; z: number; hx: number; hz: number; yaw: number; top: number; y0: number; y1: number; fragile: boolean }
/** tali / sulur tegak: tergantung dari (x, top, z) sampai bottom; n = arah keluar tebing */
export type Rope = { id: number; x: number; z: number; top: number; bottom: number; nx: number; nz: number; tx: number; tz: number; kind: 'sulur' | 'tali' | 'tangga' }
export type Camp = { zone: number; x: number; y: number; z: number }
export type ChestKind = 'peti' | 'sarang' | 'tas'
export type Chest = { id: number; kind: ChestKind; zone: number; x: number; y: number; z: number; yaw: number }
export type Waypoint = { x: number; y: number; z: number; climb: boolean }
export type Spot = { x: number; y: number; z: number; r: number; a: number; b: number }

export type Terrain = {
  id: MountainId
  m: Mountain
  zones: number
  /** sisi peta (m) dan jumlah sampel per sisi */
  size: number
  n: number
  half: number
  h: Float32Array
  /** bobot 4 slot tanah per sampel (0..255) */
  w: Uint8Array
  snow: Uint8Array
  zone: Uint8Array
  radii: number[]
  base: number[]
  theta: number[]
  solids: Solid[]
  decks: Deck[]
  vines: Rope[]
  camps: Camp[]
  chests: Chest[]
  route: Waypoint[]
  start: { x: number; y: number; z: number; yaw: number }
  summit: { x: number; y: number; z: number }
  /** jalur batu menggelinding: dari tebing (x,z) keluar ke arah (a = sudut, b = panjang) */
  rocks: Spot[]
  vents: Spot[]
  hives: Spot[]
  crabs: Spot[]
  bats: Spot[]
  updrafts: Spot[]
  /** genangan lava di kawah: titik pusat & tinggi permukaan */
  lavaY: number | null
  craterR: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const wrap01 = (v: number) => v - Math.floor(v)

/** Bangun satu gunung dari benih. Sama di semua HP (tanpa Math.random). */
export function buildTerrain(id: MountainId, zones: number, seed: number): Terrain {
  const m = MOUNTAINS[id]
  const Z = Math.max(1, Math.min(m.zones.length, zones))
  const R0 = Z >= 4 ? 120 : Z === 3 ? 102 : 86
  const RS = Z >= 4 ? 22 : 20
  // jari-jari cincin: menyusut dari luar ke puncak
  const radii = Array.from({ length: Z + 1 }, (_, k) => R0 + ((RS - R0) * k) / Z)
  const size = Math.ceil((R0 + 26) * 2)
  const n = Math.round(size / CELL) + 1
  const half = size / 2
  const rand = rng(seed * 7 + 3)
  const theta0 = rand() * TAU
  const theta: number[] = []
  const base: number[] = []
  for (let k = 0; k <= Z; k++) {
    theta.push(theta0 + k * TAU * 0.97)
    base.push(2 + k * (m.ramp + m.cliff))
  }
  const ringR = (k: number, th: number) => radii[k] * (1 + (k === 0 ? 0.07 : 0.06) * loopNoise(th, 5 + k, seed + k * 17))
  const uOf = (k: number, th: number) => wrap01((th - theta[k]) / TAU)

  // celah pulau (Pulau Langit) & jurang (Ngarai Kristal): sudut u di tiap cincin
  const gapCount = m.islands ?? (id === 'kristal' ? 2 : 0)
  const gaps: { k: number; u: number; w: number }[] = []
  for (let k = 0; k < Z; k++) {
    for (let g = 0; g < gapCount; g++) {
      const u = 0.18 + ((g + 0.2 + rand() * 0.6) / gapCount) * 0.64
      gaps.push({ k, u, w: 7 + rand() * 4 })
    }
  }
  const gapDepth = id === 'langit' ? -60 : -13

  // pilar menjulang (Ngarai Merah, Ngarai Kristal)
  const pillars: { x: number; z: number; r: number; hgt: number }[] = []
  for (let i = 0; i < (m.pillars ?? 0) * (Z / 4); i++) {
    const k = Math.floor(rand() * Z)
    const u = 0.12 + rand() * 0.76
    const th = theta[k] + u * TAU
    const rr = (ringR(k, th) + ringR(k + 1, th)) / 2 + (rand() - 0.5) * (radii[k] - radii[k + 1]) * 0.5
    // jangan menutup jalur tengah cincin
    const mid = (ringR(k, th) + ringR(k + 1, th)) / 2
    const off = Math.abs(rr - mid) < 6 ? (rr < mid ? -6 : 6) : 0
    pillars.push({ x: Math.cos(th) * (rr + off), z: Math.sin(th) * (rr + off), r: 2.6 + rand() * 3, hgt: 7 + rand() * 13 })
  }

  const plateau = (k: number, x: number, z: number, th: number) => {
    const u = uOf(k, th)
    let rampH = m.ramp * u
    if (m.terrace > 0) {
      const q = rampH / m.terrace
      const f = q - Math.floor(q)
      rampH = (Math.floor(q) + smooth(0.8, 1, f)) * m.terrace
    }
    const bumps = fbm(x * 0.045, z * 0.045, seed + 300 + k, 4) * 1.4 * m.rough + fbm(x * 0.16, z * 0.16, seed + 400, 2) * 0.35 * m.rough
    return base[k] + rampH + (m.terrace > 0 ? bumps * 0.25 : bumps)
  }

  const summitH = (x: number, z: number, r: number) => {
    const b = base[Z]
    const t = r / radii[Z]
    if (m.crater) {
      // bibir kawah di 0,6 R lalu turun tajam ke danau lava
      const rim = Math.exp(-((t - 0.62) ** 2) / 0.03) * 9
      const pit = smooth(0.5, 0.3, t) * 16
      return b + rim - pit + fbm(x * 0.1, z * 0.1, seed + 9, 3) * 0.6
    }
    return b + Math.max(0, 1 - t) ** 1.6 * 14 + fbm(x * 0.08, z * 0.08, seed + 9, 3) * 0.8
  }

  const raw = (x: number, z: number) => {
    const r = Math.hypot(x, z)
    const th = Math.atan2(z, x)
    let H = summitH(x, z, r)
    for (let k = Z - 1; k >= 0; k--) {
      const Rb = ringR(k + 1, th)
      // tebing: profil curam dengan bibir; lapisan strata membuat pegangan
      // lebar tebing 4,8 m: cukup curam untuk dipanjat, cukup lebar supaya tidak bergerigi mengikuti grid
      const w = 2.4
      const t = smooth(Rb - w, Rb + w, r)
      let P = plateau(k, x, z, th)
      // celah di cincin ini
      for (const g of gaps) {
        if (g.k !== k) continue
        const arc = Math.abs(((uOf(k, th) - g.u + 0.5 + 1) % 1) - 0.5) * TAU * r
        const inBand = smooth(Rb + 1, Rb + 4, r) * smooth(ringR(k, th) + (k === 0 ? 8 : 2), ringR(k, th) - 1, r)
        const cut = smooth(g.w * 0.5 + 1.2, g.w * 0.5 - 0.6, arc) * inBand
        // Pulau Langit: jatuh ke awan; Ngarai Kristal: jurang yang bisa dipanjat keluar
        P = P * (1 - cut) + (id === 'langit' ? gapDepth : P + gapDepth) * cut
      }
      H = H + (P - H) * t
    }
    // pinggir pulau: pantai landai, atau tebing ke awan
    const R0t = ringR(0, th)
    if (id === 'langit') {
      H = H + (-60 - H) * smooth(R0t - 1, R0t + 3, r)
    } else {
      const edge = base[0] - (r - R0t) * (m.sea?.kind === 'air' ? 0.22 : 0.3) + fbm(x * 0.05, z * 0.05, seed + 77, 3) * 1.2
      H = H + (Math.max(edge, -9) - H) * smooth(R0t - 6, R0t + 6, r)
    }
    // permukaan tebing berlapis
    const cliffy = fbm(x * 0.3, z * 0.3, seed + 501, 2) * 0.35 + ridge(x * 0.12, z * 0.12, seed + 502, 2) * 0.25
    H += cliffy
    for (const p of pillars) {
      const d = Math.hypot(x - p.x, z - p.z)
      if (d > p.r + 3) continue
      const top = smooth(p.r + 1.2, p.r - 0.6, d)
      H = Math.max(H, H + top * p.hgt + (d < p.r ? fbm(x * 0.4, z * 0.4, seed + 61, 2) * 0.5 : 0))
    }
    return H
  }

  const h = new Float32Array(n * n)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) h[j * n + i] = raw(i * CELL - half, j * CELL - half)
  }

  const terrain: Terrain = {
    id,
    m,
    zones: Z,
    size,
    n,
    half,
    h,
    w: new Uint8Array(n * n * 4),
    snow: new Uint8Array(n * n),
    zone: new Uint8Array(n * n),
    radii,
    base,
    theta,
    solids: [],
    decks: [],
    vines: [],
    camps: [],
    chests: [],
    route: [],
    start: { x: 0, y: 0, z: 0, yaw: 0 },
    summit: { x: 0, y: 0, z: 0 },
    rocks: [],
    vents: [],
    hives: [],
    crabs: [],
    bats: [],
    updrafts: [],
    lavaY: m.crater ? base[Z] - 2.5 : null,
    craterR: m.crater ? radii[Z] * 0.42 : 0,
  }

  const zoneAt = (x: number, z: number) => {
    const r = Math.hypot(x, z)
    const th = Math.atan2(z, x)
    for (let k = 0; k < Z; k++) if (r >= ringR(k + 1, th)) return k
    return Z - 1
  }
  const midR = (k: number, th: number) => (ringR(k, th) + ringR(k + 1, th)) / 2
  const at = (k: number, u: number, dr = 0) => {
    const th = theta[k] + u * TAU
    const r = midR(k, th) + dr
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    return { x, z, th }
  }
  const inGap = (k: number, u: number, pad = 0.02) => gaps.some((g) => g.k === k && Math.abs(((u - g.u + 0.5 + 1) % 1) - 0.5) < g.w / (TAU * midR(k, theta[k] + u * TAU)) + pad)

  // api unggun: awal tiap cincin (cincin 0 = titik mulai), tanah diratakan
  for (let k = 0; k < Z; k++) {
    const u = k === 0 ? 0.03 : wrap01((theta[k - 1] + TAU * 0.982 - theta[k]) / TAU) + 0.03
    const p = at(k, u)
    flatten(terrain, p.x, p.z, 4.5)
    terrain.camps.push({ zone: k, x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z })
  }
  // puncak
  {
    const th = theta[Z - 1] + TAU * 0.982
    const r = m.crater ? radii[Z] * 0.62 : 0
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    flatten(terrain, x, z, 3.5)
    terrain.summit = { x, y: heightAt(terrain, x, z), z }
  }
  const c0 = terrain.camps[0]
  const s0 = at(0, 0.06)
  terrain.start = { x: s0.x, y: heightAt(terrain, s0.x, s0.z), z: s0.z, yaw: Math.atan2(s0.x - c0.x, s0.z - c0.z) }

  // jembatan di atas celah
  let deckId = 0
  for (const g of gaps) {
    const th = theta[g.k] + g.u * TAU
    const r = midR(g.k, th)
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    const top = plateau(g.k, x, z, th) + 0.15
    // dua jembatan: lurus di tengah, dan satu lagi lebih dalam untuk jalan pintas
    // sumbu panjang (hz) searah garis singgung cincin; ujung papan menempel ke tanah di kedua sisi
    const yaw = Math.atan2(-Math.sin(th), Math.cos(th))
    const hz = g.w * 0.5 + 2.6
    const end = (s: number) => heightAt(terrain, x + Math.sin(yaw) * s, z + Math.cos(yaw) * s) + 0.12
    const y0 = end(-hz)
    const y1 = end(hz)
    terrain.decks.push({ id: deckId++, x, z, hx: 1.3, hz, yaw, top: Math.max(y0, y1), y0, y1, fragile: id === 'kristal' })
    terrain.updrafts.push({ x, y: top - 10, z, r: 3.2, a: top + 5, b: 0 })
  }

  // rute bot: keliling tiap cincin lalu panjat tebing di sambungan
  for (let k = 0; k < Z; k++) {
    const u0 = k === 0 ? 0.04 : wrap01((theta[k - 1] + TAU * 0.982 - theta[k]) / TAU) + 0.04
    const len = TAU * midR(k, theta[k] + TAU / 2)
    const steps = Math.ceil(((0.976 - u0) * len) / 7)
    for (let s = 0; s <= steps; s++) {
      const u = u0 + ((0.976 - u0) * s) / steps
      const p = at(k, u)
      terrain.route.push({ x: p.x, y: groundTop(terrain, p.x, p.z), z: p.z, climb: false })
    }
    // titik panjat ke cincin dalam (atau ke puncak)
    const th = theta[k] + TAU * 0.982
    const Rb = ringR(k + 1, th)
    const foot = { x: Math.cos(th) * (Rb + 2.6), z: Math.sin(th) * (Rb + 2.6) }
    const top = { x: Math.cos(th) * (Rb - 2.6), z: Math.sin(th) * (Rb - 2.6) }
    terrain.route.push({ x: foot.x, y: heightAt(terrain, foot.x, foot.z), z: foot.z, climb: false })
    terrain.route.push({ x: top.x, y: heightAt(terrain, top.x, top.z), z: top.z, climb: true })
  }
  terrain.route.push({ ...terrain.summit, climb: false })

  // sulur tergantung di tebing (jalan pintas)
  let ropeId = 0
  for (let i = 0; i < (m.vines ?? 0) * Math.max(1, Z - 1); i++) {
    const k = Math.floor(rand() * Z)
    const u = 0.15 + rand() * 0.7
    const th = theta[k] + u * TAU
    const Rb = ringR(k + 1, th)
    const tx = Math.cos(th) * (Rb - 1.2)
    const tz = Math.sin(th) * (Rb - 1.2)
    const bx = Math.cos(th) * (Rb + 2.4)
    const bz = Math.sin(th) * (Rb + 2.4)
    const top = heightAt(terrain, tx, tz)
    const bottom = heightAt(terrain, bx, bz)
    if (top - bottom < 6) continue
    terrain.vines.push({ id: ropeId++, x: Math.cos(th) * (Rb + 1.4), z: Math.sin(th) * (Rb + 1.4), top: top + 0.2, bottom: bottom + 0.3, nx: Math.cos(th), nz: Math.sin(th), tx, tz, kind: 'sulur' })
  }

  // bobot tekstur, salju, zona per sampel
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i * CELL - half
      const z = j * CELL - half
      const idx = j * n + i
      const k = zoneAt(x, z)
      const zn = m.zones[k]
      terrain.zone[idx] = k
      const a = noise2(x * 0.06, z * 0.06, seed + 11)
      const b = noise2(x * 0.11 + 9, z * 0.11, seed + 12)
      const c = noise2(x * 0.03, z * 0.03 + 4, seed + 13)
      let w1 = smooth(0.45, 0.7, a)
      let w2 = smooth(0.55, 0.78, b)
      let w3 = smooth(0.6, 0.85, c)
      // dekat kaki tebing: slot 2 (biasanya lembap/berbatu) lebih banyak
      const [gx, gz] = gradAt(terrain, x, z)
      const slope = Math.hypot(gx, gz)
      w2 = Math.min(1, w2 + smooth(0.3, 0.9, slope) * 0.6)
      // jalur tengah cincin: lebih banyak tanah injakan (slot 1)
      const r = Math.hypot(x, z)
      const th = Math.atan2(z, x)
      const md = Math.abs(r - midR(k, th))
      w1 = Math.max(w1, smooth(2.2, 0.6, md) * 0.75)
      let w0 = 1
      w0 = Math.max(0, w0 - w1 - w2 * 0.8 - w3 * 0.6)
      const sum = w0 + w1 + w2 + w3 || 1
      terrain.w[idx * 4] = Math.round((w0 / sum) * 255)
      terrain.w[idx * 4 + 1] = Math.round((w1 / sum) * 255)
      terrain.w[idx * 4 + 2] = Math.round((w2 / sum) * 255)
      terrain.w[idx * 4 + 3] = Math.round((w3 / sum) * 255)
      // salju: zona bersalju, lebih tebal di dataran dan makin tinggi makin penuh
      const hy = h[idx]
      let s = zn.snow
      if (k < Z - 1 && m.zones[k + 1].snow > 0) s += smooth(0.7, 1, uOf(k, th)) * 0.3
      s *= 0.75 + noise2(x * 0.08, z * 0.08, seed + 14) * 0.5
      s *= 1 - smooth(0.7, 1.6, slope) * 0.85
      if (id === 'salju' && hy > base[Z]) s = 1
      terrain.snow[idx] = Math.round(Math.min(1, Math.max(0, s)) * 255)
    }
  }

  const routeNear = (x: number, z: number, pad: number) => {
    for (const c of terrain.camps) if (Math.hypot(c.x - x, c.z - z) < 6 + pad) return true
    if (Math.hypot(terrain.summit.x - x, terrain.summit.z - z) < 5 + pad) return true
    const r = Math.hypot(x, z)
    const th = Math.atan2(z, x)
    const k = zoneAt(x, z)
    if (Math.abs(r - midR(k, th)) < 2.6 + pad) return true
    // koridor panjat
    for (let q = 0; q < Z; q++) {
      const ct = theta[q] + TAU * 0.982
      const cx = Math.cos(ct) * ringR(q + 1, ct)
      const cz = Math.sin(ct) * ringR(q + 1, ct)
      if (Math.hypot(cx - x, cz - z) < 7 + pad) return true
    }
    return false
  }

  // pohon & batu besar
  for (let k = 0; k < Z; k++) {
    const zn = m.zones[k]
    const area = Math.PI * (radii[k] ** 2 - radii[k + 1] ** 2) + (k === 0 && id !== 'langit' ? 3500 : 0)
    const count = Math.round((area / 100) * zn.density)
    for (let i = 0; i < count && zn.trees.length; i++) {
      const th = rand() * TAU
      const rr = ringR(k + 1, th) + 3 + rand() * (ringR(k, th) - ringR(k + 1, th) - 3 + (k === 0 && id !== 'langit' ? 14 : -2))
      const x = Math.cos(th) * rr
      const z = Math.sin(th) * rr
      const y = heightAt(terrain, x, z)
      const [gx, gz] = gradAt(terrain, x, z)
      if (Math.hypot(gx, gz) > 0.55 || routeNear(x, z, 0) || y < (m.sea?.y ?? -99) + 0.4) continue
      if (inGap(k, uOf(k, th), 0.01)) continue
      const kind = zn.trees[Math.floor(rand() * zn.trees.length)]
      const scale = 0.8 + rand() * 0.5
      const dims: Record<Tree, [number, number]> = {
        palem: [0.3, 9],
        jati: [0.45, 11],
        beringin: [1.3, 16],
        pinus: [0.4, 12],
        kering: [0.3, 7],
        semak: [0.9, 1.3],
        teh: [0.75, 1.1],
        kristal: [0.9, 5],
        karang: [0.8, 2.2],
      }
      const [r, top] = dims[kind]
      terrain.solids.push({ x, z, r: r * scale, y, top: y + top * scale, kind })
    }
    // batu besar: bisa dipijak
    const boulders = Math.round(area / 900)
    for (let i = 0; i < boulders; i++) {
      const th = rand() * TAU
      const rr = ringR(k + 1, th) + 3 + rand() * (ringR(k, th) - ringR(k + 1, th) - 5)
      const x = Math.cos(th) * rr
      const z = Math.sin(th) * rr
      if (routeNear(x, z, 0.5) || inGap(k, uOf(k, th), 0.01)) continue
      const y = heightAt(terrain, x, z)
      if (y < (m.sea?.y ?? -99)) continue
      const r = 0.6 + rand() * 1.5
      terrain.solids.push({ x, z, r, y, top: y + r * 1.1, kind: 'batu' })
    }
  }

  // peti, sarang burung, tas pendaki yang tertinggal
  let chestId = 0
  for (let k = 0; k < Z; k++) {
    const per = 7
    for (let i = 0; i < per * 3; i++) {
      if (terrain.chests.filter((c) => c.zone === k).length >= per) break
      const u = 0.08 + rand() * 0.86
      if (inGap(k, u, 0.03)) continue
      const th = theta[k] + u * TAU
      const span = ringR(k, th) - ringR(k + 1, th)
      const p = at(k, u, (rand() - 0.5) * span * 0.6)
      const [gx, gz] = gradAt(terrain, p.x, p.z)
      if (Math.hypot(gx, gz) > 0.45) continue
      const y = heightAt(terrain, p.x, p.z)
      if (y < (m.sea?.y ?? -99) + 0.3) continue
      if (terrain.solids.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < s.r + 1)) continue
      const roll = rand()
      const kind: ChestKind = roll < 0.6 ? 'peti' : roll < 0.8 ? 'tas' : 'sarang'
      terrain.chests.push({ id: chestId++, kind, zone: k, x: p.x, y, z: p.z, yaw: rand() * TAU })
    }
  }
  // hadiah di atas pilar: harus dipanjat
  for (const p of pillars) {
    const y = heightAt(terrain, p.x, p.z)
    terrain.chests.push({ id: chestId++, kind: 'peti', zone: zoneAt(p.x, p.z), x: p.x, y, z: p.z, yaw: rand() * TAU })
  }

  // bahaya: batu menggelinding dari bibir tebing ke luar
  for (let k = 0; k < Z; k++) {
    for (let i = 0; i < 4; i++) {
      const u = 0.1 + rand() * 0.8
      const th = theta[k] + u * TAU
      const Rb = ringR(k + 1, th)
      // mulai dari bibir atas tebing, menggelinding ke luar melewati wajah tebing
      const x = Math.cos(th) * (Rb - 1.8)
      const z = Math.sin(th) * (Rb - 1.8)
      terrain.rocks.push({ x, y: heightAt(terrain, x, z), z, r: 0.9, a: th, b: ringR(k, th) - Rb + 1.8 + (k === 0 ? 10 : 0) })
    }
  }
  if (m.hazards.includes('uap')) {
    for (let k = 1; k < Z; k++) {
      for (let i = 0; i < 7; i++) {
        const u = 0.08 + rand() * 0.86
        const p = at(k, u, (rand() - 0.5) * 8)
        terrain.vents.push({ x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z, r: 1.6, a: rand() * 8, b: 6 + rand() * 4 })
      }
    }
  }
  const critters = (c: Creature, k: number, count: number, out: Spot[], r: [number, number]) => {
    for (let i = 0; i < count; i++) {
      const u = 0.06 + rand() * 0.9
      const p = at(k, u, (rand() - 0.5) * 12)
      out.push({ x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z, r: r[0] + rand() * (r[1] - r[0]), a: rand() * TAU, b: c === 'kepiting' ? 0.5 : 1.2 })
    }
  }
  if (m.creatures.includes('kepiting')) critters('kepiting', 0, 10, terrain.crabs, [3, 7])
  if (m.creatures.includes('lebah')) for (let k = 0; k < Math.min(Z, 3); k++) critters('lebah', k, 4, terrain.hives, [2.5, 4])
  if (m.creatures.includes('kelelawar')) for (let k = 0; k < Z; k++) critters('kelelawar', k, 3, terrain.bats, [4, 7])

  return terrain
}

// ---------- membaca medan ----------

/** apakah titik (x,z) berada di atas papan d (dengan sedikit kelonggaran) */
export function onDeck(d: Deck, x: number, z: number, pad = 0) {
  const dx = x - d.x
  const dz = z - d.z
  const along = dx * Math.sin(d.yaw) + dz * Math.cos(d.yaw)
  const across = dx * Math.cos(d.yaw) - dz * Math.sin(d.yaw)
  return Math.abs(along) <= d.hz + pad && Math.abs(across) <= d.hx + pad
}

/** permukaan tertinggi (medan atau jembatan) di (x,z) */
/** tinggi papan di (x,z) */
export function deckY(d: Deck, x: number, z: number) {
  const along = (x - d.x) * Math.sin(d.yaw) + (z - d.z) * Math.cos(d.yaw)
  const k = Math.min(1, Math.max(0, (along + d.hz) / (2 * d.hz)))
  return d.y0 + (d.y1 - d.y0) * k
}

export function groundTop(t: Terrain, x: number, z: number) {
  let y = heightAt(t, x, z)
  for (const d of t.decks) if (onDeck(d, x, z)) y = Math.max(y, deckY(d, x, z))
  return y
}

const idxOf = (t: Terrain, x: number, z: number) => {
  const fx = (x + t.half) / CELL
  const fz = (z + t.half) / CELL
  const i = Math.max(0, Math.min(t.n - 2, Math.floor(fx)))
  const j = Math.max(0, Math.min(t.n - 2, Math.floor(fz)))
  return { i, j, u: Math.min(1, Math.max(0, fx - i)), v: Math.min(1, Math.max(0, fz - j)) }
}

/** tinggi medan (bilinear) */
export function heightAt(t: Terrain, x: number, z: number) {
  const { i, j, u, v } = idxOf(t, x, z)
  const n = t.n
  const a = t.h[j * n + i]
  const b = t.h[j * n + i + 1]
  const c = t.h[(j + 1) * n + i]
  const d = t.h[(j + 1) * n + i + 1]
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** kemiringan (dh/dx, dh/dz) */
export function gradAt(t: Terrain, x: number, z: number): [number, number] {
  const e = CELL * 0.75
  return [(heightAt(t, x + e, z) - heightAt(t, x - e, z)) / (2 * e), (heightAt(t, x, z + e) - heightAt(t, x, z - e)) / (2 * e)]
}

export const slopeAt = (t: Terrain, x: number, z: number) => Math.hypot(...gradAt(t, x, z))

export function zoneAt(t: Terrain, x: number, z: number) {
  const { i, j } = idxOf(t, x + CELL / 2, z + CELL / 2)
  return t.zone[j * t.n + i]
}

/** permukaan di bawah kaki: tebing curam memakai bahan tebing zona */
export function surfaceAt(t: Terrain, x: number, z: number): Surface {
  const { i, j } = idxOf(t, x + CELL / 2, z + CELL / 2)
  const idx = j * t.n + i
  const zn = t.m.zones[t.zone[idx]]
  if (slopeAt(t, x, z) > 1.1) return SURFACE_OF[zn.cliff]
  if (t.snow[idx] > 150) return zn.cliff === 'es' && t.snow[idx] > 230 && slopeAt(t, x, z) > 0.5 ? 'es' : 'salju'
  let best = 0
  for (let s = 1; s < 4; s++) if (t.w[idx * 4 + s] > t.w[idx * 4 + best]) best = s
  return SURFACE_OF[zn.ground[best]]
}

/** indeks tekstur tiap slot (untuk shader medan) */
export const layersOf = (t: Terrain) => t.m.zones.slice(0, t.zones).map((z) => [...z.ground.map(texIndex), texIndex(z.cliff)])

function flatten(t: Terrain, x: number, z: number, r: number) {
  const y = heightAt(t, x, z)
  const n = t.n
  const i0 = Math.floor((x - r - 2 + t.half) / CELL)
  const j0 = Math.floor((z - r - 2 + t.half) / CELL)
  const span = Math.ceil(((r + 2) * 2) / CELL)
  for (let j = j0; j <= j0 + span; j++) {
    for (let i = i0; i <= i0 + span; i++) {
      if (i < 0 || j < 0 || i >= n || j >= n) continue
      const d = Math.hypot(i * CELL - t.half - x, j * CELL - t.half - z)
      const k = smooth(r + 2, r, d)
      t.h[j * n + i] += (y - t.h[j * n + i]) * k
    }
  }
}
