import { describe, expect, it } from 'vitest'
import { buildDeck, classicFaces, flipDarkFaces, flipLightFaces, noMercyFaces } from './deck'
import { canPlay, defaultOptions, faceOf, init, reduce, topFace } from './engine'
import { DEFAULT_HOUSE, type Card, type Face, type UnoOptions, type UnoState } from './types'

let n = 0
const c = (kind: Face['kind'], color: Face['color'], value = 0, back?: Face): Card => ({
  id: `t${n++}`,
  faces: back ? [{ kind, color, value }, back] : [{ kind, color, value }],
})

/** State buatan: tangan & kartu meja ditentukan, deck berisi kartu angka biru. */
function table(
  hands: [Card[], Card[]],
  top: Card,
  opts: Partial<UnoOptions> = {},
  deck: Card[] = Array.from({ length: 40 }, (_, i) => c('num', 'blue', i % 10)),
): UnoState {
  const base = init(7, { ...defaultOptions(), ...opts })
  return {
    ...base,
    hands,
    discard: [top],
    deck,
    turn: 0,
    color: faceOf(top, 0).color,
    pending: null,
  }
}

describe('komposisi deck', () => {
  it('Classic 108, Flip 112 per sisi, No Mercy 168', () => {
    expect(classicFaces()).toHaveLength(108)
    expect(flipLightFaces()).toHaveLength(112)
    expect(flipDarkFaces()).toHaveLength(112)
    expect(noMercyFaces()).toHaveLength(168)
    const [flip] = buildDeck('flip', 3)
    expect(flip.every((card) => card.faces.length === 2)).toBe(true)
  })

  it('bagi 7 kartu, kartu pembuka bukan Wild Draw', () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const variant of ['classic', 'flip', 'noMercy'] as const) {
        const s = init(seed, defaultOptions(variant))
        expect(s.hands[0].length + s.hands[1].length).toBeGreaterThanOrEqual(14)
        expect(['wildDraw', 'wildDrawColor']).not.toContain(topFace(s).kind)
        if (variant === 'noMercy') expect(topFace(s).kind).toBe('num')
      }
    }
  })
})

