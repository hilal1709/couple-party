import { describe, expect, it } from 'vitest'
import { init, reduce } from '../../engine'
import type { ArcheryMatch, SportState } from '../../types'
import { ARROWS } from './engine'
import { arrowHit, ringScore, TARGET_R, windDrift } from './sim'

const start = (n = 2, ends: 3 | 5 = 3) => init(1, { sport: 'panahan', players: n, ends })
const arc = (s: SportState) => s.m as ArcheryMatch
function shoot(s: SportState, x = 0, y = 0, draw = 1) {
  const m = arc(s)
  const a = reduce(s, { type: 'shoot', id: m.shotId, aim: { x: x - windDrift(m.wind, draw), y }, draw }, m.turn)
  return reduce(a, { type: 'next', id: arc(a).shot!.id }, 0)
}

describe('sim panahan', () => {
  it('tengah bernilai 10, makin ke pinggir makin kecil', () => {
    expect(ringScore({ x: 0, y: 0 })).toBe(10)
    expect(ringScore({ x: TARGET_R * 0.55, y: 0 })).toBe(5)
    expect(ringScore({ x: TARGET_R * 0.99, y: 0 })).toBe(1)
  })

  it('di luar sasaran bernilai 0', () => {
    expect(ringScore({ x: TARGET_R + 0.01, y: 0 })).toBe(0)
  })

  it('angin menggeser panah sesuai arahnya', () => {
    expect(arrowHit({ x: 0, y: 0 }, 1, 3).x).toBeGreaterThan(0)
    expect(arrowHit({ x: 0, y: 0 }, 1, -3).x).toBeLessThan(0)
  })

  it('tarikan kurang membuat panah jatuh dan lebih terbawa angin', () => {
    expect(arrowHit({ x: 0, y: 0 }, 0.5, 0).y).toBeLessThan(0)
    expect(arrowHit({ x: 0, y: 0 }, 1, 0).y).toBe(0)
    expect(windDrift(3, 0.5)).toBeGreaterThan(windDrift(3, 1))
  })
})

describe('reducer panahan', () => {
  it('menolak kursi lain dan id basi', () => {
    const s = start()
    const m = arc(s)
    expect(reduce(s, { type: 'shoot', id: m.shotId, aim: { x: 0, y: 0 }, draw: 1 }, 1)).toBe(s)
    expect(reduce(s, { type: 'shoot', id: 99, aim: { x: 0, y: 0 }, draw: 1 }, 0)).toBe(s)
  })

  it('tiap pemain memanah tiga kali lalu ganti', () => {
    let s = start()
    for (let i = 0; i < ARROWS; i++) {
      expect(arc(s).turn).toBe(0)
      s = shoot(s)
    }
    expect(arc(s).turn).toBe(1)
    expect(arc(s).scores[0][0]).toEqual([10, 10, 10])
  })

  it('angin berganti tiap babak dan sama untuk semua pemain dalam babak itu', () => {
    let s = start(2, 5)
    const winds = new Set<number>()
    const w0 = arc(s).wind
    for (let i = 0; i < ARROWS * 2; i++) {
      expect(arc(s).wind).toBe(w0)
      s = shoot(s)
    }
    for (let e = 0; e < 3; e++) {
      winds.add(arc(s).wind)
      for (let i = 0; i < ARROWS * 2; i++) s = shoot(s)
    }
    expect(winds.size).toBeGreaterThan(1)
  })

  it('tamat dengan pemenang skor tertinggi', () => {
    let s = start(2, 3)
    while (arc(s).phase !== 'end') s = shoot(s, arc(s).turn === 1 ? 0 : 0.3)
    expect(arc(s).winners).toEqual([1])
  })

  it('pemain menghilang: panah otomatis meleset', () => {
    const s = start()
    const a = reduce(s, { type: 'auto', id: arc(s).shotId }, 0)
    expect(arc(a).shot!.score).toBe(0)
  })

  it('angka ngawur dipangkas', () => {
    const s = start()
    const a = reduce(s, { type: 'shoot', id: arc(s).shotId, aim: { x: 1e9, y: Number.NaN }, draw: 7 }, 0)
    expect(arc(a).shot!.aim).toEqual({ x: 1.4, y: 0 })
    expect(arc(a).shot!.draw).toBe(1)
  })
})
