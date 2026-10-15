import { describe, expect, it } from 'vitest'
import { candidates, lcg } from './dev'
import { defaultOptions, init, reduce } from './engine'
import { MODE_INFO, MODES } from './modes'
import { endCount, sidesFor } from './modes/chain'
import { compareQiu, evaluateQiu } from './modes/qiuqiu'
import type { ChainState, DominoState, Mode, Tile } from './types'

const T = (a: number, b: number): Tile => ({ id: `d${Math.min(a, b)}${Math.max(a, b)}`, a: Math.min(a, b), b: Math.max(a, b) })

function simulate(mode: Mode, players: number, seed: number) {
  const rnd = lcg(seed)
  let s: DominoState = init(seed, { ...defaultOptions(mode, players), rounds: 3, hands: 5 })
  let steps = 0
  while (s.phase !== 'end' && steps < 20000) {
    steps++
    if (s.phase === 'roundEnd') {
      s = reduce(s, { t: 'next' }, 0)
      continue
    }
    let moved = false
    for (const seat of Array.from({ length: players }, (_, i) => i).sort(() => rnd() - 0.5)) {
      for (const a of candidates(s.m, seat, rnd).sort(() => rnd() - 0.5)) {
        const next = reduce(s, a, seat)
        if (next !== s) {
          s = next
          moved = true
          break
        }
      }
      if (moved) break
    }
    if (!moved) throw new Error(`${mode} macet di langkah ${steps}: ${JSON.stringify(s.m).slice(0, 400)}`)
    if (s.m.kind === 'chain') expect(s.m.hands.flat().length + s.m.bone.length + s.m.line.length).toBe(28)
  }
  return s
}

describe('simulasi acak: tiap mode selesai tanpa macet', () => {
  for (const mode of MODES) {
    const { min, max } = MODE_INFO[mode]
    for (const n of [...new Set([min, Math.ceil((min + max) / 2), max])]) {
      it(`${mode} · ${n} pemain`, () => {
        for (const seed of [1, 2, 3, 4]) {
          const s = simulate(mode, n, seed * 31 + n)
          expect(s.phase).toBe('end')
          expect(s.champions?.length).toBeGreaterThan(0)
          if (mode === 'qiuqiu') {
            expect(s.scores.reduce((a, b) => a + b, 0)).toBe(n * s.opts.chips)
            expect(s.scores.every((v) => v >= 0)).toBe(true)
          }
        }
      })
    }
  }
})

const chain = (line: [number, number][], extra: Partial<ChainState> = {}): ChainState => ({
  kind: 'chain',
  mode: 'lima',
  hands: [[], []],
  bone: [],
  line: line.map(([l, r]) => ({ tile: T(l, r), l, r, by: 0 })),
  turn: 0,
  passes: 0,
  first: null,
  drew: 0,
  pts: [0, 0],
  last: null,
  blocked: false,
  ...extra,
})

