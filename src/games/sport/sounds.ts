import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import type { SportState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }

/** Suara perubahan state; suara yang menempel pada animasi bola dipicu dari adegannya. */
export function cuesFor(prev: SportState | null, next: SportState, seat: Seat): SoundCue[] {
  const out: SoundCue[] = []
  if (!prev) return out
  const a = prev.m
  const b = next.m
  // cabang lain memutar suaranya sendiri dari papan
  if (a.kind !== 'bowling' || b.kind !== 'bowling') return out
  if (a.phase !== 'end' && b.phase === 'end') out.push({ sfx: b.winners.includes(seat) ? 'sport-champion' : 'sport-lose', delay: 300 })
  if (b.phase === 'aim' && b.turn === seat && (a.turn !== seat || a.phase !== 'aim')) out.push({ sfx: 'sport-turn', delay: 200 })
  return out
}
