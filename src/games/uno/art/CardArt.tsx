import { memo, useId } from 'react'
import { terrazzo } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import type { Color, Face } from '../types'

export const SUIT_HEX: Record<Color, string> = {
  red: '#ff3b5c',
  yellow: '#ffcc1f',
  green: '#43b929',
  blue: '#2f7bff',
  pink: '#ff37a6',
  teal: '#13bfae',
  orange: '#ff8a1c',
  purple: '#8a55ff',
}

export const COLOR_NAME: Record<Color, string> = {
  red: 'Merah',
  yellow: 'Kuning',
  green: 'Hijau',
  blue: 'Biru',
  pink: 'Pink',
  teal: 'Toska',
  orange: 'Oranye',
  purple: 'Ungu',
}

const INK = '#121212'
const PAPER = '#fff4fa'
const DARK_SIDE = new Set<Color>(['pink', 'teal', 'orange', 'purple'])
const LIGHT_WHEEL: Color[] = ['red', 'yellow', 'green', 'blue']
const DARK_WHEEL: Color[] = ['pink', 'teal', 'orange', 'purple']

export function faceLabel(f: Face): string {
  const c = f.color ? COLOR_NAME[f.color] + ' ' : ''
  switch (f.kind) {
    case 'num':
      return `${c}${f.value}`
    case 'skip':
      return `${c}Skip`
    case 'skipAll':
      return `${c}Skip Semua`
    case 'reverse':
      return `${c}Reverse`
    case 'draw':
      return `${c}+${f.value}`
    case 'flip':
      return `${c}Flip`
    case 'discardAll':
      return `${c}Buang Semua`
    case 'wild':
      return 'Wild'
    case 'wildDraw':
      return f.rev ? 'Wild Reverse +4' : `Wild +${f.value}`
    case 'wildDrawColor':
      return 'Wild Ambil Warna'
    case 'roulette':
      return 'Wild Roulette'
  }
}

function cornerText(f: Face): string {
  switch (f.kind) {
    case 'num':
      return String(f.value)
    case 'draw':
    case 'wildDraw':
      return `+${f.value}`
    case 'wildDrawColor':
      return '+?'
    default:
      return ''
  }
}

/** Motif latar per warna supaya warna juga terbaca lewat pola. */
function Motif({ id, color }: { id: string; color: Color }) {
  const idx = (LIGHT_WHEEL.includes(color) ? LIGHT_WHEEL : DARK_WHEEL).indexOf(color)
  const stroke = 'rgba(18,18,18,0.22)'
  const fill = 'rgba(255,255,255,0.28)'
  return (
    <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
      {idx === 0 && <circle cx="8" cy="8" r="2.6" fill={fill} />}
      {idx === 1 && <polygon points="8,3 13,12 3,12" fill={fill} />}
      {idx === 2 && <path d="M1 9 q3.5 -5 7 0 t7 0" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />}
      {idx === 3 && <path d="M0 16 L16 0" stroke={fill} strokeWidth="3.5" />}
    </pattern>
  )
}

function Wheel({ dark, cx, cy, r }: { dark: boolean; cx: number; cy: number; r: number }) {
  const cols = dark ? DARK_WHEEL : LIGHT_WHEEL
  const q = (i: number) => {
    const a0 = (i * Math.PI) / 2 - Math.PI / 2
    const a1 = a0 + Math.PI / 2
    return `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`
  }
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      {cols.map((c, i) => (
        <path key={c} d={q(i)} fill={SUIT_HEX[c]} />
      ))}
    </g>
  )
}

