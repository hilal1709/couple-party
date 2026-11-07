import { CLIMB, drain, floorAt, GRIP_COST, nearRope, type Body, type BodyEvent, type Env, type Input } from './climb'
import { gradAt, heightAt, surfaceAt } from './terrain'
import type { Hit } from './world'

/**
 * Memanjat permukaan apa pun yang terjal: tebing medan, bongkahan batu, batang pohon.
 *
 * Badan disimpan sebagai titik di permukaan dinding + normal dinding (menghadap keluar).
 * Tiap tick: gerak di bidang dinding → satu sinar menempelkan badan kembali ke permukaan →
 * (hanya saat mendorong ke atas) satu sinar dada mencari bibir → sinar ke bawah mencari pijakan
 * untuk naik tepian. Anggaran sinar: paling banyak {@link MAX_RAYS} per tick, nol saat berjalan biasa.
 *
 * State machine:
 *   ground/air/slide ─(tahan Pegang + dinding terjal di depan)→ climb
 *   climb ─(permukaan jadi datar)→ ground · ─(bibir + pijakan di atas)→ mantle → ground
 *   climb ─(stamina habis)→ tergelincir 0,6 dtk → air · ─(lepas Pegang)→ air
 */

/** sinar terbanyak per badan per tick saat memanjat (tempel + dada + 3 pijakan + ruang kepala) */
export const MAX_RAYS = 6
/** permukaan dengan normal-y di atas ini bisa dipijak (≈ kemiringan < 0,75) */
export const FLAT_NY = 0.8
/** permukaan dengan normal-y di bawah ini bisa dipegang (lebih terjal dari ±50°) */
export const WALL_NY = 0.62
export const CHEST = 1.0
export const MANTLE_T = 0.8
/** lama tangan merosot sebelum lepas saat stamina habis */
export const SLIP_T = 0.6


function ray(env: Env, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, len: number): Hit | null {
  return env.world ? env.world.ray(ox, oy, oz, dx, dy, dz, len) : null
}

/** normal medan dari kemiringan heightfield (cadangan tanpa Rapier) */
function terrainNormal(env: Env, x: number, z: number): [number, number, number] {
  const [gx, gz] = gradAt(env.t, x, z)
  const l = Math.hypot(gx, 1, gz)
  return [-gx / l, 1 / l, -gz / l]
}

/**
 * Coba pegang dinding di depan (arah dx,dz) setinggi dada. Satu sinar.
 * Mengembalikan true kalau badan sekarang memanjat.
 */
export function tryGrab(b: Body, env: Env, dx: number, dz: number, ev: BodyEvent[]): boolean {
  const l = Math.hypot(dx, dz)
  if (l < 1e-3 || !env.world) return false
  const hit = ray(env, b.x, b.y + CHEST * 0.8, b.z, dx / l, 0, dz / l, 0.34 + 0.45)
  if (!hit || hit.ny > WALL_NY || hit.ny < -0.5) return false
  // titik tempel awal: di dinding sedikit di atas kaki. Kalau di situ ternyata masih tanah landai
  // (dinding mulai lebih tinggi), tempel di titik dada yang tadi kena.
  const fx = b.x
  const fy = b.y
  const fz = b.z
  b.x = hit.x
  b.y = hit.y - 0.45
  b.z = hit.z
  enterClimb(b, env, hit.nx, hit.ny, hit.nz)
  if (b.ny > FLAT_NY || Math.hypot(b.x - fx, b.z - fz) > 1.5 || b.y < fy - 0.5) {
    b.x = hit.x
    b.y = hit.y
    b.z = hit.z
    b.nx = hit.nx
    b.ny = hit.ny
    b.nz = hit.nz
  }
  ev.push({ k: 'grab' })
  return true
}

/** pindah ke mode panjat dengan normal dinding awal (atau dari heightfield) */
export function enterClimb(b: Body, env: Env, nx?: number, ny?: number, nz?: number) {
  if (nx === undefined) [nx, ny, nz] = terrainNormal(env, b.x, b.z)
  b.mode = 'climb'
  b.vx = b.vz = b.vy = 0
  b.nx = nx
  b.ny = ny!
  b.nz = nz!
  b.slipT = 0
  b.yaw = Math.atan2(-nx, -nz!)
  snap(b, env)
}

/** tempelkan badan ke permukaan terdekat di belakang normal. false = dinding hilang. */
function snap(b: Body, env: Env): boolean {
  if (!env.world) {
    b.y = heightAt(env.t, b.x, b.z)
    ;[b.nx, b.ny, b.nz] = terrainNormal(env, b.x, b.z)
    b.surface = surfaceAt(env.t, b.x, b.z)
    return true
  }
  const hit = ray(env, b.x + b.nx * 0.5, b.y + b.ny * 0.5, b.z + b.nz * 0.5, -b.nx, -b.ny, -b.nz, 1.25)
  if (!hit) return false
  b.x = hit.x
  b.y = hit.y
  b.z = hit.z
  // normal dihaluskan: tonjolan kecil tidak membuat badan berkedut
  const mx = b.nx * 0.55 + hit.nx * 0.45
  const my = b.ny * 0.55 + hit.ny * 0.45
  const mz = b.nz * 0.55 + hit.nz * 0.45
  const l = Math.hypot(mx, my, mz) || 1
  b.nx = mx / l
  b.ny = my / l
  b.nz = mz / l
  b.surface = hit.surface
  return true
}

