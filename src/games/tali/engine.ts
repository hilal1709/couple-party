import type { Seat } from '../types'
import { LEVELS } from './levels'
import type { LevelResult, TaliAction, TaliOptions, TaliState } from './types'

export const PLAYERS = 2
const BOTH = 0b11

export function defaultOptions(): TaliOptions {
  return { start: 0, run: true }
}

function freshLevel(s: Omit<TaliState, 'press' | 'levers' | 'candy'> & Partial<TaliState>, level: number): TaliState {
  const def = LEVELS[level]
  return {
    ...s,
    phase: 'play',
    level,
    levelId: s.levelId + 1,
    checkpoint: -1,
    spawnId: s.spawnId + 1,
    press: def.buttons.map(() => 0),
    levers: def.levers.map(() => false),
    candy: def.candy.map(() => false),
    falls: 0,
    goal: 0,
    goalMs: [0, 0],
    ready: 0,
    lastFall: null,
  }
}

export function init(_seed: number, options?: Partial<TaliOptions>): TaliState {
  const opts = { ...defaultOptions(), ...options }
  opts.start = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(opts.start)))
  return freshLevel(
    { opts, phase: 'play', level: opts.start, levelId: 0, checkpoint: -1, spawnId: 0, falls: 0, goal: 0, goalMs: [0, 0], ready: 0, results: LEVELS.map(() => null), lastFall: null },
    opts.start,
  )
}

/** bintang: selesai, semua permen, dan waktu di bawah target */
export function scoreLevel(level: number, ms: number, falls: number, candy: number): LevelResult {
  const def = LEVELS[level]
  const of = def.candy.length
  const stars = 1 + (candy >= of ? 1 : 0) + (ms <= def.par * 1000 ? 1 : 0)
  return { stars, ms, falls, candy, of }
}

function better(a: LevelResult | null, b: LevelResult): LevelResult {
  if (!a) return b
  if (b.stars !== a.stars) return b.stars > a.stars ? b : a
  return b.ms < a.ms ? b : a
}

export function reduce(s: TaliState, a: TaliAction, by: Seat): TaliState {
  if (by < 0 || by >= PLAYERS) return s
  const bit = 1 << by
  const def = LEVELS[s.level]
  switch (a.type) {
    case 'press': {
      if (s.phase !== 'play' || !def.buttons[a.i]) return s
      const cur = s.press[a.i]
      const next = a.on ? cur | bit : cur & ~bit
      if (next === cur) return s
      const press = [...s.press]
      press[a.i] = next
      return { ...s, press }
    }
    case 'lever': {
      if (s.phase !== 'play' || !def.levers[a.i]) return s
      const levers = [...s.levers]
      levers[a.i] = !levers[a.i]
      return { ...s, levers }
    }
    case 'checkpoint': {
      if (s.phase !== 'play' || a.i <= s.checkpoint || a.i >= def.checkpoints.length) return s
      return { ...s, checkpoint: a.i }
    }
    case 'collect': {
      if (s.phase !== 'play' || a.i < 0 || a.i >= s.candy.length || s.candy[a.i]) return s
      const candy = [...s.candy]
      candy[a.i] = true
      return { ...s, candy }
    }
    case 'fall': {
      if (s.phase !== 'play') return s
      // tombol dilepas semua: kedua badan dipindah ke checkpoint
      return { ...s, falls: s.falls + 1, spawnId: s.spawnId + 1, press: s.press.map(() => 0), goal: 0, lastFall: { id: s.spawnId + 1, seat: by } }
    }
    case 'goal': {
      if (s.phase !== 'play') return s
      const goal = a.on ? s.goal | bit : s.goal & ~bit
      const goalMs = [...s.goalMs]
      goalMs[by] = Math.max(0, Math.round(a.ms))
      if (goal !== BOTH) return goal === s.goal && goalMs[by] === s.goalMs[by] ? s : { ...s, goal, goalMs }
      const ms = Math.max(...goalMs)
      const got = s.candy.filter(Boolean).length
      const results = [...s.results]
      results[s.level] = better(results[s.level], scoreLevel(s.level, ms, s.falls, got))
      return { ...s, goal, goalMs, phase: 'clear', ready: 0, results }
    }
    case 'next': {
      if (s.phase === 'end') return s
      if (s.phase !== 'clear') return s
      const ready = s.ready | bit
      if (ready !== BOTH) return { ...s, ready }
      const last = s.level >= LEVELS.length - 1
      if (!s.opts.run || last) return { ...s, ready, phase: 'end' }
      return freshLevel(s, s.level + 1)
    }
    case 'retry':
      return freshLevel(s, s.level)
    case 'pick': {
      if (s.phase === 'play' || a.level < 0 || a.level >= LEVELS.length) return s
      return freshLevel(s, a.level)
    }
  }
}

export const totalStars = (s: TaliState) => s.results.reduce((n, r) => n + (r?.stars ?? 0), 0)
