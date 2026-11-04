import { describe, expect, it } from 'vitest'
import { newBody, stepBody, type Env, type Input } from './climb'
import { SKY_POOL, SKY_SEG, skyOf, weatherAt } from './hazards'
import { buildTerrain } from './terrain'

describe('cuaca berganti', () => {
  const t = buildTerrain('rimba', 2, 11)

  it('sama di semua HP untuk jam yang sama, awal ronde selalu cerah', () => {
    expect(weatherAt(t, 'angin', 10).sky).toBe('cerah')
    for (const s of [100, 333.3, 720]) expect(weatherAt(t, 'angin', s)).toEqual(weatherAt(t, 'angin', s))
  })

  it('jenis cuaca sesuai gunung, dan ekstrem lebih sering berganti', () => {
    const count = (w: 'cerah' | 'ekstrem') => Array.from({ length: 60 }, (_, i) => skyOf(t, w, i + 1)).filter((s) => s !== 'cerah').length
    expect(count('ekstrem')).toBeGreaterThan(count('cerah'))
    for (let i = 1; i < 60; i++) {
      const s = skyOf(t, 'ekstrem', i)
      if (s !== 'cerah') expect(SKY_POOL.rimba).toContain(s)
    }
  })

  it('kekuatan naik-turun halus dalam satu giliran', () => {
    const i = Array.from({ length: 40 }, (_, k) => k + 1).find((k) => skyOf(t, 'ekstrem', k) !== 'cerah')!
    const at = (f: number) => weatherAt(t, 'ekstrem', (i + f) * SKY_SEG).k
    expect(at(0.01)).toBeLessThan(0.1)
    expect(at(0.5)).toBeCloseTo(1, 2)
    expect(at(0.99)).toBeLessThan(0.1)
  })

  it('tebing basah membuat memanjat lebih boros stamina', () => {
    // dinding tinggi (bukan undakan pendek yang langsung bisa dinaiki)
    const i = t.route.findIndex((p, j) => p.climb && j > 0 && p.y - t.route[j - 1].y > 7)
    const foot = t.route[i - 1]
    const top = t.route[i]
    const d = Math.hypot(top.x - foot.x, top.z - foot.z)
    const still: Input = { mx: 0, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false }
    const env = (wet: number): Env => ({ t, ropes: [], heads: [], broken: new Set(), wind: [0, 0], coldK: 1, warm: false, lift: 0, wet })
    const cost = (wet: number) => {
      const b = newBody(foot.x, foot.y, foot.z, 0)
      const e = env(wet)
      for (let k = 0; k < 60; k++) stepBody(b, { ...still, mx: (top.x - foot.x) / d, mz: (top.z - foot.z) / d, grip: true, up: 0.01 }, e, 1 / 60)
      expect(b.mode).toBe('climb')
      b.stamina = 1
      // beberapa langkah saja: jangan sampai bibir tebing (di atas, stamina pulih)
      for (let k = 0; k < 12; k++) stepBody(b, { ...still, grip: true, up: 1 }, e, 1 / 60)
      expect(b.mode).toBe('climb')
      return 1 - b.stamina
    }
    expect(cost(1)).toBeGreaterThan(cost(0) * 1.2)
  })
})
