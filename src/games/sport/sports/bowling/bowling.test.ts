import { describe, expect, it } from 'vitest'
import { init, reduce } from '../../engine'
import type { BowlingMatch, SportState } from '../../types'
import { frameDone, resetPins, rollMarks, runningScores, totalScore } from './score'
import { HEAD_Z, RollSim, simulateRoll, startX } from './sim'

const all = Array<boolean>(10).fill(true)
const bowl = (s: SportState) => s.m as BowlingMatch
const aimAt = (tx: number, speed = 8) => ({ x: 0, dir: (tx - startX(0)) / HEAD_Z, speed, spin: 0 })

describe('skor', () => {
  const strikes = (n: number) => Array.from({ length: n - 1 }, () => [10])

  it('permainan sempurna 10 frame = 300', () => {
    expect(totalScore([...strikes(10), [10, 10, 10]], 10)).toBe(300)
  })

  it('semua spare 5 + bonus 5 = 150', () => {
    const f = Array.from({ length: 9 }, () => [5, 5])
    expect(totalScore([...f, [5, 5, 5]], 10)).toBe(150)
  })

  it('lemparan terbuka dijumlah biasa', () => {
    expect(totalScore(Array.from({ length: 5 }, () => [3, 4]), 5)).toBe(35)
  })

  it('bonus strike menunggu dua lemparan berikutnya', () => {
    expect(runningScores([[10], [3]], 5)).toEqual([null, null, null, null, null])
    expect(runningScores([[10], [3, 4]], 5)).toEqual([17, 24, null, null, null])
  })

  it('frame terakhir memberi lemparan bonus', () => {
    expect(frameDone([10], true)).toBe(false)
    expect(frameDone([3, 4], true)).toBe(true)
    expect(frameDone([6, 4], true)).toBe(false)
    expect(frameDone([6, 4, 2], true)).toBe(true)
    expect(resetPins([10], true)).toBe(true)
    expect(resetPins([10, 4], true)).toBe(false)
    expect(resetPins([6, 4], true)).toBe(true)
  })

  it('tanda kotak skor', () => {
    expect(rollMarks([10], false)).toEqual(['X'])
    expect(rollMarks([7, 3], false)).toEqual(['7', '/'])
    expect(rollMarks([0, 4], false)).toEqual(['-', '4'])
    expect(rollMarks([10, 10, 4], true)).toEqual(['X', 'X', '4'])
    expect(rollMarks([6, 4, 10], true)).toEqual(['6', '/', 'X'])
  })
})

describe('fisika', () => {
  it('hasil sama persis tiap kali dijalankan', () => {
    const th = { x: 0.31, dir: -0.0123, speed: 7.77, spin: 0.2 }
    expect(simulateRoll(all, th)).toEqual(simulateRoll(all, th))
  })

  it('tembakan kantong merobohkan semua pin', () => {
    expect(simulateRoll(all, aimAt(0.045)).knocked).toHaveLength(10)
  })

  it('bola yang keluar lintasan masuk parit tanpa kena pin', () => {
    const r = simulateRoll(all, { x: 0.9, dir: 0.03, speed: 8, spin: 0 })
    expect(r.gutter).toBe(true)
    expect(r.knocked).toHaveLength(0)
  })

  it('putaran membelokkan bola', () => {
    const atPins = (spin: number) => {
      const s = new RollSim(all, { x: 0.7, dir: 0, speed: 8, spin })
      while (s.ball.z < HEAD_Z - 0.6) s.step()
      return s.ball.x
    }
    expect(atPins(-1)).toBeLessThan(atPins(0) - 0.25)
  })

  it('pin yang sudah jatuh tidak ikut dihitung lagi', () => {
    const sisa = all.map((_, i) => i === 6)
    const r = simulateRoll(sisa, aimAt(-0.4575))
    expect(r.knocked).toEqual([6])
  })
})

describe('reducer', () => {
  const start = (n = 2, frames: 3 | 5 | 10 = 3) => init(1, { players: n, frames })
  const lob = (s: SportState, th: Parameters<typeof simulateRoll>[1]) => {
    const seat = bowl(s).turn
    const a = reduce(s, { type: 'throw', id: bowl(s).rollId, th }, seat)
    return reduce(a, { type: 'next', id: bowl(a).roll!.id }, 0)
  }
  const gutter = { x: 0.95, dir: 0.04, speed: 8, spin: 0 }

  it('menolak lemparan dari kursi lain dan id basi', () => {
    const s = start()
    expect(reduce(s, { type: 'throw', id: bowl(s).rollId, th: gutter }, 1)).toBe(s)
    expect(reduce(s, { type: 'throw', id: 99, th: gutter }, 0)).toBe(s)
  })

  it('strike langsung pindah pemain dengan pin baru', () => {
    const s = lob(start(), aimAt(0.045))
    expect(bowl(s).rolls[0][0]).toEqual([10])
    expect(bowl(s).turn).toBe(1)
    expect(bowl(s).standing.every(Boolean)).toBe(true)
  })

  it('pin sisa tetap sampai lemparan kedua', () => {
    const s = lob(start(), aimAt(0.3))
    const down = bowl(s).rolls[0][0][0]
    expect(down).toBeGreaterThan(0)
    expect(down).toBeLessThan(10)
    expect(bowl(s).turn).toBe(0)
    expect(bowl(s).standing.filter(Boolean)).toHaveLength(10 - down)
  })

  it('game tamat dan pemenang bisa seri', () => {
    let s = start(2, 3)
    for (let i = 0; i < 12 && bowl(s).phase !== 'end'; i++) s = lob(s, gutter)
    expect(bowl(s).phase).toBe('end')
    expect(bowl(s).winners).toEqual([0, 1])
  })

  it('main lagi mengulang skor dan mempertahankan karakter', () => {
    let s = start(2, 3)
    expect(reduce(s, { type: 'again' }, 0)).toBe(s)
    for (let i = 0; i < 12 && bowl(s).phase !== 'end'; i++) s = lob(s, gutter)
    const a = reduce(s, { type: 'again' }, 0)
    expect(bowl(a).phase).toBe('aim')
    expect(bowl(a).rolls).toEqual([[], []])
    expect(a.looks).toBe(s.looks)
  })

  it('pemain putus diganti lemparan otomatis', () => {
    const s = start()
    const a = reduce(s, { type: 'auto', id: bowl(s).rollId }, 0)
    expect(bowl(a).phase).toBe('roll')
  })

  it('angka ngawur dari jaringan dipangkas', () => {
    const s = start()
    const a = reduce(s, { type: 'throw', id: bowl(s).rollId, th: { x: 99, dir: Number.NaN, speed: 1e9, spin: -5 } }, 0)
    expect(bowl(a).roll!.th).toEqual({ x: 1, dir: 0, speed: 11, spin: -1 })
  })

  it('penampilan dari HP lain dibersihkan', () => {
    const s = start()
    const a = reduce(s, { type: 'look', look: { skin: 99, hair: -1, style: 1, shirt: 1.5, pants: 0, acc: 2 } }, 1)
    expect(a.looks[1]).toEqual({ skin: 0, hair: 0, style: 1, shirt: 0, pants: 0, acc: 2 })
  })
})
