import { describe, expect, it } from 'vitest'
import { lcg, randomStep } from './dev'
import {
  CUT_MS,
  FUSE_RANGE,
  LONG_WORD,
  MIN_FUSE,
  aliveSeats,
  canPower,
  canProtest,
  defaultOptions,
  fuseRange,
  init,
  nextAlive,
  protestNeed,
  reduce,
  wordProblem,
} from './engine'
import type { BomAction, BomOptions, BomState } from './types'

const start = (players = 4, opts: Partial<BomOptions> = {}) => reduce(init(5, { ...defaultOptions(players), powerups: false, ...opts }), { type: 'next' }, 0)
const run = (s: BomState, ...steps: [BomAction, number][]) => steps.reduce((cur, [a, by]) => reduce(cur, a, by), s)
/** kata yang pasti memenuhi tantangan pemegang bom sekarang */
const valid = (s: BomState, stem = 'kata') => `${s.prompt.letter?.toLowerCase() ?? ''}${stem}${s.prompt.syllable?.toLowerCase() ?? ''}`
const say = (s: BomState, stem = 'kata') => reduce(s, { type: 'word', text: valid(s, stem) }, s.holder)
const boom = (s: BomState) => reduce(s, { type: 'boom', fuseId: s.fuseId }, 0)

describe('mulai', () => {
  it('intro → host menekan mulai → bom menyala dengan sumbu dalam rentang', () => {
    const s0 = init(3, defaultOptions(4))
    expect(s0.phase).toBe('intro')
    expect(reduce(s0, { type: 'next' }, 1)).toBe(s0)
    const s = reduce(s0, { type: 'next' }, 0)
    expect(s.phase).toBe('live')
    const [lo, hi] = FUSE_RANGE.normal
    expect(s.fuse).toBeGreaterThanOrEqual(lo * 1000)
    expect(s.fuse).toBeLessThanOrEqual(hi * 1000)
    expect(s.lives).toEqual([3, 3, 3, 3])
  })

  it('tiap mode memberi tantangan yang sesuai', () => {
    expect(start(3, { mode: 'kategori' }).prompt).toMatchObject({ category: expect.any(String), letter: expect.any(String) })
    expect(start(3, { mode: 'bebas' }).prompt.letter).toBeUndefined()
    expect(start(3, { mode: 'suku' }).prompt.syllable).toBeTruthy()
    expect(start(3, { mode: 'sambung' }).prompt.letter).toBeTruthy()
  })

  it('power-up: semua mulai dengan satu', () => {
    const s = init(9, defaultOptions(5))
    expect(s.powers.every((p) => p.length === 1)).toBe(true)
  })
})

describe('kata', () => {
  it('memeriksa huruf awal, suku kata, angka & kata terpakai', () => {
    const s = { ...start(3), prompt: { category: 'Buah', letter: 'M' } }
    const h = s.holder
    expect(wordProblem(s, h, 'mangga')).toBeNull()
    expect(wordProblem(s, h, 'Mangga ')).toBeNull()
    expect(wordProblem(s, h, 'apel')).toMatch(/huruf M/)
    expect(wordProblem(s, h, 'm4ngga')).toBeTruthy()
    expect(wordProblem(s, h, '  ')).toBeTruthy()
    expect(wordProblem(s, nextAlive(s, h), 'mangga')).toBeTruthy()
    expect(wordProblem({ ...s, used: ['mangga'] }, h, 'mang-ga')).toMatch(/dipakai/)
    const sk = { ...s, prompt: { syllable: 'KA' } }
    expect(wordProblem(sk, h, 'kaki')).toBeNull()
    expect(wordProblem(sk, h, 'buku')).toMatch(/KA/)
    expect(wordProblem(sk, h, 'ka')).toBeTruthy()
  })

  it('kata sah → bom pindah ke kursi berikutnya, kata dicatat', () => {
    const s = start(4)
    const h = s.holder
    const n = say(s, 'emangga')
    expect(n.holder).toBe((h + 1) % 4)
    expect(n.from).toBe(h)
    expect(n.words[h]).toBe(1)
    expect(n.used).toHaveLength(1)
    expect(n.log.at(-1)).toMatchObject({ by: h, ok: true })
  })

  it('kata ditolak tidak mengubah apa-apa', () => {
    const s = { ...start(3), prompt: { letter: 'M' } }
    expect(reduce(s, { type: 'word', text: 'apel' }, s.holder)).toBe(s)
  })

  it('mode sambung: tantangan berikutnya = huruf terakhir kata sebelumnya', () => {
    let s = start(3, { mode: 'sambung' })
    s = { ...s, prompt: { letter: 'K' } }
    s = reduce(s, { type: 'word', text: 'Kopi!' }, s.holder)
    expect(s.prompt.letter).toBe('I')
    s = reduce(s, { type: 'word', text: 'ikan' }, s.holder)
    expect(s.prompt.letter).toBe('N')
  })

  it('kata panjang memberi power-up bonus', () => {
    const s = { ...start(3, { powerups: true }), prompt: { letter: 'S' } }
    const h = s.holder
    const n = reduce(s, { type: 'word', text: 'semangkasemangka'.slice(0, LONG_WORD) }, h)
    expect(n.powers[h].length).toBe(s.powers[h].length + 1)
    expect(n.event).toMatchObject({ kind: 'gift', by: h })
  })
})

