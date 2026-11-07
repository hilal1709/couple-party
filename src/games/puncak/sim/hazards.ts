import type { Weather } from '../types'
import type { Body } from './climb'
import { heightAt, type Spot, type Terrain } from './terrain'

/** Semua bahaya dihitung dari jam ronde yang sama di semua HP, jadi tidak perlu dikirim lewat jaringan. */

const WEATHER_K: Record<Weather, number> = { cerah: 0.5, angin: 1, ekstrem: 1.6 }

/** angin (m/s) di ketinggian y */
export function windAt(t: Terrain, weather: Weather, secs: number, y: number): [number, number] {
  const windy = t.m.hazards.includes('angin')
  const base = (windy ? 4 : 1.5) * WEATHER_K[weather] * (0.6 + Math.min(1, Math.max(0, y) / 140) * 0.8)
  const gust = Math.max(0, Math.sin(secs * 0.21) * 0.6 + Math.sin(secs * 0.53 + 1.3) * 0.5) * (windy ? 7 : 2.5) * WEATHER_K[weather]
  const dir = secs * 0.013 + Math.sin(secs * 0.05) * 0.8
  const s = base + gust
  return [Math.cos(dir) * s, Math.sin(dir) * s]
}

/** kekuatan badai salju 0..1 */
export function stormAt(t: Terrain, weather: Weather, secs: number) {
  if (!t.m.hazards.includes('badai') && weather !== 'ekstrem') return 0
  const cyc = (secs % 75) / 75
  const on = cyc > 0.55 ? Math.sin(((cyc - 0.55) / 0.45) * Math.PI) : 0
  return Math.min(1, on * (t.m.hazards.includes('badai') ? 1 : 0.5) * WEATHER_K[weather])
}

/** posisi batu menggelinding ke-i; null = sedang tidak ada */
export function rockAt(t: Terrain, i: number, secs: number) {
  const s = t.rocks[i]
  const period = 12 + (i % 5) * 2.3
  const ph = (secs + s.a * 7) % period
  const speed = 7
  const dur = s.b / speed
  // 1,5 detik sebelum jatuh: kerikil berjatuhan sebagai tanda
  if (ph > dur + 0.2) return ph > period - 1.5 ? { warn: true, x: s.x, y: s.y, z: s.z, dx: Math.cos(s.a), dz: Math.sin(s.a) } : null
  const d = ph * speed
  const x = s.x + Math.cos(s.a) * d
  const z = s.z + Math.sin(s.a) * d
  return { warn: false, x, y: heightAt(t, x, z) + 0.85, z, dx: Math.cos(s.a), dz: Math.sin(s.a) }
}

export const ventOn = (v: Spot, secs: number) => (secs + v.a) % v.b < 2.4

export function crabAt(c: Spot, secs: number) {
  const a = secs * c.b + c.a
  return { x: c.x + Math.cos(a) * c.r, z: c.z + Math.sin(a * 1.3) * c.r * 0.6, yaw: a }
}

export function batAt(t: Terrain, s: Spot, secs: number, n: number) {
  const a = secs * 0.9 + s.a + n * 2.1
  const swoop = Math.max(0, Math.sin(secs * 0.35 + n + s.a)) ** 6
  const x = s.x + Math.cos(a) * s.r
  const z = s.z + Math.sin(a) * s.r
  return { x, y: heightAt(t, x, z) + 9 - swoop * 7.5, z, yaw: a + Math.PI / 2 }
}

export type HazardHit = { k: 'batu' | 'uap' | 'kepiting' | 'lebah' | 'kelelawar' }

/** bahaya yang mengenai badan pada detik ini; mengubah badan (dorongan, racun) */
export function hitHazards(t: Terrain, b: Body, secs: number, dt: number): HazardHit[] {
  if (b.mode === 'down') return []
  const out: HazardHit[] = []
  for (let i = 0; i < t.rocks.length; i++) {
    const r = rockAt(t, i, secs)
    if (!r || r.warn || b.stun > 0) continue
    if (Math.hypot(r.x - b.x, r.z - b.z) < 1.3 && Math.abs(r.y - (b.y + 0.7)) < 1.6) {
      knock(b, r.dx * 7, 5, r.dz * 7)
      out.push({ k: 'batu' })
    }
  }
  for (const v of t.vents) {
    if (!ventOn(v, secs) || Math.hypot(v.x - b.x, v.z - b.z) > v.r || b.y > v.y + 7) continue
    // semburan uap melontarkan ke atas (bisa dipakai naik!) tapi panas
    if (b.vy < 9) {
      b.mode = 'air'
      b.vy = 11
      b.peak = b.y + 6
      b.fat.heat = Math.min(0.5, b.fat.heat + 0.06)
      out.push({ k: 'uap' })
    }
  }
  for (const c of t.crabs) {
    const p = crabAt(c, secs)
    if (b.stun <= 0 && Math.hypot(p.x - b.x, p.z - b.z) < 0.8 && b.mode === 'ground') {
      knock(b, (b.x - p.x) * 4, 3, (b.z - p.z) * 4)
      out.push({ k: 'kepiting' })
    }
  }
  for (const h of t.hives) {
    if (b.buffs.obor > 0) continue
    if (Math.hypot(h.x - b.x, h.z - b.z) < h.r && b.y < h.y + 6) {
      b.fat.poison = Math.min(0.45, b.fat.poison + 0.035 * dt)
      if (Math.random() < dt * 0.8) out.push({ k: 'lebah' })
    }
  }
  if (b.buffs.obor <= 0) {
    for (const s of t.bats) {
      for (let n = 0; n < 3; n++) {
        const p = batAt(t, s, secs, n)
        if (b.stun <= 0 && Math.hypot(p.x - b.x, p.z - b.z) < 1 && Math.abs(p.y - (b.y + 0.9)) < 1.2) {
          knock(b, Math.cos(p.yaw) * 3, 2, Math.sin(p.yaw) * 3)
          out.push({ k: 'kelelawar' })
        }
      }
    }
  }
  return out
}

