import { describe, expect, it } from 'vitest'
import {
  DRAWER_POINTS,
  GUESS_POINTS,
  LEVEL_BONUS,
  canGuess,
  defaultOptions,
  hintCount,
  init,
  isClose,
  isCorrect,
  maskWord,
  normalize,
  reduce,
  totalTurns,
} from './engine'
import type { DrawAction, DrawState } from './types'
import { PACK_WORDS, parseCustom } from './words'

const start = (players = 3, opts = {}) => init(7, { ...defaultOptions(), players, ...opts })
const run = (s: DrawState, ...steps: [DrawAction, number][]) => steps.reduce((cur, [a, by]) => reduce(cur, a, by), s)
/** state di fase menggambar dengan kata gampang yang diketahui */
const drawing = (players = 3) => {
  const s = reduce(start(players), { type: 'pick', i: 0 }, 0)
  return { ...s, word: 'Kupu-kupu', level: 1 as const }
}
const stroke = (g: number) => ({ type: 'stroke', s: { g, c: 0, w: 1, pts: [10, 10, 200, 300] } }) as DrawAction

describe('kata', () => {
  it('normalisasi mengabaikan huruf besar, spasi & tanda hubung', () => {
    expect(normalize(' Kupu-Kupu ')).toBe('kupukupu')
    expect(isCorrect('kupu kupu', 'kupu-kupu')).toBe(true)
    expect(isCorrect('kupu', 'kupu-kupu')).toBe(false)
  })

  it('nyaris benar: beda satu huruf, kata panjang boleh dua', () => {
    expect(isClose('kucin', 'kucing')).toBe(true)
    expect(isClose('kocing', 'kucing')).toBe(true)
    expect(isClose('kuda', 'kucing')).toBe(false)
    expect(isClose('dinasourus', 'dinosaurus')).toBe(true)
    expect(isClose('kucing', 'kucing')).toBe(false)
  })

  it('mask menutup huruf saja dan membuka sesuai petunjuk', () => {
    expect(maskWord('es teh', [0, 1, 3, 4, 5], 0).join('')).toBe('__ ___')
    expect(maskWord('es teh', [3, 0], 1).join('')).toBe('__ t__')
  })

  it('semua paket punya kata di tiap tingkat & tidak dobel', () => {
    for (const words of Object.values(PACK_WORDS)) {
      for (const lv of [1, 2, 3]) expect(words.filter((w) => w.level === lv).length).toBeGreaterThanOrEqual(20)
      const keys = words.map((w) => normalize(w.word))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('kata buatan sendiri dibersihkan', () => {
    expect(parseCustom('Budi, budi\nsi  Kucing oren,,a')).toEqual(['Budi', 'si Kucing oren'])
  })
})

describe('giliran', () => {
  it('mulai dengan drawer host dan 3 pilihan berbeda tingkat', () => {
    const s = start()
    expect(s.phase).toBe('choose')
    expect(s.drawer).toBe(0)
    expect(s.choices.map((c) => c.level)).toEqual([1, 2, 3])
  })

  it('hanya drawer yang memilih kata', () => {
    const s = start()
    expect(reduce(s, { type: 'pick', i: 1 }, 1)).toBe(s)
    const t = reduce(s, { type: 'pick', i: 1 }, 0)
    expect(t.phase).toBe('draw')
    expect(t.word).toBe(s.choices[1].word)
    expect(t.hintOrder.length).toBe(normalize(t.word).length)
  })

  it('coretan, undo per tarikan, dan clear hanya oleh drawer', () => {
    const s = drawing()
    expect(reduce(s, stroke(1), 1)).toBe(s)
    const t = run(s, [stroke(1), 0], [stroke(2), 0], [stroke(2), 0])
    expect(t.strokes).toHaveLength(3)
    const u = reduce(t, { type: 'undo' }, 0)
    expect(u.strokes.map((x) => x.g)).toEqual([1])
    expect(reduce(u, { type: 'clear' }, 1)).toBe(u)
    expect(reduce(u, { type: 'clear' }, 0).strokes).toHaveLength(0)
  })

  it('coretan tidak valid ditolak', () => {
    const s = drawing()
    const bad = (pts: number[]) => reduce(s, { type: 'stroke', s: { g: 1, c: 0, w: 0, pts } }, 0)
    expect(bad([1, 2, 3])).toBe(s)
    expect(bad([1001, 2])).toBe(s)
    expect(bad([1.5, 2])).toBe(s)
  })

  it('tebakan benar memberi poin sesuai urutan, drawer ikut dapat', () => {
    const s = drawing(4)
    const t = run(s, [{ type: 'guess', text: 'kupu kupu' }, 2], [{ type: 'guess', text: 'Kupu-Kupu' }, 1])
    expect(t.guessed).toEqual([2, 1])
    expect(t.scores[2]).toBe(GUESS_POINTS[0])
    expect(t.scores[1]).toBe(GUESS_POINTS[1])
    expect(t.scores[0]).toBe(DRAWER_POINTS * 2)
    expect(t.phase).toBe('draw')
    // yang sudah benar & drawer tidak bisa menebak lagi
    expect(canGuess(t, 2)).toBe(false)
    expect(canGuess(t, 0)).toBe(false)
    expect(reduce(t, { type: 'guess', text: 'kupu-kupu' }, 2)).toBe(t)
  })

  it('kata susah memberi bonus', () => {
    const s = { ...drawing(2), level: 3 as const }
    const t = reduce(s, { type: 'guess', text: 'kupu-kupu' }, 1)
    expect(t.scores[1]).toBe(GUESS_POINTS[0] + 2 * LEVEL_BONUS)
  })

  it('semua sudah benar → reveal; tebakan salah & nyaris masuk feed', () => {
    const s = drawing(3)
    const t = run(s, [{ type: 'guess', text: 'kupu kupi' }, 1], [{ type: 'guess', text: 'capung' }, 2])
    expect(t.feed.slice(-2).map((f) => f.t)).toEqual(['close', 'guess'])
    const u = run(t, [{ type: 'guess', text: 'kupu-kupu' }, 1], [{ type: 'guess', text: 'kupukupu' }, 2])
    expect(u.phase).toBe('reveal')
    expect(u.reason).toBe('all')
  })

  it('waktu habis hanya dari host; saat memilih kata otomatis pilih yang pertama', () => {
    const s = start()
    expect(reduce(s, { type: 'timeUp' }, 1)).toBe(s)
    const t = reduce(s, { type: 'timeUp' }, 0)
    expect(t.phase).toBe('draw')
    expect(t.word).toBe(s.choices[0].word)
    const u = reduce(t, { type: 'timeUp' }, 0)
    expect(u.phase).toBe('reveal')
    expect(u.reason).toBe('time')
  })

  it('drawer bisa menyerah', () => {
    const s = drawing()
    expect(reduce(s, { type: 'skip' }, 1)).toBe(s)
    expect(reduce(s, { type: 'skip' }, 0).reason).toBe('skip')
  })

  it('giliran berputar per kursi lalu per putaran sampai selesai, pemenang bisa seri', () => {
    let s = start(2, { rounds: 2 })
    const order: number[] = []
    for (let k = 0; k < totalTurns(s); k++) {
      order.push(s.drawer)
      s = run(s, [{ type: 'pick', i: 0 }, s.drawer], [{ type: 'skip' }, s.drawer], [{ type: 'next' }, 0])
    }
    expect(order).toEqual([0, 1, 0, 1])
    expect(s.phase).toBe('end')
    expect(s.winners).toEqual([0, 1])
    const again = reduce(s, { type: 'again' }, 1)
    expect(again.phase).toBe('choose')
    expect(again.scores).toEqual([0, 0])
  })

  it('next hanya dari host di layar reveal', () => {
    const s = reduce(drawing(), { type: 'skip' }, 0)
    expect(reduce(s, { type: 'next' }, 1)).toBe(s)
    const t = reduce(s, { type: 'next' }, 0)
    expect(t.drawer).toBe(1)
    expect(t.phase).toBe('choose')
  })

  it('petunjuk dibuka setelah setengah waktu, maksimal 40% huruf', () => {
    const s = drawing()
    expect(hintCount(s, 0.3)).toBe(0)
    expect(hintCount(s, 0.55)).toBeGreaterThan(0)
    expect(hintCount(s, 1)).toBeLessThanOrEqual(Math.floor(s.hintOrder.length * 0.4))
    expect(hintCount({ ...s, opts: { ...s.opts, hints: false } }, 1)).toBe(0)
  })

  it('kata custom ikut keluar', () => {
    const s = init(3, { ...defaultOptions(), packs: [], custom: ['Pak Budi'] })
    expect(s.choices.some((c) => c.word === 'Pak Budi')).toBe(true)
  })
})
