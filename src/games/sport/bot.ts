import type { BotPolicy } from '../types'
import { botShot } from './sports/archery/bot'
import { botThrow } from './sports/bowling/bot'
import { boxingBot } from './sports/boxing/bot'
import { penaltyBot } from './sports/penalty/bot'
import { racketBot } from './sports/racket/bot'
import type { SportAction, SportState } from './types'

export const sportBot: BotPolicy<SportState, SportAction> = ({ state: s, seat, level, rnd, mem }) => {
  const m = s.m
  if (m.kind === 'boxing') return boxingBot(m, seat, level, rnd)
  if (m.kind === 'penalty') return penaltyBot(m, seat, level, rnd)
  if (m.kind === 'racket') return racketBot(m, seat, level, rnd, mem)
  if (m.phase !== 'aim' || m.turn !== seat) return null
  if (m.kind === 'archery') return { action: { type: 'shoot', id: m.shotId, ...botShot(m, level, rnd) }, delay: 1200 + rnd() * 1200 }
  return { action: { type: 'throw', id: m.rollId, th: botThrow(m, level, rnd) }, delay: 1400 + rnd() * 1400 }
}
