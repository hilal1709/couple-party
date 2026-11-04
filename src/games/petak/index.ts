import { lazy } from 'react'
import type { GameDef } from '../types'
import { init, reduce } from './engine'
import type { PetakAction, PetakOptions, PetakState } from './types'

export const petak: GameDef<PetakState, PetakAction, PetakOptions> = {
  id: 'petak',
  title: 'Petak Cat',
  init,
  reduce,
  // kiri tengah menutupi alat cat dan stik; di sebelah tombol Keluar selalu kosong
  emoteSpot: 'top',
  // three.js dan aset map besar: dimuat saat game dimulai saja
  View: lazy(() => import('./ui/PetakBoard').then((m) => ({ default: m.PetakBoard }))),
}
