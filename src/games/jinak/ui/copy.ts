import type { Seat } from '../../types'
import { LEVELS } from '../engine'
import type { JinakOptions, JinakState, Level } from '../types'

export const LEVEL_INFO: Record<Level, { title: string; line: string }> = {
  santai: { title: 'Santai', line: `${LEVELS.santai.modules} modul · ${LEVELS.santai.seconds / 60} menit` },
  normal: { title: 'Normal', line: `${LEVELS.normal.modules} modul · ${LEVELS.normal.seconds / 60} menit` },
  panik: { title: 'Panik', line: `${LEVELS.panik.modules} modul · ${LEVELS.panik.seconds / 60} menit · salah = jam ngebut` },
}

export const STRIKE_INFO: Record<JinakOptions['strikes'], string> = { 1: 'Sekali salah DUAR', 3: '3 kali salah', 5: '5 kali salah' }

export function summary(o: JinakOptions) {
  return `${LEVEL_INFO[o.level].title} · ${LEVEL_INFO[o.level].line} · nyawa ${o.strikes}`
}

export const who = (s: Seat, me: Seat, names: string[]) => (s === me ? 'Kamu' : (names[s] ?? '?'))

export const MODULE_TITLE = {
  kabel: 'Kabel Warna-warni',
  tombol: 'Tombol Kerupuk',
  simbol: 'Simbol Wayang',
  labirin: 'Labirin Gang',
  sandi: 'Kata Sandi Pasar',
  gembok: 'Gembok Angka',
} as const

export function defusedLine(s: JinakState, me: Seat, names: string[]) {
  const by = who(s.defuser, me, names)
  const sec = Math.ceil(s.finalLeft / 1000)
  return sec > 60 ? `${by} jinakin bomnya, sisa ${sec} detik. Santai banget!` : `Bom jinak! Sisa ${sec} detik doang, jantung aman?`
}

export function boomLine(s: JinakState, me: Seat, names: string[]) {
  const by = who(s.defuser, me, names)
  return s.strikes >= s.opts.strikes ? `DUAR! Kebanyakan salah. ${by === 'Kamu' ? 'Kamu' : by} salah dengar, atau pakarnya salah baca?` : 'DUAR! Waktunya habis. Kebanyakan ngobrol ya?'
}
