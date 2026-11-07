import type { Surface } from '../mountains'
import { CELL, deckY, gradAt, heightAt, onDeck, surfaceAt, type Rope, type Terrain } from './terrain'
import { climbStep, enterClimb, mantleStep, startMantle, tryGrab } from './wall'
import type { ClimbWorld } from './world'

export const WALK = 3.6
export const SPRINT = 5.8
export const CLIMB = 1.75
export const ROPE = 2.6
export const GRAVITY = 20
export const JUMP_V = 7.4
/** kemiringan terjal (dh/dxz); di atas ini tidak bisa jalan, harus memanjat */
export const STEEP = 1.0
/** tingkat yang bisa dinaiki tanpa lompat (m) */
export const STEP = 0.55
export const RADIUS = 0.34
export const HEIGHT = 1.45
/** jatuh lebih dari ini mulai melukai; lebih dari DOWN_DROP = pingsan */
export const HURT_DROP = 6.5
export const DOWN_DROP = 21

export type Mode = 'ground' | 'air' | 'climb' | 'rope' | 'slide' | 'swim' | 'down' | 'mantle'

export type Fatigue = { fall: number; hunger: number; cold: number; heat: number; poison: number }
export const FATIGUE_KEYS = ['fall', 'hunger', 'cold', 'heat', 'poison'] as const

/** efek item yang sedang aktif, sisa detik */
export type Buffs = { kapur: number; sepatu: number; syal: number; balon: number; kopi: number; obor: number; kompas: number; teropong: number }
export const noBuffs = (): Buffs => ({ kapur: 0, sepatu: 0, syal: 0, balon: 0, kopi: 0, obor: 0, kompas: 0, teropong: 0 })

export type Body = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
  mode: Mode
  stamina: number
  /** stamina bonus dari makanan (0..BONUS_MAX): terpakai lebih dulu, tidak pulih sendiri */
  bonus: number
  fat: Fatigue
  buffs: Buffs
  /** titik tertinggi sejak kaki terakhir menapak (untuk menghitung jatuh) */
  peak: number
  rope: number | null
  surface: Surface
  /** payung sedang dibuka */
  umbrella: boolean
  /** sisa waktu lompatan dari dinding */
  lunge: number
  /** jeda sebelum lunge berikutnya (detik) */
  lungeCd: number
  /** lunge kedua yang menyambung sudah dipakai */
  chain: boolean
  /** kecepatan datar saat lepas landas: lompat sambil lari tetap jauh */
  airSpeed: number
  /** sisa waktu terdorong (tidak bisa dikendalikan) */
  stun: number
  moving: boolean
  /** normal dinding yang sedang dipanjat (menghadap keluar) */
  nx: number
  ny: number
  nz: number
  /** lama tangan merosot karena stamina habis (0 = tidak) */
  slipT: number
  /** naik tepian yang sedang berjalan: dari titik dinding ke pijakan, t 0..1 */
  mantle: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; t: number } | null
}

export type Input = {
  /** arah gerak di dunia (sudah diputar mengikuti kamera), panjang 0..1 */
  mx: number
  mz: number
  /** stik mentah untuk memanjat: atas/bawah dan samping */
  up: number
  side: number
  /** tombol lompat baru ditekan */
  jump: boolean
  grip: boolean
  sprint: boolean
}

export type Env = {
  t: Terrain
  ropes: Rope[]
  /** kepala pendaki lain: bisa dipijak (pijak bahu) */
  heads: { x: number; y: number; z: number }[]
  /** papan kristal yang sedang pecah */
  broken: Set<number>
  /** dorongan angin (m/s) */
  wind: [number, number]
  /** pengali dingin dari cuaca */
  coldK: number
  /** dekat api unggun menyala */
  warm: boolean
  /** kolom angin naik (Pulau Langit) */
  lift: number
  /** tebing basah karena hujan 0..1: pegangan lebih boros (kecuali es) */
  wet?: number
  /** dunia tabrakan Rapier untuk memanjat; tanpa ini panjat memakai heightfield saja */
  world?: ClimbWorld
  /** sedang menggendong teman pingsan: tidak bisa memanjat/lari, jalan & lompat lebih berat */
  load?: number
}

export type BodyEvent =
  | { k: 'jump' }
  | { k: 'land'; drop: number; hurt: number }
  | { k: 'down'; why: 'jatuh' | 'lava' | 'awan' | 'lelah' }
  | { k: 'grab' }
  | { k: 'slip' }
  | { k: 'splash' }
  | { k: 'tired' }
  | { k: 'top' }

