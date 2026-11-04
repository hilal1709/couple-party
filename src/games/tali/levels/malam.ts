import { Course } from './course'
import { block, door, ground, hazard, ledge, plank } from './kit'
import type { LevelDef } from './types'

const WHEEL: [number, number] = [22, 5]
const gondola = (phase: number) => plank(WHEEL[0] - 1.5, WHEEL[0] + 1.5, WHEEL[1], 'kain', { orbit: { c: WHEEL, r: 4, period: 14, phase } })

/** Level 8: pasar malam. Bianglala, tombol berat, ayunan lampu, dan menara kembang api. */
export const malam: LevelDef = {
  id: 'malam',
  title: 'Pasar Malam',
  line: 'Finale: bianglala sampai kembang api',
  par: 160,
  spawn: [2, 0],
  killY: -4,
  bounds: [-4, 72],
  solids: [
    ground(-8, 19.9, 0, 'kayu'),
    gondola(0),
    gondola(0.25),
    gondola(0.5),
    gondola(0.75),
    ground(28.2, 40, 6.6, 'kayu'),
    door(36.5, 6.6, 9.6, 0, 'kain'),
    block(36.25, 9.6, 0.5, 6, 'kayu'),
    ground(48, 54.4, 6.6, 'kayu'),
    ledge(52, 54.4, 6.6, 'peti', { lift: { g: 1, d: [0, 5] } }),
    ground(54.4, 76, 11.6, 'kayu'),
  ],
  hooks: [
    [42.2, 9.4],
    [45.2, 9.4],
  ],
  hazards: [hazard(40, 48, 3, 'listrik'), hazard(19.9, 28.2, -1, 'air')],
  buttons: [{ x: 33.2, y: 6.6, w: 1.8, g: 0, need: 2 }],
  levers: [
    { x: 50.6, y: 6.6, g: 1 },
    { x: 55.8, y: 11.6, g: 1 },
  ],
  checkpoints: [
    [30, 6.6],
    [49.5, 6.6],
    [57, 11.6],
  ],
  candy: [
    [12, 1.4],
    [22, 9.8],
    [36.5, 11.2],
    [43.7, 10.6],
    [53.2, 10],
    [62, 12.6],
  ],
  goal: [66, 11.6],
  wind: [],
  tips: [
    [14, 'Naik bianglala bareng, lompat di puncak kanan'],
    [31, 'Tombol berat lagi. Injak berdua, lalu lari'],
    [39, 'Lampu gantung: satu-satu, saling tunggu'],
    [49, 'Tuas bawah dan atas sama-sama menggerakkan lift'],
  ],
  props: [],
}

/** bagian lanjutan (stage diperpanjang): geometri + rute buktinya */
export const malamExtra = new Course(malam, 'kayu', 'listrik').mover(9, 'kain').heavy('kain').checkpoint().hooks(4).crumble(4).checkpoint().door('kain').lift(4).wall(2.3).gap(2.8).finish().route
