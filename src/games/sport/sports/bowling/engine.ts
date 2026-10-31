import type { Seat } from '../../../types'
import type { BowlingMatch, RollCall, SportAction, SportOptions } from '../../types'
import { frameDone, resetPins, totalScore } from './score'
import { simulateRoll, type BowlThrow } from './sim'

const fullRack = () => Array<boolean>(10).fill(true)
const finite = (v: unknown, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : 0)

export function initBowling(opts: SportOptions): BowlingMatch {
  return {
    kind: 'bowling',
    phase: 'aim',
    frames: opts.frames,
    rolls: Array.from({ length: opts.players }, () => []),
    turn: 0,
    frame: 0,
    standing: fullRack(),
    roll: null,
    rollId: 1,
    winners: [],
  }
}

/** Lemparan pelan lurus: pengganti pemain yang kehabisan waktu atau putus. */
const AUTO_THROW: BowlThrow = { x: 0, dir: 0, speed: 6, spin: 0 }

function cleanThrow(th: BowlThrow): BowlThrow {
  return { x: finite(th.x, -1, 1), dir: finite(th.dir, -0.08, 0.08), speed: finite(th.speed, 4, 11), spin: finite(th.spin, -1, 1) }
}

function callFor(m: BowlingMatch, down: number, gutter: boolean): RollCall {
  const rackFull = m.standing.every(Boolean)
  if (rackFull && down === 10) return 'strike'
  if (m.standing.filter(Boolean).length === down && down > 0) return 'spare'
  return gutter ? 'gutter' : 'open'
}

function launch(m: BowlingMatch, th: BowlThrow): BowlingMatch {
  const res = simulateRoll(m.standing, th)
  return {
    ...m,
    phase: 'roll',
    roll: { id: m.rollId, by: m.turn, th, before: m.standing, knocked: res.knocked, ms: res.ms, gutter: res.gutter, call: callFor(m, res.knocked.length, res.gutter) },
  }
}

/** Catat hasil lemparan, lalu tentukan siapa melempar berikutnya. */
function settle(m: BowlingMatch): BowlingMatch {
  const r = m.roll!
  const seat = r.by
  const last = m.frame === m.frames - 1
  const frameRolls = [...(m.rolls[seat][m.frame] ?? []), r.knocked.length]
  const rolls = m.rolls.map((p, i) => (i === seat ? [...p.slice(0, m.frame), frameRolls] : p))
  const standing = m.standing.map((up, i) => up && !r.knocked.includes(i))
  const base = { ...m, rolls, roll: null, rollId: m.rollId + 1 }

  if (!frameDone(frameRolls, last)) return { ...base, phase: 'aim', standing: resetPins(frameRolls, last) ? fullRack() : standing }

  const nextSeat = seat + 1
  if (nextSeat < m.rolls.length) return { ...base, phase: 'aim', turn: nextSeat, standing: fullRack() }
  if (!last) return { ...base, phase: 'aim', turn: 0, frame: m.frame + 1, standing: fullRack() }

  const totals = rolls.map((p) => totalScore(p, m.frames))
  const top = Math.max(...totals)
  return { ...base, phase: 'end', standing: fullRack(), winners: totals.flatMap((t, i) => (t === top ? [i] : [])) }
}

export function reduceBowling(m: BowlingMatch, a: SportAction, by: Seat): BowlingMatch {
  switch (a.type) {
    case 'throw':
      if (m.phase !== 'aim' || a.id !== m.rollId || by !== m.turn) return m
      return launch(m, cleanThrow(a.th))
    case 'auto':
      if (m.phase !== 'aim' || a.id !== m.rollId) return m
      return launch(m, AUTO_THROW)
    case 'next':
      if (m.phase !== 'roll' || m.roll?.id !== a.id) return m
      return settle(m)
    default:
      return m
  }
}
