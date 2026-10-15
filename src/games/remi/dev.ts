import { reduce } from './engine'
import { minRaiseTo } from './modes/poker'
import type { ModeState, RemiAction, RemiState } from './types'

/** RNG kecil untuk simulasi acak yang bisa diulang (tes & demo). */
export function lcg(seed: number) {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

/** Kandidat aksi kasar per mode; yang tidak sah ditolak reducer. */
export function candidates(m: ModeState, seat: number, rnd: () => number): RemiAction[] {
  const hand = 'hands' in m ? m.hands[seat] : []
  const ids = hand.map((c) => c.id)
  switch (m.kind) {
    case 'cangkulan':
      return [...ids.map((id) => ({ t: 'play', id }) as const), { t: 'dig' }, { t: 'pass' }]
    case 'bigtwo': {
      const out: RemiAction[] = ids.map((id) => ({ t: 'play', ids: [id] }))
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          out.push({ t: 'play', ids: [ids[i], ids[j]] })
          for (let k = j + 1; k < ids.length; k++) out.push({ t: 'play', ids: [ids[i], ids[j], ids[k]] })
        }
      for (let r = 0; r < 30; r++) out.push({ t: 'play', ids: [...ids].sort(() => rnd() - 0.5).slice(0, 5) })
      out.push({ t: 'pass' })
      return out
    }
    case 'remi41':
      return [{ t: 'drawDeck' }, { t: 'drawDiscard' }, ...ids.map((id) => ({ t: 'discard', id }) as const)]
    case 'poker':
      return [
        { t: 'check' },
        { t: 'call' },
        { t: 'raise', to: minRaiseTo(m) },
        ...(rnd() < 0.1 ? [{ t: 'allin' } as const] : []),
        ...(rnd() < 0.15 ? [{ t: 'fold' } as const] : []),
      ]
    case 'joker':
      return [...Array.from({ length: 30 }, (_, i) => ({ t: 'pick', i }) as const), ...(rnd() < 0.05 ? [{ t: 'shuffle' } as const] : [])]
    case 'bohong':
      return [
        ...(rnd() < 0.2 ? [{ t: 'call' } as const] : []),
        { t: 'accept' },
        { t: 'play', ids: [...ids].sort(() => rnd() - 0.5).slice(0, 1 + Math.floor(rnd() * 3)) },
      ]
    case 'blackjack':
      return [{ t: 'bet', amount: 50 }, { t: 'bet', amount: m.stack[seat] }, { t: 'hit' }, { t: 'stand' }, { t: 'double' }]
    case 'seven':
      return [...ids.map((id) => ({ t: 'play', id }) as const), ...ids.map((id) => ({ t: 'close', id }) as const)]
  }
}

/** Satu langkah acak yang sah (atau `next` di akhir ronde); null kalau macet. */
export function randomStep(s: RemiState, rnd: () => number): RemiState | null {
  const n = s.scores.length
  if (s.phase === 'roundEnd') return reduce(s, { t: 'next' }, 0)
  if (s.phase === 'end') return null
  const order = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5)
  for (const seat of order) {
    for (const a of candidates(s.m, seat, rnd).sort(() => rnd() - 0.5)) {
      const next = reduce(s, a, seat)
      if (next !== s) return next
    }
  }
  return null
}
