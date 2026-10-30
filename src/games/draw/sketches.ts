import type { Level, Stroke } from './types'

/** Satu goresan sketsa: warna & ukuran indeks INKS/WIDTHS, titik x,y berselang-seling. */
type Line = { c: number; w?: number; pts: number[] }

const [INK, PINK, GREEN, BLUE, YELLOW, ORANGE, , BROWN] = [0, 1, 2, 3, 4, 5, 6, 7]

/** Elips sebagai garis tertutup; `from`/`to` (derajat) untuk busur. */
function oval(cx: number, cy: number, rx: number, ry: number, c = INK, from = 0, to = 360): Line {
  const pts: number[] = []
  const steps = Math.max(8, Math.round((Math.abs(to - from) / 360) * 28))
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180
    pts.push(Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)))
  }
  return { c, pts }
}

const line = (c: number, ...pts: number[]): Line => ({ c, pts })
const box = (x: number, y: number, w: number, h: number, c = INK): Line => line(c, x, y, x + w, y, x + w, y + h, x, y + h, x, y)

/** Isian warna: garis tebal bolak-balik di dalam area persegi. */
function scribble(x: number, y: number, w: number, h: number, c: number): Line {
  const pts: number[] = []
  const rows = Math.max(2, Math.round(h / 34))
  for (let i = 0; i <= rows; i++) {
    const yy = Math.round(y + (h * i) / rows)
    pts.push(...(i % 2 ? [x + w, yy, x, yy] : [x, yy, x + w, yy]))
  }
  return { c, w: 2, pts }
}

