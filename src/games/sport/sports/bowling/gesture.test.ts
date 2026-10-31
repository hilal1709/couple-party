import { describe, expect, it } from 'vitest'
import { LM, type Pt } from '../../input/pose/landmarks'
import { BowlGesture } from './gesture'

/** Badan berdiri di tengah gambar, panjang badan `unit`; tangan kanan di (wristX, wristY) relatif bahu, satuan badan. */
function body(opts: { unit?: number; midX?: number; right?: [number, number]; left?: [number, number] }) {
  const { unit = 0.2, midX = 0.5, right = [-0.3, 1], left = [0.3, 1] } = opts
  const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const top = 0.35
  lm[LM.lShoulder] = { x: midX + 0.08, y: top, visibility: 0.9 }
  lm[LM.rShoulder] = { x: midX - 0.08, y: top, visibility: 0.9 }
  lm[LM.lHip] = { x: midX + 0.05, y: top + unit, visibility: 0.9 }
  lm[LM.rHip] = { x: midX - 0.05, y: top + unit, visibility: 0.9 }
  lm[LM.rWrist] = { x: midX + right[0] * unit, y: top + right[1] * unit, visibility: 0.9 }
  lm[LM.lWrist] = { x: midX + left[0] * unit, y: top + left[1] * unit, visibility: 0.9 }
  return lm
}

/** Tangan kanan diam di bawah lalu naik sampai bahu dalam `ms`. */
function swing(g: BowlGesture, ms: number, opts: { unit?: number; dx?: number } = {}) {
  const STEP = 50
  let t = 1000
  let out = null
  for (let i = 0; i < 12; i++, t += STEP) g.push(body({ unit: opts.unit }), t)
  const n = Math.round(ms / STEP)
  for (let i = 1; i <= n && !out; i++, t += STEP) {
    const k = i / n
    const r = g.push(body({ unit: opts.unit, right: [-0.3 + (opts.dx ?? 0) * k, 1.1 - 1.3 * k] }), t)
    out = r.swing
  }
  return out
}

describe('gestur bowling', () => {
  it('ayunan cepat melempar bola', () => {
    const s = swing(new BowlGesture(), 300)
    expect(s).not.toBeNull()
    expect(s!.hand).toBe('R')
  })

  it('makin cepat ayunan, makin laju bolanya', () => {
    const fast = swing(new BowlGesture(), 250)!
    const slow = swing(new BowlGesture(), 700)!
    expect(fast.speed).toBeGreaterThan(slow.speed)
  })

  it('jarak ke kamera tidak mengubah kekuatan', () => {
    const near = swing(new BowlGesture(), 300, { unit: 0.3 })!
    const far = swing(new BowlGesture(), 300, { unit: 0.12 })!
    expect(far.speed).toBeCloseTo(near.speed, 1)
  })

  it('tangan naik pelan tidak melempar', () => {
    expect(swing(new BowlGesture(), 2000)).toBeNull()
  })

  it('tangan yang tidak pernah turun dulu tidak melempar', () => {
    const g = new BowlGesture()
    let out = null
    for (let i = 0; i < 20 && !out; i++) out = g.push(body({ right: [-0.3, 0.6 - i * 0.05] }), 1000 + i * 50).swing
    expect(out).toBeNull()
  })

  it('sapuan ke samping membuat arah & putaran', () => {
    // x gambar mengecil = ke kanan layar karena gambar dicermin
    const kanan = swing(new BowlGesture(), 300, { dx: -0.8 })!
    const kiri = swing(new BowlGesture(), 300, { dx: 0.8 })!
    expect(kanan.dir).toBeGreaterThan(0)
    expect(kanan.spin).toBeGreaterThan(0)
    expect(kiri.dir).toBeLessThan(0)
  })

  it('geser badan memindahkan posisi berdiri', () => {
    const g = new BowlGesture()
    let x = 0
    for (let i = 0; i < 30; i++) x = g.push(body({ midX: 0.3 }), 1000 + i * 50).pose!.x
    expect(x).toBeGreaterThan(0.5)
  })

  it('badan hilang dari bingkai tidak menghasilkan apa-apa', () => {
    const lm = body({})
    lm[LM.lHip].visibility = 0.1
    expect(new BowlGesture().push(lm, 1000)).toEqual({ pose: null, swing: null })
  })

  it('tidak melempar dua kali dari satu ayunan', () => {
    const g = new BowlGesture()
    expect(swing(g, 300)).not.toBeNull()
    let extra = null
    for (let i = 0; i < 10; i++) extra ??= g.push(body({ right: [-0.3, -0.2 + i * 0.02] }), 9000 + i * 50).swing
    expect(extra).toBeNull()
  })
})