function Symbol({ f, ink }: { f: Face; ink: string }) {
  const T = (s: string, size = 50, y = 84) => (
    <text
      x="50"
      y={y}
      textAnchor="middle"
      fontFamily="'Dela Gothic One', sans-serif"
      fontSize={size}
      fill={ink}
      stroke={PAPER}
      strokeWidth="0"
    >
      {s}
    </text>
  )
  const sw = { stroke: ink, strokeWidth: 7, fill: 'none', strokeLinecap: 'round' as const }
  switch (f.kind) {
    case 'num':
      return (
        <>
          {T(String(f.value), 52)}
          {(f.value === 6 || f.value === 9) && <rect x="38" y="90" width="24" height="4" rx="2" fill={ink} />}
        </>
      )
    case 'skip':
      return (
        <g {...sw}>
          <circle cx="50" cy="68" r="17" />
          <path d="M38 80 L62 56" />
        </g>
      )
    case 'skipAll':
      return (
        <g {...sw}>
          <circle cx="50" cy="68" r="19" strokeWidth="5" />
          <circle cx="50" cy="68" r="10" strokeWidth="5" />
          <path d="M34 84 L66 52" strokeWidth="6" />
        </g>
      )
    case 'reverse':
      return (
        <g fill={ink} stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <path d="M36 62 h24 v-7 l12 11 l-12 11 v-7 h-24 z" />
          <path d="M64 74 h-24 v-7 l-12 11 l12 11 v-7 h24 z" transform="translate(0 0)" />
        </g>
      )
    case 'draw':
      return (
        <>
          <rect x="34" y="46" width="22" height="30" rx="4" fill={PAPER} stroke={ink} strokeWidth="3" transform="rotate(-12 45 61)" />
          <rect x="44" y="50" width="22" height="30" rx="4" fill={PAPER} stroke={ink} strokeWidth="3" transform="rotate(8 55 65)" />
          {T(`+${f.value}`, 26, 98)}
        </>
      )
    case 'flip':
      return (
        <g stroke={ink} strokeWidth="3.5" strokeLinejoin="round">
          <rect x="30" y="50" width="22" height="32" rx="4" fill={PAPER} transform="rotate(-10 41 66)" />
          <rect x="48" y="50" width="22" height="32" rx="4" fill={ink} transform="rotate(10 59 66)" />
          <path d="M34 44 q16 -14 32 0" fill="none" strokeLinecap="round" />
          <path d="M62 38 l5 7 l-8 1" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'discardAll':
      return (
        <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <rect x="30" y="48" width="20" height="28" rx="3" fill={PAPER} transform="rotate(-14 40 62)" />
          <rect x="40" y="46" width="20" height="28" rx="3" fill={PAPER} />
          <rect x="50" y="48" width="20" height="28" rx="3" fill={PAPER} transform="rotate(14 60 62)" />
          <path d="M50 80 v12 m-7 -6 l7 7 l7 -7" fill="none" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

type Props = {
  face: Face
  /** lebar dalam px; tinggi mengikuti rasio kartu */
  width?: number
  className?: string
  glow?: boolean
}

/** Wajah kartu UNO bergaya Memphis, digambar penuh dengan SVG. */
export const CardFace = memo(function CardFace({ face: f, width = 72, className, glow }: Props) {
  const uid = useId().replace(/:/g, '')
  const wild = f.color === null
  const dark = f.color ? DARK_SIDE.has(f.color) : f.kind === 'wildDrawColor' || false
  const body = wild ? INK : SUIT_HEX[f.color!]
  const ink = INK
  const corner = cornerText(f)
  const cornerFill = wild ? PAPER : INK

  return (
    <svg
      viewBox="0 0 100 146"
      width={width}
      height={width * 1.46}
      role="img"
      aria-label={faceLabel(f)}
      className={cn('block shrink-0 overflow-visible', glow && 'drop-shadow-[0_0_0_var(--electric)]', className)}
    >
      <defs>
        {!wild && <Motif id={`m${uid}`} color={f.color!} />}
      </defs>
      <rect x="2" y="2" width="96" height="142" rx="11" fill={body} stroke={ink} strokeWidth="4" />
      {!wild && <rect x="2" y="2" width="96" height="142" rx="11" fill={`url(#m${uid})`} />}
      {/* sisi gelap Flip: bingkai tinta dalam */}
      {dark && !wild && <rect x="8" y="8" width="84" height="130" rx="7" fill="none" stroke={ink} strokeWidth="3" />}

      {wild ? (
        <>
          <Wheel dark={dark} cx={50} cy={64} r={28} />
          {f.kind === 'roulette' && <polygon points="50,28 44,16 56,16" fill={PAPER} stroke={ink} strokeWidth="2" />}
          {f.rev && (
            <g fill={PAPER} stroke={ink} strokeWidth="2">
              <path d="M30 104 h18 v-5 l9 8 l-9 8 v-5 h-18 z" />
            </g>
          )}
          {(f.kind === 'wildDraw' || f.kind === 'wildDrawColor') && (
            <text x="50" y="124" textAnchor="middle" fontFamily="'Dela Gothic One', sans-serif" fontSize="22" fill={PAPER}>
              {corner}
            </text>
          )}
        </>
      ) : (
        <>
          {/* oval kertas miring di tengah */}
          <ellipse cx="50" cy="72" rx="34" ry="46" transform="rotate(18 50 72)" fill={PAPER} stroke={ink} strokeWidth="3.5" />
          <Symbol f={f} ink={ink} />
        </>
      )}

      {corner && (
        <>
          <text x="10" y="24" fontFamily="'Dela Gothic One', sans-serif" fontSize="16" fill={cornerFill}>
            {corner}
          </text>
          <text
            transform="translate(90 126) rotate(180)"
            fontFamily="'Dela Gothic One', sans-serif"
            fontSize="16"
            fill={cornerFill}
          >
            {corner}
          </text>
        </>
      )}
      {/* kartu aksi tanpa angka: simbol mini di sudut supaya tetap terbaca saat kartu bertumpuk di kipas */}
      {!corner && !wild && (
        <>
          <g transform="translate(5 3) scale(0.3)">
            <Symbol f={f} ink={INK} />
          </g>
          <g transform="translate(95 143) rotate(180) translate(0 0) scale(0.3)">
            <Symbol f={f} ink={INK} />
          </g>
        </>
      )}
    </svg>
  )
})

/** Punggung kartu (deck & tangan lawan di Classic/No Mercy). */
export const CardBack = memo(function CardBack({ width = 48, className }: { width?: number; className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 100 146" width={width} height={width * 1.46} className={cn('block shrink-0', className)} aria-hidden>
      <defs>
        <pattern id={`b${uid}`} width="80" height="80" patternUnits="userSpaceOnUse">
          <image href={terrazzo(7, ['#ff37a6', '#5cf64a', '#ffcae9', '#87e752'], 80, 34).slice(5, -2)} width="80" height="80" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="96" height="142" rx="11" fill={INK} stroke={INK} strokeWidth="4" />
      <rect x="2" y="2" width="96" height="142" rx="11" fill={`url(#b${uid})`} />
      <g transform="rotate(-14 50 73)">
        <rect x="14" y="56" width="72" height="34" fill="#ff37a6" stroke={INK} strokeWidth="3.5" />
        <text x="50" y="82" textAnchor="middle" fontFamily="'Dela Gothic One', sans-serif" fontSize="24" fill={INK}>
          UNO
        </text>
      </g>
    </svg>
  )
})
