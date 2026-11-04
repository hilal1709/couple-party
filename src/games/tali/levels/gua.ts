import { Course } from './course'
import { block, ground, hazard, plank } from './kit'
import type { LevelDef } from './types'

/** Level 5: gua kelelawar. Gelap, langit-langit rendah, batu runtuh, dan tebing berkait. */
export const gua: LevelDef = {
  id: 'gua',
  title: 'Gua Kelelawar',
  line: 'Gelap, licin, dan batunya rapuh',
  par: 95,
  spawn: [2, 0],
  killY: -4,
  bounds: [-4, 80],
  dark: true,
  solids: [
    ground(-8, 13, 0, 'batu'),
    block(9, 2.3, 12, 8, 'batu'),
    ground(15, 24, 0, 'batu'),
    // jembatan batu rapuh: lewati berbarengan, jangan berhenti
    plank(25, 27, 0, 'batu', { crumble: true }),
    plank(28.5, 30.5, 0, 'batu', { crumble: true }),
    plank(32, 34, 0, 'batu', { crumble: true }),
    ground(35.5, 46, 0, 'batu'),
    ground(54, 64, 1.5, 'batu'),
    ground(64, 82, 6.2, 'batu'),
  ],
  hooks: [
    [48, 3.2],
    [51, 3.2],
    [63.1, 4.4],
    [63.4, 6],
  ],
  hazards: [hazard(13, 15, -0.2, 'duri'), hazard(24, 35.5, -0.6, 'air'), hazard(46, 54, -0.3, 'duri')],
  buttons: [],
  levers: [],
  checkpoints: [
    [17, 0],
    [37, 0],
    [56, 1.5],
    [66, 6.2],
  ],
  candy: [
    [6, 1.4],
    [14, 1.5],
    [29.5, 1.6],
    [49.5, 4.4],
    [60, 2.3],
    [72, 7],
  ],
  goal: [77, 6.2],
  wind: [],
  tips: [
    [3, 'Gelap! Onde bawa lentera, jangan jauh-jauh'],
    [22, 'Batunya rapuh. Lari dan lompat barengan, jangan berhenti'],
    [44, 'Kait di atas duri: satu-satu, saling tunggu'],
    [58, 'Tebing tinggi: naik kepala pasangan, kait ke kait, lalu tarik'],
  ],
  props: [],
}

/** bagian lanjutan (stage diperpanjang): geometri + rute buktinya */
export const guaExtra = new Course(gua, 'batu', 'duri').crumble(4).checkpoint().hooks(3).wall(2.2).crumble(3).checkpoint().gap(2.7).finish().route
