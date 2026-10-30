import { pickOne } from '../botKit'
import type { BotPolicy } from '../types'
import { canGuess } from './engine'
import { sketchStrokes } from './sketches'
import type { DrawAction, DrawState } from './types'
import { PACK_WORDS } from './words'

const SILLY = ['tahu bulat', 'kecoa terbang', 'ini apa sih', 'mantan', 'gambar apaan nih', 'alien', 'tagihan listrik', 'kucing ngambek', 'nasi kuning', 'hah?', 'mirip bosku', 'semut nyasar']

/** Rencana menebak satu giliran gambar. */
type Plan = { phaseId: number; hitAt: number | null; nextAt: number }

function plan(s: DrawState, level: 1 | 2 | 3, rnd: () => number, now: number): Plan {
  const span = s.opts.seconds * 1000
  const hit = rnd() < [0.5, 0.75, 0.92][level - 1]
  const [lo, hi] = [[0.6, 0.95], [0.4, 0.8], [0.2, 0.6]][level - 1]
  return { phaseId: s.phaseId, hitAt: hit ? now + span * (lo + rnd() * (hi - lo)) : null, nextAt: now + 6000 + rnd() * 6000 }
}

/**
 * Bot tidak melihat gambar. Tebakannya disimulasikan: sekali per giliran diputuskan apakah
 * ia "paham" dan kapan, sisanya tebakan ngawur. Jawaban `s.word` hanya dipakai saat waktunya tiba.
 */
function guess(s: DrawState, level: 1 | 2 | 3, rnd: () => number, mem: Record<string, unknown>, now: number) {
  let p = mem.plan as Plan | undefined
  if (p?.phaseId !== s.phaseId) {
    p = plan(s, level, rnd, now)
    mem.plan = p
  }
  const drawn = s.strokes.length >= 2
  if (p.hitAt !== null && now + 500 >= p.hitAt) {
    if (drawn) return { action: { type: 'guess', text: s.word } as DrawAction, delay: 600 + rnd() * 900 }
    p.hitAt = now + 4000 // kanvas masih kosong: belum ada yang bisa ditebak
  }
  const at = p.hitAt === null ? p.nextAt : Math.min(p.hitAt, p.nextAt)
  const delay = Math.max(800, at - now)
  if (at === p.hitAt) return { action: { type: 'guess', text: s.word } as DrawAction, delay }
  p.nextAt = now + delay + 7000 + rnd() * 7000
  const similar = PACK_WORDS.umum.filter((w) => w.level === s.level).map((w) => w.word)
  const text = rnd() < 0.5 ? pickOne(SILLY, rnd) : pickOne(similar, rnd)
  return { action: { type: 'guess', text } as DrawAction, delay }
}

export const drawBot: BotPolicy<DrawState, DrawAction> = ({ state: s, seat, level, rnd, mem, now }) => {
  if (s.phase === 'choose') return s.drawer === seat ? { action: { type: 'pick', i: Math.floor(rnd() * s.choices.length) }, delay: 2000 + rnd() * 1500 } : null
  if (s.phase !== 'draw') return null
  if (s.drawer === seat) {
    const next = sketchStrokes(s.word)[s.strokes.length]
    return next ? { action: { type: 'stroke', s: next }, delay: 280 + rnd() * 320 } : null
  }
  return canGuess(s, seat) ? guess(s, level, rnd, mem, now) : null
}
