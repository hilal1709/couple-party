import type { Body, Input, Mode } from '../sim/climb'
import type { Surface } from '../mountains'

/**
 * Protokol jaringan Puncak (di atas LiveChannel Supabase broadcast, tanpa jaminan sampai).
 *
 * HP host = otoritas: menjalankan sim semua pendaki pada langkah tetap {@link SIM_DT}.
 * Klien mengirim **input** bernomor urut (bukan posisi); host membalas **snapshot** keadaan sim
 * + nomor input terakhir yang sudah diterapkan per pemain (ack). Klien memprediksi badannya
 * sendiri, lalu menyelaraskan ulang dengan snapshot (replay input setelah ack).
 *
 * Yang TIDAK dikirim: kamera, partikel, rumput, frame render, geometri dunia.
 */
export const SIM_DT = 1 / 30

/** laju bisa diubah (dev: ?net=in:15,snap:12) tanpa mengubah format pesan */
export type NetRates = { input: number; snap: number; slowEvery: number; redundancy: number }
export const DEFAULT_RATES: NetRates = { input: 10, snap: 10, slowEvery: 5, redundancy: 6 }

/**
 * Laju per jumlah pemain manusia. Supabase Free: ±100 kejadian/dtk per proyek, dan SETIAP kiriman ke
 * tiap penerima dihitung (satu broadcast ke 3 HP = 4 kejadian). Perkiraan total kejadian/dtk:
 *   (snap + 1 isi gunung + (n−1) × (input + ping)) × n
 *   2 pemain: (10 + 1 + 10,3) × 2 ≈ 43 · 3 pemain: (8 + 1 + 2 × 8,3) × 3 ≈ 77 · 4 pemain: (5 + 1 + 3 × 5,3) × 4 ≈ 88
 * Redundansi = input dua pesan terakhir, supaya satu pesan hilang tidak membuat host menunggu.
 */
export function ratesFor(humans: number): NetRates {
  if (humans <= 2) return { input: 10, snap: 10, slowEvery: 5, redundancy: 6 }
  if (humans === 3) return { input: 7.5, snap: 8, slowEvery: 4, redundancy: 8 }
  return { input: 5, snap: 5, slowEvery: 3, redundancy: 12 }
}

/** perkiraan kejadian Supabase per detik untuk laju ini (pemantauan & tes) */
export function eventsPerSec(r: NetRates, humans: number, mntPerSec = 1, pingPerSec = 1 / 3) {
  return (r.snap + mntPerSec + (humans - 1) * (r.input + pingPerSec)) * humans
}

export function ratesFromQuery(q: string | null | undefined, base: NetRates = DEFAULT_RATES): NetRates {
  const r = { ...base }
  if (!q) return r
  for (const part of q.split(',')) {
    const [k, v] = part.split(':')
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) continue
    if (k === 'in') r.input = Math.min(30, n)
    if (k === 'snap') r.snap = Math.min(30, n)
    if (k === 'red') r.redundancy = Math.min(12, Math.round(n))
  }
  return r
}

/** urutan = kode mode di pesan: mode baru selalu ditambah di akhir */
export const MODES: Mode[] = ['ground', 'air', 'climb', 'rope', 'slide', 'swim', 'down', 'mantle']
const SURFACES: Surface[] = ['batu', 'tanah', 'lumut', 'salju', 'es', 'pasir', 'kristal', 'vulkanik']

const q = (v: number, k: number) => Math.round(v * k) / k

// ---------- input ----------
/** input dikuantisasi SEBELUM dipakai prediksi, supaya host & klien menerapkan nilai yang sama persis */
export type PackedInput = [mx: number, mz: number, up: number, side: number, flags: number]

export function packInput(i: Input): PackedInput {
  const c = (v: number) => q(Math.max(-1, Math.min(1, v)), 100)
  return [c(i.mx), c(i.mz), c(i.up), c(i.side), (i.jump ? 1 : 0) | (i.grip ? 2 : 0) | (i.sprint ? 4 : 0)]
}

/** juga dipakai host untuk membersihkan input dari klien (nilai di luar −1..1 dipotong, panjang arah ≤ 1) */
export function unpackInput(p: readonly unknown[]): Input {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0)
  let mx = n(p[0])
  let mz = n(p[1])
  const l = Math.hypot(mx, mz)
  if (l > 1) {
    mx /= l
    mz /= l
  }
  const f = typeof p[4] === 'number' ? p[4] : 0
  return { mx, mz, up: n(p[2]), side: n(p[3]), jump: !!(f & 1), grip: !!(f & 2), sprint: !!(f & 4) }
}

// ---------- badan ----------
/** keadaan sim yang berubah tiap tick: dikirim di setiap snapshot */
export type Core = number[]
/** keadaan yang berubah pelan (lelah, buff, permukaan): dikirim tiap beberapa snapshot */
export type Slow = number[]