/** pengali kuras stamina saat memanjat, per bahan permukaan */
export const GRIP_COST: Record<Surface, number> = { batu: 1, tanah: 1.15, lumut: 1.4, salju: 1.2, es: 1.6, pasir: 1.3, kristal: 1.45, vulkanik: 1.1 }
/** kelicinan saat berjalan (0 = mencengkeram, 1 = es) */
const SLICK: Record<Surface, number> = { batu: 0, tanah: 0, lumut: 0.25, salju: 0.2, es: 0.85, pasir: 0.1, kristal: 0.6, vulkanik: 0 }

export function newBody(x: number, y: number, z: number, yaw: number): Body {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw,
    mode: 'ground',
    stamina: 1,
    bonus: 0,
    fat: { fall: 0, hunger: 0, cold: 0, heat: 0, poison: 0 },
    buffs: noBuffs(),
    peak: y,
    rope: null,
    surface: 'tanah',
    umbrella: false,
    lunge: 0,
    lungeCd: 0,
    chain: false,
    airSpeed: 0,
    stun: 0,
    moving: false,
    nx: 0,
    ny: 0,
    nz: 1,
    slipT: 0,
    mantle: null,
  }
}

/** percepatan jalan/lari & pengereman di tanah (m/s²): ±0,25 dtk ke kecepatan jalan, ±0,2 dtk berhenti */
export const ACCEL = 14
export const ACCEL_RUN = 12
export const DECEL = 18
/** laju putar badan maksimum (rad/s): berbalik arah butuh ±0,3 dtk, tidak patah */
export const TURN_RATE = 10

/** putar sudut `from` ke `to` lewat jalur terpendek, paling jauh `max` radian */
export function turnToward(from: number, to: number, max: number) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + Math.max(-max, Math.min(max, d))
}

/** jumlah semua segmen status (0..>1); 1 = bar penuh tertutup = pingsan */
export const fatigueTotal = (b: Body) => {
  const f = b.fat
  return f.fall + f.hunger + f.cold + f.heat + f.poison
}

/** batas atas bar stamina: panjang bar dikurangi semua segmen status yang menggerogoti dari kanan */
export function maxStamina(b: Body) {
  return Math.max(0, 1 - fatigueTotal(b))
}

/** stamina bonus paling banyak (panjang bar kedua) */
export const BONUS_MAX = 0.6

/** kurangi semua segmen sebanding supaya jumlahnya ≤ `cap` (bangun, kembali ke api unggun) */
export function easeFatigue(b: Body, cap: number) {
  const tot = fatigueTotal(b)
  if (tot <= cap) return
  const k = cap / tot
  for (const key of FATIGUE_KEYS) b.fat[key] *= k
}

/** isi stamina; yang melebihi batas masuk ke bar bonus */
export function feed(b: Body, v: number) {
  const room = Math.max(0, maxStamina(b) - b.stamina)
  const add = Math.min(room, v)
  b.stamina += add
  b.bonus = Math.min(BONUS_MAX, b.bonus + (v - add))
}

/** lantai di bawah (x,z) untuk badan setinggi y: medan, papan, batu yang bisa dipijak, kepala teman */
export function floorAt(env: Env, x: number, z: number, y: number) {
  const { t } = env
  let f = heightAt(t, x, z)
  for (const d of t.decks) {
    if (env.broken.has(d.id) || !onDeck(d, x, z, RADIUS * 0.5)) continue
    const top = deckY(d, x, z)
    if (top <= y + STEP && top > f) f = top
  }
  for (const s of t.solids) {
    if (s.kind !== 'batu' && s.kind !== 'semak' && s.kind !== 'teh' && s.kind !== 'karang') continue
    if (s.top <= y + STEP && s.top > f && Math.hypot(s.x - x, s.z - z) < s.r * 0.85) f = s.top
  }
  for (const h of env.heads) {
    const top = h.y + HEIGHT
    if (top <= y + STEP && top > f && Math.hypot(h.x - x, h.z - z) < 0.42) f = top
  }
  return f
}

/** dorong keluar dari batang pohon & batu yang lebih tinggi dari kaki */
function pushOut(env: Env, b: Body) {
  for (const s of env.t.solids) {
    if (s.top <= b.y + STEP) continue
    if (s.y > b.y + HEIGHT) continue
    const dx = b.x - s.x
    const dz = b.z - s.z
    const d = Math.hypot(dx, dz)
    const min = s.r + RADIUS
    if (d >= min || d === 0) continue
    b.x = s.x + (dx / d) * min
    b.z = s.z + (dz / d) * min
  }
  const lx = env.t.hx - 2
  const lz = env.t.hz - 2
  b.x = Math.max(-lx, Math.min(lx, b.x))
  b.z = Math.max(-lz, Math.min(lz, b.z))
}

