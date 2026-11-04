import type { Seat } from '../types'
import {
  buttonOk,
  lockCode,
  makeInfo,
  makeModules,
  makeRng,
  mazeOpen,
  passwordMatches,
  stepTo,
  symbolOrder,
  wireAnswer,
} from './modules'
import type { BombModule, JinakAction, JinakOptions, JinakState, Level } from './types'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

export const LEVELS: Record<Level, { modules: number; seconds: number; speedup: number }> = {
  santai: { modules: 3, seconds: 300, speedup: 1 },
  normal: { modules: 4, seconds: 240, speedup: 1 },
  panik: { modules: 6, seconds: 180, speedup: 1.25 },
}

export function defaultOptions(players = 2): JinakOptions {
  return { players, level: 'normal', strikes: 3 }
}

export function init(seed: number, options?: Partial<JinakOptions>): JinakState {
  const opts = { ...defaultOptions(), ...options }
  const o = { ...opts, players: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, opts.players)) }
  const st: JinakState = {
    opts: o,
    rng: seed,
    phase: 'intro',
    round: 1,
    defuser: 0,
    info: { serial: '', batteries: 0, stickers: [] },
    modules: [],
    solved: [],
    strikes: 0,
    timeLeft: 0,
    rate: 1,
    clockId: 0,
    finalLeft: 0,
    event: null,
    eventSeq: 0,
    history: [],
  }
  newBomb(st)
  return st
}

function newBomb(st: JinakState) {
  const r = makeRng(st.rng)
  st.info = makeInfo(r)
  st.modules = makeModules(r, LEVELS[st.opts.level].modules)
  st.rng = r.seed
  st.solved = st.modules.map(() => false)
  st.strikes = 0
  st.rate = 1
  st.timeLeft = LEVELS[st.opts.level].seconds * 1000
  st.finalLeft = 0
}

/* ---------- helper murni untuk UI & tes ---------- */

/** "m:ss" seperti yang tampil di layar timer */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const isDefuser = (s: JinakState, seat: Seat) => s.defuser === seat

/** jawaban benar sebuah modul dalam bentuk aksi (dipakai tes & mode latihan) */
export function solutionOf(s: JinakState, mod: number): JinakAction[] {
  const m = s.modules[mod]
  const left = s.timeLeft
  switch (m.kind) {
    case 'kabel':
      return [{ type: 'cut', mod, wire: wireAnswer(m.wires, s.info), left }]
    case 'tombol': {
      const hold = buttonOk(m, s.info, true, '0123456789')
      return [{ type: 'button', mod, hold, shown: '0123456789', left }]
    }
    case 'simbol':
      return symbolOrder(m.symbols).map((symbol) => ({ type: 'press', mod, symbol, left }))
    case 'labirin':
      return mazePath(m).map((dir) => ({ type: 'move', mod, dir, left }))
    case 'sandi':
      return [{ type: 'submit', mod, word: passwordMatches(m.columns)[0], left }]
    case 'gembok':
      return [{ type: 'unlock', mod, code: lockCode(m, s.info), left }]
  }
}

function mazePath(m: Extract<BombModule, { kind: 'labirin' }>) {
  type Node = { p: [number, number]; path: ('u' | 'd' | 'l' | 'r')[] }
  const q: Node[] = [{ p: m.pos, path: [] }]
  const seen = new Set([m.pos.join()])
  while (q.length) {
    const { p, path } = q.shift()!
    if (p[0] === m.goal[0] && p[1] === m.goal[1]) return path
    for (const d of ['u', 'd', 'l', 'r'] as const) {
      if (!mazeOpen(m.maze, p, d)) continue
      const n = stepTo(p, d)
      if (seen.has(n.join())) continue
      seen.add(n.join())
      q.push({ p: n, path: [...path, d] })
    }
  }
  return []
}

/* ---------- reducer ---------- */

function emit(st: JinakState, kind: 'solve' | 'strike' | 'step', mod: number) {
  st.eventSeq++
  st.event = { id: st.eventSeq, kind, mod }
}

