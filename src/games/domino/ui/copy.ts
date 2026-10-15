import type { Seat } from '../../types'
import { MODE_INFO } from '../modes'
import { QIU_NAMES, qiuName } from '../modes/qiuqiu'
import type { DominoOptions, DominoState } from '../types'

export function summary(o: DominoOptions) {
  const info = MODE_INFO[o.mode]
  if (o.mode === 'qiuqiu') return `${info.title} · ${o.hands} tangan · modal ${o.chips} · ante ${o.ante}`
  return `${info.title} · ${o.rounds} ronde`
}

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

/** Satu baris kejadian terakhir di meja. */
export function eventText(s: DominoState, seat: Seat, names: string[]): string {
  const e = s.event
  if (!e) return ''
  const w = (x: Seat) => who(x, seat, names)
  switch (e.t) {
    case 'deal':
      return s.round === 1 ? 'Kartu dikocok & dibagi. Gas!' : `Ronde ${s.round}, kartu dikocok ulang.`
    case 'play':
      return e.double ? `${w(e.by)} pasang balak!` : `${w(e.by)} pasang kartu.`
    case 'draw':
      return `${w(e.by)} nyangkul${e.n > 1 ? ` (${e.n}x)` : ''}…`
    case 'pass':
      return `${w(e.by)} pass, nggak ada yang nyambung.`
    case 'score':
      return `${w(e.by)} bikin kelipatan 5: +${e.pts} poin!`
    case 'blocked':
      return 'Meja buntu! Hitung mata kartu, paling sedikit menang.'
    case 'domino':
      return `${w(e.by)} habis kartu. DOMINO!`
    case 'bet':
      return `${w(e.by)} pasang ${e.amount}.`
    case 'check':
      return `${w(e.by)} check.`
    case 'fold':
      return `${w(e.by)} fold.`
    case 'allin':
      return `${w(e.by)} ALL-IN!`
    case 'street':
      return 'Kartu keempat dibagi. Atur pasanganmu!'
    case 'round':
      return e.special ? `Kartu sakti: ${QIU_NAMES[e.special]}!` : 'Kartu dibuka.'
  }
}

/** Judul & sindiran di layar akhir ronde. */
export function roundText(s: DominoState, seat: Seat, names: string[]): { headline: string; tease: string } {
  const champ = s.champions
  const won = s.roundWinners.includes(seat)
  const w = s.roundWinners[0]
  if (champ) {
    const me = champ.includes(seat)
    return {
      headline: me ? (champ.length > 1 ? 'Juara bareng!' : 'Juara! Raja warung') : `${champ.map((c) => names[c]).join(' & ')} juara`,
      tease: me ? 'Yang kalah traktir kopi, ya.' : 'Kalah telak. Siapin kopi buat yang menang.',
    }
  }
  const m = s.m
  if (m.kind === 'qiuqiu') {
    const d = s.deltas[seat]
    // pemenang terbesar tangan ini (side pot bisa membuat pot utama kecil)
    const top = s.deltas.indexOf(Math.max(...s.deltas))
    const hand = m.result?.hands[top]
    const note = m.result?.shown && hand ? `${names[top]} untung ${s.deltas[top]} chip dengan ${qiuName(hand)}.` : `${names[top]} ambil pot, yang lain fold.`
    return { headline: d > 0 ? `Kamu untung ${d} chip` : d < 0 ? `Kamu rugi ${-d} chip` : 'Chip-mu aman', tease: note }
  }
  if (m.blocked)
    return won
      ? { headline: 'Buntu, tapi kamu menang!', tease: 'Mata kartumu paling sedikit. Poin dari sisa kartu lawan.' }
      : { headline: `Buntu! ${names[w]} paling sedikit`, tease: 'Sisa mata kartumu kebanyakan.' }
  return won
    ? { headline: 'Domino! Kamu habis duluan', tease: m.mode === 'lima' ? 'Bonus dari sisa mata lawan, dibulatkan ke 5.' : 'Poinmu = total mata kartu lawan.' }
    : { headline: `${names[w]} habis duluan`, tease: 'Sisa mata kartumu jadi poin buat dia.' }
}
