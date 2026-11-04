// Fisika Tali Jodoh: dua badan bulat di bidang X/Y (meter, Y ke atas) yang diikat satu tali.
// Tiap HP hanya menggerakkan karakternya sendiri; karakter pasangan datang dari jaringan.
// Tali dan tumpukan badan dibagi rata ke kedua HP memakai bobot yang sama di kedua sisi,
// jadi jumlah koreksinya tetap satu walau masing-masing hanya memindahkan dirinya.

export const R = 0.42
export const G = -26
export const RUN = 5.2
export const JUMP = 9.6
/** tinggi lompatan dari kait (lebih kecil, supaya tetap butuh pasangan untuk dinding tinggi) */
export const HOOK_JUMP = 8.4
export const HOOK_REACH = 0.95
/** jarak pusat badan di bawah kait saat bergantung */
export const HANG = 0.55
export const ROPE_MAX = 6
export const ROPE_MIN = 1.3
export const REEL_SPEED = 3.2
export const UNREEL_SPEED = 4.5
const COYOTE = 0.1
const BUFFER = 0.12
const GROUND_ACCEL = 46
const AIR_ACCEL = 24
const MAX_FALL = -22
/** koreksi tali terbesar per langkah: mencegah badan terlempar saat posisi pasangan melompat */
const ROPE_STEP = 0.6

/** kotak: kiri, bawah, lebar, tinggi */
export type Box = [number, number, number, number]

export type Collider = {
  b: Box
  /** kecepatan benda saat ini (platform gerak) */
  vx: number
  vy: number
  /** hanya bisa dipijak dari atas */
  oneway?: boolean
  /** kecepatan ban berjalan di permukaan atas */
  belt?: number
  /** indeks pijakan di level, untuk pijakan runtuh */
  id: number
}

/** zona angin; `g` = hanya bertiup selama grup itu hidup */
export type Wind = { b: Box; fx: number; fy: number; g?: number }

export type Space = {
  solids: Collider[]
  hooks: [number, number][]
  wind: Wind[]
}

export type Input = { x: number; jump: boolean; hold: boolean; reel: boolean }

export const NO_INPUT: Input = { x: 0, jump: false, hold: false, reel: false }

/** 0 bebas, 1 kuda-kuda di tanah, 2 bergantung di kait */
export type Hold = 0 | 1 | 2

export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  ground: boolean
  hold: Hold
  hook: number
  face: 1 | -1
  coyote: number
  buffer: number
  jumpHeld: boolean
  /** benda yang sedang dipijak (-1 = tidak ada, -2 = kepala pasangan) */
  on: number
  /** kecepatan benda yang dipijak, untuk ikut terbawa */
  carryX: number
  carryY: number
  /** detik di udara, untuk animasi */
  air: number
  /** baru saja melompat di langkah ini (suara) */
  jumped: boolean
  /** baru saja mendarat di langkah ini (suara) */
  landed: boolean
  /** kait yang baru dilepas: tidak bisa langsung dipegang lagi */
  noHook: number
  noHookT: number
}

/** keadaan pasangan seperti terlihat di HP ini */
export type Partner = { x: number; y: number; vx: number; vy: number; hold: Hold; ground: boolean; reel: boolean }

export function spawnBody(x: number, y: number, face: 1 | -1 = 1): Body {
  return { x, y, vx: 0, vy: 0, ground: false, hold: 0, hook: -1, face, coyote: 0, buffer: 0, jumpHeld: false, on: -1, carryX: 0, carryY: 0, air: 0, jumped: false, landed: false, noHook: -1, noHookT: 0 }
}

const mass = (hold: Hold, ground: boolean) => (hold ? Infinity : ground ? 2 : 1)

/** bagian koreksi tali yang ditanggung badan ini (0..1); kedua HP mendapat jumlah 1 */
export function ropeShare(me: { hold: Hold; ground: boolean }, other: { hold: Hold; ground: boolean }): number {
  const a = mass(me.hold, me.ground)
  const b = mass(other.hold, other.ground)
  if (a === Infinity) return b === Infinity ? 0 : 0
  if (b === Infinity) return 1
  return b / (a + b)
}

