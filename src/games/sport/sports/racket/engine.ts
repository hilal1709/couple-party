import type { Seat } from '../../../types'
import type { RacketMatch, RacketShot, RacketSport, ShotKind, SportAction, SportOptions } from '../../types'

export const POINT_MS = 2400
export const SERVE_MS = 8000
/** tambahan jendela pukul untuk pemain kamera: badan & kamera lebih lambat daripada jempol */
export const CAMERA_GRACE_MS = 120
/** cadangan host kalau HP penerima tidak melapor */
const LAND_GRACE_MS = 900
const MAX_EXTRA = 6

const SPEC: Record<RacketSport, { drive: number; min: number; step: number; lob: number; smash: number; serve: number }> = {
  tenis: { drive: 1250, min: 780, step: 30, lob: 500, smash: 0.65, serve: 1150 },
  badminton: { drive: 1150, min: 800, step: 25, lob: 700, smash: 0.55, serve: 1300 },
}

/** lama bola di udara: reli makin lama makin cepat */
export function flightMs(sport: RacketSport, kind: ShotKind, hits: number, serve: boolean) {
  const s = SPEC[sport]
  if (serve) return s.serve
  const base = Math.max(s.min, s.drive - hits * s.step)
  if (kind === 'lob') return base + s.lob
  return kind === 'smash' ? Math.round(base * s.smash) : base
}

/** setengah lebar jendela pukul: bola ke pinggir lebih sulit */
export const windowMs = (x: number) => 260 - 70 * Math.min(1, Math.abs(x))

export const landBackupMs = (shot: RacketShot) => shot.ms + windowMs(shot.x) + LAND_GRACE_MS

export function initRacket(opts: SportOptions): RacketMatch {
  return { kind: 'racket', sport: opts.sport === 'badminton' ? 'badminton' : 'tenis', phase: 'serve', phaseId: 1, server: 0, points: [0, 0], target: opts.points, ball: null, hits: 0, nextId: 1, last: null, winners: [] }
}

const clamp = (v: unknown, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : 0)
const KINDS: ShotKind[] = ['drive', 'lob', 'smash']

function strike(m: RacketMatch, by: Seat, aim: number, kind: ShotKind, power: number, err: number): RacketMatch {
  const serve = m.phase === 'serve'
  // pukulan meleset dari tengah jendela melenceng; meleset jauh dengan tenaga besar keluar lapangan
  const e = clamp(err, -1, 1)
  const out = !serve && Math.abs(e) > 0.8 && clamp(power, 0, 1) > 0.6
  // smash hanya sah saat menjawab bola lambung
  const legal: ShotKind = serve ? 'drive' : kind === 'smash' && m.ball?.kind !== 'lob' ? 'drive' : kind
  const x = clamp(clamp(aim, -1, 1) + e * 0.45, -1, 1)
  const ball: RacketShot = { id: m.nextId, by, x, kind: legal, power: clamp(power, 0, 1), ms: flightMs(m.sport, legal, m.hits, serve), out, serve }
  return { ...m, phase: 'rally', phaseId: serve ? m.phaseId + 1 : m.phaseId, ball, hits: m.hits + 1, nextId: m.nextId + 1 }
}

function score(m: RacketMatch, ball: RacketShot): RacketMatch {
  const winner = (ball.out ? 1 - ball.by : ball.by) as Seat
  const points: [number, number] = [...m.points]
  points[winner]++
  const why = ball.out ? 'out' : ball.serve ? 'ace' : 'miss'
  const hi = Math.max(...points)
  const lo = Math.min(...points)
  const done = hi >= m.target && (hi - lo >= 2 || hi >= m.target + MAX_EXTRA)
  const base = { ...m, points, ball: null, last: { winner, why } as const, phaseId: m.phaseId + 1 }
  return done ? { ...base, phase: 'end', winners: [winner] } : { ...base, phase: 'point' }
}

export function reduceRacket(m: RacketMatch, a: SportAction, by: Seat): RacketMatch {
  switch (a.type) {
    case 'hit': {
      if (!KINDS.includes(a.shot)) return m
      if (m.phase === 'serve') return a.id === m.phaseId && by === m.server ? strike(m, by, a.x, 'drive', a.power, 0) : m
      if (m.phase !== 'rally' || !m.ball || a.id !== m.ball.id || by === m.ball.by) return m
      return strike(m, by, a.x, a.shot, a.power, a.err)
    }
    case 'land':
      return m.phase === 'rally' && m.ball?.id === a.id ? score(m, m.ball) : m
    case 'auto':
      // servis pelan ke tengah: pengganti pemain yang diam
      return m.phase === 'serve' && a.id === m.phaseId ? strike(m, m.server, 0, 'drive', 0.2, 0) : m
    case 'next':
      if (m.phase !== 'point' || a.id !== m.phaseId) return m
      return { ...m, phase: 'serve', phaseId: m.phaseId + 1, server: (1 - m.server) as Seat, hits: 0 }
    default:
      return m
  }
}
