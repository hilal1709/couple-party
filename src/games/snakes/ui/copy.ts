import type { Seat } from '../../types'
import { BONUS, SETBACK } from '../engine'
import type { Effect, Item, Note, SnakesOptions, SnakesState } from '../types'

export const ITEM_INFO: Record<Item, { title: string; line: string }> = {
  shield: { title: 'Perisai', line: 'Kebal dari satu ular berikutnya.' },
  double: { title: 'Dadu Ganda', line: 'Lempar dua dadu sekaligus giliran ini.' },
  trap: { title: 'Jebakan', line: `Pasang di kotakmu sekarang. Lawan yang berhenti di sini mundur ${SETBACK.trap}.` },
  pass: { title: 'Bebas Tugas', line: 'Lewati satu tantangan Truth/Dare tanpa hukuman.' },
}

export const FX_INFO: Record<Effect, { title: string; mark: string }> = {
  fwd3: { title: 'Maju 3', mark: '+3' },
  back3: { title: 'Mundur 3', mark: '−3' },
  again: { title: 'Lempar lagi', mark: '↻' },
  skip: { title: 'Skip giliran berikutnya', mark: 'zZ' },
  swap: { title: 'Tukar posisi dengan yang di depan', mark: '⇄' },
  teleport: { title: 'Teleport acak', mark: '✦' },
}

export const OPTION_INFO: Record<keyof Pick<SnakesOptions, 'challenges' | 'effects' | 'items' | 'quiz' | 'exact'>, { title: string; line: string }> = {
  challenges: { title: 'Kotak Truth/Dare', line: 'Jawab jujur atau jalanin tantangan. Lawan yang menilai lolos/gagal.' },
  effects: { title: 'Kotak efek', line: 'Maju/mundur 3, lempar lagi, skip, tukar posisi, teleport.' },
  items: { title: 'Item & power-up', line: 'Perisai, Dadu Ganda, Jebakan, dan Bebas Tugas.' },
  quiz: { title: 'Mini-kuis', line: `Benar maju ${BONUS.quiz}, salah mundur ${SETBACK.quiz}.` },
  exact: { title: 'Harus pas di 100', line: 'Kelebihan langkah memantul mundur. Bikin finis lebih menegangkan.' },
}

const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

function noteText(n: Note, by: Seat, me: Seat, names: string[], s: SnakesState): string | null {
  const w = who(by, me, names)
  switch (n.t) {
    case 'enter':
      return null
    case 'snake':
      return `${w} dimakan ular! ${n.from} → ${n.to}`
    case 'ladder':
      return `${w} naik tangga, sombong dikit. ${n.from} → ${n.to}`
    case 'shieldBlock':
      return `Perisai ${w === 'Kamu' ? 'kamu' : w} menahan ular di ${n.at}!`
    case 'bounce':
      return 'Kelebihan langkah, mantul!'
    case 'trap':
      return `${w} kena jebakan ${who(n.owner, me, names)}. Mundur ${SETBACK.trap}!`
    case 'fx':
      if (n.fx === 'swap') return n.with === undefined ? `${w} sudah paling depan, nggak ada yang ditukar.` : `${w} tukar posisi dengan ${who(n.with, me, names)}!`
      return `${FX_INFO[n.fx].title}!`
    case 'gotItem':
      return `${w} dapat ${ITEM_INFO[n.item].title}.`
    case 'bagFull':
      return 'Tas penuh, item-nya ditinggal.'
    case 'useItem':
      return `${w} pakai ${ITEM_INFO[n.item].title}.`
    case 'challenge':
      return `${w} masuk kotak tantangan. Truth atau Dare?`
    case 'card':
      return n.deck === 'truth' ? `${w} pilih Truth. Jujur ya!` : `${w} pilih Dare. Berani?`
    case 'doIt':
      return `${w} lagi jalanin. Lawan, nilai dong!`
    case 'judged':
      return n.ok
        ? `${who(n.judge, me, names)} bilang lolos! Maju ${BONUS.judge}.`
        : `${who(n.judge, me, names)} bilang gagal. Mundur ${s.opts.penalty}.`
    case 'refuse':
      return `${w} nolak tantangan. Cemen! Mundur ${s.opts.penalty}.`
    case 'quiz':
      return `${w} dapat kuis!`
    case 'answer':
      return n.ok ? `Benar! Maju ${BONUS.quiz}.` : `Salah, hayo! Mundur ${SETBACK.quiz}.`
    case 'skipped':
      return `${who(n.who, me, names)} kena skip, giliran dilewati.`
    case 'win':
      return `${w} sampai di 100!`
  }
}

/** Satu-dua kalimat tentang kejadian terakhir di papan. */
export function eventText(s: SnakesState, me: Seat, names: string[]): string {
  const e = s.event
  if (!e) return 'Lempar dadu buat mulai. Yang duluan sampai 100 menang.'
  const lines = e.log.map((n) => noteText(n, e.by, me, names, s)).filter(Boolean) as string[]
  if (e.dice && lines.length === 0) return `${who(e.by, me, names)} dapat ${e.dice.join(' + ')}.`
  if (e.dice) return `${who(e.by, me, names)} dapat ${e.dice.join(' + ')}. ${lines.join(' ')}`
  return lines.join(' ')
}
