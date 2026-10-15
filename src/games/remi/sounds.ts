import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import { MODE_INFO } from './modes'
import type { RemiState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }

const PLACE: SfxName[] = ['remi-place-1', 'remi-place-2', 'remi-place-3']
const SLIDE: SfxName[] = ['remi-slide-1', 'remi-slide-2']

/** Kursi yang sedang giliran (null = tidak ada / semua bareng). */
export function turnOf(s: RemiState): Seat | null {
  if (s.phase !== 'play') return null
  const m = s.m
  if (m.kind === 'blackjack') return m.step === 'play' ? m.turn : null
  if (m.kind === 'poker') return m.result ? null : m.turn
  return m.turn
}

/**
 * Suara untuk perubahan state `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: semua HP menghitung dari state yang sama, jadi semua mendengar hal yang sama.
 */
export function soundsFor(prev: RemiState | null, next: RemiState, seat: Seat): SoundCue[] {
  if (prev && prev.eventId === next.eventId && prev.phase === next.phase) return []
  const cues: SoundCue[] = []
  const e = next.event
  if (e && (!prev || prev.eventId !== next.eventId)) {
    switch (e.t) {
      case 'deal':
        cues.push({ sfx: 'remi-deal' }, { sfx: 'remi-fan', delay: 260 })
        break
      case 'play':
      case 'discard':
        cues.push({ sfx: PLACE[(next.eventId + ('by' in e ? e.by : 0)) % 3] })
        break
      case 'dig':
      case 'draw':
        cues.push({ sfx: SLIDE[next.eventId % 2] })
        break
      case 'pick':
        cues.push({ sfx: SLIDE[next.eventId % 2] })
        if (e.paired) cues.push({ sfx: 'remi-place-2', delay: 220 })
        break
      case 'shuffle':
        cues.push({ sfx: 'remi-fan' })
        break
      case 'pass':
        cues.push({ sfx: 'remi-pass', volume: 0.6 })
        break
      case 'trick':
        cues.push({ sfx: PLACE[next.eventId % 3] }, { sfx: 'remi-fan', delay: 200, volume: 0.6 })
        break
      case 'bomb':
      case 'close41':
        cues.push({ sfx: 'remi-bomb' })
        break
      case 'call':
        cues.push({ sfx: 'remi-call' }, { sfx: e.lied ? 'remi-liar' : 'remi-honest', delay: 300 })
        break
      case 'bet':
        cues.push({ sfx: 'remi-chip' })
        break
      case 'allin':
        cues.push({ sfx: 'remi-chips' }, { sfx: 'remi-pot', delay: 180 })
        break
      case 'check':
        cues.push({ sfx: 'remi-check', volume: 0.7 })
        break
      case 'fold':
        cues.push({ sfx: 'remi-fold' })
        break
      case 'street':
        cues.push({ sfx: 'remi-place-1' }, { sfx: 'remi-place-3', delay: 120 })
        break
      case 'hit':
        cues.push({ sfx: SLIDE[next.eventId % 2] })
        if (e.bust) cues.push({ sfx: 'remi-bust', delay: 200 })
        break
      case 'stand':
        cues.push({ sfx: 'remi-check', volume: 0.7 })
        break
      case 'blackjack':
        cues.push({ sfx: 'remi-blackjack' })
        break
      case 'dealer':
        cues.push({ sfx: 'remi-slide-2' }, { sfx: 'remi-slide-1', delay: 200 })
        break
      case 'closeCard':
        cues.push({ sfx: 'remi-fold', volume: 0.7 })
        break
      default:
        break
    }
  }

  // ronde / game selesai
  if (next.phase !== 'play' && (!prev || prev.phase === 'play')) {
    const won = next.champions ? next.champions.includes(seat) : next.roundWinners.includes(seat)
    if (next.m.kind === 'joker' && !next.champions) cues.push({ sfx: 'remi-joker', delay: 300 })
    else if (MODE_INFO[next.opts.mode].chips && next.deltas[seat] > 0) cues.push({ sfx: 'remi-pot', delay: 250 })
    cues.push({ sfx: next.champions ? (won ? 'remi-champion' : 'remi-lose') : won ? 'remi-win' : 'remi-lose', delay: 500 })
    return cues
  }

  // giliranku dimulai
  const t = turnOf(next)
  if (t === seat && (!prev || turnOf(prev) !== seat)) cues.push({ sfx: 'remi-turn', delay: 200, volume: 0.6 })
  return cues
}

/** Musik tegang: ada yang tinggal 1 kartu, ada all-in, atau dek hampir habis. */
export function isTense(s: RemiState): boolean {
  if (s.phase !== 'play') return false
  const m = s.m
  switch (m.kind) {
    case 'poker':
      return m.inHand.some((h, i) => h && !m.folded[i] && m.stack[i] === 0)
    case 'blackjack':
      return false
    case 'remi41':
      return m.deck.length <= m.hands.length
    case 'joker':
      return m.hands.filter((h) => h.length).length === 2
    default:
      return m.hands.some((h) => h.length === 1)
  }
}

export type Effect = { anim: 'remi-bomb' | 'remi-liar' | 'remi-joker' | 'remi-bust' | 'remi-chips' | 'remi-deal'; text?: string }

/** Animasi Lottie besar untuk kejadian tertentu. */
export function effectFor(prev: RemiState | null, next: RemiState, seat: Seat): Effect | null {
  if (!prev || prev.eventId === next.eventId) return null
  const e = next.event
  if (!e) return null
  if (e.t === 'bomb') return { anim: 'remi-bomb', text: 'BANTING!' }
  if (e.t === 'close41') return { anim: 'remi-bomb', text: '41!' }
  if (e.t === 'call') return { anim: 'remi-liar', text: e.lied ? 'BOHONG!' : 'JUJUR!' }
  if (e.t === 'hit' && e.bust && e.by === seat) return { anim: 'remi-bust', text: 'BUST' }
  if (e.t === 'allin') return { anim: 'remi-chips', text: 'ALL-IN!' }
  if (next.phase !== 'play' && prev.phase === 'play') {
    if (next.m.kind === 'joker') return { anim: 'remi-joker', text: 'JOKER!' }
    if (MODE_INFO[next.opts.mode].chips && next.deltas[seat] > 0) return { anim: 'remi-chips' }
  }
  if (e.t === 'deal') return { anim: 'remi-deal' }
  return null
}
