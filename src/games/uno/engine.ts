import { shuffle } from '../rng'
import type { Seat } from '../types'
import { buildDeck } from './deck'
import {
  DARK,
  DEFAULT_HOUSE,
  LIGHT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Card,
  type Color,
  type Event,
  type Face,
  type UnoAction,
  type UnoOptions,
  type UnoState,
} from './types'

export const HAND_SIZE = 7
export const MERCY_LIMIT = 25
export const UNO_PENALTY = 2

export const faceOf = (card: Card, side: number): Face => card.faces[Math.min(side, card.faces.length - 1)]
export const topCard = (st: UnoState) => st.discard[st.discard.length - 1]
export const topFace = (st: UnoState) => faceOf(topCard(st), st.side)
export const sideColors = (st: UnoState): Color[] => (st.side === 1 ? DARK : LIGHT)
export const isWild = (f: Face) => f.color === null
const isDrawFace = (f: Face) => f.kind === 'draw' || f.kind === 'wildDraw'
const stacks = (st: UnoState) => st.opts.variant === 'noMercy' || st.opts.house.stacking

/** Pemain yang masih ikut ronde. */
export const activeSeats = (st: UnoState): Seat[] => st.hands.map((_, i) => i).filter((i) => !st.out[i])

/** Kursi berikutnya searah putaran, melewati pemain yang tereliminasi. */
export function nextSeat(st: UnoState, from: Seat, steps = 1): Seat {
  let s = from
  for (let k = 0; k < steps; k++) {
    for (let i = 0; i < st.players; i++) {
      s = (s + st.dir + st.players) % st.players
      if (!st.out[s]) break
    }
  }
  return s
}

export function defaultOptions(variant: UnoOptions['variant'] = 'classic', players = 2): UnoOptions {
  return { variant, house: { ...DEFAULT_HOUSE }, target: 500, players }
}

// ---------- poin ----------

export function cardPoints(f: Face, variant: UnoOptions['variant']): number {
  if (f.kind === 'num') return f.value
  if (variant === 'flip') {
    switch (f.kind) {
      case 'draw':
        return f.value === 1 ? 10 : 20
      case 'skipAll':
        return 30
      case 'wild':
        return 40
      case 'wildDraw':
        return 50
      case 'wildDrawColor':
        return 60
      default:
        return 20
    }
  }
  return isWild(f) ? 50 : 20
}

export const handPoints = (st: UnoState, seat: Seat) =>
  st.hands[seat].reduce((sum, c) => sum + cardPoints(faceOf(c, st.side), st.opts.variant), 0)

// ---------- helper state ----------

const withHand = (st: UnoState, seat: Seat, hand: Card[]): UnoState => {
  const hands = [...st.hands]
  hands[seat] = hand
  return { ...st, hands }
}

const setAt = <T,>(arr: T[], i: number, v: T): T[] => {
  const out = [...arr]
  out[i] = v
  return out
}

const emit = (st: UnoState, event: Event): UnoState => ({ ...st, event, eventId: st.eventId + 1 })

/** Ambil 1 kartu dari deck (kocok ulang tumpukan buang kalau habis). null kalau benar-benar habis. */
function takeOne(st: UnoState): [UnoState, Card | null] {
  let { deck, discard, seed } = st
  if (deck.length === 0) {
    if (discard.length <= 1) return [st, null]
    const top = discard[discard.length - 1]
    ;[deck, seed] = shuffle(discard.slice(0, -1), seed)
    discard = [top]
  }
  return [{ ...st, deck: deck.slice(1), discard, seed }, deck[0]]
}

function drawN(st: UnoState, who: Seat, n: number): [UnoState, number] {
  let s = st
  let got = 0
  for (let i = 0; i < n; i++) {
    const [ns, card] = takeOne(s)
    if (!card) break
    s = withHand(ns, who, [...ns.hands[who], card])
    got++
  }
  return [settleUno(s, who), got]
}