/** Kata + gambar. Semua kata sederhana dan ada di paket `umum` atau mudah ditebak. */
const RAW: Record<string, { level: Level; lines: Line[] }> = {
  kucing: {
    level: 1,
    lines: [oval(500, 330, 150, 130), line(INK, 375, 255, 385, 130, 470, 205), line(INK, 625, 255, 615, 130, 530, 205), oval(445, 310, 18, 22), oval(555, 310, 18, 22), line(PINK, 485, 365, 515, 365, 500, 385, 485, 365), line(INK, 500, 385, 500, 410, 465, 425), line(INK, 500, 410, 535, 425), line(INK, 350, 340, 250, 320), line(INK, 350, 370, 250, 385), line(INK, 650, 340, 750, 320), line(INK, 650, 370, 750, 385)],
  },
  ikan: {
    level: 1,
    lines: [oval(460, 375, 240, 130, BLUE), line(BLUE, 690, 375, 860, 250, 840, 375, 860, 500, 690, 375), oval(330, 340, 22, 22), line(BLUE, 530, 250, 480, 180, 410, 250), line(BLUE, 450, 400, 520, 460, 540, 380), line(INK, 235, 400, 280, 415)],
  },
  apel: {
    level: 1,
    lines: [oval(500, 410, 200, 210, PINK), scribble(360, 300, 280, 220, PINK), line(BROWN, 500, 205, 515, 110), oval(590, 150, 75, 38, GREEN)],
  },
  pisang: {
    level: 1,
    lines: [oval(500, 180, 330, 420, YELLOW, 25, 150), oval(500, 170, 290, 340, YELLOW, 30, 145), line(BROWN, 215, 390, 200, 340, 240, 330)],
  },
  rumah: {
    level: 1,
    lines: [box(280, 330, 440, 320), line(PINK, 230, 335, 500, 120, 770, 335, 230, 335), box(450, 470, 100, 180, BROWN), box(320, 400, 90, 90, BLUE), box(590, 400, 90, 90, BLUE), line(INK, 620, 230, 620, 140, 670, 140, 670, 270)],
  },
  mobil: {
    level: 1,
    lines: [line(PINK, 150, 500, 150, 400, 300, 390, 380, 270, 620, 270, 720, 390, 860, 410, 860, 500, 150, 500), box(400, 295, 90, 90, BLUE), box(510, 295, 100, 90, BLUE), oval(300, 510, 70, 70), oval(700, 510, 70, 70), oval(300, 510, 25, 25), oval(700, 510, 25, 25)],
  },
  matahari: {
    level: 1,
    lines: [oval(500, 375, 130, 130, YELLOW), scribble(420, 300, 160, 150, YELLOW), line(ORANGE, 500, 200, 500, 110), line(ORANGE, 500, 550, 500, 640), line(ORANGE, 325, 375, 230, 375), line(ORANGE, 675, 375, 770, 375), line(ORANGE, 375, 250, 310, 185), line(ORANGE, 625, 250, 690, 185), line(ORANGE, 375, 500, 310, 565), line(ORANGE, 625, 500, 690, 565)],
  },
  bulan: {
    level: 1,
    lines: [oval(500, 375, 230, 230, YELLOW, 60, 300), oval(650, 375, 195, 215, YELLOW, 125, 235), line(INK, 180, 150, 200, 190), line(INK, 780, 560, 800, 600)],
  },
  bintang: {
    level: 1,
    lines: [line(YELLOW, 500, 110, 570, 300, 780, 300, 610, 420, 680, 620, 500, 500, 320, 620, 390, 420, 220, 300, 430, 300, 500, 110), scribble(420, 320, 160, 130, YELLOW)],
  },
  awan: {
    level: 1,
    lines: [oval(350, 410, 110, 85, BLUE, 80, 280), oval(500, 320, 130, 110, BLUE, 170, 350), oval(660, 410, 110, 85, BLUE, -100, 100), line(BLUE, 350, 495, 660, 495)],
  },
  pohon: {
    level: 1,
    lines: [box(445, 420, 110, 240, BROWN), scribble(455, 430, 90, 220, BROWN), oval(500, 270, 220, 180, GREEN), scribble(350, 170, 300, 200, GREEN)],
  },
  bunga: {
    level: 1,
    lines: [line(GREEN, 500, 400, 500, 680), oval(420, 590, 75, 32, GREEN), oval(500, 260, 65, 65, YELLOW), oval(500, 130, 70, 70, PINK), oval(500, 390, 70, 70, PINK), oval(370, 260, 70, 70, PINK), oval(630, 260, 70, 70, PINK)],
  },
  balon: {
    level: 1,
    lines: [oval(500, 280, 170, 210, PINK), scribble(390, 180, 220, 200, PINK), line(PINK, 480, 490, 520, 490, 500, 515, 480, 490), line(INK, 500, 515, 530, 570, 470, 620, 510, 690)],
  },
  payung: {
    level: 1,
    lines: [oval(500, 330, 290, 210, PINK, 180, 360), line(PINK, 210, 330, 305, 300, 400, 330, 500, 300, 600, 330, 695, 300, 790, 330), line(INK, 500, 330, 500, 600), oval(450, 600, 50, 50, INK, 0, 180), line(INK, 500, 120, 500, 95)],
  },
  topi: {
    level: 1,
    lines: [oval(500, 480, 310, 65), box(340, 210, 320, 270), scribble(350, 220, 300, 250, INK), line(PINK, 340, 420, 660, 420)],
  },
  kacamata: {
    level: 1,
    lines: [oval(320, 375, 130, 100), oval(680, 375, 130, 100), line(INK, 450, 360, 550, 360), line(INK, 190, 350, 90, 300), line(INK, 810, 350, 910, 300)],
  },
  kunci: {
    level: 2,
    lines: [oval(300, 375, 110, 110, YELLOW), oval(300, 375, 40, 40), line(YELLOW, 410, 375, 830, 375), line(YELLOW, 760, 375, 760, 450), line(YELLOW, 680, 375, 680, 440)],
  },
  gunung: {
    level: 1,
    lines: [line(BROWN, 90, 640, 400, 180, 620, 480, 700, 360, 920, 640, 90, 640), line(BLUE, 345, 260, 395, 300, 430, 260, 475, 300), oval(790, 150, 60, 60, YELLOW), line(GREEN, 90, 660, 920, 660)],
  },
  hati: {
    level: 1,
    lines: [line(PINK, 500, 640, 230, 390, 190, 270, 250, 170, 370, 160, 500, 290, 630, 160, 750, 170, 810, 270, 770, 390, 500, 640), scribble(330, 270, 340, 170, PINK)],
  },
  kapal: {
    level: 2,
    lines: [line(BROWN, 170, 460, 830, 460, 720, 590, 280, 590, 170, 460), line(INK, 500, 460, 500, 120), line(PINK, 500, 130, 720, 400, 500, 400), line(BLUE, 80, 640, 200, 610, 320, 640, 440, 610, 560, 640, 680, 610, 800, 640, 920, 610)],
  },
  sepeda: {
    level: 2,
    lines: [oval(280, 480, 130, 130), oval(720, 480, 130, 130), line(PINK, 280, 480, 410, 300, 620, 300, 720, 480), line(PINK, 410, 300, 500, 480, 620, 300), line(PINK, 500, 480, 280, 480), line(INK, 410, 300, 390, 250, 340, 250, 450, 250), line(INK, 620, 300, 600, 220, 660, 200)],
  },
  pelangi: {
    level: 1,
    lines: [oval(500, 610, 400, 400, PINK, 180, 360), oval(500, 610, 360, 360, ORANGE, 180, 360), oval(500, 610, 320, 320, YELLOW, 180, 360), oval(500, 610, 280, 280, GREEN, 180, 360), oval(500, 610, 240, 240, BLUE, 180, 360)],
  },
  kursi: {
    level: 1,
    lines: [box(350, 130, 300, 260, BROWN), box(330, 390, 340, 50, BROWN), line(BROWN, 350, 440, 350, 660), line(BROWN, 650, 440, 650, 660), line(BROWN, 430, 200, 570, 200), line(BROWN, 430, 300, 570, 300)],
  },
  lampu: {
    level: 1,
    lines: [oval(500, 280, 160, 170, YELLOW, -220, 40), line(YELLOW, 380, 390, 430, 470, 570, 470, 620, 390), box(435, 470, 130, 60), box(455, 530, 90, 50), line(YELLOW, 500, 60, 500, 20), line(YELLOW, 250, 180, 200, 150), line(YELLOW, 750, 180, 800, 150)],
  },
  'es krim': {
    level: 1,
    lines: [line(ORANGE, 370, 330, 630, 330, 500, 680, 370, 330), line(ORANGE, 420, 420, 570, 430), line(ORANGE, 450, 510, 540, 520), oval(500, 240, 150, 130, PINK), scribble(390, 150, 220, 170, PINK), oval(500, 90, 30, 30, PINK)],
  },
  jam: {
    level: 1,
    lines: [oval(500, 375, 260, 260), line(INK, 500, 375, 500, 200), line(INK, 500, 375, 620, 440), line(INK, 500, 140, 500, 165), line(INK, 500, 585, 500, 610), line(INK, 265, 375, 290, 375), line(INK, 710, 375, 735, 375)],
  },
  bola: {
    level: 1,
    lines: [oval(500, 375, 260, 260), line(INK, 500, 280, 590, 345, 555, 450, 445, 450, 410, 345, 500, 280), line(INK, 500, 280, 500, 120), line(INK, 590, 345, 745, 300), line(INK, 555, 450, 650, 590), line(INK, 445, 450, 350, 590), line(INK, 410, 345, 255, 300)],
  },
  semangka: {
    level: 1,
    lines: [oval(500, 280, 330, 330, GREEN, 0, 180), line(GREEN, 170, 280, 830, 280), oval(500, 280, 280, 280, PINK, 0, 180), scribble(300, 300, 400, 170, PINK), line(INK, 420, 340, 430, 365), line(INK, 500, 350, 500, 380), line(INK, 580, 340, 570, 365), line(INK, 460, 440, 465, 465), line(INK, 545, 440, 540, 465)],
  },
  jamur: {
    level: 2,
    lines: [oval(500, 360, 280, 240, PINK, 180, 360), line(PINK, 220, 360, 780, 360), box(420, 360, 160, 260), oval(420, 240, 50, 50), oval(590, 220, 40, 40), oval(660, 310, 30, 30)],
  },
  tenda: {
    level: 2,
    lines: [line(ORANGE, 500, 130, 860, 620, 140, 620, 500, 130), line(ORANGE, 500, 130, 400, 620), line(ORANGE, 500, 130, 600, 620), line(INK, 400, 620, 500, 440, 600, 620), line(GREEN, 80, 640, 920, 640)],
  },
  roket: {
    level: 2,
    lines: [line(BLUE, 500, 70, 610, 240, 610, 500, 390, 500, 390, 240, 500, 70), oval(500, 280, 55, 55), line(PINK, 390, 400, 290, 540, 390, 500), line(PINK, 610, 400, 710, 540, 610, 500), line(ORANGE, 430, 500, 500, 680, 570, 500)],
  },
  donat: {
    level: 2,
    lines: [oval(500, 375, 240, 230, BROWN), oval(500, 375, 80, 75, BROWN), oval(500, 375, 200, 190, PINK), line(YELLOW, 380, 280, 400, 300), line(BLUE, 600, 270, 620, 295), line(GREEN, 660, 400, 640, 430), line(YELLOW, 560, 510, 590, 500), line(BLUE, 370, 470, 400, 490), line(GREEN, 330, 370, 345, 340)],
  },
}

