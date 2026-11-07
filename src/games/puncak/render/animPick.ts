import type { Mode } from '../sim/climb'
import type { ClimbClip } from './climber'

/**
 * Pemilih klip animasi per aktor. Murni (tanpa three.js) supaya bisa diuji, dan dipakai sama untuk
 * pemain sendiri, teman jarak jauh, dan bot: semua masukan berasal dari pose yang teramati
 * (mode, posisi, laju), bukan dari kejadian sim yang hanya ada di HP pemiliknya.
 */
export type AnimIn = {
  mode: Mode
  /** tinggi badan sim (bukan posisi tampilan yang dihaluskan) */
  y: number
  moving: boolean
  /** laju datar teramati (m/s) */
  speed: number
  /** laju putar badan (rad/s) */
  turnRate: number
  /** naik (+) / turun (-) m/s */
  vy: number
  /** hanya pemain sendiri: geser ke samping saat memanjat */
  sideways: boolean
  /** hanya pemain sendiri: menekan ke atas tapi tidak bergerak (terhalang tonjolan) */
  straining: boolean
  lunge: boolean
  /** stamina rendah saat menggantung */
  tired: boolean
  /** luka jatuh cukup berat sampai pincang */
  hurt: boolean
  end: boolean
}

export type AnimOut = { clip: ClimbClip; speed: number; once: boolean }

type Shot = { clip: ClimbClip; left: number; speed: number }

/** batas jatuh (m) yang diberi animasi mendarat */
export const LAND_DROP = 1.8
/** klip naik tepian (±1,25 dtk) dipercepat supaya pas dengan lama luncur sim (MANTLE_T 0,8 dtk) */
export const MANTLE_SPEED = 1.55

const SHOT_SECS: Partial<Record<ClimbClip, number>> = { land: 0.6, pull_up: 1.2, recover: 1.7, slip: 0.55 }

export class AnimPicker {
  private prev: Mode | null = null
  private peak = 0
  private shot: Shot | null = null
  /** lama badan berputar cepat di tempat (detik); belok baru dimainkan kalau bertahan */
  private turnT = 0

  /** kejadian lokal yang tidak bisa disimpulkan dari pose (mis. tangan tergelincir) */
  trigger(clip: ClimbClip, speed = 1) {
    this.shot = { clip, left: (SHOT_SECS[clip] ?? 0.6) / speed, speed }
    this.started = true
  }

  private started = false
  /** klip sekali jalan baru dimulai di frame ini (Round memutarnya dari awal walau klipnya sama) */
  fresh = false

  pick(a: AnimIn, dt: number): AnimOut {
    const out = this.choose(a, dt)
    this.fresh = this.started
    this.started = false
    return out
  }

  private choose(a: AnimIn, dt: number): AnimOut {
    const prev = this.prev
    this.prev = a.mode
    if (a.mode === 'air' || a.mode === 'slide') this.peak = prev === 'air' || prev === 'slide' ? Math.max(this.peak, a.y) : a.y

    if (prev !== null && prev !== a.mode) {
      if ((prev === 'air' || prev === 'slide') && a.mode === 'ground') {
        const drop = this.peak - a.y
        if (drop > LAND_DROP) this.trigger('land', drop > 4 ? 0.75 : 1)
      } else if (prev === 'down' && a.mode !== 'down') this.trigger('recover', 1)
      // keluar dari mode asal klip: hentikan klip itu
      else if (this.shot && (a.mode === 'down' || a.mode === 'air' || a.mode === 'swim')) this.shot = null
    }

    if (this.shot) {
      this.shot.left -= dt
      // mendarat lalu langsung lari: lepas lebih awal supaya tidak terasa tertahan
      const interrupt = this.shot.clip === 'land' && a.speed > 3 && this.shot.left < 0.35
      if (this.shot.left <= 0 || interrupt) this.shot = null
      else return { clip: this.shot.clip, speed: this.shot.speed, once: true }
    }

    this.turnT = Math.abs(a.turnRate) > 2.2 ? this.turnT + dt : 0
    if (a.end) return { clip: 'cheer', speed: 1, once: false }
    switch (a.mode) {
      case 'down':
        return { clip: 'ko', speed: 1, once: true }
      case 'ground': {
        if (!a.moving || a.speed < 0.35) {
          if (this.turnT > 0.12) return { clip: 'turn', speed: Math.min(1.6, Math.abs(a.turnRate) / 4), once: false }
          return { clip: a.hurt ? 'idle_hurt' : 'idle', speed: 1, once: false }
        }
        // klip jalan dibuat untuk ±2,4 m/s, lari ±5 m/s: laju klip mengikuti laju badan supaya kaki tidak meluncur
        if (a.hurt) return { clip: 'walk_hurt', speed: clamp(a.speed / 2.2, 0.6, 1.5), once: false }
        if (a.speed > 4.4) return { clip: 'run', speed: clamp(a.speed / 5.2, 0.85, 1.35), once: false }
        return { clip: 'walk', speed: clamp(a.speed / 2.4, 0.6, 1.7), once: false }
      }
      case 'swim':
        return { clip: 'swim', speed: 1, once: false }
      case 'climb':
        if (a.lunge) return { clip: 'lunge', speed: 1, once: true }
        if (a.straining) return { clip: 'reach', speed: 1, once: false }
        if (!a.moving) return { clip: a.tired ? 'hang' : 'climb_idle', speed: 1, once: false }
        return { clip: a.sideways ? 'climb_side' : 'climb_up', speed: a.tired ? 0.75 : 1, once: false }
      case 'rope':
        return a.moving ? { clip: 'climb_up', speed: 0.8, once: false } : { clip: 'hang', speed: 1, once: false }
      case 'slide':
        return { clip: 'slide', speed: 1, once: false }
      case 'mantle':
        return { clip: 'pull_up', speed: MANTLE_SPEED, once: true }
      default:
        return a.vy > 0.5 ? { clip: 'jump', speed: 1, once: true } : { clip: 'fall', speed: 1, once: false }
    }
  }
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
