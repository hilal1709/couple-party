import { MOUNTAINS, SURFACE_OF, texIndex, type Creature, type Mountain, type Surface, type Tree } from '../mountains'
import type { MountainId } from '../types'
import { fbm, noise2, rng } from './noise'

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
  /** ketinggian batas zona (base[k] = awal zona k di jalur; base[zones] = puncak) */
  base: number[]
  /** pusat massif */
  center: { x: number; z: number }
  solids: Solid[]
  decks: Deck[]
  vines: Rope[]
  camps: Camp[]
  chests: Chest[]
  route: Waypoint[]
  /** air terjun: bibir (x,z) dan arah jatuh */
  falls: { x: number; z: number; dx: number; dz: number }[]
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
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

const TREE_DIMS: Record<Tree, [number, number]> = {
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

/**
 * Bangun satu gunung dari benih. Sama di semua HP (tanpa Math.random).
 *
 * Bentuk: satu muka tebing raksasa yang naik ke arah +z, tanpa jalan setapak. Dari pantai di kaki,
 * tiap zona = sedikit tanah datar → pita tebing 2–4 tingkat dinding (6–12 m, wajib dipanjat) dengan
 * pijakan sempit yang putus-sambung di antaranya → dataran api unggun. Muka dinding menggembung
 * membulat dan penuh tonjolan batu berpuncak datar untuk berdiri memulihkan stamina.
 * Kiri, kanan, dan belakang koridor turun curam ke laut/jurang.
 * Satu rute aman tak terlihat (`routeX`) dijamin punya pijakan di setiap tingkat; dipakai bot.
 */
export function buildTerrain(id: MountainId, zones: number, seed: number): Terrain {
  const m = MOUNTAINS[id]
  const Z = Math.max(1, Math.min(m.zones.length, zones))
  const rand = rng(seed * 7 + 3)
  const bandH = m.ramp + m.cliff
  /** setengah lebar koridor tebing */
  const WH = Z >= 4 ? 40 : Z === 3 ? 36 : 32
  /** dasar di luar koridor: laut, jurang awan, atau ngarai dalam */
  const sideY = id === 'langit' ? -60 : m.sea ? Math.min(-6, m.sea.y - 5) : -14
  const ph1 = rand() * TAU
  const ph2 = rand() * TAU
  /** garis rute aman (x sebagai fungsi z), berkelok pelan */
  const routeX = (z: number) => 7 * Math.sin(z * 0.021 + ph1) + 4 * Math.sin(z * 0.053 + ph2)
  /** 0 di rute aman, 1 jauh darinya: variasi tebing diredam di rute supaya pijakannya pasti ada */
  const offRoute = (x: number, z: number) => smooth(2.5, 7, Math.abs(x - routeX(z)))

  // ---------- tata letak sepanjang z (koordinat lokal: 0 = garis pantai atas) ----------
  type Wall = { z0: number; run: number; h: number; amp: number; y0: number; zone: number }
  type Flat = { z0: number; z1: number; zone: number; kind: 'pantai' | 'kaki' | 'dataran' }
  const walls: Wall[] = []
  const flats: Flat[] = []
  const gapCount = Math.min(Z - 1, m.islands ?? (id === 'kristal' ? 2 : 0))
  const gapZones = new Set(Array.from({ length: gapCount }, (_, g) => 1 + Math.floor(((g + 0.5) / gapCount) * (Z - 1))))
  const gapsL: { z: number; w: number }[] = []
  /** lebar tepi landai jurang (di luar lebar inti) */
  const GAP_SOFT = id === 'langit' ? 1.6 : 4.5
  let zc = 0
  let yc = 1.5
  flats.push({ z0: -40, z1: 24, zone: 0, kind: 'pantai' })
  zc = 24
  const bandStart: number[] = []
  for (let k = 0; k < Z; k++) {
    if (k > 0) {
      // kaki zona: sedikit tanah datar (lebih panjang kalau ada jurang yang diseberangi)
      const gap = gapZones.has(k)
      const gw = 5 + rand() * 2
      const foot = gap ? gw + 2 * (GAP_SOFT + 2.6) + 5 + rand() * 2 : 7 + rand() * 4
      flats.push({ z0: zc, z1: zc + foot, zone: k, kind: 'kaki' })
      if (gap) gapsL.push({ z: zc + foot * 0.5, w: gw })
      zc += foot
    }
    bandStart.push(zc)
    const H = bandH + (k === Z - 1 ? 4 : 0)
    const nT = Math.max(2, Math.min(4, Math.round(H / 9.5)))
    const wts = Array.from({ length: nT }, () => 0.75 + rand() * 0.5)
    const sum = wts.reduce((a, b) => a + b, 0)
    for (let i = 0; i < nT; i++) {
      const h = Math.min(12, Math.max(6, (H * wts[i]) / sum))
      const slope = 3.3 + rand() * 0.8
      const run = (1.5 * h) / slope
      walls.push({ z0: zc, run, h, amp: 1.1 + rand() * 1.4, y0: yc, zone: k })
      zc += run
      yc += h
      if (i < nT - 1) zc += 1.9 + rand() * 1.6
    }
    const plat = k === Z - 1 ? (m.crater ? 34 : 16) : 11 + rand() * 3
    flats.push({ z0: zc, z1: zc + plat, zone: k, kind: 'dataran' })
    zc += plat
  }
  const zEnd = zc
  const topY = yc
  const HT = topY
  const backW = (HT - sideY) / 3.5 + 6
  const zMinL = -62
  const zMaxL = zEnd + 2 + backW
  const xHalf = WH + 4 + backW
  const size = Math.ceil(Math.max(zMaxL - zMinL, xHalf * 2)) + 2
  const n = Math.round(size / CELL) + 1
  const half = size / 2
  // geser ke koordinat dunia: peta berpusat di tengah koridor
  const oz = (zMinL + zMaxL) / 2
  for (const w of walls) w.z0 -= oz
  for (const f of flats) {
    f.z0 -= oz
    f.z1 -= oz
  }
  for (const g of gapsL) g.z -= oz
  const zBeach = -oz
  const zTop = zEnd - oz
  /** setengah lebar koridor di z (pinggir tidak lurus) */
  const widthAt = (z: number) => WH + fbm(z * 0.03, 3.3, seed + 61, 3) * 4

  /** pergeseran muka dinding i di kolom x: pijakan antar-tingkat jadi dalam, sempit, atau putus */
  const shiftOf = (w: Wall, i: number, x: number, z: number) => w.amp * fbm(x * 0.045, i * 7.31, seed + 40, 3) * 1.6 * offRoute(x, z)
  /** tinggi tebing bertingkat tanpa tonjolan */
  const cliffs = (x: number, z: number) => {
    let y = 1.5
    // muka dinding menggembung tak beraturan (bergeser datar saja: pijakan tetap datar)
    const bulge = fbm(x * 0.16, z * 0.16, seed + 41, 2) * (0.35 + 0.75 * offRoute(x, z))
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i]
      const zz = z + bulge - w.z0
      if (zz < -5) break
      if (zz > w.run + 5) {
        y += w.h
        continue
      }
      const t = (zz - shiftOf(w, i, x, z)) / w.run
      const k = Math.min(1, Math.max(0, t))
      y += w.h * k * k * (3 - 2 * k)
    }
    return y
  }

  // ---------- tonjolan batu berpuncak datar di muka dinding ----------
  type Knob = { x: number; z: number; y: number; r: number }
  const knobs: Knob[] = []
  const KC = 6
  const kgrid = new Map<number, Knob[]>()
  const kkey = (ix: number, iz: number) => ix * 100003 + iz
  walls.forEach((w) => {
    const count = Math.round(((WH * 2) / 6) * (0.7 + rand() * 0.6) * (w.h / 9))
    for (let q = 0; q < count; q++) {
      const x = (rand() * 2 - 1) * (WH - 3)
      const f = 0.25 + rand() * 0.5
      const yo = w.y0 + w.h * f
      // cari titik di muka dinding setinggi yo pada kolom x
      let zw = NaN
      for (let z = w.z0 - 4; z < w.z0 + w.run + 4; z += 0.25) {
        if (cliffs(x, z) >= yo) {
          zw = z
          break
        }
      }
      if (Number.isNaN(zw) || Math.abs(x - routeX(zw)) < 3) continue
      const r = 1.0 + rand() * 0.7
      const knob = { x, z: zw - r * 0.35, y: yo, r }
      knobs.push(knob)
      const ix = Math.floor(x / KC)
      const iz = Math.floor(knob.z / KC)
      for (let oz2 = -1; oz2 <= 1; oz2++)
        for (let ox = -1; ox <= 1; ox++) {
          const k = kkey(ix + ox, iz + oz2)
          const list = kgrid.get(k)
          if (list) list.push(knob)
          else kgrid.set(k, [knob])
        }
    }
  })
  const knobH = (x: number, z: number) => {
    const list = kgrid.get(kkey(Math.floor(x / KC), Math.floor(z / KC)))
    let best = -Infinity
    if (!list) return best
    for (const k of list) {
      const d = Math.hypot(x - k.x, z - k.z)
      if (d > k.r + 3) continue
      // puncak nyaris datar, sisi bawah membulat curam
      const y = d < k.r ? k.y - 0.15 * (d / k.r) ** 2 : k.y - 0.15 - (d - k.r) * 3.2
      if (y > best) best = y
    }
    return best
  }

  // pilar batu di tanah datar (hadiah di atasnya)
  const pillars: { x: number; z: number; r: number; hgt: number; rot: number }[] = []
  const pillarCount = 5 + Math.round((m.pillars ?? 0) * 1.2)
  for (let i = 0, tries = 0; i < pillarCount && tries < 200; tries++) {
    const f = flats[Math.floor(rand() * flats.length)]
    const z = f.kind === 'pantai' ? zBeach + 2 + rand() * 20 : f.z0 + 2 + rand() * Math.max(0.5, f.z1 - f.z0 - 4)
    const x = (rand() * 2 - 1) * (WH - 6)
    if (Math.abs(x - routeX(z)) < 6 || gapsL.some((g) => Math.abs(g.z - z) < g.w + 4)) continue
    pillars.push({ x, z, r: 1.4 + rand() * 1.8, hgt: 5 + rand() * (m.pillars ? 14 : 8), rot: rand() * TAU })
    i++
  }

  const sideFall = (H: number, d: number) => {
    // d = jarak keluar dari batas koridor (m)
    if (d <= 0) return H
    const wE = Math.max(6, (H - sideY) / 3.5)
    return lerp(H, sideY, smooth(0, wE, d))
  }

  const raw = (x: number, z: number) => {
    let H = cliffs(x, z)
    H = Math.max(H, knobH(x, z))
    const zl = z - zBeach
    // pantai menurun ke laut di depan
    if (zl < 0) H = 1.5 + zl * 0.09
    H += fbm(x * 0.35, z * 0.35, seed + 501, 2) * 0.12 + fbm(x * 0.05, z * 0.05, seed + 77, 3) * 0.35 * (zl < 30 ? 1 : 0.4)
    // pilar
    for (const p of pillars) {
      const dx = x - p.x
      const dz = z - p.z
      if (Math.abs(dx) > p.r + 4 || Math.abs(dz) > p.r + 4) continue
      const a = Math.atan2(dz, dx) - p.rot
      const seg = Math.PI / 3
      const hex = (Math.hypot(dx, dz) * Math.cos((((a % seg) + seg) % seg) - seg / 2)) / Math.cos(seg / 2)
      const top = cliffs(p.x, p.z) + p.hgt
      H = Math.max(H, top - Math.max(0, hex - p.r) * 3.2)
    }
    // kawah lava di dataran puncak
    if (m.crater) {
      const dc = Math.hypot(x - craterX, z - craterZ)
      H = lerp(H, topY - 14, smooth(CRATER_R * 0.85, CRATER_R * 0.45, dc))
    }
    // jurang melintang koridor (diseberangi jembatan)
    for (const g of gapsL) {
      const dz = Math.abs(z - g.z + fbm(x * 0.08, g.z, seed + 90, 2) * 1.2)
      const cut = smooth(g.w * 0.5 + GAP_SOFT, g.w * 0.5, dz)
      if (cut > 0) H = lerp(H, id === 'langit' ? -60 : H - 13, cut)
    }
    // kiri-kanan & belakang: turun curam
    H = sideFall(H, Math.abs(x) - widthAt(z))
    H = sideFall(H, z - (zTop + 2))
    // depan: laut / tepi pulau
    if (id === 'langit') H = lerp(H, -60, smooth(-12, -20, zl))
    return Math.max(H, id === 'langit' ? -60 : -9)
  }
  const CRATER_R = 9.5
  const lastFlat = flats[flats.length - 1]
  const craterZ = lastFlat.z0 + 6 + CRATER_R + 4
  const craterX = routeX(craterZ) + (rand() - 0.5) * 6

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
    base: [],
    center: m.crater ? { x: craterX, z: craterZ } : { x: 0, z: 0 },
    solids: [],
    decks: [],
    vines: [],
    camps: [],
    chests: [],
    route: [],
    falls: [],
    start: { x: 0, y: 0, z: 0, yaw: 0 },
    summit: { x: 0, y: 0, z: 0 },
    rocks: [],
    vents: [],
    hives: [],
    crabs: [],
    bats: [],
    updrafts: [],
    lavaY: m.crater ? topY - 13 : null,
    craterR: m.crater ? CRATER_R : 0,
  }

  // ---------- start, api unggun, puncak ----------
  {
    const z = zBeach + 6
    const x = routeX(z)
    terrain.start = { x, y: heightAt(terrain, x, z), z, yaw: 0 }
  }
  for (let k = 0; k < Z; k++) {
    // api unggun 0 di pantai; api k di dataran atas zona k-1
    const z = k === 0 ? zBeach + 10 : flats.filter((f) => f.kind === 'dataran')[k - 1].z0 + 4.5
    const x = routeX(z) + 3.2
    flatten(terrain, x, z, 4)
    terrain.camps.push({ zone: k, x, y: heightAt(terrain, x, z), z })
  }
  {
    const z = lastFlat.z0 + 5
    const x = routeX(z)
    flatten(terrain, x, z, 3.2)
    terrain.summit = { x, y: heightAt(terrain, x, z), z }
  }
  const base = [...terrain.camps.map((c) => c.y), terrain.summit.y]
  base[0] = Math.min(base[0], 1.5)
  terrain.base = base
  const zoneOfY = (y: number) => {
    let k = 0
    for (let q = 1; q < Z; q++) if (y >= base[q] - 1.5) k = q
    return k
  }

  // ---------- jembatan di atas jurang ----------
  let deckId = 0
  for (const g of gapsL) {
    // tepi jurang bergeser ±1,2 m (noise): ujung papan harus di tanah utuh
    const z0 = g.z - g.w * 0.5 - GAP_SOFT - 2.2
    const z1 = g.z + g.w * 0.5 + GAP_SOFT + 2.2
    const xa = routeX(z0)
    const xb = routeX(z1)
    const x = (xa + xb) / 2
    const z = (z0 + z1) / 2
    const yaw = Math.atan2(xb - xa, z1 - z0)
    const hz = Math.hypot(xb - xa, z1 - z0) / 2
    const y0 = heightAt(terrain, xa, z0) + 0.12
    const y1 = heightAt(terrain, xb, z1) + 0.12
    terrain.decks.push({ id: deckId++, x, z, hx: 1.3, hz, yaw, top: Math.max(y0, y1), y0, y1, fragile: id === 'kristal' })
    terrain.updrafts.push({ x, y: (y0 + y1) / 2 - 12, z, r: 3.2, a: (y0 + y1) / 2 + 5, b: 0 })
  }
  const onAnyDeck = (x: number, z: number) => terrain.decks.some((d) => onDeck(d, x, z, 0.3))

  // ---------- rute bot: menyusuri rute aman; kaki & bibir tiap dinding ----------
  {
    const pts: { x: number; y: number; z: number; s: number }[] = []
    for (let z = terrain.start.z; z <= terrain.summit.z; z += 0.75) {
      const x = routeX(z)
      const deck = onAnyDeck(x, z)
      pts.push({ x, y: groundTop(terrain, x, z), z, s: deck ? 0 : slopeAt(terrain, x, z) })
    }
    let inWall = false
    let lastZ = -Infinity
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const steep = p.s > STEEP_ROUTE
      if (!inWall && steep) {
        inWall = true
        const f = pts[Math.max(0, i - 2)]
        if (f.z > lastZ + 0.5) terrain.route.push({ x: f.x, y: f.y, z: f.z, climb: false })
      } else if (inWall && !steep && (pts[i + 1]?.s ?? 0) < STEEP_ROUTE) {
        inWall = false
        const top = pts[Math.min(pts.length - 1, i + 1)]
        terrain.route.push({ x: top.x, y: top.y, z: top.z, climb: true })
        lastZ = top.z
      } else if (!inWall && p.z - lastZ >= 6) {
        terrain.route.push({ x: p.x, y: p.y, z: p.z, climb: false })
        lastZ = p.z
      }
    }
    const s = terrain.summit
    const end = terrain.route[terrain.route.length - 1]
    if (!end || Math.hypot(end.x - s.x, end.z - s.z) > 0.5) terrain.route.push({ ...s, climb: false })
  }

  // ---------- sulur di dinding tinggi (jalan pintas) ----------
  let ropeId = 0
  const vineMax = (m.vines ?? 0) * Z
  for (let i = 0; i < vineMax * 3 && terrain.vines.length < vineMax; i++) {
    const w = walls[Math.floor(rand() * walls.length)]
    const x = (rand() * 2 - 1) * (WH - 5)
    if (terrain.vines.some((v) => Math.hypot(v.x - x, v.z - w.z0) < 8)) continue
    let foot: [number, number] | null = null
    let top: [number, number] | null = null
    for (let z = w.z0 - 4; z < w.z0 + w.run + 12; z += 0.5) {
      const sl = slopeAt(terrain, x, z)
      if (!foot && sl > 1.3) foot = [x, z]
      else if (foot && sl < 0.6) {
        top = [x, z + 1]
        break
      }
    }
    if (!foot || !top) continue
    const bottom = heightAt(terrain, foot[0], foot[1])
    const topY2 = heightAt(terrain, top[0], top[1])
    if (topY2 - bottom < 5) continue
    terrain.vines.push({ id: ropeId++, x: foot[0], z: foot[1] - 0.5, top: topY2 + 0.2, bottom: bottom + 0.3, nx: 0, nz: -1, tx: top[0], tz: top[1], kind: 'sulur' })
  }

  // ---------- air terjun dari bibir dinding ----------
  if (m.id === 'karang' || m.id === 'rimba') {
    for (let q = 1; q < walls.length && terrain.falls.length < 3; q += Math.max(2, Math.floor(walls.length / 3))) {
      const w = walls[q]
      const x = routeX(w.z0) + (q % 2 ? 1 : -1) * (9 + rand() * 6)
      let lip = w.z0 + w.run
      for (let z = w.z0; z < w.z0 + w.run + 6; z += 0.5) {
        if (slopeAt(terrain, x, z) > 1.5) lip = z
      }
      terrain.falls.push({ x, z: lip + 0.6, dx: 0, dz: -1 })
    }
  }

  // ---------- bobot tekstur, salju, zona per sampel ----------
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i * CELL - half
      const z = j * CELL - half
      const idx = j * n + i
      const hy = h[idx]
      const k = zoneOfY(hy)
      const zn = m.zones[k]
      terrain.zone[idx] = k
      const a = noise2(x * 0.06, z * 0.06, seed + 11)
      const b = noise2(x * 0.11 + 9, z * 0.11, seed + 12)
      const c = noise2(x * 0.03, z * 0.03 + 4, seed + 13)
      const w1 = smooth(0.45, 0.7, a)
      let w2 = smooth(0.55, 0.78, b)
      const w3 = smooth(0.6, 0.85, c)
      const [gx, gz] = gradAt(terrain, x, z)
      const slope = Math.hypot(gx, gz)
      w2 = Math.min(1, w2 + smooth(0.3, 0.9, slope) * 0.6)
      const w0 = Math.max(0, 1 - w1 - w2 * 0.8 - w3 * 0.6)
      const sum = w0 + w1 + w2 + w3 || 1
      terrain.w[idx * 4] = Math.round((w0 / sum) * 255)
      terrain.w[idx * 4 + 1] = Math.round((w1 / sum) * 255)
      terrain.w[idx * 4 + 2] = Math.round((w2 / sum) * 255)
      terrain.w[idx * 4 + 3] = Math.round((w3 / sum) * 255)
      let s = zn.snow
      if (k < Z - 1 && m.zones[k + 1].snow > 0) s += smooth(base[k + 1] - 12, base[k + 1], hy) * 0.3
      s *= 0.75 + noise2(x * 0.08, z * 0.08, seed + 14) * 0.5
      s *= 1 - smooth(0.7, 1.6, slope) * 0.85
      if (id === 'salju' && hy > base[Z] - 6) s = 1
      terrain.snow[idx] = Math.round(Math.min(1, Math.max(0, s)) * 255)
    }
  }

  const nearRoute = (x: number, z: number, pad: number) => {
    for (const c of terrain.camps) if (Math.hypot(c.x - x, c.z - z) < 6 + pad) return true
    if (Math.hypot(terrain.summit.x - x, terrain.summit.z - z) < 5 + pad) return true
    if (Math.hypot(terrain.start.x - x, terrain.start.z - z) < 4 + pad) return true
    return Math.abs(x - routeX(z)) < 2.6 + pad
  }
  const inGap = (z: number) => gapsL.some((g) => Math.abs(g.z - z) < g.w * 0.5 + GAP_SOFT + 1.5)
  const zFrom = zBeach - 14
  const randomSpot = () => {
    const z = zFrom + rand() * (zTop - zFrom)
    return { x: (rand() * 2 - 1) * (widthAt(z) + 2), z }
  }
  const dry = (y: number) => y < (m.sea?.y ?? -99) + 0.4

  // pohon & batu lepas
  const area = WH * 2 * (zTop - zFrom)
  for (let tries = 0; tries < (area / 100) * 3.2; tries++) {
    const { x, z } = randomSpot()
    const y = heightAt(terrain, x, z)
    if (dry(y)) continue
    const zn = m.zones[zoneOfY(y)]
    if (!zn.trees.length || rand() > zn.density / 3.2) continue
    if (slopeAt(terrain, x, z) > 0.55 || nearRoute(x, z, 0) || inGap(z)) continue
    const kind = zn.trees[Math.floor(rand() * zn.trees.length)]
    const scale = 0.8 + rand() * 0.5
    const [r, top] = TREE_DIMS[kind]
    terrain.solids.push({ x, z, r: r * scale, y, top: y + top * scale, kind })
  }
  for (let i = 0; i < area / 700; i++) {
    const { x, z } = randomSpot()
    const y = heightAt(terrain, x, z)
    if (dry(y) || nearRoute(x, z, 0.5) || slopeAt(terrain, x, z) > 0.7 || inGap(z)) continue
    const r = 0.6 + rand() * 1.7
    terrain.solids.push({ x, z, r, y, top: y + r * 1.1, kind: 'batu' })
  }

  // rentang z tiap zona: tanah datar (kaki/dataran) & pita tebing
  const zoneZ = (k: number) => {
    const lo = k === 0 ? zBeach - 6 : flats.filter((f) => f.kind === 'dataran')[k - 1].z0
    const hi = flats.filter((f) => f.kind === 'dataran')[k].z1
    return [lo, hi] as const
  }
  /** titik datar acak di zona k (tanah, pijakan, atau tonjolan) */
  const flatSpot = (k: number, band: boolean, maxSlope = 0.45) => {
    const [lo, hi] = band ? [bandStart[k], flats.filter((f) => f.kind === 'dataran')[k].z0] : zoneZ(k)
    for (let tries = 0; tries < 80; tries++) {
      // tonjolan: setengah percobaan langsung di tonjolan dinding zona ini
      let x: number
      let z: number
      if (band && tries % 2 === 0 && knobs.length) {
        const kn = knobs[Math.floor(rand() * knobs.length)]
        if (kn.z < lo || kn.z > hi) continue
        x = kn.x
        z = kn.z - kn.r * 0.3
      } else {
        z = lo + rand() * (hi - lo)
        x = (rand() * 2 - 1) * (widthAt(z) - 3)
      }
      const y = heightAt(terrain, x, z)
      if (zoneOfY(y) !== k || dry(y) || slopeAt(terrain, x, z) > maxSlope || inGap(z)) continue
      if (terrain.solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1)) continue
      return { x, y, z }
    }
    return null
  }

  // peti, sarang burung, tas pendaki: separuh di tanah datar, separuh di pijakan & tonjolan tebing
  let chestId = 0
  for (let k = 0; k < Z; k++) {
    const per = 7
    let got = 0
    for (let tries = 0; tries < 60 && got < per; tries++) {
      const p = flatSpot(k, got % 2 === 1) ?? flatSpot(k, false)
      if (!p) continue
      const roll = rand()
      const kind: ChestKind = roll < 0.6 ? 'peti' : roll < 0.8 ? 'tas' : 'sarang'
      terrain.chests.push({ id: chestId++, kind, zone: k, x: p.x, y: p.y, z: p.z, yaw: rand() * TAU })
      got++
    }
  }
  // hadiah di atas pilar: harus dipanjat
  for (const p of pillars.slice(0, 4 + (m.pillars ?? 0))) {
    const y = heightAt(terrain, p.x, p.z)
    if (dry(y)) continue
    terrain.chests.push({ id: chestId++, kind: 'peti', zone: zoneOfY(y), x: p.x, y, z: p.z, yaw: rand() * TAU })
  }

  // batu menggelinding: dari bibir dinding, turun ke arah pantai melewati daerah panjat
  for (let q = 0; q < Z * 4; q++) {
    const w = walls[Math.floor(rand() * walls.length)]
    const x = routeX(w.z0) + (rand() * 2 - 1) * 12
    const z = w.z0 + w.run + 1.5
    terrain.rocks.push({ x, y: heightAt(terrain, x, z), z, r: 0.9, a: -Math.PI / 2, b: 20 })
  }
  if (m.hazards.includes('uap')) {
    for (let k = 1; k < Z; k++) {
      for (let i = 0; i < 7; i++) {
        const p = flatSpot(k, i % 2 === 1, 0.6)
        if (p) terrain.vents.push({ x: p.x, y: p.y, z: p.z, r: 1.6, a: rand() * 8, b: 6 + rand() * 4 })
      }
    }
  }
  const critters = (c: Creature, k: number, count: number, out: Spot[], r: [number, number]) => {
    for (let i = 0; i < count; i++) {
      let p: { x: number; z: number } | null
      if (c === 'kepiting') {
        // pantai dekat garis air
        const z = zBeach - 10 + rand() * 12
        p = { x: (rand() * 2 - 1) * (WH - 4), z }
      } else p = flatSpot(k, rand() < 0.4, 0.7)
      if (!p) continue
      out.push({ x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z, r: r[0] + rand() * (r[1] - r[0]), a: rand() * TAU, b: c === 'kepiting' ? 0.5 : 1.2 })
    }
  }
  if (m.creatures.includes('kepiting')) critters('kepiting', 0, 10, terrain.crabs, [3, 7])
  if (m.creatures.includes('lebah')) for (let k = 0; k < Math.min(Z, 3); k++) critters('lebah', k, 4, terrain.hives, [2.5, 4])
  if (m.creatures.includes('kelelawar')) for (let k = 0; k < Z; k++) critters('kelelawar', k, 3, terrain.bats, [4, 7])

  return terrain
}

/** kemiringan yang dianggap dinding saat menyusun rute bot */
const STEEP_ROUTE = 1.0

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
