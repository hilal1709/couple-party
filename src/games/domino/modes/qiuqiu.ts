import type { Seat } from '../../types'
import { isDouble, nextWhere, pips, shuffledSet } from '../tiles'
import type { DominoEvent, QiuAction, QiuCategory, QiuHand, QiuState, Tile } from '../types'
import type { ModeEngine, Step } from './step'

/* ---------- nilai tangan ---------- */

const CAT_RANK: Record<QiuCategory, number> = { normal: 0, qiuqiu: 1, besar: 2, kecil: 3, dewa: 4 }

export const QIU_NAMES: Record<QiuCategory, string> = {
  normal: '',
  qiuqiu: 'Qiu Qiu',
  besar: 'Murni Besar',
  kecil: 'Murni Kecil',
  dewa: 'Enam Dewa',
}

const pairValue = (p: Tile[]) => p.reduce((s, t) => s + pips(t), 0) % 10
/** kartu terkuat untuk memecah seri: mata terbanyak, lalu angka terbesar */
const tileKey = (t: Tile) => pips(t) * 10 + t.b

/** Pecah empat kartu jadi dua pasang terbaik (nilai besar dulu), lalu tentukan kategorinya. */
export function evaluateQiu(h: Tile[]): QiuHand {
  const [w, x, y, z] = h
  const splits: [Tile[], Tile[]][] = [
    [[w, x], [y, z]],
    [[w, y], [x, z]],
    [[w, z], [x, y]],
  ]
  let best: { pairs: [Tile[], Tile[]]; values: [number, number] } | null = null
  for (const [p, q] of splits) {
    const a = pairValue(p)
    const b = pairValue(q)
    const v: [number, number] = a >= b ? [a, b] : [b, a]
    const pairs: [Tile[], Tile[]] = a >= b ? [p, q] : [q, p]
    if (!best || v[0] > best.values[0] || (v[0] === best.values[0] && v[1] > best.values[1])) best = { pairs, values: v }
  }
  const b = best!
  const total = h.reduce((s, t) => s + pips(t), 0)
  const top = Math.max(...h.map(tileKey))
  let cat: QiuCategory = 'normal'
  if (h.every(isDouble)) cat = 'dewa'
  else if (total <= 9) cat = 'kecil'
  else if (total >= 39) cat = 'besar'
  else if (b.values[0] === 9 && b.values[1] === 9) cat = 'qiuqiu'
  // murni kecil: makin kecil makin kuat
  const score = cat === 'kecil' ? [CAT_RANK[cat], -total] : cat === 'normal' || cat === 'qiuqiu' ? [CAT_RANK[cat], ...b.values, top] : [CAT_RANK[cat], total, top]
  return { cat, score, pairs: b.pairs, values: b.values }
}

export function compareQiu(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d) return d
  }
  return 0
}

export const qiuName = (h: QiuHand) => (h.cat === 'normal' ? `${h.values[0]}·${h.values[1]}` : QIU_NAMES[h.cat])

/* ---------- taruhan (mirip Poker di Kartu Remi, tanpa blind: semua bayar ante) ---------- */

const live = (m: QiuState, s: Seat) => m.inHand[s] && !m.folded[s]
const canAct = (m: QiuState, s: Seat) => live(m, s) && m.stack[s] > 0

export const toCall = (m: QiuState, s: Seat) => Math.min(m.stack[s], m.high - m.bet[s])
export const minRaiseTo = (m: QiuState) => m.high + m.minRaise
export const qiuPot = (m: QiuState) => m.committed.reduce((a, b) => a + b, 0)

function put(m: QiuState, s: Seat, amount: number, ante = false): QiuState {
  const a = Math.min(amount, m.stack[s])
  return {
    ...m,
    stack: m.stack.map((v, i) => (i === s ? v - a : v)),
    bet: ante ? m.bet : m.bet.map((v, i) => (i === s ? v + a : v)),
    committed: m.committed.map((v, i) => (i === s ? v + a : v)),
  }
}

function roundDone(m: QiuState): boolean {
  const actors = m.stack.map((_, s) => s).filter((s) => canAct(m, s))
  return actors.every((s) => m.bet[s] >= m.high && (m.acted[s] || actors.length === 1))
}