describe('pilih arah', () => {
  it('kata diterima → pemegang memilih sasaran', () => {
    let s = start(4, { aim: true })
    const h = s.holder
    s = say(s)
    expect(s.aiming).toBe(true)
    expect(s.holder).toBe(h)
    const target = (h + 2) % 4
    expect(reduce(s, { type: 'aim', target: h }, h)).toBe(s)
    expect(reduce(s, { type: 'aim', target }, target)).toBe(s)
    s = reduce(s, { type: 'aim', target }, h)
    expect(s.holder).toBe(target)
    expect(s.aiming).toBe(false)
  })

  it('tinggal dua pemain → langsung oper tanpa memilih', () => {
    const s = say(start(2, { aim: true }))
    expect(s.aiming).toBe(false)
  })
})

describe('protes', () => {
  it('mayoritas "Ngawur!" membatalkan kata & bom kembali ke penulis', () => {
    let s = start(5, { mode: 'kategori' })
    const writer = s.holder
    const prompt = s.prompt
    s = say(s, 'ngasal')
    const id = s.review!.id
    // penulis & pemegang baru tidak boleh protes
    expect(canProtest(s, writer)).toBe(false)
    expect(canProtest(s, s.holder)).toBe(false)
    expect(protestNeed(s)).toEqual({ voters: 3, need: 2 })
    const voters = aliveSeats(s).filter((i) => canProtest(s, i))
    s = reduce(s, { type: 'protest', id }, voters[0])
    expect(s.review!.votes).toHaveLength(1)
    expect(reduce(s, { type: 'protest', id }, voters[0])).toBe(s)
    s = reduce(s, { type: 'protest', id }, voters[1])
    expect(s.review).toBeNull()
    expect(s.holder).toBe(writer)
    expect(s.prompt).toEqual(prompt)
    expect(s.used).toHaveLength(0)
    expect(s.words[writer]).toBe(0)
    expect(s.log.at(-1)!.ok).toBe(false)
    expect(s.event).toMatchObject({ kind: 'cancel', by: writer })
  })

  it('host menutup masa protes; protes untuk kata lama diabaikan', () => {
    let s = say(start(4))
    const id = s.review!.id
    expect(reduce(s, { type: 'closeReview', id }, 1)).toBe(s)
    s = reduce(s, { type: 'closeReview', id }, 0)
    expect(s.review).toBeNull()
    expect(reduce(s, { type: 'protest', id }, 0)).toBe(s)
  })

  it('protes mati di lobby → tidak ada peninjauan', () => {
    expect(say(start(4, { protest: false })).review).toBeNull()
  })
})

