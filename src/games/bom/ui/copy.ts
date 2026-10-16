import type { Seat } from '../../types'
import { CUT_MS, LONG_WORD, protestNeed } from '../engine'
import type { BomMode, BomOptions, BomState, Power, Speed } from '../types'

export const MODE_INFO: Record<BomMode, { title: string; line: string; example: string }> = {
  kategori: { title: 'Kategori + Huruf', line: 'Kategori per ronde, huruf awal ganti tiap giliran.', example: 'Buah · huruf M → mangga' },
  bebas: { title: 'Kategori Bebas', line: 'Asal masuk kategorinya, tapi nggak boleh ngulang.', example: 'Merek apa saja → indomie' },
  suku: { title: 'Suku Kata', line: 'Kata apa saja yang mengandung potongan huruf tertentu.', example: 'ada "KA" → kaki, makan' },
  sambung: { title: 'Sambung Kata', line: 'Awali dengan huruf terakhir kata sebelumnya.', example: 'kopi → ikan → nanas' },
}

export const SPEED_INFO: Record<Speed, { title: string; line: string }> = {
  santai: { title: 'Santai', line: '25–60 dtk' },
  normal: { title: 'Normal', line: '15–45 dtk' },
  panik: { title: 'Panik', line: '10–25 dtk' },
}

export const POWER_INFO: Record<Power, { title: string; line: string; alt: string }> = {
  balik: { title: 'Lempar Balik', line: 'Bom balik ke yang barusan ngoper. Tanpa ngetik.', alt: 'Bumerang pink' },
  lompat: { title: 'Lompati', line: 'Oper melewati satu orang. Tanpa ngetik.', alt: 'Sepatu berpegas' },
  pendek: { title: 'Sumbu Pendek', line: `Potong sumbu ${CUT_MS / 1000} detik saat bom di tangan orang lain.`, alt: 'Gunting merah' },
}

export const FEATURE_INFO = {
  powerups: { title: 'Power-up', line: `Semua mulai dengan satu. Kata ≥ ${LONG_WORD} huruf dapat bonus.` },
  protest: { title: 'Vote "Ngawur!"', line: 'Kata ngasal bisa dibatalkan suara terbanyak. Bom balik ke penulisnya.' },
  aim: { title: 'Pilih arah oper', line: 'Habis ngetik, kamu yang milih bom dioper ke siapa.' },
  faster: { title: 'Makin cepat', line: 'Tiap ledakan, sumbu ronde berikutnya makin pendek.' },
} as const

export function summary(o: BomOptions) {
  const extra = [o.powerups && 'power-up', o.protest && 'protes', o.aim && 'pilih arah', o.faster && 'makin cepat'].filter(Boolean)
  return `${MODE_INFO[o.mode].title} · ${o.lives} nyawa · ${SPEED_INFO[o.speed].title}${extra.length ? ` · ${extra.join(', ')}` : ''}`
}

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

/** Baris status di panel kanan. */
export function statusLine(s: BomState, me: Seat, names: string[]): string {
  switch (s.phase) {
    case 'intro':
      return me === 0 ? 'Semua siap? Nyalakan sumbunya!' : 'Nunggu host menyalakan sumbu…'
    case 'live':
      if (!s.alive[me]) return 'Kamu udah gosong. Nonton aja, boleh nyorakin.'
      if (s.holder === me) return s.aiming ? 'Lempar ke siapa? Tap kartunya, cepat!' : 'BOM DI TANGANMU! Ketik kata, buruan!'
      return s.aiming ? `${names[s.holder] ?? '?'} lagi milih korban…` : `${names[s.holder] ?? '?'} pegang bom. Doain meledak.`
    case 'boom':
      return s.lastBoom === me ? 'DUAR! Kena kamu.' : `DUAR! ${names[s.lastBoom ?? 0] ?? '?'} kena.`
    case 'end':
      return 'Game selesai.'
  }
}

export function boomLine(s: BomState, me: Seat, names: string[]): { title: string; line: string } {
  const h = s.lastBoom ?? 0
  const name = who(h, me, names)
  if (!s.alive[h]) return { title: `${name} gosong total!`, line: me === h ? 'Nyawamu habis. Nonton dulu ya.' : 'Nyawanya habis, keluar dari permainan.' }
  const lives = s.lives[h]
  return { title: `DUAR! ${name} kena`, line: `Sisa ${lives} nyawa. ${lives === 1 ? 'Tinggal satu, hati-hati!' : 'Masih aman… untuk sekarang.'}` }
}

export function eventLine(s: BomState, me: Seat, names: string[]): string | null {
  const e = s.event
  if (!e) return null
  const by = who(e.by, me, names)
  if (e.kind === 'cancel') return `"${e.word}" dibatalkan! Bom balik ke ${by}.`
  if (e.kind === 'gift') return `${by} dapat ${POWER_INFO[e.power].title} dari kata panjang.`
  if (e.power === 'pendek') return `${by} motong sumbu! Bom makin cepat meledak.`
  return `${by} pakai ${POWER_INFO[e.power].title} → ${who(e.to ?? 0, me, names)}.`
}

export function protestLine(s: BomState): string {
  const { need } = protestNeed(s)
  return `${s.review?.votes.length ?? 0}/${need} suara`
}
