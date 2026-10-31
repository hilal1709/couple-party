import { LM, seen, torsoLength, torsoVisible, type Pt } from '../../input/pose/landmarks'
import type { ArrowAim } from './sim'

/** satuan panjang badan */
const CHIN_NEAR = 0.75
const BOW_FAR = 0.8
const BOW_LEVEL = 0.75
const READY_MS = 350
const RELEASE_SPEED = 2.6
const AIM_GAIN = 0.9

export type BowRead = {
  ok: boolean
  drawing: boolean
  aim: ArrowAim
  /** tangan penarik baru saja dilepas */
  loose: boolean
}

type Hold = { since: number; baseX: number; baseY: number; lastX: number; lastY: number; lastAt: number }

/**
 * Satu tangan terentang setinggi bahu (busur), tangan lain ditarik ke dagu. Bidikan dibaca dari
 * geseran tangan busur sejak mulai menarik, supaya tidak perlu berdiri tepat di tengah. Tangan
 * penarik yang menjauh cepat dari dagu = panah lepas. Boleh tangan mana saja.
 */
export class BowGesture {
  private hold: Hold | null = null
  private aim: ArrowAim = { x: 0, y: 0 }

  push(lm: Pt[], at: number): BowRead {
    const none = { ok: false, drawing: false, aim: this.aim, loose: false }
    if (lm.length < 29 || !torsoVisible(lm)) {
      this.hold = null
      return none
    }
    const unit = torsoLength(lm)
    const nose = lm[LM.nose]
    const l = lm[LM.lWrist]
    const r = lm[LM.rWrist]
    const shoulderY = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2
    const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) / unit
    const shoulderOf = (side: 'l' | 'r') => lm[side === 'l' ? LM.lShoulder : LM.rShoulder]
    const posed = (pull: Pt | undefined, bow: Pt | undefined, side: 'l' | 'r') =>
      !!pull && !!bow && seen(pull, 0.4) && seen(bow, 0.4) && dist(pull, nose) < CHIN_NEAR && dist(bow, shoulderOf(side)) > BOW_FAR && Math.abs(bow.y - shoulderY) / unit < BOW_LEVEL
    const leftBow = posed(r, l, 'l')
    const rightBow = posed(l, r, 'r')

    const h = this.hold
    if (h) {
      // tangan yang sedang menarik ditentukan saat mulai; lihat dua-duanya supaya tetap terbaca
      const pull = leftBow || (!rightBow && dist(r, nose) < dist(l, nose)) ? r : l
      const bow = pull === r ? l : r
      const dt = (at - h.lastAt) / 1000
      const speed = dt > 0 ? Math.hypot(pull.x - h.lastX, pull.y - h.lastY) / unit / dt : 0
      h.lastX = pull.x
      h.lastY = pull.y
      h.lastAt = at
      // gambar belum dicermin: tangan busur ke kanan pemain = x gambar mengecil
      this.aim = { x: ((h.baseX - bow.x) / unit) * AIM_GAIN, y: ((h.baseY - bow.y) / unit) * AIM_GAIN }
      const away = dist(pull, nose) > CHIN_NEAR
      if (away && speed > RELEASE_SPEED && at - h.since > READY_MS) {
        this.hold = null
        return { ok: true, drawing: false, aim: this.aim, loose: true }
      }
      if (away && !leftBow && !rightBow) {
        // diturunkan pelan: batal tanpa melepas
        this.hold = null
        return { ok: true, drawing: false, aim: this.aim, loose: false }
      }
      return { ok: true, drawing: true, aim: this.aim, loose: false }
    }
    if (leftBow || rightBow) {
      const bow = leftBow ? l : r
      const pull = leftBow ? r : l
      this.hold = { since: at, baseX: bow.x, baseY: bow.y, lastX: pull.x, lastY: pull.y, lastAt: at }
      this.aim = { x: 0, y: 0 }
      return { ok: true, drawing: true, aim: this.aim, loose: false }
    }
    return { ok: true, drawing: false, aim: this.aim, loose: false }
  }

  reset() {
    this.hold = null
    this.aim = { x: 0, y: 0 }
  }
}
