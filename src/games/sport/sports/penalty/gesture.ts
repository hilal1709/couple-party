import { LM, seen, torsoLength, torsoVisible, type Pt } from '../../input/pose/landmarks'
import type { Dive, KickAim } from '../../types'

const LEAN = 0.42
const KICK_MIN = 3.6
const KICK_FULL = 9
const ANKLE_MIN = 0.3

const midX = (lm: Pt[]) => (lm[LM.lShoulder].x + lm[LM.rShoulder].x) / 2

/** Kiper: condong ke samping = menyelam ke arah itu, dua tangan di atas kepala = tetap di tengah. */
export class KeeperGesture {
  private base: number | null = null

  push(lm: Pt[]): { ok: boolean; dive: Dive | null } {
    if (lm.length < 29 || !torsoVisible(lm)) return { ok: false, dive: null }
    const unit = torsoLength(lm)
    const x = midX(lm)
    this.base ??= x
    const shift = (x - this.base) / unit
    // gambar belum dicermin: pemain ke kanannya sendiri = x gambar mengecil
    if (shift < -LEAN) return { ok: true, dive: 'R' }
    if (shift > LEAN) return { ok: true, dive: 'L' }
    const top = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2
    const up = (w: Pt | undefined) => !!w && seen(w, 0.4) && (w.y - top) / unit < -0.6
    if (up(lm[LM.lWrist]) && up(lm[LM.rWrist])) return { ok: true, dive: 'C' }
    this.base += (x - this.base) * 0.02
    return { ok: true, dive: null }
  }

  reset() {
    this.base = null
  }
}

/**
 * Penendang: pergelangan kaki yang terangkat cepat = tendangan. Arah dari condong badan saat
 * menendang, tinggi bola dari kecepatan kaki. Butuh seluruh badan terlihat.
 */
export class KickGesture {
  private base: number | null = null
  private feet = { L: { y: 0, at: 0, v: 0 }, R: { y: 0, at: 0, v: 0 } }

  push(lm: Pt[], at: number): { ok: boolean; kick: KickAim | null } {
    const seenFeet = lm.length >= 29 && seen(lm[LM.lAnkle], ANKLE_MIN) && seen(lm[LM.rAnkle], ANKLE_MIN)
    if (!seenFeet || !torsoVisible(lm)) return { ok: false, kick: null }
    const unit = torsoLength(lm)
    const x = midX(lm)
    this.base ??= x
    const shift = (x - this.base) / unit
    let kick: KickAim | null = null
    for (const side of ['L', 'R'] as const) {
      const a = lm[side === 'L' ? LM.lAnkle : LM.rAnkle]
      const f = this.feet[side]
      const y = a.y / unit
      const dt = f.at ? (at - f.at) / 1000 : 0
      if (dt > 0) {
        const prev = f.v
        f.v += ((f.y - y) / dt - f.v) * 0.7
        if (prev < KICK_MIN && f.v >= KICK_MIN && !kick) {
          const power = Math.min(1, (f.v - KICK_MIN) / (KICK_FULL - KICK_MIN))
          kick = { x: Math.max(-1.2, Math.min(1.2, -shift * 1.2)), y: 0.2 + power * 0.75, power: 0.35 + power * 0.65 }
        }
      }
      f.y = y
      f.at = at
    }
    if (Math.abs(shift) < 0.2) this.base += (x - this.base) * 0.02
    return { ok: true, kick }
  }

  reset() {
    this.base = null
    this.feet = { L: { y: 0, at: 0, v: 0 }, R: { y: 0, at: 0, v: 0 } }
  }
}