export function nearRope(env: Env, b: Body): Rope | null {
  let best: Rope | null = null
  let bd = 0.95
  for (const r of env.ropes) {
    if (b.y < r.bottom - 0.6 || b.y > r.top + 0.2) continue
    const d = Math.hypot(b.x - r.x, b.z - r.z)
    if (d < bd) {
      bd = d
      best = r
    }
  }
  return best
}

/** kuras stamina: bar bonus habis dulu, baru bar utama */
export const drain = (b: Body, v: number) => {
  const fromBonus = Math.min(b.bonus, v)
  b.bonus -= fromBonus
  b.stamina = Math.max(0, b.stamina - (v - fromBonus))
}

/** Satu langkah fisika pendaki. Mengubah `b` dan mengembalikan kejadian untuk suara/efek/host. */
export function stepBody(b: Body, inp: Input, env: Env, dt: number): BodyEvent[] {
  const ev: BodyEvent[] = []
  if (b.mode === 'down') return ev
  const { t } = env
  for (const k of Object.keys(b.buffs) as (keyof Buffs)[]) b.buffs[k] = Math.max(0, b.buffs[k] - dt)
  b.lunge = Math.max(0, b.lunge - dt)
  b.lungeCd = Math.max(0, b.lungeCd - dt)
  b.stun = Math.max(0, b.stun - dt)
  const zn = t.m.zones[Math.min(t.zones - 1, zoneAtSafe(t, b.x, b.z))]
  tickFatigue(b, env, zn.cold, zn.heat, dt)
  // semua segmen menutup bar: pingsan
  if (fatigueTotal(b) >= 0.999) {
    b.mode = 'down'
    b.stamina = 0
    b.bonus = 0
    b.vx = b.vy = b.vz = 0
    b.rope = null
    b.mantle = null
    ev.push({ k: 'down', why: 'lelah' })
    return ev
  }
  const cap = maxStamina(b)
  if (b.stamina > cap) b.stamina = cap
  // menggendong: tangan penuh
  if (env.load) inp = { ...inp, grip: false, sprint: false }
  b.surface = surfaceAt(t, b.x, b.z)
  const sea = t.m.sea

  switch (b.mode) {
    case 'ground':
    case 'swim': {
      const swim = b.mode === 'swim'
      // tali/tangga di dekat tangan lebih diutamakan daripada memanjat tebing
      const rp = inp.grip && b.stun <= 0 && !swim ? nearRope(env, b) : null
      if (rp) {
        b.mode = 'rope'
        b.rope = rp.id
        b.y = Math.max(b.y, rp.bottom)
        ev.push({ k: 'grab' })
        break
      }
      // tahan Pegang menghadap dinding apa pun (tebing, bongkahan, pohon): satu sinar setinggi dada
      if (inp.grip && b.stun <= 0 && !swim && b.stamina > 0.02) {
        const push = Math.hypot(inp.mx, inp.mz) > 0.2
        if (tryGrab(b, env, push ? inp.mx : Math.sin(b.yaw), push ? inp.mz : Math.cos(b.yaw), ev)) break
      }
      const sprint = inp.sprint && !swim && b.stamina > 0.05 && Math.hypot(inp.mx, inp.mz) > 0.3
      const speed = (swim ? 2.1 : sprint ? SPRINT : WALK) * (b.stun > 0 ? 0 : 1) * (env.load ? 0.7 : 1)
      const slick = b.buffs.sepatu > 0 ? 0 : SLICK[b.surface]
      if (swim) {
        const k = 1 - Math.exp(-dt * 4)
        b.vx += (inp.mx * speed - b.vx) * k
        b.vz += (inp.mz * speed - b.vz) * k
      } else {
        // badan berbobot: percepatan terbatas (m/s²), berhenti lebih cepat daripada mulai; es/lumut licin
        const pushing = Math.hypot(inp.mx, inp.mz) > 0.05
        const acc = (pushing ? (sprint ? ACCEL_RUN : ACCEL) : DECEL) * (1 - slick * 0.85)
        const dvx = inp.mx * speed - b.vx
        const dvz = inp.mz * speed - b.vz
        const dv = Math.hypot(dvx, dvz)
        const step = Math.min(dv, acc * dt)
        if (dv > 1e-6) {
          b.vx += (dvx / dv) * step
          b.vz += (dvz / dv) * step
        }
      }
      if (env.wind[0] || env.wind[1]) {
        b.vx += env.wind[0] * dt * 0.25
        b.vz += env.wind[1] * dt * 0.25
      }
      const nx = b.x + b.vx * dt
      const nz = b.z + b.vz * dt
      const f = floorAt(env, nx, nz, b.y)
      const [gx, gz] = gradAt(t, nx, nz)
      const slope = Math.hypot(gx, gz)
      const rising = f - b.y
      // terjal di depan: berhenti; tahan Pegang = mulai memanjat
      if (!swim && rising > 0.005 && slope > STEEP && heightAt(t, nx, nz) >= f - 0.01) {
        if (inp.grip && b.stamina > 0.02) {
          // menempel ke dinding di depan (titik kaki masih landai, dinding mulai tepat di depan)
          b.x = nx
          b.z = nz
          b.y = heightAt(t, nx, nz)
          enterClimb(b, env)
          ev.push({ k: 'grab' })
        } else {
          // geser menyusuri tebing
          const ux = gx / slope
          const uz = gz / slope
          const dot = b.vx * ux + b.vz * uz
          if (dot > 0) {
            b.vx -= ux * dot
            b.vz -= uz * dot
          }
          b.x += b.vx * dt
          b.z += b.vz * dt
          b.y = Math.max(b.y, floorAt(env, b.x, b.z, b.y))
        }
      } else if (rising > STEP) {
        // papan/batu terlalu tinggi: tembok
        b.vx = b.vz = 0
      } else {
        b.x = nx
        b.z = nz
        if (f < b.y - 0.6 && !swim) {
          // melangkah keluar dari bibir: jatuh
          b.mode = 'air'
          b.vy = 0
          b.airSpeed = Math.hypot(b.vx, b.vz)
          b.peak = b.y
        } else if (!swim) b.y = f
      }
      pushOut(env, b)
      const moving = Math.hypot(b.vx, b.vz)
      b.moving = moving > 0.4
      if (b.moving) b.yaw = turnToward(b.yaw, Math.atan2(b.vx, b.vz), TURN_RATE * dt)
      if (sprint) drain(b, 0.085 * dt)
      else b.stamina = Math.min(cap, b.stamina + (b.moving ? 0.22 : 0.4) * (b.buffs.kopi > 0 ? 2 : 1) * (env.warm ? 1.6 : 1) * dt)
      // berdiri di lereng terjal (tergelincir dari batu dsb.)
      if (!swim && slopeAt2(t, b.x, b.z) > STEEP * 1.25 && floorAt(env, b.x, b.z, b.y) - heightAt(t, b.x, b.z) < 0.05) {
        b.mode = 'slide'
        b.peak = b.y
      }
      if (swim) {
        b.y = sea!.y - 0.55
        drain(b, 0.012 * dt)
        const ground = heightAt(t, b.x, b.z)
        if (ground > b.y - 0.1) {
          b.mode = 'ground'
          b.y = Math.max(ground, floorAt(env, b.x, b.z, b.y))
        }
      } else if (sea?.kind === 'air' && b.y < sea.y - 0.55) {
        b.mode = 'swim'
        ev.push({ k: 'splash' })
      }
      if (inp.jump && b.stun <= 0) {
        const cost = swim ? 0.04 : 0.1
        if (b.stamina >= cost * 0.5) {
          drain(b, cost)
          b.mode = 'air'
          b.vy = swim ? 4.5 : JUMP_V * (b.buffs.balon > 0 ? 1.15 : 1) * (env.load ? 0.8 : 1)
          b.airSpeed = Math.hypot(b.vx, b.vz)
          b.peak = b.y
          ev.push({ k: 'jump' })
        }
      }
      break
    }

    case 'air': {
      const g = GRAVITY * (b.buffs.balon > 0 ? 0.32 : 1)
      b.vy -= g * dt
      if (env.lift > 0 && b.vy < 6) b.vy += env.lift * dt * 3
      if (b.umbrella && b.vy < -2.4) b.vy = -2.4
      const ctl = b.umbrella ? 3.2 : 1.6
      // kendali di udara tidak memotong laju lari saat lompat
      const speed = Math.max(b.umbrella ? 4.4 : WALK, b.airSpeed)
      b.vx += (inp.mx * speed - b.vx) * Math.min(1, dt * ctl) * (b.stun > 0 ? 0 : 1)
      b.vz += (inp.mz * speed - b.vz) * Math.min(1, dt * ctl) * (b.stun > 0 ? 0 : 1)
      b.vx += env.wind[0] * dt * (b.umbrella ? 1.4 : 0.6)
      b.vz += env.wind[1] * dt * (b.umbrella ? 1.4 : 0.6)
      b.x += b.vx * dt
      b.z += b.vz * dt
      b.y += b.vy * dt
      // payung & angin naik: tinggi jatuh dihitung dari titik melambat
      if (b.umbrella || env.lift > 0) b.peak = Math.min(b.peak, b.y + 2)
      b.peak = Math.max(b.peak, b.y)
      pushOut(env, b)
      if (Math.hypot(b.vx, b.vz) > 0.3) b.yaw = Math.atan2(b.vx, b.vz)
      b.moving = false
      // tangkap tali di udara
      const r = inp.grip ? nearRope(env, b) : null
      if (r && b.stamina > 0.02) {
        b.mode = 'rope'
        b.rope = r.id
        b.peak = b.y
        ev.push({ k: 'grab' })
        break
      }
      // tangkap dinding di udara: lebih mahal, dan jatuh yang tertahan tetap terasa
      if (inp.grip && b.stamina > 0.08 && b.vy < 3 && b.stun <= 0) {
        const fall = b.peak - b.y
        if (tryGrab(b, env, Math.sin(b.yaw), Math.cos(b.yaw), ev)) {
          drain(b, 0.05 + Math.max(0, -b.vy) * 0.006)
          if (fall > HURT_DROP) b.fat.fall = Math.min(0.7, b.fat.fall + (fall - HURT_DROP) * 0.012)
          b.peak = b.y
          break
        }
      }
      if (sea && b.y < sea.y - 0.3) {
        if (sea.kind === 'air') {
          b.mode = 'swim'
          b.vy = 0
          b.peak = b.y
          ev.push({ k: 'splash' })
          break
        }
        if (sea.kind === 'lava' || (sea.kind === 'awan' && b.y < sea.y - 6)) {
          b.mode = 'down'
          ev.push({ k: 'down', why: sea.kind === 'lava' ? 'lava' : 'awan' })
          break
        }
      }
      const f = floorAt(env, b.x, b.z, b.y)
      if (b.y <= f && b.vy <= 0) {
        b.y = f
        b.airSpeed = 0
        land(b, env, inp, ev)
      } else if (b.y < f) {
        // menabrak lereng naik saat melayang
        b.y = f
        land(b, env, inp, ev)
      }
      break
    }

    case 'slide': {
      const [gx, gz] = gradAt(t, b.x, b.z)
      const s = Math.hypot(gx, gz) || 1
      const acc = 9 * (s / (1 + s))
      b.vx += (-gx / s) * acc * dt
      b.vz += (-gz / s) * acc * dt
      const sp = Math.hypot(b.vx, b.vz)
      if (sp > 11) {
        b.vx *= 11 / sp
        b.vz *= 11 / sp
      }
      b.x += b.vx * dt
      b.z += b.vz * dt
      pushOut(env, b)
      const f = floorAt(env, b.x, b.z, b.y)
      // terlempar dari bibir: udara
      if (f < b.y - 0.8) {
        b.mode = 'air'
        b.vy = 0
      } else b.y = f
      b.moving = false
      if (inp.grip && b.stamina > 0.12) {
        drain(b, 0.14)
        enterClimb(b, env)
        // jatuh tertahan tetap terasa
        const drop = b.peak - b.y
        if (drop > HURT_DROP) b.fat.fall += (drop - HURT_DROP) * 0.012
        b.peak = b.y
        ev.push({ k: 'grab' })
        break
      }
      if (sea?.kind === 'air' && b.y < sea.y - 0.5) {
        b.mode = 'swim'
        ev.push({ k: 'splash' })
        break
      }
      if (sea && sea.kind !== 'air' && b.y < sea.y - 0.3) {
        b.mode = 'down'
        ev.push({ k: 'down', why: sea.kind === 'lava' ? 'lava' : 'awan' })
        break
      }
      if (s < STEEP * 0.8) {
        b.mode = 'ground'
        landHurt(b, ev)
      }
      break
    }

    case 'climb':
      climbStep(b, inp, env, dt, ev)
      break

    case 'mantle':
      mantleStep(b, env, dt)
      break

    case 'rope': {
      const r = env.ropes.find((x) => x.id === b.rope)
      if (!r || !inp.grip || b.stamina <= 0) {
        b.mode = 'air'
        b.rope = null
        b.vy = 0
        b.peak = b.y
        if (r) {
          b.vx = r.nx * 1.5
          b.vz = r.nz * 1.5
        }
        break
      }
      const ladder = r.kind === 'tangga'
      b.x = r.x + r.nx * 0.32
      b.z = r.z + r.nz * 0.32
      b.yaw = Math.atan2(-r.nx, -r.nz)
      b.y = Math.max(r.bottom - 0.3, Math.min(r.top, b.y + inp.up * (ladder ? 3 : ROPE) * dt))
      b.moving = Math.abs(inp.up) > 0.2
      drain(b, (ladder ? 0 : b.moving ? 0.025 : 0.012) * dt)
      if (b.y >= r.top - 0.25 && inp.up > 0.3) {
        // naik ke atas tebing: meluncur ke pijakan, tidak teleport
        startMantle(b, env, r.tx, r.top, r.tz)
        ev.push({ k: 'top' })
      } else if (b.y <= r.bottom - 0.25 && inp.up < -0.3) {
        b.mode = 'ground'
        b.rope = null
        b.x += r.nx * 0.5
        b.z += r.nz * 0.5
        b.y = floorAt(env, b.x, b.z, b.y + 0.5)
        b.peak = b.y
      }
      if (inp.jump) {
        b.mode = 'air'
        b.rope = null
        b.vx = r.nx * 3.5
        b.vz = r.nz * 3.5
        b.vy = 5
        b.peak = b.y
        ev.push({ k: 'jump' })
      }
      break
    }
  }
  return ev
}

