import type { Hazard } from '../tracks'
import type { Entity } from '../types'
import { STEP, hwAt, pointAt, type Track } from './track'

/** kecepatan roket kertas (m/s) & umurnya (detik) */
export const ROCKET_SPEED = 62
export const ROCKET_LIFE = 7
/** petasan: mendarat setelah FUSE detik, meledak selama BLAST detik dengan radius BLAST_R */
export const PETASAN_FUSE = 0.8
export const PETASAN_BLAST = 0.45
export const PETASAN_R = 7.5
/** kotak item tumbuh lagi setelah diambil (detik) */
export const BOX_RESPAWN = 2.5
/** batu jatuh: bayangan muncul dulu, lalu kena di fase DROP_HIT */
export const DROP_HIT: [number, number] = [0.72, 0.86]
/** pisang & roket baru bisa mengenai pemiliknya setelah sekian detik */
const OWNER_GRACE = 1.2
/** kart setinggi ini di atas jalan lolos dari rintangan yang menggelinding/mendarat di tanah */
const CLEAR_Y = 3.5

/** pelempar tidak pernah kena ledakan petasannya sendiri; benda lain hanya aman sebentar */
export function ownerSafe(e: Entity, racer: number, age: number): boolean {
  return e.by === racer && (e.kind === 'petasan' || age < OWNER_GRACE)
}

const TAU = Math.PI * 2

/** posisi rintangan bergerak pada jam balapan `time` (detik) */
export function hazardPose(t: Track, h: Hazard, time: number): { x: number; y: number; z: number; yaw: number; r: number; lift: number } | null {
  switch (h.kind) {
    case 'roller': {
      const span = hwAt(t, h.at * t.length) + 8
      const lat = span * Math.sin((TAU * time) / h.period)
      const p = pointAt(t, h.at * t.length, lat)
      const dir = Math.cos((TAU * time) / h.period) >= 0 ? 1 : -1
      return { ...p, yaw: p.yaw + (dir * Math.PI) / 2, r: h.radius, lift: 0 }
    }
    case 'block': {
      const p = pointAt(t, h.at * t.length, h.lane * hwAt(t, h.at * t.length) * 0.8)
      return { ...p, r: h.radius, lift: 0 }
    }
    case 'swing': {
      const ang = Math.sin((TAU * time) / h.period) * 1.1
      const reach = hwAt(t, h.at * t.length) * 0.85
      const p = pointAt(t, h.at * t.length, Math.sin(ang) * reach)
      // bandul: makin ke tepi makin tinggi
      return { ...p, r: 2.8, lift: (1 - Math.cos(ang)) * 6, yaw: ang }
    }
    case 'bounce': {
      const p = pointAt(t, h.at * t.length, h.lane * hwAt(t, h.at * t.length) * 0.7)
      return { ...p, r: 4, lift: 0 }
    }
    case 'drop': {
      const p = pointAt(t, h.at * t.length, h.lane * hwAt(t, h.at * t.length) * 0.7)
      const ph = (time % h.period) / h.period
      // lift = tinggi batu di atas jalan (jatuh di 0.55..0.72)
      const fall = Math.max(0, Math.min(1, (ph - 0.5) / (DROP_HIT[0] - 0.5)))
      return { ...p, r: 4.5, lift: ph < 0.5 ? 60 : ph < DROP_HIT[0] ? 60 * (1 - fall * fall) : ph < DROP_HIT[1] ? 0 : -100 }
    }
    case 'grip':
      return null
  }
}

