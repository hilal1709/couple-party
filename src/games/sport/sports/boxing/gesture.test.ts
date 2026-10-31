import { describe, expect, it } from 'vitest'
import { LM, type Pt } from '../../input/pose/landmarks'
import { BoxGesture } from './gesture'

type Wrist = [number, number, number?]

/** Posisi pergelangan relatif bahunya sendiri, satuan panjang badan: [x, y, z]. */
function body(opts: { unit?: number; midX?: number; right?: Wrist; left?: Wrist } = {}) {
  const { unit = 0.2, midX = 0.5, right = [0.3, 0.1, -0.2], left = [-0.3, 0.1, -0.2] } = opts
  const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const top = 0.35
  lm[LM.lShoulder] = { x: midX + 0.08, y: top, visibility: 0.9 }
  lm[LM.rShoulder] = { x: midX - 0.08, y: top, visibility: 0.9 }
  lm[LM.lHip] = { x: midX + 0.05, y: top + unit, visibility: 0.9 }
  lm[LM.rHip] = { x: midX - 0.05, y: top + unit, visibility: 0.9 }
  const place = (s: Pt, w: Wrist): Pt & { z: number } => ({ x: s.x + w[0] * unit, y: s.y + w[1] * unit, z: (w[2] ?? 0) * unit, visibility: 0.9 })
  lm[LM.rWrist] = place(lm[LM.rShoulder], right)
  lm[LM.lWrist] = place(lm[LM.lShoulder], left)
  return lm
}

const STEP = 50

/** Tangan diam dulu, lalu bergerak dari `a` ke `b` dalam `ms`. Mengembalikan pukulan pertama. */
function move(g: BoxGesture, side: 'right' | 'left', a: Wrist, b: Wrist, ms: number) {
  let t = 1000
  for (let i = 0; i < 6; i++, t += STEP) g.push(body({ [side]: a }), t)
  const n = Math.max(1, Math.round(ms / STEP))
  for (let i = 1; i <= n; i++, t += STEP) {
    const k = i / n
    const w: Wrist = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * k]
    const r = g.push(body({ [side]: w }), t)
    if (r.punch) return r.punch
  }
  return null
}

const LOW: Wrist = [0.2, 0.5, -0.2]
const OUT: Wrist = [0.05, 0.1, -1.4]

describe('gestur tinju', () => {
  it('pukulan ke arah kamera terbaca beserta tangannya', () => {
    expect(move(new BoxGesture(), 'right', LOW, OUT, 150)?.hand).toBe('R')
    expect(move(new BoxGesture(), 'left', [-0.2, 0.5, -0.2], [-0.05, 0.1, -1.4], 150)?.hand).toBe('L')
  })

  it('pukulan cepat lebih kuat daripada yang pelan', () => {
    const fast = move(new BoxGesture(), 'right', LOW, OUT, 100)!
    const slow = move(new BoxGesture(), 'right', LOW, OUT, 250)!
    expect(fast.power).toBeGreaterThan(slow.power)
  })

  it('tangan ditarik balik ke badan bukan pukulan', () => {
    expect(move(new BoxGesture(), 'right', OUT, LOW, 150)).toBeNull()
  })

  it('tangan bergerak pelan bukan pukulan', () => {
    expect(move(new BoxGesture(), 'right', LOW, OUT, 1500)).toBeNull()
  })

  it('tidak melepas dua pukulan dari satu gerakan', () => {
    const g = new BoxGesture()
    let n = 0
    let t = 1000
    for (let i = 0; i < 6; i++, t += STEP) g.push(body({ right: LOW }), t)
    for (let i = 1; i <= 6; i++, t += STEP) {
      const k = i / 6
      const r = g.push(body({ right: [0.2, 0.5, -0.2 - 1.6 * k] }), t)
      if (r.punch) n++
    }
    expect(n).toBe(1)
  })

  it('dua tangan di depan wajah = tangkis', () => {
    const r = new BoxGesture().push(body({ right: [0.3, -0.3], left: [-0.3, -0.3] }), 1000)
    expect(r.stance).toBe('guard')
  })

  it('satu tangan terangkat bukan tangkis', () => {
    const r = new BoxGesture().push(body({ right: [0.3, -0.3] }), 1000)
    expect(r.stance).toBe('none')
  })

  it('geser badan = hindar, arahnya menurut pemain', () => {
    const g = new BoxGesture()
    g.push(body(), 1000)
    expect(g.push(body({ midX: 0.36 }), 1050).stance).toBe('dodgeR')
    const h = new BoxGesture()
    h.push(body(), 1000)
    expect(h.push(body({ midX: 0.64 }), 1050).stance).toBe('dodgeL')
  })

  it('kembali ke tengah melepas hindar', () => {
    const g = new BoxGesture()
    g.push(body(), 1000)
    g.push(body({ midX: 0.36 }), 1050)
    expect(g.push(body(), 1100).stance).toBe('none')
  })

  it('berdiri agak ke samping tidak dihitung hindar', () => {
    const g = new BoxGesture()
    expect(g.push(body({ midX: 0.3 }), 1000).stance).toBe('none')
    expect(g.push(body({ midX: 0.31 }), 1050).stance).toBe('none')
  })

  it('jarak ke kamera tidak mengubah kekuatan', () => {
    const run = (unit: number) => {
      const g = new BoxGesture()
      let t = 1000
      for (let i = 0; i < 6; i++, t += STEP) g.push(body({ unit, right: LOW }), t)
      for (let i = 1; i <= 3; i++, t += STEP) {
        const r = g.push(body({ unit, right: [0.2, 0.5, -0.2 - 0.5 * i] }), t)
        if (r.punch) return r.punch.power
      }
      return 0
    }
    expect(run(0.12)).toBeCloseTo(run(0.3), 1)
  })

  it('badan keluar bingkai tidak memukul', () => {
    const lm = body()
    lm[LM.rHip].visibility = 0.1
    expect(new BoxGesture().push(lm, 1000)).toMatchObject({ ok: false, punch: null })
  })
})
