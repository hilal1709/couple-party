import { LM, torsoLength, torsoVisible, seen, type Pt } from '../../input/pose/landmarks'
import { HEAD_Z, throwSpeed } from './sim'

/** Ambang dalam satuan panjang badan (bahu ke pinggul). */
const ARMED_BELOW = 0.72 // pergelangan setidaknya segini di bawah bahu
const ARMED_MS = 250
const RELEASE_ABOVE = 0.42 // lewat garis ini saat naik = bola lepas
const MIN_SPEED = 1.6 // badan per detik
const FULL_SPEED = 6.5
const SIDE_RANGE = 0.3 // geser badan segini dari tengah gambar = ujung lintasan

export type BowlPose = {
  /** posisi berdiri -1..1 */
  x: number
  /** tangan siap di bawah, ayunan berikutnya akan melempar */
  armed: boolean
}

export type BowlSwing = {
  x: number
  dir: number
  speed: number
  spin: number
  hand: 'L' | 'R'
}

type Track = { y: number; x: number; at: number; lowSince: number; vy: number }

const NEW: Track = { y: 0, x: 0, at: 0, lowSince: 0, vy: 0 }

/**
 * Membaca ayunan bowling dari titik tubuh: tangan turun dulu (siap), lalu naik cepat melewati dada.
 * Gambar kamera depan dicerminkan: geser ke kanan pemain = bergerak ke kanan layar.
 */
export class BowlGesture {
  private hands = { L: { ...NEW }, R: { ...NEW } }
  private x = 0

  /** titik tubuh terbaru; mengembalikan ayunan kalau bola baru saja dilepas */
  push(lm: Pt[], at: number): { pose: BowlPose | null; swing: BowlSwing | null } {
    if (lm.length < 29 || !torsoVisible(lm)) return { pose: null, swing: null }
    const unit = torsoLength(lm)
    const shoulderY = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2
    const midX = (lm[LM.lShoulder].x + lm[LM.rShoulder].x) / 2
    // gambar mentah belum dicermin: pemain ke kanannya sendiri = x gambar mengecil
    const target = Math.max(-1, Math.min(1, (0.5 - midX) / SIDE_RANGE))
    this.x += (target - this.x) * 0.25

    let swing: BowlSwing | null = null
    let armed = false
    for (const side of ['L', 'R'] as const) {
      const wrist = lm[side === 'L' ? LM.lWrist : LM.rWrist]
      const h = this.hands[side]
      if (!seen(wrist, 0.4)) {
        h.lowSince = 0
        h.at = 0
        continue
      }
      const y = (wrist.y - shoulderY) / unit
      const x = (wrist.x - midX) / unit
      const dt = h.at ? (at - h.at) / 1000 : 0
      const prevY = h.y
      if (dt > 0) h.vy += ((prevY - y) / dt - h.vy) * 0.6
      if (y > ARMED_BELOW) h.lowSince ||= at
      const ready = h.lowSince > 0 && at - h.lowSince >= ARMED_MS
      if (ready) armed = true

      if (ready && h.at && prevY > RELEASE_ABOVE && y <= RELEASE_ABOVE && h.vy > MIN_SPEED && !swing) {
        const power = Math.min(1, (h.vy - MIN_SPEED) / (FULL_SPEED - MIN_SPEED))
        const vx = dt > 0 ? (x - h.x) / dt : 0
        // tangan melenceng ke samping saat lepas = arah; sapuan ke samping = putaran. Kanan layar = -x gambar
        const dirM = Math.max(-0.6, Math.min(0.6, -vx * 0.09))
        swing = { x: this.x, dir: dirM / HEAD_Z, speed: throwSpeed(0.25 + power * 0.75), spin: Math.max(-1, Math.min(1, -vx * 0.2)), hand: side }
        h.lowSince = 0
      }
      if (y < 0.3) h.lowSince = 0
      h.y = y
      h.x = x
      h.at = at
    }
    return { pose: { x: this.x, armed }, swing }
  }

  reset() {
    this.hands = { L: { ...NEW }, R: { ...NEW } }
  }
}
