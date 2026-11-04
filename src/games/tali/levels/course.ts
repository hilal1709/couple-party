// Penyambung level: bagian-bagian siap pakai (parit, tembok, pintu, kait, batu rapuh, lift, perahu, pintu berat)
// yang menambah geometri sekaligus rute buktinya. Ukurannya diatur per level untuk kurva kesulitan.
// Kursor = ujung kanan pijakan terakhir (x) dan tinggi permukaannya (y). Onde (0) di depan, Klepon (1) di belakang.
import type { Cmd } from '../sim/duo'
import type { Hazard, HazardKind, LevelDef, Skin } from './types'
import { door, ground, hazard, ledge, plank } from './kit'

export class Course {
  x: number
  y: number
  readonly route: Cmd[] = []
  readonly def: LevelDef
  private skin: Skin
  private pit: HazardKind
  private tipped = new Set<string>()

  constructor(def: LevelDef, skin: Skin, pit: HazardKind) {
    this.def = def
    this.skin = skin
    this.pit = pit
    // mulai dari ujung pijakan terakhir level lama; gerbang lama jadi checkpoint
    const last = def.solids[def.solids.length - 1]
    this.x = last.b[0] + last.b[2]
    this.y = last.b[1] + last.b[3]
    def.checkpoints.push([def.goal[0], def.goal[1]])
  }

  private get L() {
    return this.def
  }

  private pitBelow(x0: number, x1: number, top = this.y - 0.6): Hazard {
    return hazard(x0, x1, top, this.pit)
  }

  /** petunjuk untuk mode berdua, sekali per jenis bagian di tiap level */
  private hint(kind: string, text: string) {
    if (this.tipped.has(kind)) return
    this.tipped.add(kind)
    this.L.tips.push([this.x - 5, text])
  }

  say(text: string) {
    this.route.push({ say: text })
    return this
  }

  tip(text: string, dx = -6) {
    this.L.tips.push([this.x + dx, text])
    return this
  }

  candy(dx: number, dy: number) {
    this.L.candy.push([this.x + dx, this.y + dy])
    return this
  }

  checkpoint(dx = -3) {
    this.L.checkpoints.push([this.x + dx, this.y])
    return this
  }

  /** jalan datar sepanjang `len` */
  flat(len: number) {
    this.L.solids.push(ground(this.x, this.x + len, this.y, this.skin))
    this.x += len
    this.route.push({ par: [{ w: 0, go: this.x - 0.6 }, { w: 1, go: this.x - 1.4 }] })
    return this
  }

  /** parit selebar `w` (≤ 3 m), dilompati berdua */
  gap(w: number, land = 6) {
    const x0 = this.x
    this.L.hazards.push(this.pitBelow(x0, x0 + w))
    this.L.solids.push(ground(x0 + w, x0 + w + land, this.y, this.skin))
    this.route.push({ par: [{ w: 0, go: x0 - 0.6 }, { w: 1, go: x0 - 1.4 }] })
    this.route.push({ par: [{ w: 0, to: x0 + w + 2.2, at: x0 - 0.3 }, { w: 1, to: x0 + w + 1.4, at: x0 - 0.3 }] })
    this.x = x0 + w + land
    return this
  }

  /** undakan naik setinggi `h` (≤ 1,3 m) */
  up(h: number, len = 5) {
    const x0 = this.x
    this.L.solids.push(ground(x0, x0 + len, this.y + h, this.skin))
    this.route.push({ par: [{ w: 0, go: x0 - 0.8 }, { w: 1, go: x0 - 1.8 }] })
    this.route.push({ par: [{ w: 0, to: x0 + 1.6, at: x0 - 0.55 }, { w: 1, to: x0 + 0.8, at: x0 - 0.55 }] })
    this.y += h
    this.x = x0 + len
    return this
  }

  /** turun setinggi `h` */
  down(h: number, len = 5) {
    const x0 = this.x
    this.y -= h
    this.L.solids.push(ground(x0, x0 + len, this.y, this.skin))
    this.route.push({ par: [{ w: 0, go: x0 + 1.8 }, { w: 1, go: x0 + 1 }] })
    this.x = x0 + len
    return this
  }

