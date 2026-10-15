import { BOARD, CODE, GROUP_HEX } from '../board'
import { HOTEL, type MonopolyState } from '../types'
import { money } from './copy'

/** Sprite hasil render Blender (scripts/blender/monopoly.py → export.py). */
const SPRITES = import.meta.glob('/src/assets/monopoly/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/monopoly/${name}.webp`]

/** Warna bidak per kursi: kontras satu sama lain sampai 8 pemain. */
export const PAWN_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']

/** Papan 1000 x 1000: pojok C x C, petak biasa W x C. */
export const C = 130
export const W = (1000 - 2 * C) / 9

/** Kotak petak di papan. */
export function cellBox(sq: number): { x: number; y: number; w: number; h: number } {
  if (sq % 10 === 0) {
    const corners = [
      [1000 - C, 1000 - C],
      [0, 1000 - C],
      [0, 0],
      [1000 - C, 0],
    ]
    const [x, y] = corners[sq / 10]
    return { x, y, w: C, h: C }
  }
  const side = Math.floor(sq / 10)
  const k = sq % 10
  if (side === 0) return { x: 1000 - C - k * W, y: 1000 - C, w: W, h: C }
  if (side === 1) return { x: 0, y: 1000 - C - k * W, w: C, h: W }
  if (side === 2) return { x: C + (k - 1) * W, y: 0, w: W, h: C }
  return { x: 1000 - C, y: C + (k - 1) * W, w: C, h: W }
}

export function cellCenter(sq: number): { x: number; y: number } {
  const b = cellBox(sq)
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

type Rect = { x: number; y: number; w: number; h: number }
const BAND = 28
const STRIP = 12

/**
 * Bagian petak: pita warna di sisi dalam, strip pemilik di sisi luar, sisanya isi.
 * Semua teks tetap tegak supaya terbaca dari satu arah layar HP.
 */
function parts(sq: number): { band: Rect; strip: Rect; body: Rect; vertical: boolean } {
  const b = cellBox(sq)
  const side = Math.floor(sq / 10)
  if (side === 0 || side === 2) {
    const top = side === 0
    return {
      band: { x: b.x, y: top ? b.y : b.y + b.h - BAND, w: b.w, h: BAND },
      strip: { x: b.x, y: top ? b.y + b.h - STRIP : b.y, w: b.w, h: STRIP },
      body: { x: b.x, y: top ? b.y + BAND : b.y + STRIP, w: b.w, h: b.h - BAND - STRIP },
      vertical: false,
    }
  }
  const right = side === 1
  return {
    band: { x: right ? b.x + b.w - BAND : b.x, y: b.y, w: BAND, h: b.h },
    strip: { x: right ? b.x : b.x + b.w - STRIP, y: b.y, w: STRIP, h: b.h },
    body: { x: right ? b.x + STRIP : b.x + BAND, y: b.y, w: b.w - BAND - STRIP, h: b.h },
    vertical: true,
  }
}

const CORNER = [
  { art: 'corner-go', label: 'START', fill: '#5cf64a' },
  { art: 'corner-jail', label: 'PENJARA', fill: '#fff4fa' },
  { art: 'corner-parking', label: 'PARKIR', fill: '#ffcae9' },
  { art: 'corner-gotojail', label: 'MASUK BUI', fill: '#fff4fa' },
]

function Corner({ sq }: { sq: number }) {
  const b = cellBox(sq)
  const c = CORNER[sq / 10]
  return (
    <g>
      <rect x={b.x} y={b.y} width={C} height={C} fill={c.fill} />
      <image href={sprite(c.art)} x={b.x + 12} y={b.y + 6} width={C - 24} height={C - 40} />
      <text x={b.x + C / 2} y={b.y + C - 12} textAnchor="middle" fontSize={sq === 30 ? 17 : 20} fontFamily="Dela Gothic One, sans-serif" fill="#121212">
        {c.label}
      </text>
    </g>
  )
}

function Buildings({ band, n, vertical }: { band: Rect; n: number; vertical: boolean }) {
  if (n === HOTEL) return <image href={sprite('hotel')} x={band.x + band.w / 2 - 20} y={band.y + band.h / 2 - 20} width={40} height={40} />
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const step = ((vertical ? band.h : band.w) - 8) / 4
        const x = vertical ? band.x + 2 : band.x + 4 + i * step
        const y = vertical ? band.y + 4 + i * step : band.y + 1
        return <image key={i} href={sprite('house')} x={x} y={y} width={24} height={24} />
      })}
    </>
  )
}

