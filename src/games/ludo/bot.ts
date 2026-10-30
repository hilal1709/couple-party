import type { BotLevel, BotPolicy } from '../types'
import { isSafe, specialAt, trackIndex, trackLen, finishOf } from './board'
import { legalMovesAll, target } from './engine'
import type { LudoAction, LudoState } from './types'

/** Berapa bidak lawan bisa mencapai petak `t` dengan satu lemparan. */
function threats(s: LudoState, team: number, t: number): number {
  if (isSafe(t)) return 0
  const len = trackLen(s.opts.arms)
  let n = 0
  s.prog.forEach((ps, seat) => {
    if (s.team[seat] === team) return
    for (const p of ps) {
      const at = trackIndex(s.opts.arms, s.arm[seat], p)
      if (at === null) continue
      const gap = (t - at + len) % len
      if (gap >= 1 && gap <= 6) n++
    }
  })
  return n
}

function score(s: LudoState, m: { owner: number; piece: number }, level: BotLevel, rnd: () => number): number {
  const { arms } = s.opts
  const from = s.prog[m.owner][m.piece]
  const to = target(s, m.owner, m.piece, s.die!)!
  const t = trackIndex(arms, s.arm[m.owner], to)
  const hits = t !== null && !isSafe(t) && s.prog.some((ps, seat) => s.team[seat] !== s.team[m.owner] && ps.some((p) => trackIndex(arms, s.arm[seat], p) === t))
  const base = (hits ? 10 : 0) + (from < 0 ? 4 : 0) + rnd() * 3
  if (level < 3) return base
  const here = from < 0 ? null : trackIndex(arms, s.arm[m.owner], from)
  const fx = t === null ? null : specialAt(t)
  return (
    base +
    (to === finishOf(arms) ? 8 : 0) +
    (t === null && here !== null ? 5 : 0) + // masuk jalur rumah = aman selamanya
    (s.opts.specials && (fx === 'boost' || fx === 'portal') ? 3 : 0) -
    (s.opts.specials && fx === 'slip' ? 3 : 0) -
    (t === null ? 0 : threats(s, s.team[m.owner], t) * 3) +
    (here === null ? 0 : threats(s, s.team[m.owner], here) * 2) + // kabur dari bidak yang mengincar
    to * 0.04
  )
}

/** Pilihan bot untuk giliran sekarang: utamakan menangkap lawan, lalu keluar kandang. */
export function botAction(s: LudoState, rnd: () => number, level: BotLevel = 2): LudoAction | null {
  if (s.phase === 'roll') return { type: 'roll' }
  if (s.phase !== 'move') return null
  const moves = legalMovesAll(s)
  if (!moves.length) return null
  if (level === 1) {
    const m = moves[Math.floor(rnd() * moves.length)]
    return { type: 'move', owner: m.owner, piece: m.piece }
  }
  const scored = moves.map((m) => ({ m, v: score(s, m, level, rnd) }))
  const { m } = scored.reduce((a, b) => (b.v > a.v ? b : a))
  return { type: 'move', owner: m.owner, piece: m.piece }
}

export const ludoBot: BotPolicy<LudoState, LudoAction> = ({ state: s, seat, level, rnd }) => {
  if (s.turn !== seat) return null
  const action = botAction(s, rnd, level)
  return action && { action, delay: 1000 + rnd() * 500 }
}
