import { describe, expect, it } from 'vitest'
import { LM, type Pt } from '../../input/pose/landmarks'
import { KeeperGesture, KickGesture } from './gesture'

function body(opts: { midX?: number; lift?: number; hands?: boolean; feet?: boolean; unit?: number } = {}) {
  const { midX = 0.5, lift = 0, hands = false, feet = true, unit = 0.15 } = opts
  const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const top = 0.3
  lm[LM.lShoulder] = { x: midX + 0.05, y: top, visibility: 0.9 }
  lm[LM.rShoulder] = { x: midX - 0.05, y: top, visibility: 0.9 }
  lm[LM.lHip] = { x: midX + 0.04, y: top + unit, visibility: 0.9 }
  lm[LM.rHip] = { x: midX - 0.04, y: top + unit, visibility: 0.9 }
  const hand = hands ? top - unit : top + unit
  lm[LM.lWrist] = { x: midX + 0.1, y: hand, visibility: 0.9 }
  lm[LM.rWrist] = { x: midX - 0.1, y: hand, visibility: 0.9 }
  const v = feet ? 0.9 : 0.1
  lm[LM.lAnkle] = { x: midX + 0.04, y: top + unit * 3, visibility: v }
  lm[LM.rAnkle] = { x: midX - 0.04, y: top + unit * 3 - lift * unit, visibility: v }
  return lm
}

function kickFrom(g: KickGesture, midX: number, ms: number) {
  let t = 1000
  for (let i = 0; i < 4; i++, t += 50) g.push(body(), t)
  for (let i = 0; i < 4; i++, t += 50) g.push(body({ midX }), t)
  const n = Math.max(1, Math.round(ms / 50))
  for (let i = 1; i <= n; i++, t += 50) {
    const r = g.push(body({ midX, lift: (i / n) * 1.6 }), t)
    if (r.kick) return r.kick
  }
  return null
}

describe('gestur kiper', () => {
  it('condong ke kanan pemain = menyelam ke kanannya', () => {
    const g = new KeeperGesture()
    g.push(body())
    expect(g.push(body({ midX: 0.4 })).dive).toBe('R')
  })

  it('condong ke kiri pemain', () => {
    const g = new KeeperGesture()
    g.push(body())
    expect(g.push(body({ midX: 0.6 })).dive).toBe('L')
  })

  it('dua tangan di atas = jaga tengah', () => {
    const g = new KeeperGesture()
    g.push(body())
    expect(g.push(body({ hands: true })).dive).toBe('C')
  })

  it('berdiri biasa belum memilih', () => {
    const g = new KeeperGesture()
    g.push(body())
    expect(g.push(body({ midX: 0.51 })).dive).toBeNull()
  })
})

describe('gestur tendang', () => {
  it('kaki terangkat cepat = tendangan', () => {
    expect(kickFrom(new KickGesture(), 0.5, 100)).not.toBeNull()
  })

  it('kaki terangkat pelan bukan tendangan', () => {
    expect(kickFrom(new KickGesture(), 0.5, 1500)).toBeNull()
  })

  it('makin cepat kaki, makin kuat', () => {
    const fast = kickFrom(new KickGesture(), 0.5, 50)!
    const slow = kickFrom(new KickGesture(), 0.5, 150)!
    expect(fast.power).toBeGreaterThan(slow.power)
  })

  it('condong badan menentukan arah', () => {
    expect(kickFrom(new KickGesture(), 0.42, 100)!.x).toBeGreaterThan(0)
    expect(kickFrom(new KickGesture(), 0.58, 100)!.x).toBeLessThan(0)
  })

  it('kaki tidak kelihatan: belum siap', () => {
    expect(new KickGesture().push(body({ feet: false }), 1000)).toEqual({ ok: false, kick: null })
  })
})
