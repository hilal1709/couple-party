import { LM, seen, torsoLength, torsoVisible, type Pt } from '../../input/pose/landmarks'
import type { BoxHand, Stance } from '../../types'

/** Ambang dalam satuan panjang badan (bahu ke pinggul) per detik. */
const PUNCH_MIN = 3.2
const PUNCH_FULL = 8
const COOLDOWN_MS = 380
/** tangan harus di atas garis bahu: setinggi dada itu posisi siap memukul, bukan menangkis */
const GUARD_Y = -0.05
const GUARD_X = 0.95
/** geser badan dari titik tengah */
const DODGE_ON = 0.42
const DODGE_OFF = 0.24
const BASE_FOLLOW = 0.02

type Hand = { x: number; y: number; z: number; reach: number; at: number; v: number }

const fresh = (): Hand => ({ x: 0, y: 0, z: 0, reach: 0, at: 0, v: 0 })

export type BoxRead = { ok: boolean; stance: Stance; punch: { hand: BoxHand; power: number } | null }

/**
 * Tangkis = dua tangan di depan wajah. Hindar = badan bergeser dari titik tengah.
 * Pukulan = pergelangan melesat, dan bergerak menjauhi badan: mendekati kamera (z mengecil) atau
 * lengan makin terentang. Syarat kedua membedakannya dari tangan yang ditarik kembali ke wajah.
 * Gambar belum dicermin: pemain bergeser ke kanannya sendiri = x gambar mengecil.
 */
export class BoxGesture {
  private hands = { L: fresh(), R: fresh() }
  private base: number | null = null
  private stance: Stance = 'none'
  private lastPunch = 0

  push(lm: Pt[], at: number): BoxRead {
    if (lm.length < 29 || !torsoVisible(lm)) return { ok: false, stance: this.stance, punch: null }
    const unit = torsoLength(lm)
    const midX = (lm[LM.lShoulder].x + lm[LM.rShoulder].x) / 2
    const shoulderY = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2
    this.base ??= midX
    const shift = (midX - this.base) / unit

    const up = (w: Pt | undefined) => !!w && seen(w, 0.4) && (w.y - shoulderY) / unit < GUARD_Y && Math.abs(w.x - midX) / unit < GUARD_X
    const guarding = up(lm[LM.lWrist]) && up(lm[LM.rWrist])

    const dodging = this.stance === 'dodgeL' || this.stance === 'dodgeR'
    let next: Stance = 'none'
    if (Math.abs(shift) > (dodging ? DODGE_OFF : DODGE_ON)) next = shift < 0 ? 'dodgeR' : 'dodgeL'
    else if (guarding) next = 'guard'
    this.stance = next
    // titik tengah mengikuti pelan saat pemain diam, supaya bergeser sedikit tidak terhitung terus
    if (next === 'none') this.base += (midX - this.base) * BASE_FOLLOW

    let punch: BoxRead['punch'] = null
    for (const side of ['L', 'R'] as const) {
      const w = lm[side === 'L' ? LM.lWrist : LM.rWrist]
      const s = lm[side === 'L' ? LM.lShoulder : LM.rShoulder]
      const h = this.hands[side]
      if (!seen(w, 0.4)) {
        h.at = 0
        continue
      }
      const x = (w.x - s.x) / unit
      const y = (w.y - s.y) / unit
      const z = (w.z ?? 0) / unit
      const reach = Math.sqrt(x * x + y * y + z * z)
      const dt = h.at ? (at - h.at) / 1000 : 0
      if (dt > 0) {
        const dx = x - h.x
        const dy = y - h.y
        const dz = z - h.z
        const v = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt
        const prev = h.v
        h.v += (v - h.v) * 0.7
        const outward = dz < -0.02 || reach > h.reach + 0.02
        const fired = prev < PUNCH_MIN && h.v >= PUNCH_MIN
        if (fired && outward && next !== 'guard' && at - this.lastPunch > COOLDOWN_MS && !punch) {
          this.lastPunch = at
          punch = { hand: side, power: Math.min(1, (v - PUNCH_MIN) / (PUNCH_FULL - PUNCH_MIN)) }
        }
      }
      h.x = x
      h.y = y
      h.z = z
      h.reach = reach
      h.at = at
    }
    return { ok: true, stance: next, punch }
  }

  reset() {
    this.hands = { L: fresh(), R: fresh() }
    this.base = null
    this.stance = 'none'
  }
}
