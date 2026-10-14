import { cellOf } from '../board'
import type { Item, Tile } from '../types'
import { FX_INFO } from './copy'

/** Sprite hasil render Blender (scripts/blender/snakes.py → export.py). */
const SPRITES = import.meta.glob('/src/assets/snakes/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/snakes/${name}.webp`]

/** Ukuran satu kotak di viewBox papan (1000 x 1000). */
export const CELL = 100

/** Warna bidak per kursi: cukup kontras satu sama lain sampai 8 pemain. */
export const PAWN_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']

export function center(n: number): { x: number; y: number } {
  const { col, row } = cellOf(n)
  return { x: col * CELL + CELL / 2, y: (9 - row) * CELL + CELL / 2 }
}

const TILE_FILL: Record<Tile['kind'], string> = {
  challenge: '#ff37a6',
  quiz: '#5cf64a',
  item: '#87e752',
  fx: '#121212',
}

/** Kotak-kotak papan dengan nomor dan penanda kotak spesial. */
export function Cells({ tiles, traps }: { tiles: Record<number, Tile>; traps: Record<number, number> }) {
  return (
    <g>
      {Array.from({ length: 100 }, (_, i) => {
        const n = i + 1
        const { col, row } = cellOf(n)
        const x = col * CELL
        const y = (9 - row) * CELL
        const t = tiles[n]
        const dark = t?.kind === 'fx'
        const fill = t ? TILE_FILL[t.kind] : (col + row) % 2 ? '#ffcae9' : '#fff4fa'
        return (
          <g key={n}>
            <rect x={x} y={y} width={CELL} height={CELL} fill={fill} stroke="#121212" strokeWidth={3} />
            <text x={x + 8} y={y + 24} fontSize={20} fontWeight={700} fill={dark ? '#ffcae9' : '#121212'} opacity={0.8}>
              {n}
            </text>
            {t && <TileMark tile={t} x={x + CELL / 2} y={y + CELL / 2 + 10} />}
            {n === 1 && <CornerLabel x={x} y={y} text="MULAI" />}
            {n === 100 && <CornerLabel x={x} y={y} text="FINIS" />}
            {n in traps && <Spikes x={x + CELL - 22} y={y + 22} />}
          </g>
        )
      })}
    </g>
  )
}

function CornerLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x + CELL / 2} y={y + CELL - 14} textAnchor="middle" fontSize={17} fontFamily="Dela Gothic One, sans-serif" fill="#121212">
      {text}
    </text>
  )
}

function TileMark({ tile, x, y }: { tile: Tile; x: number; y: number }) {
  if (tile.kind === 'item') return <Gift x={x} y={y} />
  const label = tile.kind === 'challenge' ? 'T/D' : tile.kind === 'quiz' ? '?' : FX_INFO[tile.fx].mark
  const fg = tile.kind === 'fx' ? '#5cf64a' : '#121212'
  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="middle"
      fontSize={tile.kind === 'quiz' ? 44 : 30}
      fontFamily="Dela Gothic One, sans-serif"
      fill={fg}
    >
      {label}
    </text>
  )
}

function Gift({ x, y }: { x: number; y: number }) {
  return <image href={sprite('gift')} x={x - 26} y={y - 38} width={52} height={66} />
}

function Spikes({ x, y }: { x: number; y: number }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const r = i % 2 ? 7 : 16
    const a = (i / 12) * Math.PI * 2
    return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`
  }).join(' ')
  return <polygon points={pts} fill="#121212" stroke="#fff4fa" strokeWidth={2} />
}

/** Tangga: dua rel + anak tangga di sepanjang garis kaki → puncak. */
export function Ladder({ from, to }: { from: number; to: number }) {
  const a = center(from)
  const b = center(to)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const nx = (-dy / len) * 16
  const ny = (dx / len) * 16
  const rungs = Math.max(2, Math.floor(len / 42))
  return (
    <g strokeLinecap="round">
      {[1, -1].map((k) => (
        <g key={k}>
          <line x1={a.x + nx * k} y1={a.y + ny * k} x2={b.x + nx * k} y2={b.y + ny * k} stroke="#121212" strokeWidth={14} />
          <line x1={a.x + nx * k} y1={a.y + ny * k} x2={b.x + nx * k} y2={b.y + ny * k} stroke="#43b929" strokeWidth={7} />
        </g>
      ))}
      {Array.from({ length: rungs }, (_, i) => {
        const t = (i + 0.5) / rungs
        const cx = a.x + dx * t
        const cy = a.y + dy * t
        return <line key={i} x1={cx + nx} y1={cy + ny} x2={cx - nx} y2={cy - ny} stroke="#121212" strokeWidth={7} />
      })}
    </g>
  )
}

/** Ular kartun meliuk dari kepala (atas) ke ekor (bawah). */
export function Snake({ from, to, tone }: { from: number; to: number; tone: number }) {
  const h = center(from)
  const t = center(to)
  const dx = t.x - h.x
  const dy = t.y - h.y
  const len = Math.hypot(dx, dy)
  const px = (-dy / len) * Math.min(70, len / 4)
  const py = (dx / len) * Math.min(70, len / 4)
  const d = `M${h.x} ${h.y} C ${h.x + dx * 0.33 + px} ${h.y + dy * 0.33 + py}, ${h.x + dx * 0.66 - px} ${h.y + dy * 0.66 - py}, ${t.x} ${t.y}`
  const body = ['#ff37a6', '#5cf64a', '#ffcc1f', '#8a55ff'][tone % 4]
  // arah kepala menghadap menjauh dari badan
  const ang = (Math.atan2(-(dy * 0.33 + py), -(dx * 0.33 + px)) * 180) / Math.PI
  return (
    <g strokeLinecap="round" fill="none">
      <path d={d} stroke="#121212" strokeWidth={30} />
      <path d={d} stroke={body} strokeWidth={20} />
      <path d={d} stroke="#121212" strokeWidth={4} strokeDasharray="2 22" opacity={0.6} />
      <g transform={`translate(${h.x} ${h.y}) rotate(${ang})`}>
        <image href={sprite(`snake-head-${tone % 4}`)} x={-55} y={-55} width={110} height={110} />
      </g>
    </g>
  )
}

/** Ikon item: sprite Blender. */
export function ItemIcon({ item, size = 22 }: { item: Item; size?: number }) {
  return <img src={sprite(`item-${item}`)} width={size} height={size} alt="" aria-hidden className="shrink-0 object-contain" draggable={false} />
}

/** Dadu: sprite Blender; `tone` rose untuk dadu kedua (Dadu Ganda). */
export function Die({ value, size = 48, tone = '#fff4fa' }: { value: number; size?: number; tone?: string }) {
  const v = Math.min(6, Math.max(1, value))
  return (
    <img
      src={sprite(`die-${tone === '#ff37a6' ? 'rose' : 'paper'}-${v}`)}
      width={size}
      height={size}
      alt={`dadu ${v}`}
      className="object-contain"
      draggable={false}
    />
  )
}
