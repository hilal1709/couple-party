import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import type { SpyState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }
export type FxName = 'spy-reveal' | 'spy-stamp' | 'spy-caught' | 'spy-escape' | 'spy-guess'
export type FxCue = { anim: FxName; size: number; delay?: number }

/**
 * Suara & efek untuk perubahan `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: semua HP menghitung dari state yang sama.
 */
export function cuesFor(prev: SpyState | null, next: SpyState, seat: Seat): { sounds: SoundCue[]; fx: FxCue[] } {
  const sounds: SoundCue[] = []
  const fx: FxCue[] = []
  if (!prev) return { sounds, fx }

  // petunjuk baru masuk
  if (next.clues.length > prev.clues.length && next.round === prev.round) {
    const c = next.clues[next.clues.length - 1]
    sounds.push({ sfx: 'spy-clue', volume: c.text ? 0.8 : 0.4, rate: c.text ? 1 : 0.8 })
  }
  // suara voting yang baru masuk (pilihan sendiri lebih keras)
  if (next.phase === 'vote' && prev.phase === 'vote' && next.phaseId === prev.phaseId) {
    next.votes.forEach((v, i) => {
      if (v >= 0 && v !== prev.votes[i]) sounds.push({ sfx: 'spy-vote', volume: i === seat ? 0.9 : 0.4, rate: 0.95 + (i % 3) * 0.05 })
    })
  }
  if (next.phase === 'role' && prev.phase === 'role' && next.ready[seat] && !prev.ready[seat]) sounds.push({ sfx: 'spy-ready' })

  if (next.phaseId === prev.phaseId) return { sounds, fx }

  switch (next.phase) {
    case 'role':
      sounds.push({ sfx: 'spy-reveal' })
      fx.push({ anim: 'spy-reveal', size: 60 })
      break
    case 'clue':
      if (next.turn === seat && next.alive[seat]) sounds.push({ sfx: 'spy-turn' })
      if (prev.phase === 'guess' && prev.lastOut !== null) sounds.push({ sfx: 'spy-guess-wrong' })
      break
    case 'vote':
      sounds.push({ sfx: 'spy-tick', volume: 0.7, rate: next.candidates ? 1.15 : 1 })
      break
    case 'out':
      if (next.lastOut === null) {
        sounds.push({ sfx: 'spy-innocent', rate: 0.85 })
        break
      }
      sounds.push({ sfx: 'spy-stamp' })
      fx.push({ anim: 'spy-stamp', size: 50 })
      sounds.push({ sfx: next.roles[next.lastOut] === 'warga' ? 'spy-innocent' : 'spy-caught', delay: 450 })
      break
    case 'guess':
      sounds.push({ sfx: 'spy-turn', volume: next.lastOut === seat ? 1 : 0.5, rate: 1.1 })
      fx.push({ anim: 'spy-guess', size: 40 })
      break
    case 'roundEnd': {
      const mine = next.roles[seat] === 'warga' ? next.winner === 'warga' : next.winner === 'penyusup'
      if (next.result === 'guessed') sounds.push({ sfx: 'spy-guess-right' })
      if (next.result === 'blunder') sounds.push({ sfx: 'spy-guess-wrong' })
      sounds.push({ sfx: next.winner === 'warga' ? 'spy-caught' : 'spy-escape', delay: next.result === 'guessed' || next.result === 'blunder' ? 500 : 0, volume: mine ? 1 : 0.7 })
      fx.push({ anim: next.winner === 'warga' ? 'spy-caught' : 'spy-escape', size: 60, delay: 200 })
      break
    }
    case 'end':
      sounds.push({ sfx: next.winners?.includes(seat) ? 'spy-champion' : 'spy-lose' })
      break
  }
  return { sounds, fx }
}
