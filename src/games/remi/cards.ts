import { shuffle } from '../rng'
import type { Seat } from '../types'
import type { Card, Suit } from './types'

export const SUITS: Suit[] = ['S', 'H', 'C', 'D']

export const SUIT_NAME: Record<Suit | 'X', string> = { S: 'Sekop', H: 'Hati', C: 'Keriting', D: 'Wajik', X: 'Joker' }
export const SUIT_SYMBOL: Record<Suit | 'X', string> = { S: '♠', H: '♥', C: '♣', D: '♦', X: '★' }
export const RED = new Set<Suit | 'X'>(['H', 'D'])

const RANK_LABEL = ['Joker', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
export const rankLabel = (r: number) => RANK_LABEL[r] ?? '?'
export const cardLabel = (c: Card) => (c.s === 'X' ? 'Joker' : `${rankLabel(c.r)} ${SUIT_NAME[c.s]}`)

/** Satu dek 52 kartu; `copy` membedakan id saat memakai dua dek. */
export function makeDeck(copy = 0, joker = false): Card[] {
  const tag = copy ? String.fromCharCode(97 + copy) : ''
  const cards: Card[] = []
  for (const s of SUITS) for (let r = 1; r <= 13; r++) cards.push({ id: `${s}${r}${tag}`, s, r })
  if (joker) cards.push({ id: `X0${tag}`, s: 'X', r: 0 })
  return cards
}

export function shuffled(decks: number, rng: number, joker = false): [Card[], number] {
  const all = Array.from({ length: decks }, (_, i) => makeDeck(i, joker && i === 0)).flat()
  return shuffle(all, rng)
}

/** Bagi `per` kartu ke tiap pemain (bergantian); per = Infinity → bagi habis. */
export function deal(deck: Card[], players: number, per: number): { hands: Card[][]; rest: Card[] } {
  const hands: Card[][] = Array.from({ length: players }, () => [])
  let i = 0
  while (i < deck.length && (per === Infinity || i < per * players)) {
    hands[i % players].push(deck[i])
    i++
  }
  return { hands, rest: deck.slice(i) }
}

/** As tertinggi: 2..K = 2..13, As = 14 */
export const highAce = (r: number) => (r === 1 ? 14 : r)

/** urutan jenis untuk menyortir tangan */
const SUIT_SORT: Record<Suit | 'X', number> = { D: 0, C: 1, H: 2, S: 3, X: 4 }
export const suitIndex = (s: Suit | 'X') => SUIT_SORT[s]

/** Sortir tangan: per jenis, lalu angka (As tinggi). */
export function sortHand(cards: Card[], rank: (c: Card) => number = (c) => highAce(c.r), bySuit = true): Card[] {
  return [...cards].sort((a, b) =>
    bySuit ? suitIndex(a.s) - suitIndex(b.s) || rank(a) - rank(b) : rank(a) - rank(b) || suitIndex(a.s) - suitIndex(b.s),
  )
}

export const nextOf = (seat: Seat, n: number) => (seat + 1) % n

/** Kursi berikutnya yang memenuhi syarat; kembali ke `seat` kalau tak ada. */
export function nextWhere(seat: Seat, n: number, ok: (s: Seat) => boolean): Seat {
  for (let k = 1; k <= n; k++) {
    const s = (seat + k) % n
    if (ok(s)) return s
  }
  return seat
}

export const removeIds = (cards: Card[], ids: string[]) => cards.filter((c) => !ids.includes(c.id))