describe('Classic', () => {
  it('cocok warna / angka / simbol', () => {
    const s = table([[c('num', 'red', 3)], []], c('num', 'red', 5))
    expect(canPlay(s, c('num', 'red', 1), 0)).toBe(true)
    expect(canPlay(s, c('num', 'blue', 5), 0)).toBe(true)
    expect(canPlay(s, c('num', 'blue', 4), 0)).toBe(false)
    expect(canPlay(s, c('wild', null), 0)).toBe(true)
    const s2 = table([[], []], c('skip', 'red'))
    expect(canPlay(s2, c('skip', 'green'), 0)).toBe(true)
  })

  it('Skip/Reverse = main lagi, +2 = lawan ambil 2 & dilewati', () => {
    const [sk, d2, x] = [c('skip', 'red'), c('draw', 'red', 2), c('num', 'red', 1)]
    let s = table([[sk, d2, x, c('num', 'green', 3)], [c('num', 'blue', 1)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: sk.id }, 0)
    expect(s.turn).toBe(0)
    s = reduce(s, { type: 'play', cardId: d2.id }, 0)
    expect(s.turn).toBe(0)
    expect(s.hands[1]).toHaveLength(3)
  })

  it('ambil 1: kalau bisa dimainkan boleh main/lewat, kalau tidak giliran pindah', () => {
    const playableDeck = [c('num', 'red', 9)]
    let s = table([[c('num', 'green', 2)], [c('num', 'green', 1)]], c('num', 'red', 5), {}, playableDeck)
    s = reduce(s, { type: 'draw' }, 0)
    expect(s.drawn).toBe(playableDeck[0].id)
    expect(s.turn).toBe(0)
    s = reduce(s, { type: 'pass' }, 0)
    expect(s.turn).toBe(1)

    let t = table([[c('num', 'green', 2)], [c('num', 'green', 1)]], c('num', 'red', 5), {}, [c('num', 'blue', 7)])
    t = reduce(t, { type: 'draw' }, 0)
    expect(t.turn).toBe(1)
    expect(t.drawn).toBeNull()
  })

  it('Wild butuh warna', () => {
    const w = c('wild', null)
    const s = table([[w, c('num', 'red', 2)], [c('num', 'blue', 1)]], c('num', 'red', 5))
    expect(reduce(s, { type: 'play', cardId: w.id }, 0)).toBe(s)
    const s2 = reduce(s, { type: 'play', cardId: w.id, color: 'green' }, 0)
    expect(s2.color).toBe('green')
    expect(s2.turn).toBe(1)
  })

  it('Wild +4 curang & ditantang: pelaku ambil 4, penantang lanjut', () => {
    const w4 = c('wildDraw', null, 4)
    let s = table([[w4, c('num', 'red', 2), c('num', 'red', 3)], [c('num', 'blue', 1)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: w4.id, color: 'blue' }, 0)
    expect(s.pending?.kind).toBe('challenge')
    s = reduce(s, { type: 'challenge' }, 1)
    expect(s.hands[0]).toHaveLength(6)
    expect(s.hands[1]).toHaveLength(1)
    expect(s.turn).toBe(1)
  })

  it('Wild +4 sah & ditantang: penantang ambil 6 dan dilewati', () => {
    const w4 = c('wildDraw', null, 4)
    let s = table([[w4, c('num', 'green', 2), c('num', 'green', 3)], [c('num', 'blue', 1)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: w4.id, color: 'blue' }, 0)
    s = reduce(s, { type: 'challenge' }, 1)
    expect(s.hands[1]).toHaveLength(7)
    expect(s.turn).toBe(0)
  })

  it('Wild +4 diterima: korban ambil 4, pemain jalan lagi', () => {
    const w4 = c('wildDraw', null, 4)
    let s = table([[w4, c('num', 'green', 2)], [c('num', 'blue', 1)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: w4.id, color: 'blue' }, 0)
    s = reduce(s, { type: 'accept' }, 1)
    expect(s.hands[1]).toHaveLength(5)
    expect(s.turn).toBe(0)
  })

  it('lupa UNO bisa ditangkap (+2), tapi aman kalau sudah bilang UNO', () => {
    const [a, b] = [c('num', 'red', 1), c('num', 'red', 2)]
    let s = table([[a, b], [c('num', 'blue', 1), c('num', 'blue', 3)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: a.id }, 0)
    expect(s.unoVulnerable).toBe(0)
    s = reduce(s, { type: 'catch' }, 1)
    expect(s.hands[0]).toHaveLength(3)

    let t = table([[a, b], [c('num', 'blue', 1), c('num', 'blue', 3)]], c('num', 'red', 5))
    t = reduce(t, { type: 'uno' }, 0)
    t = reduce(t, { type: 'play', cardId: a.id }, 0)
    expect(t.unoVulnerable).toBeNull()
    expect(reduce(t, { type: 'catch' }, 1)).toBe(t)
  })

  it('kesempatan tangkap hilang setelah lawan bergerak', () => {
    const [a, b] = [c('num', 'red', 1), c('num', 'red', 2)]
    let s = table([[a, b], [c('num', 'blue', 1), c('num', 'blue', 3)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: a.id }, 0)
    s = reduce(s, { type: 'draw' }, 1)
    expect(s.unoVulnerable).toBeNull()
  })

  it('menang ronde: dapat poin kartu lawan; capai target = juara', () => {
    const last = c('num', 'red', 1)
    const opp = [c('num', 'blue', 9), c('skip', 'blue'), c('wild', null)]
    let s = table([[last], opp], c('num', 'red', 5), { target: 50 })
    s = reduce(s, { type: 'play', cardId: last.id }, 0)
    expect(s.roundWinner).toBe(0)
    expect(s.roundPoints).toBe(9 + 20 + 50)
    expect(s.gameWinner).toBe(0)
  })

  it('kartu +2 terakhir tetap membuat lawan ambil sebelum poin dihitung', () => {
    const last = c('draw', 'red', 2)
    let s = table([[last], [c('num', 'blue', 9)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: last.id }, 0)
    expect(s.hands[1]).toHaveLength(3)
    expect(s.roundPoints).toBe(9 + 0 + 1) // 2 kartu teratas deck dummy: biru 0 dan 1
  })

  it('ronde baru: skor terbawa, dealer bergantian', () => {
    const last = c('num', 'red', 1)
    let s = table([[last], [c('num', 'blue', 9)]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: last.id }, 0)
    const next = reduce(s, { type: 'nextRound' }, 1)
    expect(next.round).toBe(s.round + 1)
    expect(next.scores).toEqual(s.scores)
    expect(next.dealer).not.toBe(s.dealer)
    expect(next.roundWinner).toBeNull()
  })
})

describe('House rules', () => {
  const house = (h: Partial<typeof DEFAULT_HOUSE>) => ({ house: { ...DEFAULT_HOUSE, ...h } })

  it('Stacking: +2 di atas +2, korban ambil total', () => {
    const [a, b] = [c('draw', 'red', 2), c('draw', 'green', 2)]
    let s = table([[a, c('num', 'red', 1)], [b, c('num', 'blue', 1)]], c('num', 'red', 5), house({ stacking: true }))
    s = reduce(s, { type: 'play', cardId: a.id }, 0)
    expect(s.pending).toMatchObject({ kind: 'stack', victim: 1, amount: 2 })
    s = reduce(s, { type: 'play', cardId: b.id }, 1)
    expect(s.pending).toMatchObject({ kind: 'stack', victim: 0, amount: 4 })
    s = reduce(s, { type: 'accept' }, 0)
    expect(s.hands[0]).toHaveLength(5)
    expect(s.turn).toBe(1)
  })

  it('7-0: tukar tangan', () => {
    const seven = c('num', 'red', 7)
    const mine = [seven, c('num', 'green', 1)]
    const theirs = [c('num', 'blue', 1), c('num', 'blue', 2), c('num', 'blue', 3)]
    let s = table([mine, theirs], c('num', 'red', 5), house({ sevenZero: true }))
    s = reduce(s, { type: 'play', cardId: seven.id }, 0)
    expect(s.hands[0]).toHaveLength(3)
    expect(s.hands[1]).toHaveLength(1)
  })

  it('Jump-In: kartu identik di luar giliran', () => {
    const twin = c('num', 'red', 5)
    const s = table([[c('num', 'green', 1)], [twin, c('num', 'blue', 2)]], c('num', 'red', 5), house({ jumpIn: true }))
    const s2 = reduce(s, { type: 'play', cardId: twin.id }, 1)
    expect(s2.hands[1]).toHaveLength(1)
    expect(s2.turn).toBe(0)
    const off = table([[c('num', 'green', 1)], [twin, c('num', 'blue', 2)]], c('num', 'red', 5))
    expect(reduce(off, { type: 'play', cardId: twin.id }, 1)).toBe(off)
  })

  it('Draw sampai dapat & Force Play', () => {
    const deck = [c('num', 'blue', 1), c('num', 'blue', 2), c('num', 'red', 8), c('num', 'blue', 3)]
    let s = table([[c('num', 'green', 1)], [c('num', 'green', 2)]], c('num', 'red', 5), house({ drawToMatch: true, forcePlay: true }), deck)
    s = reduce(s, { type: 'draw' }, 0)
    expect(s.hands[0]).toHaveLength(4)
    expect(s.drawn).toBe(deck[2].id)
    expect(reduce(s, { type: 'pass' }, 0)).toBe(s)
  })

  it('Tanpa tantangan: Wild +4 langsung berlaku', () => {
    const w4 = c('wildDraw', null, 4)
    let s = table([[w4, c('num', 'red', 1)], [c('num', 'blue', 1)]], c('num', 'red', 5), house({ noChallenge: true }))
    s = reduce(s, { type: 'play', cardId: w4.id, color: 'green' }, 0)
    expect(s.pending).toBeNull()
    expect(s.hands[1]).toHaveLength(5)
  })
})

describe('Flip', () => {
  const opts = { variant: 'flip' as const }
  const dark = (kind: Face['kind'], color: Face['color'], value = 0): Face => ({ kind, color, value })

  it('kartu Flip membalik semua kartu ke sisi gelap', () => {
    const flip = c('flip', 'red', 0, dark('num', 'pink', 4))
    const mine = c('num', 'red', 3, dark('draw', 'teal', 5))
    let s = table([[flip, mine], [c('num', 'blue', 1, dark('num', 'orange', 2))]], c('num', 'red', 5, dark('num', 'purple', 6)), opts)
    s = reduce(s, { type: 'play', cardId: flip.id }, 0)
    expect(s.side).toBe(1)
    expect(s.color).toBe('pink')
    expect(faceOf(s.hands[0][0], s.side).kind).toBe('draw')
    expect(s.turn).toBe(1)
  })

  it('Draw Five & Skip Everyone di sisi gelap', () => {
    const d5 = c('num', 'red', 1, dark('draw', 'pink', 5))
    const se = c('num', 'red', 2, dark('skipAll', 'pink'))
    const deck = Array.from({ length: 20 }, () => c('num', 'blue', 1, dark('num', 'teal', 1)))
    let s = table(
      [[d5, se, c('num', 'red', 3, dark('num', 'teal', 3))], [c('num', 'blue', 1, dark('num', 'orange', 2))]],
      c('num', 'red', 5, dark('num', 'pink', 6)),
      opts,
      deck,
    )
    s = { ...s, side: 1, color: 'pink' }
    s = reduce(s, { type: 'play', cardId: se.id }, 0)
    expect(s.turn).toBe(0)
    s = reduce(s, { type: 'play', cardId: d5.id }, 0)
    expect(s.hands[1]).toHaveLength(6)
    expect(s.turn).toBe(0)
  })

  it('Wild Draw Color: korban ambil sampai dapat warna pilihan', () => {
    const wdc = c('num', 'red', 1, dark('wildDrawColor', null))
    const deck = [
      c('num', 'blue', 1, dark('num', 'teal', 1)),
      c('num', 'blue', 2, dark('num', 'orange', 1)),
      c('num', 'blue', 3, dark('num', 'purple', 1)),
      c('num', 'blue', 4, dark('num', 'teal', 2)),
    ]
    let s = table([[wdc, c('num', 'red', 2, dark('num', 'pink', 2))], [c('num', 'blue', 1, dark('num', 'orange', 2))]], c('num', 'red', 5, dark('num', 'teal', 6)), opts, deck)
    s = { ...s, side: 1, color: 'teal' }
    s = reduce(s, { type: 'play', cardId: wdc.id, color: 'purple' }, 0)
    s = reduce(s, { type: 'accept' }, 1)
    expect(s.hands[1]).toHaveLength(4)
    expect(s.turn).toBe(0)
  })

  it('poin Flip mengikuti sisi aktif', () => {
    const last = c('num', 'red', 1, dark('num', 'pink', 1))
    const opp = [c('wildDraw', null, 2, dark('skipAll', 'teal')), c('draw', 'red', 1, dark('wildDrawColor', null))]
    let s = table([[last], opp], c('num', 'red', 5, dark('num', 'pink', 6)), opts)
    s = { ...s, side: 1, color: 'pink' }
    s = reduce(s, { type: 'play', cardId: last.id }, 0)
    expect(s.roundPoints).toBe(30 + 60)
  })
})

describe('No Mercy', () => {
  const opts = { variant: 'noMercy' as const }

  it('stacking naik: +2 lalu +4 lalu Wild +10', () => {
    const [a, b, w10] = [c('draw', 'red', 2), c('draw', 'red', 4), c('wildDraw', null, 10)]
    let s = table([[a, w10, c('num', 'red', 1)], [b, c('num', 'blue', 1)]], c('num', 'red', 5), opts)
    s = reduce(s, { type: 'play', cardId: a.id }, 0)
    expect(canPlay(s, c('draw', 'blue', 2), 1)).toBe(true)
    s = reduce(s, { type: 'play', cardId: b.id }, 1)
    expect(canPlay(s, c('draw', 'red', 2), 0)).toBe(false)
    s = reduce(s, { type: 'play', cardId: w10.id, color: 'green' }, 0)
    expect(s.pending).toMatchObject({ kind: 'stack', victim: 1, amount: 16 })
    s = reduce(s, { type: 'accept' }, 1)
    expect(s.hands[1]).toHaveLength(17)
  })

  it('Mercy: tangan 25 kartu = kalah ronde', () => {
    const w10 = c('wildDraw', null, 10)
    const opp = Array.from({ length: 16 }, () => c('num', 'blue', 1))
    let s = table([[w10, c('num', 'red', 1)], opp], c('num', 'red', 5), opts)
    s = reduce(s, { type: 'play', cardId: w10.id, color: 'red' }, 0)
    s = reduce(s, { type: 'accept' }, 1)
    expect(s.roundWinner).toBe(0)
  })

  it('ambil sampai dapat kartu yang bisa dimainkan', () => {
    const deck = [c('num', 'blue', 1), c('num', 'blue', 2), c('num', 'red', 8)]
    let s = table([[c('num', 'green', 1)], [c('num', 'green', 2)]], c('num', 'red', 5), opts, deck)
    s = reduce(s, { type: 'draw' }, 0)
    expect(s.hands[0]).toHaveLength(4)
    expect(s.drawn).toBe(deck[2].id)
  })

  it('Discard All membuang semua kartu warna itu', () => {
    const da = c('discardAll', 'red')
    let s = table([[da, c('num', 'red', 2), c('skip', 'red'), c('num', 'green', 1)], [c('num', 'blue', 1)]], c('num', 'red', 5), opts)
    s = reduce(s, { type: 'play', cardId: da.id }, 0)
    expect(s.hands[0]).toHaveLength(1)
    expect(topFace(s).kind).toBe('discardAll')
  })

  it('0 dan 7 menukar tangan', () => {
    const zero = c('num', 'red', 0)
    let s = table([[zero, c('num', 'green', 1)], [c('num', 'blue', 1), c('num', 'blue', 2), c('num', 'blue', 3)]], c('num', 'red', 5), opts)
    s = reduce(s, { type: 'play', cardId: zero.id }, 0)
    expect(s.hands[0]).toHaveLength(3)
  })

  it('Color Roulette: korban pilih warna lalu ambil sampai dapat', () => {
    const r = c('roulette', null)
    const deck = [c('num', 'blue', 1), c('num', 'yellow', 1), c('num', 'green', 4)]
    let s = table([[r, c('num', 'red', 1)], [c('num', 'blue', 9)]], c('num', 'red', 5), opts, deck)
    s = reduce(s, { type: 'play', cardId: r.id }, 0)
    expect(s.pending).toMatchObject({ kind: 'roulette', victim: 1 })
    s = reduce(s, { type: 'pickColor', color: 'green' }, 1)
    expect(s.hands[1]).toHaveLength(4)
    expect(s.color).toBe('green')
    expect(s.turn).toBe(0)
  })
})

describe('Banyak pemain (3–8)', () => {
  const tableN = (hands: Card[][], top: Card, opts: Partial<UnoOptions> = {}): UnoState => {
    const base = init(7, { ...defaultOptions(opts.variant ?? 'classic', hands.length), ...opts, players: hands.length })
    return {
      ...base,
      hands,
      discard: [top],
      deck: Array.from({ length: 60 }, (_, i) => c('num', 'blue', i % 10)),
      turn: 0,
      dir: 1,
      color: faceOf(top, 0).color,
      pending: null,
    }
  }
  const filler = () => [c('num', 'yellow', 1), c('num', 'yellow', 2)]

  it('init membagi 7 kartu ke tiap pemain, host mulai', () => {
    for (const n of [3, 5, 8]) {
      const s = init(11, defaultOptions('classic', n))
      expect(s.hands).toHaveLength(n)
      expect(s.scores).toHaveLength(n)
      expect(s.hands.reduce((a, h) => a + h.length, 0)).toBeGreaterThanOrEqual(7 * n)
    }
  })

  it('giliran berputar 0 → 1 → 2 → 0', () => {
    let s = tableN([[c('num', 'red', 1), ...filler()], [c('num', 'red', 2), ...filler()], [c('num', 'red', 3), ...filler()]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: s.hands[0][0].id }, 0)
    expect(s.turn).toBe(1)
    s = reduce(s, { type: 'play', cardId: s.hands[1][0].id }, 1)
    expect(s.turn).toBe(2)
    s = reduce(s, { type: 'play', cardId: s.hands[2][0].id }, 2)
    expect(s.turn).toBe(0)
  })

  it('Skip melewati satu pemain, Reverse membalik arah', () => {
    const sk = c('skip', 'red')
    let s = tableN([[sk, ...filler()], filler(), filler(), filler()], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: sk.id }, 0)
    expect(s.turn).toBe(2)
    const rv = c('reverse', 'red')
    let t = tableN([[rv, ...filler()], filler(), filler(), filler()], c('num', 'red', 5))
    t = reduce(t, { type: 'play', cardId: rv.id }, 0)
    expect(t.dir).toBe(-1)
    expect(t.turn).toBe(3)
  })

  it('+2 mengenai pemain berikutnya, lalu dia dilewati', () => {
    const d2 = c('draw', 'red', 2)
    let s = tableN([[d2, ...filler()], filler(), filler()], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: d2.id }, 0)
    expect(s.hands[1]).toHaveLength(4)
    expect(s.turn).toBe(2)
  })

  it('tantangan Wild +4 oleh pemain berikutnya', () => {
    const w4 = c('wildDraw', null, 4)
    let s = tableN([[w4, c('num', 'red', 1), ...filler()], filler(), filler()], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: w4.id, color: 'green' }, 0)
    expect(s.pending).toMatchObject({ kind: 'challenge', victim: 1 })
    s = reduce(s, { type: 'challenge' }, 1)
    expect(s.hands[0]).toHaveLength(3 + 4) // curang: pelaku ambil 4
    expect(s.turn).toBe(1)
  })

  it('pemain mana pun bisa menangkap yang lupa UNO', () => {
    const a = c('num', 'red', 1)
    let s = tableN([[a, c('num', 'red', 2)], filler(), filler()], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: a.id }, 0)
    s = reduce(s, { type: 'catch' }, 2)
    expect(s.hands[0]).toHaveLength(3)
  })

  it('7-0: kartu 7 butuh target & menukar dengan pemain pilihan; kartu 0 menggeser semua tangan', () => {
    const house = { ...DEFAULT_HOUSE, sevenZero: true }
    const seven = c('num', 'red', 7)
    const hands = [[seven, c('num', 'green', 1)], [c('num', 'blue', 1)], [c('num', 'blue', 2), c('num', 'blue', 3), c('num', 'blue', 4)]]
    let s = tableN(hands, c('num', 'red', 5), { house })
    expect(reduce(s, { type: 'play', cardId: seven.id }, 0)).toBe(s)
    s = reduce(s, { type: 'play', cardId: seven.id, target: 2 }, 0)
    expect(s.hands[0]).toHaveLength(3)
    expect(s.hands[2]).toHaveLength(1)

    const zero = c('num', 'red', 0)
    let t = tableN([[zero, c('num', 'green', 1)], [c('num', 'blue', 1)], [c('num', 'blue', 2), c('num', 'blue', 3)]], c('num', 'red', 5), { house })
    t = reduce(t, { type: 'play', cardId: zero.id }, 0)
    expect(t.hands.map((h) => h.length)).toEqual([2, 1, 1])
  })

  it('No Mercy: pemain tembus 25 tersingkir, game lanjut tanpa dia', () => {
    const w10 = c('wildDraw', null, 10)
    const big = Array.from({ length: 16 }, () => c('num', 'blue', 1))
    let s = tableN([[w10, c('num', 'red', 1), c('num', 'red', 2)], big, filler()], c('num', 'red', 5), { variant: 'noMercy' })
    s = reduce(s, { type: 'play', cardId: w10.id, color: 'red' }, 0)
    s = reduce(s, { type: 'accept' }, 1)
    expect(s.out[1]).toBe(true)
    expect(s.roundWinner).toBeNull()
    expect(s.turn).toBe(2)
  })

  it('menang ronde: dapat poin dari semua pemain lain', () => {
    const last = c('num', 'red', 1)
    let s = tableN([[last], [c('num', 'blue', 9)], [c('skip', 'green')]], c('num', 'red', 5))
    s = reduce(s, { type: 'play', cardId: last.id }, 0)
    expect(s.roundPoints).toBe(9 + 20)
  })
})
