import { distance, normalize } from '../draw/engine'
import { nextRand, shuffle } from '../rng'
import type { Seat } from '../types'
import { LOCATIONS } from './locations'
import type { Clue, Role, RoundResult, SpyAction, SpyOptions, SpyState } from './types'
import { PACK_PAIRS, type WordPair } from './words'

export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 8
/** Mr. White baru seimbang mulai 5 pemain (penyusup + Mr. White < warga) */
export const MR_WHITE_MIN = 5
export const CLUE_MAX = 24
/** Poin akhir ronde. */
export const POINTS = {
  /** tiap warga saat warga menang */
  warga: 2,
  /** tiap penyusup / Mr. White / mata-mata yang masih hidup saat pihaknya menang */
  survive: 5,
  /** Mr. White menebak kata warga */
  mrwhite: 6,
  /** mata-mata menebak lokasi */
  spy: 4,
}
/** Waktu voting, tebakan terakhir, dan jeda layar hasil sebelum host otomatis lanjut (detik). */
export const VOTE_SECONDS = 40
export const GUESS_SECONDS = 30
export const OUT_SECONDS = 6
export const ROUND_SECONDS = 10

export { normalize }

export function defaultOptions(players = 4): SpyOptions {
  return { players, mode: 'kata', rounds: 5, packs: ['umum', 'lokal', 'pasangan'], custom: [], mrWhite: true, seconds: 45 }
}

function pairs(opts: SpyOptions): WordPair[] {
  const all = [...opts.packs.flatMap((p) => PACK_PAIRS[p] ?? []), ...opts.custom]
  return all.length ? all : PACK_PAIRS.umum
}

const poolSize = (opts: SpyOptions) => (opts.mode === 'lokasi' ? LOCATIONS.length : pairs(opts).length)

/** Susunan peran untuk jumlah pemain & pengaturan ini. */
export function roleCounts(opts: SpyOptions): Record<Role, number> {
  const n = opts.players
  if (opts.mode === 'lokasi') return { warga: n - 1, penyusup: 0, mrwhite: 0, spy: 1 }
  const penyusup = n >= 7 ? 2 : 1
  const mrwhite = opts.mrWhite && n >= MR_WHITE_MIN ? 1 : 0
  return { warga: n - penyusup - mrwhite, penyusup, mrwhite, spy: 0 }
}

export function init(seed: number, options?: Partial<SpyOptions>): SpyState {
  const opts = { ...defaultOptions(), ...options }
  const n = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, opts.players))
  const o = { ...opts, players: n }
  const [deck, s] = shuffle(
    Array.from({ length: poolSize(o) }, (_, i) => i),
    seed,
  )
  const st: SpyState = {
    opts: o,
    rng: s,
    round: 1,
    phase: 'role',
    roles: [],
    secret: [],
    jobs: [],
    answer: '',
    decoy: '',
    alive: [],
    ready: [],
    starter: 0,
    turn: 0,
    cycle: 1,
    clues: [],
    votes: [],
    candidates: null,
    tally: Array(n).fill(0),
    lastOut: null,
    spyGuessed: false,
    guessText: '',
    guessOk: null,
    winner: null,
    result: null,
    scores: Array(n).fill(0),
    gained: Array(n).fill(0),
    phaseId: 0,
    deck,
    winners: null,
  }
  return deal(st)
}

/* ---------- helper murni untuk UI & tes ---------- */

const BAD: Role[] = ['penyusup', 'mrwhite', 'spy']
export const isBad = (r: Role) => BAD.includes(r)
export const aliveSeats = (s: SpyState) => s.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0)

/** kursi hidup berikutnya searah jarum jam */
export function nextAlive(s: SpyState, from: Seat): Seat {
  const n = s.opts.players
  for (let i = 1; i <= n; i++) {
    const k = (from + i) % n
    if (s.alive[k]) return k
  }
  return from
}

/** Alasan petunjuk ditolak, atau null kalau boleh. Kata rahasia (atau potongannya) tidak boleh disebut. */
export function clueProblem(s: SpyState, by: Seat, text: string): string | null {
  const t = text.trim()
  if (!t) return 'Isi petunjuknya dulu.'
  if (t.length > CLUE_MAX) return `Maksimal ${CLUE_MAX} huruf.`
  const c = normalize(t)
  if (!c) return 'Pakai huruf, bukan cuma simbol.'
  const w = normalize(s.secret[by] ?? '')
  if (w && (c.includes(w) || (c.length >= 3 && w.includes(c)))) return 'Jangan sebut katanya langsung, dong!'
  return null
}

/** cocokkan tebakan Mr. White (boleh salah ketik 1 huruf untuk kata panjang) / mata-mata */
export function guessMatches(guess: string, answer: string): boolean {
  const g = normalize(guess)
  const a = normalize(answer)
  if (!g) return false
  return g === a || (a.length >= 6 && distance(g, a) <= 1)
}