/** Ambil terus sampai `stop(face)` terpenuhi (kartu terakhir ikut masuk tangan). */
function drawUntil(st: UnoState, who: Seat, stop: (f: Face) => boolean): [UnoState, number] {
  let s = st
  let got = 0
  for (;;) {
    const [ns, card] = takeOne(s)
    if (!card) break
    s = withHand(ns, who, [...ns.hands[who], card])
    got++
    if (stop(faceOf(card, s.side))) break
  }
  return [settleUno(s, who), got]
}

/** Status UNO hilang begitu tangan > 1 kartu lagi. */
function settleUno(st: UnoState, who: Seat): UnoState {
  if (st.hands[who].length <= 1) return st
  return {
    ...st,
    unoArmed: setAt(st.unoArmed, who, false),
    unoVulnerable: st.unoVulnerable === who ? null : st.unoVulnerable,
  }
}

function penaltyDraw(st: UnoState, victim: Seat, amount: number, untilColor: boolean, extra = 0): UnoState {
  let s = st
  let n = 0
  if (untilColor) {
    const want = st.color
    ;[s, n] = drawUntil(s, victim, (f) => f.color === want)
  } else {
    ;[s, n] = drawN(s, victim, amount)
  }
  if (extra) {
    let m: number
    ;[s, m] = drawN(s, victim, extra)
    n += m
  }
  return emit(s, { t: 'draw', by: victim, n })
}

/**
 * No Mercy: tangan ≥ 25 kartu = tereliminasi (kartunya ke bawah tumpukan buang).
 * Kalau tinggal satu pemain, dia menang ronde.
 */
function checkMercy(st: UnoState): UnoState {
  if (st.opts.variant !== 'noMercy' || st.roundWinner !== null) return st
  let s = st
  for (let seat = 0; seat < s.players; seat++) {
    if (s.out[seat] || s.hands[seat].length < MERCY_LIMIT) continue
    const busted = s.hands[seat]
    s = emit(
      { ...withHand(s, seat, []), out: setAt(s.out, seat, true), discard: [...busted, ...s.discard] },
      { t: 'mercy', by: seat },
    )
    if (s.turn === seat) s = { ...s, turn: nextSeat(s, seat) }
    if (s.pending && 'victim' in s.pending && s.pending.victim === seat) s = { ...s, pending: null }
  }
  const alive = activeSeats(s)
  if (alive.length === 1) return endRound(s, alive[0])
  return s
}

function endRound(st: UnoState, winner: Seat): UnoState {
  let points = 0
  for (let seat = 0; seat < st.players; seat++) if (seat !== winner) points += handPoints(st, seat)
  const scores = setAt(st.scores, winner, st.scores[winner] + points)
  return emit(
    {
      ...st,
      scores,
      roundWinner: winner,
      roundPoints: points,
      gameWinner: scores[winner] >= st.opts.target ? winner : null,
      pending: null,
      drawn: null,
    },
    { t: 'round', winner, points },
  )
}

// ---------- aturan main ----------

export function canPlay(st: UnoState, card: Card, by: Seat): boolean {
  if (st.roundWinner !== null || st.out[by]) return false
  const f = faceOf(card, st.side)
  const top = topFace(st)
  const p = st.pending

  if (p) {
    // hanya boleh menumpuk kartu draw dengan nilai sama atau lebih besar
    return p.kind === 'stack' && p.victim === by && isDrawFace(f) && f.value >= top.value
  }

  if (by !== st.turn) {
    // Jump-In: kartu identik (warna + simbol/angka) boleh dimainkan di luar giliran
    return (
      st.opts.house.jumpIn &&
      !isWild(f) &&
      f.kind === top.kind &&
      f.color === top.color &&
      f.value === top.value
    )
  }

  if (st.drawn && card.id !== st.drawn) return false
  if (isWild(f)) return true
  if (f.color === st.color) return true
  if (f.kind === 'num') return top.kind === 'num' && top.value === f.value
  return f.kind === top.kind && (f.kind !== 'draw' || f.value === top.value)
}

export const playable = (st: UnoState, by: Seat) => st.hands[by].filter((c) => canPlay(st, c, by))

/** Kartu 7 (aturan 7-0 / No Mercy) dengan >2 pemain butuh target tukar. */
export const needsSwapTarget = (st: UnoState, f: Face) =>
  f.kind === 'num' && f.value === 7 && swapsOn(st) && activeSeats(st).length > 2

