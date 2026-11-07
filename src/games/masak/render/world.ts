import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CELL, type Layout } from '../kitchens'
import type { Kit } from '../sim/kitchen'
import { ANIMALS, type KitchenId } from '../types'
import { Koki } from './koki'
import type { KitchenScene } from './scene'

/**
 * Dunia hidup di luar dinding dapur, murni tampilan di tiap HP (bukan state jaringan):
 * pelanggan antre di loket mengikuti pesanan, pejalan kaki, kendaraan, burung, ikan, pinguin,
 * dan benda yang melintas di dapur yang melaju (kereta, truk).
 * Koordinat dapur: x kanan, z ke arah kamera (depan), sama dengan Layout.
 */

type Mood = 'arrive' | 'wait' | 'happy' | 'sad' | 'leave'
type Customer = { id: number; k: Koki; root: THREE.Object3D; mood: Mood; t: number; slot: number }
type Walker = { k: Koki; root: THREE.Object3D; path: THREE.Vector3[]; i: number; wait: number }
type Drifter = { o: THREE.Object3D; v: THREE.Vector3; span: [number, number]; bob?: number; phase: number }

const SHIRTS = ['#7fb3ff', '#ffb3d1', '#b6e388', '#ffd27a', '#c9a7ff', '#8fe0d4', '#ff9f80', '#f2f2f2']
const NPC_SCALE = 1.25
const WALK = 1.5

/** dapur dengan antrean pelanggan, pejalan, dan isi lainnya */
const LIFE: Record<KitchenId, { queue: boolean; walkers: number; cars?: boolean; birds?: number; koi?: boolean; penguins?: number; pass?: string[]; passSpeed?: number; passY?: number; buoys?: boolean }> = {
  burger: { queue: true, walkers: 2, cars: true, birds: 3 },
  pizza: { queue: true, walkers: 1, birds: 5 },
  sushi: { queue: true, walkers: 2, koi: true, birds: 2 },
  ramen: { queue: false, walkers: 0, pass: ['lewat_tiang', 'lewat_pohon', 'lewat_batu'], passSpeed: 7, passY: -1.15, birds: 2 },
  taco: { queue: false, walkers: 0, pass: ['lewat_kaktus', 'lewat_batu', 'lewat_rambu'], passSpeed: 9, passY: -0.98 },
  es: { queue: true, walkers: 1, penguins: 4 },
  kapal: { queue: false, walkers: 0, birds: 4, buoys: true },
  lava: { queue: true, walkers: 0 },
}

export class World {
  private group: THREE.Group
  private kitchen: KitchenId
  private gltf: GLTF
  private shadows: boolean
  private customers = new Map<number, Customer>()
  private walkers: Walker[] = []
  private drifters: Drifter[] = []
  private birds: { o: THREE.Object3D; wings: THREE.Object3D[]; c: THREE.Vector3; r: number; w: number; a: number; y: number }[] = []
  private fish: { o: THREE.Object3D; c: THREE.Vector3; r: number; w: number; a: number }[] = []
  private penguins: { o: THREE.Object3D; to: THREE.Vector3; wait: number; phase: number }[] = []
  private time = 0
  private acc = 0
  private seed = 1
  /** titik loket (luar dinding), arah antrean */
  private window = new THREE.Vector3()
  private ex: number
  private hz: number

  constructor(scene: KitchenScene, L: Layout, kitchen: KitchenId, gltf: GLTF, detail: number) {
    this.group = scene.outdoor
    this.kitchen = kitchen
    this.gltf = gltf
    this.shadows = scene.shadows
    this.ex = (L.w * CELL) / 2 + 0.2
    this.hz = (L.h * CELL) / 2
    const serve = L.stations.filter((s) => s.kind === 'serve')
    const zs = serve.length ? serve.reduce((a, s) => a + s.z, 0) / serve.length : 0
    this.window.set(this.ex + 0.75, 0, zs)
    const life = LIFE[kitchen]
    for (let i = 0; i < Math.round(life.walkers * detail); i++) this.addWalker(i)
    if (life.cars) for (let i = 0; i < 3; i++) this.addCar(scene, i)
    for (let i = 0; i < Math.max(detail > 0 ? 1 : 0, Math.round((life.birds ?? 0) * detail)); i++) this.addBird(i)
    if (life.koi) for (let i = 0; i < 4; i++) this.addKoi(i)
    for (let i = 0; i < Math.round((life.penguins ?? 0) * Math.max(0.5, detail)); i++) this.addPenguin(scene, i)
    if (life.buoys) this.addBuoys(scene)
    if (life.pass) for (let i = 0; i < 10; i++) this.pass(scene, (i / 10) * 60 - 30)
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647
    return this.seed / 2147483647
  }

