import { nextRand, shuffle } from '../rng'
import type { Seat } from '../types'
import { PACK_WORDS, type WordEntry } from './words'
import type { DrawAction, DrawOptions, DrawState, FeedItem, Level, Stroke } from './types'

/** Warna krayon; indeks dipakai di Stroke.c. Penghapus = -1 (warna kertas). */
export const INKS = ['#121212', '#ff37a6', '#43b929', '#2f7bff', '#ffcc1f', '#ff8a1c', '#8a55ff', '#8b5a2b']
export const WIDTHS = [6, 14, 30]
/** Kanvas logis 1000 x 750 (4:3). */
export const CANVAS = { w: 1000, h: 750 }
/** Poin penebak berdasarkan urutan benar. */
export const GUESS_POINTS = [10, 8, 7, 6, 5, 4, 3]
/** Poin drawer untuk tiap penebak yang benar. */
export const DRAWER_POINTS = 3
/** Bonus kata susah (per tingkat di atas gampang). */
export const LEVEL_BONUS = 2
/** Waktu memilih kata (detik). */
export const CHOOSE_SECONDS = 15
/** Jeda layar reveal sebelum host otomatis lanjut (detik). */
export const REVEAL_SECONDS = 7

const MAX_FEED = 40
const MAX_POINTS = 24000
const MAX_CHUNK = 600

export function defaultOptions(): DrawOptions {
  return { players: 2, rounds: 3, seconds: 80, packs: ['umum', 'lokal', 'pasangan'], custom: [], hints: true }
}

function pool(opts: DrawOptions): WordEntry[] {
  const words = opts.packs.flatMap((p) => PACK_WORDS[p] ?? [])
  const custom = opts.custom.map((word) => ({ word, level: 2 as Level }))
  const all = [...words, ...custom]
  return all.length ? all : PACK_WORDS.umum
}

export function init(seed: number, options?: Partial<DrawOptions>): DrawState {
  const opts = { ...defaultOptions(), ...options }
  const n = Math.max(2, opts.players)
  const [deck, s] = shuffle(pool(opts), seed)
  const st: DrawState = {
    opts: { ...opts, players: n },
    rng: s,
    round: 1,
    drawer: 0,
    phase: 'choose',
    choices: [],
    word: '',
    level: 1,
    strokes: [],
    guessed: [],
    scores: Array(n).fill(0),
    gained: Array(n).fill(0),
    feed: [],
    feedId: 0,
    phaseId: 1,
    hintOrder: [],
    reason: null,
    deck,
    winners: null,
  }
  return deal(st)
}

/* ---------- helper murni untuk UI & tes ---------- */

/** huruf kecil, tanpa tanda baca & spasi: "Kupu-kupu " → "kupukupu" */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** jarak edit Levenshtein, dibatasi untuk kata pendek */
export function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

export function isCorrect(guess: string, word: string) {
  const g = normalize(guess)
  return g.length > 0 && g === normalize(word)
}

/** nyaris: beda 1 huruf (atau 2 untuk kata panjang) */
export function isClose(guess: string, word: string) {
  const g = normalize(guess)
  const w = normalize(word)
  if (g.length < 3 || g === w) return false
  return distance(g, w) <= (w.length >= 8 ? 2 : 1)
}

/** berapa huruf dibuka sebagai petunjuk, dari 0..1 waktu yang sudah lewat */
export function hintCount(s: DrawState, elapsed: number): number {
  if (!s.opts.hints) return 0
  const letters = s.hintOrder.length
  const max = Math.max(0, Math.floor(letters * 0.4))
  if (elapsed < 0.5) return 0
  return Math.min(max, Math.floor(((elapsed - 0.5) / 0.45) * max) + 1)
}

/** kata dengan huruf tertutup "_" kecuali `open` huruf pertama di hintOrder; spasi & tanda hubung tetap terlihat */
export function maskWord(word: string, hintOrder: number[], open: number): string[] {
  const shown = new Set(hintOrder.slice(0, open))
  return [...word].map((ch, i) => (/[a-z0-9]/i.test(ch) ? (shown.has(i) ? ch : '_') : ch))
}

export const totalTurns = (s: DrawState) => s.opts.rounds * s.opts.players
export const turnNo = (s: DrawState) => (s.round - 1) * s.opts.players + s.drawer + 1
export const canGuess = (s: DrawState, seat: Seat) => s.phase === 'draw' && seat !== s.drawer && !s.guessed.includes(seat)

/* ---------- mesin ---------- */

function rand(st: DrawState, n: number): number {
  const [r, s] = nextRand(st.rng)
  st.rng = s
  return Math.floor(r * n)
}

/** ambil satu kata dari deck; tingkat yang diminta diutamakan */
function takeWord(st: DrawState, level: Level): { word: string; level: Level } {
  if (st.deck.length === 0) {
    const [fresh, s] = shuffle(pool(st.opts), st.rng)
    st.rng = s
    st.deck = fresh
  }
  const i = st.deck.findIndex((w) => w.level === level)
  const [w] = st.deck.splice(i === -1 ? st.deck.length - 1 : i, 1)
  return w
}

type NewFeed = { [K in FeedItem['t']]: Omit<Extract<FeedItem, { t: K }>, 'id'> }[FeedItem['t']]

function push(st: DrawState, item: NewFeed) {
  st.feedId += 1
  st.feed = [...st.feed, { ...item, id: st.feedId } as FeedItem].slice(-MAX_FEED)
}

