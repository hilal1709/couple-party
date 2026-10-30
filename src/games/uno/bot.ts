import { best, pickOne } from '../botKit'
import type { BotLevel, BotPolicy, Seat } from '../types'
import { activeSeats, faceOf, isWild, needsSwapTarget, nextSeat, playable, sideColors } from './engine'
import type { Card, Color, UnoAction, UnoState } from './types'

/** Warna terbanyak di tangan sendiri. */
function favoriteColor(s: UnoState, seat: Seat): Color {
  const count = (c: Color) => s.hands[seat].filter((k) => faceOf(k, s.side).color === c).length
  return best(sideColors(s), count)
}

function score(s: UnoState, seat: Seat, card: Card, level: BotLevel): number {
  const f = faceOf(card, s.side)
  const hand = s.hands[seat]
  const nextCards = s.hands[nextSeat(s, seat)].length
  const action = f.kind !== 'num'
  if (level === 2) return (isWild(f) ? -5 : 0) + (action ? 3 : 0) + f.value * 0.1
  const sameColor = hand.filter((k) => faceOf(k, s.side).color === f.color).length
  if (isWild(f)) return hand.length <= 3 || nextCards <= 2 ? 12 : -8 // kartu wild disimpan untuk akhir
  return sameColor * 1.5 + (action ? (nextCards <= 3 ? 8 : 2) : 0) + f.value * 0.1
}

function playCard(s: UnoState, seat: Seat, card: Card, rnd: () => number): UnoAction {
  const f = faceOf(card, s.side)
  const color = isWild(f) && f.kind !== 'roulette' ? favoriteColor(s, seat) : undefined
  if (!needsSwapTarget(s, f)) return { type: 'play', cardId: card.id, color }
  // tukar tangan dengan yang kartunya paling sedikit (jumlah kartu terlihat semua orang)
  const others = activeSeats(s).filter((i) => i !== seat)
  const target = best(others, (i) => -s.hands[i].length + rnd() * 0.5)
  return { type: 'play', cardId: card.id, color, target }
}

function decide(s: UnoState, seat: Seat, level: BotLevel, rnd: () => number): UnoAction | null {
  const p = s.pending
  if (p?.kind === 'chooseColor') return p.by === seat ? { type: 'pickColor', color: favoriteColor(s, seat) } : null
  if (p?.kind === 'roulette') return p.victim === seat ? { type: 'pickColor', color: pickOne(sideColors(s), rnd) } : null
  if (p?.kind === 'challenge') {
    if (p.victim !== seat) return null
    // tidak mengintip `legal`: menantang murni untung-untungan
    return { type: rnd() < [0.1, 0.2, 0.3][level - 1] ? 'challenge' : 'accept' }
  }
  if (p && p.victim !== seat) return null
  if (s.turn !== seat) return null

  const can = playable(s, seat)
  if (p) return can.length ? playCard(s, seat, best(can, (c) => -faceOf(c, s.side).value), rnd) : { type: 'accept' }
  if (!can.length) return { type: 'draw' }
  const forgets = rnd() >= [0.6, 0.95, 1][level - 1]
  if (s.hands[seat].length === 2 && !s.unoArmed[seat] && !forgets) return { type: 'uno' }
  const card = level === 1 ? pickOne(can, rnd) : best(can, (c) => score(s, seat, c, level) + rnd() * 0.5)
  return playCard(s, seat, card, rnd)
}

export const unoBot: BotPolicy<UnoState, UnoAction> = ({ state: s, seat, level, rnd }) => {
  if (s.roundWinner !== null || s.out[seat]) return null
  if (s.unoVulnerable === seat) return { action: { type: 'uno' }, delay: 1300 - level * 300 }
  if (s.unoVulnerable !== null && rnd() < [0.2, 0.5, 0.85][level - 1]) return { action: { type: 'catch' }, delay: 1600 - level * 300 }
  const action = decide(s, seat, level, rnd)
  return action && { action, delay: 1100 + rnd() * 700 }
}
