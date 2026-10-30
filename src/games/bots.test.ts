import { describe, expect, it } from 'vitest'
import { CATEGORY_WORDS, GENERAL_WORDS } from './bom/botWords'
import { WORD_MAX } from './bom/engine'
import { CATEGORIES, SYLLABLES } from './bom/words'
import { lcg } from './domino/dev'
import { normalize } from './draw/engine'
import { SKETCH_WORDS, sketchStrokes } from './draw/sketches'
import { gameById } from './registry'
import { LOCATION_CLUES, WORD_CLUES } from './spy/botClues'
import { clueProblem } from './spy/engine'
import { LOCATIONS } from './spy/locations'
import { PACK_PAIRS } from './spy/words'
import type { BotLevel } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

type Case = {
  name: string
  id: string
  n: number
  options?: Record<string, unknown>
  over: (s: Any) => boolean
  /** aksi yang di app dikirim View host (jam, lanjut layar) */
  host?: (s: Any, now: number, mem: Record<string, unknown>) => Any
}

const LEVELS: BotLevel[] = [1, 2, 3]
const MAX_STEPS = 60000

/**
 * Meniru useBots dengan jam tiruan: semua kursi bot, tiap kursi paling banyak satu aksi
 * terjadwal yang tidak dibatalkan saat state berubah.
 */
function simulate(c: Case, level: BotLevel, seed: number) {
  const game = gameById(c.id)!
  const rnd = lcg(seed)
  const seats = Array.from({ length: c.n }, (_, i) => i)
  let s = game.init(seed, { ...c.options, players: c.n, botSeats: seats })
  const mems = seats.map(() => ({}))
  const hostMem = {}
  const pending: ({ at: number; action: Any } | null)[] = seats.map(() => null)
  const rejects = seats.map(() => 0)
  let now = 1000

  const plan = () => {
    for (const seat of seats) {
      if (pending[seat] || rejects[seat] >= 3) continue
      const m = game.bot!({ state: s, seat, level, rnd, mem: mems[seat], now })
      if (m) pending[seat] = { at: now + m.delay, action: m.action }
    }
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    if (c.over(s)) return { state: s, steps: step }
    const hosted = c.host?.(s, now, hostMem)
    if (hosted) {
      const next = game.reduce(s, hosted, 0)
      if (next !== s) {
        s = next
        rejects.fill(0)
      }
    }
    plan()
    const live = seats.filter((i) => pending[i])
    if (!live.length) {
      now += 1000
      continue
    }
    const seat = live.reduce((a, b) => (pending[b]!.at < pending[a]!.at ? b : a))
    const { at, action } = pending[seat]!
    pending[seat] = null
    now = Math.max(now, at)
    const next = game.reduce(s, action, seat)
    if (next === s) rejects[seat]++
    else {
      s = next
      rejects.fill(0)
    }
  }
  throw new Error(`${c.name} level ${level} seed ${seed} macet: ${JSON.stringify({ phase: s.phase, turn: s.turn, rejects })}`)
}

/** Lewat `ms` sejak `key` terakhir berubah? */
function after(mem: Record<string, Any>, key: Any, now: number, ms: number) {
  if (mem.key !== key) {
    mem.key = key
    mem.at = now
  }
  return now - mem.at >= ms
}

/** Meniru jam di BomBoard: lanjut layar, tutup protes, ledakkan sumbu. */
function bomHost(s: Any, now: number, mem: Record<string, Any>) {
  if (s.phase === 'intro' || s.phase === 'boom') return after(mem, `p${s.phaseId}`, now, 3000) ? { type: 'next' } : null
  if (s.review && after((mem.review ??= {}), s.review.id, now, 6000)) return { type: 'closeReview', id: s.review.id }
  return s.phase === 'live' && after((mem.fuse ??= {}), s.fuseId, now, s.fuse) ? { type: 'boom', fuseId: s.fuseId } : null
}

/** Meniru jam di SpyBoard. */
function spyHost(s: Any, now: number, mem: Record<string, Any>) {
  const limit = { role: 20000, clue: s.opts.seconds * 1000, vote: 40000, guess: 30000, out: 6000, roundEnd: 10000 }[s.phase as string]
  if (limit === undefined || !after(mem, s.phaseId, now, limit)) return null
  return s.phase === 'clue' || s.phase === 'vote' || s.phase === 'guess' ? { type: 'timeUp' } : { type: 'next' }
}

