import { Course } from './course'
import { block, door, ground, hazard, plank } from './kit'
import type { LevelDef } from './types'

/** Level 6: candi. Tuas jembatan, stupa, lorong dua pintu, dan lift batu. */
export const candi: LevelDef = {
  id: 'candi',
  title: 'Candi',
  line: 'Tuas kuno dan pintu batu',
  par: 130,
  spawn: [1, 0],
  killY: -4,
  bounds: [-5, 92],
  solids: [
    ground(-8, 12, 0, 'batu'),
    // jembatan batu yang keluar dari dinding saat tuas ditarik
    plank(4, 12, 0, 'batu', { lift: { g: 0, d: [8, 0], speed: 3 } }),
    ground(20, 40, 0, 'batu'),
    block(26, 0, 14, 2.2, 'batu'),
    // lorong dua pintu
    ground(40, 52, 2.2, 'batu'),
    door(44, 2.2, 6, 1, 'batu'),
    block(43.75, 6, 0.5, 6, 'batu'),
    door(48.5, 2.2, 6, 2, 'batu'),
    block(48.25, 6, 0.5, 6, 'batu'),
    block(40, 7.2, 12, 1, 'batu'),
    // lift batu naik turun terus
    plank(52.6, 55, 2.2, 'batu', { move: { d: [0, 4.4], period: 7 } }),
    ground(52, 55, -1, 'batu'),
    ground(55, 70, 6.6, 'batu'),
    ground(78, 94, 6.6, 'batu'),
  ],
  hooks: [
    [72.5, 9],
    [75.5, 9],
  ],
  hazards: [hazard(12, 20, -0.4, 'duri'), hazard(52, 55, -1.2, 'duri'), hazard(70, 78, 3, 'duri')],
  buttons: [
    { x: 42, y: 2.2, g: 1 },
    { x: 47, y: 2.2, g: 2 },
  ],
  levers: [
    { x: 2.5, y: 0, g: 0 },
    { x: 45.6, y: 2.2, g: 1 },
  ],
  checkpoints: [
    [22, 0],
    [41, 2.2],
    [57, 6.6],
    [80, 6.6],
  ],
  candy: [
    [16, 1.4],
    [33, 3.4],
    [46.2, 4.6],
    [53.8, 8],
    [74, 10.2],
    [86, 7.6],
  ],
  goal: [88, 6.6],
  wind: [],
  tips: [
    [0, 'Tarik tuas: tekan Pegang di dekatnya'],
    [24, 'Stupa tinggi: kepala pasangan lagi!'],
    [40.5, 'Satu jaga tombol, satu masuk dan tarik tuas di dalam'],
    [51, 'Lift batu naik turun. Naik bareng'],
  ],
  props: [],
}

/** bagian lanjutan (stage diperpanjang): geometri + rute buktinya */
export const candiExtra = new Course(candi, 'batu', 'duri').door('batu').wall(2.3).checkpoint().hooks(3).crumble(3).lift(4).checkpoint().gap(2.8).finish().route
