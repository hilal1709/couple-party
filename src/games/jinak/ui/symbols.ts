/**
 * Simbol Wayang & bentuk gembok, digambar manual sebagai path SVG (viewBox 0 0 100 100, garis tebal).
 * Dipakai bersama buku panduan (SVG) dan tuts di bom 3D (Path2D di kanvas), jadi bentuknya selalu sama.
 */
export const SYMBOL_PATH: Record<string, string> = {
  gunungan: 'M50 8 C70 30 86 55 82 92 L18 92 C14 55 30 30 50 8 Z M50 30 L50 88 M50 50 L36 62 M50 50 L64 62 M50 68 L38 80 M50 68 L62 80',
  keris: 'M50 6 C58 16 42 26 52 36 C60 46 44 56 52 66 L50 72 M34 72 L66 72 M44 72 L46 94 L54 94 L56 72',
  blangkon: 'M18 70 C18 28 82 28 82 70 Z M74 58 C88 60 92 74 82 84 C78 76 76 70 72 66 M34 52 L66 52',
  kawung: 'M50 50 C28 22 72 22 50 50 C78 28 78 72 50 50 C72 78 28 78 50 50 C22 72 22 28 50 50 Z M50 8 L50 16 M50 84 L50 92 M8 50 L16 50 M84 50 L92 50',
  mega: 'M15 70 C10 50 30 40 38 52 C38 32 62 28 64 48 C72 36 92 46 84 64 C80 76 60 74 58 66 C52 78 30 80 28 66 C22 74 16 74 15 70 Z M40 62 C44 56 54 56 56 62',
  bintang: 'M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z',
  bulan: 'M64 10 A40 40 0 1 0 64 90 A32 32 0 1 1 64 10 Z',
  ombak: 'M8 40 C20 25 32 25 42 40 C52 55 64 55 74 40 C82 30 90 30 94 36 M8 66 C20 51 32 51 42 66 C52 81 64 81 74 66 C82 56 90 56 94 62',
  daun: 'M16 84 C16 40 50 14 86 14 C86 50 60 84 16 84 Z M16 84 L70 30 M40 60 L40 44 M54 46 L54 32',
  mata: 'M8 50 C30 18 70 18 92 50 C70 82 30 82 8 50 Z M38 50 A12 12 0 1 0 62 50 A12 12 0 1 0 38 50 Z',
  payung: 'M10 52 C10 18 90 18 90 52 C80 44 70 44 63 52 C56 44 44 44 37 52 C30 44 20 44 10 52 Z M50 52 L50 84 C50 93 38 93 38 84',
  kendang: 'M30 18 L70 18 C83 40 83 60 70 82 L30 82 C17 60 17 40 30 18 Z M30 18 L70 82 M70 18 L30 82',
  wajan: 'M10 44 L90 44 C86 70 70 82 50 82 C30 82 14 70 10 44 Z M90 44 L98 34 M10 44 L2 34 M30 30 C34 24 30 18 34 12 M50 30 C54 24 50 18 54 12',
  ketupat: 'M50 8 L88 50 L50 92 L12 50 Z M31 29 L69 71 M69 29 L31 71',
  kipas: 'M50 88 L10 40 C30 14 70 14 90 40 Z M50 88 L30 24 M50 88 L50 18 M50 88 L70 24',
  cangkir: 'M20 36 L72 36 L66 84 L26 84 Z M72 46 C90 46 90 70 70 70 M36 28 C32 20 40 15 36 7 M52 28 C48 20 56 15 52 7',
  hati: 'M50 88 C20 66 6 48 14 30 C22 14 44 16 50 32 C56 16 78 14 86 30 C94 48 80 66 50 88 Z',
}

export const SYMBOL_TITLE: Record<string, string> = {
  gunungan: 'Gunungan',
  keris: 'Keris',
  blangkon: 'Blangkon',
  kawung: 'Kawung',
  mega: 'Mega Mendung',
  bintang: 'Bintang',
  bulan: 'Bulan Sabit',
  ombak: 'Ombak',
  daun: 'Daun',
  mata: 'Mata',
  payung: 'Payung',
  kendang: 'Kendang',
  wajan: 'Wajan',
  ketupat: 'Ketupat',
  kipas: 'Kipas',
  cangkir: 'Cangkir',
  hati: 'Hati',
}

/** gambar simbol ke kanvas: kotak (x, y, ukuran), garis tinta */
export function drawSymbol(g: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, color = '#121212', width = 7) {
  const p = new Path2D(SYMBOL_PATH[id])
  g.save()
  g.translate(x, y)
  g.scale(size / 100, size / 100)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke(p)
  g.restore()
}