  private npc(animal = ANIMALS[Math.floor(this.rand() * ANIMALS.length)]) {
    const k = new Koki(this.gltf, animal, '#ffffff', this.shadows, SHIRTS[Math.floor(this.rand() * SHIRTS.length)])
    k.root.scale.setScalar(NPC_SCALE)
    const root = new THREE.Group()
    root.add(k.root)
    this.group.add(root)
    return { k, root }
  }

  // ---------- pelanggan ----------
  /** titik antrean ke-n: dari loket ke kanan lalu turun ke arah kamera */
  private slot(n: number, out = new THREE.Vector3()) {
    const w = this.window
    if (n === 0) return out.set(w.x + 0.35, 0, w.z)
    return out.set(w.x + 1.25 + Math.min(n - 1, 1) * 0.1, 0, w.z + n * 0.95)
  }

  private spawnPoint(out = new THREE.Vector3()) {
    return out.set(this.ex + 5.5, 0, this.hz + 3.5)
  }

  private exitPoint(out = new THREE.Vector3()) {
    return out.set(this.ex + 6, 0, this.window.z - 6)
  }

  private syncQueue(k: Kit) {
    const ids = new Set(k.orders.map((o) => o.id))
    // pesanan baru: pelanggan datang
    k.orders.forEach((o) => {
      if (this.customers.has(o.id)) return
      const { k: kk, root } = this.npc()
      this.spawnPoint(root.position)
      this.customers.set(o.id, { id: o.id, k: kk, root, mood: 'arrive', t: 0, slot: 0 })
    })
    // pesanan hilang: tersaji (masih ada waktu) = senang, habis waktu = sedih
    for (const c of this.customers.values()) {
      if (ids.has(c.id) || c.mood === 'happy' || c.mood === 'sad' || c.mood === 'leave') continue
      const o = this.lastOrders.get(c.id)
      const left = o ? o.born + o.life - k.t : 0
      c.mood = left > 300 ? 'happy' : 'sad'
      c.t = 0
      c.k.playFull(c.mood === 'happy' ? 'cheer' : 'sad')
    }
    this.lastOrders = new Map(k.orders.map((o) => [o.id, { born: o.born, life: o.life }]))
    // urutan antrean = urutan pesanan
    k.orders.forEach((o, i) => {
      const c = this.customers.get(o.id)
      if (c) c.slot = i
    })
  }

  private lastOrders = new Map<number, { born: number; life: number }>()

  private stepCustomers(dt: number) {
    const tgt = new THREE.Vector3()
    for (const c of [...this.customers.values()]) {
      c.t += dt
      if (c.mood === 'happy' || c.mood === 'sad') {
        if (c.t > 1.3) {
          c.mood = 'leave'
          c.k.playFull(null)
        }
        this.face(c.root, this.window, dt)
        c.k.update(dt)
        continue
      }
      if (c.mood === 'leave') this.exitPoint(tgt)
      else this.slot(c.slot, tgt)
      const moved = this.walkTo(c.root, tgt, dt, c.mood === 'leave' ? WALK * 1.2 : WALK)
      if (!moved && c.mood !== 'leave') {
        c.mood = 'wait'
        // menunggu sambil menghadap loket; yang paling depan sesekali bergoyang tak sabar
        this.face(c.root, c.slot === 0 ? this.window.clone().setX(this.window.x - 1) : this.slot(c.slot - 1, new THREE.Vector3()), dt)
      }
      if (!moved && c.mood === 'leave') {
        this.group.remove(c.root)
        this.customers.delete(c.id)
        continue
      }
      c.k.play(moved ? 'walk' : 'idle', moved ? 1.1 : 1)
      c.k.playHands(moved ? 'h_walk' : 'h_idle')
      c.k.update(dt)
    }
  }

  /** berjalan lurus ke titik; false kalau sudah sampai */
  private walkTo(o: THREE.Object3D, to: THREE.Vector3, dt: number, speed: number) {
    const dx = to.x - o.position.x
    const dz = to.z - o.position.z
    const d = Math.hypot(dx, dz)
    if (d < 0.05) return false
    const s = Math.min(d, speed * dt)
    o.position.x += (dx / d) * s
    o.position.z += (dz / d) * s
    const yaw = Math.atan2(dx, dz)
    o.rotation.y += Math.atan2(Math.sin(yaw - o.rotation.y), Math.cos(yaw - o.rotation.y)) * Math.min(1, dt * 10)
    return true
  }

