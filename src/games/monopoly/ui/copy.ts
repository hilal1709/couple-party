import type { Seat } from '../../types'
import { squareName } from '../board'
import { CARDS, DECK_TITLE } from '../cards'
import type { MonopolyOptions, MonopolyState, Note, Payee } from '../types'

export const money = (n: number) => `$${Math.round(n).toLocaleString('id-ID')}`

export function summary(o: MonopolyOptions) {
  const end = o.end === 'rounds' ? `${o.rounds} putaran` : 'sampai bangkrut'
  return `${end} · modal ${money(o.startCash)}`
}

export const OPTION_INFO: Record<keyof Pick<MonopolyOptions, 'auction' | 'trade' | 'mortgage' | 'freeParking' | 'doubleGo'>, { title: string; line: string }> = {
  auction: { title: 'Lelang', line: 'Petak yang tidak dibeli dilelang. Bisa dapat murah, bisa perang harga.' },
  trade: { title: 'Tukar-menukar', line: 'Tawar properti & uang ke pemain lain. Rayu-merayu dipersilakan.' },
  mortgage: { title: 'Gadai', line: 'Gadai properti ke bank buat dana darurat, tebus lagi +10%.' },
  freeParking: { title: 'Jackpot Parkir Bebas', line: 'Pajak & denda ditampung. Yang berhenti di Parkir Bebas ambil semua.' },
  doubleGo: { title: 'Pas di START = 2x gaji', line: 'Berhenti tepat di START dapat $400, bukan $200.' },
}

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

const payee = (to: Payee, me: Seat, names: string[]) => (to === 'bank' ? 'bank' : to === 'pot' ? 'pot Parkir Bebas' : who(to, me, names))

function noteText(n: Note, by: Seat, me: Seat, names: string[]): string | null {
  const w = who(by, me, names)
  switch (n.t) {
    case 'go':
      return `${w} lewat START, gajian ${money(n.amount)}.`
    case 'doubles':
      return 'Dobel! Lempar lagi.'
    case 'speeding':
      return `${w} dobel 3x, kena tilang ngebut. Masuk penjara!`
    case 'buy':
      return `${w} beli ${squareName(n.sq)} seharga ${money(n.price)}.`
    case 'rent':
      return `${w} bayar sewa ${money(n.amount)} ke ${who(n.to, me, names)} di ${squareName(n.sq)}.`
    case 'tax':
      return `${w} bayar ${squareName(n.sq)} ${money(n.amount)}.`
    case 'card':
      return `${DECK_TITLE[n.deck]}: ${CARDS[n.deck][n.i].text}`
    case 'money':
      return null
    case 'jail':
      return `${w} masuk penjara. Duduk manis dulu.`
    case 'jailOut':
      return n.how === 'double'
        ? `${w} lempar dobel, kabur dari penjara!`
        : n.how === 'card'
          ? `${w} pakai Kartu Bebas Penjara.`
          : n.how === 'pay'
            ? `${w} bayar denda $50, bebas!`
            : `${w} gagal 3x, wajib bayar $50 lalu jalan.`
    case 'jailStay':
      return `${w} gagal dobel (${n.tries}/3), masih di penjara.`
    case 'jailCard':
      return `${w} simpan Kartu Bebas Penjara.`
    case 'pot':
      return `JACKPOT! ${w} ambil ${money(n.amount)} di Parkir Bebas.`
    case 'auction':
      return `${squareName(n.sq)} dilelang! Siapa berani?`
    case 'bid':
      return `${w} menawar ${money(n.amount)}.`
    case 'passBid':
      return `${w} mundur dari lelang.`
    case 'sold':
      return `Terjual! ${squareName(n.sq)} jatuh ke ${who(n.to, me, names)} seharga ${money(n.amount)}.`
    case 'unsold':
      return `Nggak ada yang nawar. ${squareName(n.sq)} balik ke bank.`
    case 'build':
      return `${w} bangun di ${squareName(n.sq)}.`
    case 'sell':
      return `${w} jual bangunan di ${squareName(n.sq)}.`
    case 'mortgage':
      return `${w} gadai ${squareName(n.sq)}.`
    case 'unmortgage':
      return `${w} tebus ${squareName(n.sq)}.`
    case 'tradeOffer':
      return `${w} ngajak tukar sama ${who(n.to, me, names)}.`
    case 'tradeDone':
      return `Deal! ${who(n.with, me, names)} dan ${w} tukaran.`
    case 'tradeNo':
      return `${w} nolak tawaran ${who(n.with, me, names)}.`
    case 'tradeCancel':
      return `${w} batalin tawaran.`
    case 'debt':
      return `${w} kurang uang! Utang ${money(n.amount)} ke ${payee(n.to, me, names)}.`
    case 'paid':
      return `${who(n.who, me, names)} melunasi ${money(n.amount)} ke ${payee(n.to, me, names)}.`
    case 'bankrupt':
      return `${who(n.who, me, names)} BANGKRUT! Asetnya pindah ke ${payee(n.to, me, names)}.`
    case 'turn':
      return null
    case 'win':
      return `${who(n.who, me, names)} menguasai kota! Juara Monopoli.`
    case 'timeUp':
      return `Waktu habis! ${who(n.who, me, names)} paling tajir.`
  }
}

/** Kejadian terakhir dalam satu-dua kalimat. */
export function eventText(s: MonopolyState, seat: Seat, names: string[]): string {
  const e = s.event
  if (!e) return `Semua mulai dari START dengan ${money(s.opts.startCash)}. ${who(s.turn, seat, names)} duluan.`
  const lines = e.log.map((n) => noteText(n, e.by, seat, names)).filter((x): x is string => !!x)
  if (e.dice && !lines.length) return `${who(e.by, seat, names)} lempar ${e.dice[0]}+${e.dice[1]}, mendarat di ${squareName(e.path.at(-1) ?? 0)}.`
  if (!lines.length) return `Giliran ${who(s.turn, seat, names)}.`
  return lines.slice(-2).join(' ')
}

/** Kartu Kesempatan/Dana Umum yang baru ditarik (untuk ditampilkan di tengah papan). */
export function lastCard(s: MonopolyState) {
  const n = s.event?.log.find((x) => x.t === 'card')
  return n && n.t === 'card' ? { deck: n.deck, text: CARDS[n.deck][n.i].text } : null
}
