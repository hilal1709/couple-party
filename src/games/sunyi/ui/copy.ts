import type { Level, Sensitivity } from '@/voice/loudness'
import type { Difficulty, ItemKind, SunyiOptions } from '../types'

export const DIFF_INFO: Record<Difficulty, { title: string; line: string }> = {
  santai: { title: 'Santai', line: 'Penunggunya agak budek' },
  normal: { title: 'Normal', line: 'Bicara biasa = ketahuan' },
  seram: { title: 'Seram', line: 'Telinganya tajam, jalannya cepat' },
}

export const SENS_INFO: Record<Sensitivity, string> = { peka: 'Peka', sedang: 'Sedang', santai: 'Santai' }

export const ITEM_INFO: Record<ItemKind, string> = {
  kunci: 'Kunci gerbang',
  teplok: 'Lampu teplok',
  keris: 'Keris tua',
  foto: 'Foto keluarga',
  kendi: 'Kendi sesajen',
  cermin: 'Cermin antik',
  kemenyan: 'Kemenyan',
}

export const LEVEL_INFO: Record<Level, { label: string; tone: string }> = {
  diam: { label: 'Hening', tone: 'text-paper/70' },
  bisik: { label: 'Bisik', tone: 'text-grass' },
  normal: { label: 'Terdengar!', tone: 'text-rose' },
  teriak: { label: 'TERIAK!', tone: 'text-rose' },
}

export function summary(o: SunyiOptions) {
  return `${DIFF_INFO[o.difficulty].title} · ${o.items} pusaka · wajib mic`
}

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

export const INTRO = [
  'Kampung ini sunyi. Penunggunya tidak bisa melihat, tapi telinganya tajam.',
  'Kumpulkan pusaka yang berkilau samar, lalu kabur lewat gerbang selatan, berdua.',
  'Bicara pakai bisikan. Bicara biasa, teriak, atau lari bikin dia datang.',
]

export const DOWN_LINE = ['Kamu pingsan… bisikkan pasanganmu supaya datang.', 'Gelap. Dingin. Panggil dia pelan-pelan.']
export const WIN_LINE = ['Kalian kabur! Untung pasanganmu jago diam.', 'Lolos berdua. Bisikanmu ternyata romantis juga.']
export const LOSE_LINE = ['Dua-duanya pingsan. Mungkin kurang pelan bisiknya.', 'Penunggu menang malam ini. Coba lagi, lebih sunyi.']
