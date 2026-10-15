import { describe, expect, it } from 'vitest'
import { armsFor, finishOf, isSafe, specialAt, startOf, trackIndex, trackLen } from './board'
import { lcg, randomStep } from './dev'
import { defaultOptions, init, legalMoves, reduce } from './engine'
import type { LudoOptions, LudoState } from './types'

const base = (n = 2, o: Partial<LudoOptions> = {}) => init(1, { ...defaultOptions(n), specials: false, ...o })

/** Cari seed rng yang menghasilkan angka dadu tertentu untuk lemparan berikutnya. */
function withDie(s: LudoState, v: number): LudoState {
  for (let seed = 0; seed < 10000; seed++) {
    const next = reduce({ ...s, rng: seed }, { type: 'roll' }, s.turn)
    if (next.event?.dice === v) return { ...s, rng: seed }
  }
  throw new Error('seed tidak ketemu')
}
const roll = (s: LudoState, v: number) => reduce(withDie(s, v), { type: 'roll' }, s.turn)
const place = (s: LudoState, seat: number, piece: number, p: number): LudoState => ({
  ...s,
  prog: s.prog.map((ps, i) => (i === seat ? ps.map((q, j) => (j === piece ? p : q)) : ps)),
})

describe('papan', () => {
  it('4 lengan = 52 petak, 51 petak tempuh + 5 jalur rumah', () => {
    expect(trackLen(4)).toBe(51)
    expect(finishOf(4)).toBe(56)
    expect(trackIndex(4, 0, 0)).toBe(startOf(0))
    expect(trackIndex(4, 1, 50)).toBe(19)
  })

  it('start & bintang aman, petak jahil tidak pernah di petak aman', () => {
    for (let t = 0; t < 13 * 8; t++) if (specialAt(t)) expect(isSafe(t)).toBe(false)
    expect(isSafe(startOf(2))).toBe(true)
  })

  it('kursi tersebar rata & tidak bentrok', () => {
    for (const arms of [4, 6, 8] as const)
      for (let n = 2; n <= arms; n++) expect(new Set(armsFor(n, arms)).size).toBe(n)
    expect(armsFor(2, 4)).toEqual([0, 2])
  })
})

describe('aturan', () => {
  it('perlu angka 6 untuk keluar kandang, lalu dapat lempar lagi', () => {
    let s = roll(base(), 3)
    expect(s.turn).toBe(1)
    expect(s.event?.log.some((n) => n.t === 'noMove')).toBe(true)
    s = roll({ ...s, turn: 0 }, 6)
    expect(s.prog[0][0]).toBe(0)
    expect(s.turn).toBe(0)
    expect(s.phase).toBe('roll')
  })

  it('mode keluar bebas: angka berapa pun bisa keluar', () => {
    const s = roll(base(2, { freeOut: true }), 4)
    expect(s.prog[0][0]).toBe(3)
    expect(s.turn).toBe(1)
  })

  it('banyak pilihan = tunggu pemain memilih bidak', () => {
    let s = place(base(), 0, 0, 5)
    s = roll(s, 6)
    expect(s.phase).toBe('move')
    expect(legalMoves(s)).toHaveLength(2)
    s = reduce(s, { type: 'move', owner: 0, piece: 0 }, 0)
    expect(s.prog[0][0]).toBe(11)
  })

  it('menangkap lawan memulangkannya & dapat bonus lempar', () => {
    let s = base()
    // bidak kursi 1 di petak keliling startOf(0)+4 (bukan petak aman)
    const t = startOf(0) + 4
    const p1 = (t - startOf(2) + 52) % 52
    s = place(place(s, 1, 0, p1), 0, 0, 1)
    s = roll(s, 3)
    expect(s.prog[0][0]).toBe(4)
    expect(s.prog[1][0]).toBe(-1)
    expect(s.turn).toBe(0)
  })

  it('di petak aman tidak bisa ditangkap', () => {
    let s = base()
    const t = startOf(1) + 8 - 13 + 13 // bintang: start lengan 1 = petak aman
    const p1 = (t - startOf(2) + 52) % 52
    s = place(place(s, 1, 0, p1), 0, 0, t - startOf(0) - 2)
    s = roll(s, 2)
    expect(s.prog[1][0]).toBe(p1)
  })

  it('harus pas untuk finis', () => {
    let s = place(base(2, { pieces: 2 }), 0, 0, 54)
    s = place(s, 0, 1, 54)
    s = roll(s, 3)
    expect(s.prog[0]).toEqual([54, 54])
    s = roll({ ...s, turn: 0 }, 2)
    expect(s.phase).toBe('move')
    s = reduce(s, { type: 'move', owner: 0, piece: 0 }, 0)
    expect(s.prog[0][0]).toBe(56)
    expect(s.turn).toBe(0)
  })

  it('semua bidak finis = menang', () => {
    let s = place(place(base(2, { pieces: 2 }), 0, 0, 56), 0, 1, 55)
    s = roll(s, 1)
    expect(s.winner).toBe(0)
    expect(s.phase).toBe('end')
  })

  it('tiga kali 6 beruntun hangus', () => {
    let s = place(base(), 0, 0, 0)
    s = { ...s, sixes: 2 }
    s = roll(s, 6)
    expect(s.turn).toBe(1)
    expect(s.event?.log.some((n) => n.t === 'tripleSix')).toBe(true)
  })

  it('mode tim: rekan tidak saling tangkap & yang sudah finis menjalankan bidak rekan', () => {
    let s = base(4, { teams: true, pieces: 2 })
    expect(s.team).toEqual([0, 1, 0, 1])
    s = place(place(s, 0, 0, 56), 0, 1, 56)
    s = place(s, 2, 0, 10)
    s = roll(s, 3)
    expect(s.prog[2][0]).toBe(13)
    expect(s.winner).toBe(null)
  })
})

describe('petak jahil', () => {
  it('roket maju 3, kulit pisang mundur 3', () => {
    let s = base(2, { specials: true })
    // start kursi 0 = indeks 8 lengan 0; indeks 10 lengan 0 = roket
    s = roll(place(s, 0, 0, 0), 2)
    expect(s.prog[0][0]).toBe(5)
    expect(s.event?.log.some((n) => n.t === 'special' && n.fx === 'boost')).toBe(true)
  })
})

describe('simulasi bot', () => {
  it.each([
    [2, 4],
    [4, 4],
    [6, 6],
    [8, 8],
  ] as const)('%i pemain di papan %i lengan selalu selesai', (n, arms) => {
    for (const teams of [false, true]) {
      for (const specials of [false, true]) {
        let s = init(9, { ...defaultOptions(n), arms, teams, specials })
        const rnd = lcg(n * 3 + Number(teams))
        let steps = 0
        while (s.phase !== 'end' && steps++ < 20000) s = randomStep(s, rnd) ?? s
        expect(s.phase).toBe('end')
        for (const ps of s.prog) for (const p of ps) expect(p).toBeLessThanOrEqual(finishOf(arms))
      }
    }
  })
})