function land(b: Body, env: Env, inp: Input, ev: BodyEvent[]) {
  const s = slopeAt2(env.t, b.x, b.z)
  const onTerrain = floorAt(env, b.x, b.z, b.y) - heightAt(env.t, b.x, b.z) < 0.05
  b.vy = 0
  if (onTerrain && s > STEEP) {
    if (inp.grip && b.stamina > 0.05) {
      enterClimb(b, env)
      const drop = b.peak - b.y
      if (drop > HURT_DROP) b.fat.fall += (drop - HURT_DROP) * 0.015
      b.peak = b.y
      ev.push({ k: 'grab' })
    } else b.mode = 'slide'
    return
  }
  b.mode = 'ground'
  landHurt(b, ev)
}

function landHurt(b: Body, ev: BodyEvent[]) {
  const drop = b.peak - b.y
  b.peak = b.y
  b.umbrella = false
  if (drop >= DOWN_DROP) {
    b.mode = 'down'
    b.fat.fall = Math.min(0.6, b.fat.fall + 0.3)
    ev.push({ k: 'land', drop, hurt: 1 })
    ev.push({ k: 'down', why: 'jatuh' })
    return
  }
  const hurt = drop > HURT_DROP ? (drop - HURT_DROP) * 0.028 : 0
  if (hurt > 0) {
    b.fat.fall = Math.min(0.7, b.fat.fall + hurt)
    b.stun = Math.min(0.8, hurt * 3)
  }
  if (drop > 1.2) ev.push({ k: 'land', drop, hurt })
}

