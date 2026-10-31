import { LM, seen, torsoLength, torsoVisible, type Pt } from '../../input/pose/landmarks'
import type { ShotKind } from '../../types'

const SWING_MIN = 3.5
const SWING_FULL = 9
const COOLDOWN_MS = 450
/** tangan setinggi ini di atas bahu sebelum turun = smash */
const OVERHEAD = 0.45

type Hand = { x: number; y: number; at: number; v: number; high: number }
const fresh = (): Hand => ({ x: 0, y: 0, at: 0, v: 0, high: 0 })

export type SwingRead = { ok: boolean; swing: { shot: ShotKind; power: number } | null }

/** Ayunan = pergelangan melesat. Dominan ke atas = lob, dari atas kepala turun = smash, selain itu pukulan biasa. */
export class SwingGesture {
  private hands = { L: fresh(), R: fresh() }
  private last = 0

  push(lm: Pt[], at: number): SwingRead {
    if (lm.length < 29 || !torsoVisible(lm)) return { ok: false, swing: null }
    const unit = torsoLength(lm)
    const top = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2
    const mid = (lm[LM.lShoulder].x + lm[LM.rShoulder].x) / 2
    let swing: SwingRead['swing'] = null
    for (const side of ['L', 'R'] as const) {
      const w = lm[side === 'L' ? LM.lWrist : LM.rWrist]
      const h = this.hands[side]
      if (!seen(w, 0.4)) {
        h.at = 0
        continue
      }
      const x = (w.x - mid) / unit
      const y = (w.y - top) / unit
      const dt = h.at ? (at - h.at) / 1000 : 0
      if (dt > 0) {
        const dx = x - h.x
        const dy = y - h.y
        const v = Math.sqrt(dx * dx + dy * dy) / dt
        const prev = h.v
        h.v += (v - h.v) * 0.7
        if (prev < SWING_MIN && h.v >= SWING_MIN && at - this.last > COOLDOWN_MS && !swing) {
          this.last = at
          const up = dy < 0 && -dy > Math.abs(dx) * 1.5
          const shot: ShotKind = h.high < -OVERHEAD && dy > 0 ? 'smash' : up ? 'lob' : 'drive'
          swing = { shot, power: Math.min(1, (v - SWING_MIN) / (SWING_FULL - SWING_MIN)) }
        }
      }
      // ingat titik tertinggi sebentar, supaya ayunan dari atas kepala terbaca
      h.high = Math.min(y, h.high + 0.05)
      h.x = x
      h.y = y
      h.at = at
    }
    return { ok: true, swing }
  }

  reset() {
    this.hands = { L: fresh(), R: fresh() }
  }
}