export function packCore(b: Body): Core {
  const m = b.mantle
  const out = [
    q(b.x, 1000), q(b.y, 1000), q(b.z, 1000),
    q(b.vx, 1000), q(b.vy, 1000), q(b.vz, 1000),
    q(b.yaw, 10000), MODES.indexOf(b.mode), q(b.stamina, 10000),
    q(b.nx, 10000), q(b.ny, 10000), q(b.nz, 10000),
    // timer: lunge naik 5,6 m/s, jadi 0,01 dtk pembulatan = 6 cm salah prediksi; pakai 0,1 ms
    q(b.slipT, 10000), q(b.lunge, 10000), q(b.lungeCd, 10000),
    (b.chain ? 1 : 0) | (b.umbrella ? 2 : 0) | (b.moving ? 4 : 0),
    q(b.peak, 100), b.rope ?? -1, q(b.stun, 10000), q(b.airSpeed, 1000), q(b.bonus, 10000),
  ]
  if (m) out.push(q(m.t, 10000), q(m.x0, 1000), q(m.y0, 1000), q(m.z0, 1000), q(m.x1, 1000), q(m.y1, 1000), q(m.z1, 1000))
  return out
}

export function unpackCore(b: Body, c: readonly number[]) {
  b.x = c[0]
  b.y = c[1]
  b.z = c[2]
  b.vx = c[3]
  b.vy = c[4]
  b.vz = c[5]
  b.yaw = c[6]
  b.mode = MODES[c[7]] ?? 'ground'
  b.stamina = c[8]
  b.nx = c[9]
  b.ny = c[10]
  b.nz = c[11]
  b.slipT = c[12]
  b.lunge = c[13]
  b.lungeCd = c[14]
  b.chain = !!(c[15] & 1)
  b.umbrella = !!(c[15] & 2)
  b.moving = !!(c[15] & 4)
  b.peak = c[16]
  b.rope = c[17] >= 0 ? c[17] : null
  b.stun = c[18]
  b.airSpeed = c[19]
  b.bonus = c[20] ?? 0
  b.mantle = c.length >= 28 ? { t: c[21], x0: c[22], y0: c[23], z0: c[24], x1: c[25], y1: c[26], z1: c[27] } : null
}

const BUFFS = ['kapur', 'sepatu', 'syal', 'balon', 'kopi', 'obor', 'kompas', 'teropong'] as const

export function packSlow(b: Body): Slow {
  const f = b.fat
  return [q(f.fall, 1000), q(f.hunger, 1000), q(f.cold, 1000), q(f.heat, 1000), q(f.poison, 1000), ...BUFFS.map((k) => q(b.buffs[k], 10)), SURFACES.indexOf(b.surface)]
}

export function unpackSlow(b: Body, s: readonly number[]) {
  b.fat = { fall: s[0], hunger: s[1], cold: s[2], heat: s[3], poison: s[4] }
  BUFFS.forEach((k, i) => (b.buffs[k] = s[5 + i]))
  b.surface = SURFACES[s[13]] ?? b.surface
}

// ---------- pesan ----------
export type InMsg = { k: 'in'; a: number; s: number; i: PackedInput[] }
/** b: [aktor, ack, ...core]; w: [aktor, ...slow] (opsional) */
export type SnapMsg = { k: 'snap'; n: number; ms: number; b: number[][]; w?: number[][] }
export type PingMsg = { k: 'ping'; id: number }
export type PongMsg = { k: 'pong'; id: number; to: number }
/** klien baru tersambung / tersambung ulang: minta snapshot lengkap + isi gunung sekarang */
export type NeedMsg = { k: 'need'; a: number }
export type NetMsg = InMsg | SnapMsg | PingMsg | PongMsg | NeedMsg

/** cek bentuk pesan dari jaringan sebelum dipakai (pesan rusak/asing dibuang) */
export function isNetMsg(m: unknown): m is NetMsg {
  if (!m || typeof m !== 'object') return false
  const k = (m as { k?: unknown }).k
  if (k === 'in') {
    const x = m as InMsg
    return Number.isInteger(x.a) && Number.isInteger(x.s) && Array.isArray(x.i) && x.i.length <= 30 && x.i.every((p) => Array.isArray(p) && p.length === 5)
  }
  if (k === 'snap') {
    const x = m as SnapMsg
    return Number.isInteger(x.n) && typeof x.ms === 'number' && Array.isArray(x.b) && x.b.every((r) => Array.isArray(r) && r.length >= 23)
  }
  if (k === 'ping' || k === 'pong') return Number.isInteger((m as PingMsg).id)
  if (k === 'need') return Number.isInteger((m as NeedMsg).a)
  return false
}
