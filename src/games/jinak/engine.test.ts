import { describe, expect, it } from 'vitest'
import { clockText, init, reduce, solutionOf } from './engine'
import { MAZE_MARKERS, MAZE_SIZE, SYMBOL_COLUMNS, WORDS, mazeCells, passwordMatches, symbolOrder, wireAnswer } from './modules'
import type { JinakAction, JinakState } from './types'

const started = (seed: number, level: 'santai' | 'normal' | 'panik' = 'normal') => reduce(init(seed, { players: 2, level }), { type: 'start' }, 0)

function play(s: JinakState, actions: JinakAction[]) {
  return actions.reduce((st, a) => reduce(st, a, st.defuser), s)
}

describe('Jinak Bom', () => {
  it('setiap bom dari 300 seed bisa dijinakkan dengan kunci jawabannya', () => {
    for (let seed = 1; seed <= 300; seed++) {
      let s = started(seed, seed % 3 === 0 ? 'panik' : 'normal')
      s.modules.forEach((_, i) => {
        s = play(s, solutionOf(s, i))
      })
      expect(s.phase, `seed ${seed}`).toBe('defused')
      expect(s.strikes).toBe(0)
    }
  })

  it('kabel salah menambah salah, tiga kali salah meledak', () => {
    let s = started(42)
    const mod = s.modules.findIndex((m) => m.kind === 'kabel')
    const m = s.modules[mod]
    if (m.kind !== 'kabel') throw new Error('tidak ada kabel')
    const right = wireAnswer(m.wires, s.info)
    const wrong = m.wires.map((_, i) => i).filter((i) => i !== right)
    s = reduce(s, { type: 'cut', mod, wire: wrong[0], left: 200000 }, s.defuser)
    expect(s.strikes).toBe(1)
    expect(s.phase).toBe('live')
    s = reduce(s, { type: 'cut', mod, wire: wrong[0], left: 200000 }, s.defuser)
    expect(s.strikes).toBe(1) // kabel yang sudah putus tidak bisa dipotong lagi
    s = reduce(s, { type: 'cut', mod, wire: wrong[1], left: 200000 }, s.defuser)
    const other = s.modules.findIndex((x) => x.kind === 'gembok' || x.kind === 'sandi')
    s = reduce(s, other >= 0 && s.modules[other].kind === 'gembok' ? { type: 'unlock', mod: other, code: 'xxx', left: 1 } : { type: 'submit', mod: other, word: 'zzzzz', left: 1 }, s.defuser)
    expect(s.phase).toBe('boom')
    expect(s.history.at(-1)?.ok).toBe(false)
  })

  it('hanya penjinak yang bisa menyentuh bom', () => {
    const s = started(7)
    const [a] = solutionOf(s, 0)
    expect(reduce(s, a, 1)).toBe(s)
  })

  it('level panik: salah mempercepat jam', () => {
    let s = started(5, 'panik')
    const mod = s.modules.findIndex((m) => m.kind === 'gembok')
    s = reduce(s, { type: 'unlock', mod, code: 'abc', left: 120000 }, s.defuser)
    expect(s.rate).toBeCloseTo(1.25)
    expect(s.timeLeft).toBe(120000)
  })

  it('waktu habis hanya dari host dan untuk jam yang sama', () => {
    const s = started(9)
    expect(reduce(s, { type: 'timeout', clockId: s.clockId }, 1)).toBe(s)
    expect(reduce(s, { type: 'timeout', clockId: s.clockId - 1 }, 0)).toBe(s)
    expect(reduce(s, { type: 'timeout', clockId: s.clockId }, 0).phase).toBe('boom')
  })

  it('ronde berikutnya: peran penjinak bergantian', () => {
    let s = started(3)
    s = reduce(s, { type: 'timeout', clockId: s.clockId }, 0)
    s = reduce(s, { type: 'next' }, 1)
    expect(s.defuser).toBe(1)
    expect(s.phase).toBe('intro')
    expect(s.round).toBe(2)
  })

  it('data buku panduan konsisten', () => {
    expect(WORDS.every((w) => w.length === 5)).toBe(true)
    expect(new Set(MAZE_MARKERS.map((p) => JSON.stringify(p))).size).toBe(MAZE_MARKERS.length)
    for (let i = 0; i < MAZE_MARKERS.length; i++) expect(mazeCells(i).length).toBe(MAZE_SIZE)
    expect(symbolOrder(SYMBOL_COLUMNS[0].slice(0, 4))).toEqual(SYMBOL_COLUMNS[0].slice(0, 4))
    expect(passwordMatches(['BAKSO'].flatMap((w) => [...w].map((c) => [c])))).toEqual(['BAKSO'])
    expect(clockText(61000)).toBe('1:01')
    expect(clockText(0)).toBe('0:00')
  })
})
