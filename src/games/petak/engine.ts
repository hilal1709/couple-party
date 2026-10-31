import { nextRand, shuffle } from '../rng'
import type { Seat } from '../types'
import { mapData, MAP_IDS } from './maps'
import type { BodySize, MapId, PetakAction, PetakOptions, PetakState } from './types'

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 8
export const MAX_ACTORS = 8

/** poin hider yang selamat sampai akhir (di luar poin waktu) */
const SURVIVE_BONUS = 50
/** poin per detik di pandangan pencari tanpa ketahuan */
const NYALI_RATE = 2
const NYALI_CAP = 60
const CATCH_POINTS = 60
const VOTE_POINTS = 25

export function defaultOptions(players = 2): PetakOptions {
  return { players, map: 'acak', seekers: 1, hideSecs: 90, huntSecs: 180, rounds: 3, size: 'sedang', total: Math.max(4, players), level: 2 }
}

/** skala model bunglon (1 = setinggi 1,25 m) */
export const BODY_SCALE: Record<BodySize, number> = { kecil: 0.6, sedang: 0.75, besar: 1 }

export const actorOf = (s: PetakState, seat: Seat) => s.actors.findIndex((a) => a.seat === seat)
export const isSeeker = (s: PetakState, actor: number) => s.seekers.includes(actor)
export const hiders = (s: PetakState) => s.actors.flatMap((_, i) => (s.seekers.includes(i) ? [] : [i]))
export const freeHiders = (s: PetakState) => hiders(s).filter((i) => s.caught[i] === null)

function pickMap(opts: PetakOptions, rng: number): [MapId, number] {
  if (opts.map !== 'acak') return [opts.map, rng]
  const [v, next] = nextRand(rng)
  return [MAP_IDS[Math.floor(v * MAP_IDS.length)], next]
}

/** pemain sendirian mulai sebagai hider, karena mengecat adalah inti game ini */
function seekerOrder(actors: PetakState['actors'], rng: number): [number[], number] {
  const humans = actors.flatMap((a, i) => (a.seat !== null ? [i] : []))
  const bots = actors.flatMap((a, i) => (a.seat === null ? [i] : []))
  const [h, r1] = shuffle(humans, rng)
  const [b, r2] = shuffle(bots, r1)
  return [humans.length <= 1 ? [...b, ...h] : [...h, ...b], r2]
}

function startRound(s: PetakState): PetakState {
  const [map, r1] = pickMap(s.opts, s.rng)
  const n = s.actors.length
  const k = Math.min(s.opts.seekers, Math.max(1, n - 1))
  const seekers = Array.from({ length: k }, (_, i) => s.order[(s.round * k + i) % n])
  const spots = mapData(map).spots.map((_, i) => i)
  const [perm, r2] = shuffle(spots, r1)
  let next = 0
  const botSpots = s.actors.map((a, i) => (a.seat === null && !seekers.includes(i) ? perm[next++ % perm.length] : -1))
  return {
    ...s,
    rng: r2,
    map,
    phase: 'hide',
    phaseId: s.phaseId + 1,
    seekers,
    caught: Array(n).fill(null),
    botSpots,
    gained: Array(n).fill(0),
    votes: Array(n).fill(null),
    lastCatch: null,
  }
}

export function init(seed: number, options?: Partial<PetakOptions>): PetakState {
  const base = { ...defaultOptions(), ...options }
  const players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, base.players))
  const total = Math.min(MAX_ACTORS, Math.max(players, Math.max(2, base.total)))
  const opts = { ...base, players, total }
  const actors = Array.from({ length: total }, (_, i) => ({ seat: i < players ? i : null }))
  const [order, rng] = seekerOrder(actors, seed)
  return startRound({
    opts,
    rng,
    phase: 'hide',
    phaseId: 0,
    round: 0,
    map: 'gang',
    actors,
    seekers: [],
    caught: [],
    botSpots: [],
    points: Array(total).fill(0),
    gained: Array(total).fill(0),
    votes: [],
    order,
    lastCatch: null,
  })
}

/** tutup perburuan: hitung poin ronde dan masuk ke pembukaan penyamaran */
function finishHunt(s: PetakState, endT: number, nyali: number[]): PetakState {
  const hunt = s.opts.huntSecs
  const gained = s.actors.map((_, i) => {
    if (isSeeker(s, i)) return 0
    const t = s.caught[i]
    const brave = Math.min(NYALI_CAP, Math.round((nyali[i] ?? 0) * NYALI_RATE))
    return Math.round(((t ?? hunt) / hunt) * 100) + (t === null ? SURVIVE_BONUS : 0) + brave
  })
  const caughtN = s.caught.filter((c) => c !== null).length
  const allCaught = freeHiders(s).length === 0
  const timeBonus = allCaught ? Math.round(((hunt - endT) / hunt) * 100) : 0
  for (const i of s.seekers) gained[i] = Math.round((caughtN * CATCH_POINTS) / s.seekers.length) + timeBonus
  return {
    ...s,
    phase: 'reveal',
    phaseId: s.phaseId + 1,
    gained,
    points: s.points.map((p, i) => p + gained[i]),
  }
}

export function reduce(s: PetakState, a: PetakAction, by: Seat): PetakState {
  const host = by === 0
  switch (a.type) {
    case 'toHunt':
      if (!host || s.phase !== 'hide') return s
      return { ...s, phase: 'hunt', phaseId: s.phaseId + 1 }
    case 'catch': {
      if (!host || s.phase !== 'hunt' || !isSeeker(s, a.seeker) || isSeeker(s, a.target) || s.caught[a.target] !== null) return s
      const caught = s.caught.map((c, i) => (i === a.target ? a.t : c))
      const next: PetakState = { ...s, caught, lastCatch: { id: (s.lastCatch?.id ?? 0) + 1, target: a.target, seeker: a.seeker } }
      return freeHiders(next).length === 0 ? finishHunt(next, a.t, a.nyali) : next
    }
    case 'endHunt':
      if (!host || s.phase !== 'hunt') return s
      return finishHunt(s, s.opts.huntSecs, a.nyali)
    case 'vote': {
      const me = actorOf(s, by)
      if (s.phase !== 'reveal' || me < 0 || isSeeker(s, a.target) || a.target < 0 || a.target >= s.actors.length || a.target === me) return s
      return { ...s, votes: s.votes.map((v, i) => (i === me ? a.target : v)) }
    }
    case 'next': {
      if (!host || s.phase !== 'reveal') return s
      const bonus = s.actors.map((_, i) => s.votes.filter((v) => v === i).length * VOTE_POINTS)
      const scored = { ...s, points: s.points.map((p, i) => p + bonus[i]), gained: s.gained.map((g, i) => g + bonus[i]) }
      if (s.round + 1 >= s.opts.rounds) return { ...scored, phase: 'end', phaseId: s.phaseId + 1 }
      return startRound({ ...scored, round: s.round + 1 })
    }
  }
}

/** urutan peringkat: poin tertinggi dulu */
export function ranking(s: PetakState): number[] {
  return s.actors.map((_, i) => i).sort((a, b) => s.points[b] - s.points[a])
}
