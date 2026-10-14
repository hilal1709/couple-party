import { describe, expect, it } from 'vitest'
import { defaultOptions, faceOf, init, reduce } from './engine'
import { isTense, soundsFor } from './sounds'
import type { Card, Face, UnoState } from './types'

let n = 0
const c = (kind: Face['kind'], color: Face['color'], value = 0): Card => ({ id: `s${n++}`, faces: [{ kind, color, value }] })
const filler = () => [c('num', 'yellow', 1), c('num', 'yellow', 2)]
const table = (hands: Card[][], top: Card): UnoState => {
  const base = init(3, defaultOptions('classic', hands.length))
  return {
    ...base,
    hands,
    discard: [top],
    deck: Array.from({ length: 30 }, (_, i) => c('num', 'blue', i % 10)),
    turn: 0,
    dir: 1,
    color: faceOf(top, 0).color,
    pending: null,
    event: null,
    eventId: 0,
  }
}
const names = (cues: ReturnType<typeof soundsFor>) => cues.map((q) => q.sfx)

describe('suara UNO', () => {
  it('awal game: kocok & bagi', () => {
    expect(names(soundsFor(null, init(1, defaultOptions()), 0))).toEqual(['card-shuffle', 'pack-open'])
  })

  it('kartu angka = taruh kartu; giliran pindah ke kursi 1 → ding untuk kursi 1 saja', () => {
    const a = c('num', 'red', 3)
    const s = table([[a, ...filler()], filler()], c('num', 'red', 5))
    const t = reduce(s, { type: 'play', cardId: a.id }, 0)
    expect(names(soundsFor(s, t, 0))[0]).toMatch(/^card-place-/)
    expect(names(soundsFor(s, t, 1))).toContain('turn-ding')
    expect(names(soundsFor(s, t, 0))).not.toContain('turn-ding')
  })

  it('+2: suara tumpukan lalu kartu diambil', () => {
    const d2 = c('draw', 'red', 2)
    const s = table([[d2, ...filler()], filler(), filler()], c('num', 'red', 5))
    const t = reduce(s, { type: 'play', cardId: d2.id }, 0)
    const q = names(soundsFor(s, t, 2))
    expect(q[0]).toBe('chips-stack')
    expect(q.filter((x) => x.startsWith('card-slide'))).toHaveLength(2)
  })

  it('UNO! dan ketahuan', () => {
    const [a, b] = [c('num', 'red', 1), c('num', 'red', 2)]
    const s = table([[a, b], filler()], c('num', 'red', 5))
    const u = reduce(s, { type: 'uno' }, 0)
    expect(names(soundsFor(s, u, 1))).toContain('jingle-uno')
    const p = reduce(s, { type: 'play', cardId: a.id }, 0)
    const caught = reduce(p, { type: 'catch' }, 1)
    expect(names(soundsFor(p, caught, 1))).toContain('jingle-caught')
  })

  it('menang ronde: jingle menang untuk pemenang, kalah untuk lainnya', () => {
    const last = c('num', 'red', 1)
    const s = table([[last], [c('num', 'blue', 9)]], c('num', 'red', 5))
    const t = reduce(s, { type: 'play', cardId: last.id }, 0)
    expect(names(soundsFor(s, t, 0))).toContain('jingle-round-win')
    expect(names(soundsFor(s, t, 1))).toContain('jingle-round-lose')
  })

  it('musik tegang saat ada yang tinggal 1 kartu atau tumpukan ≥ 6', () => {
    const s = table([[c('num', 'red', 1), c('num', 'red', 2)], filler()], c('num', 'red', 5))
    expect(isTense(s)).toBe(false)
    expect(isTense({ ...s, hands: [[c('num', 'red', 1)], filler()] })).toBe(true)
    expect(isTense({ ...s, pending: { kind: 'stack', victim: 1, amount: 6 } })).toBe(true)
  })

  it('tidak ada perubahan = tidak ada suara', () => {
    const s = table([filler(), filler()], c('num', 'red', 5))
    expect(soundsFor(s, s, 0)).toEqual([])
  })
})
