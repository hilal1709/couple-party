import type { Seat } from '../types'
import { cleanLook, randomLook } from './look'
import { initArchery, reduceArchery } from './sports/archery/engine'
import { initBowling, reduceBowling } from './sports/bowling/engine'
import { initBoxing, reduceBoxing } from './sports/boxing/engine'
import { initPenalty, reducePenalty } from './sports/penalty/engine'
import { initRacket, reduceRacket } from './sports/racket/engine'
import type { Look, SportAction, SportMatch, SportOptions, SportState } from './types'

export function defaultOptions(players = 2): SportOptions {
  return { sport: 'bowling', frames: 5, rounds: 3, ends: 3, points: 7, players, botSeats: [] }
}

function initMatch(opts: SportOptions, seed: number): SportMatch {
  if (opts.sport === 'tinju') return initBoxing(opts)
  if (opts.sport === 'panahan') return initArchery(opts, seed)
  if (opts.sport === 'penalti') return initPenalty()
  if (opts.sport === 'tenis' || opts.sport === 'badminton') return initRacket(opts)
  return initBowling(opts)
}

function reduceMatch(m: SportMatch, a: SportAction, by: Seat): SportMatch {
  if (m.kind === 'boxing') return reduceBoxing(m, a, by)
  if (m.kind === 'archery') return reduceArchery(m, a, by)
  if (m.kind === 'penalty') return reducePenalty(m, a, by)
  if (m.kind === 'racket') return reduceRacket(m, a, by)
  return reduceBowling(m, a, by)
}

export function init(seed: number, options?: Partial<SportOptions>): SportState {
  const opts = { ...defaultOptions(), ...options }
  let s = seed
  const looks: Look[] = []
  // semua kursi mulai dengan tampang acak; pemain menimpanya dengan buatannya sendiri
  for (let i = 0; i < opts.players; i++) {
    const [look, next] = randomLook(s)
    looks.push(look)
    s = next
  }
  return { opts, looks, seed: s, m: initMatch(opts, s) }
}

export function reduce(state: SportState, action: SportAction, by: Seat): SportState {
  if (action.type === 'look') {
    if (by < 0 || by >= state.looks.length) return state
    return { ...state, looks: state.looks.map((l, i) => (i === by ? cleanLook(action.look) : l)) }
  }
  if (action.type === 'again') {
    if (state.m.phase !== 'end') return state
    // angin babak baru tidak boleh sama dengan permainan sebelumnya
    const seed = state.seed + 1
    return { ...state, seed, m: initMatch(state.opts, seed) }
  }
  const m = reduceMatch(state.m, action, by)
  return m === state.m ? state : { ...state, m }
}
