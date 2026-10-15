import { describe, expect, it } from 'vitest'
import type { Card, Suit } from '../types'
import { beats, bigTwoPenalty, comboOf } from './bigtwo'
import { bjTotal, isBlackjack } from './blackjack'
import { bohong } from './bohong'
import { cangkulan, cangkulPlayable, mustDig } from './cangkulan'
import { dropPairs } from './joker'
import { compareScores, evaluate } from './poker-eval'
import { value41 } from './remi41'
import { seven, sevenPlayable } from './seven'
import type { BohongState, CangkulanState, SevenState } from '../types'

/** "AS" = As Sekop, "10H", "KD", "2C" */
const c = (code: string): Card => {
  const s = code.slice(-1) as Suit
  const r = { A: 1, J: 11, Q: 12, K: 13 }[code.slice(0, -1)] ?? Number(code.slice(0, -1))
  return { id: `${s}${r}`, s, r }
}
const cs = (codes: string) => codes.split(' ').map(c)

describe('poker', () => {
  it('kategori tangan', () => {
    expect(evaluate(cs('AS KS QS JS 10S 2D 3C'))[0]).toBe(8)
    expect(evaluate(cs('9H 9S 9D 9C 2D 3C 5H'))[0]).toBe(7)
    expect(evaluate(cs('9H 9S 9D 2C 2D 3C 5H'))[0]).toBe(6)
    expect(evaluate(cs('2H 7H 9H JH KH 3C 5D'))[0]).toBe(5)
    expect(evaluate(cs('AS 2D 3C 4H 5S 9D KC'))).toEqual([4, 5])
    expect(evaluate(cs('9H 9S 9D 2C 4D 3C KH'))[0]).toBe(3)
    expect(evaluate(cs('9H 9S 4D 4C 2D 3C KH'))).toEqual([2, 9, 4, 13])
    expect(evaluate(cs('9H 9S 4D 6C 2D 3C KH'))[0]).toBe(1)
    expect(evaluate(cs('9H 10S 4D 6C 2D 3C KH'))[0]).toBe(0)
  })

  it('kicker menentukan', () => {
    const a = evaluate(cs('AS AD KC 9H 5S 3D 2C'))
    const b = evaluate(cs('AH AC QC 9D 5H 3S 2D'))
    expect(compareScores(a, b)).toBeGreaterThan(0)
    expect(compareScores(evaluate(cs('AS KD 10C 9H 5S 3D 2C')), evaluate(cs('AH KC 10D 9S 5H 3C 2D')))).toBe(0)
  })
})

describe('capsa banting', () => {
  it('kombinasi sah & tidak sah', () => {
    expect(comboOf(cs('3D'))?.kind).toBe('single')
    expect(comboOf(cs('3D 3S'))?.kind).toBe('pair')
    expect(comboOf(cs('3D 4S'))).toBeNull()
    expect(comboOf(cs('3D 4S 5C 6H 7D'))?.kind).toBe('straight')
    expect(comboOf(cs('JD QS KC AH 2D'))).toBeNull()
    expect(comboOf(cs('3D 3S 3C 9H 9D'))?.kind).toBe('full')
    expect(comboOf(cs('3D 3S 3C 3H 9D'))?.kind).toBe('four')
    expect(comboOf(cs('3S 5S 7S 9S JS'))?.kind).toBe('flush')
  })

  it('2 paling tinggi, sekop di atas wajik', () => {
    expect(beats(comboOf(cs('2D'))!, comboOf(cs('AS'))!)).toBe(true)
    expect(beats(comboOf(cs('5S'))!, comboOf(cs('5D'))!)).toBe(true)
    expect(beats(comboOf(cs('3D 3S 3C 9H 9D'))!, comboOf(cs('3S 5S 7S 9S JS'))!)).toBe(true)
    expect(beats(comboOf(cs('2D 2S'))!, comboOf(cs('AS'))!)).toBe(false)
  })

  it('penalti sisa kartu', () => {
    expect(bigTwoPenalty(3)).toBe(3)
    expect(bigTwoPenalty(10)).toBe(20)
    expect(bigTwoPenalty(13)).toBe(39)
  })
})

describe('remi 41', () => {
  it('jenis terbanyak dikurangi sisanya', () => {
    expect(value41(cs('AS KS QS JS')).value).toBe(41)
    expect(value41(cs('AS KS QS 5H')).value).toBe(26)
    expect(value41(cs('2S 3H 4C 5D')).value).toBe(5 - 9)
  })
})

