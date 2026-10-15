import type { Seat } from '../types'
import { MODE_INFO } from './modes'
import { bigtwo } from './modes/bigtwo'
import { blackjack } from './modes/blackjack'
import { bohong } from './modes/bohong'
import { cangkulan } from './modes/cangkulan'
import { joker } from './modes/joker'
import type { ModeEngine, Step } from './modes/mode'
import { pokerEngine } from './modes/poker'
import { remi41 } from './modes/remi41'
import { seven } from './modes/seven'
import type { Mode, ModeAction, ModeState, RemiAction, RemiOptions, RemiState } from './types'

export function defaultOptions(mode: Mode = 'cangkulan', players = 2): RemiOptions {
  return { players, mode, rounds: 3, hands: 10, chips: 1000, blind: 20, cangkulHand: 7 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function engineFor(opts: RemiOptions): ModeEngine<any, any> {
  switch (opts.mode) {
    case 'cangkulan':
      return cangkulan
    case 'bigtwo':
      return bigtwo
    case 'remi41':
      return remi41
    case 'poker':
      return pokerEngine(opts.blind)
    case 'joker':
      return joker
    case 'bohong':
      return bohong
    case 'blackjack':
      return blackjack
    case 'seven':
      return seven
  }
}

function matchOver(s: RemiState): boolean {
  const { opts } = s
  if (!MODE_INFO[opts.mode].chips) return s.round >= opts.rounds
  const alive = s.scores.filter((v) => v > 0).length
  return s.round >= opts.hands || alive <= (opts.mode === 'poker' ? 1 : 0)
}

function apply(s: RemiState, step: Step<ModeState>): RemiState {
  let next: RemiState = {
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

function startRound(s: RemiState): RemiState {
  const e = engineFor(s.opts)
  const n = s.scores.length
  const { m, rng } = e.deal({ n, rng: s.rng, opts: s.opts, round: s.round, scores: s.scores })
  let next: RemiState = {
    ...s,
    m,
    rng,
    phase: 'play',
    deltas: Array(n).fill(0),
    roundWinners: [],
    event: { t: 'deal' },
    eventId: s.eventId + 1,
  }
  const auto = e.settle?.(m)
  if (auto) next = apply(next, auto)
  return next
}

export function init(seed: number, options?: Partial<RemiOptions>): RemiState {
  const opts = { ...defaultOptions(), ...options }
  const info = MODE_INFO[opts.mode]
  const n = Math.min(info.max, Math.max(info.min, opts.players))
  const st: RemiState = {
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
  }
  return startRound(st)
}

export function reduce(s: RemiState, a: RemiAction, by: Seat): RemiState {
  if (a.t === 'next') {
    if (s.phase !== 'roundEnd') return s
    return startRound({ ...s, round: s.round + 1 })
  }
  if (a.t === 'again') {
    if (s.phase !== 'end') return s
    const fresh = init(s.rng, s.opts)
    return { ...fresh, eventId: s.eventId + 1 }
  }
  if (s.phase !== 'play' || by < 0 || by >= s.scores.length) return s
  const step = engineFor(s.opts).reduce(s.m, a as ModeAction, by, s.rng)
  return step ? apply(s, step) : s
}
