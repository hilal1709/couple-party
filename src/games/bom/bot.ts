import { best, pickOne } from '../botKit'
import type { BotLevel, BotPolicy, Seat } from '../types'
import { CATEGORY_WORDS, GENERAL_WORDS } from './botWords'
import { aliveSeats, canAim, canPower, canProtest, normalize, wordProblem } from './engine'
import type { BomAction, BomState, Prompt } from './types'

const bankFor = (p: Prompt) => (p.category ? (CATEGORY_WORDS[p.category] ?? []) : GENERAL_WORDS)

/** Jawaban untuk tantangan sekarang; null = buntu, bom dibiarkan berdetak. */
export function pickWord(s: BomState, seat: Seat, level: BotLevel, rnd: () => number): string | null {
  const fits = (w: string) => !wordProblem(s, seat, w)
  const honest = bankFor(s.prompt).filter(fits)
  if (honest.length) {
    if (level < 3 || !s.opts.powerups) return pickOne(honest, rnd)
    // susah mengincar kata panjang demi power-up bonus
    return best(honest, (w) => normalize(w).length + rnd() * 3)
  }
  if (!s.prompt.category) return null
  // kehabisan kata di kategori ini: nekat ngawur, siapa tahu lolos protes
  const bluff = GENERAL_WORDS.filter(fits)
  return bluff.length && rnd() < [0.3, 0.6, 0.8][level - 1] ? pickOne(bluff, rnd) : null
}

export const bomBot: BotPolicy<BomState, BomAction> = ({ state: s, seat, level, rnd, mem }) => {
  if (s.phase !== 'live' || !s.alive[seat]) return null

  if (s.review && mem.seenReview !== s.review.id && canProtest(s, seat)) {
    mem.seenReview = s.review.id
    const known = bankFor(s.review.prompt).some((w) => normalize(w) === s.review!.key)
    if (rnd() < (known ? 0.02 : [0.1, 0.25, 0.4][level - 1])) return { action: { type: 'protest', id: s.review.id }, delay: 1500 + rnd() * 2500 }
  }
  if (mem.cutFuse !== s.fuseId && canPower(s, seat, 'pendek')) {
    mem.cutFuse = s.fuseId
    if (rnd() < [0.05, 0.15, 0.25][level - 1]) return { action: { type: 'power', power: 'pendek' }, delay: 1000 + rnd() * 3000 }
  }
  if (s.holder !== seat) return null

  if (s.aiming) {
    const targets = aliveSeats(s).filter((t) => canAim(s, seat, t))
    const target = level === 1 ? pickOne(targets, rnd) : best(targets, (t) => -s.lives[t] + rnd())
    return { action: { type: 'aim', target }, delay: 700 + rnd() * 500 }
  }
  if (mem.stuckOn === s.turnId) return null

  const panic = rnd() < [0.1, 0.2, 0.3][level - 1]
  const escape = (['balik', 'lompat'] as const).find((p) => canPower(s, seat, p))
  if (panic && escape) return { action: { type: 'power', power: escape }, delay: 1200 + rnd() * 1500 }

  const word = rnd() < [0.12, 0.05, 0.01][level - 1] ? null : pickWord(s, seat, level, rnd)
  if (!word) {
    mem.stuckOn = s.turnId
    return null
  }
  const delay = [3500 + rnd() * 4000, 2000 + rnd() * 3000, 1000 + rnd() * 2000][level - 1]
  return { action: { type: 'word', text: word }, delay }
}
