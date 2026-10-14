import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import { activeSeats, faceOf, topCard } from './engine'
import type { Face, UnoState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number }

/** Suara saat sebuah kartu mendarat di tumpukan buang. */
export function placeSound(f: Face, cardId: string): SfxName {
  switch (f.kind) {
    case 'skip':
    case 'skipAll':
      return 'card-shove'
    case 'reverse':
    case 'discardAll':
      return 'card-fan'
    case 'draw':
    case 'wildDraw':
      return 'chips-stack'
    case 'wild':
    case 'wildDrawColor':
      return 'ui-select'
    case 'roulette':
      return 'dice-shake'
    case 'flip':
      return 'pack-take'
    default: {
      // variasi kecil supaya kartu angka tidak terdengar monoton
      const n = [...cardId].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3
      return (['card-place-1', 'card-place-2', 'card-place-3'] as const)[n]
    }
  }
}

/**
 * Daftar suara untuk perubahan state `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: dipanggil di semua HP dari state yang sama, jadi semua mendengar hal yang sama.
 */
export function soundsFor(prev: UnoState | null, next: UnoState, seat: Seat): SoundCue[] {
  if (prev && prev.eventId === next.eventId && prev.round === next.round && topCard(prev).id === topCard(next).id) return []
  const cues: SoundCue[] = []

  // ronde baru: kocok & bagi
  if (!prev || next.round !== prev.round || (prev.roundWinner !== null && next.roundWinner === null)) {
    cues.push({ sfx: 'card-shuffle' }, { sfx: 'pack-open', delay: 350 })
    return cues
  }

  // kartu baru di tumpukan buang
  const top = topCard(next)
  if (top.id !== topCard(prev).id) cues.push({ sfx: placeSound(faceOf(top, next.side), top.id) })

  const e = next.event
  if (e && next.eventId !== prev.eventId) {
    switch (e.t) {
      case 'draw':
        for (let i = 0; i < Math.min(e.n, 4); i++) cues.push({ sfx: (['card-slide-1', 'card-slide-2', 'card-slide-3'] as const)[i % 3], delay: 90 * i + 60 })
        break
      case 'uno':
        cues.push({ sfx: 'jingle-uno' })
        break
      case 'caught':
        cues.push({ sfx: 'jingle-caught' })
        break
      case 'challengeWin':
        cues.push({ sfx: 'jingle-challenge-win' })
        break
      case 'challengeLose':
        cues.push({ sfx: 'jingle-challenge-lose' })
        break
      case 'swap':
      case 'rotate':
        cues.push({ sfx: 'card-fan', delay: 120 })
        break
      case 'reverse':
        cues.push({ sfx: 'switch', delay: 100 })
        break
      case 'flip':
        cues.push({ sfx: 'card-shuffle', delay: 80 })
        break
      case 'mercy':
        cues.push({ sfx: 'jingle-out' })
        break
      case 'round':
        cues.push({
          sfx: e.winner === seat ? (next.gameWinner !== null ? 'jingle-champion' : 'jingle-round-win') : 'jingle-round-lose',
          delay: 250,
        })
        break
      default:
        break
    }
  }

  // giliranku dimulai
  if (next.roundWinner === null && next.turn === seat && prev.turn !== seat) cues.push({ sfx: 'turn-ding', delay: 220, volume: 0.6 })

  return cues
}

/** Musik tegang: ada pemain yang tinggal 1 kartu, atau tumpukan +6 ke atas. */
export function isTense(s: UnoState): boolean {
  if (s.roundWinner !== null) return false
  if (s.pending?.kind === 'stack' && s.pending.amount >= 6) return true
  return activeSeats(s).some((i) => s.hands[i].length === 1)
}
