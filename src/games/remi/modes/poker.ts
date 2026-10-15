import type { Seat } from '../../types'
import { nextWhere, shuffled } from '../cards'
import type { PokerAction, PokerState, RemiEvent } from '../types'
import type { ModeEngine, Step } from './mode'
import { compareScores, evaluate, HAND_NAMES } from './poker-eval'

const live = (m: PokerState, s: Seat) => m.inHand[s] && !m.folded[s]
const canAct = (m: PokerState, s: Seat) => live(m, s) && m.stack[s] > 0

export const toCall = (m: PokerState, s: Seat) => Math.min(m.stack[s], m.high - m.bet[s])
/** taruhan minimum kalau mau raise (total di putaran ini) */
export const minRaiseTo = (m: PokerState) => m.high + m.minRaise

function put(m: PokerState, s: Seat, amount: number): PokerState {
  const a = Math.min(amount, m.stack[s])
  return {
    ...m,
    stack: m.stack.map((v, i) => (i === s ? v - a : v)),
    bet: m.bet.map((v, i) => (i === s ? v + a : v)),
    committed: m.committed.map((v, i) => (i === s ? v + a : v)),
  }
}

function roundDone(m: PokerState): boolean {
  const actors = m.stack.map((_, s) => s).filter((s) => canAct(m, s))
  return actors.every((s) => m.bet[s] >= m.high && (m.acted[s] || actors.length === 1))
}

/** Bagikan pot (termasuk side pot) ke pemenang. */
function showdown(m: PokerState): Step<PokerState> {
  const n = m.stack.length
  const players = m.stack.map((_, s) => s)
  const alive = players.filter((s) => live(m, s))
  const stack = [...m.stack]
  const pots: { amount: number; winners: Seat[] }[] = []
  const scores = players.map((s) => (alive.includes(s) && alive.length > 1 ? evaluate([...m.hands[s], ...m.board]) : null))
  if (alive.length === 1) {
    pots.push({ amount: m.committed.reduce((a, b) => a + b, 0), winners: alive })
  } else {
    const levels = [...new Set(m.committed.filter((c) => c > 0))].sort((a, b) => a - b)
    let prev = 0
    let carry = 0
    for (const l of levels) {
      const amount = players.reduce((a, s) => a + Math.max(0, Math.min(m.committed[s], l) - prev), 0) + carry
      prev = l
      const eligible = alive.filter((s) => m.committed[s] >= l)
      if (!eligible.length) {
        carry = amount
        continue
      }
      carry = 0
      let best: number[] | null = null
      let winners: Seat[] = []
      for (const s of eligible) {
        const c = best ? compareScores(scores[s]!, best) : 1
        if (c > 0) {
          best = scores[s]
          winners = [s]
        } else if (c === 0) winners.push(s)
      }
      pots.push({ amount, winners })
    }
    if (carry && pots.length) pots[pots.length - 1].amount += carry
  }
  for (const p of pots) {
    const share = Math.floor(p.amount / p.winners.length)
    let rest = p.amount - share * p.winners.length
    // sisa pembagian ke pemenang terdekat setelah dealer
    const order = [...p.winners].sort((a, b) => ((a - m.dealer - 1 + n) % n) - ((b - m.dealer - 1 + n) % n))
    for (const w of order) {
      stack[w] += share + (rest > 0 ? 1 : 0)
      rest--
    }
  }
  const before = players.map((s) => m.stack[s] + m.committed[s])
  const winners = [...new Set(pots.flatMap((p) => p.winners))]
  return {
    m: {
      ...m,
      stack,
      result: { pots, names: scores.map((sc) => (sc ? HAND_NAMES[sc[0]] : null)), shown: alive.length > 1 },
    },
    event: { t: 'round' },
    done: { deltas: players.map((s) => stack[s] - before[s]), winners },
  }
}

const BOARD_AT = [0, 3, 4, 5]

function nextStreet(m: PokerState, blind: number): Step<PokerState> {
  let s: PokerState = { ...m, bet: m.bet.map(() => 0), high: 0, minRaise: blind, acted: m.acted.map(() => false) }
  const actors = s.stack.map((_, i) => i).filter((i) => canAct(s, i))
  const runOut = actors.length <= 1
  do {
    if (s.street === 3) return showdown(s)
    const street = (s.street + 1) as PokerState['street']
    const need = BOARD_AT[street] - s.board.length
    s = { ...s, street, board: [...s.board, ...s.deck.slice(0, need)], deck: s.deck.slice(need) }
  } while (runOut)
  return { m: { ...s, turn: nextWhere(s.dealer, s.stack.length, (i) => canAct(s, i)) }, event: { t: 'street', street: s.street } }
}

