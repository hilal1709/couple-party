import { MOUNTAINS, SURFACE_OF, texIndex, type Creature, type Mountain, type Surface, type Tree } from '../mountains'
import type { MountainId } from '../types'
import { fbm, loopNoise, noise2, rng } from './noise'

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

/** hash sel 2D → 0..1 */
function cellHash(ix: number, iz: number, seed: number, k: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed + k * 1013, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

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
 * Bentuk: satu massif batu tak beraturan dari bongkahan bersegi (sel Voronoi yang tiap selnya
 * jadi balok bertepian datar dengan sisi miring 60–70°), dikelilingi pilar & bongkahan lepas di kaki.
 * Jalur pendakian berupa pita spiral yang dipahat ke lereng: landai untuk jalan, diselingi
 * tebing panjat pendek. Zona = pita ketinggian di sepanjang jalur.
 */
export function buildTerrain(id: MountainId, zones: number, seed: number): Terrain {
  const m = MOUNTAINS[id]
  const Z = Math.max(1, Math.min(m.zones.length, zones))
  const rand = rng(seed * 7 + 3)
  // tinggi & tapak massif
  const HT = 10 + Z * (m.ramp + m.cliff)
  const R0 = Z >= 4 ? 118 : Z === 3 ? 100 : 82
  const size = Math.ceil((R0 + 30) * 2)
  const n = Math.round(size / CELL) + 1
  const half = size / 2
  const theta0 = rand() * TAU
  // puncak sedikit bergeser dari tengah
  const cx = (rand() - 0.5) * R0 * 0.18
  const cz = (rand() - 0.5) * R0 * 0.18
  const footR = (th: number) => R0 * (1 + 0.13 * loopNoise(th, 4, seed + 5) + 0.05 * loopNoise(th, 11, seed + 6))
  const tOf = (x: number, z: number) => {
    const dx = x - cx
    const dz = z - cz
    return { t: Math.hypot(dx, dz) / footR(Math.atan2(dz, dx)), th: Math.atan2(dz, dx) }
  }
  /** kubah dasar: kerucut sedikit cembung, kaki melandai jadi pelataran */
  const dome = (x: number, z: number) => {
    const { t } = tOf(x, z)
    const u = Math.max(0, 1 - t)
    let d = HT * (u ** 1.05) * (0.92 + 0.08 * u)
    if (m.terrace > 0 && d < HT * 0.62) {
      // kebun teh: teras-teras di lereng bawah
      const step = 2.6
      const q = d / step
      const f = q - Math.floor(q)
      d = lerp(d, (Math.floor(q) + smooth(0.78, 1, f)) * step, smooth(HT * 0.62, HT * 0.5, d))
    }
    return d + 2
  }
  const blockSize = m.block ?? 11
  const faceSlope = 3.1
  const jag = m.jag ?? 3

  // data sel bongkahan disimpan: kubah dihitung sekali per sel, bukan per sampel
  const cellCache = new Map<number, { sx: number; sz: number; top: number; tx: number; tz: number }>()
  const cellOf = (ix: number, iz: number, bs: number) => {
    const q = Math.round(bs * 4)
    const key = (ix * 73856093) ^ (iz * 19349663) ^ (q * 83492791)
    let c = cellCache.get(key)
    if (!c) {
      const sx = (ix + 0.15 + cellHash(ix, iz, seed, 1) * 0.7) * bs
      const sz = (iz + 0.15 + cellHash(ix, iz, seed, 2) * 0.7) * bs
      const dc = dome(sx, sz)
      c = { sx, sz, top: dc + (cellHash(ix, iz, seed, 3) - 0.35) * jag * 2, tx: (dome(sx + 1, sz) - dc) * 0.22, tz: (dome(sx, sz + 1) - dc) * 0.22 }
      cellCache.set(key, c)
    }
    return c
  }
  /** bongkahan: sel Voronoi pada domain yang dibengkokkan; tinggi tiap titik = balok tertinggi yang menaunginya */
  const blocks = (x: number, z: number) => {
    const wx = x + fbm(x * 0.02, z * 0.02, seed + 31, 3) * 7
    const wz = z + fbm(x * 0.02 + 40, z * 0.02, seed + 32, 3) * 7
    // ukuran sel 3 tingkat: besar di kaki, kecil di atas
    const lvl = Math.min(2, Math.floor((dome(x, z) / HT) * 3))
    const bs = blockSize * [1.1, 0.9, 0.72][lvl]
    const gx = Math.floor(wx / bs)
    const gz = Math.floor(wz / bs)
    const cells: { sx: number; sz: number; top: number; d2: number }[] = []
    for (let oz = -1; oz <= 1; oz++) {
      for (let ox = -1; ox <= 1; ox++) {
        const ix = gx + ox
        const iz = gz + oz
        const c = cellOf(ix, iz, bs)
        const d2 = (wx - c.sx) ** 2 + (wz - c.sz) ** 2
        // tepian atas sedikit miring mengikuti lereng
        const top = c.top + c.tx * (wx - c.sx) + c.tz * (wz - c.sz)
        cells.push({ sx: c.sx, sz: c.sz, top, d2 })
      }
    }
    let near = cells[0]
    for (const c of cells) if (c.d2 < near.d2) near = c
    // tepi atas sedikit membulat: turun pelan 0,6 m di dekat batas sel
    let edge = Infinity
    for (const c of cells) {
      if (c === near) continue
      const sep = Math.hypot(c.sx - near.sx, c.sz - near.sz) || 1
      edge = Math.min(edge, (c.d2 - near.d2) / (2 * sep))
    }
    // bongkahan membulat: tepi atas melengkung turun ±1,8 m seperti batu besar, bukan balok tajam
    let H = near.top - 1.8 * (1 - smooth(0, 4, edge)) ** 2
    for (const c of cells) {
      if (c === near) continue
      // jarak ke garis bagi dua sel = jarak ke wilayah sel tetangga
      const sep = Math.hypot(c.sx - near.sx, c.sz - near.sz) || 1
      const bis = (c.d2 - near.d2) / (2 * sep)
      H = Math.max(H, c.top - bis * faceSlope)
    }
    return H
  }

  // pilar batu di kaki gunung (seperti tiang-tiang batu di sekitar massif)
  const pillars: { x: number; z: number; r: number; hgt: number; rot: number }[] = []
  const pillarCount = 10 + (m.pillars ?? 0) * 2
  for (let i = 0; i < pillarCount; i++) {
    const th = rand() * TAU
    const t = 0.78 + rand() * 0.3
    const r = footR(th) * t
    pillars.push({ x: cx + Math.cos(th) * r, z: cz + Math.sin(th) * r, r: 1.6 + rand() * 2.6, hgt: 5 + rand() * (m.pillars ? 16 : 9), rot: rand() * TAU })
  }

  // ---------- jalur spiral ----------
  const turns = Z >= 4 ? 2.3 : Z === 3 ? 1.9 : 1.45
  const tStart = 0.9
  const tEnd = m.crater ? 0.115 : 0.0
  const pathPts: { x: number; z: number; s: number; d: number }[] = []
  {
    const N = 4000
    let acc = 0
    let px = 0
    let pz = 0
    for (let i = 0; i <= N; i++) {
      const s = i / N
      const th = theta0 + turns * TAU * s
      const tt = lerp(tStart, tEnd, s ** 0.92) + 0.025 * Math.sin(s * 37 + seed) * (1 - s)
      const r = footR(th) * tt
      const x = cx + Math.cos(th) * r
      const z = cz + Math.sin(th) * r
      if (i > 0) acc += Math.hypot(x - px, z - pz)
      px = x
      pz = z
      pathPts.push({ x, z, s, d: acc })
    }
  }
  const pathLen = pathPts[pathPts.length - 1].d
  // titik setiap ~0,75 m
  const trail: { x: number; z: number; d: number; y: number; dx: number; dz: number }[] = []
  {
    let k = 0
    for (let d = 0; d <= pathLen; d += 0.75) {
      while (k < pathPts.length - 2 && pathPts[k + 1].d < d) k++
      const a = pathPts[k]
      const b = pathPts[k + 1]
      const f = (d - a.d) / Math.max(1e-6, b.d - a.d)
      const x = lerp(a.x, b.x, f)
      const z = lerp(a.z, b.z, f)
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1
      trail.push({ x, z, d, y: 0, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l })
    }
  }
  const T = trail.length

  // celah (Pulau Langit: celah ke awan; Ngarai Kristal: jurang): pita radial di sudut tertentu
  const gapCount = m.islands ?? (id === 'kristal' ? 2 : 0)
  const gaps = Array.from({ length: gapCount }, (_, g) => ({ phi: theta0 + ((g + 0.5) / gapCount) * TAU + (rand() - 0.5) * 0.4, w: 7 + rand() * 3 }))
  const gapDepth = id === 'langit' ? -60 : -13
  const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
  const gapAt = (x: number, z: number) => {
    const { t, th } = tOf(x, z)
    if (t < 0.16) return null
    const r = t * footR(th)
    for (const g of gaps) if (angDist(th, g.phi) * r < g.w * 0.5 + 5.5) return { g, arc: angDist(th, g.phi) * r }
    return null
  }

  // ketinggian jalur: landai pelan, lalu tebing panjat pendek setiap kali tertinggal dari lereng.
  // Dua kali: pertama untuk tahu ketinggian, lalu api unggun ditaruh merata menurut ketinggian
  // (bukan jarak) dan tebing tidak boleh jatuh di dekatnya.
  let campD: number[] = []
  let steps: { d0: number; d1: number }[] = []
  const layTrail = (avoid: number[], salt: number) => {
    const r2 = rng(seed * 13 + salt)
    const out: { d0: number; d1: number }[] = []
    let y = dome(trail[0].x, trail[0].z)
    let stepEnd = -1
    let stepFrom = 0
    let stepTo = 0
    let stepAt = 0
    let want = 5.5 + r2() * 3.5
    for (let i = 0; i < T; i++) {
      const p = trail[i]
      const nat = dome(p.x, p.z)
      if (stepEnd > p.d) {
        // naik di tebing panjat: kemiringan ±2,3 (lebih curam dari batas jalan)
        y = lerp(stepFrom, stepTo, smooth(stepAt, stepEnd, p.d))
      } else {
        y += 0.75 * 0.05
        const nearCamp = avoid.some((c) => Math.abs(c - p.d) < 12)
        const nearGap = gaps.length > 0 && (gapAt(p.x, p.z) || gapAt(p.x + p.dx * 9, p.z + p.dz * 9) || gapAt(p.x - p.dx * 9, p.z - p.dz * 9))
        // menjelang puncak tebingnya lebih sering supaya tidak tersisa satu tebing raksasa
        const need = p.d > pathLen - 70 ? 3 : want
        if (nat - y > need && !nearCamp && !nearGap && p.d < pathLen - 6) {
          stepFrom = y
          stepTo = Math.min(nat, y + 10)
          stepAt = p.d
          stepEnd = p.d + (stepTo - stepFrom) / 2.3
          out.push({ d0: stepAt, d1: stepEnd })
          want = 5.5 + r2() * 3.5
        }
        if (y > nat + 1.5) y = nat + 1.5
      }
      p.y = y
    }
    return out
  }
  const pickCamps = () => {
    const y0 = trail[0].y
    const y1 = trail[T - 1].y
    return Array.from({ length: Z }, (_, k) => {
      if (k === 0) return 6
      const goal = y0 + ((y1 - y0) * k) / Z
      const i = trail.findIndex((p) => p.y >= goal)
      return trail[Math.max(0, i)].d + 8
    })
  }
  layTrail([], 1)
  campD = pickCamps()
  steps = layTrail(campD, 1)
  {
    // ujung jalur menuju puncak
    // sisa ketinggian dibagi jadi beberapa tebing ≤ 8,5 m dengan pijakan di antaranya
    const last = trail[T - 1]
    const summitY = Math.max(last.y, dome(last.x, last.z))
    if (summitY - last.y > 0.5) {
      const yAt = (d: number) => trail[Math.max(0, Math.min(T - 1, Math.round(d / 0.75)))].y
      // tiap anak tangga: tebing ≤ 8,5 m + pijakan 5 m; mundur sampai cukup tempat & tidak memotong tebing lama
      const CH = 8.5 / 2.3 + 5
      let dStart = last.d - Math.ceil((summitY - last.y) / 8.5) * CH
      for (let it = 0; it < 8; it++) {
        const hit = steps.filter((st) => st.d1 + 1 > dStart)
        if (hit.length) {
          dStart = Math.min(...hit.map((st) => st.d0 - 1))
          steps = steps.filter((st) => st.d1 + 1 <= dStart)
        }
        const need = Math.ceil((summitY - yAt(dStart)) / 8.5) * CH
        if (last.d - dStart >= need || dStart <= trail[0].d) break
        dStart = last.d - need
      }
      dStart = Math.max(trail[0].d, dStart)
      const base0 = yAt(dStart)
      const count = Math.max(1, Math.ceil((summitY - base0) / 8.5))
      const each = (summitY - base0) / count
      const run = each / 2.3
      const chunk = (last.d - dStart) / count
      const ups: { d0: number; d1: number }[] = []
      for (let c = 0; c < count; c++) {
        const d1 = Math.min(last.d, dStart + (c + 1) * chunk)
        ups.push({ d0: d1 - run, d1 })
      }
      for (const p of trail) {
        if (p.d < dStart) continue
        let y = base0
        for (const u of ups) y += each * smooth(u.d0, u.d1, p.d)
        p.y = y
      }
      steps.push(...ups)
    }
  }
  const trailYAt = (d: number) => trail[Math.max(0, Math.min(T - 1, Math.round(d / 0.75)))].y

  // indeks ruang untuk mencari titik jalur terdekat dari sampel medan
  const HC = 8
  const hgrid = new Map<number, number[]>()
  const hkey = (ix: number, iz: number) => ix * 100003 + iz
  trail.forEach((p, i) => {
    const k = hkey(Math.floor(p.x / HC), Math.floor(p.z / HC))
    const list = hgrid.get(k)
    if (list) list.push(i)
    else hgrid.set(k, [i])
  })
  const nearestTrail = (x: number, z: number) => {
    const ix = Math.floor(x / HC)
    const iz = Math.floor(z / HC)
    let best = -1
    let bd = Infinity
    for (let oz = -1; oz <= 1; oz++) {
      for (let ox = -1; ox <= 1; ox++) {
        const list = hgrid.get(hkey(ix + ox, iz + oz))
        if (!list) continue
        for (const i of list) {
          const p = trail[i]
          const d = (p.x - x) ** 2 + (p.z - z) ** 2
          if (d < bd) {
            bd = d
            best = i
          }
        }
      }
    }
    return { i: best, d: Math.sqrt(bd) }
  }

  const WIDTH = 2.3
  const FADE = 3.2
  const raw = (x: number, z: number) => {
    const { t, th } = tOf(x, z)
    // massif bongkahan, menyatu ke pelataran kaki gunung
    let H = t < 1.08 ? blocks(x, z) : dome(x, z)
    const apron = dome(x, z) + fbm(x * 0.05, z * 0.05, seed + 77, 3) * 0.8
    H = lerp(H, apron, smooth(0.86, 1.04, t))
    H += fbm(x * 0.35, z * 0.35, seed + 501, 2) * 0.22
    // pilar
    for (const p of pillars) {
      const dx = x - p.x
      const dz = z - p.z
      if (Math.abs(dx) > p.r + 4 || Math.abs(dz) > p.r + 4) continue
      // penampang segi enam: sisi datar bersegi
      const a = Math.atan2(dz, dx) - p.rot
      const seg = Math.PI / 3
      const hex = Math.hypot(dx, dz) * Math.cos(((a % seg) + seg) % seg - seg / 2) / Math.cos(seg / 2)
      const base = dome(p.x, p.z)
      const top = base + p.hgt
      H = Math.max(H, top - Math.max(0, hex - p.r) * 3.2)
    }
    // pinggir: pantai landai, atau jurang ke awan
    if (id === 'langit') H = lerp(H, -60, smooth(1.0, 1.08, t))
    else {
      const edge = 2 - (t - 1) * R0 * (m.sea?.kind === 'air' ? 0.2 : 0.28) + fbm(x * 0.05, z * 0.05, seed + 78, 3) * 1.2
      H = lerp(H, Math.max(edge, -9), smooth(1.0, 1.12, t))
    }
    // jalur dipahat ke lereng
    const nt = nearestTrail(x, z)
    if (nt.i >= 0) {
      const ty = trail[nt.i].y
      // dinding potongan jalur tidak lebih curam dari muka bongkahan (±67°)
      const fade = Math.min(9, Math.max(FADE, Math.abs(H - ty) / 2.4))
      if (nt.d < WIDTH + fade) H = lerp(H, ty + fbm(x * 0.4, z * 0.4, seed + 88, 2) * 0.12, smooth(WIDTH + fade, WIDTH, nt.d))
    }
    // kawah lava di puncak
    if (m.crater) {
      const dc = Math.hypot(x - cx, z - cz)
      const rim = footR(th) * 0.115
      const pit = smooth(rim * 0.85, rim * 0.45, dc)
      H = lerp(H, HT - 14, pit)
    }
    // celah: dipotong paling akhir (jalur menyeberang lewat jembatan)
    const g = gaps.length ? gapAt(x, z) : null
    if (g) {
      // jurang kristal: dinding miring yang bisa dipanjat keluar; celah awan: tebing pulau
      const soft = id === 'langit' ? 1.8 : 5.5
      const cut = smooth(g.g.w * 0.5 - 0.6 + soft, g.g.w * 0.5 - 0.6, g.arc)
      H = lerp(H, id === 'langit' ? gapDepth : H + gapDepth, cut)
    }
    return H
  }

  const h = new Float32Array(n * n)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) h[j * n + i] = raw(i * CELL - half, j * CELL - half)
  }

  // batas zona = ketinggian jalur di tiap seperempat
  const base = Array.from({ length: Z + 1 }, (_, k) => (k === Z ? trail[T - 1].y : trailYAt(campD[k])))
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
    base,
    center: { x: cx, z: cz },
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
    lavaY: m.crater ? HT - 13 : null,
    craterR: m.crater ? footR(0) * 0.1 : 0,
  }
  const zoneOfY = (y: number) => {
    let k = 0
    for (let q = 1; q < Z; q++) if (y >= base[q] - 1.5) k = q
    return k
  }

  // api unggun di jalur
  for (let k = 0; k < Z; k++) {
    const p = trail[Math.min(T - 1, Math.round(campD[k] / 0.75))]
    const x = p.x - p.dz * 1.2
    const z = p.z + p.dx * 1.2
    flatten(terrain, x, z, 4)
    terrain.camps.push({ zone: k, x, y: heightAt(terrain, x, z), z })
  }
  {
    const p = trail[T - 1]
    flatten(terrain, p.x, p.z, 3.2)
    terrain.summit = { x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z }
  }
  {
    const p = trail[Math.round(3 / 0.75)]
    terrain.start = { x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z, yaw: Math.atan2(p.dx, p.dz) }
  }

  // jembatan di tempat jalur menyeberangi celah
  let deckId = 0
  if (gaps.length) {
    let inside = false
    let enter = 0
    for (let i = 0; i < T; i++) {
      const p = trail[i]
      const g = gapAt(p.x, p.z)
      const cutHere = g !== null && g.arc < g.g.w * 0.5 + (id === 'langit' ? 0.6 : 4.6)
      if (cutHere && !inside) {
        inside = true
        enter = i
      } else if (!cutHere && inside) {
        inside = false
        const a = trail[Math.max(0, enter - 4)]
        const b = trail[Math.min(T - 1, i + 3)]
        const x = (a.x + b.x) / 2
        const z = (a.z + b.z) / 2
        const yaw = Math.atan2(b.x - a.x, b.z - a.z)
        const hz = Math.hypot(b.x - a.x, b.z - a.z) / 2
        const y0 = heightAt(terrain, a.x, a.z) + 0.12
        const y1 = heightAt(terrain, b.x, b.z) + 0.12
        terrain.decks.push({ id: deckId++, x, z, hx: 1.3, hz, yaw, top: Math.max(y0, y1), y0, y1, fragile: id === 'kristal' })
        terrain.updrafts.push({ x, y: (y0 + y1) / 2 - 12, z, r: 3.2, a: (y0 + y1) / 2 + 5, b: 0 })
      }
    }
  }

  // rute bot: titik jalur tiap ~6 m; titik puncak tebing ditandai panjat
  {
    const inStep = (d: number) => steps.find((s) => d >= s.d0 - 0.5 && d <= s.d1 + 0.5)
    let last = -Infinity
    for (let i = 0; i < T; i++) {
      const p = trail[i]
      const st = inStep(p.d)
      if (st) {
        if (p.d <= st.d0 + 0.75 && p.d > st.d0 - 0.25) {
          // kaki tebing & bibir atasnya
          const f = trail[Math.max(0, Math.round((st.d0 - 1.5) / 0.75))]
          const top = trail[Math.min(T - 1, Math.round((st.d1 + 1.8) / 0.75))]
          terrain.route.push({ x: f.x, y: groundTop(terrain, f.x, f.z), z: f.z, climb: false })
          terrain.route.push({ x: top.x, y: groundTop(terrain, top.x, top.z), z: top.z, climb: true })
          last = top.d
        }
        continue
      }
      if (p.d - last < 6 && i < T - 1) continue
      if (p.d < last) continue
      // di atas jembatan: titik rute digeser ke garis tengah papan (jalur melengkung, papan lurus)
      let px = p.x
      let pz = p.z
      for (const d of terrain.decks) {
        const along = (px - d.x) * Math.sin(d.yaw) + (pz - d.z) * Math.cos(d.yaw)
        const across = (px - d.x) * Math.cos(d.yaw) - (pz - d.z) * Math.sin(d.yaw)
        if (Math.abs(along) <= d.hz && Math.abs(across) < 5) {
          px = d.x + Math.sin(d.yaw) * along
          pz = d.z + Math.cos(d.yaw) * along
        }
      }
      terrain.route.push({ x: px, y: groundTop(terrain, px, pz), z: pz, climb: false })
      last = p.d
    }
    const s = terrain.summit
    const end = terrain.route[terrain.route.length - 1]
    if (Math.hypot(end.x - s.x, end.z - s.z) > 0.5) terrain.route.push({ ...s, climb: false })
  }

  // air terjun di beberapa tebing panjat
  if (m.id === 'karang' || m.id === 'rimba') {
    for (let q = 1; q < steps.length - 1 && terrain.falls.length < 3; q += Math.max(2, Math.floor(steps.length / 3))) {
      const st = steps[q]
      const top = trail[Math.min(T - 1, Math.round(st.d1 / 0.75))]
      // menghadap ke luar gunung, di samping jalur
      const ox = top.x - cx
      const oz = top.z - cz
      const ol = Math.hypot(ox, oz) || 1
      terrain.falls.push({ x: top.x - top.dz * 5, z: top.z + top.dx * 5, dx: ox / ol, dz: oz / ol })
    }
  }

  // sulur di muka bongkahan dekat jalur (jalan pintas ke tikungan di atas)
  let ropeId = 0
  for (let i = 0; i < (m.vines ?? 0) * Z * 2 && terrain.vines.length < (m.vines ?? 0) * Z; i++) {
    const p = trail[Math.floor(rand() * T)]
    if (steps.some((s) => Math.abs(s.d0 - p.d) < 10)) continue
    // dari jalur ke arah puncak: cari kaki tebing lalu bibirnya
    const ux = cx - p.x
    const uz = cz - p.z
    const ul = Math.hypot(ux, uz) || 1
    const dx = ux / ul
    const dz = uz / ul
    let foot: [number, number] | null = null
    let top: [number, number] | null = null
    for (let d = 2; d < 16; d += 0.5) {
      const x = p.x + dx * d
      const z = p.z + dz * d
      const sl = slopeAt(terrain, x, z)
      if (!foot && sl > 1.3) foot = [x, z]
      else if (foot && sl < 0.6) {
        top = [x + dx, z + dz]
        break
      }
    }
    if (!foot || !top) continue
    const bottom = heightAt(terrain, foot[0], foot[1])
    const topY = heightAt(terrain, top[0], top[1])
    if (topY - bottom < 5) continue
    terrain.vines.push({ id: ropeId++, x: foot[0] - dx * 0.5, z: foot[1] - dz * 0.5, top: topY + 0.2, bottom: bottom + 0.3, nx: -dx, nz: -dz, tx: top[0], tz: top[1], kind: 'sulur' })
  }

  // bobot tekstur, salju, zona per sampel
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
      let w1 = smooth(0.45, 0.7, a)
      let w2 = smooth(0.55, 0.78, b)
      const w3 = smooth(0.6, 0.85, c)
      const [gx, gz] = gradAt(terrain, x, z)
      const slope = Math.hypot(gx, gz)
      w2 = Math.min(1, w2 + smooth(0.3, 0.9, slope) * 0.6)
      // jalan setapak: slot 1 (tanah injakan)
      const nt = nearestTrail(x, z)
      if (nt.i >= 0) w1 = Math.max(w1, smooth(WIDTH, WIDTH * 0.35, nt.d) * 0.8)
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
    const nt = nearestTrail(x, z)
    if (nt.i >= 0 && nt.d < WIDTH + 1.4 + pad) return true
    return false
  }
  const randomSpot = () => {
    const th = rand() * TAU
    const t = Math.sqrt(rand()) * (id === 'langit' ? 1.0 : 1.15)
    const r = t * footR(th)
    return { x: cx + Math.cos(th) * r, z: cz + Math.sin(th) * r }
  }
  const dry = (y: number) => y < (m.sea?.y ?? -99) + 0.4

  // pohon & batu lepas
  const area = Math.PI * R0 * R0
  for (let tries = 0; tries < (area / 100) * 3.2; tries++) {
    const { x, z } = randomSpot()
    const y = heightAt(terrain, x, z)
    if (dry(y)) continue
    const zn = m.zones[zoneOfY(y)]
    if (!zn.trees.length || rand() > zn.density / 3.2) continue
    if (slopeAt(terrain, x, z) > 0.55 || nearRoute(x, z, 0)) continue
    const kind = zn.trees[Math.floor(rand() * zn.trees.length)]
    const scale = 0.8 + rand() * 0.5
    const [r, top] = TREE_DIMS[kind]
    terrain.solids.push({ x, z, r: r * scale, y, top: y + top * scale, kind })
  }
  for (let i = 0; i < area / 700; i++) {
    const { x, z } = randomSpot()
    const y = heightAt(terrain, x, z)
    if (dry(y) || nearRoute(x, z, 0.5) || slopeAt(terrain, x, z) > 0.7) continue
    const r = 0.6 + rand() * 1.7
    terrain.solids.push({ x, z, r, y, top: y + r * 1.1, kind: 'batu' })
  }

  // peti, sarang burung, tas pendaki: separuh di dekat jalur, separuh di tepian bongkahan
  let chestId = 0
  for (let k = 0; k < Z; k++) {
    const per = 7
    let got = 0
    for (let tries = 0; tries < 400 && got < per; tries++) {
      let x: number
      let z: number
      if (got % 2 === 0) {
        const lo = k === 0 ? 0 : campD[k]
        const hi = k + 1 < Z ? campD[k + 1] : pathLen
        const p = trail[Math.min(T - 1, Math.round((lo + rand() * (hi - lo)) / 0.75))]
        const off = (rand() < 0.5 ? -1 : 1) * (WIDTH + 1.5 + rand() * 6)
        x = p.x - p.dz * off
        z = p.z + p.dx * off
      } else {
        const s = randomSpot()
        x = s.x
        z = s.z
      }
      const y = heightAt(terrain, x, z)
      if (zoneOfY(y) !== k || dry(y) || slopeAt(terrain, x, z) > 0.45) continue
      if (terrain.solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1)) continue
      if (gaps.length && gapAt(x, z)) continue
      const roll = rand()
      const kind: ChestKind = roll < 0.6 ? 'peti' : roll < 0.8 ? 'tas' : 'sarang'
      terrain.chests.push({ id: chestId++, kind, zone: k, x, y, z, yaw: rand() * TAU })
      got++
    }
  }
  // hadiah di atas pilar: harus dipanjat
  for (const p of pillars.slice(0, 6 + (m.pillars ?? 0))) {
    const y = heightAt(terrain, p.x, p.z)
    if (dry(y)) continue
    terrain.chests.push({ id: chestId++, kind: 'peti', zone: zoneOfY(y), x: p.x, y, z: p.z, yaw: rand() * TAU })
  }

  // batu menggelinding: dari bongkahan di atas jalur, melintasi jalur ke arah luar
  for (let q = 0; q < Z * 4; q++) {
    const p = trail[Math.floor((0.05 + rand() * 0.9) * T)]
    const ox = p.x - cx
    const oz = p.z - cz
    const a = Math.atan2(oz, ox)
    const x = p.x - Math.cos(a) * 9
    const z = p.z - Math.sin(a) * 9
    terrain.rocks.push({ x, y: heightAt(terrain, x, z), z, r: 0.9, a, b: 20 })
  }
  const along = (k: number, off: number) => {
    const lo = k === 0 ? 0 : campD[k]
    const hi = k + 1 < Z ? campD[k + 1] : pathLen
    const p = trail[Math.min(T - 1, Math.round((lo + rand() * (hi - lo)) / 0.75))]
    const o = (rand() - 0.5) * off
    return { x: p.x - p.dz * o, z: p.z + p.dx * o }
  }
  if (m.hazards.includes('uap')) {
    for (let k = 1; k < Z; k++) {
      for (let i = 0; i < 7; i++) {
        const p = along(k, 6)
        terrain.vents.push({ x: p.x, y: heightAt(terrain, p.x, p.z), z: p.z, r: 1.6, a: rand() * 8, b: 6 + rand() * 4 })
      }
    }
  }
  const critters = (c: Creature, k: number, count: number, out: Spot[], r: [number, number]) => {
    for (let i = 0; i < count; i++) {
      const p = c === 'kepiting' ? (() => {
        const th = rand() * TAU
        const rr = footR(th) * (0.98 + rand() * 0.1)
        return { x: cx + Math.cos(th) * rr, z: cz + Math.sin(th) * rr }
      })() : along(k, 14)
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
