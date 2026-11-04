import { Course } from './course'
import { block, ground, ledge } from './kit'
import type { LevelDef } from './types'

/** Level 3: atap kota. Lompat antar genteng, bergelantung di tali jemuran, lift menara air. */
export const atap: LevelDef = {
  id: 'atap',
  title: 'Atap Kota',
  line: 'Jemuran tetangga jadi jembatan',
  par: 130,
  spawn: [2, 4],
  killY: -3,
  bounds: [-4, 76],
  solids: [
    ground(-8, 10, 4, 'genteng'),
    ground(12.8, 22, 4.6, 'genteng'),
    ground(33, 44, 5.5, 'genteng'),
    // menara air: lift naik selama tombol diinjak
    ledge(44, 46.4, 5.5, 'logam', { lift: { g: 0, d: [0, 4] } }),
    ground(44, 46.4, 1.5, 'logam'),
    ground(46.4, 54, 9.5, 'logam'),
    ledge(49, 51.5, 11.6, 'kain'),
    ground(56, 64, 7, 'genteng'),
    block(58, 7, 2.2, 1.2, 'peti'),
    ground(66.6, 84, 7.4, 'genteng'),
  ],
  hooks: [
    [24.5, 7.2],
    [27.5, 7.2],
    [30.5, 7.2],
  ],
  hazards: [],
  buttons: [{ x: 42.4, y: 5.5, g: 0 }],
  levers: [],
  checkpoints: [
    [14, 4.6],
    [34.5, 5.5],
    [57, 7],
  ],
  candy: [
    [11.4, 6],
    [27.5, 8.6],
    [39, 6.3],
    [50.2, 12.4],
    [59.1, 9.2],
    [70, 8.2],
  ],
  goal: [74, 7.4],
  wind: [],
  tips: [
    [8, 'Ambil ancang-ancang, lompat bareng ke atap sebelah'],
    [21, 'Tali jemuran: lompat dan Pegang, satu per satu'],
    [40, 'Injak tombol supaya lift menara air naik'],
    [47, 'Yang di atas: Pegang lalu Gulung'],
  ],
  props: [],
}

/** bagian lanjutan (stage diperpanjang): geometri + rute buktinya */
export const atapExtra = new Course(atap, 'genteng', 'air').gap(2.6).up(1.2).hooks(3).checkpoint().wall(2.2).gap(2.6).down(1.5).lift(4).checkpoint().gap(2.7).finish().route
