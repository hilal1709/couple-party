import type { Body, CupId, ItemKind, Level, TrackId } from './types'

export type Weight = 'ringan' | 'sedang' | 'berat'
export type Stats = { speed: number; accel: number; turn: number; weight: number }

/** 8 pembalap, satu per warna kursi; model 3D dari scripts/blender/kart.py */
export const CHARACTERS: { id: string; name: string; animal: string; color: string; weight: Weight }[] = [
  { id: 'moci', name: 'Moci', animal: 'Kucing', color: '#ff37a6', weight: 'ringan' },
  { id: 'kroak', name: 'Kroak', animal: 'Kodok', color: '#5cf64a', weight: 'ringan' },
  { id: 'bubu', name: 'Bubu', animal: 'Beruang', color: '#2f7bff', weight: 'berat' },
  { id: 'ciko', name: 'Ciko', animal: 'Ayam', color: '#ffcc1f', weight: 'ringan' },
  { id: 'gurit', name: 'Gurit', animal: 'Gurita', color: '#8a55ff', weight: 'sedang' },
  { id: 'loreng', name: 'Loreng', animal: 'Harimau', color: '#ff8a1c', weight: 'berat' },
  { id: 'embek', name: 'Embek', animal: 'Kambing', color: '#13bfae', weight: 'sedang' },
  { id: 'komo', name: 'Komo', animal: 'Komodo', color: '#ff3b5c', weight: 'berat' },
]

export const WEIGHT_STATS: Record<Weight, Stats> = {
  ringan: { speed: 0.95, accel: 1.15, turn: 1.12, weight: 0.8 },
  sedang: { speed: 1, accel: 1, turn: 1, weight: 1 },
  berat: { speed: 1.05, accel: 0.88, turn: 0.92, weight: 1.25 },
}

export const BODIES: Record<Body, { title: string; line: string; mod: Stats }> = {
  bajaj: { title: 'Bajaj Mini', line: 'Lincah, ngebut dari start', mod: { speed: -0.02, accel: 0.08, turn: 0.05, weight: 0 } },
  gerobak: { title: 'Gerobak', line: 'Berat, susah didorong', mod: { speed: 0.02, accel: -0.03, turn: -0.04, weight: 0.18 } },
  bebek: { title: 'Roket Bebek', line: 'Top speed paling tinggi', mod: { speed: 0.04, accel: -0.06, turn: -0.01, weight: -0.05 } },
}
export const BODY_IDS = Object.keys(BODIES) as Body[]

export function statsFor(char: number, body: Body): Stats {
  const w = WEIGHT_STATS[CHARACTERS[char].weight]
  const m = BODIES[body].mod
  return { speed: w.speed + m.speed, accel: w.accel + m.accel, turn: w.turn + m.turn, weight: w.weight + m.weight }
}

export const ITEM_INFO: Record<ItemKind, { title: string; line: string; uses: number }> = {
  roket: { title: 'Roket Kertas', line: 'Meluncur ke depan menyusuri jalan', uses: 1 },
  pisang: { title: 'Kulit Pisang', line: 'Jatuhkan di belakang, bikin lawan muter', uses: 1 },
  pisang3: { title: 'Kulit Pisang ×3', line: 'Tiga kulit, tiga korban', uses: 3 },
  perisai: { title: 'Perisai Gelembung', line: 'Tahan satu serangan', uses: 1 },
  sambal: { title: 'Turbo Sambal', line: 'Pedasnya bikin ngebut', uses: 1 },
  sambal3: { title: 'Turbo Sambal ×3', line: 'Tiga semburan turbo', uses: 3 },
  awan: { title: 'Awan Hujan', line: 'Semua yang di depanmu kehujanan & melambat', uses: 1 },
  magnet: { title: 'Magnet', line: 'Nempel & ngebut ke kart di depanmu', uses: 1 },
  petasan: { title: 'Bom Petasan', line: 'Lempar ke depan, DOR!', uses: 1 },
}

/**
 * Peluang item menurut posisi: baris = seperempat posisi (terdepan → paling belakang).
 * Yang di belakang dapat item yang lebih kuat supaya balapan tetap seru.
 */
const ODDS: Record<ItemKind, [number, number, number, number]> = {
  pisang: [30, 12, 4, 0],
  pisang3: [10, 10, 4, 0],
  perisai: [22, 14, 8, 4],
  roket: [12, 20, 18, 12],
  petasan: [8, 14, 14, 10],
  sambal: [14, 18, 20, 20],
  sambal3: [0, 6, 14, 22],
  magnet: [0, 4, 12, 18],
  awan: [0, 2, 6, 14],
}

/** pilih item dari angka acak 0..1 untuk posisi `rank` dari `total` kart */
export function rollItem(r: number, rank: number, total: number): ItemKind {
  const band = Math.min(3, Math.floor((rank / Math.max(1, total)) * 4))
  const kinds = Object.keys(ODDS) as ItemKind[]
  const sum = kinds.reduce((a, k) => a + ODDS[k][band], 0)
  let x = r * sum
  for (const k of kinds) {
    x -= ODDS[k][band]
    if (x < 0) return k
  }
  return 'pisang'
}

export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1]

export const CUPS: Record<CupId, { title: string; tracks: TrackId[] }> = {
  daun: { title: 'Piala Daun', tracks: ['pantai', 'sawah', 'jamur', 'candi'] },
  bintang: { title: 'Piala Bintang', tracks: ['neon', 'permen', 'salju', 'lava'] },
}

/** kecepatan & kepintaran bot */
export const LEVEL_INFO: Record<Level, { title: string; line: string; speed: number; skill: number }> = {
  santai: { title: 'Santai', line: 'Bot sering melamun', speed: 0.86, skill: 0.4 },
  normal: { title: 'Normal', line: 'Lumayan nempel', speed: 0.94, skill: 0.7 },
  jago: { title: 'Jago', line: 'Bot ngedrift & usil', speed: 1.0, skill: 1 },
}

export const MAX_RACERS = 8
