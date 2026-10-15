import { describe, expect, it } from 'vitest'
import { defaultOptions, init, reduce } from './engine'
import { MODE_INFO, MODES } from './modes'
import { candidates, lcg } from './dev'
import type { Mode, ModeState, RemiState } from './types'

function cardCount(m: ModeState): number {
  const hands = 'hands' in m ? m.hands.flat().length : 0
  switch (m.kind) {
    case 'remi41':
      return hands + m.deck.length + m.discard.length
    case 'bohong':
      return hands + m.pile.length
    case 'seven':
      return hands + m.closed.flat().length + Object.values(m.rows).reduce((a, r) => a + (r ? r.hi - r.lo + 1 : 0), 0)
    default:
      return -1
  }
}

function simulate(mode: Mode, players: number, seed: number) {
  const rnd = lcg(seed)
  let s: RemiState = init(seed, { ...defaultOptions(mode, players), rounds: 3, hands: 5 })
  let steps = 0
  let rounds = 0
  while (s.phase !== 'end' && steps < 30000) {
    steps++
    if (s.phase === 'roundEnd') {
      s = reduce(s, { t: 'next' }, Math.floor(rnd() * players))
      rounds++
      continue
    }
    const order = Array.from({ length: players }, (_, i) => i).sort(() => rnd() - 0.5)
    let moved = false
    for (const seat of order) {
      const cands = candidates(s.m, seat, rnd).sort(() => rnd() - 0.5)
      for (const a of cands) {
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
  }
  return { s, steps, rounds }
}

describe('simulasi acak: tiap mode selesai tanpa macet', () => {
  for (const mode of MODES) {
    const { min, max } = MODE_INFO[mode]
    for (const n of [...new Set([min, Math.ceil((min + max) / 2), max])]) {
      it(`${mode} · ${n} pemain`, () => {
        for (const seed of [1, 2, 3]) {
          const { s } = simulate(mode, n, seed * 97 + n)
          expect(s.phase).toBe('end')
          expect(s.champions?.length).toBeGreaterThan(0)
          if (MODE_INFO[mode].chips) {
            // chip tidak tercipta atau hilang di poker
            if (mode === 'poker') expect(s.scores.reduce((a, b) => a + b, 0)).toBe(n * s.opts.chips)
            expect(s.scores.every((v) => v >= 0)).toBe(true)
          }
        }
      })
    }
  }
})

describe('kartu tidak hilang selama ronde', () => {
  for (const mode of ['remi41', 'bohong', 'seven'] as Mode[]) {
    it(mode, () => {
      const rnd = lcg(5)
      let s = init(11, defaultOptions(mode, 3))
      const total = cardCount(s.m)
      for (let i = 0; i < 400 && s.phase === 'play'; i++) {
        for (let seat = 0; seat < 3; seat++) {
          const a = candidates(s.m, seat, rnd).find((x) => reduce(s, x, seat) !== s)
          if (a) {
            s = reduce(s, a, seat)
            break
          }
        }
        expect(cardCount(s.m)).toBe(total)
      }
    })
  }
})

describe('match', () => {
  it('jumlah pemain dijepit ke batas mode', () => {
    expect(init(1, defaultOptions('bigtwo', 7)).scores).toHaveLength(4)
    expect(init(1, defaultOptions('poker', 8)).scores).toHaveLength(8)
  })

  it('mode chip mulai dengan modal', () => {
    expect(init(1, { ...defaultOptions('blackjack', 3), chips: 2000 }).scores).toEqual([2000, 2000, 2000])
    expect(init(1, defaultOptions('seven', 3)).scores).toEqual([0, 0, 0])
  })

  it('again hanya setelah game selesai', () => {
    const s = init(1, defaultOptions('seven', 3))
    expect(reduce(s, { t: 'again' }, 0)).toBe(s)
    expect(reduce(s, { t: 'next' }, 0)).toBe(s)
  })
})
