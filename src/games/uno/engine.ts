import { shuffle } from '../rng'
import type { Seat } from '../types'
import { buildDeck } from './deck'
import {
  DARK,
  DEFAULT_HOUSE,
  LIGHT,
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

export const other = (s: Seat): Seat => (s === 0 ? 1 : 0)
export const faceOf = (card: Card, side: number): Face => card.faces[Math.min(side, card.faces.length - 1)]
export const topCard = (st: UnoState) => st.discard[st.discard.length - 1]
export const topFace = (st: UnoState) => faceOf(topCard(st), st.side)
export const sideColors = (st: UnoState): Color[] => (st.side === 1 ? DARK : LIGHT)
export const isWild = (f: Face) => f.color === null
const isDrawFace = (f: Face) => f.kind === 'draw' || f.kind === 'wildDraw'
const stacks = (st: UnoState) => st.opts.variant === 'noMercy' || st.opts.house.stacking

export function defaultOptions(variant: UnoOptions['variant'] = 'classic'): UnoOptions {
  return { variant, house: { ...DEFAULT_HOUSE }, target: 500 }
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
  const hands: [Card[], Card[]] = seat === 0 ? [hand, st.hands[1]] : [st.hands[0], hand]
  return { ...st, hands }
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
  const unoArmed: [boolean, boolean] = [...st.unoArmed]
  unoArmed[who] = false
  return { ...st, unoArmed, unoVulnerable: st.unoVulnerable === who ? null : st.unoVulnerable }
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

/** No Mercy: tangan 25 kartu atau lebih = kalah ronde. */
function checkMercy(st: UnoState): UnoState {
  if (st.opts.variant !== 'noMercy' || st.roundWinner !== null) return st
  for (const seat of [0, 1] as Seat[]) {
    if (st.hands[seat].length >= MERCY_LIMIT) return endRound(emit(st, { t: 'mercy', by: seat }), other(seat))
  }
  return st
}

function endRound(st: UnoState, winner: Seat): UnoState {
  const points = handPoints(st, other(winner))
  const scores: [number, number] = [...st.scores]
  scores[winner] += points
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
  if (st.roundWinner !== null) return false
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

// ---------- deal ----------

function deal(opts: UnoOptions, seed: number, round: number, dealer: Seat, scores: [number, number]): UnoState {
  let [deck, s] = buildDeck(opts.variant, seed)
  ;[deck, s] = shuffle(deck, s)
  const hands: [Card[], Card[]] = [[], []]
  for (let i = 0; i < HAND_SIZE * 2; i++) hands[i % 2 === 0 ? other(dealer) : dealer].push(deck[i])
  deck = deck.slice(HAND_SIZE * 2)

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

  const starter = other(dealer)
  let st: UnoState = {
    opts,
    seed: s,
    side: 0,
    deck: deck.slice(1),
    discard: [deck[0]],
    hands,
    turn: starter,
    color: null,
    pending: null,
    drawn: null,
    unoArmed: [false, false],
    unoVulnerable: null,
    round,
    dealer,
    scores,
    roundWinner: null,
    roundPoints: 0,
    gameWinner: null,
    eventId: 0,
    event: null,
  }
  const f = topFace(st)
  st = { ...st, color: f.color }
  // efek kartu pembuka berlaku untuk pemain pertama
  switch (f.kind) {
    case 'wild':
      return { ...st, pending: { kind: 'chooseColor', by: starter } }
    case 'skip':
    case 'skipAll':
    case 'reverse':
      return { ...st, turn: dealer }
    case 'draw':
      return { ...penaltyDraw(st, starter, f.value, false), turn: dealer }
    default:
      return st
  }
}

export function init(seed: number, opts: UnoOptions = defaultOptions()): UnoState {
  return deal(opts, seed, 1, 1, [0, 0])
}

// ---------- reducer ----------

export function reduce(st: UnoState, a: UnoAction, by: Seat): UnoState {
  if (a.type === 'nextRound') {
    if (st.roundWinner === null) return st
    const scores: [number, number] = st.gameWinner === null ? st.scores : [0, 0]
    const round = st.gameWinner === null ? st.round + 1 : 1
    return deal(st.opts, st.seed, round, other(st.dealer), scores)
  }
  if (st.roundWinner !== null) return st

  // lawan bergerak = kesempatan menangkap "lupa UNO" sudah lewat
  let s = st
  if (s.unoVulnerable !== null && s.unoVulnerable !== by && a.type !== 'catch') s = { ...s, unoVulnerable: null }

  switch (a.type) {
    case 'uno': {
      const unoArmed: [boolean, boolean] = [...s.unoArmed]
      if (s.unoVulnerable === by) return emit({ ...s, unoVulnerable: null }, { t: 'uno', by })
      if (s.turn !== by || s.hands[by].length > 2 || s.unoArmed[by]) return st
      unoArmed[by] = true
      return emit({ ...s, unoArmed }, { t: 'uno', by })
    }

    case 'catch': {
      const victim = other(by)
      if (s.unoVulnerable !== victim) return st
      const [ns, n] = drawN({ ...s, unoVulnerable: null }, victim, UNO_PENALTY)
      return checkMercy(emit(ns, { t: 'caught', by: victim, n }))
    }

    case 'pickColor': {
      const p = s.pending
      if (!sideColors(s).includes(a.color)) return st
      if (p?.kind === 'chooseColor' && p.by === by) return { ...s, color: a.color, pending: null }
      if (p?.kind === 'roulette' && p.victim === by) {
        const [ns, n] = drawUntil({ ...s, color: a.color, pending: null }, by, (f) => f.color === a.color)
        return checkMercy({ ...emit(ns, { t: 'draw', by, n }), turn: other(by) })
      }
      return st
    }

    case 'accept': {
      const p = s.pending
      if (!p || (p.kind !== 'challenge' && p.kind !== 'stack') || p.victim !== by) return st
      const untilColor = p.kind === 'challenge' && p.untilColor
      const ns = penaltyDraw({ ...s, pending: null }, by, p.amount, untilColor)
      return checkMercy({ ...ns, turn: other(by) })
    }

    case 'challenge': {
      const p = s.pending
      if (p?.kind !== 'challenge' || p.victim !== by) return st
      const offender = other(by)
      const base = { ...s, pending: null }
      if (!p.legal) {
        // terbukti curang: pelaku yang ambil, penantang lanjut main
        const ns = penaltyDraw(base, offender, p.amount, p.untilColor)
        return checkMercy(emit({ ...ns, turn: by }, { t: 'challengeWin', by, n: p.amount }))
      }
      // tidak curang: penantang ambil +2 tambahan dan kehilangan giliran
      const ns = penaltyDraw(base, by, p.amount, p.untilColor, 2)
      return checkMercy(emit({ ...ns, turn: offender }, { t: 'challengeLose', by, n: p.amount + 2 }))
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
      if (ns.roundWinner !== null) return ns
      if (n > 0 && canPlay(ns, last, by)) return { ...ns, drawn: last.id }
      return { ...ns, turn: other(by) }
    }

    case 'pass': {
      if (s.turn !== by || !s.drawn || s.opts.house.forcePlay) return st
      return emit({ ...s, drawn: null, turn: other(by) }, { t: 'pass', by })
    }

    case 'play':
      return play(s, a.cardId, a.color, by) ?? st
  }
}

function play(st: UnoState, cardId: string, chosen: Color | undefined, by: Seat): UnoState | null {
  const hand = st.hands[by]
  const card = hand.find((c) => c.id === cardId)
  if (!card || !canPlay(st, card, by)) return null
  const f = faceOf(card, st.side)
  const needsColor = isWild(f) && f.kind !== 'roulette'
  if (needsColor && (!chosen || !sideColors(st).includes(chosen))) return null

  const o = other(by)
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
  const unoArmed: [boolean, boolean] = [...s.unoArmed]
  if (rest.length === 1 && !unoArmed[by]) s = { ...s, unoVulnerable: by }
  unoArmed[by] = false
  s = { ...s, unoArmed }

  if (rest.length === 0) {
    // kartu draw terakhir tetap berlaku sebelum poin dihitung
    if (isDrawFace(f)) s = penaltyDraw(s, o, stackBefore + f.value, false)
    else if (f.kind === 'wildDrawColor') s = penaltyDraw(s, o, 0, true)
    return endRound(s, by)
  }

  switch (f.kind) {
    case 'num': {
      const swaps =
        (st.opts.variant === 'noMercy' || st.opts.house.sevenZero) && (f.value === 7 || f.value === 0)
      if (swaps) {
        s = emit({ ...s, hands: [s.hands[1], s.hands[0]], unoVulnerable: null, unoArmed: [false, false] }, { t: 'swap' })
      }
      return { ...s, turn: o }
    }
    case 'skip':
    case 'skipAll':
    case 'reverse':
      // 2 pemain: semuanya = lawan dilewati, kamu main lagi
      return { ...s, turn: by }
    case 'draw':
    case 'wildDraw': {
      if (stacks(st)) return { ...s, pending: { kind: 'stack', victim: o, amount: stackBefore + f.value }, turn: o }
      if (f.kind === 'wildDraw' && !st.opts.house.noChallenge) {
        return { ...s, pending: { kind: 'challenge', victim: o, legal, amount: f.value, untilColor: false }, turn: o }
      }
      return checkMercy({ ...penaltyDraw(s, o, f.value, false), turn: by })
    }
    case 'wildDrawColor':
      if (!st.opts.house.noChallenge) {
        return { ...s, pending: { kind: 'challenge', victim: o, legal, amount: 0, untilColor: true }, turn: o }
      }
      return { ...penaltyDraw(s, o, 0, true), turn: by }
    case 'roulette':
      return { ...s, color: null, pending: { kind: 'roulette', victim: o }, turn: o }
    case 'flip': {
      const side = 1 - s.side
      const nf = faceOf(card, side)
      s = emit({ ...s, side, color: nf.color }, { t: 'flip', side })
      if (nf.color === null) s = { ...s, pending: { kind: 'chooseColor', by } }
      return { ...s, turn: o }
    }
    default:
      // wild, discardAll
      return { ...s, turn: o }
  }
}
