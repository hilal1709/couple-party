import { shuffle } from '../rng'
import { DARK, LIGHT, type Card, type Face, type Variant } from './types'

const f = (kind: Face['kind'], color: Face['color'], value = 0, rev?: boolean): Face =>
  rev ? { kind, color, value, rev } : { kind, color, value }

/** Classic: 108 kartu. */
export function classicFaces(): Face[] {
  const out: Face[] = []
  for (const c of LIGHT) {
    out.push(f('num', c, 0))
    for (let v = 1; v <= 9; v++) out.push(f('num', c, v), f('num', c, v))
    for (let i = 0; i < 2; i++) out.push(f('skip', c), f('reverse', c), f('draw', c, 2))
  }
  for (let i = 0; i < 4; i++) out.push(f('wild', null), f('wildDraw', null, 4))
  return out
}

/** Flip: tiap sisi 112 wajah (1–9 ×2, 2× tiap aksi per warna, 4 Wild + 4 Wild Draw). */
export function flipLightFaces(): Face[] {
  const out: Face[] = []
  for (const c of LIGHT) {
    for (let v = 1; v <= 9; v++) out.push(f('num', c, v), f('num', c, v))
    for (let i = 0; i < 2; i++) out.push(f('draw', c, 1), f('reverse', c), f('skip', c), f('flip', c))
  }
  for (let i = 0; i < 4; i++) out.push(f('wild', null), f('wildDraw', null, 2))
  return out
}

export function flipDarkFaces(): Face[] {
  const out: Face[] = []
  for (const c of DARK) {
    for (let v = 1; v <= 9; v++) out.push(f('num', c, v), f('num', c, v))
    for (let i = 0; i < 2; i++) out.push(f('draw', c, 5), f('reverse', c), f('skipAll', c), f('flip', c))
  }
  for (let i = 0; i < 4; i++) out.push(f('wild', null), f('wildDrawColor', null))
  return out
}

/**
 * No Mercy: 168 kartu. Per warna: 0–9 ×2, Skip ×3, Skip Everyone ×2, Reverse ×3,
 * Draw 2 ×3, Draw 4 ×2, Discard All ×3. Wild: Reverse Draw 4 ×8, Draw 6 ×4, Draw 10 ×4, Color Roulette ×8.
 */
export function noMercyFaces(): Face[] {
  const out: Face[] = []
  for (const c of LIGHT) {
    for (let v = 0; v <= 9; v++) out.push(f('num', c, v), f('num', c, v))
    for (let i = 0; i < 3; i++) out.push(f('skip', c), f('reverse', c), f('draw', c, 2), f('discardAll', c))
    for (let i = 0; i < 2; i++) out.push(f('skipAll', c), f('draw', c, 4))
  }
  for (let i = 0; i < 8; i++) out.push(f('wildDraw', null, 4, true), f('roulette', null))
  for (let i = 0; i < 4; i++) out.push(f('wildDraw', null, 6), f('wildDraw', null, 10))
  return out
}

export function buildDeck(variant: Variant, seed: number): [Card[], number] {
  if (variant === 'flip') {
    // pasangan sisi terang/gelap diacak sekali, lalu tetap sepanjang game
    const [dark, s] = shuffle(flipDarkFaces(), seed)
    return [flipLightFaces().map((light, i) => ({ id: `c${i}`, faces: [light, dark[i]] })), s]
  }
  const faces = variant === 'classic' ? classicFaces() : noMercyFaces()
  return [faces.map((face, i) => ({ id: `c${i}`, faces: [face] })), seed]
}
