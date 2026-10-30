import { describe, expect, it } from 'vitest'
import { GROUPS } from './board'
import { CARDS } from './cards'
import { lcg, randomStep } from './dev'
import { canBuild, defaultOptions, init, netWorth, reduce, rentOf } from './engine'
import type { MonopolyOptions, MonopolyState } from './types'

const base = (n = 2, o: Partial<MonopolyOptions> = {}) => init(1, { ...defaultOptions(n), ...o })
const own = (s: MonopolyState, who: number, sqs: number[]): MonopolyState => {
  const owner = [...s.owner]
  for (const sq of sqs) owner[sq] = who
  return { ...s, owner }
}

/** Cari seed rng yang menghasilkan lemparan dadu tertentu untuk lemparan berikutnya. */
function withDice(s: MonopolyState, a: number, b: number): MonopolyState {
  for (let seed = 0; seed < 100000; seed++) {
    const next = reduce({ ...s, rng: seed }, { type: 'roll' }, s.turn)
    if (next.event?.dice?.[0] === a && next.event.dice[1] === b) return { ...s, rng: seed }
  }
  throw new Error('seed tidak ketemu')
}

describe('sewa', () => {
  it('komplek lengkap tanpa rumah = sewa 2x, rumah & hotel pakai tabel', () => {
    let s = own(base(), 1, [1])
    expect(rentOf(s, 1, 7)).toBe(2)
    s = own(s, 1, [3])
    expect(rentOf(s, 1, 7)).toBe(4)
    s = { ...s, houses: s.houses.map((h, i) => (i === 1 ? 3 : h)) }
    expect(rentOf(s, 1, 7)).toBe(90)
    s = { ...s, houses: s.houses.map((h, i) => (i === 1 ? 5 : h)) }
    expect(rentOf(s, 1, 7)).toBe(250)
  })

  it('bandara 25/50/100/200, utilitas 4x atau 10x dadu, gadai = gratis', () => {
    let s = own(base(), 1, [5, 15])
    expect(rentOf(s, 5, 7)).toBe(50)
    expect(rentOf(s, 5, 7, 'airport')).toBe(100)
    s = own(s, 1, [25, 35])
    expect(rentOf(s, 25, 7)).toBe(200)
    s = own(s, 1, [12])
    expect(rentOf(s, 12, 7)).toBe(28)
    expect(rentOf(s, 12, 7, 'utility')).toBe(70)
    s = own(s, 1, [28])
    expect(rentOf(s, 12, 5)).toBe(50)
    s = { ...s, mortgaged: s.mortgaged.map((m, i) => i === 12 || m) }
    expect(rentOf(s, 12, 5)).toBe(0)
  })

  it('mendarat di properti lawan langsung bayar sewa', () => {
    const s = withDice(own(base(), 1, [6]), 2, 4)
    const next = reduce(s, { type: 'roll' }, 0)
    expect(next.pos[0]).toBe(6)
    expect(next.cash[0]).toBe(1500 - 6)
    expect(next.cash[1]).toBe(1506)
    expect(next.phase).toBe('done')
  })
})

describe('beli & lelang', () => {
  it('beli petak kosong lalu akhiri giliran', () => {
    let s = reduce(withDice(base(), 1, 2), { type: 'roll' }, 0)
    expect(s.phase).toBe('buy')
    s = reduce(s, { type: 'buy' }, 0)
    expect(s.owner[3]).toBe(0)
    expect(s.cash[0]).toBe(1440)
    s = reduce(s, { type: 'endTurn' }, 0)
    expect(s.turn).toBe(1)
    expect(s.phase).toBe('roll')
  })

  it('tolak beli → lelang, penawar tertinggi menang', () => {
    let s = reduce(withDice(base(3), 1, 2), { type: 'roll' }, 0)
    s = reduce(s, { type: 'decline' }, 0)
    expect(s.phase).toBe('auction')
    expect(s.auction!.turn).toBe(1)
    expect(reduce(s, { type: 'bid', amount: 10 }, 2)).toBe(s)
    s = reduce(s, { type: 'bid', amount: 10 }, 1)
    s = reduce(s, { type: 'bid', amount: 30 }, 2)
    s = reduce(s, { type: 'passBid' }, 0)
    expect(reduce(s, { type: 'bid', amount: 20 }, 1)).toBe(s)
    s = reduce(s, { type: 'passBid' }, 1)
    expect(s.auction).toBeNull()
    expect(s.owner[3]).toBe(2)
    expect(s.cash[2]).toBe(1470)
    expect(s.phase).toBe('done')
  })

  it('tanpa lelang, tolak beli = petak tetap milik bank', () => {
    let s = reduce(withDice(base(2, { auction: false }), 1, 2), { type: 'roll' }, 0)
    s = reduce(s, { type: 'decline' }, 0)
    expect(s.owner[3]).toBeNull()
    expect(s.phase).toBe('done')
  })
})

