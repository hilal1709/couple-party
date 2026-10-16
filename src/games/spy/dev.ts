import { aliveSeats, canVoteFor, reduce } from './engine'
import { LOCATIONS } from './locations'
import type { SpyState } from './types'

export { lcg } from '../domino/dev'

const CLUES = ['manis', 'sering', 'rame', 'enak', 'besar', 'lucu', 'mahal', 'pagi', 'santai', 'warna', 'bunyi', 'licin']

/** Satu langkah bot yang sah (siap, petunjuk acak, voting acak, tebakan acak); null kalau game selesai. */
export function randomStep(s: SpyState, rnd: () => number): SpyState | null {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  let next = s
  switch (s.phase) {
    case 'role': {
      const who = s.ready.findIndex((r) => !r)
      next = reduce(s, { type: 'ready' }, who)
      break
    }
    case 'clue':
      next = reduce(s, { type: 'clue', text: `${pick(CLUES)} ${Math.floor(rnd() * 90) + 10}` }, s.turn)
      if (next === s) next = reduce(s, { type: 'timeUp' }, 0)
      break
    case 'vote': {
      const voter = aliveSeats(s).find((i) => s.votes[i] < 0)
      if (voter === undefined) return null
      const targets = aliveSeats(s).filter((t) => canVoteFor(s, voter, t))
      next = targets.length ? reduce(s, { type: 'vote', target: pick(targets) }, voter) : reduce(s, { type: 'timeUp' }, 0)
      break
    }
    case 'guess': {
      const guess = s.opts.mode === 'lokasi' ? pick(LOCATIONS).name : rnd() < 0.3 ? s.answer : 'entahlah'
      next = reduce(s, { type: 'guess', text: guess }, s.lastOut!)
      break
    }
    case 'out':
    case 'roundEnd':
      next = reduce(s, { type: 'next' }, 0)
      break
    case 'end':
      return null
  }
  return next === s ? null : next
}