  /** tembok setinggi `h` (1,9–2,3 m): Klepon naik ke kepala Onde, lalu menariknya */
  wall(h: number, len = 7) {
    const x0 = this.x
    this.hint('wall', 'Tembok tinggi: satu naik ke kepala pasangan, lalu Pegang + Gulung untuk menarik')
    this.L.solids.push(ground(x0, x0 + len, this.y + h, this.skin))
    const top = this.y + h
    this.say('Tembok tinggi! Berdiri mepet tembok, aku naik ke kepalamu.')
    this.route.push({ par: [{ w: 0, go: x0 - 0.7 }, { w: 1, go: x0 - 3.6 }] })
    this.route.push({ w: 1, to: x0 - 0.7, at: x0 - 2.4, tol: 0.5 }, { w: 1, jump: 1, t: 0.7 }, { w: 1, go: x0 + 1.6 })
    this.say('Aku sudah di atas. Diam ya, aku tarik!')
    this.route.push({ w: 1, hold: true }, { w: 1, reel: true }, { until: (d) => d.clients[0].body.y > top + 0.3 && d.clients[0].body.x > x0 + 0.2, max: 6 }, { w: 1, reel: false }, { w: 1, hold: false })
    this.L.candy.push([x0 + 0.4, top + 1.4])
    this.y = top
    this.x = x0 + len
    return this
  }

  /** pintu bambu dengan tombol di kedua sisi: gantian jaga tombol */
  door(skin: Skin = 'bambu') {
    const x0 = this.x
    this.hint('door', 'Gantian jaga tombol supaya pintunya tetap terbuka')
    const g = this.nextGroup()
    this.L.solids.push(ground(x0, x0 + 9, this.y, this.skin), door(x0 + 4, this.y, this.y + 4.7, g, skin))
    this.L.buttons.push({ x: x0 + 2, y: this.y, g }, { x: x0 + 6.1, y: this.y, g })
    this.say('Aku injak tombol. Kamu lewat pintu, lalu injak tombol satunya!')
    this.route.push({ par: [{ w: 0, go: x0 + 0.8 }, { w: 1, go: x0 }] }, { w: 1, go: x0 + 2 }, { w: 0, go: x0 + 6.1 }, { w: 1, go: x0 + 7 }, { w: 0, go: x0 + 7.8 })
    this.x = x0 + 9
    return this
  }

  /** pintu berat: tombol harus diinjak berdua, lalu lari lewat bawah pintu */
  heavy(skin: Skin = 'logam') {
    const x0 = this.x
    this.hint('heavy', 'Tombol berat: injak berdua, lalu lari lewat bawah pintu')
    const g = this.nextGroup()
    const di = this.L.solids.length + 1
    this.L.solids.push(ground(x0, x0 + 10, this.y, this.skin), door(x0 + 5.2, this.y, this.y + 3, g, skin), ground(x0 + 4.95, x0 + 5.45, this.y + 11, this.skin))
    this.L.buttons.push({ x: x0 + 1.8, y: this.y, w: 1.8, g, need: 2 })
    this.say('Tombol berat! Injak berdua, lalu lari lewat pintu.')
    this.route.push({ par: [{ w: 0, go: x0 + 2.3 }, { w: 1, go: x0 + 1.3 }] }, { until: (d) => d.clients[0].rt.live[di].open > 0.99, max: 4 }, { par: [{ w: 0, go: x0 + 9.2 }, { w: 1, go: x0 + 8.4 }] })
    this.x = x0 + 10
    return this
  }

