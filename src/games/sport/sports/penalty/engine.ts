import type { Seat } from '../../../types'
import type { Dive, KickAim, PenaltyMatch, PenaltyResult, SportAction } from '../../types'

export const REGULATION = 5
/** batas adu penalti, supaya seri beruntun tetap berakhir */
const MAX_KICKS = 20
/** cukup untuk pemain kamera bersiap di depan HP */
export const SET_MS = 15000

const ZONE: Record<Dive, [number, number]> = { L: [-1.05, -0.2], C: [-0.42, 0.42], R: [0.2, 1.05] }

export function initPenalty(): PenaltyMatch {
  return { kind: 'penalty', phase: 'set', shotId: 1, taker: 0, kick: null, dive: null, goals: [0, 0], log: [[], []], result: null, winners: [] }
}

const clamp = (v: unknown, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : 0)

/** x -1..1 tiang ke tiang, y 0 tanah..1 mistar. Melewati batas = meleset. */
export function judge(k: KickAim, dive: Dive): PenaltyResult['why'] {
  if (k.y > 1) return 'over'
  if (Math.abs(k.x) > 1) return 'wide'
  const [lo, hi] = ZONE[dive]
  // tendangan lemah lebih mudah dijangkau kiper
  const reach = k.power < 0.4 ? 0.25 : 0
  const inZone = k.x >= lo - reach && k.x <= hi + reach
  // sudut atas tidak terjangkau kecuali ditebak tepat dan tendangannya lemah
  const topCorner = Math.abs(k.x) > 0.7 && k.y > 0.72 && k.power >= 0.4
  return inZone && !topCorner ? 'save' : 'goal'
}

function decided(goals: [number, number], log: [boolean[], boolean[]]) {
  const [a, b] = log.map((l) => l.length)
  const left = (n: number) => Math.max(0, REGULATION - n)
  if (a <= REGULATION && b <= REGULATION && (goals[0] > goals[1] + left(b) || goals[1] > goals[0] + left(a))) return true
  // babak tambahan: diputuskan tiap sepasang tendangan
  return a === b && a >= REGULATION && goals[0] !== goals[1]
}

function fire(m: PenaltyMatch, kick: KickAim, dive: Dive): PenaltyMatch {
  const why = judge(kick, dive)
  return { ...m, phase: 'shot', kick, dive, result: { id: m.shotId, taker: m.taker, kick, dive, why } }
}

function settle(m: PenaltyMatch): PenaltyMatch {
  const r = m.result!
  const goal = r.why === 'goal'
  const goals: [number, number] = [...m.goals]
  if (goal) goals[r.taker]++
  const log: [boolean[], boolean[]] = [[...m.log[0]], [...m.log[1]]]
  log[r.taker].push(goal)
  const base = { ...m, goals, log, kick: null, dive: null, result: null, shotId: m.shotId + 1 }
  const taken = log[0].length + log[1].length
  if (decided(goals, log) || taken >= MAX_KICKS) {
    return { ...base, phase: 'end', winners: goals[0] === goals[1] ? [0, 1] : [goals[0] > goals[1] ? 0 : 1] }
  }
  return { ...base, phase: 'set', taker: (1 - r.taker) as Seat }
}

const keeper = (m: PenaltyMatch) => 1 - m.taker

export function reducePenalty(m: PenaltyMatch, a: SportAction, by: Seat): PenaltyMatch {
  switch (a.type) {
    case 'kick': {
      if (m.phase !== 'set' || a.id !== m.shotId || by !== m.taker || m.kick) return m
      const kick = { x: clamp(a.x, -1.5, 1.5), y: clamp(a.y, 0, 1.5), power: clamp(a.power, 0, 1) }
      return m.dive ? fire(m, kick, m.dive) : { ...m, kick }
    }
    case 'dive': {
      if (m.phase !== 'set' || a.id !== m.shotId || by !== keeper(m) || m.dive || !(a.dir in ZONE)) return m
      return m.kick ? fire(m, m.kick, a.dir) : { ...m, dive: a.dir }
    }
    case 'auto': {
      // waktu habis: yang belum memilih mendapat pilihan paling lemah
      if (m.phase !== 'set' || a.id !== m.shotId) return m
      return fire(m, m.kick ?? { x: 0, y: 0.2, power: 0.2 }, m.dive ?? 'C')
    }
    case 'next':
      return m.phase === 'shot' && m.result?.id === a.id ? settle(m) : m
    default:
      return m
  }
}