/** Meniru jam di DrawBoard. */
function drawHost(s: Any, now: number, mem: Record<string, Any>) {
  if (s.phase === 'choose' || s.phase === 'draw') return after(mem, s.phaseId, now, s.phase === 'choose' ? 15000 : s.opts.seconds * 1000) ? { type: 'timeUp' } : null
  return s.phase === 'reveal' && after(mem, s.phaseId, now, 7000) ? { type: 'next' } : null
}

const nextRound = (s: Any) => (s.roundWinner !== null && s.gameWinner === null ? { type: 'nextRound' } : null)
const nextOnRoundEnd = (s: Any) => (s.phase === 'roundEnd' ? { t: 'next' } : null)
const ended = (s: Any) => s.phase === 'end'
const house = { stacking: false, sevenZero: false, jumpIn: false, drawToMatch: false, forcePlay: false, noChallenge: false }

const cardCases: Case[] = [
  ...(['classic', 'flip', 'noMercy'] as const).flatMap((variant) => [
    { name: `UNO ${variant} 2 pemain`, id: 'uno', n: 2, options: { variant, house, target: 200 }, over: (s: Any) => s.gameWinner !== null, host: nextRound },
    { name: `UNO ${variant} 5 pemain`, id: 'uno', n: 5, options: { variant, house, target: 200 }, over: (s: Any) => s.gameWinner !== null, host: nextRound },
  ]),
  {
    name: 'UNO semua aturan rumah',
    id: 'uno',
    n: 4,
    options: { variant: 'classic', house: { ...house, stacking: true, sevenZero: true, drawToMatch: true, forcePlay: true }, target: 200 },
    over: (s) => s.gameWinner !== null,
    host: nextRound,
  },
  ...(['gaple', 'cangkul', 'lima', 'qiuqiu'] as const).flatMap((mode) => [
    { name: `Domino ${mode} 2 pemain`, id: 'domino', n: 2, options: { mode, rounds: 3, hands: 5 }, over: ended, host: nextOnRoundEnd },
    { name: `Domino ${mode} 4 pemain`, id: 'domino', n: 4, options: { mode, rounds: 3, hands: 5 }, over: ended, host: nextOnRoundEnd },
  ]),
  ...(['cangkulan', 'bigtwo', 'remi41', 'poker', 'joker', 'bohong', 'blackjack', 'seven'] as const).flatMap((mode) => [
    { name: `Remi ${mode} 2 pemain`, id: 'remi', n: 2, options: { mode, rounds: 3, hands: 5 }, over: ended, host: nextOnRoundEnd },
    { name: `Remi ${mode} 4 pemain`, id: 'remi', n: 4, options: { mode, rounds: 3, hands: 5 }, over: ended, host: nextOnRoundEnd },
  ]),
]