describe('power-up', () => {
  const withPower = (s: BomState, seat: number, p: 'balik' | 'lompat' | 'pendek') => ({
    ...s,
    powers: s.powers.map((_, i) => (i === seat ? [p] : [])),
  })

  it('Lempar Balik: bom kembali ke pengoper tanpa mengetik', () => {
    let s = say(start(4, { powerups: true }))
    const passer = s.from!
    s = withPower(s, s.holder, 'balik')
    const holder = s.holder
    s = reduce(s, { type: 'power', power: 'balik' }, holder)
    expect(s.holder).toBe(passer)
    expect(s.powers[holder]).toEqual([])
    expect(s.event).toMatchObject({ kind: 'power', power: 'balik', by: holder, to: passer })
  })

  it('Lompati: melewati satu orang', () => {
    let s = start(5, { powerups: true })
    s = withPower(s, s.holder, 'lompat')
    const h = s.holder
    s = reduce(s, { type: 'power', power: 'lompat' }, h)
    expect(s.holder).toBe((h + 2) % 5)
  })

  it('Sumbu Pendek: hanya bukan pemegang, memotong sumbu tapi tidak di bawah batas', () => {
    let s = start(4, { powerups: true })
    const other = nextAlive(s, s.holder)
    s = withPower({ ...s, fuse: 20000 }, other, 'pendek')
    expect(canPower(s, s.holder, 'pendek')).toBe(false)
    s = reduce(s, { type: 'power', power: 'pendek' }, other)
    expect(s.fuse).toBe(20000 - CUT_MS)
    s = withPower({ ...s, fuse: MIN_FUSE + 1000 }, other, 'pendek')
    s = reduce(s, { type: 'power', power: 'pendek' }, other)
    expect(s.fuse).toBe(MIN_FUSE)
  })

  it('tanpa power-up di tangan → ditolak', () => {
    const s = withPower(start(4, { powerups: true }), 99, 'balik')
    expect(reduce(s, { type: 'power', power: 'balik' }, s.holder)).toBe(s)
  })
})

describe('ledakan', () => {
  it('pemegang kehilangan nyawa; ronde berikutnya dari kursi sesudahnya', () => {
    let s = start(3, { lives: 2 })
    const h = s.holder
    expect(reduce(s, { type: 'boom', fuseId: s.fuseId }, 1)).toBe(s)
    expect(reduce(s, { type: 'boom', fuseId: s.fuseId - 1 }, 0)).toBe(s)
    s = boom(s)
    expect(s.phase).toBe('boom')
    expect(s.lives[h]).toBe(1)
    expect(s.lastBoom).toBe(h)
    const fid = s.fuseId
    s = reduce(s, { type: 'next' }, 0)
    expect(s.phase).toBe('live')
    expect(s.round).toBe(2)
    expect(s.holder).toBe((h + 1) % 3)
    expect(s.fuseId).toBe(fid + 1)
  })

  it('nyawa habis → tersingkir; sisa satu → menang', () => {
    let s = start(2, { lives: 1 })
    const h = s.holder
    s = boom(s)
    expect(s.alive[h]).toBe(false)
    expect(s.phase).toBe('end')
    expect(s.winner).toBe(1 - h)
    expect(s.outOrder).toEqual([h])
  })

  it('makin cepat: rentang sumbu menyusut per ledakan sampai batas', () => {
    const o = defaultOptions(4)
    expect(fuseRange(o, 0)).toEqual([15, 45])
    expect(fuseRange(o, 2)[1]).toBeCloseTo(36)
    expect(fuseRange(o, 50)).toEqual([7.5, 22.5])
    expect(fuseRange({ ...o, faster: false }, 9)).toEqual([15, 45])
  })

  it('tersingkir dilewati saat oper', () => {
    let s = start(3, { lives: 1 })
    const h = s.holder
    s = reduce(boom(s), { type: 'next' }, 0)
    for (let k = 0; k < 6; k++) {
      expect(s.holder).not.toBe(h)
      s = say(s, `kata${'x'.repeat(k)}`)
    }
  })
})

describe('simulasi', () => {
  it('bot acak selalu sampai juara di semua mode & pengaturan', () => {
    const modes = ['kategori', 'bebas', 'suku', 'sambung'] as const
    for (let seed = 1; seed <= 24; seed++) {
      const players = 2 + (seed % 7)
      const opts = { ...defaultOptions(players), mode: modes[seed % 4], aim: seed % 2 === 0, protest: seed % 3 !== 0, lives: ((seed % 3) + 1) as 1 | 2 | 3 }
      let s: BomState = init(seed, opts)
      const rnd = lcg(seed)
      for (let i = 0; i < 5000 && s.phase !== 'end'; i++) s = randomStep(s, rnd) ?? s
      expect(s.phase).toBe('end')
      expect(s.alive.filter(Boolean)).toHaveLength(1)
      expect(s.winner).toBe(s.alive.indexOf(true))
      expect(s.outOrder).toHaveLength(players - 1)
    }
  })

  it('main lagi → state baru dengan pengaturan sama', () => {
    let s = start(2, { lives: 1, mode: 'suku' })
    s = boom(s)
    const again = run(s, [{ type: 'again' }, 1])
    expect(again.phase).toBe('intro')
    expect(again.opts.mode).toBe('suku')
    expect(again.lives).toEqual([1, 1])
  })
})
