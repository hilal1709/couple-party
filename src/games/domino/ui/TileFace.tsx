import { memo } from 'react'
import { cn } from '@/lib/utils'

const INK = '#121212'
const PAPER = '#fff4fa'
/** angka 1 & 4 merah, seperti kartu gaple warung */
const RED = '#ff3b5c'

/** posisi titik mata dalam kotak 0..50 */
const DOTS: Record<number, [number, number][]> = {
  0: [],
  1: [[25, 25]],
  2: [[13, 13], [37, 37]],
  3: [[13, 13], [25, 25], [37, 37]],
  4: [[13, 13], [37, 13], [13, 37], [37, 37]],
  5: [[13, 13], [37, 13], [25, 25], [13, 37], [37, 37]],
  6: [[13, 12], [37, 12], [13, 25], [37, 25], [13, 38], [37, 38]],
}

function Half({ n, y }: { n: number; y: number }) {
  return (
    <g transform={`translate(0 ${y})`} fill={n === 1 || n === 4 ? RED : INK}>
      {DOTS[n].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={n === 1 ? 7 : 5} />
      ))}
    </g>
  )
}

type Props = {
  /** angka atas/kiri */
  a: number
  /** angka bawah/kanan */
  b: number
  /** lebar sisi pendek (px); sisi panjang = 2× */
  size: number
  horizontal?: boolean
  back?: boolean
  className?: string
  label?: string
}

/** Kartu domino SVG (bukan gambar unduhan): badan kertas, garis tengah, titik mata. */
export const TileFace = memo(function TileFace({ a, b, size, horizontal, back, className, label }: Props) {
  const w = horizontal ? size * 2 : size
  const h = horizontal ? size : size * 2
  return (
    <svg
      width={w}
      height={h}
      viewBox={horizontal ? '0 0 100 50' : '0 0 50 100'}
      className={cn('block shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g transform={horizontal ? 'rotate(-90 25 25)' : undefined}>
        {/* horizontal: diputar supaya `a` di kiri */}
        <rect x="2" y="2" width="46" height="96" rx="8" fill={back ? '#ff37a6' : PAPER} stroke={INK} strokeWidth="4" />
        {back ? (
          <>
            <path d="M8 30 L42 14 M8 54 L42 38 M8 78 L42 62" stroke="#ffcae9" strokeWidth="5" strokeLinecap="round" />
            <circle cx="25" cy="50" r="9" fill={INK} />
          </>
        ) : (
          <>
            <Half n={a} y={0} />
            <line x1="9" y1="50" x2="41" y2="50" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
            <Half n={b} y={50} />
          </>
        )}
      </g>
    </svg>
  )
})
