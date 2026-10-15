import type { Seat } from '../types'
import { MODE_INFO } from './modes'
import { chainEngine } from './modes/chain'
import { qiuEngine } from './modes/qiuqiu'
import type { ModeEngine, Step } from './modes/step'
import type { DominoAction, DominoOptions, DominoState, Mode, ModeAction, ModeState } from './types'

export function defaultOptions(mode: Mode = 'gaple', players = 2): DominoOptions {
  return { players, mode, rounds: 3, hands: 10, chips: 1000, ante: 20 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function engineFor(opts: DominoOptions): ModeEngine<any, any> {
  return opts.mode === 'qiuqiu' ? qiuEngine(opts.ante) : chainEngine(opts.mode)
}

function matchOver(s: DominoState): boolean {
  const { opts } = s
  if (!MODE_INFO[opts.mode].chips) return s.round >= opts.rounds
  return s.round >= opts.hands || s.scores.filter((v) => v > 0).length <= 1
}

function apply(s: DominoState, step: Step<ModeState>): DominoState {
  let next: DominoState = {
    ...s,
    m: step.m,
    rng: step.rng ?? s.rng,
    event: step.event ?? s.event,
    eventId: step.event ? s.eventId + 1 : s.eventId,
  }
  if (step.done) {
    const scores = next.scores.map((v, i) => v + (step.done!.deltas[i] ?? 0))
    next = { ...next, scores, deltas: step.done.deltas, roundWinners: step.done.winners, phase: 'roundEnd' }
    if (matchOver(next)) {
      const top = Math.max(...scores)
      next = { ...next, phase: 'end', champions: scores.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0) }
    }
  }
  return next
}

function startRound(s: DominoState): DominoState {
  const e = engineFor(s.opts)
  const n = s.scores.length
  const { m, rng } = e.deal({ n, rng: s.rng, opts: s.opts, round: s.round, scores: s.scores })
  let next: DominoState = { ...s, m, rng, phase: 'play', deltas: Array(n).fill(0), roundWinners: [], event: { t: 'deal' }, eventId: s.eventId + 1 }
  const auto = e.settle?.(m)
  if (auto) next = apply(next, auto)
  return next
}

export function init(seed: number, options?: Partial<DominoOptions>): DominoState {
  const opts = { ...defaultOptions(), ...options }
  const info = MODE_INFO[opts.mode]
  const n = Math.min(info.max, Math.max(info.min, opts.players))
  return startRound({
    opts: { ...opts, players: n },
    rng: seed,
    round: 1,
    scores: Array(n).fill(info.chips ? opts.chips : 0),
    deltas: Array(n).fill(0),
    phase: 'play',
    roundWinners: [],
    champions: null,
    event: null,
    eventId: 0,
    // diisi startRound
    m: null as unknown as ModeState,
  })
}

export function reduce(s: DominoState, a: DominoAction, by: Seat): DominoState {
  if (a.t === 'next') {
    if (s.phase !== 'roundEnd') return s
    return startRound({ ...s, round: s.round + 1 })
  }
  if (a.t === 'again') {
    if (s.phase !== 'end') return s
    return { ...init(s.rng, s.opts), eventId: s.eventId + 1 }
  }
  if (s.phase !== 'play' || by < 0 || by >= s.scores.length) return s
  const step = engineFor(s.opts).reduce(s.m, a as ModeAction, by)
  return step ? apply(s, step) : s
}