/** mulai giliran baru untuk st.drawer: siapkan 3 pilihan kata */
function deal(st: DrawState): DrawState {
  st.deck = [...st.deck]
  const used = new Set<string>()
  const choices: { word: string; level: Level }[] = []
  for (const lv of [1, 2, 3] as Level[]) {
    let w = takeWord(st, lv)
    // hindari kata kembar di pilihan (mis. kata custom sama dengan kata paket)
    for (let k = 0; k < 3 && used.has(normalize(w.word)); k++) w = takeWord(st, lv)
    used.add(normalize(w.word))
    choices.push(w)
  }
  st.choices = choices
  st.phase = 'choose'
  st.word = ''
  st.strokes = []
  st.guessed = []
  st.gained = Array(st.opts.players).fill(0)
  st.reason = null
  st.hintOrder = []
  st.phaseId += 1
  push(st, { t: 'turn', by: st.drawer })
  return st
}

function pick(st: DrawState, i: number): DrawState {
  const c = st.choices[i]
  if (!c) return st
  st.word = c.word
  st.level = c.level
  st.choices = []
  st.phase = 'draw'
  st.phaseId += 1
  const letters = [...c.word].map((ch, k) => (/[a-z0-9]/i.test(ch) ? k : -1)).filter((k) => k >= 0)
  // urutan acak huruf petunjuk; huruf pertama dibuka belakangan supaya tidak terlalu gampang
  const order = [...letters]
  for (let k = order.length - 1; k > 0; k--) {
    const j = rand(st, k + 1)
    ;[order[k], order[j]] = [order[j], order[k]]
  }
  st.hintOrder = order
  return st
}

function reveal(st: DrawState, reason: DrawState['reason']): DrawState {
  st.phase = 'reveal'
  st.reason = reason
  st.phaseId += 1
  return st
}

function advance(st: DrawState): DrawState {
  const n = st.opts.players
  if (st.drawer + 1 < n) {
    st.drawer += 1
    return deal(st)
  }
  if (st.round < st.opts.rounds) {
    st.round += 1
    st.drawer = 0
    return deal(st)
  }
  const top = Math.max(...st.scores)
  st.winners = st.scores.map((p, i) => (p === top ? i : -1)).filter((i) => i >= 0)
  st.phase = 'end'
  st.phaseId += 1
  return st
}

function validStroke(s: Stroke): boolean {
  if (!s || !Array.isArray(s.pts) || s.pts.length < 2 || s.pts.length % 2 || s.pts.length > MAX_CHUNK) return false
  if (!Number.isInteger(s.g) || !Number.isInteger(s.c) || s.c < -1 || s.c >= INKS.length) return false
  if (!Number.isInteger(s.w) || s.w < 0 || s.w >= WIDTHS.length) return false
  return s.pts.every((v, i) => Number.isInteger(v) && v >= 0 && v <= (i % 2 ? CANVAS.h : CANVAS.w))
}

const copy = (s: DrawState): DrawState => ({ ...s, scores: [...s.scores], gained: [...s.gained], guessed: [...s.guessed] })

export function reduce(s: DrawState, a: DrawAction, by: Seat): DrawState {
  if (a.type === 'again') return s.phase === 'end' ? init(s.rng, s.opts) : s
  if (s.phase === 'end') return s

  switch (a.type) {
    case 'pick':
      if (s.phase !== 'choose' || by !== s.drawer) return s
      return pick(copy(s), a.i)

    case 'stroke': {
      if (s.phase !== 'draw' || by !== s.drawer || !validStroke(a.s)) return s
      const used = s.strokes.reduce((t, x) => t + x.pts.length, 0)
      if (used + a.s.pts.length > MAX_POINTS) return s
      const { g, c, w, pts } = a.s
      return { ...s, strokes: [...s.strokes, { g, c, w, pts }] }
    }

    case 'undo': {
      if (s.phase !== 'draw' || by !== s.drawer || !s.strokes.length) return s
      const last = s.strokes[s.strokes.length - 1].g
      return { ...s, strokes: s.strokes.filter((x) => x.g !== last) }
    }

    case 'clear':
      if (s.phase !== 'draw' || by !== s.drawer || !s.strokes.length) return s
      return { ...s, strokes: [] }

    case 'guess': {
      const text = typeof a.text === 'string' ? a.text.trim().slice(0, 40) : ''
      if (!text || !canGuess(s, by)) return s
      const st = copy(s)
      if (isCorrect(text, s.word)) {
        const bonus = (s.level - 1) * LEVEL_BONUS
        const pts = (GUESS_POINTS[st.guessed.length] ?? GUESS_POINTS[GUESS_POINTS.length - 1]) + bonus
        st.guessed.push(by)
        st.scores[by] += pts
        st.gained[by] += pts
        st.scores[s.drawer] += DRAWER_POINTS + bonus
        st.gained[s.drawer] += DRAWER_POINTS + bonus
        push(st, { t: 'correct', by, points: pts })
        if (st.guessed.length >= st.opts.players - 1) return reveal(st, 'all')
        return st
      }
      push(st, { t: isClose(text, s.word) ? 'close' : 'guess', by, text })
      return st
    }

    case 'skip':
      if (s.phase !== 'draw' || by !== s.drawer) return s
      return reveal(copy(s), 'skip')

    case 'timeUp':
      // jam dipegang host supaya semua HP sepakat kapan waktu habis
      if (by !== 0) return s
      if (s.phase === 'choose') return pick(copy(s), 0)
      if (s.phase === 'draw') return reveal(copy(s), 'time')
      return s

    case 'next':
      if (by !== 0 || s.phase !== 'reveal') return s
      return advance(copy(s))
  }
  return s
}
