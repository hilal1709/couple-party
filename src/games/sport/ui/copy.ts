import type { RollCall, SportOptions } from '../types'

export const FRAME_INFO: Record<SportOptions['frames'], { title: string; line: string }> = {
  3: { title: '3 frame', line: 'Cepat, buat pemanasan' },
  5: { title: '5 frame', line: 'Pas buat satu sesi' },
  10: { title: '10 frame', line: 'Bowling beneran' },
}

export const ROUND_INFO: Record<SportOptions['rounds'], { title: string; line: string }> = {
  1: { title: '1 ronde', line: 'Sekali gebuk' },
  3: { title: '3 ronde', line: 'Dua kali menang' },
  5: { title: '5 ronde', line: 'Tahan napas' },
}

export const SPORT_INFO: Record<SportOptions['sport'], { title: string; line: string }> = {
  bowling: { title: 'Bowling', line: '2–8 pemain, gantian melempar' },
  tinju: { title: 'Tinju', line: 'Satu lawan satu, pukul & hindar' },
  panahan: { title: 'Panahan', line: '2–8 pemain, baca angin, incar tengah' },
  penalti: { title: 'Penalti', line: 'Satu lawan satu, tendang & tebak' },
  tenis: { title: 'Tenis', line: 'Satu lawan satu, reli makin cepat' },
  badminton: { title: 'Badminton', line: 'Satu lawan satu, lob lalu smash' },
}

export const POINT_INFO: Record<SportOptions['points'], { title: string; line: string }> = {
  5: { title: '5 poin', line: 'Cepat' },
  7: { title: '7 poin', line: 'Pas' },
  11: { title: '11 poin', line: 'Panjang' },
}

export const END_INFO: Record<SportOptions['ends'], { title: string; line: string }> = {
  3: { title: '3 babak', line: 'Sembilan anak panah' },
  5: { title: '5 babak', line: 'Lima belas anak panah' },
}

export function summary(o: SportOptions) {
  if (o.sport === 'tinju') return `Tinju · ${o.rounds} ronde`
  if (o.sport === 'panahan') return `Panahan · ${o.ends} babak`
  if (o.sport === 'penalti') return 'Adu penalti · 5 tendangan'
  if (o.sport === 'tenis') return `Tenis · ${o.points} poin`
  if (o.sport === 'badminton') return `Badminton · ${o.points} poin`
  return `Bowling · ${o.frames} frame`
}

export const CALL_WORD: Record<RollCall, string | null> = {
  strike: 'STRIKE!',
  spare: 'SPARE!',
  gutter: 'MASUK PARIT',
  open: null,
}
