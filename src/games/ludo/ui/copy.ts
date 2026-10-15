import type { Seat } from '../../types'
import type { LudoOptions, LudoState, Note, Special } from '../types'

export function summary(o: LudoOptions) {
  const extra = [o.teams && 'tim', o.specials && 'petak jahil', o.freeOut && 'keluar bebas'].filter(Boolean)
  return `Papan ${o.arms} · ${o.pieces} bidak${extra.length ? ` · ${extra.join(', ')}` : ''}`
}

export const OPTION_INFO: Record<keyof Pick<LudoOptions, 'teams' | 'specials' | 'freeOut'>, { title: string; line: string }> = {
  teams: { title: 'Mode tim', line: 'Dua tim, rekan duduk selang-seling. Rekan nggak saling makan, yang finis duluan bantu jalanin bidak rekan. Butuh 4, 6, atau 8 pemain.' },
  specials: { title: 'Petak jahil', line: 'Roket maju 3, pisang mundur 3, portal loncat satu lengan, bom pulangkan lawan terdekat.' },
  freeOut: { title: 'Keluar bebas', line: 'Mode cepat: bidak keluar kandang pakai angka berapa pun, nggak harus nunggu 6.' },
}

export const SPECIAL_INFO: Record<Special, { title: string; line: string }> = {
  boost: { title: 'Roket', line: 'Maju 3 petak' },
  slip: { title: 'Kulit pisang', line: 'Kepleset mundur 3' },
  portal: { title: 'Portal', line: 'Loncat ke lengan berikutnya' },
  bomb: { title: 'Bom', line: 'Pulangkan lawan terdekat di depan' },
}

/** Nama tim untuk mode tim. */
export const TEAM_NAME = ['Tim Pink', 'Tim Hijau']

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

function noteText(n: Note, by: Seat, me: Seat, names: string[], s: LudoState): string | null {
  const w = who(by, me, names)
  switch (n.t) {
    case 'six':
      return null
    case 'tripleSix':
      return `${w} dapat 6 tiga kali beruntun. Kebanyakan hoki, giliran hangus!`
    case 'noMove':
      return `${w} nggak bisa jalan. Sabar ya.`
    case 'out':
      return `${n.seat === by ? w : who(n.seat, me, names)} keluarin bidak dari kandang.`
    case 'move':
      return null
    case 'capture':
      return `${who(n.seat, me, names)} makan bidak ${who(n.victim, me, names)}! Pulang ke kandang sana.`
    case 'safe':
      return 'Mendarat di petak aman, nggak ada yang dimakan.'
    case 'home':
      return `Satu bidak ${who(n.seat, me, names)} sampai rumah!`
    case 'allHome':
      return s.opts.teams && s.phase !== 'end' ? `Semua bidak ${who(n.seat, me, names)} finis. Sekarang bantu rekan setim.` : null
    case 'special':
      switch (n.fx) {
        case 'boost':
          return `Roket! ${who(n.seat, me, names)} melesat 3 petak.`
        case 'slip':
          return `${who(n.seat, me, names)} kepleset kulit pisang, mundur 3.`
        case 'portal':
          return `${who(n.seat, me, names)} masuk portal, loncat satu lengan!`
        case 'bomb':
          return n.victim === undefined ? 'Bom meledak… tapi nggak kena siapa-siapa.' : `BOOM! Bidak ${who(n.victim, me, names)} dipulangkan ke kandang.`
      }
      return null
    case 'bonus':
      return n.why === 'six' ? 'Dapat 6, lempar lagi!' : n.why === 'capture' ? 'Bonus makan: lempar lagi!' : 'Bonus finis: lempar lagi!'
    case 'win':
      return null
  }
}

export function eventText(s: LudoState, me: Seat, names: string[]): string {
  const e = s.event
  if (!e) return s.turn === me ? 'Kamu duluan. Lempar dadu, cari angka 6!' : `${names[s.turn] ?? '?'} duluan.`
  const parts: string[] = []
  if (e.dice) parts.push(`${who(e.by, me, names)} dapat ${e.dice}.`)
  for (const n of e.log) {
    const t = noteText(n, e.by, me, names, s)
    if (t) parts.push(t)
  }
  if (s.phase === 'move') parts.push(s.turn === me ? 'Pilih bidak yang mau dijalankan.' : `${names[s.turn] ?? '?'} lagi milih bidak…`)
  return parts.join(' ')
}
