import type { Seat } from '../../types'
import { LEVEL_BONUS } from '../engine'
import type { DrawOptions, DrawState, FeedItem, Level, Pack } from '../types'

export const PACK_INFO: Record<Pack, { title: string; line: string }> = {
  umum: { title: 'Umum', line: 'Hewan, makanan, benda, tokoh. Dari kucing sampai gunung berapi.' },
  lokal: { title: 'Lokal Indonesia', line: 'Rendang, ondel-ondel, angkot, ojol, tujuh belasan.' },
  pasangan: { title: 'Pasangan & jahil', line: 'Ngambek, chat dibaca doang, mantan, kode keras.' },
}

export const LEVEL_INFO: Record<Level, { title: string; bonus: string }> = {
  1: { title: 'Gampang', bonus: '' },
  2: { title: 'Sedang', bonus: `+${LEVEL_BONUS}` },
  3: { title: 'Susah', bonus: `+${LEVEL_BONUS * 2}` },
}

export const OPTION_HINT: { title: string; line: string } = {
  title: 'Petunjuk huruf',
  line: 'Setelah setengah waktu, beberapa huruf dibuka pelan-pelan.',
}

export function summary(o: DrawOptions) {
  const packs = o.packs.map((p) => PACK_INFO[p].title)
  if (o.custom.length) packs.push(`${o.custom.length} kata sendiri`)
  return `${o.rounds} putaran · ${o.seconds} dtk · ${packs.join(', ') || 'Umum'}`
}

const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

/** satu baris feed tebakan; tebakan "nyaris" hanya diperlihatkan ke yang menebak */
export function feedLine(f: FeedItem, me: Seat, names: string[]): { name?: string; text: string; tone: 'plain' | 'good' | 'close' | 'turn' } {
  switch (f.t) {
    case 'turn':
      return { text: `${who(f.by, me, names)} kebagian menggambar.`, tone: 'turn' }
    case 'guess':
      return { name: who(f.by, me, names), text: f.text, tone: 'plain' }
    case 'close':
      return f.by === me
        ? { name: 'Kamu', text: `"${f.text}" — dikit lagi!`, tone: 'close' }
        : { text: `${names[f.by] ?? '?'} nyaris bener…`, tone: 'close' }
    case 'correct':
      return { text: f.by === me ? `Kamu bener! +${f.points}` : `${names[f.by] ?? '?'} berhasil nebak! +${f.points}`, tone: 'good' }
  }
}

export function revealLine(s: DrawState, me: Seat, names: string[]) {
  const drawer = s.drawer === me ? 'Kamu' : (names[s.drawer] ?? '?')
  if (s.reason === 'all') return 'Semua berhasil nebak. Gambarnya jelas banget!'
  if (s.reason === 'skip') return `${drawer} angkat tangan. Gambarnya terlalu abstrak.`
  if (s.guessed.length === 0) return 'Waktu habis, nggak ada yang nebak. Pelukis kita kurang dihargai.'
  return `Waktu habis. ${s.guessed.length} orang berhasil nebak.`
}

export function guessPlaceholder(s: DrawState, me: Seat) {
  if (s.phase !== 'draw') return 'Tunggu gambarnya dulu…'
  if (s.drawer === me) return 'Kamu yang gambar, jangan bocorin!'
  if (s.guessed.includes(me)) return 'Udah bener. Tinggal nonton yang lain.'
  return 'Ketik tebakanmu…'
}
