import type { BotLevel } from '../../types'
import type { Body, Input } from './climb'
import type { Terrain } from './terrain'

export type Bot = {
  wp: number
  best: number
  stuckT: number
  /** jeda setelah menolong / menunggu teman */
  wait: number
}

export type BotIntent = { input: Input; revive: number | null; pull: number | null; teleport: { x: number; y: number; z: number } | null }

export const newBot = (): Bot => ({ wp: 0, best: Infinity, stuckT: 0, wait: 0 })

/** titik rute terdekat dari posisi (dengan perbedaan tinggi dihitung lebih berat) */
export function routeIndexNear(t: Terrain, x: number, y: number, z: number, from = 0, span = t.route.length) {
  let best = from
  let bd = Infinity
  const end = Math.min(t.route.length, from + span)
  for (let i = Math.max(0, from - span); i < end; i++) {
    const p = t.route[i]
    const d = Math.hypot(p.x - x, p.z - z) + Math.abs(p.y - y) * 2.5
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return best
}

const SPEED: Record<BotLevel, number> = { 1: 0.72, 2: 0.88, 3: 1 }

/**
 * Otak pendaki bot: ikuti rute keliling cincin lalu panjat di sambungan tebing.
 * Tidak berlari terlalu jauh di depan pemain; menolong yang pingsan atau tergantung di dekatnya.
 */
export function thinkBot(t: Terrain, bot: Bot, b: Body, level: BotLevel, dt: number, mates: { actor: number; body: Body; down: boolean; human: boolean; progress: number }[]): BotIntent {
  const idle: Input = { mx: 0, mz: 0, up: 0, side: 0, jump: false, grip: false, sprint: false }
  const out: BotIntent = { input: idle, revive: null, pull: null, teleport: null }
  if (b.mode === 'down') return out
  bot.wait = Math.max(0, bot.wait - dt)

  // tolong teman yang pingsan
  const hurt = mates.find((m) => m.down && Math.hypot(m.body.x - b.x, m.body.z - b.z) < 40 && Math.abs(m.body.y - b.y) < 12)
  if (hurt) {
    const d = Math.hypot(hurt.body.x - b.x, hurt.body.z - b.z)
    if (d < 1.9) {
      out.revive = hurt.actor
      return out
    }
    out.input = { ...idle, mx: (hurt.body.x - b.x) / d, mz: (hurt.body.z - b.z) / d, sprint: true, grip: true, up: 1 }
    return out
  }
  // tarik teman yang memanjat di bawah
  const climber = mates.find((m) => m.human && (m.body.mode === 'climb' || m.body.mode === 'rope') && b.mode === 'ground' && m.body.y < b.y - 1 && m.body.y > b.y - 4 && Math.hypot(m.body.x - b.x, m.body.z - b.z) < 2.6)
  if (climber && bot.wait <= 0) {
    out.pull = climber.actor
    bot.wait = 4
    return out
  }

  // jangan terlalu jauh di depan pemain manusia
  const humans = mates.filter((m) => m.human)
  const lead = humans.length ? Math.max(...humans.map((m) => m.progress)) : t.route.length
  if (bot.wp > lead + 5 && b.mode === 'ground') return out
  // tertinggal jauh: susul
  if (humans.length && bot.wp < lead - 40 && b.mode === 'ground') {
    const p = t.route[Math.max(0, lead - 4)]
    out.teleport = { x: p.x, y: p.y + 0.5, z: p.z }
    bot.wp = Math.max(0, lead - 4)
    bot.best = Infinity
    return out
  }

  const wp = t.route[Math.min(bot.wp, t.route.length - 1)]
  const dx = wp.x - b.x
  const dz = wp.z - b.z
  const dh = Math.hypot(dx, dz)
  const dy = wp.y - b.y
  if (dh < 1.6 && Math.abs(dy) < 2.6) {
    if (bot.wp < t.route.length - 1) bot.wp++
    bot.best = Infinity
    bot.stuckT = 0
    return out
  }
  // macet: tidak makin dekat selama 6 detik → lompat ke titik rute (bot boleh curang sedikit)
  const dist = dh + Math.abs(dy)
  if (dist < bot.best - 0.4) {
    bot.best = dist
    bot.stuckT = 0
  } else bot.stuckT += dt
  if (bot.stuckT > 6) {
    out.teleport = { x: wp.x, y: wp.y + 0.4, z: wp.z }
    bot.stuckT = 0
    bot.best = Infinity
    return out
  }
  const s = SPEED[level]
  const climbing = b.mode === 'climb' || b.mode === 'rope'
  out.input = {
    mx: (dx / (dh || 1)) * s,
    mz: (dz / (dh || 1)) * s,
    up: climbing ? (dy > 0 ? 1 : -1) * s : 0,
    side: 0,
    jump: false,
    grip: wp.climb || climbing || dy > 1.2,
    sprint: dh > 12 && level >= 2,
  }
  return out
}
