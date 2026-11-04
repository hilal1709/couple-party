import type { Hazard, HazardKind, Skin, SolidDef } from './types'

/** tanah padat dari x0 ke x1 dengan permukaan di `top`, sedalam `depth` */
export const ground = (x0: number, x1: number, top: number, k: Skin = 'tanah', depth = 8): SolidDef => ({ b: [x0, top - depth, x1 - x0, depth], k })

/** papan tipis yang permukaannya di y */
export const plank = (x0: number, x1: number, y: number, k: Skin = 'kayu', extra: Partial<SolidDef> = {}): SolidDef => ({ b: [x0, y - 0.4, x1 - x0, 0.4], k, ...extra })

/** papan yang bisa ditembus dari bawah */
export const ledge = (x0: number, x1: number, y: number, k: Skin = 'kayu', extra: Partial<SolidDef> = {}): SolidDef => ({ b: [x0, y - 0.3, x1 - x0, 0.3], k, oneway: true, ...extra })

/** balok dari (x, y) kiri bawah */
export const block = (x: number, y: number, w: number, h: number, k: Skin = 'batu', extra: Partial<SolidDef> = {}): SolidDef => ({ b: [x, y, w, h], k, ...extra })

/** pintu setebal 0,5 m di x, dari y0 ke y1, dibuka grup g */
export const door = (x: number, y0: number, y1: number, g: number, k: Skin = 'kayu'): SolidDef => ({ b: [x - 0.25, y0, 0.5, y1 - y0], k, door: g })

export const hazard = (x0: number, x1: number, top: number, k: HazardKind = 'air', depth = 6): Hazard => ({ b: [x0, top - depth, x1 - x0, depth], k })
