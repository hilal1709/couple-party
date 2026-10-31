import type { Input, Kart } from './physics'
import { STEP, curvature, type Track } from './track'

export type BotBrain = {
  /** jalur pilihan bot (-1..1), berubah pelan supaya bot tidak berbaris */
  lane: number
  laneT: number
  /** detik sampai bot memakai itemnya */
  itemT: number
  seed: number
}

export const newBrain = (seed: number): BotBrain => ({ lane: ((seed * 37) % 100) / 50 - 1, laneT: 0, itemT: 2, seed })

function rand(b: BotBrain) {
  b.seed = (b.seed * 1103515245 + 12345) & 0x7fffffff
  return b.seed / 0x7fffffff
}

/**
 * Setir bot: kejar titik di depan pada jalurnya, ngedrift di tikungan tajam (bot pintar),
 * dan hindari tepi jalan. `skill` 0..1.
 */
export function botInput(k: Kart, b: BotBrain, t: Track, dt: number, skill: number): Input {
  b.laneT -= dt
  if (b.laneT <= 0) {
    b.lane = Math.max(-0.75, Math.min(0.75, b.lane + (rand(b) - 0.5) * 0.9))
    b.laneT = 2 + rand(b) * 3
  }
  const look = 14 + Math.abs(k.speed) * 0.55
  const ahead = (k.i + Math.round(look / STEP)) % t.n
  const curve = curvature(t, ahead, 10)
  // di tikungan, ambil sisi dalam
  const lane = Math.max(-0.85, Math.min(0.85, b.lane - Math.sign(curve) * Math.min(0.6, Math.abs(curve) * 25) * skill))
  const lat = lane * t.hw[ahead]
  const tx = t.px[ahead] - t.tz[ahead] * lat
  const tz = t.pz[ahead] + t.tx[ahead] * lat
  const want = Math.atan2(tx - k.x, tz - k.z)
  let d = want - k.yaw
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  // yaw naik = belok kiri, jadi setir = -d
  const steer = Math.max(-1, Math.min(1, -d * 2.4))
  // tikungan paling tajam dalam jarak pengereman di depan
  let worst = 0
  for (let m = 6; m <= 40 + Math.abs(k.speed); m += 6) worst = Math.max(worst, Math.abs(curvature(t, (k.i + Math.round(m / STEP)) % t.n, 6)))
  // drift hanya searah tikungan (curve + = kanan = setir +), dilepas begitu jalan lurus lagi
  const sharp = Math.abs(curve) > 0.012
  const sameWay = Math.sign(curve) === Math.sign(steer) && Math.abs(steer) > 0.5
  const drift = skill > 0.5 && sharp && (k.drift !== 0 ? k.drift === Math.sign(curve) : sameWay && Math.abs(k.speed) > 20)
  // kecepatan aman ≈ laju belok × radius
  const safe = worst > 1e-4 ? (1.5 + skill * 0.2) / worst : Infinity
  const brake = k.speed > safe + 2
  return { steer, gas: !brake, brake, drift }
}
