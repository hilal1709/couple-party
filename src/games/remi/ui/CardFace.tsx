import { memo, useId } from 'react'
import { terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import { cardLabel, rankLabel } from '../cards'
import type { Card, Suit } from '../types'

const INK = '#121212'
const PAPER = '#fff4fa'
export const SUIT_HEX: Record<Suit | 'X', string> = { S: INK, C: INK, H: '#ff3b5c', D: '#ff3b5c', X: '#ff37a6' }
/** warna blok kartu gambar (J, Q, K) */
const COURT_HEX: Record<number, string> = { 11: '#5cf64a', 12: '#ff37a6', 13: '#ffcc1f' }

/** Simbol jenis dalam kotak 0..100. */
export function SuitPath({ suit, color }: { suit: Suit; color?: string }) {
  const fill = color ?? SUIT_HEX[suit]
  switch (suit) {
    case 'H':
      return <path d="M50 90 C20 68 6 52 6 33 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 33 C94 52 80 68 50 90 Z" fill={fill} />
    case 'D':
      return <path d="M50 4 L86 50 L50 96 L14 50 Z" fill={fill} />
    case 'S':
      return (
        <path
          d="M50 6 C80 30 94 44 94 60 C94 74 83 82 72 82 C64 82 57 78 54 72 C55 82 58 90 64 96 L36 96 C42 90 45 82 46 72 C43 78 36 82 28 82 C17 82 6 74 6 60 C6 44 20 30 50 6 Z"
          fill={fill}
        />
      )
    case 'C':
      return (
        <g fill={fill}>
          <circle cx="50" cy="28" r="20" />
          <circle cx="27" cy="57" r="20" />
          <circle cx="73" cy="57" r="20" />
          <path d="M45 50 C45 76 41 88 32 96 L68 96 C59 88 55 76 55 50 Z" />
        </g>
      )
  }
}

/** Simbol jenis kecil di posisi (x, y) dengan ukuran `size`. */
function Pip({ suit, x, y, size, color }: { suit: Suit; x: number; y: number; size: number; color?: string }) {
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})`}>
      <SuitPath suit={suit} color={color} />
    </g>
  )
}

const FONT = "'Dela Gothic One', sans-serif"

type Props = {
  card: Card
  /** lebar dalam px; tinggi = 1.4 x lebar */
  width?: number
  className?: string
}

/** Kartu remi bergaya Memphis, digambar penuh dengan SVG. */
export const CardFace = memo(function CardFace({ card: c, width = 60, className }: Props) {
  const uid = useId().replace(/:/g, '')
  if (c.s === 'X') return <JokerFace width={width} className={className} />
  const suit = c.s
  const ink = SUIT_HEX[suit]
  const label = rankLabel(c.r)
  const court = c.r >= 11
  const small = label.length > 1 ? 19 : 23
  return (
    <svg viewBox="0 0 100 140" width={width} height={width * 1.4} role="img" aria-label={cardLabel(c)} className={cn('block shrink-0', className)}>
      <defs>
        <pattern id={`d${uid}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="1.6" fill="rgba(18,18,18,0.12)" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="96" height="136" rx="10" fill={PAPER} stroke={INK} strokeWidth="4" />
      <rect x="2" y="2" width="96" height="136" rx="10" fill={`url(#d${uid})`} />

      {court ? (
        <g>
          <rect x="22" y="34" width="56" height="72" fill={COURT_HEX[c.r]} stroke={INK} strokeWidth="3.5" transform="rotate(-6 50 70)" />
          <text x="50" y="86" textAnchor="middle" fontFamily={FONT} fontSize="44" fill={INK}>
            {label}
          </text>
          <Pip suit={suit} x={66} y={46} size={20} />
        </g>
      ) : c.r === 1 ? (
        <g>
          <circle cx="50" cy="72" r="32" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="6 6" />
          <Pip suit={suit} x={50} y={72} size={50} />
        </g>
      ) : (
        <g>
          <ellipse cx="50" cy="72" rx="28" ry="34" transform="rotate(14 50 72)" fill={suit === 'H' || suit === 'D' ? '#ffcae9' : '#c8f7b8'} stroke={INK} strokeWidth="3" />
          <Pip suit={suit} x={50} y={72} size={40} />
        </g>
      )}

      <text x="9" y="27" fontFamily={FONT} fontSize={small} fill={ink}>
        {label}
      </text>
      <Pip suit={suit} x={label.length > 1 ? 19 : 15} y={39} size={13} />
      <g transform="rotate(180 50 70)">
        <text x="9" y="27" fontFamily={FONT} fontSize={small} fill={ink}>
          {label}
        </text>
        <Pip suit={suit} x={label.length > 1 ? 19 : 15} y={39} size={13} />
      </g>
    </svg>
  )
})

function JokerFace({ width, className }: { width: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={width} height={width * 1.4} role="img" aria-label="Joker" className={cn('block shrink-0', className)}>
      <rect x="2" y="2" width="96" height="136" rx="10" fill={INK} stroke={INK} strokeWidth="4" />
      <polygon points="50,30 58,56 86,56 63,72 72,98 50,82 28,98 37,72 14,56 42,56" fill="#ffcc1f" stroke={PAPER} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="50" cy="66" r="7" fill="#ff37a6" />
      <text x="50" y="124" textAnchor="middle" fontFamily={FONT} fontSize="17" fill="#5cf64a">
        JOKER
      </text>
      <text x="9" y="24" fontFamily={FONT} fontSize="16" fill="#ff37a6">
        ★
      </text>
    </svg>
  )
}

/** Punggung kartu remi (dek & tangan lawan). */
export const CardBack = memo(function CardBack({ width = 40, className, tone = 'rose' }: { width?: number; className?: string; tone?: 'rose' | 'ink' }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 100 140" width={width} height={width * 1.4} className={cn('block shrink-0', className)} aria-hidden>
      <defs>
        <pattern id={`b${uid}`} width="80" height="80" patternUnits="userSpaceOnUse">
          <image href={terrazzo(11, ['#ffcae9', '#5cf64a', '#fff4fa', '#87e752'], 80, 30).slice(5, -2)} width="80" height="80" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="96" height="136" rx="10" fill={tone === 'rose' ? '#ff37a6' : INK} stroke={INK} strokeWidth="4" />
      <rect x="2" y="2" width="96" height="136" rx="10" fill={`url(#b${uid})`} />
      <rect x="10" y="10" width="80" height="120" rx="6" fill="none" stroke={INK} strokeWidth="3" />
      <g transform="rotate(-16 50 70)">
        <rect x="12" y="56" width="76" height="28" fill={INK} />
        <text x="50" y="78" textAnchor="middle" fontFamily={FONT} fontSize="20" fill="#5cf64a">
          CP
        </text>
      </g>
    </svg>
  )
})
