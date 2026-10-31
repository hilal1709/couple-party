import type { Stats } from '../data'
import { STEP, curvature, nearest, type Track } from './track'

/** kecepatan puncak dasar (m/s) — lintasan 3+ km, jadi kart harus kencang */
export const TOP_SPEED = 40
export const KART_RADIUS = 1.3
const GRAVITY = 32
/** batas muatan drift untuk turbo biru / oranye / ungu (detik drift) */
export const DRIFT_LEVELS = [0.9, 1.9, 3]
const DRIFT_BOOST = [0.7, 1.1, 1.6]

export type Input = { steer: number; gas: boolean; brake: boolean; drift: boolean }

export type Kart = {
  x: number
  y: number
  z: number
  vy: number
  yaw: number
  speed: number
  /** sampel lintasan terdekat & jarak tempuh di lap ini */
  i: number
  s: number
  lateral: number
  airborne: boolean
  /** -1 / 1 saat drift, 0 = tidak */
  drift: number
  driftT: number
  /** sudut tampilan bodi saat drift / muter */
  slide: number
  boostT: number
  /** detik sisa: muter (kena item), lambat (awan), perisai, magnet */
  spinT: number
  slowT: number
  shieldT: number
  guardT: number
  magnetT: number
  /** sedang di luar aspal */
  offroad: boolean
  /** dorongan dari tabrakan */
  pushX: number
  pushZ: number
  /** sudah lewat setengah lintasan sejak garis start terakhir (anti potong) */
  half: boolean
  /** sedang di lava / jatuh: hitung mundur sebelum dipulangkan ke jalan */
  fallT: number
}

export function spawnKart(t: Track, slot: number): Kart {
  // grid start: 2 kolom, mundur 7 m per baris, di belakang garis start
  const row = Math.floor(slot / 2)
  const col = slot % 2 ? 1 : -1
  const s = t.length - 8 - row * 7
  const i = Math.round(s / STEP) % t.n
  const lateral = col * t.hw[i] * 0.4
  const x = t.px[i] - t.tz[i] * lateral
  const z = t.pz[i] + t.tx[i] * lateral
  return {
    x, y: t.py[i], z, vy: 0, yaw: Math.atan2(t.tx[i], t.tz[i]), speed: 0,
    i, s, lateral, airborne: false, drift: 0, driftT: 0, slide: 0, boostT: 0,
    spinT: 0, slowT: 0, shieldT: 0, guardT: 0, magnetT: 0, offroad: false, pushX: 0, pushZ: 0, half: true, fallT: 0,
  }
}

export const driftLevel = (k: Kart) => (k.drift ? DRIFT_LEVELS.filter((l) => k.driftT >= l).length : 0)

export type StepEvents = { lap?: boolean; boost?: number; jump?: boolean; bump?: boolean; fell?: boolean; land?: boolean }

/**
 * Satu langkah fisika arcade untuk satu kart. Mutasi `k`; mengembalikan kejadian penting
 * (lap, turbo, lompat) untuk suara & laporan ke host.
 */
