import { normalize } from '../draw/engine'
import { nextRand } from '../rng'
import type { Seat } from '../types'
import type { BomAction, BomOptions, BomState, Power, Prompt, Speed } from './types'
import { CATEGORIES, LETTERS, SYLLABLES } from './words'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
export const WORD_MAX = 24
/** rentang sumbu acak (detik) per kecepatan */
export const FUSE_RANGE: Record<Speed, [number, number]> = { santai: [25, 60], normal: [15, 45], panik: [10, 25] }
/** sumbu tidak pernah lebih pendek dari ini (ms), walau dipotong Sumbu Pendek */
export const MIN_FUSE = 4000
/** Sumbu Pendek memotong sumbu sebanyak ini (ms) */
export const CUT_MS = 5000
/** tiap ledakan, sumbu berikutnya dikali (1 - FASTER_STEP), paling pendek FASTER_MIN kali semula */
export const FASTER_STEP = 0.1
export const FASTER_MIN = 0.5
/** kata sepanjang ini (huruf) dapat power-up bonus */
export const LONG_WORD = 8
export const MAX_POWERS = 3
/** masa protes setelah kata diterima, dan jeda layar ledakan (detik) */
export const REVIEW_SECONDS = 6
export const BOOM_SECONDS = 5
export const POWERS: Power[] = ['balik', 'lompat', 'pendek']
const LOG_MAX = 14

export { normalize }

export function defaultOptions(players = 4): BomOptions {
  return { players, mode: 'kategori', lives: 3, speed: 'normal', powerups: true, protest: true, aim: false, faster: true }
}

export function init(seed: number, options?: Partial<BomOptions>): BomState {
  const opts = { ...defaultOptions(), ...options }
  const n = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, opts.players))
  const o = { ...opts, players: n }
  const st: BomState = {
    opts: o,
    rng: seed,
    phase: 'intro',
    round: 1,
    lives: Array(n).fill(o.lives),
    alive: Array(n).fill(true),
    holder: 0,
    from: null,
    prompt: {},
    category: '',
    aiming: false,
    fuse: 0,
    fuseId: 0,
    turnId: 0,
    used: [],
    log: [],
    review: null,
    reviewSeq: 0,
    powers: Array.from({ length: n }, () => []),
    booms: 0,
    lastBoom: null,
    outOrder: [],
    words: Array(n).fill(0),
    event: null,
    phaseId: 0,
    winner: null,
  }
  st.holder = Math.floor(rand(st) * n)
  if (o.powerups) st.powers = st.powers.map(() => [pick(st, POWERS)])
  setupRound(st)
  return st
}

/* ---------- helper murni untuk UI & tes ---------- */

export const aliveSeats = (s: BomState) => s.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0)

/** kursi hidup berikutnya; dir = -1 untuk berlawanan arah */
export function nextAlive(s: BomState, from: Seat, dir: 1 | -1 = 1): Seat {
  const n = s.opts.players
  for (let i = 1; i <= n; i++) {
    const k = (((from + dir * i) % n) + n) % n
    if (s.alive[k]) return k
  }
  return from
}

/** rentang sumbu ronde berikutnya (detik), sudah memperhitungkan "makin cepat" */
export function fuseRange(o: BomOptions, booms: number): [number, number] {
  const [lo, hi] = FUSE_RANGE[o.speed]
  const k = o.faster ? Math.max(FASTER_MIN, 1 - FASTER_STEP * booms) : 1
  return [lo * k, hi * k]
}

/** Alasan kata ditolak, atau null kalau boleh. Kategorinya sendiri dinilai pemain lain lewat protes. */
export function wordProblem(s: BomState, by: Seat, text: string): string | null {
  if (s.phase !== 'live' || by !== s.holder || s.aiming) return 'Bukan giliranmu pegang bom.'
  const t = text.trim()
  if (!t) return 'Ketik katanya dulu.'
  if (t.length > WORD_MAX) return `Maksimal ${WORD_MAX} huruf.`
  const w = normalize(t)
  if (!/^[a-z]+$/.test(w)) return w ? 'Huruf saja, tanpa angka.' : 'Pakai huruf, bukan cuma simbol.'
  if (w.length < 2) return 'Kependekan!'
  const p = s.prompt
  if (p.letter && w[0] !== p.letter.toLowerCase()) return `Harus diawali huruf ${p.letter}.`
  if (p.syllable) {
    const syl = p.syllable.toLowerCase()
    if (!w.includes(syl)) return `Harus ada "${p.syllable}" di dalamnya.`
    if (w === syl) return 'Itu mah potongannya doang.'
  }
  if (s.used.includes(w)) return 'Kata itu udah dipakai!'
  return null
}

