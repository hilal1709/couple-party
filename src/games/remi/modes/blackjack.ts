import type { Seat } from '../../types'
import { shuffled } from '../cards'
import type { BjResult, BlackjackAction, BlackjackState, Card } from '../types'
import type { ModeEngine, Step } from './mode'

/** Nilai tangan blackjack; As = 1 atau 11. */
export function bjTotal(cards: Card[]): { total: number; soft: boolean } {
  let sum = 0
  let ace = false
  for (const c of cards) {
    sum += Math.min(10, c.r)
    if (c.r === 1) ace = true
  }
  if (ace && sum + 10 <= 21) return { total: sum + 10, soft: true }
  return { total: sum, soft: false }
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && bjTotal(cards).total === 21
export const MIN_BET = 10

const active = (m: BlackjackState, s: Seat) => m.results[s] !== 'out'

function draw(m: BlackjackState, k = 1): [Card[], BlackjackState] {
  return [m.shoe.slice(0, k), { ...m, shoe: m.shoe.slice(k) }]
}

/** Bandar ambil sampai 17 lalu semua taruhan diselesaikan. */
function settle(m: BlackjackState): Step<BlackjackState> {
  let s = m
  const anyLive = s.hands.some((h, i) => active(s, i) && bjTotal(h).total <= 21 && !isBlackjack(h))
  let dealer = s.dealer
  while (anyLive && bjTotal(dealer).total < 17) {
    const [c, next] = draw(s)
    s = next
    dealer = [...dealer, ...c]
  }
  const d = bjTotal(dealer).total
  const dealerBJ = isBlackjack(dealer)
  const stack = [...s.stack]
  const before = s.stack.map((v, i) => v + s.bets[i])
  const results: (BjResult | null)[] = s.hands.map((h, i) => {
    if (!active(s, i)) return 'out'
    const bet = s.bets[i]
    const t = bjTotal(h).total
    const bj = isBlackjack(h) && !s.doubled[i]
    let r: BjResult
    if (t > 21) r = 'bust'
    else if (bj && !dealerBJ) r = 'blackjack'
    else if (dealerBJ && !bj) r = 'lose'
    else if (bj && dealerBJ) r = 'push'
    else if (d > 21 || t > d) r = 'win'
    else if (t === d) r = 'push'
    else r = 'lose'
    if (r === 'blackjack') stack[i] += bet + Math.floor(bet * 1.5)
    else if (r === 'win') stack[i] += bet * 2
    else if (r === 'push') stack[i] += bet
    return r
  })
  const deltas = stack.map((v, i) => (active(s, i) ? v - before[i] : 0))
  return {
    m: { ...s, dealer, stack, results, step: 'done', done: s.done.map(() => true) },
    event: { t: 'dealer' },
    done: { deltas, winners: deltas.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0) },
  }
}

/** Giliran berikutnya yang belum selesai, atau bandar kalau semua selesai. */
function advance(m: BlackjackState, from: number, event: Step<BlackjackState>['event']): Step<BlackjackState> {
  for (let s = from + 1; s < m.hands.length; s++) if (!m.done[s]) return { m: { ...m, turn: s }, event }
  return { ...settle(m), event: event?.t === 'hit' && event.bust ? event : { t: 'dealer' } }
}

function startPlay(m: BlackjackState): Step<BlackjackState> {
  let s = m
  const hands = s.hands.map(() => [] as Card[])
  let dealer: Card[] = []
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < hands.length; i++) {
      if (!active(s, i)) continue
      const [c, next] = draw(s)
      s = next
      hands[i].push(...c)
    }
    const [c, next] = draw(s)
    s = next
    dealer = [...dealer, ...c]
  }
  const done = hands.map((h, i) => !active(s, i) || isBlackjack(h))
  s = { ...s, hands, dealer, done, step: 'play' }
  if (isBlackjack(dealer)) return settle(s)
  return advance(s, -1, { t: 'deal' })
}

export const blackjack: ModeEngine<BlackjackState, BlackjackAction> = {
  deal({ n, rng, scores }) {
    const [shoe, r] = shuffled(2, rng)
    const out = scores.map((v) => v <= 0)
    return {
      m: {
        kind: 'blackjack',
        shoe,
        step: 'bet',
        stack: [...scores],
        bets: Array(n).fill(0),
        hands: Array.from({ length: n }, () => []),
        dealer: [],
        done: out,
        doubled: Array(n).fill(false),
        turn: 0,
        results: out.map((o) => (o ? 'out' : null)),
      },
      rng: r,
    }
  },

  reduce(m, a, by) {
    if (a.t === 'bet') {
      const amount = Math.floor(a.amount)
      if (m.step !== 'bet' || !active(m, by) || m.bets[by] > 0) return null
      if (amount < Math.min(MIN_BET, m.stack[by]) || amount > m.stack[by]) return null
      const next: BlackjackState = {
        ...m,
        bets: m.bets.map((b, i) => (i === by ? amount : b)),
        stack: m.stack.map((v, i) => (i === by ? v - amount : v)),
      }
      const ready = next.bets.every((b, i) => b > 0 || !active(next, i))
      if (ready) return startPlay(next)
      return { m: next, event: { t: 'bet', by, amount } }
    }
    if (m.step !== 'play' || by !== m.turn || m.done[by]) return null
    const markDone = (x: BlackjackState) => ({ ...x, done: x.done.map((d, i) => d || i === by) })
    if (a.t === 'stand') return advance(markDone(m), by, { t: 'stand', by })
    if (a.t === 'hit' || a.t === 'double') {
      let x = m
      if (a.t === 'double') {
        if (m.hands[by].length !== 2 || m.stack[by] < m.bets[by]) return null
        x = {
          ...m,
          stack: m.stack.map((v, i) => (i === by ? v - m.bets[by] : v)),
          bets: m.bets.map((b, i) => (i === by ? b * 2 : b)),
          doubled: m.doubled.map((d, i) => d || i === by),
        }
      }
      const [c, drawn] = draw(x)
      x = { ...drawn, hands: drawn.hands.map((h, i) => (i === by ? [...h, ...c] : h)) }
      const t = bjTotal(x.hands[by]).total
      const event = { t: 'hit', by, bust: t > 21 } as const
      if (t >= 21 || a.t === 'double') return advance(markDone(x), by, event)
      return { m: x, event }
    }
    return null
  },
}
