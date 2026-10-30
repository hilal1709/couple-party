import { best, pickOne } from '../botKit'
import type { BotLevel, BotPolicy, Seat } from '../types'
import { GENERIC_CLUES, LOCATION_CLUES, WORD_CLUES, type WordClues } from './botClues'
import { aliveSeats, canSpyGuess, canVoteFor, clueProblem, guesser, normalize } from './engine'
import { LOCATIONS } from './locations'
import type { SpyAction, SpyState } from './types'

const same = (list: string[], text: string) => list.some((c) => normalize(c) === normalize(text))
const hits = (s: SpyState, list: string[]) => s.clues.filter((c) => c.text && same(list, c.text)).length

/** Tebakan Mr. White / mata-mata, murni dari petunjuk yang sudah terdengar. */
function deduce(s: SpyState, level: BotLevel, rnd: () => number): { text: string; hits: number } {
  if (s.opts.mode === 'lokasi') {
    const names = LOCATIONS.map((l) => l.name)
    if (level === 1) return { text: pickOne(names, rnd), hits: 0 }
    const name = best(names, (n) => hits(s, LOCATION_CLUES[n] ?? []) + rnd() * 0.5)
    return { text: name, hits: hits(s, LOCATION_CLUES[name] ?? []) }
  }
  const words = [...WORD_CLUES.values()]
  if (level === 1) return { text: pickOne(words, rnd).word, hits: 0 }
  const score = (w: WordClues) => hits(s, w.own) * 2 + hits(s, w.shared) + rnd() * 0.5
  const w = best(words, score)
  return { text: w.word, hits: hits(s, [...w.own, ...w.shared]) }
}

/** Bahan petunjuk untuk kursi ini; kursi tanpa kata hanya bisa menirukan arah pembicaraan. */
function cluePool(s: SpyState, seat: Seat, level: BotLevel, rnd: () => number): string[] {
  const secret = s.secret[seat]
  if (s.opts.mode === 'lokasi') {
    if (secret) return LOCATION_CLUES[secret] ?? []
    return level > 1 && s.clues.length ? (LOCATION_CLUES[deduce(s, level, rnd).text] ?? []) : []
  }
  if (!secret) {
    const guess = s.clues.length && level > 1 ? WORD_CLUES.get(normalize(deduce(s, level, rnd).text)) : undefined
    return guess?.shared ?? []
  }
  const k = WORD_CLUES.get(normalize(secret))
  if (!k) return []
  // putaran pertama cukup samar; makin lama makin spesifik. Gampang langsung kebablasan.
  return level === 1 || s.cycle > 1 ? [...k.own, ...k.shared] : k.shared
}

export function pickClue(s: SpyState, seat: Seat, level: BotLevel, rnd: () => number): string {
  const said = s.clues.map((c) => c.text)
  const fresh = (c: string) => !same(said, c) && !clueProblem(s, seat, c)
  const pool = cluePool(s, seat, level, rnd).filter(fresh)
  if (pool.length) return pickOne(pool, rnd)
  const safe = GENERIC_CLUES.filter(fresh)
  return pickOne(safe.length ? safe : GENERIC_CLUES, rnd)
}

/** Makin besar makin dicurigai; hanya memakai petunjuk terbuka & kata sendiri. */
function suspicion(s: SpyState, seat: Seat, target: Seat): number {
  const secret = s.secret[seat]
  const k = secret ? WORD_CLUES.get(normalize(secret)) : undefined
  const place = secret ? LOCATION_CLUES[secret] : undefined
  let v = 0
  for (const c of s.clues.filter((x) => x.by === target)) {
    if (!c.text) v += 2
    else if (same(GENERIC_CLUES, c.text)) v += 1
    else if (k && same(k.other, c.text)) v += 4
    else if (k && same(k.own, c.text)) v -= 3
    else if (k && same(k.shared, c.text)) v -= 1
    else if (place && same(place, c.text)) v -= 2
  }
  return v
}

function decide(s: SpyState, seat: Seat, level: BotLevel, rnd: () => number): { action: SpyAction; delay: number } | null {
  switch (s.phase) {
    case 'role':
      return s.ready[seat] ? null : { action: { type: 'ready' }, delay: 1500 + rnd() * 2000 }
    case 'clue':
      if (s.turn !== seat) return null
      return { action: { type: 'clue', text: pickClue(s, seat, level, rnd) }, delay: 3000 + rnd() * 3500 }
    case 'vote': {
      if (!s.alive[seat] || s.votes[seat] >= 0) return null
      if (level === 3 && canSpyGuess(s, seat)) {
        const g = deduce(s, level, rnd)
        if (g.hits >= 2 && rnd() < 0.6) return { action: { type: 'guess', text: g.text }, delay: 2500 }
      }
      const targets = aliveSeats(s).filter((t) => canVoteFor(s, seat, t))
      if (!targets.length) return null
      const noise = level === 1 ? 100 : level === 2 ? 2 : 1
      return { action: { type: 'vote', target: best(targets, (t) => suspicion(s, seat, t) + rnd() * noise) }, delay: 3000 + rnd() * 6000 }
    }
    case 'guess':
      return guesser(s) === seat ? { action: { type: 'guess', text: deduce(s, level, rnd).text }, delay: 4000 + rnd() * 3000 } : null
    default:
      return null
  }
}

export const spyBot: BotPolicy<SpyState, SpyAction> = ({ state: s, seat, level, rnd }) => decide(s, seat, level, rnd)
