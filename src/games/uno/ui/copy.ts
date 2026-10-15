import type { Seat } from '../../types'
import { faceLabel, COLOR_NAME } from '../art/CardArt'
import { faceOf } from '../engine'
import type { UnoState } from '../types'

/** Teks kejadian, nada santai & jahil. */
export function eventText(st: UnoState, seat: Seat, names: string[]): string {
  const e = st.event
  if (!e) return st.round === 1 ? 'Kartu dibagi. Gas!' : `Ronde ${st.round} dimulai`
  const who = (s: Seat) => (s === seat ? 'Kamu' : names[s])
  switch (e.t) {
    case 'play': {
      const card = st.discard.find((c) => c.id === e.card)
      const label = card ? faceLabel(faceOf(card, st.side)) : 'kartu'
      const color = card && faceOf(card, st.side).color === null && st.color ? ` → ${COLOR_NAME[st.color]}` : ''
      return `${who(e.by)} main ${label}${color}`
    }
    case 'draw':
      return e.n === 1 ? `${who(e.by)} ambil 1 kartu` : `${who(e.by)} ambil ${e.n} kartu`
    case 'uno':
      return `${who(e.by)} teriak UNO!`
    case 'caught':
      return e.by === seat ? `Hayo lupa UNO! Kamu +${e.n}` : `${names[e.by]} ketahuan lupa UNO, +${e.n}`
    case 'challengeWin':
      return e.by === seat
        ? `Tuduhanmu benar! Dia masih punya warna aktif, jadi dia yang ambil +${e.n}`
        : `${names[e.by]} benar: si pemberi masih punya warna aktif, dia yang ambil +${e.n}`
    case 'challengeLose':
      return e.by === seat ? `Salah tuduh! Kamu +${e.n}` : `${names[e.by]} salah tuduh, +${e.n}`
    case 'swap':
      return `${who(e.a)} tukar tangan dengan ${e.b === seat ? 'kamu' : names[e.b]}!`
    case 'rotate':
      return 'Semua kartu digeser ke pemain berikutnya!'
    case 'reverse':
      return 'Arah dibalik!'
    case 'flip':
      return e.side === 1 ? 'Dibalik ke sisi GELAP' : 'Balik lagi ke sisi terang'
    case 'mercy':
      return e.by === seat ? 'Kartumu tembus 25. Kamu tersingkir!' : `${names[e.by]} tembus 25 kartu, tersingkir!`
    case 'pass':
      return `${who(e.by)} lewat`
    case 'round':
      return `${who(e.winner)} menang ronde! +${e.points}`
  }
}

export const VARIANT_INFO = {
  classic: {
    title: 'Classic',
    line: 'Aturan resmi internasional. 108 kartu, tantang Wild +4, sampai 500 poin.',
  },
  flip: {
    title: 'Flip',
    line: 'Kartu dua sisi. Kartu Flip membalik semuanya ke sisi gelap yang lebih kejam.',
  },
  noMercy: {
    title: 'No Mercy',
    line: '168 kartu, tumpuk +2 sampai +10, tukar tangan di 0 & 7. Pegang 25 kartu = tamat.',
  },
} as const

export const HOUSE_INFO = {
  stacking: { title: 'Tumpuk kartu +', line: '+2 di atas +2, +4 di atas +2/+4. Yang kalah ambil semuanya.' },
  sevenZero: { title: '7-0', line: 'Main 7 atau 0 = tukar tangan.' },
  jumpIn: { title: 'Jump-In', line: 'Punya kartu yang persis sama? Lempar walau bukan giliranmu.' },
  drawToMatch: { title: 'Ambil sampai dapat', line: 'Ambil terus sampai ada kartu yang bisa dimainkan.' },
  forcePlay: { title: 'Wajib main', line: 'Kartu yang baru diambil dan cocok harus langsung dimainkan.' },
  noChallenge: { title: 'Tanpa tantangan', line: 'Wild +4 tidak bisa ditantang.' },
} as const
