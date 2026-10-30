import type { BotLevel } from './types'

export const pickOne = <T,>(xs: T[], rnd: () => number): T => xs[Math.floor(rnd() * xs.length)]

/** Elemen dengan nilai tertinggi; seri = yang pertama. */
export function best<T>(xs: T[], value: (x: T) => number): T {
  return xs.reduce((a, b) => (value(b) > value(a) ? b : a))
}

export type Bet = { t: 'fold' } | { t: 'check' } | { t: 'call' } | { t: 'raise'; to: number } | { t: 'allin' }

/** Keadaan taruhan satu kursi, sama untuk Poker dan Qiu Qiu. */
export type BetSpot = {
  need: number
  stack: number
  /** taruhan kursi ini di putaran ini */
  bet: number
  minTo: number
  pot: number
}

/** `power` = kekuatan tangan 0..1, hanya dari kartu yang boleh dilihat kursi ini. */
export function betAction({ need, stack, bet, minTo, pot }: BetSpot, power: number, level: BotLevel, rnd: () => number): Bet {
  const canRaise = minTo - bet < stack
  if (level === 1) {
    if (need === 0) return canRaise && rnd() < 0.15 ? { t: 'raise', to: minTo } : { t: 'check' }
    return rnd() < 0.2 ? { t: 'fold' } : { t: 'call' }
  }
  const bluff = level === 3 && rnd() < 0.08
  const eager = power + (rnd() - 0.5) * 0.2
  if (eager > 0.92 && rnd() < 0.3) return { t: 'allin' }
  if ((eager > 0.72 || bluff) && canRaise) {
    const extra = Math.floor((pot * (0.3 + rnd() * 0.4)) / 10) * 10
    const to = Math.min(minTo + extra, bet + stack - 1)
    return { t: 'raise', to: Math.max(minTo, to) }
  }
  if (need === 0) return { t: 'check' }
  // susah menimbang harga panggilan terhadap pot; sedang cukup melihat seberapa besar taruhannya
  const price = level === 3 ? need / (pot + need) : need / (stack + need)
  return eager >= price * (level === 3 ? 1 : 0.8) + 0.1 ? { t: 'call' } : { t: 'fold' }
}
