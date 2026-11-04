import { nextRand } from '../rng'
import { cleanLook, randomLook } from '../sport/look'
import type { Seat } from '../types'
import { starGoals } from './kitchens'
import type { MasakAction, MasakOptions, MasakState } from './types'

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 8
export const MAX_COOKS = 8

export function defaultOptions(players = 2): MasakOptions {
  return { players, mode: 'coop', kitchen: 'burger', secs: 180, total: Math.max(2, players), level: 2 }
}

export const actorOf = (s: MasakState, seat: Seat) => s.actors.findIndex((a) => a.seat === seat)

export function init(seed: number, options?: Partial<MasakOptions>): MasakState {
  const base = { ...defaultOptions(), ...options }
  const players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, base.players))
  const total = Math.min(MAX_COOKS, Math.max(players, base.total))
  // versus butuh dua tim berisi minimal satu koki
  const mode = base.mode === 'versus' && total >= 2 ? 'versus' : 'coop'
  const opts: MasakOptions = { ...base, players, total, mode }
  // tim selang-seling seperti Ludo: kursi 0, 2, 4 lawan 1, 3, 5; bot mengisi sisanya dengan pola yang sama
  const actors = Array.from({ length: total }, (_, i) => ({ seat: i < players ? i : null, team: mode === 'versus' ? i % 2 : 0 }))
  let rng = seed || 1
  const looks = actors.map((a) => {
    if (a.seat !== null) return null
    const [l, next] = randomLook(rng)
    rng = next
    return l
  })
  return { opts, phase: 'play', phaseId: 1, seed: rng, actors, looks, result: null }
}

export function reduce(s: MasakState, a: MasakAction, by: Seat): MasakState {
  const host = by === 0
  switch (a.type) {
    case 'look': {
      const me = actorOf(s, by)
      if (me < 0) return s
      return { ...s, looks: s.looks.map((l, i) => (i === me ? cleanLook(a.look) : l)) }
    }
    case 'finish':
      if (!host || s.phase !== 'play') return s
      return { ...s, phase: 'end', result: a.result }
    case 'again': {
      if (!host || s.phase !== 'end') return s
      const [, seed] = nextRand(s.seed)
      return { ...s, phase: 'play', phaseId: s.phaseId + 1, seed, result: null }
    }
  }
}

export const teamsOf = (s: MasakState) => (s.opts.mode === 'versus' ? 2 : 1)

/** versus: tim pemenang, -1 = seri */
export function winner(s: MasakState): number {
  const [a = 0, b = 0] = s.result?.score ?? []
  return a === b ? -1 : a > b ? 0 : 1
}

/** bintang co-op dari skor tim 0 */
export function starsOf(s: MasakState): number {
  const score = s.result?.score[0] ?? 0
  return starGoals(s.opts.kitchen, s.actors.filter((a) => a.team === 0).length, s.opts.secs).filter((g) => score >= g).length
}
