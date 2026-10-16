import type { Seat } from '../../types'
import { MR_WHITE_MIN, POINTS, roleCounts } from '../engine'
import type { Pack, Role, SpyMode, SpyOptions, SpyState } from '../types'

export const MODE_INFO: Record<SpyMode, { title: string; line: string }> = {
  kata: {
    title: 'Kata Kembar',
    line: 'Semua dapat kata yang sama, kecuali penyusup yang dapat kata mirip. Penyusup sendiri nggak sadar dia penyusup.',
  },
  lokasi: {
    title: 'Lokasi Rahasia',
    line: 'Semua tahu lokasinya & perannya di sana. Satu mata-mata nggak tahu apa-apa dan harus pura-pura ngerti.',
  },
}

export const PACK_INFO: Record<Pack, { title: string; line: string }> = {
  umum: { title: 'Umum', line: 'Kucing/anjing, kopi/teh, spiderman/batman.' },
  lokal: { title: 'Lokal Indonesia', line: 'Bakso/mie ayam, ojol/opang, kondangan/arisan.' },
  pasangan: { title: 'Pasangan & receh', line: 'Mantan/gebetan, ngambek/marah, dibaca doang/centang satu.' },
}

export const MR_WHITE_INFO = {
  title: 'Mr. White',
  line: `Satu orang nggak dapat kata sama sekali. Kalau ketahuan, masih bisa menang dengan menebak kata warga. Mulai ${MR_WHITE_MIN} pemain.`,
}

export const ROLE_INFO: Record<Role, { title: string; line: string }> = {
  warga: { title: 'Warga', line: 'Pemegang kata asli.' },
  penyusup: { title: 'Penyusup', line: 'Kata beda dikit, tapi nggak sadar.' },
  mrwhite: { title: 'Mr. White', line: 'Nggak punya kata, modal nekat.' },
  spy: { title: 'Mata-mata', line: 'Nggak tahu lokasinya.' },
}

export function summary(o: SpyOptions) {
  if (o.mode === 'lokasi') return `${MODE_INFO.lokasi.title} · ${o.rounds} ronde · ${o.seconds} dtk`
  const packs = o.packs.map((p) => PACK_INFO[p].title)
  if (o.custom.length) packs.push(`${o.custom.length} kata sendiri`)
  return `${MODE_INFO.kata.title}${o.mrWhite ? ' + Mr. White' : ''} · ${o.rounds} ronde · ${packs.join(', ') || 'Umum'}`
}

/** "2 penyusup + 1 Mr. White" untuk lobby & layar peran */
export function castLine(o: SpyOptions) {
  const c = roleCounts(o)
  if (o.mode === 'lokasi') return `${c.warga} warga lokal + 1 mata-mata`
  return [`${c.warga} warga`, `${c.penyusup} penyusup`, c.mrwhite ? '1 Mr. White' : ''].filter(Boolean).join(' + ')
}

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

export const POINT_RULES = [
  `Warga menang: tiap warga +${POINTS.warga}`,
  `Penyusup lolos: yang masih hidup +${POINTS.survive}`,
  `Mr. White tebak kata: +${POINTS.mrwhite}`,
  `Mata-mata tebak lokasi: +${POINTS.spy}`,
]

/** Baris status di bawah kartu peran. */
export function statusLine(s: SpyState, me: Seat, names: string[]): string {
  switch (s.phase) {
    case 'role':
      return s.ready[me] ? 'Nunggu yang lain ngintip kartunya…' : 'Intip kartumu, hafalin, lalu tekan Siap.'
    case 'clue':
      if (!s.alive[me]) return `Kamu udah keluar. Nonton aja, jangan bocorin!`
      return s.turn === me ? 'Giliranmu! Kasih satu petunjuk, jangan terlalu jelas.' : `${names[s.turn] ?? '?'} lagi mikir petunjuk…`
    case 'vote':
      if (!s.alive[me]) return 'Yang masih hidup lagi voting.'
      if (s.candidates) return 'Seri! Voting ulang, pilih salah satu yang seri.'
      return s.votes[me] >= 0 ? `Kamu pilih ${names[s.votes[me]] ?? '?'}. Masih bisa ganti.` : 'Siapa yang mencurigakan? Tap kartunya.'
    case 'out':
      return s.lastOut === null ? 'Nggak ada yang keluar.' : `${who(s.lastOut, me, names)} keluar.`
    case 'guess':
      return s.lastOut === me ? 'Kesempatan terakhir: tebak!' : `${names[s.lastOut!] ?? '?'} lagi menebak…`
    case 'roundEnd':
      return s.winner === 'warga' ? 'Warga menang ronde ini.' : 'Pihak penyusup menang ronde ini.'
    case 'end':
      return 'Game selesai.'
  }
}

export function outLine(s: SpyState, me: Seat, names: string[]): string {
  if (s.lastOut === null) return s.tally.every((v) => v === 0) ? 'Semua diam, nggak ada yang milih. Penakut semua.' : 'Seri lagi. Kali ini semua selamat.'
  const name = who(s.lastOut, me, names)
  const role = s.roles[s.lastOut]
  if (role === 'warga') return `${name} ternyata warga biasa. Oops, salah tuduh.`
  if (role === 'penyusup') return `${name} ketahuan jadi penyusup!`
  if (role === 'mrwhite') return `${name} ternyata Mr. White! Tapi dia masih bisa nebak katanya.`
  return `${name} si mata-mata! Masih ada satu kesempatan nebak lokasinya.`
}

export function roundLine(s: SpyState, me: Seat, names: string[]): { title: string; line: string } {
  const bad = s.roles.map((r, i) => (r !== 'warga' ? i : -1)).filter((i) => i >= 0)
  const badNames = bad.map((i) => who(i, me, names)).join(' & ')
  const guesser = s.lastOut !== null && s.roles[s.lastOut] !== 'warga' ? s.lastOut : bad[0]
  switch (s.result) {
    case 'caught':
      return { title: 'Warga menang!', line: `Semua penyamar ketahuan: ${badNames}.` }
    case 'survive':
      return { title: s.opts.mode === 'lokasi' ? 'Mata-mata lolos!' : 'Penyusup menang!', line: `${badNames} berhasil berbaur sampai akhir.` }
    case 'guessed':
      return {
        title: s.opts.mode === 'lokasi' ? 'Mata-mata nebak benar!' : 'Mr. White nebak benar!',
        line: `${who(guesser, me, names)} menebak "${s.guessText}". Licik!`,
      }
    case 'blunder':
      return { title: 'Mata-mata salah tebak!', line: `${who(guesser, me, names)} nekat nebak "${s.guessText}". Bukan di situ, Pak.` }
    default:
      return { title: '', line: '' }
  }
}
