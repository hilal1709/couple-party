import type { SfxName } from '@/audio/audio'
import type { Seat } from '../types'
import { actorOf, alive } from './engine'
import type { MonopolyState } from './types'

export type SoundCue = { sfx: SfxName; delay?: number; volume?: number; rate?: number }
export type FxName = 'monopoly-sold' | 'monopoly-rent' | 'monopoly-build' | 'monopoly-jail' | 'monopoly-card' | 'monopoly-bankrupt' | 'monopoly-jackpot'
/** Efek Lottie; `sq` null = tengah papan. */
export type FxCue = { anim: FxName; sq: number | null; delay: number; size: number }

/** Lama satu langkah bidak (ms), dipakai animasi & jeda suara supaya sinkron. */
export const STEP_MS = 160

/**
 * Suara & efek untuk kejadian baru `prev → next`, dari sudut pandang kursi `seat`.
 * Murni: semua HP menghitung dari state yang sama.
 */
export function cuesFor(prev: MonopolyState | null, next: MonopolyState, seat: Seat): { sounds: SoundCue[]; fx: FxCue[] } {
  const sounds: SoundCue[] = []
  const fx: FxCue[] = []
  const e = next.event
  if (!prev || !e || prev.eventId === next.eventId) return { sounds, fx }
  const steps = Math.max(0, e.path.length - 1)
  if (e.dice) {
    sounds.push({ sfx: 'monopoly-shake', volume: 0.7 }, { sfx: next.eventId % 2 ? 'monopoly-dice-1' : 'monopoly-dice-2', delay: 220 })
    for (let i = 0; i < Math.min(steps, 14); i++) sounds.push({ sfx: 'monopoly-step', delay: 500 + i * STEP_MS, volume: 0.35, rate: 1 + (i % 2) * 0.08 })
  }
  const landed = e.dice ? 520 + steps * STEP_MS : 0
  const at = e.path.at(-1) ?? null

  for (const n of e.log) {
    switch (n.t) {
      case 'go':
        sounds.push({ sfx: 'monopoly-go', delay: landed })
        break
      case 'doubles':
        sounds.push({ sfx: 'monopoly-doubles', delay: landed + 200 })
        break
      case 'speeding':
      case 'jail':
        sounds.push({ sfx: 'monopoly-jail', delay: landed })
        fx.push({ anim: 'monopoly-jail', sq: 10, delay: landed, size: 22 })
        break
      case 'buy':
        sounds.push({ sfx: 'monopoly-buy' }, { sfx: 'monopoly-cash', delay: 120 })
        fx.push({ anim: 'monopoly-sold', sq: n.sq, delay: 0, size: 24 })
        break
      case 'sold':
        sounds.push({ sfx: 'monopoly-sold' }, { sfx: 'monopoly-cash', delay: 150 })
        fx.push({ anim: 'monopoly-sold', sq: n.sq, delay: 0, size: 24 })
        break
      case 'unsold':
        sounds.push({ sfx: 'monopoly-pass' })
        break
      case 'rent':
      case 'tax':
        sounds.push({ sfx: 'monopoly-rent', delay: landed })
        fx.push({ anim: 'monopoly-rent', sq: n.sq, delay: landed, size: 22 })
        break
      case 'card':
        sounds.push({ sfx: 'monopoly-card', delay: landed })
        fx.push({ anim: 'monopoly-card', sq: null, delay: landed, size: 34 })
        break
      case 'pot':
        sounds.push({ sfx: 'monopoly-jackpot', delay: landed })
        fx.push({ anim: 'monopoly-jackpot', sq: 20, delay: landed, size: 30 })
        break
      case 'bid':
        sounds.push({ sfx: 'monopoly-bid' })
        break
      case 'passBid':
      case 'tradeNo':
      case 'tradeCancel':
        sounds.push({ sfx: 'monopoly-pass', volume: 0.7 })
        break
      case 'build':
        sounds.push({ sfx: 'monopoly-build' })
        fx.push({ anim: 'monopoly-build', sq: n.sq, delay: 0, size: 18 })
        break
      case 'sell':
        sounds.push({ sfx: 'monopoly-cash', volume: 0.8 })
        break
      case 'mortgage':
      case 'unmortgage':
        sounds.push({ sfx: 'monopoly-mortgage' })
        break
      case 'tradeOffer':
      case 'tradeDone':
        sounds.push({ sfx: 'monopoly-trade' })
        if (n.t === 'tradeDone') sounds.push({ sfx: 'monopoly-cash', delay: 150 })
        break
      case 'jailOut':
        if (n.how !== 'double') sounds.push({ sfx: 'monopoly-cash', volume: 0.7 })
        break
      case 'paid':
        sounds.push({ sfx: 'monopoly-rent', volume: 0.7 })
        break
      case 'bankrupt':
        sounds.push({ sfx: 'monopoly-bankrupt', delay: 100 })
        fx.push({ anim: 'monopoly-bankrupt', sq: null, delay: 0, size: 40 })
        break
      case 'win':
      case 'timeUp':
        sounds.push({ sfx: n.who === seat ? 'monopoly-champion' : 'monopoly-lose', delay: Math.max(landed, 700) })
        break
    }
  }
  if (at !== null && e.dice && !e.log.length) sounds.push({ sfx: 'monopoly-step', delay: landed, volume: 0.5 })

  const me = actorOf(next) === seat && actorOf(prev) !== seat
  if (me) sounds.push({ sfx: 'monopoly-turn', delay: Math.max(landed, 300), volume: 0.6 })
  return { sounds, fx }
}

/** Musik tegang: ada yang terlilit utang / hampir bangkrut, atau putaran terakhir. */
export function isTense(s: MonopolyState): boolean {
  if (s.phase === 'end') return false
  if (s.debts.length) return true
  if (s.opts.end === 'rounds' && s.round >= s.opts.rounds) return true
  return alive(s).some((i) => s.cash[i] < 150)
}