describe('bangun, jual, gadai', () => {
  it('rumah harus dibangun merata dan hanya di komplek lengkap', () => {
    let s = own(base(), 0, [1])
    expect(canBuild(s, 0, 1)).toBe(false)
    s = own(s, 0, [3])
    s = reduce(s, { type: 'build', sq: 1 }, 0)
    expect(s.houses[1]).toBe(1)
    expect(reduce(s, { type: 'build', sq: 1 }, 0)).toBe(s)
    s = reduce(s, { type: 'build', sq: 3 }, 0)
    s = reduce(s, { type: 'build', sq: 1 }, 0)
    expect(s.houses[1]).toBe(2)
    expect(reduce(s, { type: 'sell', sq: 3 }, 0)).toBe(s)
    s = reduce(s, { type: 'sell', sq: 1 }, 0)
    expect(s.houses[1]).toBe(1)
    expect(s.cash[0]).toBe(1500 - 150 + 25)
  })

  it('gadai butuh komplek kosong bangunan; tebus +10%', () => {
    let s = own(base(), 0, [1, 3])
    s = reduce(s, { type: 'build', sq: 1 }, 0)
    expect(reduce(s, { type: 'mortgage', sq: 3 }, 0)).toBe(s)
    s = reduce(s, { type: 'sell', sq: 1 }, 0)
    s = reduce(s, { type: 'mortgage', sq: 3 }, 0)
    expect(s.mortgaged[3]).toBe(true)
    expect(s.cash[0]).toBe(1500 - 50 + 25 + 30)
    expect(reduce(s, { type: 'build', sq: 1 }, 0)).toBe(s)
    s = reduce(s, { type: 'unmortgage', sq: 3 }, 0)
    expect(s.cash[0]).toBe(1500 - 50 + 25 + 30 - 33)
  })
})

describe('penjara', () => {
  it('3x dobel beruntun masuk penjara', () => {
    let s = base()
    for (let i = 0; i < 2; i++) {
      s = reduce(withDice(s, 1, 1), { type: 'roll' }, 0)
      if (s.phase === 'buy') s = reduce(s, { type: 'decline' }, 0)
      while (s.phase === 'auction') s = reduce(s, { type: 'passBid' }, s.auction!.turn)
      expect(s.phase).toBe('roll')
      expect(s.turn).toBe(0)
    }
    s = reduce(withDice(s, 2, 2), { type: 'roll' }, 0)
    expect(s.pos[0]).toBe(10)
    expect(s.jail[0]).toBe(0)
    expect(s.phase).toBe('done')
  })

  it('bayar denda, atau gagal 3x lalu wajib bayar', () => {
    let s: MonopolyState = { ...base(), jail: [0, -1], pos: [10, 0] }
    const paid = reduce(s, { type: 'payJail' }, 0)
    expect(paid.jail[0]).toBe(-1)
    expect(paid.pot).toBe(50)
    s = { ...s, jail: [2, -1] }
    s = reduce(withDice(s, 1, 2), { type: 'roll' }, 0)
    expect(s.jail[0]).toBe(-1)
    expect(s.pos[0]).toBe(13)
    expect(s.pot).toBe(50)
  })
})

describe('kartu & Parkir Bebas', () => {
  it('pajak masuk pot, diambil yang berhenti di Parkir Bebas', () => {
    let s = reduce(withDice(base(), 1, 3), { type: 'roll' }, 0)
    expect(s.pot).toBe(200)
    expect(s.cash[0]).toBe(1300)
    s = { ...s, phase: 'roll', turn: 1, pos: [4, 15] }
    s = reduce(withDice(s, 2, 3), { type: 'roll' }, 1)
    expect(s.pos[1]).toBe(20)
    expect(s.cash[1]).toBe(1700)
    expect(s.pot).toBe(0)
  })

  it('kartu ulang tahun: tiap pemain bayar', () => {
    const i = CARDS.chest.findIndex((k) => k.fx.k === 'each' && k.fx.amount > 0)
    let s: MonopolyState = { ...base(3), decks: { ...base(3).decks, chest: [i] } }
    s = reduce(withDice(s, 1, 1), { type: 'roll' }, 0)
    expect(s.cash).toEqual([1520, 1490, 1490])
  })
})

