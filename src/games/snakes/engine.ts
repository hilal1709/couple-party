import { nextRand, shuffle } from '../rng'
import type { Seat } from '../types'
import { makeBoard } from './board'
import { DARES, QUIZ, TRUTHS } from './challenges'
import {
  BAG,
  GOAL,
  type Deck,
  type Effect,
  type Item,
  type Note,
  type SnakesAction,
  type SnakesOptions,
  type SnakesState,
} from './types'

export const ITEMS: Item[] = ['shield', 'double', 'trap', 'pass']
/** bonus maju kalau lolos tantangan / benar kuis */
export const BONUS = { judge: 2, quiz: 3 } as const
/** mundur kalau salah kuis / kena jebakan */
export const SETBACK = { quiz: 2, trap: 5 } as const

export function defaultOptions(): SnakesOptions {
  return { players: 2, challenges: true, effects: true, items: true, quiz: true, exact: true, penalty: 3 }
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

export function init(seed: number, options?: Partial<SnakesOptions>): SnakesState {
  const opts = { ...defaultOptions(), ...options }
  const n = Math.max(2, opts.players)
  let s = seed
  const [board, s1] = makeBoard(opts, s)
  const [truth, s2] = shuffle(range(TRUTHS.length), s1)
  const [dare, s3] = shuffle(range(DARES.length), s2)
  const [quiz, s4] = shuffle(range(QUIZ.length), s3)
  s = s4
  return {
    opts: { ...opts, players: n },
    rng: s,
    board,
    pos: Array(n).fill(0),
    items: Array.from({ length: n }, () => []),
    shield: Array(n).fill(false),
    skip: Array(n).fill(false),
    traps: {},
    turn: 0,
    pending: null,
    double: false,
    usedItem: false,
    winner: null,
    decks: { truth, dare, quiz },
    eventId: 0,
    event: null,
  }
}

/* ---------- helper murni untuk UI & tes ---------- */

export const isSnake = (s: SnakesState, from: number) => from in s.board.jumps && s.board.jumps[from] < from
export const isLadder = (s: SnakesState, from: number) => from in s.board.jumps && s.board.jumps[from] > from

export const canUseItem = (s: SnakesState, seat: Seat, item: Item): boolean => {
  if (s.winner !== null || s.turn !== seat || !s.items[seat].includes(item)) return false
  if (item === 'pass') return s.pending?.kind === 'card' || s.pending?.kind === 'pickDeck'
  if (s.pending || s.usedItem) return false
  if (item === 'shield') return !s.shield[seat]
  if (item === 'double') return !s.double
  if (item === 'trap') return s.pos[seat] > 1 && s.pos[seat] < GOAL && !(s.pos[seat] in s.traps)
  return false
}

/* ---------- mesin ---------- */

/** Draft yang boleh diubah selama satu aksi; reducer tetap murni karena state asal disalin. */
type Draft = SnakesState & { log: Note[]; path: number[]; again: boolean }

function rand(d: Draft, n: number): number {
  const [r, s] = nextRand(d.rng)
  d.rng = s
  return Math.floor(r * n)
}

function draw(d: Draft, deck: 'truth' | 'dare' | 'quiz'): number {
  if (d.decks[deck].length === 0) {
    const size = deck === 'truth' ? TRUTHS.length : deck === 'dare' ? DARES.length : QUIZ.length
    const [fresh, s] = shuffle(range(size), d.rng)
    d.rng = s
    d.decks[deck] = fresh
  }
  return d.decks[deck].pop()!
}

/** Jalan `steps` kotak (negatif = mundur), mencatat tiap kotak untuk animasi. */
function walk(d: Draft, seat: Seat, steps: number) {
  let p = d.pos[seat]
  const dir = Math.sign(steps)
  let left = Math.abs(steps)
  let bounced = false
  let back = false
  while (left-- > 0) {
    if (dir > 0 && !back && p === GOAL) {
      if (!d.opts.exact) break
      back = true
      bounced = true
    }
    const q = Math.max(1, p + (dir > 0 && !back ? 1 : -1))
    if (q === p) break
    p = q
    d.path.push(p)
  }
  if (bounced) d.log.push({ t: 'bounce' })
  d.pos[seat] = p
}

function jumpTo(d: Draft, seat: Seat, to: number) {
  d.pos[seat] = to
  d.path.push(to)
}

/**
 * Bidak berhenti di sebuah kotak: cek finis, jebakan, ular/tangga, lalu kotak spesial.
 * `special = false` untuk gerakan hasil efek supaya tidak berantai tanpa ujung.
 */
function settle(d: Draft, seat: Seat, special: boolean): void {
  const at = d.pos[seat]
  if (at >= GOAL) {
    d.winner = seat
    d.log.push({ t: 'win' })
    return
  }
  const trapOwner = d.traps[at]
  if (trapOwner !== undefined && trapOwner !== seat) {
    delete d.traps[at]
    d.log.push({ t: 'trap', owner: trapOwner, at })
    walk(d, seat, -SETBACK.trap)
    return settle(d, seat, false)
  }
  const to = d.board.jumps[at]
  if (to !== undefined) {
    if (to < at && d.shield[seat]) {
      d.shield[seat] = false
      d.log.push({ t: 'shieldBlock', at })
    } else {
      d.log.push({ t: to < at ? 'snake' : 'ladder', from: at, to })
      jumpTo(d, seat, to)
      if (to >= GOAL) return settle(d, seat, false)
      return
    }
  }
  if (!special) return
  const tile = d.board.tiles[at]
  if (!tile) return
  switch (tile.kind) {
    case 'challenge':
      d.log.push({ t: 'challenge' })
      d.pending = { kind: 'pickDeck' }
      return
    case 'quiz':
      d.log.push({ t: 'quiz' })
      d.pending = { kind: 'quiz', i: draw(d, 'quiz') }
      return
    case 'item': {
      if (d.items[seat].length >= BAG) {
        d.log.push({ t: 'bagFull' })
        return
      }
      const item = ITEMS[rand(d, ITEMS.length)]
      d.items[seat] = [...d.items[seat], item]
      d.log.push({ t: 'gotItem', item })
      return
    }
    case 'fx':
      return effect(d, seat, tile.fx)
  }
}

function effect(d: Draft, seat: Seat, fx: Effect): void {
  switch (fx) {
    case 'fwd3':
    case 'back3':
      d.log.push({ t: 'fx', fx })
      walk(d, seat, fx === 'fwd3' ? 3 : -3)
      return settle(d, seat, false)
    case 'again':
      d.log.push({ t: 'fx', fx })
      d.again = true
      return
    case 'skip':
      d.log.push({ t: 'fx', fx })
      d.skip[seat] = true
      return
    case 'teleport': {
      d.log.push({ t: 'fx', fx })
      jumpTo(d, seat, 2 + rand(d, GOAL - 2))
      return settle(d, seat, false)
    }
    case 'swap': {
      // tukar dengan pemain terdekat di depan; kalau sudah paling depan, tidak terjadi apa-apa
      const me = d.pos[seat]
      let target: Seat | undefined
      d.pos.forEach((p, i) => {
        if (i !== seat && p > me && (target === undefined || p < d.pos[target])) target = i
      })
      d.log.push({ t: 'fx', fx, with: target })
      if (target === undefined) return
      const theirs = d.pos[target]
      d.pos[target] = me
      jumpTo(d, seat, theirs)
      return
    }
  }
}

function endTurn(d: Draft) {
  d.pending = null
  d.double = false
  d.usedItem = false
  if (d.winner !== null) return
  if (d.again) {
    d.again = false
    return
  }
  const n = d.opts.players
  let next = (d.turn + 1) % n
  // lewati pemain yang kena Skip (sekali per efek); batasi supaya tidak berputar selamanya
  for (let guard = 0; guard < n && d.skip[next]; guard++) {
    d.skip[next] = false
    d.log.push({ t: 'skipped', who: next })
    next = (next + 1) % n
  }
  d.turn = next
}

/** Ubah draft kembali jadi state dan catat event untuk animasi & teks. */
function emit(d: Draft, by: Seat, dice?: number[]): SnakesState {
  const { log, path, again, ...rest } = d
  void again
  return { ...rest, eventId: d.eventId + 1, event: { by, dice, path, log } }
}

/** Selesaikan aksi: tutup giliran kalau tidak ada yang menunggu. */
function finish(d: Draft, by: Seat, dice?: number[]): SnakesState {
  if (!d.pending) endTurn(d)
  return emit(d, by, dice)
}

function draft(s: SnakesState): Draft {
  return { ...structuredClone(s), log: [], path: [], again: false }
}

export function reduce(s: SnakesState, a: SnakesAction, by: Seat): SnakesState {
  if (a.type === 'again') {
    if (s.winner === null) return s
    return init(s.rng, s.opts)
  }
  if (s.winner !== null) return s
  const p = s.pending

  switch (a.type) {
    case 'roll': {
      if (by !== s.turn || p) return s
      const d = draft(s)
      const dice = [1 + rand(d, 6)]
      if (d.double) dice.push(1 + rand(d, 6))
      const total = dice.reduce((x, y) => x + y, 0)
      if (d.pos[by] === 0) d.log.push({ t: 'enter' })
      d.path.push(d.pos[by])
      walk(d, by, total)
      settle(d, by, true)
      // lemparan lagi hanya kalau tidak ada tantangan/kuis yang menunggu
      if (d.pending) d.again = false
      return finish(d, by, dice)
    }

    case 'useItem': {
      if (!canUseItem(s, by, a.item)) return s
      const d = draft(s)
      d.items[by].splice(d.items[by].indexOf(a.item), 1)
      d.log.push({ t: 'useItem', item: a.item })
      if (a.item === 'pass') {
        d.pending = null
        return finish(d, by)
      }
      d.usedItem = true
      if (a.item === 'shield') d.shield[by] = true
      if (a.item === 'double') d.double = true
      if (a.item === 'trap') d.traps[d.pos[by]] = by
      // item biasa tidak mengakhiri giliran: masih harus lempar dadu
      return emit(d, by)
    }

    case 'pickDeck': {
      if (by !== s.turn || p?.kind !== 'pickDeck') return s
      const d = draft(s)
      d.pending = { kind: 'card', deck: a.deck, i: draw(d, a.deck) }
      d.log.push({ t: 'card', deck: a.deck })
      return finish(d, by)
    }

    case 'doIt': {
      if (by !== s.turn || p?.kind !== 'card') return s
      const d = draft(s)
      d.pending = { kind: 'judge', deck: p.deck, i: p.i }
      d.log.push({ t: 'doIt' })
      return finish(d, by)
    }

    case 'refuse': {
      if (by !== s.turn || p?.kind !== 'card') return s
      const d = draft(s)
      d.pending = null
      d.log.push({ t: 'refuse' })
      d.path.push(d.pos[by])
      walk(d, by, -d.opts.penalty)
      settle(d, by, false)
      return finish(d, by)
    }

    case 'judge': {
      // yang menilai harus lawan; suara pertama yang sampai di host dipakai.
      // Bot tidak bisa benar-benar menjalankan tantangan, jadi ia boleh menutup gilirannya sendiri.
      if (p?.kind !== 'judge' || (by === s.turn && !s.opts.botSeats?.includes(by))) return s
      const d = draft(s)
      const who = s.turn
      d.pending = null
      d.log.push({ t: 'judged', ok: a.ok, judge: by })
      d.path.push(d.pos[who])
      walk(d, who, a.ok ? BONUS.judge : -d.opts.penalty)
      settle(d, who, false)
      return finish(d, who)
    }

    case 'answer': {
      if (by !== s.turn || p?.kind !== 'quiz') return s
      const q = QUIZ[p.i]
      if (!q || a.choice < 0 || a.choice >= q.options.length) return s
      const d = draft(s)
      const ok = a.choice === q.answer
      d.pending = null
      d.log.push({ t: 'answer', ok })
      d.path.push(d.pos[by])
      walk(d, by, ok ? BONUS.quiz : -SETBACK.quiz)
      settle(d, by, false)
      return finish(d, by)
    }
  }
  return s
}

export const deckText = (deck: Deck, i: number) => (deck === 'truth' ? TRUTHS[i] : DARES[i]) ?? ''