export function stepKart(k: Kart, inp: Input, st: Stats, t: Track, dt: number, mods: { speed?: number } = {}): StepEvents {
  const ev: StepEvents = {}
  const lava = t.def.theme.offroad === 'lava'

  if (k.fallT > 0) {
    k.fallT -= dt
    k.speed = 0
    if (k.fallT <= 0) {
      // pulang ke tengah jalan sedikit di belakang
      const i = (k.i - 4 + t.n) % t.n
      k.x = t.px[i]
      k.z = t.pz[i]
      k.y = t.py[i] + 3
      k.vy = 0
      k.yaw = Math.atan2(t.tx[i], t.tz[i])
      k.airborne = true
      k.spinT = 0
    }
    return ev
  }

  const grip = t.grip[k.i]
  const drag = t.drag[k.i]
  let top = TOP_SPEED * st.speed * (mods.speed ?? 1)
  if (k.offroad && !k.airborne) top *= lava ? 0.4 : 0.55
  if (drag) top *= 1 - drag
  if (k.slowT > 0) top *= 0.7
  if (k.boostT > 0) top *= 1.32
  if (k.magnetT > 0) top *= 1.22

  // ---- kecepatan ----
  if (k.spinT > 0) {
    k.spinT -= dt
    k.speed *= Math.pow(0.25, dt)
    k.slide += dt * 14
  } else {
    const accel = 26 * st.accel
    if (k.boostT > 0) k.speed = Math.max(k.speed, top)
    else if (inp.brake) k.speed -= (k.speed > 0 ? 40 : 10) * dt
    else if (inp.gas) k.speed += accel * (1 - Math.max(0, k.speed) / top) * dt * 1.6
    else k.speed *= Math.pow(0.6, dt)
    if (k.speed > top) k.speed = Math.max(top, k.speed - 30 * dt)
    k.speed = Math.max(-10, k.speed)
  }
  k.boostT = Math.max(0, k.boostT - dt)
  k.slowT = Math.max(0, k.slowT - dt)
  k.shieldT = Math.max(0, k.shieldT - dt)
  k.guardT = Math.max(0, k.guardT - dt)
  k.magnetT = Math.max(0, k.magnetT - dt)

  // ---- belok & drift ----
  const steer = Math.max(-1, Math.min(1, inp.steer))
  if (!k.airborne && k.spinT <= 0) {
    if (inp.drift && !k.drift && Math.abs(steer) > 0.3 && k.speed > 14) {
      k.drift = Math.sign(steer)
      k.driftT = 0
    }
    if (k.drift && (!inp.drift || k.speed < 10)) {
      const lvl = driftLevel(k)
      if (lvl > 0 && inp.drift === false) {
        k.boostT = Math.max(k.boostT, DRIFT_BOOST[lvl - 1])
        ev.boost = lvl
      }
      k.drift = 0
      k.driftT = 0
    }
    const speedF = Math.min(1, Math.abs(k.speed) / 12)
    let turn: number
    if (k.drift) {
      // saat drift: selalu menikung ke arah drift, setir hanya mengatur rapatnya
      const tight = 0.55 + 0.45 * (steer * k.drift + 1) * 0.5
      turn = k.drift * tight * 2.15
      k.driftT += dt * (0.6 + 0.6 * Math.abs(steer))
    } else turn = steer * 1.7
    k.yaw -= turn * st.turn * speedF * dt * Math.sign(k.speed || 1) * (0.6 + 0.4 * grip)
    const want = k.drift ? -k.drift * 0.45 : 0
    k.slide += (want - (k.slide % (Math.PI * 2))) * Math.min(1, dt * 8)
  } else if (k.spinT <= 0) {
    k.slide *= Math.pow(0.05, dt)
  }
  if (k.spinT <= 0 && Math.abs(k.slide) > Math.PI) k.slide = 0

  // ---- gerak ----
  const fx = Math.sin(k.yaw)
  const fz = Math.cos(k.yaw)
  // es: sebagian kecepatan lama terbawa (meluncur)
  k.x += (fx * k.speed + k.pushX) * dt
  k.z += (fz * k.speed + k.pushZ) * dt
  const pd = Math.pow(0.02, dt)
  k.pushX *= pd
  k.pushZ *= pd

  // ---- posisi di lintasan ----
  const prevS = k.s
  const near = nearest(t, k.x, k.z, k.i)
  k.i = near.i
  k.lateral = near.lateral
  k.s = near.s
  const wall = t.wall[k.i]
  k.offroad = Math.abs(near.lateral) > t.hw[k.i]
  if (Math.abs(near.lateral) > wall) {
    // dinding: dorong balik & redam
    const over = Math.abs(near.lateral) - wall
    const sgn = Math.sign(near.lateral)
    k.x -= -t.tz[k.i] * over * sgn
    k.z -= t.tx[k.i] * over * sgn
    k.lateral = wall * sgn
    k.speed *= 0.75
    ev.bump = true
  }

  // ---- tinggi & lompat ----
  const ground = t.py[k.i] + t.ramp[k.i]
  if (k.airborne) {
    k.vy -= GRAVITY * dt
    k.y += k.vy * dt
    if (k.y <= ground) {
      k.y = ground
      k.airborne = false
      k.vy = 0
      ev.land = true
    }
  } else {
    // ujung tanjakan: lempar ke udara
    const prevRamp = t.ramp[(k.i - 1 + t.n) % t.n]
    if (t.ramp[k.i] === 0 && prevRamp > 1 && k.speed > 12) {
      k.airborne = true
      k.vy = 6 + k.speed * 0.28
      ev.jump = true
    } else k.y = ground
  }
  if (lava && k.offroad && !k.airborne && Math.abs(near.lateral) > t.hw[k.i] + 2) {
    k.fallT = 1.2
    k.boostT = 0
    k.drift = 0
    ev.fell = true
  }

  // ---- garis start ----
  const L = t.length
  if (k.s > L * 0.45 && k.s < L * 0.55) k.half = true
  if (prevS > L * 0.8 && k.s < L * 0.2) {
    if (k.half) {
      k.half = false
      ev.lap = true
    }
  } else if (prevS < L * 0.2 && k.s > L * 0.8) {
    // mundur melewati garis: batalkan
    k.half = true
  }
  return ev
}

