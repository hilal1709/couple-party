import { describe, expect, it } from 'vitest'
import { hermite, syncClock } from './interp'

describe('syncClock', () => {
  it('paket telat tidak menggeser jam, paket lebih cepat langsung dipakai', () => {
    const off = syncClock(null, 500)
    expect(off).toBe(500)
    expect(syncClock(off, 590)).toBe(502)
    expect(syncClock(off, 450)).toBe(450)
  })

  it('pulih pelan kalau jaringan memang melambat', () => {
    let off = syncClock(null, 500)
    for (let i = 0; i < 25; i++) off = syncClock(off, 550)
    expect(off).toBe(550)
  })
})

describe('hermite', () => {
  it('melewati kedua ujung', () => {
    expect(hermite(2, 5, 9, -3, 0, 0.1)).toBeCloseTo(2)
    expect(hermite(2, 5, 9, -3, 1, 0.1)).toBeCloseTo(9)
  })

  it('gerak lurus tetap merata', () => {
    expect(hermite(0, 40, 4, 40, 0.25, 0.1)).toBeCloseTo(1)
    expect(hermite(0, 40, 4, 40, 0.5, 0.1)).toBeCloseTo(2)
  })
})