function tickFatigue(b: Body, env: Env, cold: number, heat: number, dt: number) {
  const f = b.fat
  f.hunger = Math.min(0.6, f.hunger + 0.0011 * dt)
  if (env.warm) {
    f.cold = Math.max(0, f.cold - 0.08 * dt)
    f.heat = Math.max(0, f.heat - 0.02 * dt)
  } else {
    if (cold > 0 && b.buffs.syal <= 0) f.cold = Math.min(0.6, f.cold + (cold * env.coldK * dt) / 60)
    else f.cold = Math.max(0, f.cold - 0.01 * dt)
    if (heat > 0) f.heat = Math.min(0.5, f.heat + (heat * dt) / 60)
    else f.heat = Math.max(0, f.heat - 0.01 * dt)
  }
  f.poison = Math.max(0, f.poison - 0.004 * dt)
}

const slopeAt2 = (t: Terrain, x: number, z: number) => Math.hypot(...gradAt(t, x, z))

function zoneAtSafe(t: Terrain, x: number, z: number) {
  const i = Math.max(0, Math.min(t.nx - 1, Math.round((x + t.hx) / CELL)))
  const j = Math.max(0, Math.min(t.nz - 1, Math.round((z + t.hz) / CELL)))
  return t.zone[j * t.nx + i]
}