const swapsOn = (st: UnoState) => st.opts.variant === 'noMercy' || st.opts.house.sevenZero

// ---------- deal ----------

function deal(opts: UnoOptions, seed: number, round: number, dealer: Seat, scores: number[]): UnoState {
  const players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, opts.players ?? 2))
  let [deck, s] = buildDeck(opts.variant, seed)
  ;[deck, s] = shuffle(deck, s)
  const hands: Card[][] = Array.from({ length: players }, () => [])
  // dibagi satu per satu mulai dari kiri dealer
  for (let i = 0; i < HAND_SIZE * players; i++) hands[(dealer + 1 + i) % players].push(deck[i])
  deck = deck.slice(HAND_SIZE * players)

  // kartu pembuka
  for (;;) {
    const f = faceOf(deck[0], 0)
    const bad =
      opts.variant === 'noMercy'
        ? f.kind !== 'num'
        : f.kind === 'wildDraw' || f.kind === 'wildDrawColor'
    if (!bad) break
    ;[deck, s] = shuffle(deck, s)
  }

  let st: UnoState = {
    opts: { ...opts, players },
    seed: s,
    side: 0,
    deck: deck.slice(1),
    discard: [deck[0]],
    players,
    hands,
    dir: 1,
    out: Array(players).fill(false),
    turn: 0,
    color: null,
    pending: null,
    drawn: null,
    unoArmed: Array(players).fill(false),
    unoVulnerable: null,
    round,
    dealer,
    scores: scores.length === players ? scores : Array(players).fill(0),
    roundWinner: null,
    roundPoints: 0,
    gameWinner: null,
    eventId: 0,
    event: null,
  }
  const starter = nextSeat(st, dealer)
  const f = topFace(st)
  st = { ...st, color: f.color, turn: starter }
  // efek kartu pembuka berlaku untuk pemain pertama
  switch (f.kind) {
    case 'wild':
      return { ...st, pending: { kind: 'chooseColor', by: starter } }
    case 'skip':
    case 'skipAll':
      return { ...st, turn: nextSeat(st, starter) }
    case 'reverse':
      // aturan resmi: dealer jalan duluan, arah berbalik (2 pemain: sama dengan skip)
      return players === 2 ? { ...st, turn: dealer } : { ...st, dir: -1, turn: dealer }
    case 'draw': {
      const ns = penaltyDraw(st, starter, f.value, false)
      return { ...ns, turn: nextSeat(ns, starter) }
    }
    default:
      return st
  }
}

export function init(seed: number, opts: UnoOptions = defaultOptions()): UnoState {
  const players = opts.players ?? 2
  return deal(opts, seed, 1, players - 1, [])
}

// ---------- reducer ----------

