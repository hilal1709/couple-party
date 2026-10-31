/**
 * Fisika bowling dari atas: bola & pin sebagai lingkaran di bidang lantai.
 * Sengaja hanya memakai + - * / dan sqrt (hasilnya sama persis di semua HP), tanpa acak,
 * supaya tiap HP memutar ulang lemparan yang sama dari parameter yang dikirim host.
 * x = kanan, z = maju dari garis foul.
 */

export const LANE_HALF = 0.525
export const HEAD_Z = 18.29
export const PIT_Z = 19.4
export const BALL_R = 0.108
export const PIN_R = 0.061
/** pin yang rebah menyapu lebih lebar daripada badannya */
const DOWN_R = 0.09
const GUTTER_X = LANE_HALF + 0.12

const BALL_M = 6.5
const PIN_M = 1.55
const DT = 1 / 120
/** kecepatan pin yang membuatnya rebah */
const TOPPLE = 0.7
const MAX_T = 9

const ROW = 0.264
const COL = 0.305

/** 10 posisi pin: indeks 0 = pin depan, baris paling belakang = 6..9 */
export const PIN_SPOTS: [number, number][] = [
  [0, 0],
  [-0.5, 1],
  [0.5, 1],
  [-1, 2],
  [0, 2],
  [1, 2],
  [-1.5, 3],
  [-0.5, 3],
  [0.5, 3],
  [1.5, 3],
].map(([c, r]) => [c * COL, HEAD_Z + r * ROW])

export type BowlThrow = {
  /** posisi lepas, -1..1 dari lebar lintasan */
  x: number
  /** kemiringan arah (dx per meter maju) */
  dir: number
  /** m/dtk */
  speed: number
  /** putaran -1..1: bola membelok ke arah ini di paruh akhir lintasan */
  spin: number
}

export type SimPin = {
  i: number
  x: number
  z: number
  vx: number
  vz: number
  up: boolean
  /** arah rebah (untuk tampilan) */
  tx: number
  tz: number
  /** waktu rebah, detik */
  at: number
}

type Body = { x: number; z: number; vx: number; vz: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const throwSpeed = (power: number) => 5.5 + clamp(power, 0, 1) * 4.5
export const startX = (x: number) => clamp(x, -1, 1) * (LANE_HALF - BALL_R - 0.03)

/** Tabrakan dua lingkaran; mengembalikan besar perubahan kecepatan, atau 0 bila tidak bersentuhan. */
function collide(a: Body, b: Body, reach: number, ma: number, mb: number, e: number) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const d2 = dx * dx + dz * dz
  if (d2 >= reach * reach || d2 === 0) return 0
  const d = Math.sqrt(d2)
  const nx = dx / d
  const nz = dz / d
  const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz
  // lepaskan yang tumpang tindih sesuai massa
  const push = (reach - d) / (ma + mb)
  a.x -= nx * push * mb
  a.z -= nz * push * mb
  b.x += nx * push * ma
  b.z += nz * push * ma
  if (rel <= 0) return 0
  const j = ((1 + e) * rel) / (1 / ma + 1 / mb)
  a.vx -= (j / ma) * nx
  a.vz -= (j / ma) * nz
  b.vx += (j / mb) * nx
  b.vz += (j / mb) * nz
  return j
}

export class RollSim {
  ball: Body
  pins: SimPin[]
  gutter = false
  t = 0
  done = false
  private spin: number
  private struck = false

  constructor(standing: boolean[], th: BowlThrow) {
    this.ball = { x: startX(th.x), z: 0, vx: th.dir * th.speed, vz: th.speed }
    this.spin = clamp(th.spin, -1, 1)
    this.pins = PIN_SPOTS.flatMap(([x, z], i) => (standing[i] ? [{ i, x, z, vx: 0, vz: 0, up: true, tx: 0, tz: 1, at: 0 }] : []))
  }

  step() {
    if (this.done) return
    this.t += DT
    const b = this.ball
    // putaran menggigit setelah bagian lintasan yang berminyak
    if (!this.gutter && b.z > 7 && b.z < HEAD_Z) b.vx += this.spin * 1.5 * ((b.z - 7) / 11.29) * DT
    b.vz = Math.max(0, b.vz - 0.12 * DT)
    b.x += b.vx * DT
    b.z += b.vz * DT

    if (!this.gutter && (b.x > LANE_HALF || b.x < -LANE_HALF) && b.z < HEAD_Z - 0.2) {
      this.gutter = true
      b.vx = 0
      b.x = b.x > 0 ? GUTTER_X : -GUTTER_X
    }

    if (!this.gutter && b.z > HEAD_Z - 0.5) this.hitPins()
    this.movePins()

    const still = this.pins.every((p) => p.vx * p.vx + p.vz * p.vz < 0.0025)
    if ((b.z >= PIT_Z && still) || this.t > MAX_T) this.done = true
  }

  private hitPins() {
    const b = this.ball
    for (const p of this.pins) {
      if (b.z < PIT_Z && collide(b, p, BALL_R + (p.up ? PIN_R : DOWN_R), BALL_M, PIN_M, 0.72) > 0) this.struck = true
    }
  }

  private movePins() {
    if (!this.struck) return
    const ps = this.pins
    for (let i = 0; i < ps.length; i++) {
      for (let k = i + 1; k < ps.length; k++) {
        const a = ps[i]
        const c = ps[k]
        // dua pin yang masih berdiri & diam tidak perlu dicek
        if (a.up && c.up && a.vx === 0 && a.vz === 0 && c.vx === 0 && c.vz === 0) continue
        collide(a, c, (a.up ? PIN_R : DOWN_R) + (c.up ? PIN_R : DOWN_R), PIN_M, PIN_M, 0.5)
      }
    }
    for (const p of ps) {
      const v2 = p.vx * p.vx + p.vz * p.vz
      if (v2 === 0) continue
      const v = Math.sqrt(v2)
      if (p.up && v > TOPPLE) {
        p.up = false
        p.at = this.t
        p.tx = p.vx / v
        p.tz = p.vz / v
      }
      // pin berdiri yang kena pelan cuma bergoyang dan cepat diam; pin rebah meluncur lebih jauh
      const slow = Math.min(v, (p.up ? 9 : 2.4) * DT)
      p.vx -= (p.vx / v) * slow
      p.vz -= (p.vz / v) * slow
      p.x += p.vx * DT
      p.z += p.vz * DT
      if (p.x > GUTTER_X) {
        p.x = GUTTER_X
        p.vx = -p.vx * 0.4
      } else if (p.x < -GUTTER_X) {
        p.x = -GUTTER_X
        p.vx = -p.vx * 0.4
      }
      if (p.z > PIT_Z + 0.5) {
        p.z = PIT_Z + 0.5
        p.vz = 0
      }
    }
  }
}

export type RollResult = {
  /** nomor pin yang jatuh */
  knocked: number[]
  ms: number
  gutter: boolean
}

export function simulateRoll(standing: boolean[], th: BowlThrow): RollResult {
  const s = new RollSim(standing, th)
  while (!s.done) s.step()
  return {
    knocked: s.pins.filter((p) => !p.up).map((p) => p.i),
    ms: Math.round(s.t * 1000),
    gutter: s.gutter,
  }
}
