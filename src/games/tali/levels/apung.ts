import { block, ground, hazard, plank } from './kit'
import type { LevelDef } from './types'

/** Level 2: pasar terapung. Naik perahu, rantai lampion, dan lift gudang. */
export const apung: LevelDef = {
  id: 'apung',
  title: 'Pasar Terapung',
  line: 'Perahu jalan, jangan ketinggalan',
  par: 150,
  spawn: [2, 1],
  killY: -4,
  bounds: [-4, 70],
  solids: [
    ground(-8, 8, 1, 'kayu'),
    // perahu bolak-balik antara dermaga
    plank(9, 13, 1.2, 'perahu', { move: { d: [8, 0], period: 9 } }),
    ground(22.5, 30, 1, 'kayu'),
    ground(37.5, 48, 1, 'kayu'),
    // lift gudang: naik turun tiap tuas ditarik (tuas bawah dan atas sama-sama mengubahnya)
    plank(48, 50.4, 1, 'peti', { lift: { g: 0, d: [0, 4] } }),
    block(50.4, -7, 14, 12, 'kayu'),
    plank(56, 58.5, 5, 'peti'),
    ground(64.4, 80, 3.2, 'kayu'),
  ],
  hooks: [
    [32, 3.6],
    [35, 3.6],
  ],
  hazards: [hazard(8, 22.5, 0.2), hazard(30, 37.5, 0.2), hazard(48, 50.4, 0.2), hazard(60, 64.4, 0.2)],
  buttons: [],
  levers: [
    { x: 46.8, y: 1, g: 0 },
    { x: 51.6, y: 5, g: 0 },
  ],
  checkpoints: [
    [24, 1],
    [39, 1],
    [52, 5],
  ],
  candy: [
    [15, 2.6],
    [33.5, 4.6],
    [44, 1.7],
    [49.2, 6.4],
    [57.2, 6],
    [67, 4],
  ],
  goal: [70, 3.2],
  wind: [],
  tips: [
    [5, 'Tunggu perahu merapat, lalu lompat naik berdua'],
    [29, 'Lompat dari lampion ke lampion sambil tahan Pegang'],
    [44, 'Satu tarik tuas, satu naik lift'],
    [51, 'Tuas atas juga menggerakkan lift. Jemput pasanganmu!'],
  ],
  props: [],
}