describe('utang & bangkrut', () => {
  it('tidak mampu bayar sewa → fase utang; gadai melunasi otomatis', () => {
    let s = own(base(), 1, [37, 39])
    s = { ...s, houses: s.houses.map((h, i) => (i === 39 ? 5 : h)), cash: [100, 1500] }
    s = own(s, 0, [5])
    s = { ...s, pos: [36, 0] }
    s = reduce(withDice(s, 1, 2), { type: 'roll' }, 0)
    expect(s.phase).toBe('debt')
    expect(s.debts[0]).toEqual({ who: 0, amount: 2000, to: 1 })
    s = reduce(s, { type: 'mortgage', sq: 5 }, 0)
    expect(s.phase).toBe('debt')
    s = reduce(s, { type: 'bankrupt' }, 0)
    expect(s.winner).toBe(1)
    expect(s.phase).toBe('end')
    expect(s.owner[5]).toBe(1)
  })

  it('lunas setelah jual rumah', () => {
    let s = own(base(), 0, [1, 3])
    s = { ...s, houses: s.houses.map((h, i) => (i === 1 || i === 3 ? 1 : h)), cash: [3, 1500] }
    s = own(s, 1, [6])
    s = { ...s, pos: [4, 0] }
    s = reduce(withDice(s, 1, 1), { type: 'roll' }, 0)
    expect(s.debts.length).toBe(1)
    s = reduce(s, { type: 'sell', sq: 1 }, 0)
    expect(s.debts.length).toBe(0)
    expect(s.phase).toBe('roll')
    expect(s.cash[0]).toBe(3 + 25 - 6)
  })
})

describe('tukar-menukar', () => {
  it('tawar, terima, dan petak berpindah', () => {
    let s = own(own(base(), 0, [1]), 1, [3])
    s = reduce(s, { type: 'propose', trade: { to: 1, give: [1], get: [3], giveCash: 20, getCash: 0 } }, 0)
    expect(s.trade?.from).toBe(0)
    expect(reduce(s, { type: 'accept' }, 0)).toBe(s)
    s = reduce(s, { type: 'accept' }, 1)
    expect(s.owner[1]).toBe(1)
    expect(s.owner[3]).toBe(0)
    expect(s.cash).toEqual([1480, 1520])
  })

  it('tidak boleh menukar komplek yang ada rumahnya', () => {
    let s = own(base(), 0, GROUPS.brown)
    s = reduce(s, { type: 'build', sq: 1 }, 0)
    expect(reduce(s, { type: 'propose', trade: { to: 1, give: [3], get: [], giveCash: 0, getCash: 0 } }, 0)).toBe(s)
  })
})

describe('akhir permainan', () => {
  it('batas putaran: kekayaan terbanyak menang', () => {
    let s = base(2, { rounds: 15 })
    s = { ...s, round: 15, turn: 1, phase: 'done', cash: [900, 1600] }
    s = reduce(s, { type: 'endTurn' }, 1)
    expect(s.phase).toBe('end')
    expect(s.winner).toBe(1)
    expect(netWorth(s, 1)).toBe(1600)
  })

  it('main lagi mengulang dengan pengaturan sama', () => {
    let s: MonopolyState = { ...base(3), phase: 'end', winner: 0 }
    s = reduce(s, { type: 'again' }, 2)
    expect(s.phase).toBe('roll')
    expect(s.pos).toEqual([0, 0, 0])
  })
})

function simulate(n: number, seed: number, o: Partial<MonopolyOptions>) {
  const rnd = lcg(seed)
  let s = init(seed, { ...defaultOptions(n), ...o })
  const start = s.cash.reduce((a, b) => a + b, 0)
  let steps = 0
  while (s.phase !== 'end' && steps < 6000) {
    steps++
    const next = randomStep(s, rnd)
    if (!next) throw new Error(`macet di langkah ${steps}: phase=${s.phase} turn=${s.turn} debts=${JSON.stringify(s.debts)}`)
    s = next
    expect(s.cash.every((c) => c >= 0)).toBe(true)
    for (let sq = 0; sq < 40; sq++) {
      const o2 = s.owner[sq]
      if (o2 !== null) expect(s.bankrupt[o2]).toBe(false)
      if (s.houses[sq] > 0) expect(o2 !== null && !s.mortgaged[sq]).toBe(true)
    }
  }
  return { s, start }
}

describe('simulasi acak: game berjalan tanpa macet', () => {
  for (const n of [2, 4, 8]) {
    it(`${n} pemain · batas putaran`, () => {
      for (const seed of [1, 2, 3]) {
        const { s } = simulate(n, seed * 17 + n, { end: 'rounds', rounds: 15 })
        expect(s.phase).toBe('end')
        expect(s.winner).not.toBeNull()
      }
    })
    it(`${n} pemain · sampai bangkrut (tanpa macet)`, { timeout: 20000 }, () => {
      for (const seed of [4, 5]) simulate(n, seed * 13 + n, { end: 'bankrupt', freeParking: seed % 2 === 0, auction: seed % 2 === 1 })
    })
  }
})