  private face(o: THREE.Object3D, at: THREE.Vector3, dt: number) {
    const yaw = Math.atan2(at.x - o.position.x, at.z - o.position.z)
    o.rotation.y += Math.atan2(Math.sin(yaw - o.rotation.y), Math.cos(yaw - o.rotation.y)) * Math.min(1, dt * 6)
  }

  // ---------- pejalan kaki ----------
  private addWalker(i: number) {
    const { k, root } = this.npc()
    const z = this.hz + 1.4 + i * 0.7
    const x0 = -this.ex - 7
    const x1 = this.ex + 7
    const path = i % 2 ? [new THREE.Vector3(x1, 0, z), new THREE.Vector3(x0, 0, z)] : [new THREE.Vector3(x0, 0, z), new THREE.Vector3(x1, 0, z)]
    // pejalan di depan bisa menutupi konter terdepan: lewat di belakang gedung untuk dapur bertembok tinggi
    if (this.kitchen !== 'burger' && i > 0) path.forEach((p) => (p.z = -this.hz - 1.2))
    root.position.copy(path[0]).lerp(path[1], this.rand())
    this.walkers.push({ k, root, path, i: 1, wait: 0 })
  }

  private stepWalkers(dt: number) {
    for (const w of this.walkers) {
      if (w.wait > 0) {
        w.wait -= dt
        w.k.play('idle')
        w.k.playHands('h_idle')
      } else if (!this.walkTo(w.root, w.path[w.i], dt, 1.1)) {
        w.i = (w.i + 1) % w.path.length
        w.wait = 1 + this.rand() * 2
      } else {
        w.k.play('walk')
        w.k.playHands('h_walk')
      }
      w.k.update(dt)
    }
  }

  // ---------- kendaraan, benda melintas, pelampung ----------
  private clone(scene: KitchenScene, name: string) {
    const t = scene.templates.get(name)
    if (!t) return null
    const o = t.clone()
    o.traverse((m) => ((m as THREE.Mesh).castShadow = this.shadows))
    this.group.add(o)
    return o
  }

  private addCar(scene: KitchenScene, i: number) {
    const o = this.clone(scene, `lewat_mobil_${i % 4}`)
    if (!o) return
    // jalan kecil di belakang gedung dapur (terlihat di atas dinding belakang)
    const lane = i % 2
    const z = -this.hz - (lane ? 2.2 : 3.4)
    const dir = lane ? 1 : -1
    o.position.set((this.rand() - 0.5) * 30, -0.1, z)
    o.rotation.y = dir > 0 ? 0 : Math.PI
    this.drifters.push({ o, v: new THREE.Vector3(dir * (4 + this.rand() * 2.5), 0, 0), span: [-24, 24], phase: 0 })
  }

  private pass(scene: KitchenScene, x: number) {
    const life = LIFE[this.kitchen]
    const names = life.pass ?? []
    const o = this.clone(scene, names[Math.floor(this.rand() * names.length)])
    if (!o) return
    const front = this.rand() < 0.5
    const z = front ? this.hz + 2.8 + this.rand() * 4 : -this.hz - 3 - this.rand() * 5
    o.position.set(x, life.passY ?? 0, z)
    o.rotation.y = this.rand() * Math.PI * 2
    o.scale.setScalar(0.8 + this.rand() * 0.5)
    this.drifters.push({ o, v: new THREE.Vector3(-(life.passSpeed ?? 6), 0, 0), span: [-32, 32], phase: 0 })
  }

  private addBuoys(scene: KitchenScene) {
    for (const [x, z] of [
      [-this.ex - 5, this.hz + 3],
      [this.ex + 6, -2],
      [-this.ex - 8, -this.hz - 5],
    ]) {
      const o = this.clone(scene, 'bobot_pelampung')
      if (!o) continue
      o.position.set(x, 0, z)
      this.drifters.push({ o, v: new THREE.Vector3(), span: [-99, 99], bob: 0.25, phase: this.rand() * 6 })
    }
    const ship = this.clone(scene, 'lewat_kapal')
    if (ship) {
      ship.position.set(-30, 0, -this.hz - 14)
      this.drifters.push({ o: ship, v: new THREE.Vector3(1.2, 0, 0), span: [-34, 34], bob: 0.3, phase: 0 })
    }
  }

  private stepDrifters(dt: number) {
    for (const d of this.drifters) {
      d.o.position.addScaledVector(d.v, dt)
      if (d.v.x > 0 && d.o.position.x > d.span[1]) d.o.position.x = d.span[0]
      if (d.v.x < 0 && d.o.position.x < d.span[0]) d.o.position.x = d.span[1]
      if (d.bob) {
        d.phase += dt
        d.o.position.y = Math.sin(d.phase * 1.3) * d.bob
        d.o.rotation.z = Math.sin(d.phase * 0.9) * 0.12
      }
    }
  }

