import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import { progPt, type Pt } from './board'
import { finish } from './engine'
import type { LudoEvent, LudoState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }
export type FxName = 'ludo-capture' | 'ludo-home' | 'ludo-six' | 'ludo-boost' | 'ludo-portal' | 'ludo-bomb' | 'ludo-slip'
/** Efek Lottie di titik papan (satuan petak); null = tengah papan. */
export type FxCue = { anim: FxName; at: Pt | null; delay: number; size: number }

/** Lama satu langkah bidak (ms). */
export const STEP_MS = 150
/** Lama loncatan (keluar kandang, dipulangkan, portal). */
export const JUMP_MS = 480
/** Jeda sebelum bidak jalan setelah dadu dilempar. */
export const DICE_MS = 520

/** Waktu mulai (ms) tiap gerakan dalam satu event, berurutan, plus waktu semuanya selesai. */
export function timeline(e: LudoEvent): { starts: number[]; ends: number[]; end: number } {
  let t = e.dice ? DICE_MS : 0
  const starts: number[] = []
  const ends: number[] = []
  for (const m of e.moves) {
    starts.push(t)
    t += m.jump || m.path[0] < 0 ? JUMP_MS : Math.max(1, m.path.length - 1) * STEP_MS
    ends.push(t)
  }
  return { starts, ends, end: t }
}

/**
 * Suara & efek untuk kejadian baru `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: semua HP menghitung dari state yang sama.
 */
export function cuesFor(prev: LudoState | null, next: LudoState, seat: Seat): { sounds: SoundCue[]; fx: FxCue[] } {
  const sounds: SoundCue[] = []
  const fx: FxCue[] = []
  const e = next.event
  if (!prev || !e || prev.eventId === next.eventId) return { sounds, fx }
  const { starts, ends, end } = timeline(e)
  const arms = next.opts.arms
  const ptOf = (s: Seat, piece: number) => progPt(arms, next.arm[s], piece, next.prog[s][piece])

  if (e.dice) sounds.push({ sfx: 'ludo-shake', volume: 0.7 }, { sfx: next.eventId % 2 ? 'ludo-throw-1' : 'ludo-throw-2', delay: 220 })
  e.moves.forEach((m, i) => {
    if (m.jump || m.path[0] < 0) {
      if (m.path[0] < 0) sounds.push({ sfx: 'ludo-out', delay: starts[i] })
      return
    }
    for (let k = 0; k < Math.min(m.path.length - 1, 16); k++) sounds.push({ sfx: 'ludo-step', delay: starts[i] + k * STEP_MS, volume: 0.4, rate: 1 + (k % 2) * 0.1 })
  })
  // akhir gerakan pertama: saat efek petak / tangkapan terjadi
  const landed = ends[0] ?? (e.dice ? DICE_MS : 0)

  for (const n of e.log) {
    switch (n.t) {
      case 'six':
        sounds.push({ sfx: 'ludo-six', delay: 300, volume: 0.8 })
        fx.push({ anim: 'ludo-six', at: null, delay: 240, size: 26 })
        break
      case 'tripleSix':
      case 'noMove':
        sounds.push({ sfx: 'ludo-nomove', delay: DICE_MS })
        break
      case 'capture':
        sounds.push({ sfx: 'ludo-capture', delay: landed })
        fx.push({ anim: 'ludo-capture', at: progPt(arms, next.arm[n.seat], n.piece, e.moves[0]?.path.at(-1) ?? 0), delay: landed, size: 22 })
        break
      case 'safe':
        sounds.push({ sfx: 'ludo-safe', delay: landed })
        break
      case 'home':
        sounds.push({ sfx: 'ludo-home', delay: end })
        fx.push({ anim: 'ludo-home', at: ptOf(n.seat, n.piece), delay: end - 100, size: 28 })
        break
      case 'special': {
        const at = progPt(arms, next.arm[n.seat], n.piece, e.moves[0]?.path.at(-1) ?? 0)
        const name: FxName = n.fx === 'boost' ? 'ludo-boost' : n.fx === 'portal' ? 'ludo-portal' : n.fx === 'bomb' ? 'ludo-bomb' : 'ludo-slip'
        sounds.push({ sfx: name, delay: landed })
        fx.push({ anim: name, at, delay: landed, size: n.fx === 'bomb' ? 30 : 20 })
        break
      }
      case 'win':
        sounds.push({ sfx: next.team[seat] === n.team ? 'ludo-champion' : 'ludo-lose', delay: Math.max(end, 700) + 300 })
        break
    }
  }
  const mine = next.turn === seat && next.phase !== 'end' && (prev.turn !== seat || next.phase === 'move')
  if (mine) sounds.push({ sfx: 'ludo-turn', delay: Math.max(end, 300), volume: 0.6 })
  return { sounds, fx }
}

/** Musik tegang: ada tim yang tinggal satu bidak lagi. */
export function isTense(s: LudoState): boolean {
  if (s.phase === 'end') return false
  const F = finish(s)
  const left = new Map<number, number>()
  s.prog.forEach((ps, i) => left.set(s.team[i], (left.get(s.team[i]) ?? 0) + ps.filter((p) => p !== F).length))
  return [...left.values()].some((n) => n === 1)
}