export function reduce(st: UnoState, a: UnoAction, by: Seat): UnoState {
  if (by < 0 || by >= st.players) return st
  if (a.type === 'nextRound') {
    if (st.roundWinner === null) return st
    const scores = st.gameWinner === null ? st.scores : Array(st.players).fill(0)
    const round = st.gameWinner === null ? st.round + 1 : 1
    return deal(st.opts, st.seed, round, (st.dealer + 1) % st.players, scores)
  }
  if (st.roundWinner !== null || st.out[by]) return st

  // pemain lain bergerak = kesempatan menangkap "lupa UNO" sudah lewat
  let s = st
  if (s.unoVulnerable !== null && s.unoVulnerable !== by && a.type !== 'catch') s = { ...s, unoVulnerable: null }

  switch (a.type) {
    case 'uno': {
      if (s.unoVulnerable === by) return emit({ ...s, unoVulnerable: null }, { t: 'uno', by })
      if (s.turn !== by || s.hands[by].length > 2 || s.unoArmed[by]) return st
      return emit({ ...s, unoArmed: setAt(s.unoArmed, by, true) }, { t: 'uno', by })
    }

    case 'catch': {
      const victim = s.unoVulnerable
      if (victim === null || victim === by) return st
      const [ns, n] = drawN({ ...s, unoVulnerable: null }, victim, UNO_PENALTY)
      return checkMercy(emit(ns, { t: 'caught', by: victim, n }))
    }

    case 'pickColor': {
      const p = s.pending
      if (!sideColors(s).includes(a.color)) return st
      if (p?.kind === 'chooseColor' && p.by === by) return { ...s, color: a.color, pending: null }
      if (p?.kind === 'roulette' && p.victim === by) {
        const [ns, n] = drawUntil({ ...s, color: a.color, pending: null }, by, (f) => f.color === a.color)
        const after = checkMercy(emit(ns, { t: 'draw', by, n }))
        return after.roundWinner !== null ? after : { ...after, turn: nextSeat(after, by) }
      }
      return st
    }

    case 'accept': {
      const p = s.pending
      if (!p || (p.kind !== 'challenge' && p.kind !== 'stack') || p.victim !== by) return st
      const untilColor = p.kind === 'challenge' && p.untilColor
      const ns = checkMercy(penaltyDraw({ ...s, pending: null }, by, p.amount, untilColor))
      return ns.roundWinner !== null ? ns : { ...ns, turn: nextSeat(ns, by) }
    }

    case 'challenge': {
      const p = s.pending
      if (p?.kind !== 'challenge' || p.victim !== by) return st
      // pelaku = pemain sebelum korban (searah putaran)
      const offender = nextSeat({ ...s, dir: (-s.dir) as 1 | -1 }, by)
      const base = { ...s, pending: null }
      if (!p.legal) {
        // terbukti curang: pelaku yang ambil, penantang lanjut main
        const ns = checkMercy(penaltyDraw(base, offender, p.amount, p.untilColor))
        return ns.roundWinner !== null ? ns : emit({ ...ns, turn: by }, { t: 'challengeWin', by, n: p.amount })
      }
      // tidak curang: penantang ambil +2 tambahan dan kehilangan giliran
      const ns = checkMercy(penaltyDraw(base, by, p.amount, p.untilColor, 2))
      return ns.roundWinner !== null
        ? ns
        : emit({ ...ns, turn: nextSeat(ns, by) }, { t: 'challengeLose', by, n: p.amount + 2 })
    }

    case 'draw': {
      if (s.turn !== by || s.pending || s.drawn) return st
      const untilPlayable = s.opts.variant === 'noMercy' || s.opts.house.drawToMatch
      let ns: UnoState
      let n: number
      if (untilPlayable) {
        // kartu terakhir yang diambil pasti bisa dimainkan (atau deck habis)
        const probe = s
        ;[ns, n] = drawUntil(s, by, (f) => canPlay({ ...probe, drawn: null }, { id: '', faces: [f, f] }, by))
      } else {
        ;[ns, n] = drawN(s, by, 1)
      }
      ns = emit(ns, { t: 'draw', by, n })
      const last = ns.hands[by][ns.hands[by].length - 1]
      ns = checkMercy(ns)
      if (ns.roundWinner !== null || ns.out[by]) return ns
      if (n > 0 && canPlay(ns, last, by)) return { ...ns, drawn: last.id }
      return { ...ns, turn: nextSeat(ns, by) }
    }

    case 'pass': {
      if (s.turn !== by || !s.drawn || s.opts.house.forcePlay) return st
      return emit({ ...s, drawn: null, turn: nextSeat(s, by) }, { t: 'pass', by })
    }

    case 'play':
      return play(s, a.cardId, a.color, a.target, by) ?? st
  }
}

