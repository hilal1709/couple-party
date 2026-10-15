import type { Seat } from '../../types'
import { dealTiles, handPips, isDouble, pips, shuffledSet } from '../tiles'
import type { ChainAction, ChainMode, ChainState, Placed, Side, Tile } from '../types'
import type { ModeEngine, Step } from './step'

/** Angka di ujung kiri & kanan rantai; null = meja kosong. */
export function ends(m: ChainState): [number, number] | null {
  return m.line.length ? [m.line[0].l, m.line[m.line.length - 1].r] : null
}

/** Sisi tempat kartu bisa dipasang (kosong = tidak nyambung). */
export function sidesFor(m: ChainState, t: Tile): Side[] {
  const e = ends(m)
  if (!e) return m.first && m.first !== t.id ? [] : ['R']
  const out: Side[] = []
  if (t.a === e[0] || t.b === e[0]) out.push('L')
  if (t.a === e[1] || t.b === e[1]) out.push('R')
  return out
}

export function chainPlayable(m: ChainState, seat: Seat): string[] {
  if (m.turn !== seat) return []
  return m.hands[seat].filter((t) => sidesFor(m, t).length).map((t) => t.id)
}

/** Giliran ini harus nyangkul dulu (Cangkul & Lima). */
export const mustDraw = (m: ChainState, seat: Seat) => m.mode !== 'gaple' && m.turn === seat && m.bone.length > 0 && chainPlayable(m, seat).length === 0
/** Boleh pass: tidak ada kartu yang nyambung dan tidak bisa nyangkul. */
export const canPass = (m: ChainState, seat: Seat) => m.turn === seat && chainPlayable(m, seat).length === 0 && (m.mode === 'gaple' || m.bone.length === 0)

/** Jumlah dua ujung (balak di ujung dihitung dua sisi) — dasar poin Domino Lima. */
export function endCount(line: Placed[]): number {
  if (!line.length) return 0
  if (line.length === 1) return pips(line[0].tile)
  const L = line[0]
  const R = line[line.length - 1]
  return (isDouble(L.tile) ? L.l * 2 : L.l) + (isDouble(R.tile) ? R.r * 2 : R.r)
}

const round5 = (v: number) => Math.round(v / 5) * 5

function place(line: Placed[], t: Tile, side: Side, by: Seat): Placed[] {
  if (!line.length) return [{ tile: t, l: t.a, r: t.b, by }]
  if (side === 'L') {
    const e = line[0].l
    return [{ tile: t, l: t.a === e ? t.b : t.a, r: e, by }, ...line]
  }
  const e = line[line.length - 1].r
  return [...line, { tile: t, l: e, r: t.a === e ? t.b : t.a, by }]
}

/** Poin akhir ronde: pemenang dapat total mata kartu lawan (Lima: dibulatkan ke 5). */
function finish(m: ChainState, winners: Seat[]): Step<ChainState>['done'] {
  const losers = m.hands.map((_, i) => i).filter((i) => !winners.includes(i))
  const raw = losers.reduce((s, i) => s + handPips(m.hands[i]), 0)
  const bonus = m.mode === 'lima' ? round5(raw) : raw
  return { deltas: m.hands.map((_, i) => m.pts[i] + (winners.includes(i) ? bonus : 0)), winners }
}

/** Pemain dengan total mata paling kecil (bisa lebih dari satu). */
function lowest(m: ChainState): Seat[] {
  const tot = m.hands.map(handPips)
  const lo = Math.min(...tot)
  return tot.map((v, i) => (v === lo ? i : -1)).filter((i) => i >= 0)
}

const HAND_SIZE: Record<ChainMode, (n: number) => number> = {
  gaple: () => 7,
  cangkul: (n) => (n === 2 ? 7 : 5),
  lima: (n) => (n === 2 ? 7 : 5),
}

/** Pembuka: pemegang balak tertinggi; kalau tak ada balak, kartu dengan mata terbanyak. */
function opener(hands: Tile[][]): { seat: Seat; id: string } {
  let best: { seat: Seat; t: Tile } | null = null
  const rank = (t: Tile) => (isDouble(t) ? 200 + t.a : pips(t) * 10 + t.b)
  hands.forEach((h, seat) =>
    h.forEach((t) => {
      if (!best || rank(t) > rank(best.t)) best = { seat, t }
    }),
  )
  const b = best as { seat: Seat; t: Tile } | null
  return b ? { seat: b.seat, id: b.t.id } : { seat: 0, id: '' }
}

export function chainEngine(mode: ChainMode): ModeEngine<ChainState, ChainAction> {
  return {
    deal({ n, rng }) {
      const [set, r] = shuffledSet(rng)
      const { hands, rest } = dealTiles(set, n, HAND_SIZE[mode](n))
      const o = opener(hands)
      return {
        m: { kind: 'chain', mode, hands, bone: rest, line: [], turn: o.seat, passes: 0, first: o.id, drew: 0, pts: Array(n).fill(0), last: null, blocked: false },
        rng: r,
      }
    },

    reduce(m, a, by) {
      if (by !== m.turn) return null
      const n = m.hands.length
      const nextTurn = (x: ChainState): ChainState => ({ ...x, turn: (by + 1) % n, drew: 0 })

      if (a.t === 'play') {
        const t = m.hands[by].find((x) => x.id === a.id)
        if (!t) return null
        const sides = sidesFor(m, t)
        const side = sides.includes(a.side) ? a.side : sides.length === 1 && !m.line.length ? sides[0] : null
        if (!side) return null
        const line = place(m.line, t, side, by)
        const hands = m.hands.map((h, i) => (i === by ? h.filter((x) => x.id !== t.id) : h))
        const count = mode === 'lima' ? endCount(line) : 0
        const gain = count > 0 && count % 5 === 0 ? count : 0
        const pts = m.pts.map((v, i) => (i === by ? v + gain : v))
        const next: ChainState = { ...m, hands, line, pts, passes: 0, first: null, last: { by, id: t.id, side } }
        if (!hands[by].length) {
          return { m: next, event: { t: 'domino', by }, done: finish(next, [by]) }
        }
        return { m: nextTurn(next), event: gain ? { t: 'score', by, pts: gain } : { t: 'play', by, double: isDouble(t) } }
      }

      if (a.t === 'draw') {
        if (!mustDraw(m, by)) return null
        const [top, ...bone] = m.bone
        return { m: { ...m, bone, hands: m.hands.map((h, i) => (i === by ? [...h, top] : h)), drew: m.drew + 1 }, event: { t: 'draw', by, n: m.drew + 1 } }
      }

      if (a.t === 'pass') {
        if (!canPass(m, by)) return null
        const passes = m.passes + 1
        if (passes >= n) {
          const next = { ...m, passes, blocked: true }
          return { m: next, event: { t: 'blocked' }, done: finish(next, lowest(next)) }
        }
        return { m: nextTurn({ ...m, passes }), event: { t: 'pass', by } }
      }
      return null
    },
  }
}
