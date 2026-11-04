import { ground, hazard, plank } from './kit'
import type { LevelDef } from './types'

/** Level 7: kawah Bromo. Angin lautan pasir, semburan uap, dan batu rapuh di bibir kawah. */
export const bromo: LevelDef = {
  id: 'bromo',
  title: 'Kawah Bromo',
  line: 'Angin kencang, uap panas',
  par: 150,
  spawn: [2, 0],
  killY: -4,
  bounds: [-4, 84],
  solids: [
    ground(-8, 20, 0, 'tanah'),
    ground(22.5, 36.4, 0, 'tanah'),
    ground(36.4, 50, 8, 'batu'),
    plank(51.5, 53.5, 8, 'batu', { crumble: true }),
    plank(55, 57, 8.4, 'batu', { crumble: true }),
    plank(58.5, 60.5, 8, 'batu', { crumble: true }),
    ground(62, 86, 8, 'batu'),
  ],
  hooks: [],
  hazards: [hazard(20, 22.5, -0.4, 'lava'), hazard(50, 62, 3, 'lava')],
  buttons: [],
  levers: [{ x: 32.6, y: 0, g: 0 }],
  checkpoints: [
    [24, 0],
    [39, 8],
    [64, 8],
  ],
  candy: [
    [10, 1.2],
    [21.25, 2],
    [35.2, 10.5],
    [45, 9],
    [56, 9.8],
    [72, 9],
  ],
  goal: [78, 8],
  wind: [
    // angin lautan pasir melawan dari depan
    { b: [6, -1, 26, 9], fx: -6, fy: 0 },
    // semburan uap: menyala selama tuas aktif
    { b: [33.8, 0, 2.6, 11.5], fx: 0, fy: 36, g: 0 },
    // angin samping di bibir kawah
    { b: [50, 6, 12, 8], fx: 5, fy: 0 },
  ],
  tips: [
    [4, 'Angin kencang dari depan. Lompatnya ambil ancang-ancang'],
    [30, 'Tarik tuas, lalu masuk semburan uap berdua'],
    [48, 'Bibir kawah rapuh dan berangin. Barengan!'],
  ],
  props: [],
}