/** rintangan yang sedang berbahaya di dekat (x, z): mengembalikan aksi untuk kart */
export function hazardContact(t: Track, time: number, x: number, z: number, y: number): 'hit' | 'wall' | 'bounce' | null {
  for (const h of t.def.hazards) {
    const p = hazardPose(t, h, time)
    if (!p) continue
    const d = Math.hypot(p.x - x, p.z - z)
    if (d > p.r + 1.3) continue
    if (h.kind === 'bounce') return 'bounce'
    if (h.kind === 'block') return 'wall'
    if (h.kind === 'swing') {
      // bandul lewat di atas atau di bawah kart = tidak kena
      if (Math.abs(y - (p.y + p.lift)) > 3) continue
      return 'hit'
    }
    if (y > p.y + CLEAR_Y) continue
    if (h.kind === 'drop') {
      const ph = (time % h.period) / h.period
      if (ph >= DROP_HIT[0] && ph < DROP_HIT[1]) return 'hit'
      continue
    }
    return 'hit'
  }
  return null
}

/** rintangan diam terdekat untuk ditabrak (dorong keluar) */
export function blockPush(t: Track, x: number, z: number): { nx: number; nz: number; depth: number } | null {
  for (const h of t.def.hazards) {
    if (h.kind !== 'block') continue
    const p = pointAt(t, h.at * t.length, h.lane * hwAt(t, h.at * t.length) * 0.8)
    const dx = x - p.x
    const dz = z - p.z
    const d = Math.hypot(dx, dz)
    const min = h.radius + 1.3
    if (d < min && d > 1e-4) return { nx: dx / d, nz: dz / d, depth: min - d }
  }
  return null
}

/** panel turbo yang sedang diinjak */
export function onPad(t: Track, s: number, lateral: number): boolean {
  for (const [at, lane] of t.def.pads) {
    let ds = s - at * t.length
    if (ds > t.length / 2) ds -= t.length
    if (ds < -t.length / 2) ds += t.length
    if (Math.abs(ds) < 4 && Math.abs(lateral - lane * hwAt(t, s) * 0.6) < 4) return true
  }
  return false
}

/** posisi kotak item: tiap deret 4 kotak melintang jalan */
export function boxSpots(t: Track): { id: number; x: number; y: number; z: number }[] {
  const out: { id: number; x: number; y: number; z: number }[] = []
  t.def.boxes.forEach((at, r) => {
    for (let c = 0; c < 4; c++) {
      const p = pointAt(t, at * t.length, (c - 1.5) * hwAt(t, at * t.length) * 0.45)
      out.push({ id: r * 4 + c, x: p.x, y: p.y + 1.4, z: p.z })
    }
  })
  return out
}

/** posisi benda item pada `age` detik sejak muncul; null = sudah habis */
export function entityPose(t: Track, e: Entity, age: number): { x: number; y: number; z: number; r: number; live: boolean } | null {
  switch (e.kind) {
    case 'pisang':
      return { x: e.x, y: t.py[nearestIdx(t, e.x, e.z)] + 0.3, z: e.z, r: 1.6, live: true }
    case 'roket': {
      if (age > ROCKET_LIFE) return null
      const p = pointAt(t, e.s + age * ROCKET_SPEED, e.lane)
      return { x: p.x, y: p.y + 1.2, z: p.z, r: 2.2, live: age > 0.15 }
    }
    case 'petasan': {
      if (age > PETASAN_FUSE + PETASAN_BLAST + 0.6) return null
      const y = t.py[nearestIdx(t, e.x, e.z)]
      const live = age >= PETASAN_FUSE && age < PETASAN_FUSE + PETASAN_BLAST
      return { x: e.x, y: y + (age < PETASAN_FUSE ? Math.sin((age / PETASAN_FUSE) * Math.PI) * 8 : 0.4), z: e.z, r: live ? PETASAN_R : 0, live }
    }
  }
}

function nearestIdx(t: Track, x: number, z: number): number {
  let best = 0
  let bd = Infinity
  // cukup kasar: benda diam jarang dihitung ulang
  for (let i = 0; i < t.n; i += 2) {
    const d = (t.px[i] - x) ** 2 + (t.pz[i] - z) ** 2
    if (d < bd) {
        bd = d
        best = i
      }
  }
  return best
}

export { STEP }
