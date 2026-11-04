import { block, door, ground, hazard } from './kit'
import type { LevelDef } from './types'

/** Level 1: tutorial di pematang sawah. */
export const sawah: LevelDef = {
  id: 'sawah',
  title: 'Sawah',
  line: 'Belajar kompak di pematang',
  par: 120,
  spawn: [2, 0.5],
  killY: -4,
  bounds: [-4, 72],
  solids: [
    ground(-8, 14, 0),
    ground(16.5, 40, 0),
    block(22, 0, 8, 1.2, 'tanah'),
    block(26, 1.2, 4, 1.2, 'tanah'),
    // tembok pertama: harus naik ke kepala pasangan
    ground(40, 52, 2.3),
    door(47.25, 2.3, 7, 0, 'bambu'),
    ground(56.5, 80, 2.3),
  ],
  hooks: [[54.2, 4.7]],
  hazards: [hazard(14, 16.5, -0.6), hazard(52, 56.5, -0.4)],
  buttons: [
    { x: 45.3, y: 2.3, g: 0 },
    { x: 49.4, y: 2.3, g: 0 },
  ],
  levers: [],
  checkpoints: [
    [18, 0],
    [33, 0],
    [58.5, 2.3],
  ],
  candy: [
    [8, 1.6],
    [15.25, 1.9],
    [28, 3.7],
    [45.3, 3.6],
    [54.2, 6.1],
    [63, 3],
  ],
  goal: [68, 2.3],
  wind: [],
  tips: [
    [1, 'Kalian terikat tali. Jalan bareng, jangan saling tinggal!'],
    [11, 'Lompati parit bareng-bareng'],
    [35, 'Temboknya tinggi? Naik ke kepala pasanganmu'],
    [40.5, 'Yang di atas: tahan Pegang, lalu Gulung tali buat narik'],
    [43, 'Injak tombol, pintunya terbuka. Gantian jaga tombol!'],
    [51, 'Lompat, Pegang kait, lalu Lompat lagi'],
  ],
  props: [],
}
