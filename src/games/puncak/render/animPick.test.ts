import { describe, expect, it } from 'vitest'
import { AnimPicker, type AnimIn } from './animPick'

const base: AnimIn = { mode: 'ground', y: 0, moving: false, speed: 0, turnRate: 0, vy: 0, sideways: false, straining: false, lunge: false, tired: false, hurt: false, end: false }
const dt = 1 / 30

function feed(p: AnimPicker, a: Partial<AnimIn>, secs = dt) {
  let out = p.pick({ ...base, ...a }, dt)
  for (let t = dt; t < secs - 1e-9; t += dt) out = p.pick({ ...base, ...a }, dt)
  return out
}

describe('AnimPicker', () => {
  it('jalan dan lari: laju klip mengikuti laju badan', () => {
    const p = new AnimPicker()
    expect(feed(p, { moving: true, speed: 2.4 })).toMatchObject({ clip: 'walk', speed: 1 })
    expect(feed(p, { moving: true, speed: 5.2 })).toMatchObject({ clip: 'run', speed: 1 })
    expect(feed(p, { moving: true, speed: 2.4, hurt: true }).clip).toBe('walk_hurt')
  })

  it('jatuh tinggi lalu mendarat memutar klip mendarat sekali, lalu kembali diam', () => {
    const p = new AnimPicker()
    feed(p, { mode: 'air', y: 5, vy: -3 })
    feed(p, { mode: 'air', y: 2, vy: -6 })
    const land = p.pick({ ...base, y: 0 }, dt)
    expect(land).toMatchObject({ clip: 'land', once: true })
    expect(p.fresh).toBe(true)
    expect(feed(p, {}, 1).clip).toBe('idle')
  })

  it('lompatan kecil tidak memicu mendarat', () => {
    const p = new AnimPicker()
    feed(p, { mode: 'air', y: 1.5 })
    expect(p.pick({ ...base, y: 0 }, dt).clip).toBe('idle')
  })

  it('naik tepian: mode mantle dari sim memutar klip naik tepian sekali', () => {
    const p = new AnimPicker()
    feed(p, { mode: 'climb', y: 10, moving: true })
    expect(p.pick({ ...base, mode: 'mantle', y: 10.2 }, dt)).toMatchObject({ clip: 'pull_up', once: true })
    // melepas di kaki tebing tidak memutar klip naik tepian
    const bottom = new AnimPicker()
    feed(bottom, { mode: 'climb', y: 1, moving: true })
    expect(bottom.pick({ ...base, y: 0.9 }, dt).clip).toBe('idle')
  })

  it('bangun setelah pingsan, dan klip sekali jalan putus kalau jatuh lagi', () => {
    const p = new AnimPicker()
    feed(p, { mode: 'down' })
    expect(p.pick({ ...base }, dt).clip).toBe('recover')
    expect(p.pick({ ...base, mode: 'air', vy: -2 }, dt).clip).toBe('fall')
  })

  it('berbalik di tempat memakai klip belok', () => {
    const p = new AnimPicker()
    // satu frame putaran (mis. sisa mendarat) belum dianggap belok
    expect(feed(p, { turnRate: 6, speed: 0.2 }).clip).toBe('idle')
    expect(feed(p, { turnRate: 6, speed: 0.2 }, 0.3).clip).toBe('turn')
  })

  it('memanjat: meraih saat terhalang, menggantung saat lelah, tergelincir dari kejadian lokal', () => {
    const p = new AnimPicker()
    expect(feed(p, { mode: 'climb', y: 3, straining: true }).clip).toBe('reach')
    expect(feed(p, { mode: 'climb', y: 3, tired: true }).clip).toBe('hang')
    p.trigger('slip')
    expect(p.pick({ ...base, mode: 'climb', y: 3 }, dt)).toMatchObject({ clip: 'slip', once: true })
    expect(p.fresh).toBe(true)
  })
})
