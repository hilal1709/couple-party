import { aliveSeats, canAim, canPower, canProtest, reduce } from './engine'
import type { BomState, Power } from './types'

export { lcg } from '../domino/dev'

const STEMS = ['kopi', 'kucing', 'bakso', 'sandal', 'tas', 'rumah', 'mangga', 'roti', 'balon', 'nasi', 'sapu', 'gitar', 'lampu', 'tikus', 'jeruk']
const ABC = 'abcdefghijklmnoprstu'

/** kata acak yang lolos aturan huruf/suku kata (isinya ngawur, tapi bentuknya sah) */
function fakeWord(s: BomState, rnd: () => number): string {
  const stem = STEMS[Math.floor(rnd() * STEMS.length)]
  const tail = Array.from({ length: 1 + Math.floor(rnd() * 7) }, () => ABC[Math.floor(rnd() * ABC.length)]).join('')
  const p = s.prompt
  const head = p.letter ? p.letter.toLowerCase() : ''
  return `${head}${stem}${p.syllable ? p.syllable.toLowerCase() : ''}${tail}`
}

/**
 * Satu langkah bot yang sah; null kalau game selesai.
 * Kadang memakai power-up, memprotes, atau membiarkan bom meledak (supaya game berakhir).
 */
export function randomStep(s: BomState, rnd: () => number): BomState | null {
  if (s.phase === 'end') return null
  if (s.phase === 'intro' || s.phase === 'boom') return reduce(s, { type: 'next' }, 0)
  const r = rnd()
  if (r < 0.08) return reduce(s, { type: 'boom', fuseId: s.fuseId }, 0)
  if (s.review && r < 0.2) {
    const who = aliveSeats(s).find((i) => canProtest(s, i))
    if (who !== undefined) return reduce(s, { type: 'protest', id: s.review.id }, who)
  }
  if (r < 0.28) {
    for (const p of ['balik', 'lompat', 'pendek'] as Power[]) {
      const who = aliveSeats(s).find((i) => canPower(s, i, p))
      if (who !== undefined) return reduce(s, { type: 'power', power: p }, who)
    }
  }
  if (s.aiming) {
    const targets = aliveSeats(s).filter((t) => canAim(s, s.holder, t))
    return reduce(s, { type: 'aim', target: targets[Math.floor(rnd() * targets.length)] }, s.holder)
  }
  const next = reduce(s, { type: 'word', text: fakeWord(s, rnd) }, s.holder)
  return next === s ? reduce(s, { type: 'boom', fuseId: s.fuseId }, 0) : next
}
