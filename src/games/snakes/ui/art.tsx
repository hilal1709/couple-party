import { cellOf } from '../board'
import type { Item, Tile } from '../types'
import { FX_INFO } from './copy'

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
  return (
    <g transform={`translate(${x - 20} ${y - 18})`} stroke="#121212" strokeWidth={4} strokeLinejoin="round">
      <rect x={0} y={12} width={40} height={28} fill="#ff37a6" />
      <rect x={-3} y={4} width={46} height={10} fill="#ffcae9" />
      <path d="M20 4 V40" />
      <path d="M20 4 C10 -8 2 0 12 4 M20 4 C30 -8 38 0 28 4" fill="none" />
    </g>
  )
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
        <path d="M22 0 L40 -6 M22 0 L40 6" stroke="#ff3b5c" strokeWidth={4} />
        <ellipse cx={4} cy={0} rx={24} ry={19} fill={body} stroke="#121212" strokeWidth={5} />
        <circle cx={10} cy={-8} r={5} fill="#fff4fa" stroke="#121212" strokeWidth={2.5} />
        <circle cx={10} cy={8} r={5} fill="#fff4fa" stroke="#121212" strokeWidth={2.5} />
        <circle cx={12} cy={-8} r={2} fill="#121212" />
        <circle cx={12} cy={8} r={2} fill="#121212" />
      </g>
    </g>
  )
}

/** Ikon item, digambar manual. */
export function ItemIcon({ item, size = 22 }: { item: Item; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden fill="none" stroke="#121212" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round">
      {item === 'shield' && <path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill="#5cf64a" />}
      {item === 'shield' && <path d="M11 16 L15 20 L22 12" />}
      {item === 'double' && (
        <>
          <rect x={3} y={9} width={14} height={14} rx={3} fill="#fff4fa" transform="rotate(-10 10 16)" />
          <rect x={15} y={9} width={14} height={14} rx={3} fill="#ff37a6" transform="rotate(8 22 16)" />
          <circle cx={10} cy={16} r={1.6} fill="#121212" />
          <circle cx={19} cy={13} r={1.6} fill="#121212" />
          <circle cx={25} cy={19} r={1.6} fill="#121212" />
        </>
      )}
      {item === 'trap' && (
        <polygon
          fill="#121212"
          stroke="#121212"
          points={Array.from({ length: 12 }, (_, i) => {
            const r = i % 2 ? 6 : 13
            const a = (i / 12) * Math.PI * 2
            return `${16 + Math.cos(a) * r},${16 + Math.sin(a) * r}`
          }).join(' ')}
        />
      )}
      {item === 'pass' && (
        <>
          <path d="M4 9 H28 V13 A3 3 0 0 0 28 19 V23 H4 V19 A3 3 0 0 0 4 13 Z" fill="#ffcc1f" />
          <path d="M11 16 L14.5 19.5 L21 13" />
        </>
      )}
    </svg>
  )
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
}

export function Die({ value, size = 48, tone = '#fff4fa' }: { value: number; size?: number; tone?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`dadu ${value}`} role="img">
      <rect x={5} y={5} width={90} height={90} rx={18} fill={tone} stroke="#121212" strokeWidth={7} />
      {(PIPS[value] ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={9} fill="#121212" />
      ))}
    </svg>
  )
}