/** boleh memilih kursi ini di voting? */
export const canVoteFor = (s: SpyState, by: Seat, target: Seat) =>
  s.phase === 'vote' && s.alive[by] && s.alive[target] && target !== by && (!s.candidates || s.candidates.includes(target))

/** mata-mata boleh nekat menebak lokasi sekarang? */
export const canSpyGuess = (s: SpyState, by: Seat) =>
  s.opts.mode === 'lokasi' && s.roles[by] === 'spy' && s.alive[by] && !s.spyGuessed && (s.phase === 'clue' || s.phase === 'vote')

/** siapa yang sedang ditunggu tebakan terakhirnya */
export const guesser = (s: SpyState): Seat | null => (s.phase === 'guess' ? s.lastOut : null)

export const roundClues = (s: SpyState, cycle = s.cycle): Clue[] => s.clues.filter((c) => c.cycle === cycle)

/* ---------- mesin ---------- */

function rand(st: SpyState): number {
  const [r, s] = nextRand(st.rng)
  st.rng = s
  return r
}

function bump(st: SpyState) {
  st.phaseId += 1
}

/** mulai ronde baru: acak peran & kata/lokasi */
function deal(st: SpyState): SpyState {
  const n = st.opts.players
  if (!st.deck.length) {
    const [fresh, s] = shuffle(
      Array.from({ length: poolSize(st.opts) }, (_, i) => i),
      st.rng,
    )
    st.rng = s
    st.deck = fresh
  }
  st.deck = [...st.deck]
  const idx = st.deck.pop()!

  const counts = roleCounts(st.opts)
  const bag: Role[] = (Object.keys(counts) as Role[]).flatMap((r) => Array(counts[r]).fill(r))
  const [roles, s1] = shuffle(bag, st.rng)
  st.rng = s1
  st.roles = roles

  if (st.opts.mode === 'lokasi') {
    const loc = LOCATIONS[idx % LOCATIONS.length]
    const [jobs, s2] = shuffle(loc.jobs, st.rng)
    st.rng = s2
    st.answer = loc.name
    st.decoy = ''
    let k = 0
    st.jobs = roles.map((r) => (r === 'spy' ? '' : jobs[k++ % jobs.length]))
    st.secret = roles.map((r) => (r === 'spy' ? '' : loc.name))
  } else {
    const list = pairs(st.opts)
    const [a, b] = list[idx % list.length]
    const [civ, dec] = rand(st) < 0.5 ? [a, b] : [b, a]
    st.answer = civ
    st.decoy = dec
    st.jobs = Array(n).fill('')
    st.secret = roles.map((r) => (r === 'warga' ? civ : r === 'penyusup' ? dec : ''))
  }

  st.alive = Array(n).fill(true)
  st.ready = Array(n).fill(false)
  st.clues = []
  st.cycle = 1
  st.votes = Array(n).fill(-1)
  st.candidates = null
  st.tally = Array(n).fill(0)
  st.lastOut = null
  st.spyGuessed = false
  st.guessText = ''
  st.guessOk = null
  st.winner = null
  st.result = null
  st.gained = Array(n).fill(0)
  // Mr. White tidak pernah membuka (dia belum punya bahan sama sekali)
  const openers = roles.map((r, i) => (r === 'mrwhite' ? -1 : i)).filter((i) => i >= 0)
  st.starter = openers[Math.floor(rand(st) * openers.length)]
  st.turn = st.starter
  st.phase = 'role'
  bump(st)
  return st
}

function startClues(st: SpyState): SpyState {
  st.phase = 'clue'
  st.turn = st.starter
  bump(st)
  return st
}

function startVote(st: SpyState, candidates: Seat[] | null): SpyState {
  st.phase = 'vote'
  st.votes = Array(st.opts.players).fill(-1)
  st.candidates = candidates
  bump(st)
  return st
}

/** catat petunjuk (kosong = diam/waktu habis) lalu giliran berikutnya; satu putaran penuh → voting */
function giveClue(st: SpyState, text: string): SpyState {
  st.clues = [...st.clues, { by: st.turn, text, cycle: st.cycle }]
  const nt = nextAlive(st, st.turn)
  if (nt === st.starter) return startVote(st, null)
  st.turn = nt
  bump(st)
  return st
}

function resolveVote(st: SpyState): SpyState {
  const n = st.opts.players
  const tally = Array(n).fill(0)
  st.votes.forEach((t, by) => {
    if (t >= 0 && st.alive[by]) tally[t] += 1
  })
  st.tally = tally
  const max = Math.max(...tally)
  const top = tally.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0)
  if (max > 0 && top.length > 1 && !st.candidates) return startVote(st, top)
  st.candidates = null
  st.lastOut = max > 0 && top.length === 1 ? top[0] : null
  if (st.lastOut !== null) st.alive = st.alive.map((a, i) => a && i !== st.lastOut)
  st.phase = 'out'
  bump(st)
  return st
}