/** lepas dari dinding: jatuh sedikit menjauh */
function release(b: Body) {
  const h = Math.hypot(b.nx, b.nz) || 1
  b.mode = 'air'
  b.peak = b.y
  b.vx = (b.nx / h) * 1.2
  b.vz = (b.nz / h) * 1.2
  b.vy = 0
  b.x += (b.nx / h) * 0.25
  b.z += (b.nz / h) * 0.25
  b.slipT = 0
}

/**
 * Cari pijakan datar di atas bibir: sinar ke bawah dari atas kepala, 3 jarak ke dalam dinding.
 * Pastikan ruang kepala kosong (tidak menembus tonjolan). Mulai meluncur naik kalau ketemu.
 */
function tryMantle(b: Body, env: Env, ev: BodyEvent[]): boolean {
  const h = Math.hypot(b.nx, b.nz)
  if (h < 0.2) return false
  const fx = -b.nx / h
  const fz = -b.nz / h
  let target: { x: number; y: number; z: number } | null = null
  if (env.world) {
    const head = ray(env, b.x + b.nx * 0.3, b.y + 1.9, b.z + b.nz * 0.3, fx, 0, fz, 1.6)
    for (const reach of [0.55, 1.0, 1.5]) {
      if (head && head.toi < reach + 0.3) break
      const hit = ray(env, b.x + fx * reach, b.y + 1.95, b.z + fz * reach, 0, -1, 0, 2.6)
      // pijakan harus juga pijakan menurut sim (bukan ujung batang pohon yang tidak bisa diinjak)
      if (hit && hit.ny > FLAT_NY - 0.05 && hit.y > b.y - 0.2 && hit.y - b.y < 1.9 && Math.abs(floorAt(env, hit.x, hit.z, hit.y + 0.3) - hit.y) < 0.4) {
        target = { x: hit.x, y: hit.y, z: hit.z }
        break
      }
    }
  } else {
    for (const reach of [0.6, 1.1, 1.6]) {
      const ax = b.x + fx * reach
      const az = b.z + fz * reach
      const ah = heightAt(env.t, ax, az)
      const ny = terrainNormal(env, ax, az)[1]
      if (ah - b.y < 1.1 && ah >= b.y - 0.2 && ny > FLAT_NY) {
        target = { x: ax, y: ah, z: az }
        break
      }
    }
  }
  if (!target) return false
  startMantle(b, env, target.x, target.y, target.z)
  ev.push({ k: 'top' })
  return true
}

export function startMantle(b: Body, env: Env, x: number, y: number, z: number) {
  b.mode = 'mantle'
  b.vx = b.vy = b.vz = 0
  b.rope = null
  b.mantle = { x0: b.x, y0: b.y, z0: b.z, x1: x, y1: floorAt(env, x, z, y + 0.3), z1: z, t: 0 }
  b.peak = Math.max(b.y, b.mantle.y1)
  b.moving = true
}

/** naik tepian: badan terangkat dulu (siku menarik), lalu maju ke atas pijakan */
export function mantleStep(b: Body, env: Env, dt: number) {
  const m = b.mantle
  if (!m) {
    b.mode = 'ground'
    return
  }
  m.t = Math.min(1, m.t + dt / MANTLE_T)
  const rise = Math.min(1, m.t / 0.55)
  const fwd = m.t < 0.35 ? 0 : (m.t - 0.35) / 0.65
  const ease = (k: number) => k * k * (3 - 2 * k)
  b.y = m.y0 + (Math.max(m.y1, m.y0) + 0.12 - m.y0) * ease(rise) - (m.t >= 1 ? 0.12 : 0)
  b.x = m.x0 + (m.x1 - m.x0) * ease(fwd)
  b.z = m.z0 + (m.z1 - m.z0) * ease(fwd)
  drain(b, 0.06 * dt)
  if (m.t >= 1) {
    b.x = m.x1
    b.z = m.z1
    b.y = floorAt(env, m.x1, m.z1, m.y1 + 0.3)
    b.mode = 'ground'
    b.mantle = null
    b.peak = b.y
    b.moving = false
  }
}