  /** rantai `n` kait (berjarak 3 m) di atas jurang */
  hooks(n: number, land = 6) {
    const x0 = this.x
    this.hint('hooks', 'Kait di atas jurang: satu-satu, saling tunggu')
    const hy = this.y + 2.5
    const hx = Array.from({ length: n }, (_, i) => x0 + 2.1 + 3 * i)
    const end = hx[n - 1] + 2.4
    this.L.hooks.push(...hx.map((x) => [x, hy] as [number, number]))
    this.L.hazards.push(this.pitBelow(x0, end))
    this.L.solids.push(ground(end, end + land, this.y, this.skin))
    this.L.candy.push([hx[Math.floor((n - 1) / 2)] + (n > 1 ? 1.5 : 0), hy + 1.1])
    this.say(n > 1 ? 'Kait berderet! Kamu duluan, aku di belakangmu.' : 'Lompat, Pegang kaitnya, lalu Lompat lagi. Kamu duluan!')
    // kait tunggal: Klepon menunggu di bibir jurang supaya tali cukup saat Onde menyeberang
    this.route.push({ par: [{ w: 0, go: x0 - 1 }, { w: 1, go: n === 1 ? x0 - 0.45 : x0 - 1.8 }] })
    const grab = (w: 0 | 1): Cmd => ({ w, to: hx[0] + 0.6, at: x0 - 0.25, grab: true })
    if (n === 1) {
      this.route.push(grab(0), { w: 0, jump: 1, t: 0.9 }, { w: 0, hold: false }, { w: 1, go: x0 - 1 }, grab(1), { w: 1, jump: 1, t: 0.9 }, { w: 1, hold: false })
    } else {
      this.route.push(grab(0), { w: 1, go: x0 - 1 }, { w: 0, jump: 1, t: 0.7 }, grab(1))
      for (let i = 2; i < n; i++) this.route.push({ w: 0, jump: 1, t: 0.7 }, { w: 1, jump: 1, t: 0.7 })
      this.route.push({ w: 1, jump: 1, t: 0.7 }, { w: 0, jump: 1, t: 0.9 }, { w: 0, hold: false }, { w: 1, jump: 1, t: 0.9 }, { w: 1, hold: false })
    }
    this.x = end + land
    return this
  }

  /** `n` batu rapuh selebar 2 m berjarak 1,5 m: lari dan lompat terus */
  crumble(n: number, land = 6, skin: Skin = this.skin) {
    const x0 = this.x
    this.hint('crumble', 'Batu rapuh! Lompat barengan dan jangan berhenti')
    const start = (i: number) => x0 + 1 + 3.5 * i
    for (let i = 0; i < n; i++) this.L.solids.push(plank(start(i), start(i) + 2, this.y, skin, { crumble: true }))
    const end = start(n - 1) + 2 + 1.5
    this.L.hazards.push(this.pitBelow(x0, end))
    this.L.solids.push(ground(end, end + land, this.y, this.skin))
    this.L.candy.push([start(Math.floor(n / 2)) + 1, this.y + 1.6])
    this.say('Batu rapuh! Lari dan lompat barengan, jangan berhenti.')
    this.route.push({ par: [{ w: 0, go: x0 - 1.6 }, { w: 1, go: x0 - 2.4 }] })
    for (let i = 0; i < n; i++) {
      const at = i === 0 ? x0 - 0.2 : start(i - 1) + 1.8
      this.route.push({ par: [{ w: 0, to: start(i) + 1.2, at }, { w: 1, to: start(i) + 0.6, at }] })
    }
    const at = start(n - 1) + 1.8
    this.route.push({ par: [{ w: 0, to: end + 2.1, at }, { w: 1, to: end + 1.5, at }] })
    this.x = end + land
    return this
  }

  /** lift setinggi `h` (≤ 4 m) dengan tuas di bawah dan di atas */
  lift(h: number, len = 7) {
    const x0 = this.x
    this.hint('lift', 'Satu tarik tuas, satu naik lift. Tuas atas juga menggerakkannya')
    const g = this.nextGroup()
    const li = this.L.solids.length + 1
    this.L.solids.push(ground(x0, x0 + 4, this.y, this.skin), plank(x0 + 4, x0 + 6.4, this.y, 'peti', { lift: { g, d: [0, h] } }), ground(x0 + 6.4, x0 + 6.4 + len, this.y + h, this.skin))
    this.L.hazards.push(this.pitBelow(x0 + 4, x0 + 6.4, this.y - 0.8))
    this.L.levers.push({ x: x0 + 2.8, y: this.y, g }, { x: x0 + 7.6, y: this.y + h, g })
    const top = this.y + h
    this.say('Aku naik lift. Tarik tuas di sebelah sana ya!')
    this.route.push({ par: [{ w: 1, go: x0 + 5.2 }, { w: 0, go: x0 + 2.8 }] }, { w: 0, hold: true }, { w: 0, hold: false }, { until: (d) => d.clients[1].body.y > top + 0.35, max: 6 })
    this.say('Liftnya kuturunkan, naik ya. Nanti kunaikkan!')
    this.route.push({ w: 1, go: x0 + 7.6 }, { w: 1, hold: true }, { w: 1, hold: false }, { until: (d) => d.clients[0].rt.live[li].open < 0.01, max: 6 })
    this.route.push({ w: 0, go: x0 + 5.2 }, { w: 1, hold: true }, { w: 1, hold: false }, { until: (d) => d.clients[0].body.y > top + 0.35, max: 6 })
    this.route.push({ par: [{ w: 0, go: x0 + 6.4 + len - 0.6 }, { w: 1, go: x0 + 6.4 + len - 1.4 }] })
    this.L.candy.push([x0 + 5.2, top + 1.5])
    this.y = top
    this.x = x0 + 6.4 + len
    return this
  }