  // ---------- burung, koi, pinguin ----------
  private addBird(i: number) {
    const mat = new THREE.MeshStandardMaterial({ color: this.kitchen === 'kapal' ? '#f4f4f0' : '#6b5d57', roughness: 0.7 })
    const o = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 4, 8), mat)
    body.rotation.x = Math.PI / 2
    const wings = [-1, 1].map((s) => {
      const p = new THREE.Group()
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.16), mat)
      w.position.x = s * 0.22
      p.add(w)
      o.add(p)
      return p
    })
    o.add(body)
    this.group.add(o)
    const c = new THREE.Vector3((this.rand() - 0.5) * 16, 0, -this.hz - 1 + (this.rand() - 0.5) * 6)
    this.birds.push({ o, wings, c, r: 4 + this.rand() * 5, w: (0.25 + this.rand() * 0.2) * (i % 2 ? 1 : -1), a: this.rand() * 6.28, y: 4.5 + this.rand() * 2 })
  }

  private addKoi(i: number) {
    const mat = new THREE.MeshStandardMaterial({ color: i % 2 ? '#ff7a2a' : '#fff4e8', emissive: i % 2 ? '#ff5a10' : '#ffffff', emissiveIntensity: 0.15, roughness: 0.4 })
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 8), mat)
    o.rotation.z = Math.PI / 2
    const g = new THREE.Group()
    g.add(o)
    this.group.add(g)
    // kolam di kiri depan (masak_luar.py sushi)
    const c = new THREE.Vector3(-this.ex - 3.2, -0.22, this.hz - 1.4)
    this.fish.push({ o: g, c, r: 0.6 + this.rand() * 1.1, w: (0.5 + this.rand() * 0.4) * (i % 2 ? 1 : -1), a: this.rand() * 6.28 })
  }

  private addPenguin(scene: KitchenScene, i: number) {
    const o = this.clone(scene, 'bobot_pinguin')
    if (!o) return
    o.scale.setScalar(1.3)
    o.position.set(-this.ex - 2 - this.rand() * 5, 0, -2 + i * 1.4)
    this.penguins.push({ o, to: o.position.clone(), wait: this.rand() * 2, phase: this.rand() * 6 })
  }

  private stepCritters(dt: number) {
    for (const b of this.birds) {
      b.a += b.w * dt
      b.o.position.set(b.c.x + Math.cos(b.a) * b.r, b.y + Math.sin(this.time * 0.7 + b.r) * 0.3, b.c.z + Math.sin(b.a) * b.r * 0.5)
      b.o.rotation.y = -b.a + (b.w > 0 ? 0 : Math.PI)
      const f = Math.sin(this.time * 14 + b.r * 3) * 0.7
      b.wings[0].rotation.z = f
      b.wings[1].rotation.z = -f
    }
    for (const f of this.fish) {
      f.a += f.w * dt
      f.o.position.set(f.c.x + Math.cos(f.a) * f.r, f.c.y, f.c.z + Math.sin(f.a) * f.r * 0.8)
      f.o.rotation.y = -f.a + (f.w > 0 ? 0 : Math.PI)
      f.o.rotation.x = Math.sin(this.time * 8 + f.r * 5) * 0.25
    }
    for (const p of this.penguins) {
      p.phase += dt
      if (p.wait > 0) {
        p.wait -= dt
        p.o.rotation.z = 0
        continue
      }
      if (!this.walkTo(p.o, p.to, dt, 0.7)) {
        p.wait = 1 + this.rand() * 3
        p.to.set(-this.ex - 1.5 - this.rand() * 6, 0, -this.hz + this.rand() * (this.hz * 2 + 2))
      }
      // jalan bergoyang khas pinguin
      p.o.rotation.z = Math.sin(p.phase * 9) * 0.18
      p.o.position.y = Math.abs(Math.sin(p.phase * 9)) * 0.03
    }
  }

  private tick = 0

  update(k: Kit, dt: number) {
    this.time += dt
    // NPC & hewan di luar dapur cukup diperbarui setengah frekuensi
    this.tick++
    this.acc += dt
    if (this.tick % 2) return
    dt = this.acc
    this.acc = 0
    if (LIFE[this.kitchen].queue) {
      this.syncQueue(k)
      this.stepCustomers(dt)
    }
    this.stepWalkers(dt)
    this.stepDrifters(dt)
    this.stepCritters(dt)
  }
}