/** satu tick memanjat (badan di mode 'climb') */
export function climbStep(b: Body, inp: Input, env: Env, dt: number, ev: BodyEvent[]) {
  if (!inp.grip) {
    release(b)
    return
  }
  // stamina habis: tangan merosot sebentar (masih bisa ditolong), lalu lepas
  if (b.stamina <= 0) {
    if (b.slipT === 0) ev.push({ k: 'slip' })
    b.slipT += dt
    if (b.slipT >= SLIP_T) {
      ev.push({ k: 'tired' })
      release(b)
      return
    }
  } else b.slipT = 0
  const slipping = b.slipT > 0

  // bidang dinding: "atas" = sumbu-y diproyeksikan ke dinding, "kanan" = normal × atas
  let ux = -b.nx * b.ny
  let uy = 1 - b.ny * b.ny
  let uz = -b.nz * b.ny
  const ul = Math.hypot(ux, uy, uz)
  if (ul < 1e-3) {
    ux = 0
    uy = 1
    uz = 0
  } else {
    ux /= ul
    uy /= ul
    uz /= ul
  }
  let rx = -b.nz
  let rz = b.nx
  const rl = Math.hypot(rx, rz) || 1
  rx /= rl
  rz /= rl

  const iceSlip = b.surface === 'es' && b.buffs.sepatu <= 0 ? 0.35 : b.surface === 'kristal' ? 0.18 : 0
  let up = slipping ? 0 : inp.up
  if (b.lunge > 0 && !slipping) up = 3.2
  const wetK = b.surface === 'es' ? 1 : 1 + 0.35 * (env.wet ?? 0)
  const cost = wetK * GRIP_COST[b.surface] * (b.buffs.sepatu > 0 && (b.surface === 'es' || b.surface === 'salju') ? 0.75 : 1) * (b.buffs.kapur > 0 ? 0.55 : 1)
  const d = (CLIMB * up - iceSlip - (slipping ? 1.1 : 0)) * dt
  const side = (slipping ? 0 : inp.side) * CLIMB * 0.8 * dt
  const px = b.x
  const py = b.y
  const pz = b.z
  b.x += ux * d + rx * side
  b.y += uy * d
  b.z += uz * d + rz * side
  if (!snap(b, env)) {
    // dinding habis di depan tangan: kalau mendorong naik, cari bibir; kalau tidak, tetap di tempat
    b.x = px
    b.y = py
    b.z = pz
    if (up > 0.2 && tryMantle(b, env, ev)) return
    if (!snap(b, env)) {
      release(b)
      return
    }
  }
  b.yaw = Math.atan2(-b.nx, -b.nz)
  // permukaan di bawah tangan jadi landai: berdiri
  if (b.ny > FLAT_NY) {
    const f = floorAt(env, b.x, b.z, b.y + 0.1)
    if (f < b.y - 0.5) {
      // tepi atas yang bukan pijakan (tepi bongkahan, ujung batang): coba naik ke tengahnya dulu
      b.x = px
      b.y = py
      b.z = pz
      if (up > 0.2 && tryMantle(b, env, ev)) return
      // ujung tiang/batang yang tidak bisa diinjak: berhenti di sini, tetap berpegangan
      b.x = px
      b.y = py
      b.z = pz
      snap(b, env)
      b.moving = false
      return
    }
    // merosot sampai tanah datar: tetap dihitung kehabisan tenaga
    if (slipping) ev.push({ k: 'tired' })
    b.mode = 'ground'
    b.y = f
    b.peak = b.y
    ev.push({ k: 'top' })
    return
  }
  // dada sudah melewati bibir: naik tepian
  if (up > 0.2 && env.world) {
    const chest = ray(env, b.x + b.nx * 0.5, b.y + CHEST, b.z + b.nz * 0.5, -b.nx, 0, -b.nz, 1.0)
    if (!chest && tryMantle(b, env, ev)) return
  } else if (up > 0.2 && tryMantle(b, env, ev)) return

  b.moving = Math.abs(inp.up) + Math.abs(inp.side) > 0.2 && !slipping
  // turun jauh lebih hemat daripada naik
  const effort = !b.moving ? 0.03 : inp.up < -0.2 && b.lunge <= 0 ? 0.026 : 0.075
  drain(b, effort * cost * dt + Math.max(0, env.wind[0] ** 2 + env.wind[1] ** 2 - 9) * 0.0008 * dt)
  if (b.stamina < 0.2 && b.stamina + 0.075 * dt * cost >= 0.2) ev.push({ k: 'slip' })
  if (inp.jump && b.stamina > 0.12 && !slipping) {
    if (b.lunge > 0 && !b.chain) {
      // tekan lagi selagi masih meluncur: sedikit tambahan tinggi
      drain(b, 0.08)
      b.lunge += 0.14
      b.chain = true
      ev.push({ k: 'jump' })
    } else if (b.lungeCd <= 0) {
      drain(b, 0.2)
      b.lunge = 0.3
      b.lungeCd = 1
      b.chain = false
      ev.push({ k: 'jump' })
    }
  }
  // tali di dekat tangan: pindah ke tali
  const r = nearRope(env, b)
  if (r && inp.grip) {
    b.mode = 'rope'
    b.rope = r.id
  }
  b.peak = b.y
}