function knock(b: Body, vx: number, vy: number, vz: number) {
  b.mode = 'air'
  b.vx = vx
  b.vy = vy
  b.vz = vz
  b.stun = 0.6
  b.rope = null
  b.peak = b.y
}

// ---------- cuaca yang berganti ----------

/** jenis langit; 'cerah' = tanpa kejadian */
export type Sky = 'cerah' | 'berawan' | 'hujan' | 'badai' | 'pasir' | 'abu' | 'salju' | 'kabut'
export type WeatherNow = {
  sky: Sky
  /** kekuatan 0..1 (naik di awal, turun di akhir giliran) */
  k: number
  /** tebing basah 0..1: pegangan lebih boros */
  wet: number
  /** pengali dingin & angin tambahan */
  cold: number
  gust: number
}

/** cuaca yang mungkin di tiap gunung (urutan diundi per giliran) */
export const SKY_POOL: Record<Terrain['id'], Sky[]> = {
  hijau: ['berawan', 'kabut', 'hujan', 'berawan'],
  karang: ['berawan', 'hujan', 'hujan', 'badai'],
  rimba: ['hujan', 'kabut', 'hujan', 'badai'],
  ngarai: ['pasir', 'berawan', 'pasir'],
  kawah: ['abu', 'berawan', 'abu'],
  salju: ['salju', 'kabut', 'salju'],
  teh: ['kabut', 'hujan', 'kabut'],
  kristal: ['kabut', 'berawan'],
  langit: ['berawan', 'hujan', 'badai'],
}
/** lama satu giliran cuaca (detik) */
export const SKY_SEG = 64
const CHANCE: Record<Weather, number> = { cerah: 0.35, angin: 0.55, ekstrem: 0.85 }

const skyHash = (i: number, s: number) => {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(s + 7, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** langit di giliran ke-i (giliran 0 selalu cerah supaya awal pendakian enak) */
export function skyOf(t: Terrain, weather: Weather, i: number): Sky {
  if (i <= 0) return 'cerah'
  const salt = t.id.length * 131 + t.id.charCodeAt(0)
  if (skyHash(i, salt) >= CHANCE[weather]) return 'cerah'
  const pool = SKY_POOL[t.id]
  let s = pool[Math.floor(skyHash(i, salt + 9) * pool.length) % pool.length]
  // badai hanya kalau cuaca lobby bukan cerah
  if (s === 'badai' && weather === 'cerah') s = 'hujan'
  if (s === 'hujan' && weather === 'ekstrem' && skyHash(i, salt + 3) < 0.4) s = 'badai'
  return s
}

/** Cuaca saat ini dari jam ronde; sama di semua HP, tanpa jaringan. */
export function weatherAt(t: Terrain, weather: Weather, secs: number): WeatherNow {
  const i = Math.floor(secs / SKY_SEG)
  const f = (secs % SKY_SEG) / SKY_SEG
  const sky = skyOf(t, weather, i)
  const ramp = (a: number, b: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return u * u * (3 - 2 * u)
  }
  const k = sky === 'cerah' ? 0 : ramp(0, 0.18, f) * (1 - ramp(0.82, 1, f))
  const rainy = sky === 'hujan' || sky === 'badai'
  // tebing tetap basah sebentar setelah hujan reda
  const prevRain = skyOf(t, weather, i - 1)
  const after = (prevRain === 'hujan' || prevRain === 'badai') && !rainy ? (1 - ramp(0, 0.35, f)) * 0.7 : 0
  return {
    sky,
    k,
    wet: Math.max(rainy ? k : 0, after),
    cold: sky === 'salju' ? 1 + k * 1.2 : rainy ? 1 + k * 0.4 : 1,
    gust: sky === 'badai' || sky === 'pasir' ? 1 + k * 0.9 : 1,
  }
}
