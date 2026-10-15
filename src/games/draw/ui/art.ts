import { CANVAS, INKS, WIDTHS } from '../engine'
import type { Stroke } from '../types'

/** Sprite hasil render Blender (scripts/blender/draw.py → export.py draw). */
const SPRITES = import.meta.glob('/src/assets/draw/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const sprite = (name: string) => SPRITES[`/src/assets/draw/${name}.webp`]

export const PAPER = '#fff4fa'

/** Warna penanda tiap kursi (chip pemain). */
export const SEAT_HEX = ['#ff37a6', '#5cf64a', '#2f7bff', '#ffcc1f', '#8a55ff', '#ff8a1c', '#13bfae', '#ff3b5c']

export const INK_NAMES = ['Hitam', 'Pink', 'Hijau', 'Biru', 'Kuning', 'Oranye', 'Ungu', 'Cokelat']

export function strokeStyle(ctx: CanvasRenderingContext2D, s: Pick<Stroke, 'c' | 'w'>, scale: number) {
  ctx.strokeStyle = s.c < 0 ? PAPER : INKS[s.c]
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = WIDTHS[s.w] * (s.c < 0 ? 2 : 1) * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

/** Gambar satu potongan coretan (koordinat logis 1000 x 750) pada skala piksel kanvas. */
export function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, scale: number) {
  const p = s.pts
  if (p.length < 2) return
  strokeStyle(ctx, s, scale)
  if (p.length === 2) {
    ctx.beginPath()
    ctx.arc(p[0] * scale, p[1] * scale, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(p[0] * scale, p[1] * scale)
  // kurva halus lewat titik tengah antar titik
  for (let i = 2; i < p.length - 2; i += 2) {
    const mx = ((p[i] + p[i + 2]) / 2) * scale
    const my = ((p[i + 1] + p[i + 3]) / 2) * scale
    ctx.quadraticCurveTo(p[i] * scale, p[i + 1] * scale, mx, my)
  }
  ctx.lineTo(p[p.length - 2] * scale, p[p.length - 1] * scale)
  ctx.stroke()
}

export function paintAll(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale: number) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, CANVAS.w * scale, CANVAS.h * scale)
  for (const s of strokes) paintStroke(ctx, s, scale)
}
