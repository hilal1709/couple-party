import { apothem, armAngle, cellPt, circumR, innerR, isSafe, specialAt, startOf, trackPt, yardCenter, yardPt } from '../board'
import { ARM, LANE, type Arms, type LudoState } from '../types'

/** Sprite hasil render Blender (scripts/blender/ludo.py → export.py). */
const SPRITES = import.meta.glob('/src/assets/ludo/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/ludo/${name}.webp`]

/** Warna bidak per kursi: kontras satu sama lain sampai 8 pemain (sama dengan scripts/blender/ludo.py). */
export const PAWN_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']
/** Warna pucat tiap kursi untuk kandang & jalur rumah. */
const TINT = ['#ffcae9', '#d9fdd2', '#d3e3ff', '#fff0bf', '#e4d8ff', '#ffe0c2', '#c9f3ee', '#ffd0d9']

/** Setengah lebar viewBox papan (satuan petak). */
export const extent = (arms: Arms) => circumR(arms) + 0.35

const deg = (r: number) => (r * 180) / Math.PI

function polygon(arms: Arms, r: number) {
  return Array.from({ length: arms }, (_, k) => {
    const a = armAngle(arms, k) + Math.PI / arms
    return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`
  }).join(' ')
}

const INK = '#121212'
const LINE = 0.06

/** Papan statis: poligon, kandang, petak keliling, jalur rumah, tengah. */
export function BoardArt({ s }: { s: LudoState }) {
  const arms = s.opts.arms
  const owner = new Map<number, number>(s.arm.map((a, seat) => [a, seat]))
  const color = (k: number) => (owner.has(k) ? PAWN_HEX[owner.get(k)! % 8] : null)
  const R = circumR(arms)
  const cells = []
  for (let t = 0; t < ARM * arms; t++) {
    const k = Math.floor(t / ARM)
    const c = trackPt(arms, t)
    const startSeat = t === startOf(k) ? owner.get(k) : undefined
    const sp = s.opts.specials ? specialAt(t) : null
    cells.push(
      <g key={`t${t}`} transform={`translate(${c.x} ${c.y}) rotate(${deg(armAngle(arms, k))})`}>
        <rect x={-0.48} y={-0.48} width={0.96} height={0.96} rx={0.08} fill={startSeat !== undefined ? PAWN_HEX[startSeat % 8] : sp ? '#fff4fa' : '#ffffff'} stroke={INK} strokeWidth={LINE} />
        {isSafe(t) && startSeat === undefined && <image href={sprite('icon-star')} x={-0.36} y={-0.36} width={0.72} height={0.72} transform={`rotate(${-deg(armAngle(arms, k))})`} />}
        {startSeat !== undefined && (
          <path d="M-0.22 -0.2 L0.24 0 L-0.22 0.2 Z" fill="#fff4fa" stroke={INK} strokeWidth={0.05} transform={`rotate(${180})`} />
        )}
        {sp && <image href={sprite(`icon-${sp}`)} x={-0.42} y={-0.42} width={0.84} height={0.84} transform={`rotate(${-deg(armAngle(arms, k))})`} />}
      </g>,
    )
  }
  const lanes = []
  for (let k = 0; k < arms; k++) {
    for (let u = 0; u < LANE; u++) {
      const c = cellPt(arms, k, u, 0)
      lanes.push(
        <rect
          key={`l${k}-${u}`}
          x={-0.48}
          y={-0.48}
          width={0.96}
          height={0.96}
          rx={0.08}
          fill={color(k) ?? '#f3e6ee'}
          stroke={INK}
          strokeWidth={LINE}
          transform={`translate(${c.x} ${c.y}) rotate(${deg(armAngle(arms, k))})`}
        />,
      )
    }
  }
  const r0 = innerR(arms)
  const tris = Array.from({ length: arms }, (_, k) => {
    const th = armAngle(arms, k)
    const d = { x: Math.cos(th), y: Math.sin(th) }
    const n = { x: -Math.sin(th), y: Math.cos(th) }
    const a = { x: d.x * r0 - n.x * 1.5, y: d.y * r0 - n.y * 1.5 }
    const b = { x: d.x * r0 + n.x * 1.5, y: d.y * r0 + n.y * 1.5 }
    return <polygon key={`c${k}`} points={`0,0 ${a.x},${a.y} ${b.x},${b.y}`} fill={color(k) ?? '#f3e6ee'} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
  })
  const yards = s.arm.map((k, seat) => {
    const c = yardCenter(arms, k)
    const size = arms === 4 ? 4.2 : 3.1
    return (
      <g key={`y${seat}`}>
        <rect x={c.x - size / 2} y={c.y - size / 2} width={size} height={size} rx={0.5} fill={PAWN_HEX[seat % 8]} stroke={INK} strokeWidth={0.1} />
        <rect x={c.x - size / 2 + 0.3} y={c.y - size / 2 + 0.3} width={size - 0.6} height={size - 0.6} rx={0.35} fill={TINT[seat % 8]} stroke={INK} strokeWidth={LINE} />
        {Array.from({ length: s.opts.pieces }, (_, i) => {
          const p = yardPt(arms, k, i)
          return <circle key={i} cx={p.x} cy={p.y} r={0.4} fill="#fff4fa" stroke={INK} strokeWidth={LINE} strokeDasharray="0.12 0.08" />
        })}
      </g>
    )
  })
  return (
    <g>
      <polygon points={polygon(arms, R + 0.3)} fill={INK} />
      <polygon points={polygon(arms, R)} fill="#e6ffd9" />
      <polygon points={polygon(arms, apothem(arms) * 0.2 + R * 0.8)} fill="none" stroke={INK} strokeWidth={0.05} strokeDasharray="0.3 0.25" opacity={0.25} />
      {yards}
      {tris}
      {lanes}
      {cells}
      <image href={sprite('icon-crown')} x={-r0 * 0.55} y={-r0 * 0.55} width={r0 * 1.1} height={r0 * 1.1} />
    </g>
  )
}

export function Die({ value, size = 48 }: { value: number; size?: number }) {
  const v = Math.min(6, Math.max(1, value))
  return <img src={sprite(`die-${v}`)} width={size} height={size} alt={`dadu ${v}`} className="object-contain" draggable={false} />
}

/** Titik warna bidak, dipakai di daftar pemain. */
export function SeatDot({ seat, size = 16 }: { seat: number; size?: number }) {
  return <span className="shrink-0 rounded-full border-[3px] border-ink" style={{ width: size, height: size, background: PAWN_HEX[seat % 8] }} />
}
