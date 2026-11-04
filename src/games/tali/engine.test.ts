import { describe, expect, it } from 'vitest'
import { init, reduce, scoreLevel } from './engine'
import { LEVELS } from './levels'

describe('Tali Jodoh: reducer', () => {
  it('finis hanya kalau dua-duanya sampai gerbang', () => {
    let s = init(1)
    s = reduce(s, { type: 'goal', on: true, ms: 60000 }, 0)
    expect(s.phase).toBe('play')
    s = reduce(s, { type: 'goal', on: true, ms: 61000 }, 1)
    expect(s.phase).toBe('clear')
    expect(s.results[0]?.ms).toBe(61000)
  })

  it('jatuh memindahkan semua ke checkpoint dan melepas tombol', () => {
    let s = init(1, { start: 0 })
    s = reduce(s, { type: 'press', i: 0, on: true }, 1)
    s = reduce(s, { type: 'checkpoint', i: 1 }, 0)
    const spawn = s.spawnId
    s = reduce(s, { type: 'fall' }, 0)
    expect(s.spawnId).toBe(spawn + 1)
    expect(s.press[0]).toBe(0)
    expect(s.checkpoint).toBe(1)
    expect(s.falls).toBe(1)
  })

  it('lanjut ke level berikutnya setelah dua-duanya siap', () => {
    let s = init(1)
    s = reduce(reduce(s, { type: 'goal', on: true, ms: 1 }, 0), { type: 'goal', on: true, ms: 1 }, 1)
    s = reduce(s, { type: 'next' }, 0)
    expect(s.phase).toBe('clear')
    s = reduce(s, { type: 'next' }, 1)
    expect(s.level).toBe(1)
    expect(s.phase).toBe('play')
  })

  it('kursi di luar dua pemain diabaikan', () => {
    const s = init(1)
    expect(reduce(s, { type: 'fall' }, 2)).toBe(s)
  })

  it('bintang: selesai, semua permen, dan di bawah target waktu', () => {
    const def = LEVELS[0]
    expect(scoreLevel(0, def.par * 1000 + 1, 0, 0).stars).toBe(1)
    expect(scoreLevel(0, 1000, 3, def.candy.length).stars).toBe(3)
  })
})

describe('Tali Jodoh: mode bot', () => {
  it('sendirian di room menyalakan bot', () => {
    expect(init(1, { players: 1 }).opts.bot).toBe(true)
    expect(init(1, { players: 2 }).opts.bot).toBe(false)
  })

  it('host boleh beraksi atas nama bot, tamu tidak', () => {
    let s = init(1, { players: 1 })
    s = reduce(s, { type: 'goal', on: true, ms: 1, as: 1 }, 0)
    expect(s.goal).toBe(0b10)
    const off = init(1, { players: 2 })
    expect(reduce(off, { type: 'goal', on: true, ms: 1, as: 1 }, 0).goal).toBe(0b01)
  })
})