/** boleh menekan "Ngawur!" untuk kata yang sedang ditinjau? (bukan penulis & bukan pemegang bom) */
export const canProtest = (s: BomState, by: Seat) =>
  s.opts.protest && s.phase === 'live' && !!s.review && s.alive[by] && by !== s.review.by && by !== s.holder && !s.review.votes.includes(by)

/** jumlah pemain yang berhak protes & ambang suara pembatalan (mayoritas) */
export function protestNeed(s: BomState): { voters: number; need: number } {
  if (!s.review) return { voters: 0, need: 0 }
  const by = s.review.by
  const voters = aliveSeats(s).filter((i) => i !== by && i !== s.holder).length
  return { voters, need: Math.floor(voters / 2) + 1 }
}

/** boleh memakai power-up ini sekarang? */
export function canPower(s: BomState, by: Seat, p: Power): boolean {
  if (!s.opts.powerups || s.phase !== 'live' || !s.alive[by] || !s.powers[by]?.includes(p)) return false
  if (p === 'pendek') return by !== s.holder && s.fuse > MIN_FUSE
  if (by !== s.holder) return false
  if (p === 'balik') return passBackTarget(s) !== s.holder
  return aliveSeats(s).length > 2
}

/** Lempar Balik: ke pengoper terakhir, atau kursi hidup sebelumnya */
export const passBackTarget = (s: BomState): Seat => (s.from !== null && s.alive[s.from] && s.from !== s.holder ? s.from : nextAlive(s, s.holder, -1))

/** sasaran yang boleh dipilih di mode pilih arah */
export const canAim = (s: BomState, by: Seat, target: Seat) => s.phase === 'live' && s.aiming && by === s.holder && s.alive[target] && target !== by

/** teks tantangan untuk ditampilkan */
export function promptText(p: Prompt): string {
  const parts: string[] = []
  if (p.category) parts.push(p.category)
  if (p.letter) parts.push(`huruf ${p.letter}`)
  if (p.syllable) parts.push(`ada "${p.syllable}"`)
  return parts.join(' · ')
}

/* ---------- mesin ---------- */

function rand(st: BomState): number {
  const [r, s] = nextRand(st.rng)
  st.rng = s
  return r
}

function pick<T>(st: BomState, xs: readonly T[]): T {
  return xs[Math.floor(rand(st) * xs.length)]
}

function bump(st: BomState) {
  st.phaseId += 1
}

/** tantangan baru untuk pemegang bom, mengikuti mode */
function makePrompt(st: BomState, lastWord?: string): Prompt {
  switch (st.opts.mode) {
    case 'kategori':
      return { category: st.category, letter: pick(st, LETTERS) }
    case 'bebas':
      return { category: st.category }
    case 'suku': {
      let syl = pick(st, SYLLABLES)
      if (syl === st.prompt.syllable) syl = pick(st, SYLLABLES)
      return { syllable: syl }
    }
    case 'sambung': {
      const last = lastWord ? lastWord[lastWord.length - 1].toUpperCase() : ''
      return { letter: last && /[A-Z]/.test(last) ? last : pick(st, LETTERS) }
    }
  }
}

/** siapkan ronde: kategori, sumbu acak, tantangan pertama */
function setupRound(st: BomState) {
  if (st.opts.mode === 'kategori' || st.opts.mode === 'bebas') {
    let c = pick(st, CATEGORIES)
    if (c === st.category) c = pick(st, CATEGORIES)
    st.category = c
  }
  const [lo, hi] = fuseRange(st.opts, st.booms)
  st.fuse = Math.round((lo + rand(st) * (hi - lo)) * 1000)
  st.from = null
  st.aiming = false
  st.review = null
  st.event = null
  st.prompt = {}
  st.prompt = makePrompt(st)
}

function startRound(st: BomState): BomState {
  st.phase = 'live'
  st.fuseId += 1
  st.turnId += 1
  bump(st)
  return st
}

function passTo(st: BomState, target: Seat, lastWord?: string) {
  st.from = st.holder
  st.holder = target
  st.aiming = false
  st.prompt = makePrompt(st, lastWord)
  st.turnId += 1
}

function giveRandomPower(st: BomState, by: Seat): Power | null {
  if (st.powers[by].length >= MAX_POWERS) return null
  const p = pick(st, POWERS)
  st.powers = st.powers.map((ps, i) => (i === by ? [...ps, p] : ps))
  return p
}