function endRound(st: SpyState, winner: 'warga' | 'penyusup', result: RoundResult, bonus?: [Seat, number]): SpyState {
  const n = st.opts.players
  st.gained = Array(n).fill(0)
  if (winner === 'warga') st.roles.forEach((r, i) => r === 'warga' && (st.gained[i] += POINTS.warga))
  if (result === 'survive') st.roles.forEach((r, i) => isBad(r) && st.alive[i] && (st.gained[i] += POINTS.survive))
  if (bonus) st.gained[bonus[0]] += bonus[1]
  st.scores = st.scores.map((p, i) => p + st.gained[i])
  st.winner = winner
  st.result = result
  st.phase = 'roundEnd'
  bump(st)
  return st
}

/** setelah eliminasi/tebakan salah: cek menang, kalau belum → putaran petunjuk berikutnya */
function afterOut(st: SpyState): SpyState {
  const alive = aliveSeats(st)
  const bad = alive.filter((i) => isBad(st.roles[i])).length
  const good = alive.length - bad
  if (bad === 0) return endRound(st, 'warga', 'caught')
  if (good <= bad) return endRound(st, 'penyusup', 'survive')
  st.cycle += 1
  st.starter = nextAlive(st, st.starter)
  return startClues(st)
}

const copy = (s: SpyState): SpyState => ({
  ...s,
  alive: [...s.alive],
  ready: [...s.ready],
  votes: [...s.votes],
  scores: [...s.scores],
  gained: [...s.gained],
})

export function reduce(s: SpyState, a: SpyAction, by: Seat): SpyState {
  if (a.type === 'again') return s.phase === 'end' ? init(s.rng, s.opts) : s
  if (s.phase === 'end') return s

  switch (a.type) {
    case 'ready': {
      if (s.phase !== 'role' || s.ready[by] || by < 0 || by >= s.opts.players) return s
      const st = copy(s)
      st.ready[by] = true
      return st.ready.every(Boolean) ? startClues(st) : st
    }

    case 'clue': {
      if (s.phase !== 'clue' || by !== s.turn || typeof a.text !== 'string') return s
      if (clueProblem(s, by, a.text)) return s
      return giveClue(copy(s), a.text.trim().replace(/\s+/g, ' '))
    }

    case 'vote': {
      if (!canVoteFor(s, by, a.target)) return s
      const st = copy(s)
      st.votes[by] = a.target
      return aliveSeats(st).every((i) => st.votes[i] >= 0) ? resolveVote(st) : st
    }

    case 'guess': {
      const text = typeof a.text === 'string' ? a.text.trim().slice(0, 40) : ''
      if (!text) return s
      // mata-mata nekat menebak di tengah ronde: benar menang, salah langsung kalah
      if (canSpyGuess(s, by)) {
        const st = copy(s)
        st.spyGuessed = true
        st.guessText = text
        st.guessOk = guessMatches(text, s.answer)
        return st.guessOk ? endRound(st, 'penyusup', 'guessed', [by, POINTS.spy]) : endRound(st, 'warga', 'blunder')
      }
      if (s.phase !== 'guess' || by !== s.lastOut) return s
      const st = copy(s)
      st.guessText = text
      st.guessOk = guessMatches(text, s.answer)
      if (st.guessOk) return endRound(st, 'penyusup', 'guessed', [by, s.roles[by] === 'spy' ? POINTS.spy : POINTS.mrwhite])
      return afterOut(st)
    }

    case 'timeUp': {
      // jam dipegang host supaya semua HP sepakat kapan waktu habis
      if (by !== 0) return s
      if (s.phase === 'clue') return giveClue(copy(s), '')
      if (s.phase === 'vote') return resolveVote(copy(s))
      if (s.phase === 'guess') {
        const st = copy(s)
        st.guessText = ''
        st.guessOk = false
        return afterOut(st)
      }
      return s
    }

    case 'next': {
      if (by !== 0) return s
      // host boleh memulai walau ada yang belum menekan "Siap" (mis. HP-nya putus)
      if (s.phase === 'role') return startClues(copy(s))
      if (s.phase === 'out') {
        const st = copy(s)
        const out = s.lastOut
        if (out !== null && (s.roles[out] === 'mrwhite' || s.roles[out] === 'spy')) {
          st.phase = 'guess'
          st.guessText = ''
          st.guessOk = null
          bump(st)
          return st
        }
        return afterOut(st)
      }
      if (s.phase === 'roundEnd') {
        const st = copy(s)
        if (st.round < st.opts.rounds) {
          st.round += 1
          return deal(st)
        }
        const top = Math.max(...st.scores)
        st.winners = st.scores.map((p, i) => (p === top ? i : -1)).filter((i) => i >= 0)
        st.phase = 'end'
        bump(st)
        return st
      }
      return s
    }
  }
  return s
}
