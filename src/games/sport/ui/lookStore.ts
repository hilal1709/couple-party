import { store } from '@/net/transport'
import type { Look } from '../types'

const KEY = 'couple-party:sport-look'

export function savedLook(): Look | null {
  try {
    const v = JSON.parse(store.getItem(KEY) ?? 'null') as Look | null
    return v && typeof v.skin === 'number' ? v : null
  } catch {
    return null
  }
}

export const saveLook = (look: Look) => store.setItem(KEY, JSON.stringify(look))