describe('blackjack', () => {
  it('As fleksibel', () => {
    expect(bjTotal(cs('AS KD'))).toEqual({ total: 21, soft: true })
    expect(bjTotal(cs('AS 9D AH'))).toEqual({ total: 21, soft: true })
    expect(bjTotal(cs('AS 9D 5H'))).toEqual({ total: 15, soft: false })
    expect(isBlackjack(cs('AS 5D 5H'))).toBe(false)
  })
})

describe('si joker', () => {
  it('pasangan dibuang, joker tetap', () => {
    const joker: Card = { id: 'X0', s: 'X', r: 0 }
    expect(dropPairs([...cs('5S 5H 5D 9C'), joker]).map((x) => x.id)).toEqual(['D5', 'C9', 'X0'])
  })
})

describe('cangkulan', () => {
  const base = (): CangkulanState => ({
    kind: 'cangkulan',
    hands: [cs('2H 9S'), cs('KH 3C')],
    deck: cs('4D 5H'),
    trick: [{ by: -1, card: c('7H') }],
    acted: [],
    leadSuit: 'H',
    turn: 0,
    lastTrick: null,
    dug: 0,
  })

  it('wajib ikut jenis, yang tertinggi memimpin', () => {
    let m = base()
    expect(cangkulPlayable(m, 0)).toEqual(['H2'])
    m = cangkulan.reduce(m, { t: 'play', id: 'H2' }, 0, 1)!.m
    const step = cangkulan.reduce(m, { t: 'play', id: 'H13' }, 1, 1)!
    expect(step.event).toEqual({ t: 'trick', winner: 1 })
    expect(step.m.turn).toBe(1)
  })

  it('nyangkul sampai dapat jenisnya', () => {
    let m: CangkulanState = { ...base(), hands: [cs('9S'), cs('KH 3C')] }
    expect(mustDig(m, 0)).toBe(true)
    expect(cangkulan.reduce(m, { t: 'pass' }, 0, 1)).toBeNull()
    m = cangkulan.reduce(m, { t: 'dig' }, 0, 1)!.m
    expect(mustDig(m, 0)).toBe(true)
    m = cangkulan.reduce(m, { t: 'dig' }, 0, 1)!.m
    expect(cangkulPlayable(m, 0)).toEqual(['H5'])
  })
})

describe('bohong', () => {
  const base = (): BohongState => ({ kind: 'bohong', hands: [cs('AS 5H'), cs('KD 3C')], pile: [], claim: 1, turn: 0, last: null, reveal: null })

  it('ketahuan bohong: pembohong ambil tumpukan', () => {
    let m = bohong.reduce(base(), { t: 'play', ids: ['H5'] }, 0, 1)!.m
    const step = bohong.reduce(m, { t: 'call' }, 1, 1)!
    m = step.m
    expect(step.event).toEqual({ t: 'call', by: 1, lied: true })
    expect(m.hands[0].map((x) => x.id).sort()).toEqual(['H5', 'S1'])
  })

  it('jujur sampai habis: penuduh kalah, yang habis menang', () => {
    const m = bohong.reduce({ ...base(), hands: [cs('AS'), cs('KD 3C')] }, { t: 'play', ids: ['S1'] }, 0, 1)!.m
    const step = bohong.reduce(m, { t: 'call' }, 1, 1)!
    expect(step.done?.winners).toEqual([0])
    expect(step.m.hands[1]).toHaveLength(3)
  })
})

describe('seven', () => {
  it('mulai dari 7 hati, lalu bersebelahan', () => {
    let m: SevenState = {
      kind: 'seven',
      hands: [cs('7H 8H 9S'), cs('6H 7S 2D')],
      rows: { S: null, H: null, C: null, D: null },
      closed: [[], []],
      turn: 0,
      last: null,
    }
    expect(sevenPlayable(m, 0)).toEqual(['H7'])
    m = seven.reduce(m, { t: 'play', id: 'H7' }, 0, 1)!.m
    expect(sevenPlayable(m, 1).sort()).toEqual(['H6', 'S7'])
    expect(seven.reduce(m, { t: 'close', id: 'D2' }, 1, 1)).toBeNull()
  })
})