describe('rantai', () => {
  it('pembuka wajib memasang balak tertinggi', () => {
    const s = init(7, defaultOptions('gaple', 4))
    const m = s.m as ChainState
    expect(m.first).toBe('d66')
    expect(m.hands[m.turn].some((t) => t.id === 'd66')).toBe(true)
    const other = m.hands[m.turn].find((t) => t.id !== 'd66')!
    expect(reduce(s, { t: 'play', id: other.id, side: 'R' }, m.turn)).toBe(s)
    const after = reduce(s, { t: 'play', id: 'd66', side: 'R' }, m.turn)
    expect((after.m as ChainState).line).toHaveLength(1)
  })

  it('kartu dipasang di sisi yang cocok dan diputar', () => {
    const m = chain([[3, 5], [5, 2]])
    expect(sidesFor(m, T(1, 3))).toEqual(['L'])
    expect(sidesFor(m, T(2, 6))).toEqual(['R'])
    expect(sidesFor(m, T(2, 3))).toEqual(['L', 'R'])
    expect(sidesFor(m, T(4, 4))).toEqual([])
  })

  it('Domino Lima: balak di ujung dihitung dua sisi', () => {
    expect(endCount(chain([[5, 5]]).line)).toBe(10)
    expect(endCount(chain([[5, 5], [5, 0]]).line)).toBe(10)
    expect(endCount(chain([[6, 4], [4, 4]]).line)).toBe(14)
    expect(endCount(chain([[1, 4]]).line)).toBe(5)
  })

  it('Gaple buntu: mata paling sedikit menang', () => {
    let s = init(3, defaultOptions('gaple', 2))
    const m = s.m as ChainState
    // paksa meja buntu: dua pemain tidak punya kartu yang nyambung
    s = { ...s, m: { ...m, first: null, line: [{ tile: T(6, 6), l: 6, r: 6, by: 0 }], hands: [[T(0, 1)], [T(2, 3), T(4, 5)]], turn: 0 } }
    s = reduce(s, { t: 'pass' }, 0)
    s = reduce(s, { t: 'pass' }, 1)
    expect(s.phase).toBe('roundEnd')
    expect(s.roundWinners).toEqual([0])
    expect(s.deltas).toEqual([14, 0])
  })

  it('Cangkul: wajib nyangkul sebelum pass', () => {
    let s = init(3, defaultOptions('cangkul', 2))
    const m = s.m as ChainState
    s = { ...s, m: { ...m, first: null, line: [{ tile: T(6, 6), l: 6, r: 6, by: 0 }], hands: [[T(0, 1)], [T(2, 3)]], bone: [T(1, 2), T(3, 6)], turn: 0 } }
    expect(reduce(s, { t: 'pass' }, 0)).toBe(s)
    s = reduce(s, { t: 'draw' }, 0)
    s = reduce(s, { t: 'draw' }, 0)
    expect((s.m as ChainState).hands[0]).toHaveLength(3)
    expect(reduce(s, { t: 'draw' }, 0)).toBe(s)
    s = reduce(s, { t: 'play', id: 'd36', side: 'R' }, 0)
    expect((s.m as ChainState).turn).toBe(1)
  })
})

describe('Qiu Qiu', () => {
  it('pecahan terbaik & kategori', () => {
    const q = evaluateQiu([T(4, 5), T(3, 6), T(0, 0), T(4, 6)])
    expect(q.values).toEqual([9, 9])
    expect(q.cat).toBe('qiuqiu')
    expect(evaluateQiu([T(0, 0), T(1, 1), T(2, 2), T(6, 6)]).cat).toBe('dewa')
    expect(evaluateQiu([T(0, 1), T(0, 2), T(1, 2), T(0, 3)]).cat).toBe('kecil')
    expect(evaluateQiu([T(5, 6), T(6, 6), T(4, 6), T(5, 5)]).cat).toBe('besar')
  })

  it('urutan: dewa > kecil > besar > qiu qiu > biasa', () => {
    const dewa = evaluateQiu([T(0, 0), T(1, 1), T(2, 2), T(6, 6)]).score
    const kecil = evaluateQiu([T(0, 1), T(0, 2), T(1, 2), T(0, 3)]).score
    const besar = evaluateQiu([T(5, 6), T(6, 6), T(4, 6), T(5, 5)]).score
    const qq = evaluateQiu([T(4, 5), T(3, 6), T(0, 0), T(4, 6)]).score
    const biasa = evaluateQiu([T(1, 3), T(2, 2), T(0, 5), T(1, 6)]).score
    expect(compareQiu(dewa, kecil)).toBeGreaterThan(0)
    expect(compareQiu(kecil, besar)).toBeGreaterThan(0)
    expect(compareQiu(besar, qq)).toBeGreaterThan(0)
    expect(compareQiu(qq, biasa)).toBeGreaterThan(0)
  })

  it('semua bayar ante dan dapat 3 kartu', () => {
    const s = init(5, { ...defaultOptions('qiuqiu', 4), ante: 50 })
    expect(s.m.kind).toBe('qiuqiu')
    if (s.m.kind !== 'qiuqiu') return
    expect(s.m.hands.every((h) => h.length === 3)).toBe(true)
    expect(s.m.stack).toEqual([950, 950, 950, 950])
  })

  it('semua check → kartu keempat, lalu showdown', () => {
    let s = init(9, defaultOptions('qiuqiu', 3))
    for (let i = 0; i < 3; i++) s = reduce(s, { t: 'check' }, (s.m as { turn: number }).turn)
    expect(s.event?.t).toBe('street')
    if (s.m.kind === 'qiuqiu') expect(s.m.hands.every((h) => h.length === 4)).toBe(true)
    for (let i = 0; i < 3; i++) s = reduce(s, { t: 'check' }, (s.m as { turn: number }).turn)
    expect(s.phase).toBe('roundEnd')
    expect(s.scores.reduce((a, b) => a + b, 0)).toBe(3000)
  })
})
