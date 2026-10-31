import { describe, expect, it } from 'vitest'
import { lcg } from '../../../domino/dev'
import { sportBot } from '../../bot'
import { init, reduce } from '../../engine'
import type { Dive, PenaltyMatch, SportState } from '../../types'
import { judge } from './engine'

const start = () => init(1, { sport: 'penalti', players: 2 })
const pen = (s: SportState) => s.m as PenaltyMatch

function shot(s: SportState, x: number, dir: Dive, y = 0.3, power = 0.8) {
  const m = pen(s)
  const a = reduce(s, { type: 'kick', id: m.shotId, x, y, power }, m.taker)
  const b = reduce(a, { type: 'dive', id: m.shotId, dir }, 1 - m.taker)
  return reduce(b, { type: 'next', id: m.shotId }, 0)
}
const GOAL = 0.6
const SAVE = -0.6

/** tendangan yang gol bagi yang menendang, kiper menebak kiri */
const play = (s: SportState, scores: boolean) => shot(s, scores ? GOAL : SAVE, 'L')

describe('penilaian', () => {
  it('tebakan tepat menepis', () => {
    expect(judge({ x: -0.6, y: 0.3, power: 0.8 }, 'L')).toBe('save')
    expect(judge({ x: 0, y: 0.3, power: 0.8 }, 'C')).toBe('save')
  })

  it('tebakan salah jadi gol', () => {
    expect(judge({ x: 0.6, y: 0.3, power: 0.8 }, 'L')).toBe('goal')
  })

  it('di luar gawang meleset', () => {
    expect(judge({ x: 1.1, y: 0.3, power: 1 }, 'R')).toBe('wide')
    expect(judge({ x: 0, y: 1.1, power: 1 }, 'C')).toBe('over')
  })

  it('sudut atas tak terjangkau walau tebakannya benar', () => {
    expect(judge({ x: 0.85, y: 0.85, power: 0.8 }, 'R')).toBe('goal')
  })

  it('tendangan lemah lebih mudah ditepis', () => {
    expect(judge({ x: 0.55, y: 0.3, power: 0.2 }, 'C')).toBe('save')
    expect(judge({ x: 0.55, y: 0.3, power: 0.8 }, 'C')).toBe('goal')
  })
})

describe('reducer penalti', () => {
  it('hasil baru keluar setelah dua-duanya memilih, urutannya bebas', () => {
    const s = start()
    const a = reduce(s, { type: 'kick', id: 1, x: 0.6, y: 0.3, power: 1 }, 0)
    expect(pen(a).result).toBeNull()
    const b = reduce(s, { type: 'dive', id: 1, dir: 'L' }, 1)
    expect(pen(b).result).toBeNull()
    expect(pen(reduce(a, { type: 'dive', id: 1, dir: 'L' }, 1)).result?.why).toBe('goal')
    expect(pen(reduce(b, { type: 'kick', id: 1, x: 0.6, y: 0.3, power: 1 }, 0)).result?.why).toBe('goal')
  })

  it('peran dijaga: kiper tidak bisa menendang, penendang tidak bisa menyelam', () => {
    const s = start()
    expect(reduce(s, { type: 'kick', id: 1, x: 0, y: 0, power: 1 }, 1)).toBe(s)
    expect(reduce(s, { type: 'dive', id: 1, dir: 'L' }, 0)).toBe(s)
  })

  it('pilihan tidak bisa diubah', () => {
    const a = reduce(start(), { type: 'dive', id: 1, dir: 'L' }, 1)
    expect(reduce(a, { type: 'dive', id: 1, dir: 'R' }, 1)).toBe(a)
  })

  it('peran bertukar tiap tendangan', () => {
    const s = play(start(), true)
    expect(pen(s).taker).toBe(1)
    expect(pen(s).goals).toEqual([1, 0])
  })

  it('waktu habis: yang belum memilih dapat pilihan terlemah', () => {
    const a = reduce(start(), { type: 'dive', id: 1, dir: 'C' }, 1)
    const b = reduce(a, { type: 'auto', id: 1 }, 0)
    expect(pen(b).result?.why).toBe('save')
  })

  it('tamat lebih awal kalau sudah tak terkejar', () => {
    let s = start()
    // kursi 0 selalu gol, kursi 1 selalu gagal
    while (pen(s).phase !== 'end') s = play(s, pen(s).taker === 0)
    expect(pen(s).winners).toEqual([0])
    expect(pen(s).goals[0]).toBeLessThan(5)
  })

  it('seri setelah lima ronde lanjut satu-satu', () => {
    let s = start()
    for (let i = 0; i < 10; i++) s = play(s, true)
    expect(pen(s).phase).toBe('set')
    s = play(s, true)
    s = play(s, false)
    expect(pen(s).phase).toBe('end')
    expect(pen(s).winners).toEqual([0])
  })

  it('seri terus tetap berakhir', () => {
    let s = start()
    for (let i = 0; i < 20; i++) s = play(s, false)
    expect(pen(s).phase).toBe('end')
    expect(pen(s).winners).toEqual([0, 1])
  })
})

describe('bot penalti', () => {
  it('kiper bot tidak mengintip tendangan yang sudah dipilih', () => {
    const s = start()
    const a = reduce(s, { type: 'kick', id: 1, x: 0.6, y: 0.3, power: 1 }, 0)
    const ask = (st: SportState) => sportBot({ state: st, seat: 1, level: 3, rnd: lcg(7), mem: {}, now: 0 })?.action
    expect(ask(a)).toEqual(ask(s))
  })
})
