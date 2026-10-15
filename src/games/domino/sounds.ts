import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import { QIU_NAMES } from './modes/qiuqiu'
import type { DominoState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }

const PLACE: SfxName[] = ['domino-place-1', 'domino-place-2', 'domino-place-3']
const DRAW: SfxName[] = ['domino-draw-1', 'domino-draw-2']

/** Kursi yang sedang giliran (null = tidak ada). */
export function turnOf(s: DominoState): Seat | null {
  if (s.phase !== 'play') return null
  const m = s.m
  if (m.kind === 'qiuqiu') return m.result ? null : m.turn
  return m.turn
}

/**
 * Suara untuk perubahan state `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: semua HP menghitung dari state yang sama, jadi semua mendengar hal yang sama.
 */
export function soundsFor(prev: DominoState | null, next: DominoState, seat: Seat): SoundCue[] {
  if (prev && prev.eventId === next.eventId && prev.phase === next.phase) return []
  const cues: SoundCue[] = []
  const e = next.event
  if (e && (!prev || prev.eventId !== next.eventId)) {
    switch (e.t) {
      case 'deal':
        cues.push({ sfx: 'domino-shuffle' }, { sfx: 'domino-deal', delay: 300 })
        break
      case 'play':
        cues.push({ sfx: PLACE[(next.eventId + e.by) % 3] })
        if (e.double) cues.push({ sfx: 'domino-place-3', delay: 90, volume: 0.7 })
        break
      case 'domino':
        cues.push({ sfx: 'domino-place-3' }, { sfx: 'domino-place-1', delay: 70 })
        break
      case 'score':
        cues.push({ sfx: PLACE[next.eventId % 3] }, { sfx: 'domino-score', delay: 150 })
        break
      case 'draw':
        cues.push({ sfx: DRAW[next.eventId % 2] })
        break
      case 'pass':
        cues.push({ sfx: 'domino-pass', volume: 0.6 })
        break
      case 'blocked':
        cues.push({ sfx: 'domino-pass', volume: 0.6 }, { sfx: 'domino-blocked', delay: 200 })
        break
      case 'bet':
        cues.push({ sfx: 'domino-chip' })
        break
      case 'allin':
        cues.push({ sfx: 'domino-chips' }, { sfx: 'domino-pot', delay: 180 })
        break
      case 'check':
        cues.push({ sfx: 'domino-check', volume: 0.7 })
        break
      case 'fold':
        cues.push({ sfx: 'domino-fold' })
        break
      case 'street':
        cues.push({ sfx: 'domino-deal', volume: 0.8 })
        break
      case 'round':
        cues.push({ sfx: 'domino-place-2' }, { sfx: 'domino-place-1', delay: 120 })
        if (e.special) cues.push({ sfx: 'domino-special', delay: 260 })
        break
    }
  }

  if (next.phase !== 'play' && (!prev || prev.phase === 'play')) {
    const won = next.champions ? next.champions.includes(seat) : next.roundWinners.includes(seat)
    if (next.m.kind === 'qiuqiu' && next.deltas[seat] > 0) cues.push({ sfx: 'domino-pot', delay: 250 })
    cues.push({ sfx: next.champions ? (won ? 'domino-champion' : 'domino-lose') : won ? 'domino-win' : 'domino-lose', delay: 600 })
    return cues
  }

  const t = turnOf(next)
  if (t === seat && (!prev || turnOf(prev) !== seat)) cues.push({ sfx: 'domino-turn', delay: 200, volume: 0.6 })
  return cues
}

/** Musik tegang: ada yang tinggal 1 kartu, meja hampir buntu, atau ada yang all-in. */
export function isTense(s: DominoState): boolean {
  if (s.phase !== 'play') return false
  const m = s.m
  if (m.kind === 'qiuqiu') return m.inHand.some((h, i) => h && !m.folded[i] && m.stack[i] === 0)
  return m.hands.some((h) => h.length === 1) || m.passes >= m.hands.length - 1
}

export type Effect = { anim: 'domino-deal' | 'domino-score' | 'domino-slam' | 'domino-blocked' | 'domino-chips' | 'domino-special'; text?: string }

/** Animasi Lottie besar untuk kejadian tertentu. */
export function effectFor(prev: DominoState | null, next: DominoState, seat: Seat): Effect | null {
  if (!prev || prev.eventId === next.eventId) return null
  const e = next.event
  if (!e) return null
  if (e.t === 'score') return { anim: 'domino-score', text: `+${e.pts}` }
  if (e.t === 'domino') return { anim: 'domino-slam', text: 'DOMINO!' }
  if (e.t === 'blocked') return { anim: 'domino-blocked', text: 'BUNTU!' }
  if (e.t === 'allin') return { anim: 'domino-chips', text: 'ALL-IN!' }
  if (e.t === 'round' && e.special) return { anim: 'domino-special', text: `${QIU_NAMES[e.special].toUpperCase()}!` }
  if (next.phase !== 'play' && prev.phase === 'play' && next.m.kind === 'qiuqiu' && next.deltas[seat] > 0) return { anim: 'domino-chips' }
  if (e.t === 'deal') return { anim: 'domino-deal' }
  return null
}