  /** platform gerak menyeberangi jurang sejauh `dist` (perahu / kereta) */
  mover(dist: number, skin: Skin, land = 6) {
    const x0 = this.x
    this.hint('mover', 'Tunggu platform merapat, lalu naik berdua')
    const mi = this.L.solids.length
    const period = Math.max(7, dist * 1.1)
    this.L.solids.push(plank(x0 + 1, x0 + 5, this.y + (skin === 'perahu' ? 0.2 : 0), skin, { move: { d: [dist, 0], period } }))
    const dock = x0 + 5 + dist + 1.5
    this.L.hazards.push(this.pitBelow(x0, dock))
    this.L.solids.push(ground(dock, dock + land, this.y, this.skin))
    this.L.candy.push([x0 + 3 + dist / 2, this.y + 1.8])
    this.say('Tunggu platformnya merapat, lompat duluan, aku ikut.')
    const left = (d: { clients: { rt: { live: { b: number[]; vx: number }[] } }[] }) => d.clients[0].rt.live[mi]
    this.route.push(
      { par: [{ w: 0, go: x0 - 0.5 }, { w: 1, go: x0 - 1.4 }] },
      { until: (d) => left(d).b[0] < x0 + 1.15 && left(d).b[0] > x0 + 1 && left(d).vx >= 0, max: period + 3 },
      { par: [{ w: 0, to: x0 + 4, at: x0 - 0.3 }, { w: 1, to: x0 + 2.6, at: x0 - 0.3 }] },
      { until: (d) => left(d).b[0] > x0 + 1 + dist - 0.1, max: period + 3 },
      { par: [{ w: 0, to: dock + 3, at: x0 + 5 + dist - 0.5 }, { w: 1, to: dock + 2.2, at: x0 + 5 + dist - 0.5 }] },
    )
    this.x = dock + land
    return this
  }

  /** papan tipis bertingkat yang bisa ditembus dari bawah (lewat ke atas) */
  ledges(len = 8) {
    const x0 = this.x
    this.L.solids.push(ground(x0, x0 + len, this.y, this.skin), ledge(x0 + 2, x0 + 5, this.y + 1.3, 'kayu'))
    this.L.candy.push([x0 + 3.5, this.y + 2.4])
    this.route.push({ par: [{ w: 0, go: x0 + len - 0.6 }, { w: 1, go: x0 + len - 1.4 }] })
    this.x = x0 + len
    return this
  }

  /** gerbang finis */
  finish(len = 12) {
    const x0 = this.x
    this.L.solids.push(ground(x0, x0 + len + 6, this.y, this.skin))
    this.L.goal = [x0 + len - 3, this.y]
    this.L.bounds = [this.L.bounds[0], x0 + len + 4]
    this.L.killY = Math.min(this.L.killY, ...this.L.solids.map((s) => s.b[1] + s.b[3] - 4))
    this.say('Gerbangnya di depan. Ayo bareng!')
    this.route.push({ par: [{ w: 0, go: x0 + len - 2.6 }, { w: 1, go: x0 + len - 3.4 }] })
    return this
  }

  private nextGroup() {
    const d = this.L
    return 1 + Math.max(-1, ...d.buttons.map((b) => b.g), ...d.levers.map((l) => l.g), ...d.wind.map((w) => w.g ?? -1))
  }
}
