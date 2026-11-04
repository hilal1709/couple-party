import type { LevelId } from '../types'
import { apung } from './apung'
import { atap } from './atap'
import { bromo } from './bromo'
import { candi } from './candi'
import { gua } from './gua'
import { malam } from './malam'
import { pabrik } from './pabrik'
import { sawah } from './sawah'
import type { LevelDef } from './types'

export const LEVELS: LevelDef[] = [sawah, apung, atap, pabrik, gua, candi, bromo, malam]

export const levelIndex = (id: LevelId) => LEVELS.findIndex((l) => l.id === id)