const cases: Case[] = [
  ...cardCases,
  { name: 'Ludo 2 pemain', id: 'ludo', n: 2, over: (s) => s.phase === 'end' },
  { name: 'Ludo tim 4 pemain + petak jahil', id: 'ludo', n: 4, options: { teams: true, specials: true }, over: (s) => s.phase === 'end' },
  { name: 'Ludo 8 pemain', id: 'ludo', n: 8, options: { arms: 8, pieces: 2 }, over: (s) => s.phase === 'end' },
  { name: 'Monopoli 2 pemain', id: 'monopoly', n: 2, options: { end: 'rounds', rounds: 15 }, over: (s) => s.phase === 'end' },
  { name: 'Monopoli 6 pemain 25 putaran', id: 'monopoly', n: 6, options: { end: 'rounds', rounds: 25, trade: true, auction: true }, over: (s) => s.phase === 'end' },
  { name: 'Monopoli 3 pemain sampai bangkrut', id: 'monopoly', n: 3, options: { end: 'bankrupt', trade: true, auction: true }, over: (s) => s.phase === 'end' },
  { name: 'Ular Tangga 2 pemain', id: 'snakes', n: 2, over: (s) => s.winner !== null },
  { name: 'Ular Tangga 5 pemain', id: 'snakes', n: 5, over: (s) => s.winner !== null },
  { name: 'Bom kategori 2 pemain', id: 'bom', n: 2, options: { mode: 'kategori', lives: 2 }, over: ended, host: bomHost },
  { name: 'Bom kategori 4 pemain', id: 'bom', n: 4, options: { mode: 'kategori', lives: 2, aim: true }, over: ended, host: bomHost },
  { name: 'Bom bebas', id: 'bom', n: 3, options: { mode: 'bebas', lives: 1 }, over: ended, host: bomHost },
  { name: 'Bom suku kata', id: 'bom', n: 4, options: { mode: 'suku', lives: 2 }, over: ended, host: bomHost },
  { name: 'Bom sambung kata', id: 'bom', n: 4, options: { mode: 'sambung', lives: 2 }, over: ended, host: bomHost },
  { name: 'Mata-mata kata 3 pemain', id: 'spy', n: 3, options: { mode: 'kata', rounds: 3 }, over: ended, host: spyHost },
  { name: 'Mata-mata kata + Mr. White 6 pemain', id: 'spy', n: 6, options: { mode: 'kata', rounds: 3, mrWhite: true }, over: ended, host: spyHost },
  { name: 'Mata-mata lokasi 5 pemain', id: 'spy', n: 5, options: { mode: 'lokasi', rounds: 3 }, over: ended, host: spyHost },
  { name: 'Tebak Gambar 2 pemain', id: 'draw', n: 2, options: { rounds: 2, seconds: 60 }, over: ended, host: drawHost },
  { name: 'Tebak Gambar 6 pemain', id: 'draw', n: 6, options: { rounds: 4, seconds: 60 }, over: ended, host: drawHost },
]

describe('semua kursi bot: game selalu tamat', () => {
  for (const c of cases) {
    for (const level of LEVELS) {
      it(`${c.name}, level ${level}`, { timeout: 60000 }, () => {
        for (const seed of [11, 222]) expect(simulate(c, level, seed).steps).toBeGreaterThan(0)
      })
    }
  }
})

/** Keputusan satu kursi dengan RNG tetap. */
function decide(id: string, state: Any, seat: number, level: BotLevel = 3) {
  return gameById(id)!.bot!({ state, seat, level, rnd: lcg(7), mem: {}, now: 1000 })?.action
}

/** Kartu lawan ditukar dengan kartu dari tumpukan tertutup; jumlahnya tetap sama. */
function swapHidden(hands: Any[][], rest: Any[], seat: number) {
  const pool = [...rest]
  return hands.map((h, i) => (i === seat ? h : h.map((c) => pool.shift() ?? c)))
}

describe('bot tidak mengintip', () => {
  it('UNO: kartu lawan tidak memengaruhi keputusan', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = gameById('uno')!.init(seed, { variant: 'classic', house, target: 500, players: 3 })
      const seat = s.pending?.by ?? s.pending?.victim ?? s.turn
      expect(decide('uno', { ...s, hands: swapHidden(s.hands, s.deck, seat) }, seat)).toEqual(decide('uno', s, seat))
    }
  })

  it.each(['cangkulan', 'bigtwo', 'remi41', 'poker', 'bohong', 'seven'])('Remi %s: kartu lawan tidak memengaruhi keputusan', (mode) => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = gameById('remi')!.init(seed, { mode, rounds: 3, hands: 5, players: 3 })
      const seat = s.m.turn
      const m = { ...s.m, hands: swapHidden(s.m.hands, s.m.deck ?? [...s.m.hands[seat]].reverse(), seat) }
      expect(decide('remi', { ...s, m }, seat)).toEqual(decide('remi', s, seat))
    }
  })

  it('Domino: tangan lawan & tumpukan tidak memengaruhi keputusan', () => {
    for (const mode of ['gaple', 'cangkul', 'qiuqiu']) {
      for (let seed = 1; seed <= 20; seed++) {
        const s = gameById('domino')!.init(seed, { mode, rounds: 3, hands: 5, players: 3 })
        const seat = s.m.turn
        const m = { ...s.m, hands: swapHidden(s.m.hands, s.m.bone, seat) }
        expect(decide('domino', { ...s, m }, seat)).toEqual(decide('domino', s, seat))
      }
    }
  })

  it('Mata-mata: peran & jawaban orang lain tidak memengaruhi petunjuk', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = { ...gameById('spy')!.init(seed, { mode: 'kata', rounds: 3, players: 5, mrWhite: true }), phase: 'clue' }
      const seat = s.turn
      const roles = s.roles.map((r: string, i: number) => (i === seat ? r : 'warga'))
      const secret = s.secret.map((w: string, i: number) => (i === seat ? w : 'rahasia'))
      const hidden = { ...s, roles, secret, answer: 'x', decoy: 'y' }
      expect(decide('spy', hidden, seat)).toEqual(decide('spy', s, seat))
    }
  })
})

