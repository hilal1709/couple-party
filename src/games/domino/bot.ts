import { betAction, best, pickOne } from '../botKit'
import type { BotLevel, BotPolicy, Seat } from '../types'
import { canPass, chainPlayable, endCount, ends, mustDraw, sidesFor } from './modes/chain'
import { evaluateQiu, minRaiseTo, qiuPot, toCall } from './modes/qiuqiu'
import type { ChainAction, ChainState, DominoAction, DominoState, Placed, QiuAction, QiuState, Side, Tile } from './types'

/** Rantai andaikan kartu dipasang di sisi itu. */
function placed(m: ChainState, tile: Tile, side: Side, by: Seat): Placed[] {
  const e = ends(m)
  if (!e) return [{ tile, l: tile.a, r: tile.b, by }]
  if (side === 'L') {
    const other = tile.a === e[0] ? tile.b : tile.a
    return [{ tile, l: other, r: e[0], by }, ...m.line]
  }
  const other = tile.a === e[1] ? tile.b : tile.a
  return [...m.line, { tile, l: e[1], r: other, by }]
}

function chainValue(m: ChainState, seat: Seat, tile: Tile, side: Side, level: BotLevel): number {
  const pips = tile.a + tile.b + (tile.a === tile.b ? 3 : 0)
  if (level === 2) return pips
  const line = placed(m, tile, side, seat)
  const [l, r] = [line[0].l, line[line.length - 1].r]
  const rest = m.hands[seat].filter((t) => t.id !== tile.id)
  // susah: sisakan ujung yang masih bisa disambung tangan sendiri, dan kejar kelipatan 5 di Lima
  const follow = rest.filter((t) => [l, r].some((v) => t.a === v || t.b === v)).length
  const count = endCount(line)
  const five = m.mode === 'lima' && count > 0 && count % 5 === 0 ? count * 2 : 0
  return pips * 0.6 + follow * 2 + five
}

function chainAction(m: ChainState, seat: Seat, level: BotLevel, rnd: () => number): ChainAction | null {
  if (m.turn !== seat) return null
  const ids = chainPlayable(m, seat)
  if (ids.length) {
    const moves = m.hands[seat].filter((t) => ids.includes(t.id)).flatMap((tile) => sidesFor(m, tile).map((side) => ({ tile, side })))
    const { tile, side } = level === 1 ? pickOne(moves, rnd) : best(moves, (v) => chainValue(m, seat, v.tile, v.side, level) + rnd() * 0.5)
    return { t: 'play', id: tile.id, side }
  }
  if (mustDraw(m, seat)) return { t: 'draw' }
  return canPass(m, seat) ? { t: 'pass' } : null
}

/** Kekuatan tangan Qiu Qiu 0..1: tiga kartu pertama dinilai dari pasangan terbaiknya. */
function qiuPower(hand: Tile[]): number {
  if (hand.length < 4) {
    const values = hand.flatMap((a, i) => hand.slice(i + 1).map((b) => (a.a + a.b + b.a + b.b) % 10))
    return (Math.max(...values) / 9) * 0.8
  }
  const h = evaluateQiu(hand)
  return h.cat === 'normal' ? (h.values[0] * 2 + h.values[1]) / 27 : 0.97
}

function qiuAction(m: QiuState, seat: Seat, level: BotLevel, rnd: () => number): QiuAction | null {
  if (m.result || m.turn !== seat) return null
  const spot = { need: toCall(m, seat), stack: m.stack[seat], bet: m.bet[seat], minTo: minRaiseTo(m), pot: qiuPot(m) }
  return betAction(spot, qiuPower(m.hands[seat]), level, rnd)
}

export const dominoBot: BotPolicy<DominoState, DominoAction> = ({ state: s, seat, level, rnd }) => {
  if (s.phase !== 'play') return null
  const action = s.m.kind === 'chain' ? chainAction(s.m, seat, level, rnd) : qiuAction(s.m, seat, level, rnd)
  return action && { action, delay: 1100 + rnd() * 800 }
}
