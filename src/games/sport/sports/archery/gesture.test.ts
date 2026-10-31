import { describe, expect, it } from 'vitest'
import { LM, type Pt } from '../../input/pose/landmarks'
import { BowGesture } from './gesture'

type Opts = { bow?: [number, number]; pull?: [number, number]; swap?: boolean; unit?: number }

/** Tangan busur & penarik relatif hidung, satuan panjang badan. */
function body({ bow = [1.5, 0.6], pull = [0.2, 0.2], swap = false, unit = 0.2 }: Opts = {}) {
  const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const top = 0.35
  lm[LM.nose] = { x: 0.5, y: top - 0.6 * unit, visibility: 0.9 }
  lm[LM.lShoulder] = { x: 0.58, y: top, visibility: 0.9 }
  lm[LM.rShoulder] = { x: 0.42, y: top, visibility: 0.9 }
  lm[LM.lHip] = { x: 0.55, y: top + unit, visibility: 0.9 }
  lm[LM.rHip] = { x: 0.45, y: top + unit, visibility: 0.9 }
  const at = (p: [number, number]) => ({ x: 0.5 + p[0] * unit, y: lm[LM.nose].y + p[1] * unit, visibility: 0.9 })
  lm[swap ? LM.rWrist : LM.lWrist] = at(swap ? [-bow[0], bow[1]] : bow)
  lm[swap ? LM.lWrist : LM.rWrist] = at(pull)
  return lm
}
const REST = { bow: [0.5, 2] as [number, number], pull: [-0.5, 2] as [number, number] }

function draw(g: BowGesture, opts: Opts = {}) {
  let t = 1000
  for (let i = 0; i < 12; i++, t += 50) g.push(body(opts), t)
  return t
}

describe('gestur panahan', () => {
  it('rentangkan satu tangan & tarik ke dagu = mulai menarik', () => {
    const g = new BowGesture()
    draw(g)
    expect(g.push(body(), 2000).drawing).toBe(true)
  })

  it('tangan di bawah tidak dianggap menarik', () => {
    expect(new BowGesture().push(body(REST), 1000).drawing).toBe(false)
  })

  it('tangan penarik dilepas cepat melepaskan panah', () => {
    const g = new BowGesture()
    const t = draw(g)
    expect(g.push(body({ pull: [1.4, 0.3] }), t + 50).loose).toBe(true)
  })

  it('tangan kanan sebagai busur juga bisa', () => {
    const g = new BowGesture()
    const t = draw(g, { swap: true })
    expect(g.push(body({ swap: true }), t).drawing).toBe(true)
    expect(g.push(body({ swap: true, pull: [-1.4, 0.3] }), t + 50).loose).toBe(true)
  })

  it('terlalu cepat setelah mulai tidak melepas', () => {
    const g = new BowGesture()
    g.push(body(), 1000)
    expect(g.push(body({ pull: [1.4, 0.3] }), 1050).loose).toBe(false)
  })

  it('menurunkan tangan pelan-pelan membatalkan tanpa melepas', () => {
    const g = new BowGesture()
    let t = draw(g)
    let loose = false
    for (let i = 1; i <= 20; i++, t += 100) {
      const r = g.push(body({ bow: [1.5 - i * 0.05, 0.6 + i * 0.1], pull: [0.2 + i * 0.02, 0.2 + i * 0.09] }), t)
      loose ||= r.loose
    }
    expect(loose).toBe(false)
    expect(g.push(body(REST), t).drawing).toBe(false)
  })

  it('geser tangan busur menggeser bidikan', () => {
    const g = new BowGesture()
    const t = draw(g)
    const r = g.push(body({ bow: [1.3, 0.4] }), t)
    expect(r.aim.x).toBeGreaterThan(0)
    expect(r.aim.y).toBeGreaterThan(0)
  })

  it('jarak ke kamera tidak mengubah bidikan', () => {
    const run = (unit: number) => {
      const g = new BowGesture()
      const t = draw(g, { unit, bow: [1.8, 0.6] })
      return g.push(body({ unit, bow: [1.6, 0.6] }), t).aim.x
    }
    expect(run(0.12)).toBeCloseTo(run(0.3), 5)
  })

  it('badan hilang dari bingkai membatalkan tarikan', () => {
    const g = new BowGesture()
    const t = draw(g)
    const lm = body()
    lm[LM.lHip].visibility = 0.1
    expect(g.push(lm, t).ok).toBe(false)
    expect(g.push(body(REST), t + 50).loose).toBe(false)
  })
})