describe('bahan bot lengkap', () => {
  it('semua kategori Bom Waktu punya bank kata', () => {
    for (const c of CATEGORIES) expect(CATEGORY_WORDS[c]?.length, c).toBeGreaterThanOrEqual(20)
    for (const words of Object.values(CATEGORY_WORDS)) for (const w of words) expect(w.length).toBeLessThanOrEqual(WORD_MAX)
  })

  it('kata umum menutup semua suku kata & huruf awal', () => {
    for (const syl of SYLLABLES) expect(GENERAL_WORDS.filter((w) => w.includes(syl.toLowerCase())).length, syl).toBeGreaterThanOrEqual(5)
    for (const ch of 'abcdefghijklmnoprstuwyz') expect(GENERAL_WORDS.some((w) => w.startsWith(ch)), ch).toBe(true)
  })

  it('semua pasangan kata Mata-mata punya petunjuk yang boleh dipakai', () => {
    const state = (word: string) => ({ secret: [word] }) as Any
    for (const pair of Object.values(PACK_PAIRS).flat()) {
      for (const word of pair) {
        const k = WORD_CLUES.get(normalize(word))
        expect(k, word).toBeDefined()
        expect([...k!.shared, ...k!.own].filter((c) => !clueProblem(state(word), 0, c)).length, word).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('semua lokasi punya petunjuk yang boleh dipakai', () => {
    for (const l of LOCATIONS) {
      const clues = LOCATION_CLUES[l.name]
      expect(clues?.length, l.name).toBeGreaterThanOrEqual(4)
      for (const c of clues) expect(clueProblem({ secret: [l.name] } as Any, 0, c), `${l.name}: ${c}`).toBeNull()
    }
  })

  it('semua sketsa lolos pemeriksaan coretan engine', () => {
    expect(SKETCH_WORDS.length).toBeGreaterThanOrEqual(30)
    for (const { word, level } of SKETCH_WORDS) {
      const base = gameById('draw')!.init(1, { players: 2 })
      let s = { ...base, phase: 'draw', word, level, choices: [] }
      const strokes = sketchStrokes(word)
      expect(strokes.length, word).toBeGreaterThan(0)
      for (const stroke of strokes) {
        const next = gameById('draw')!.reduce(s, { type: 'stroke', s: stroke }, s.drawer)
        expect(next, word).not.toBe(s)
        s = next
      }
    }
  })
})

describe('bot & aturan khusus', () => {
  it('Ular Tangga: bot boleh menutup tantangannya sendiri, manusia tidak', () => {
    const base = gameById('snakes')!.init(3, { players: 2, botSeats: [1] })
    const judge = { type: 'judge', ok: true }
    const pending = { kind: 'judge', deck: 'truth', i: 0 }
    const botTurn = { ...base, turn: 1, pos: [10, 10], pending }
    expect(gameById('snakes')!.reduce(botTurn, judge, 1)).not.toBe(botTurn)
    const humanTurn = { ...base, turn: 0, pos: [10, 10], pending }
    expect(gameById('snakes')!.reduce(humanTurn, judge, 0)).toBe(humanTurn)
  })

  it('Tebak Gambar: giliran bot hanya menawarkan kata bersketsa', () => {
    const s = gameById('draw')!.init(5, { players: 2, botSeats: [0] })
    expect(s.choices).toHaveLength(3)
    for (const c of s.choices) expect(SKETCH_WORDS.some((w) => w.word === c.word)).toBe(true)
  })
})