function finish(st: JinakState, ok: boolean, left: number) {
  st.phase = ok ? 'defused' : 'boom'
  st.finalLeft = ok ? Math.max(0, left) : 0
  st.clockId++
  st.history = [...st.history, { round: st.round, defuser: st.defuser, ok, left: st.finalLeft, strikes: st.strikes }]
}

function solve(st: JinakState, mod: number, left: number) {
  st.solved = st.solved.map((v, i) => v || i === mod)
  emit(st, 'solve', mod)
  if (st.solved.every(Boolean)) finish(st, true, left)
}

function strike(st: JinakState, mod: number, left: number) {
  st.strikes++
  emit(st, 'strike', mod)
  if (st.strikes >= st.opts.strikes) return finish(st, false, left)
  const up = LEVELS[st.opts.level].speedup
  if (up !== 1) {
    // jam makin cepat: mulai hitung ulang dari sisa waktu yang terlihat penjinak
    st.timeLeft = Math.max(1000, left)
    st.rate *= up
    st.clockId++
  }
}

export function reduce(state: JinakState, action: JinakAction, by: Seat): JinakState {
  const st: JinakState = structuredClone(state)

  if (action.type === 'start') {
    if (st.phase !== 'intro') return state
    st.phase = 'live'
    st.clockId++
    return st
  }
  if (action.type === 'timeout') {
    if (st.phase !== 'live' || by !== 0 || action.clockId !== st.clockId) return state
    finish(st, false, 0)
    return st
  }
  if (action.type === 'next') {
    if (st.phase !== 'defused' && st.phase !== 'boom') return state
    st.round++
    st.defuser = (st.defuser + 1) % st.opts.players
    st.phase = 'intro'
    st.event = null
    newBomb(st)
    return st
  }

  // aksi modul: hanya penjinak, saat bom hidup, di modul yang belum beres
  if (st.phase !== 'live' || by !== st.defuser) return state
  const m = st.modules[action.mod]
  if (!m || st.solved[action.mod]) return state
  const left = Math.max(0, Math.min(st.timeLeft, action.left))

  switch (action.type) {
    case 'cut': {
      if (m.kind !== 'kabel' || m.cut.includes(action.wire) || action.wire < 0 || action.wire >= m.wires.length) return state
      m.cut = [...m.cut, action.wire]
      if (action.wire === wireAnswer(m.wires, st.info)) solve(st, action.mod, left)
      else strike(st, action.mod, left)
      return st
    }
    case 'button': {
      if (m.kind !== 'tombol') return state
      if (buttonOk(m, st.info, action.hold, action.shown)) solve(st, action.mod, left)
      else strike(st, action.mod, left)
      return st
    }
    case 'press': {
      if (m.kind !== 'simbol' || !m.symbols.includes(action.symbol) || m.pressed.includes(action.symbol)) return state
      const order = symbolOrder(m.symbols)
      if (order[m.pressed.length] === action.symbol) {
        m.pressed = [...m.pressed, action.symbol]
        if (m.pressed.length === order.length) solve(st, action.mod, left)
        else emit(st, 'step', action.mod)
      } else {
        m.pressed = []
        strike(st, action.mod, left)
      }
      return st
    }
    case 'move': {
      if (m.kind !== 'labirin') return state
      const n = stepTo(m.pos, action.dir)
      if (n[0] < 0 || n[1] < 0 || n[0] > 5 || n[1] > 5) return state
      if (!mazeOpen(m.maze, m.pos, action.dir)) {
        strike(st, action.mod, left)
        return st
      }
      m.pos = n
      if (n[0] === m.goal[0] && n[1] === m.goal[1]) solve(st, action.mod, left)
      return st
    }
    case 'submit': {
      if (m.kind !== 'sandi') return state
      if (passwordMatches(m.columns)[0] === action.word.toUpperCase()) solve(st, action.mod, left)
      else strike(st, action.mod, left)
      return st
    }
    case 'unlock': {
      if (m.kind !== 'gembok') return state
      if (lockCode(m, st.info) === action.code) solve(st, action.mod, left)
      else strike(st, action.mod, left)
      return st
    }
  }
}