/** lempar kart ke udara (jamur pantul) */
export function bounce(k: Kart, power: number) {
  if (k.airborne) return
  k.airborne = true
  k.vy = 14 * power
}

/** kart masih kebal setelah perisai pecah (detik): rintangan menyentuh kart berkali-kali, serangan bisa bertumpuk */
export const SHIELD_GRACE = 1

export const isShielded = (k: Kart) => k.shieldT > 0 || k.guardT > 0

/** perisai menelan satu serangan; true kalau serangan tertahan */
function absorbHit(k: Kart): boolean {
  if (k.guardT > 0) return true
  if (k.shieldT <= 0) return false
  k.shieldT = 0
  k.guardT = SHIELD_GRACE
  return true
}

/** kart kena awan: melambat, kecuali perisai aktif */
export function rainKart(k: Kart, seconds = 4): boolean {
  if (absorbHit(k)) return false
  k.slowT = seconds
  return true
}

/** kart kena item / rintangan: muter, kecuali perisai aktif */
export function hitKart(k: Kart, seconds = 1.1): boolean {
  if (absorbHit(k)) return false
  if (k.spinT > 0 || k.fallT > 0) return false
  k.spinT = seconds
  k.drift = 0
  k.driftT = 0
  k.boostT = 0
  return true
}

/** magnet menarik kart ke lawan di depannya dalam jarak ini (meter) */
export const MAGNET_RANGE = 140
const MAGNET_PULL = 11

/** tarik kart ke `target`; true kalau tarikan bekerja */
export function magnetPull(k: Kart, target: { x: number; z: number }, dt: number): boolean {
  const dx = target.x - k.x
  const dz = target.z - k.z
  const d = Math.hypot(dx, dz)
  if (d < KART_RADIUS * 2 || d > MAGNET_RANGE) return false
  k.x += (dx / d) * MAGNET_PULL * dt
  k.z += (dz / d) * MAGNET_PULL * dt
  return true
}

/** tolak dua kart yang bertumpuk; berat menentukan siapa yang terdorong lebih jauh */
export function collide(a: Kart, wa: number, b: { x: number; z: number; y: number }, wb: number): boolean {
  const dx = a.x - b.x
  const dz = a.z - b.z
  const d = Math.hypot(dx, dz)
  if (d >= KART_RADIUS * 2 || d < 1e-4 || Math.abs(a.y - b.y) > 2) return false
  const overlap = KART_RADIUS * 2 - d
  const share = wb / (wa + wb)
  a.x += (dx / d) * overlap * share
  a.z += (dz / d) * overlap * share
  a.pushX += (dx / d) * 9 * share
  a.pushZ += (dz / d) * 9 * share
  return true
}

/** total kemajuan (meter) untuk peringkat */
export const progressOf = (laps: number, k: { s: number }, length: number) => laps * length + k.s

export { curvature }