function showdown(m: QiuState): Step<QiuState> {
  const n = m.stack.length
  const players = m.stack.map((_, s) => s)
  const alive = players.filter((s) => live(m, s))
  const stack = [...m.stack]
  const pots: { amount: number; winners: Seat[] }[] = []
  const hands = players.map((s) => (alive.includes(s) && alive.length > 1 ? evaluateQiu(m.hands[s]) : null))
  if (alive.length === 1) {
    pots.push({ amount: qiuPot(m), winners: alive })
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
        const c = best ? compareQiu(hands[s]!.score, best) : 1
        if (c > 0) {
          best = hands[s]!.score
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
    const order = [...p.winners].sort((a, b) => ((a - m.dealer - 1 + n) % n) - ((b - m.dealer - 1 + n) % n))
    for (const w of order) {
      stack[w] += share + (rest > 0 ? 1 : 0)
      rest--
    }
  }
  const before = players.map((s) => m.stack[s] + m.committed[s])
  const winners = [...new Set(pots.flatMap((p) => p.winners))]
  const main = pots[0]?.winners[0]
  const special = main !== undefined && hands[main] && hands[main]!.cat !== 'normal' ? hands[main]!.cat : null
  return {
    m: { ...m, stack, result: { pots, hands, shown: alive.length > 1 } },
    event: { t: 'round', special },
    done: { deltas: players.map((s) => stack[s] - before[s]), winners },
  }
}

/** Bagi kartu keempat lalu buka putaran taruhan kedua (atau langsung showdown). */
function nextStreet(m: QiuState, ante: number): Step<QiuState> {
  if (m.street === 1) return showdown(m)
  const n = m.stack.length
  const hands = m.hands.map((h) => [...h])
  const bone = [...m.bone]
  for (let i = 1; i <= n; i++) {
    const s = (m.dealer + i) % n
    if (live(m, s)) hands[s].push(bone.shift()!)
  }
  const s: QiuState = { ...m, hands, bone, street: 1, bet: m.bet.map(() => 0), high: 0, minRaise: ante, acted: m.acted.map(() => false) }
  const actors = s.stack.map((_, i) => i).filter((i) => canAct(s, i))
  if (actors.length <= 1) return showdown(s)
  return { m: { ...s, turn: nextWhere(s.dealer, n, (i) => canAct(s, i)) }, event: { t: 'street' } }
}

function after(m: QiuState, by: Seat, event: DominoEvent, ante: number): Step<QiuState> {
  const alive = m.stack.map((_, s) => s).filter((s) => live(m, s))
  if (alive.length === 1) return { ...showdown(m), event }
  if (roundDone(m)) {
    const step = nextStreet(m, ante)
    return step.done ? step : { ...step, event: event.t === 'fold' || event.t === 'allin' ? event : step.event }
  }
  const turn = nextWhere(by, m.stack.length, (s) => canAct(m, s) && (!m.acted[s] || m.bet[s] < m.high))
  return { m: { ...m, turn }, event }
}

export function qiuEngine(ante: number): ModeEngine<QiuState, QiuAction> {
  return {
    deal({ n, rng, round, scores }) {
      const [set, r] = shuffledSet(rng)
      const stack = [...scores]
      const inHand = stack.map((v) => v > 0)
      const d0 = (round - 1) % n
      const dealer = inHand[d0] ? d0 : nextWhere(d0, n, (s) => inHand[s])
      const hands: Tile[][] = stack.map(() => [])
      let k = 0
      for (let c = 0; c < 3; c++)
        for (let i = 1; i <= n; i++) {
          const s = (dealer + i) % n
          if (inHand[s]) hands[s].push(set[k++])
        }
      let m: QiuState = {
        kind: 'qiuqiu',
        hands,
        bone: set.slice(k),
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
        minRaise: ante,
        result: null,
      }
      for (let s = 0; s < n; s++) if (inHand[s]) m = put(m, s, ante, true)
      m = { ...m, turn: nextWhere(dealer, n, (s) => canAct(m, s)) }
      return { m, rng: r }
    },

    // semua (kecuali satu) habis chip karena ante: langsung buka kartu
    settle(m) {
      if (m.result) return null
      const actors = m.stack.map((_, i) => i).filter((i) => canAct(m, i))
      if (actors.length > 1) return null
      let step = nextStreet(m, ante)
      if (!step.done) step = nextStreet(step.m, ante)
      return step
    },

    reduce(m, a, by) {
      if (m.result || by !== m.turn || !canAct(m, by)) return null
      const acted = (x: QiuState) => ({ ...x, acted: x.acted.map((v, i) => v || i === by) })
      if (a.t === 'fold') return after(acted({ ...m, folded: m.folded.map((f, i) => f || i === by) }), by, { t: 'fold', by }, ante)
      if (a.t === 'check') {
        if (m.bet[by] !== m.high) return null
        return after(acted(m), by, { t: 'check', by }, ante)
      }
      if (a.t === 'call') {
        const need = toCall(m, by)
        if (need <= 0) return null
        const x = acted(put(m, by, need))
        return after(x, by, x.stack[by] === 0 ? { t: 'allin', by } : { t: 'bet', by, amount: need }, ante)
      }
      if (a.t === 'raise' || a.t === 'allin') {
        const to = a.t === 'allin' ? m.bet[by] + m.stack[by] : Math.floor(a.to)
        const add = to - m.bet[by]
        const allIn = add === m.stack[by]
        if (add <= 0 || add > m.stack[by]) return null
        if (a.t === 'raise' && !allIn && (to <= m.high || to - m.high < m.minRaise)) return null
        let x = put(m, by, add)
        if (to > m.high) x = { ...x, minRaise: Math.max(m.minRaise, to - m.high), high: to, acted: x.acted.map(() => false) }
        x = acted(x)
        return after(x, by, allIn ? { t: 'allin', by } : { t: 'bet', by, amount: add }, ante)
      }
      return null
    },
  }
}
