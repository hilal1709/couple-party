import { describe, expect, it } from 'vitest'
import { init, racerOf, reduce, standings } from './engine'
import type { KartAction, KartState } from './types'

const play = (s: KartState, steps: [KartAction, number][]) => steps.reduce((st, [a, by]) => reduce(st, a, by), s)

function raced(players = 2, laps: 1 | 3 | 5 = 1) {
  let s = init(1, { players, course: 'daun', laps, bots: true, level: 'normal' })
  for (let p = 0; p < players; p++) s = reduce(s, { type: 'ready' }, p)
  return s
}

describe('pilih karakter', () => {
  it('8 kart dengan bot, pemain mulai dengan karakter warna kursinya', () => {
    const s = init(1, { players: 3 })
    expect(s.racers).toHaveLength(8)
    expect(s.racers.slice(0, 3).map((r) => r.seat)).toEqual([0, 1, 2])
    expect(s.racers[3].seat).toBeNull()
  })
  it('tanpa bot: hanya pemain', () => {
    expect(init(1, { players: 2, bots: false }).racers).toHaveLength(2)
  })
  it('karakter pemain tidak boleh kembar', () => {
    const s = init(1, { players: 2 })
    expect(reduce(s, { type: 'pick', char: 0, body: 'bebek' }, 1)).toBe(s)
    const t = reduce(s, { type: 'pick', char: 5, body: 'bebek' }, 1)
    expect(t.racers[1]).toMatchObject({ char: 5, body: 'bebek' })
  })
  it('semua siap → balapan mulai, bot dapat karakter yang tersisa', () => {
    const s = raced(2)
    expect(s.phase).toBe('race')
    const chars = s.racers.map((r) => r.char)
    expect(new Set(chars).size).toBe(8)
  })
})

describe('balapan', () => {
  it('kotak item memberi item; pakai menghabiskannya dan memunculkan benda', () => {
    let s = raced(2)
    s = reduce(s, { type: 'box', racer: 0, rank: 0 }, 0)
    expect(s.items[0]).not.toBeNull()
    s = { ...s, items: s.items.map((v, i) => (i === 0 ? 'pisang' : v)), uses: s.uses.map((v, i) => (i === 0 ? 1 : v)) }
    s = reduce(s, { type: 'use', racer: 0, x: 1, z: 2, s: 0, lane: 0, back: true }, 0)
    expect(s.items[0]).toBeNull()
    expect(s.entities).toEqual([{ id: 1, kind: 'pisang', by: 0, x: 1, z: 2 }])
    s = reduce(s, { type: 'hit', racer: 1, id: 1 }, 1)
    expect(s.entities).toEqual([])
    expect(s.events.at(-1)).toMatchObject({ kind: 'hit', racer: 1, by: 0, item: 'pisang' })
  })
  it('pemain tidak bisa mengendalikan kart orang lain; host boleh untuk bot', () => {
    const s = raced(2)
    expect(reduce(s, { type: 'box', racer: 0, rank: 0 }, 1)).toBe(s)
    expect(reduce(s, { type: 'box', racer: 5, rank: 0 }, 1)).toBe(s)
    expect(reduce(s, { type: 'box', racer: 5, rank: 0 }, 0).items[5]).not.toBeNull()
  })
  it('finish: urutan, poin, dan host menutup sisa bot', () => {
    let s = raced(2)
    s = play(s, [
      [{ type: 'finish', racer: 1, time: 90000 }, 1],
      [{ type: 'finish', racer: 4, time: 91000 }, 0],
      [{ type: 'finish', racer: 0, time: 95000 }, 0],
    ])
    expect(s.phase).toBe('race')
    s = reduce(s, { type: 'end', rest: [7, 6, 5, 3, 2] }, 0)
    expect(s.phase).toBe('results')
    expect(s.order).toEqual([1, 4, 0, 7, 6, 5, 3, 2])
    expect(s.points[1]).toBe(10)
    expect(s.points[0]).toBe(6)
    expect(standings(s)[0]).toBe(1)
  })
  it('Grand Prix: 4 balapan lalu selesai', () => {
    let s = raced(1)
    for (let r = 0; r < 4; r++) {
      expect(s.phase).toBe('race')
      expect(s.race).toBe(r)
      s = reduce(s, { type: 'finish', racer: racerOf(s, 0), time: 1000 }, 0)
      s = reduce(s, { type: 'end', rest: [] }, 0)
      s = reduce(s, { type: 'next' }, 0)
      if (r < 3) s = reduce(s, { type: 'next' }, 0)
    }
    expect(s.phase).toBe('end')
    expect(s.points[0]).toBe(40)
    s = reduce(s, { type: 'again' }, 0)
    expect(s.phase).toBe('pick')
  })
  it('lap tidak bisa mundur atau lewat batas', () => {
    const s = raced(1, 3)
    const a = reduce(s, { type: 'lap', racer: 0, lap: 1 }, 0)
    expect(a.laps[0]).toBe(1)
    expect(reduce(a, { type: 'lap', racer: 0, lap: 1 }, 0)).toBe(a)
    expect(reduce(a, { type: 'lap', racer: 0, lap: 3 }, 0)).toBe(a)
  })
})