const label = { fontFamily: 'Dela Gothic One, sans-serif', fill: '#121212', textAnchor: 'middle' as const }

/** Semua petak papan dengan pemilik, rumah/hotel, dan status gadai. */
export function Squares({ s, highlight, onPick }: { s: MonopolyState; highlight: number | null; onPick: (sq: number) => void }) {
  return (
    <g>
      {BOARD.map((b, sq) => {
        const box = cellBox(sq)
        if (sq % 10 === 0)
          return (
            <g key={sq} onClick={() => onPick(sq)} className="cursor-pointer">
              <Corner sq={sq} />
              <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="#121212" strokeWidth={highlight === sq ? 9 : 3} />
            </g>
          )
        const { band, strip, body, vertical } = parts(sq)
        const o = s.owner[sq]
        const cx = body.x + body.w / 2
        const icon =
          b.kind === 'airport' ? 'icon-airport' : b.kind === 'tax' ? 'icon-tax' : b.kind === 'utility' ? (sq === 12 ? 'icon-power' : 'icon-water') : b.kind === 'card' ? `card-${b.deck}` : null
        const bottom = 'price' in b ? money(b.price) : b.kind === 'tax' ? money(b.amount) : null
        return (
          <g key={sq} onClick={() => onPick(sq)} className="cursor-pointer">
            <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={b.kind === 'card' ? (b.deck === 'chance' ? '#ffcae9' : '#e6ffd9') : '#fff4fa'} />
            {b.kind === 'street' && <rect x={band.x} y={band.y} width={band.w} height={band.h} fill={GROUP_HEX[b.group]} stroke="#121212" strokeWidth={3} />}
            {b.kind === 'street' && s.houses[sq] > 0 && <Buildings band={band} n={s.houses[sq]} vertical={vertical} />}
            {b.kind === 'street' && (
              <text x={cx} y={body.y + body.h / 2 + 2} fontSize={23} {...label}>
                {CODE[sq]}
              </text>
            )}
            {icon && (
              <image
                href={sprite(icon)}
                x={body.x + 6}
                y={body.y + 4}
                width={body.w - 12}
                height={body.h - (bottom ? 30 : 8)}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            {bottom && (
              <text x={cx} y={body.y + body.h - 9} fontSize={17} fontWeight={700} fill="#121212" textAnchor="middle" opacity={0.8}>
                {bottom}
              </text>
            )}
            {s.mortgaged[sq] && (
              <g>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#mono-hatch)" />
                <text x={cx} y={body.y + body.h / 2 + 6} fontSize={15} {...label} fill="#ff3b5c" transform={`rotate(-28 ${cx} ${body.y + body.h / 2})`}>
                  GADAI
                </text>
              </g>
            )}
            {o !== null && <rect x={strip.x} y={strip.y} width={strip.w} height={strip.h} fill={PAWN_HEX[o % 8]} stroke="#121212" strokeWidth={3} />}
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              fill="none"
              stroke="#121212"
              strokeWidth={highlight === sq ? 9 : 3}
              strokeDasharray={highlight === sq ? '14 8' : undefined}
            />
          </g>
        )
      })}
    </g>
  )
}

export function Die({ value, size = 44, alt }: { value: number; size?: number; alt?: boolean }) {
  const v = Math.min(6, Math.max(1, value))
  return <img src={sprite(`die-${alt ? 'b' : 'a'}-${v}`)} width={size} height={size} alt={`dadu ${v}`} className="object-contain" draggable={false} />
}

/** Titik warna bidak + inisial, dipakai di daftar pemain. */
export function SeatDot({ seat, size = 16 }: { seat: number; size?: number }) {
  return <span className="shrink-0 rounded-full border-[3px] border-ink" style={{ width: size, height: size, background: PAWN_HEX[seat % 8] }} />
}
