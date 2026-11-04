import { nextRand } from '../rng'
import { cleanLook, randomLook } from './look'
import type { Seat } from '../types'
import { MOUNTAIN_IDS } from './mountains'
import type { MountainId, PuncakAction, PuncakOptions, PuncakState } from './types'

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 4
export const MAX_CLIMBERS = 4

export function defaultOptions(players = 2): PuncakOptions {
  return { players, mountain: 'karang', zones: 4, weather: 'cerah', loot: 'normal', total: Math.max(1, players), level: 2 }
}

export const actorOf = (s: PuncakState, seat: Seat) => s.actors.findIndex((a) => a.seat === seat)

function pickMountain(opt: PuncakOptions['mountain'], seed: number): [MountainId, number] {
  if (opt !== 'acak' && MOUNTAIN_IDS.includes(opt)) return [opt, seed]
  const [r, next] = nextRand(seed)
  return [MOUNTAIN_IDS[Math.floor(r * MOUNTAIN_IDS.length)], next]
}

export function init(seed: number, options?: Partial<PuncakOptions>): PuncakState {
  const base = { ...defaultOptions(), ...options }
  const players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, base.players))
  const total = Math.min(MAX_CLIMBERS, Math.max(players, base.total))
  const zones: 2 | 4 = base.zones === 2 ? 2 : 4
  const opts: PuncakOptions = { ...base, players, total, zones }
  const actors = Array.from({ length: total }, (_, i) => ({ seat: i < players ? i : null }))
  let rng = seed || 1
  const looks = actors.map((a) => {
    if (a.seat !== null) return null
    const [l, next] = randomLook(rng)
    rng = next
    return l
  })
  const [mountain, s2] = pickMountain(opts.mountain, rng)
  return { opts, mountain, phase: 'climb', phaseId: 1, seed: s2, actors, looks, result: null }
}

export function reduce(s: PuncakState, a: PuncakAction, by: Seat): PuncakState {
  const host = by === 0
  switch (a.type) {
    case 'look': {
      const me = actorOf(s, by)
      if (me < 0) return s
      return { ...s, looks: s.looks.map((l, i) => (i === me ? cleanLook(a.look) : l)) }
    }
    case 'finish':
      if (!host || s.phase !== 'climb') return s
      return { ...s, phase: 'end', result: a.result }
    case 'again': {
      if (!host || s.phase !== 'end') return s
      const [, seed] = nextRand(s.seed)
      // gunung acak diundi ulang tiap main lagi
      const [mountain, s2] = pickMountain(s.opts.mountain, seed)
      return { ...s, mountain, phase: 'climb', phaseId: s.phaseId + 1, seed: s2, result: null }
    }
  }
}

/** bintang: sampai puncak (1), cepat (2), hampir tanpa pingsan (3) */
export function starsOf(s: PuncakState): number {
  const r = s.result
  if (!r?.win) return 0
  const par = s.opts.zones === 4 ? 16 * 60 : 8 * 60
  return 1 + (r.secs <= par ? 1 : 0) + (r.falls <= 1 ? 1 : 0)
}