export const overlaps = (x: number, y: number, r: number, b: Box) => {
  const cx = Math.max(b[0], Math.min(x, b[0] + b[2]))
  const cy = Math.max(b[1], Math.min(y, b[1] + b[3]))
  return (x - cx) ** 2 + (y - cy) ** 2 < r * r
}

export const inside = (x: number, y: number, b: Box) => x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]

export function nearestHook(hooks: [number, number][], x: number, y: number, reach = HOOK_REACH): number {
  let best = -1
  let bd = reach * reach
  for (let i = 0; i < hooks.length; i++) {
    const d = (hooks[i][0] - x) ** 2 + (hooks[i][1] - (y + 0.3)) ** 2
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return best
}

/** Panjang tali berikutnya: memendek selama salah satu menggulung, memanjang lagi saat dilepas. */
export function stepRope(len: number, reeling: boolean, dt: number): number {
  return reeling ? Math.max(ROPE_MIN, len - REEL_SPEED * dt) : Math.min(ROPE_MAX, len + UNREEL_SPEED * dt)
}

/** Satu langkah fisika badan sendiri (dt ≈ 1/60). `partner` null = main sendiri (tanpa tali). */
export function stepBody(b: Body, input: Input, space: Space, partner: Partner | null, rope: number, dt: number): void {
  b.jumped = false
  b.landed = false
  const wasGround = b.ground
  if (input.x > 0.2) b.face = 1
  else if (input.x < -0.2) b.face = -1

  // tombol lompat: tekan baru (bukan ditahan) mengisi buffer
  if (input.jump && !b.jumpHeld) b.buffer = BUFFER
  else b.buffer = Math.max(0, b.buffer - dt)
  if (!input.jump && b.jumpHeld && b.vy > 0 && b.hold === 0) b.vy *= 0.55
  b.jumpHeld = input.jump

  b.noHookT = Math.max(0, b.noHookT - dt)
  // lompat membatalkan kuda-kuda
  if (b.hold === 1 && b.buffer > 0) b.hold = 0
  // pegangan
  if (!input.hold) {
    b.hold = 0
    b.hook = -1
  } else if (b.hold === 0) {
    if (b.ground && b.buffer <= 0) b.hold = 1
    else if (!b.ground) {
      const h = nearestHook(space.hooks, b.x, b.y)
      if (h >= 0 && (h !== b.noHook || b.noHookT <= 0)) {
        b.hold = 2
        b.hook = h
      }
    }
  }
  // pegangan lepas kalau pijakannya hilang (pintu membuka, pijakan runtuh)
  if (b.hold === 1 && !b.ground) b.hold = 0

  if (b.hold === 2) {
    const [hx, hy] = space.hooks[b.hook]
    b.x += (hx - b.x) * Math.min(1, dt * 18)
    b.y += (hy - HANG - b.y) * Math.min(1, dt * 18)
    b.vx = 0
    b.vy = 0
    b.ground = false
    b.air = 0
    if (b.buffer > 0) {
      b.buffer = 0
      b.hold = 0
      b.noHook = b.hook
      b.noHookT = 0.35
      b.hook = -1
      b.vy = HOOK_JUMP
      b.vx = input.x * RUN
      b.jumped = true
    }
    return
  }

  if (b.hold === 1) {
    b.vx = 0
    b.vy = Math.min(0, b.vy)
  } else {
    const target = input.x * RUN
    const acc = (b.ground ? GROUND_ACCEL : AIR_ACCEL) * dt
    b.vx += Math.max(-acc, Math.min(acc, target - b.vx))
  }

  b.coyote = b.ground ? COYOTE : Math.max(0, b.coyote - dt)
  if (b.buffer > 0 && b.coyote > 0 && b.hold === 0) {
    b.vy = JUMP
    b.buffer = 0
    b.coyote = 0
    b.jumped = true
  }

  let ax = 0
  let ay = G
  for (const w of space.wind) {
    if (inside(b.x, b.y, w.b)) {
      ax += w.fx
      ay += w.fy
    }
  }
  if (b.hold === 1) ax = 0
  b.vx += ax * dt
  b.vy = Math.max(MAX_FALL, b.vy + ay * dt)

  const steps = 2
  const h = dt / steps
  const carryX = b.ground ? b.carryX : 0
  const carryY = b.ground ? b.carryY : 0
  b.ground = false
  b.on = -1
  for (let s = 0; s < steps; s++) {
    const prevBottom = b.y - R
    b.x += (b.vx + carryX) * h
    b.y += (b.vy + carryY) * h
    if (partner) ropeConstraint(b, partner, rope)
    collide(b, space.solids, prevBottom)
    if (partner) bump(b, partner)
  }
  if (b.ground) b.air = 0
  else b.air += dt
  if (b.ground && !wasGround && b.vy <= 0) b.landed = true
}

/** dorong badan keluar dari pijakan; menandai berdiri di tanah */
function collide(b: Body, solids: Collider[], prevBottom: number) {
  for (const c of solids) {
    const [x, y, w, h] = c.b
    if (c.oneway) {
      const top = y + h
      if (b.vy - c.vy <= 0.01 && prevBottom >= top - 0.12 && b.y - R < top && b.x >= x - R * 0.4 && b.x <= x + w + R * 0.4 && b.y > y) {
        b.y = top + R
        b.vy = 0
        land(b, c)
      }
      continue
    }
    const cx = Math.max(x, Math.min(b.x, x + w))
    const cy = Math.max(y, Math.min(b.y, y + h))
    let dx = b.x - cx
    let dy = b.y - cy
    const d2 = dx * dx + dy * dy
    if (d2 >= R * R) continue
    let push: number
    if (d2 < 1e-10) {
      // pusat di dalam kotak: keluar lewat sisi terdekat
      const l = b.x - x
      const r = x + w - b.x
      const dn = b.y - y
      const up = y + h - b.y
      const m = Math.min(l, r, dn, up)
      dx = m === l ? -1 : m === r ? 1 : 0
      dy = m === up ? 1 : m === dn ? -1 : 0
      push = m + R
    } else {
      const d = Math.sqrt(d2)
      dx /= d
      dy /= d
      push = R - d
    }
    b.x += dx * push
    b.y += dy * push
    const vn = (b.vx - c.vx) * dx + (b.vy - c.vy) * dy
    if (vn < 0) {
      b.vx -= dx * vn
      b.vy -= dy * vn
    }
    if (dy > 0.6) {
      // gerak benda yang dipijak ditanggung `carry`, jadi kecepatan sendiri relatif terhadapnya
      if (vn < 0) b.vy = Math.max(0, b.vy - c.vy)
      land(b, c)
    }
  }
}

function land(b: Body, c: Collider) {
  b.ground = true
  b.on = c.id
  b.carryX = c.vx + (c.belt ?? 0)
  b.carryY = c.vy
}

/** tali: kalau lebih panjang dari batas, tarik badan ini sebesar bagiannya */
function ropeConstraint(b: Body, p: Partner, len: number) {
  const dx = b.x - p.x
  const dy = b.y - p.y
  const d = Math.hypot(dx, dy)
  if (d <= len || d < 1e-6) return
  const share = ropeShare(b, p)
  if (share <= 0) return
  const nx = dx / d
  const ny = dy / d
  const excess = Math.min(ROPE_STEP, (d - len) * share)
  b.x -= nx * excess
  b.y -= ny * excess
  // buang kecepatan yang menjauh dari pasangan: jadi ayunan bandul
  const vn = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny
  if (vn > 0) {
    b.vx -= nx * vn * share
    b.vy -= ny * vn * share
  }
}

/** badan bisa saling lewat; hanya yang jatuh dari atas yang berdiri di kepala pasangan */
function bump(b: Body, p: Partner) {
  const dx = b.x - p.x
  const dy = b.y - p.y
  const d = Math.hypot(dx, dy)
  const min = R * 2
  if (d >= min || d < 1e-6 || b.hold) return
  const nx = dx / d
  const ny = dy / d
  if (ny < 0.5 || b.vy - p.vy > 0.5) return
  const push = min - d
  b.x += nx * push
  b.y += ny * push
  const vn = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny
  if (vn < 0) {
    b.vx -= nx * vn
    b.vy -= ny * vn
  }
  if (ny > 0.6) {
    b.ground = true
    b.on = -2
    b.carryX = p.vx
    b.carryY = Math.max(0, p.vy)
  }
}
