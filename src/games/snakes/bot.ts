import { pickOne } from '../botKit'
import type { BotPolicy } from '../types'
import { QUIZ } from './challenges'
import { canUseItem } from './engine'
import type { Item, SnakesAction, SnakesState } from './types'

/** Item yang dipakai sebelum melempar dadu. */
const BEFORE_ROLL: Item[] = ['shield', 'trap', 'double']

export const snakesBot: BotPolicy<SnakesState, SnakesAction> = ({ state: s, seat, level, rnd }) => {
  if (s.winner !== null) return null
  const p = s.pending

  if (p?.kind === 'judge') {
    // lawan manusia diberi waktu menjalankan tantangan; bot sendiri cukup sebentar supaya kartunya terbaca
    if (seat === s.turn) return { action: { type: 'judge', ok: rnd() < 0.8 }, delay: 3500 + rnd() * 1000 }
    if (s.opts.botSeats?.includes(s.turn)) return null
    return { action: { type: 'judge', ok: rnd() < 0.85 }, delay: 8000 + rnd() * 4000 }
  }
  if (s.turn !== seat) return null

  const wait = 1300 + rnd() * 700
  if (p?.kind === 'pickDeck') return { action: { type: 'pickDeck', deck: rnd() < 0.5 ? 'truth' : 'dare' }, delay: wait }
  if (p?.kind === 'card') {
    if (canUseItem(s, seat, 'pass') && rnd() < 0.5) return { action: { type: 'useItem', item: 'pass' }, delay: 2500 }
    return { action: { type: rnd() < [0.7, 0.85, 0.9][level - 1] ? 'doIt' : 'refuse' }, delay: 2500 + rnd() * 700 }
  }
  if (p?.kind === 'quiz') {
    const q = QUIZ[p.i]
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer)
    const right = rnd() < [0.5, 0.7, 0.9][level - 1]
    return { action: { type: 'answer', choice: right ? q.answer : pickOne(wrong, rnd) }, delay: 3000 + rnd() * 1000 }
  }

  const item = BEFORE_ROLL.find((i) => canUseItem(s, seat, i) && !(i === 'double' && s.pos[seat] >= 90))
  if (item && rnd() < [0.3, 0.7, 1][level - 1]) return { action: { type: 'useItem', item }, delay: wait }
  return { action: { type: 'roll' }, delay: wait }
}