function after(m: PokerState, by: Seat, event: RemiEvent, blind: number): Step<PokerState> {
  const alive = m.stack.map((_, s) => s).filter((s) => live(m, s))
  if (alive.length === 1) return { ...showdown(m), event }
  if (roundDone(m)) {
    const step = nextStreet(m, blind)
    return step.done ? step : { ...step, event: event.t === 'fold' || event.t === 'allin' ? event : step.event }
  }
  const turn = nextWhere(by, m.stack.length, (s) => canAct(m, s) && (!m.acted[s] || m.bet[s] < m.high))
  return { m: { ...m, turn }, event }
}

export function pokerEngine(blind: number): ModeEngine<PokerState, PokerAction> {
  return {
    deal({ n, rng, round, scores }) {
      const [deck, r] = shuffled(1, rng)
      const stack = [...scores]
      const inHand = stack.map((v) => v > 0)
      const d0 = (round - 1) % n
      const dealer = inHand[d0] ? d0 : nextWhere(d0, n, (s) => inHand[s])
      const players = inHand.filter(Boolean).length
      const sb = players === 2 ? dealer : nextWhere(dealer, n, (s) => inHand[s])
      const bb = nextWhere(sb, n, (s) => inHand[s])
      const hands = stack.map(() => [] as PokerState['hands'][number])
      let k = 0
      for (let round2 = 0; round2 < 2; round2++)
        for (let i = 1; i <= n; i++) {
          const s = (dealer + i) % n
          if (inHand[s]) hands[s].push(deck[k++])
        }
      let m: PokerState = {
        kind: 'poker',
        hands,
        deck: deck.slice(k),
        board: [],
        stack,
        bet: Array(n).fill(0),
        committed: Array(n).fill(0),
        folded: Array(n).fill(false),
        acted: Array(n).fill(false),
        inHand,
        dealer,
        street: 0,
        turn: 0,
        high: 0,
        minRaise: blind,
        result: null,
      }
      m = put(m, sb, blind / 2)
      m = put(m, bb, blind)
      m = { ...m, high: Math.max(...m.bet) }
      m = { ...m, turn: nextWhere(bb, n, (s) => canAct(m, s)) }
      return { m, rng: r }
    },

    // semua pemain sudah all-in dari blind: langsung buka papan
    settle(m) {
      return !m.result && roundDone(m) ? nextStreet(m, blind) : null
    },

    reduce(m, a, by) {
      if (m.result || by !== m.turn || !canAct(m, by)) return null
      const acted = (x: PokerState) => ({ ...x, acted: x.acted.map((v, i) => v || i === by) })
      if (a.t === 'fold') return after(acted({ ...m, folded: m.folded.map((f, i) => f || i === by) }), by, { t: 'fold', by }, blind)
      if (a.t === 'check') {
        if (m.bet[by] !== m.high) return null
        return after(acted(m), by, { t: 'check', by }, blind)
      }
      if (a.t === 'call') {
        const need = toCall(m, by)
        if (need <= 0) return null
        const x = acted(put(m, by, need))
        return after(x, by, x.stack[by] === 0 ? { t: 'allin', by } : { t: 'bet', by, amount: need }, blind)
      }
      if (a.t === 'raise' || a.t === 'allin') {
        const to = a.t === 'allin' ? m.bet[by] + m.stack[by] : Math.floor(a.to)
        const add = to - m.bet[by]
        const allIn = add === m.stack[by]
        if (add <= 0 || add > m.stack[by]) return null
        if (a.t === 'raise' && !allIn && (to <= m.high || to - m.high < m.minRaise)) return null
        let x = put(m, by, add)
        if (to > m.high) {
          x = { ...x, minRaise: Math.max(m.minRaise, to - m.high), high: to, acted: x.acted.map(() => false) }
        }
        x = acted(x)
        return after(x, by, allIn ? { t: 'allin', by } : { t: 'bet', by, amount: add }, blind)
      }
      return null
    },
  }
}
