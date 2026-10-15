import type { Seat } from '../../types'
import { rankLabel } from '../cards'
import { MODE_INFO } from '../modes'
import { HAND_NAMES } from '../modes/poker-eval'
import type { BjResult, RemiOptions, RemiState } from '../types'

export function summary(o: RemiOptions) {
  const info = MODE_INFO[o.mode]
  if (o.mode === 'poker') return `${info.title} · ${o.hands} tangan · modal ${o.chips} · blind ${o.blind / 2}/${o.blind}`
  if (o.mode === 'blackjack') return `${info.title} · ${o.hands} tangan · modal ${o.chips}`
  if (o.mode === 'cangkulan') return `${info.title} · ${o.rounds} ronde · ${o.cangkulHand} kartu`
  return `${info.title} · ${o.rounds} ronde`
}

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

const STREET = ['Pre-flop', 'Flop', 'Turn', 'River']
export const streetName = (n: number) => STREET[n] ?? ''

export const BJ_TEXT: Record<BjResult, string> = {
  blackjack: 'Blackjack!',
  win: 'Menang',
  push: 'Seri',
  lose: 'Kalah',
  bust: 'Bust',
  out: 'Bangkrut',
}

/** Satu baris kejadian terakhir di meja. */
export function eventText(s: RemiState, seat: Seat, names: string[]): string {
  const e = s.event
  if (!e) return ''
  const w = (x: Seat) => who(x, seat, names)
  switch (e.t) {
    case 'deal':
      return s.round === 1 ? 'Kartu dibagi. Semoga hoki!' : `Ronde ${s.round}, kartu dikocok ulang.`
    case 'play':
      if (s.m.kind === 'bohong') {
        const last = s.m.last
        return last ? `${w(e.by)} buang ${e.n} kartu, ngakunya ${rankLabel(last.claim)}.` : `${w(e.by)} buang ${e.n} kartu.`
      }
      return `${w(e.by)} jalan${e.n > 1 ? ` ${e.n} kartu` : ''}.`
    case 'dig':
      return `${w(e.by)} nyangkul${e.n > 1 ? ` (${e.n}x)` : ''}…`
    case 'pass':
      return `${w(e.by)} pass.`
    case 'trick':
      return `${w(e.winner)} menang trik, jalan duluan.`
    case 'bomb':
      return `${w(e.by)} BANTING! Kombinasi sakti.`
    case 'draw':
      return e.from === 'deck' ? `${w(e.by)} ambil dari dek.` : `${w(e.by)} comot kartu buangan.`
    case 'discard':
      return `${w(e.by)} buang kartu.`
    case 'close41':
      return `${w(e.by)} tutup 41!`
    case 'pick':
      return `${w(e.by)} comot kartu ${w(e.from).toLowerCase() === 'kamu' ? 'kamu' : w(e.from)}${e.paired ? ', dapat pasangan!' : '.'}`
    case 'shuffle':
      return `${w(e.by)} mengacak kartunya.`
    case 'call':
      return e.lied ? `${w(e.by)} teriak Bohong, dan benar! Ketahuan.` : `${w(e.by)} teriak Bohong, tapi ternyata jujur. Ambil tumpukan!`
    case 'bet':
      return `${w(e.by)} pasang ${e.amount}.`
    case 'check':
      return `${w(e.by)} check.`
    case 'fold':
      return `${w(e.by)} fold.`
    case 'allin':
      return `${w(e.by)} ALL-IN!`
    case 'street':
      return `${streetName(e.street)} dibuka.`
    case 'hit':
      return e.bust ? `${w(e.by)} kelewatan. Bust!` : `${w(e.by)} ambil kartu.`
    case 'stand':
      return `${w(e.by)} stand.`
    case 'blackjack':
      return `${w(e.by)} BLACKJACK!`
    case 'dealer':
      return 'Bandar buka kartu.'
    case 'closeCard':
      return `${w(e.by)} nggak bisa jalan, tutup satu kartu.`
    case 'round':
      return 'Tangan selesai.'
  }
}

/** Judul & sindiran di layar akhir ronde. */
export function roundText(s: RemiState, seat: Seat, names: string[]): { headline: string; tease: string } {
  const champ = s.champions
  const won = s.roundWinners.includes(seat)
  const w = s.roundWinners[0]
  if (champ) {
    const me = champ.includes(seat)
    return {
      headline: me ? (champ.length > 1 ? 'Juara bareng!' : 'Juara! Kamu menang game') : `${champ.map((c) => names[c]).join(' & ')} juara`,
      tease: me ? 'Saatnya minta traktiran.' : 'Kalah telak. Siapin traktiran ya.',
    }
  }
  const m = s.m
  switch (m.kind) {
    case 'joker': {
      const loser = s.deltas.findIndex((d) => d < 0)
      return loser === seat
        ? { headline: 'Kamu pegang Joker!', tease: 'Kartu sial nempel terus di tanganmu. Minus 5.' }
        : { headline: `${names[loser]} pegang Joker`, tease: 'Aman! Yang terakhir pegang Joker kena minus.' }
    }
    case 'poker':
    case 'blackjack': {
      const d = s.deltas[seat]
      return {
        headline: d > 0 ? `Kamu untung ${d} chip` : d < 0 ? `Kamu rugi ${-d} chip` : 'Chip-mu aman',
        tease: m.kind === 'poker' ? pokerNote(s, names) : 'Bandar sudah buka kartu. Lanjut tangan berikutnya?',
      }
    }
    case 'remi41':
      return won
        ? { headline: m.closer === seat ? 'Tutup 41!' : 'Nilaimu paling tinggi!', tease: 'Nilai = jenis terbanyak dikurangi kartu lain.' }
        : { headline: m.closer !== null ? `${names[m.closer]} tutup 41` : `${names[w]} paling tinggi`, tease: 'Nilai tanganmu masuk ke skor, minus juga dihitung.' }
    case 'seven':
      return won
        ? { headline: 'Minus paling sedikit!', tease: 'Kartu yang kamu tutup jadi minus. Kamu paling hemat.' }
        : { headline: `${names[w]} paling hemat`, tease: 'Angka kartu yang kamu tutup jadi minus.' }
    default:
      return won
        ? { headline: 'Kamu habis duluan!', tease: 'Lawan kena minus dari sisa kartunya.' }
        : { headline: `${names[w]} habis duluan`, tease: 'Sisa kartu di tanganmu jadi minus.' }
  }
}

function pokerNote(s: RemiState, names: string[]): string {
  if (s.m.kind !== 'poker' || !s.m.result) return ''
  const { pots, names: hands, shown } = s.m.result
  const main = pots[0]
  if (!main) return ''
  const winners = main.winners.map((x) => names[x]).join(' & ')
  return shown ? `${winners} menang pot ${main.amount} dengan ${hands[main.winners[0]] ?? HAND_NAMES[0]}.` : `${winners} ambil pot ${main.amount}, yang lain fold.`
}
