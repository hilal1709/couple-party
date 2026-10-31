import { nextRand } from '../../../rng'
import type { Seat } from '../../../types'
import type { ArcheryMatch, SportAction, SportOptions } from '../../types'
import { AIM_MAX, arrowHit, ringScore, type ArrowAim } from './sim'

export const ARROWS = 3
const WIND_MAX = 4

const clamp = (v: unknown, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : 0)

function rollWind(seed: number): [number, number] {
  const [r, next] = nextRand(seed)
  return [Math.round((r * 2 - 1) * WIND_MAX * 10) / 10, next]
}

export function initArchery(opts: SportOptions, seed: number): ArcheryMatch {
  const [wind, s] = rollWind(seed)
  return { kind: 'archery', phase: 'aim', ends: opts.ends, end: 0, turn: 0, scores: Array.from({ length: opts.players }, () => []), wind, seed: s, shotId: 1, shot: null, winners: [] }
}

export const totalArrows = (rows: number[][]) => rows.flat().reduce((a, b) => a + b, 0)

/** panah jauh ke atas: pengganti pemain yang kehabisan waktu atau putus */
const AUTO_AIM: ArrowAim = { x: 0, y: 1.4 }

function release(m: ArcheryMatch, aim: ArrowAim, draw: number): ArcheryMatch {
  const clean = { x: clamp(aim.x, -AIM_MAX, AIM_MAX), y: clamp(aim.y, -AIM_MAX, AIM_MAX) }
  const d = clamp(draw, 0, 1)
  const hit = arrowHit(clean, d, m.wind)
  return { ...m, phase: 'fly', shot: { id: m.shotId, by: m.turn, aim: clean, draw: d, hit, score: ringScore(hit) } }
}

function settle(m: ArcheryMatch): ArcheryMatch {
  const r = m.shot!
  const seat = r.by
  const row = [...(m.scores[seat][m.end] ?? []), r.score]
  const scores = m.scores.map((p, i) => (i === seat ? [...p.slice(0, m.end), row] : p))
  const base = { ...m, scores, shot: null, shotId: m.shotId + 1, phase: 'aim' as const }
  if (row.length < ARROWS) return base
  if (seat + 1 < scores.length) return { ...base, turn: seat + 1 }
  if (m.end + 1 < m.ends) {
    const [wind, s] = rollWind(m.seed)
    return { ...base, turn: 0, end: m.end + 1, wind, seed: s }
  }
  const totals = scores.map(totalArrows)
  const top = Math.max(...totals)
  return { ...base, phase: 'end', winners: totals.flatMap((t, i) => (t === top ? [i] : [])) }
}

export function reduceArchery(m: ArcheryMatch, a: SportAction, by: Seat): ArcheryMatch {
  switch (a.type) {
    case 'shoot':
      if (m.phase !== 'aim' || a.id !== m.shotId || by !== m.turn) return m
      return release(m, a.aim, a.draw)
    case 'auto':
      if (m.phase !== 'aim' || a.id !== m.shotId) return m
      return release(m, AUTO_AIM, 1)
    case 'next':
      if (m.phase !== 'fly' || m.shot?.id !== a.id) return m
      return settle(m)
    default:
      return m
  }
}