function play(st: UnoState, cardId: string, chosen: Color | undefined, target: Seat | undefined, by: Seat): UnoState | null {
  const hand = st.hands[by]
  const card = hand.find((c) => c.id === cardId)
  if (!card || !canPlay(st, card, by)) return null
  const f = faceOf(card, st.side)
  const needsColor = isWild(f) && f.kind !== 'roulette'
  if (needsColor && (!chosen || !sideColors(st).includes(chosen))) return null
  if (needsSwapTarget(st, f) && (target === undefined || target === by || st.out[target] || target >= st.players)) return null

  const stackBefore = st.pending?.kind === 'stack' ? st.pending.amount : 0
  // Wild Draw sah hanya kalau tidak punya kartu warna aktif (selain kartu ini)
  const legal = !hand.some((c) => c.id !== card.id && faceOf(c, st.side).color === st.color)

  let rest = hand.filter((c) => c.id !== card.id)
  let under: Card[] = []
  if (f.kind === 'discardAll') {
    under = rest.filter((c) => faceOf(c, st.side).color === f.color)
    rest = rest.filter((c) => faceOf(c, st.side).color !== f.color)
  }

  let s: UnoState = withHand(st, by, rest)
  s = {
    ...s,
    discard: [...s.discard, ...under, card],
    color: f.color ?? chosen ?? null,
    drawn: null,
    pending: null,
    turn: by,
  }
  s = emit(s, { t: 'play', by, card: card.id })

  // status UNO
  if (rest.length === 1 && !s.unoArmed[by]) s = { ...s, unoVulnerable: by }
  s = { ...s, unoArmed: setAt(s.unoArmed, by, false) }

  // Wild Reverse Draw 4 membalik arah sebelum korban ditentukan
  if (f.kind === 'wildDraw' && f.rev && activeSeats(s).length > 2) s = { ...s, dir: (-s.dir) as 1 | -1 }
  const next = nextSeat(s, by)

  if (rest.length === 0) {
    // kartu draw terakhir tetap berlaku sebelum poin dihitung
    if (isDrawFace(f)) s = penaltyDraw(s, next, stackBefore + f.value, false)
    else if (f.kind === 'wildDrawColor') s = penaltyDraw(s, next, 0, true)
    return endRound(s, by)
  }

  switch (f.kind) {
    case 'num': {
      if (swapsOn(st) && f.value === 7) {
        const other = target ?? next
        const hands = [...s.hands]
        ;[hands[by], hands[other]] = [hands[other], hands[by]]
        s = emit({ ...s, hands, unoVulnerable: null, unoArmed: Array(s.players).fill(false) }, { t: 'swap', a: by, b: other })
      } else if (swapsOn(st) && f.value === 0) {
        // semua tangan bergeser satu kursi searah putaran
        const alive = activeSeats(s)
        const hands = [...s.hands]
        for (const seat of alive) hands[nextSeat(s, seat)] = s.hands[seat]
        s = emit({ ...s, hands, unoVulnerable: null, unoArmed: Array(s.players).fill(false) }, { t: 'rotate' })
      }
      return { ...s, turn: next }
    }
    case 'skip':
      return { ...s, turn: nextSeat(s, by, 2) }
    case 'skipAll':
      return { ...s, turn: by }
    case 'reverse': {
      // 2 pemain: reverse = skip (kamu main lagi)
      if (activeSeats(s).length <= 2) return { ...s, turn: by }
      const r = { ...s, dir: (-s.dir) as 1 | -1 }
      return emit({ ...r, turn: nextSeat(r, by) }, { t: 'reverse', dir: r.dir })
    }
    case 'draw':
    case 'wildDraw': {
      if (stacks(st)) return { ...s, pending: { kind: 'stack', victim: next, amount: stackBefore + f.value }, turn: next }
      if (f.kind === 'wildDraw' && !st.opts.house.noChallenge) {
        return { ...s, pending: { kind: 'challenge', victim: next, legal, amount: f.value, untilColor: false }, turn: next }
      }
      const ns = checkMercy(penaltyDraw(s, next, f.value, false))
      return ns.roundWinner !== null ? ns : { ...ns, turn: nextSeat(ns, next) }
    }
    case 'wildDrawColor': {
      if (!st.opts.house.noChallenge) {
        return { ...s, pending: { kind: 'challenge', victim: next, legal, amount: 0, untilColor: true }, turn: next }
      }
      const ns = penaltyDraw(s, next, 0, true)
      return { ...ns, turn: nextSeat(ns, next) }
    }
    case 'roulette':
      return { ...s, color: null, pending: { kind: 'roulette', victim: next }, turn: next }
    case 'flip': {
      const side = 1 - s.side
      const nf = faceOf(card, side)
      s = emit({ ...s, side, color: nf.color }, { t: 'flip', side })
      if (nf.color === null) s = { ...s, pending: { kind: 'chooseColor', by } }
      return { ...s, turn: next }
    }
    default:
      // wild, discardAll
      return { ...s, turn: next }
  }
}
