import type { Tool } from '../kitchens'

/** bentuk ikon alat (viewBox 24×24): dipakai SVG di tiket dan Path2D di gelembung 3D */
export const TOOL_PATHS: Record<Tool, { d: string; fill: string }[]> = {
  pisau: [
    { d: 'M9 13 L19 3 Q22.5 3.5 20.5 8 L12 16 Z', fill: '#d5dbe3' },
    { d: 'M3 19 L9 13 L12 16 L6 22 Q2.6 22.4 3 19 Z', fill: '#9a6431' },
  ],
  wajan: [
    { d: 'M2 10 H16 Q16 18 9 18 Q2 18 2 10 Z', fill: '#3a3d44' },
    { d: 'M15.5 11.5 H23 V14 H15.5 Z', fill: '#c2622d' },
  ],
  panci: [
    { d: 'M4 9.5 H18 V17 Q18 20.5 14.5 20.5 H7.5 Q4 20.5 4 17 Z', fill: '#c9ced6' },
    { d: 'M2.5 7 H19.5 V9.5 H2.5 Z', fill: '#8c94a0' },
    { d: 'M9.5 4 H12.5 V7 H9.5 Z', fill: '#121212' },
    { d: 'M0.8 11 H4 V13.5 H0.8 Z M18 11 H21.2 V13.5 H18 Z', fill: '#121212' },
  ],
  oven: [
    { d: 'M3 3.5 H21 V20.5 H3 Z', fill: '#efe7d8' },
    { d: 'M6 9.5 H18 V17.5 H6 Z', fill: '#ff8a3d' },
    { d: 'M6 5.5 H8.5 V8 H6 Z M10.5 5.5 H13 V8 H10.5 Z', fill: '#121212' },
  ],
}

export const INK = '#121212'

/** gambar ikon alat ke kanvas di (x, y) selebar `s` piksel */
export function drawTool(g: CanvasRenderingContext2D, tool: Tool, x: number, y: number, s: number) {
  g.save()
  g.translate(x, y)
  g.scale(s / 24, s / 24)
  g.lineWidth = 1.6
  g.lineJoin = 'round'
  g.strokeStyle = INK
  for (const p of TOOL_PATHS[tool]) {
    const path = new Path2D(p.d)
    g.fillStyle = p.fill
    g.fill(path)
    g.stroke(path)
  }
  g.restore()
}
