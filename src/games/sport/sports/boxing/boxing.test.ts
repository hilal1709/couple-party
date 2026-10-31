import { describe, expect, it } from 'vitest'
import { init, reduce } from '../../engine'
import type { BoxingMatch, SportAction, SportState } from '../../types'
import { defend, MAX_HP } from './engine'

const start = (rounds: 1 | 3 | 5 = 3): SportState => {
  const s = init(1, { sport: 'tinju', players: 2, rounds })
  return reduce(s, { type: 'next', id: box(s).phaseId }, 0)
}
const box = (s: SportState) => s.m as BoxingMatch
const send = (s: SportState, a: SportAction, by: number) => reduce(s, a, by)

/** kursi `by` memukul sampai kena */
function land(s: SportState, by: number, power = 1, outcome: 'hit' | 'block' | 'dodge' = 'hit', hand: 'L' | 'R' = 'R') {
  const a = send(s, { type: 'punch', hand, power }, by)
  return send(a, { type: 'resolve', id: box(a).attacks.at(-1)!.id, outcome }, 1 - by)
}

describe('tangkis & hindar', () => {
  it('tangkis menahan tangan mana pun', () => {
    expect(defend('L', 'guard')).toBe('block')
    expect(defend('R', 'guard')).toBe('block')
  })

  it('hindar harus menjauhi tangan yang datang', () => {
    expect(defend('R', 'dodgeR')).toBe('dodge')
    expect(defend('R', 'dodgeL')).toBe('hit')
    expect(defend('L', 'dodgeL')).toBe('dodge')
  })

  it('diam berarti kena', () => {
    expect(defend('L', 'none')).toBe('hit')
  })
})

describe('reducer tinju', () => {
  it('mulai dari perkenalan, pukulan ditolak sebelum bel', () => {
    const s = init(1, { sport: 'tinju', players: 2 })
    expect(box(s).phase).toBe('intro')
    expect(send(s, { type: 'punch', hand: 'L', power: 1 }, 0)).toBe(s)
  })

  it('kena mengurangi darah sesuai tenaga', () => {
    const lemah = box(land(start(), 0, 0)).hp[1]
    const kuat = box(land(start(), 0, 1)).hp[1]
    expect(lemah).toBeLessThan(MAX_HP)
    expect(kuat).toBeLessThan(lemah)
  })

  it('tangkisan mengurangi sedikit, hindaran tidak sama sekali', () => {
    expect(box(land(start(), 0, 1, 'block')).hp[1]).toBe(MAX_HP - 2)
    expect(box(land(start(), 0, 1, 'dodge')).hp[1]).toBe(MAX_HP)
  })

  it('satu pukulan di udara per pemain', () => {
    const a = send(start(), { type: 'punch', hand: 'L', power: 1 }, 0)
    expect(send(a, { type: 'punch', hand: 'R', power: 1 }, 0)).toBe(a)
  })

  it('kedua pemain boleh saling pukul bersamaan', () => {
    const a = send(start(), { type: 'punch', hand: 'L', power: 1 }, 0)
    const b = send(a, { type: 'punch', hand: 'R', power: 1 }, 1)
    expect(box(b).attacks).toHaveLength(2)
  })

  it('pemukul tidak bisa menilai pukulannya sendiri', () => {
    const a = send(start(), { type: 'punch', hand: 'L', power: 1 }, 0)
    expect(send(a, { type: 'resolve', id: box(a).attacks[0].id, outcome: 'hit' }, 0)).toBe(a)
  })

  it('jawaban yang terlambat setelah kedaluwarsa diabaikan', () => {
    const a = send(start(), { type: 'punch', hand: 'L', power: 1 }, 0)
    const id = box(a).attacks[0].id
    const b = send(a, { type: 'expire', id }, 0)
    expect(box(b).hp[1]).toBeLessThan(MAX_HP)
    expect(send(b, { type: 'resolve', id, outcome: 'dodge' }, 1)).toBe(b)
  })

  it('menangkis dulu baru tidak bisa memukul', () => {
    const a = send(start(), { type: 'stance', stance: 'guard' }, 0)
    expect(send(a, { type: 'punch', hand: 'L', power: 1 }, 0)).toBe(a)
  })

  it('berhasil menghindar membuat pukulan balasan lebih sakit', () => {
    const biasa = box(land(start(), 1, 1)).hp[0]
    let s = land(start(), 0, 1, 'dodge')
    expect(box(s).counter[1]).toBe(true)
    s = land(s, 1, 1)
    expect(box(s).hp[0]).toBeLessThan(biasa)
    expect(box(s).last!.counter).toBe(true)
    expect(box(s).counter[1]).toBe(false)
  })

  it('KO menutup ronde, ronde berikutnya darah penuh', () => {
    let s = start()
    while (box(s).phase === 'fight') s = land(s, 0)
    expect(box(s).phase).toBe('roundEnd')
    expect(box(s).wins).toEqual([1, 0])
    expect(box(s).last!.ko).toBe(true)
    s = send(s, { type: 'next', id: box(s).phaseId }, 0)
    expect(box(s).round).toBe(2)
    expect(box(s).hp).toEqual([MAX_HP, MAX_HP])
  })

  it('bel: darah lebih banyak menang ronde', () => {
    const s = land(start(), 0)
    const a = send(s, { type: 'bell', id: box(s).phaseId }, 0)
    expect(box(a).wins).toEqual([1, 0])
  })

  it('bel seri tidak memberi kemenangan', () => {
    const s = start()
    expect(box(send(s, { type: 'bell', id: box(s).phaseId }, 0)).wins).toEqual([0, 0])
  })

  it('menang mayoritas ronde langsung tamat', () => {
    let s = start(3)
    for (let r = 0; r < 2; r++) {
      while (box(s).phase === 'fight') s = land(s, 1)
      if (box(s).phase === 'roundEnd') {
        s = send(s, { type: 'next', id: box(s).phaseId }, 0)
        s = send(s, { type: 'next', id: box(s).phaseId }, 0)
      }
    }
    expect(box(s).phase).toBe('end')
    expect(box(s).winners).toEqual([1])
  })

  it('tenaga ngawur dari jaringan dipangkas', () => {
    const a = send(start(), { type: 'punch', hand: 'L', power: 1e9 }, 0)
    expect(box(a).attacks[0].power).toBe(1)
    const b = send(start(), { type: 'punch', hand: 'L', power: Number.NaN }, 0)
    expect(box(b).attacks[0].power).toBe(0)
  })
})