function explode(st: BomState): BomState {
  const h = st.holder
  st.lives[h] = Math.max(0, st.lives[h] - 1)
  st.booms += 1
  st.lastBoom = h
  st.review = null
  st.aiming = false
  if (st.lives[h] === 0) {
    st.alive[h] = false
    st.outOrder = [...st.outOrder, h]
  }
  const left = aliveSeats(st)
  if (left.length <= 1) {
    st.winner = left[0] ?? h
    st.phase = 'end'
  } else st.phase = 'boom'
  bump(st)
  return st
}

const copy = (s: BomState): BomState => ({
  ...s,
  lives: [...s.lives],
  alive: [...s.alive],
  words: [...s.words],
})

export function reduce(s: BomState, a: BomAction, by: Seat): BomState {
  if (a.type === 'again') return s.phase === 'end' ? init(s.rng, s.opts) : s
  if (s.phase === 'end') return s

  switch (a.type) {
    case 'next': {
      if (by !== 0) return s
      if (s.phase === 'intro') return startRound(copy(s))
      if (s.phase === 'boom') {
        const st = copy(s)
        st.round += 1
        st.holder = nextAlive(st, st.lastBoom ?? st.holder)
        setupRound(st)
        return startRound(st)
      }
      return s
    }

    case 'word': {
      if (typeof a.text !== 'string' || wordProblem(s, by, a.text)) return s
      const st = copy(s)
      const word = a.text.trim().replace(/\s+/g, ' ')
      const key = normalize(word)
      st.used = [...st.used, key]
      st.words[by] += 1
      st.log = [...st.log, { by, word, round: st.round, ok: true }].slice(-LOG_MAX)
      st.reviewSeq += 1
      st.review = st.opts.protest ? { id: st.reviewSeq, by, word, key, prompt: s.prompt, from: s.from, votes: [] } : null
      if (st.opts.powerups && key.length >= LONG_WORD) {
        const p = giveRandomPower(st, by)
        if (p) st.event = { id: (st.event?.id ?? 0) + 1, kind: 'gift', by, power: p }
      }
      if (st.opts.aim && aliveSeats(st).length > 2) {
        st.aiming = true
        return st
      }
      passTo(st, nextAlive(st, by), key)
      return st
    }

    case 'aim': {
      if (!canAim(s, by, a.target)) return s
      const st = copy(s)
      passTo(st, a.target, normalize(st.log.findLast((l) => l.by === by && l.ok)?.word ?? ''))
      return st
    }

    case 'power': {
      if (!canPower(s, by, a.power)) return s
      const st = copy(s)
      const ps = [...st.powers[by]]
      ps.splice(ps.indexOf(a.power), 1)
      st.powers = st.powers.map((x, i) => (i === by ? ps : x))
      let to: Seat | null = null
      if (a.power === 'pendek') st.fuse = Math.max(MIN_FUSE, st.fuse - CUT_MS)
      else {
        to = a.power === 'balik' ? passBackTarget(st) : nextAlive(st, nextAlive(st, by))
        // tanpa mengetik: tantangan untuk penerima tetap dibuat baru (sambung: huruf yang sama)
        const keep = st.opts.mode === 'sambung' ? st.prompt.letter : undefined
        passTo(st, to)
        if (keep) st.prompt = { letter: keep }
      }
      st.event = { id: (st.event?.id ?? 0) + 1, kind: 'power', by, power: a.power, to }
      return st
    }

    case 'protest': {
      if (!s.review || a.id !== s.review.id || !canProtest(s, by)) return s
      const st = copy(s)
      const r = { ...s.review, votes: [...s.review.votes, by] }
      st.review = r
      if (r.votes.length < protestNeed(st).need) return st
      // dibatalkan: kata dicoret, bom kembali ke penulisnya dengan tantangan yang sama
      st.used = st.used.filter((w) => w !== r.key)
      st.words[r.by] = Math.max(0, st.words[r.by] - 1)
      const idx = st.log.findLastIndex((l) => l.by === r.by && l.word === r.word && l.ok)
      if (idx >= 0) st.log = st.log.map((l, i) => (i === idx ? { ...l, ok: false } : l))
      st.holder = r.by
      st.from = r.from
      st.prompt = r.prompt
      st.aiming = false
      st.review = null
      st.turnId += 1
      st.event = { id: (st.event?.id ?? 0) + 1, kind: 'cancel', by: r.by, word: r.word }
      return st
    }

    case 'closeReview': {
      if (by !== 0 || !s.review || s.review.id !== a.id) return s
      return { ...s, review: null }
    }

    case 'boom': {
      // jam dipegang host supaya semua HP sepakat kapan bom meledak
      if (by !== 0 || s.phase !== 'live' || a.fuseId !== s.fuseId) return s
      return explode(copy(s))
    }
  }
  return s
}