export type Sketch = { word: string; level: Level }

export const SKETCH_WORDS: Sketch[] = Object.entries(RAW).map(([word, s]) => ({ word, level: s.level }))

/** Panjang satu potongan coretan, supaya gambar muncul sedikit-sedikit seperti digambar tangan. */
const CHUNK = 12
/** Jarak titik di garis lurus: kanvas menghaluskan coretan, tanpa titik rapat sudutnya jadi membulat. */
const GAP = 70

function dense(pts: number[]): number[] {
  const out = pts.slice(0, 2)
  for (let i = 2; i < pts.length; i += 2) {
    const [ax, ay, bx, by] = pts.slice(i - 2, i + 2)
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / GAP))
    for (let k = 1; k <= steps; k++) out.push(Math.round(ax + ((bx - ax) * k) / steps), Math.round(ay + ((by - ay) * k) / steps))
  }
  return out
}

/** Sketsa sebagai deretan Stroke siap kirim; satu goresan bisa jadi beberapa potongan bernomor `g` sama. */
export function sketchStrokes(word: string): Stroke[] {
  const lines = RAW[word]?.lines ?? []
  return lines.flatMap((l, g) => {
    const pts = dense(l.pts)
    const out: Stroke[] = []
    for (let i = 0; i + 2 < pts.length; i += CHUNK - 2) {
      out.push({ g, c: l.c, w: l.w ?? 1, pts: pts.slice(i, i + CHUNK) })
    }
    return out
  })
}
