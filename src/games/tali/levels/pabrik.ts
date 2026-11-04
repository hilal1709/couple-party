import { block, door, ground, hazard, plank } from './kit'
import type { LevelDef } from './types'

/** Level 4: pabrik kerupuk. Ban berjalan, pintu rolling berat, lantai setrum, rak jemur kerupuk. */
export const pabrik: LevelDef = {
  id: 'pabrik',
  title: 'Pabrik Kerupuk',
  line: 'Ban berjalan dan pintu yang pelit',
  par: 160,
  spawn: [2, 0],
  killY: -4,
  bounds: [-4, 92],
  solids: [
    ground(-8, 6, 0, 'logam'),
    block(6, -8, 10, 8, 'logam', { belt: -2.4 }),
    ground(16, 18, 0, 'logam'),
    block(18, -8, 8, 8, 'logam', { belt: 3 }),
    ground(26, 42, 0, 'logam'),
    block(27, 0, 2, 1.4, 'peti'),
    // pintu rolling: tombol harus diinjak berdua, lalu lari sebelum turun lagi
    door(36, 0, 3, 0, 'logam'),
    block(35.75, 3, 0.5, 8, 'logam'),
    // kereta dorong di atas lantai setrum
    plank(42.4, 45, 1, 'logam', { move: { d: [8.2, 0], period: 8 } }),
    ground(54, 61.5, 0, 'logam'),
    ground(61.5, 75, 3, 'peti'),
    block(66, 3, 6, 0.01, 'logam', { belt: -3.2 }),
    ground(77, 92, 0.6, 'logam'),
  ],
  hooks: [[60.7, 3.9]],
  hazards: [hazard(42, 54, -0.15, 'listrik'), hazard(75, 77, -1, 'listrik')],
  buttons: [{ x: 32.6, y: 0, w: 1.8, g: 0, need: 2 }],
  levers: [],
  checkpoints: [
    [19, 0],
    [39, 0],
    [56, 0],
    [63, 3],
  ],
  candy: [
    [11, 1.6],
    [28, 2.4],
    [36, 4.2],
    [48, 2.4],
    [60.7, 5.2],
    [70, 4],
  ],
  goal: [86, 0.6],
  wind: [],
  tips: [
    [3, 'Ban berjalan: yang ini melawan, yang depan mendorong'],
    [30, 'Tombol berat: harus diinjak berdua, lalu lari!'],
    [41, 'Lantai setrum. Naik kereta dorong bareng'],
    [57, 'Naik ke kepala pasangan, Pegang kait, lalu Lompat'],
  ],
  props: [],
}
