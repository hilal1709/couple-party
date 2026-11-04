// Adegan satu level: langit, cahaya, tanah organik, bahaya, benda gerak, kit interaktif, hiasan, karakter, tali.
import * as THREE from 'three'
import type { Tier } from '@/games/kart/render/quality'
import type { LevelDef, SolidDef } from '../levels/types'
import type { LevelRuntime } from '../sim/level'
import { R } from '../sim/physics'
import type { TaliState } from '../types'
import { cloneKit, loadChar, loadKit, loadSky, loadTex, setAnisotropy, type Kit, type TexPair } from './assets'
import { Actor } from './actor'
import { Fx } from './fx'
import { RopeView } from './rope'
import { beltMaterial, gradientSky, groundMaterial } from './shaders'
import { BACK, buildHazards, buildStatic, FRONT, isDynamic, makeLooks, placeScatter, scatterProps, solidGeometry, surfaceAt, texNeeds, tuneKitMaterial, type Looks } from './terrain'
import { THEMES, type Theme } from './themes'

type Dyn = { i: number; obj: THREE.Object3D; def: SolidDef; base: THREE.Vector3; mats: THREE.Material[] }

export type StageParts = {
  buttons: { cap: THREE.Object3D; y: number; down: number }[]
  levers: { arm: THREE.Object3D; on: number }[]
  candy: THREE.Object3D[]
  flags: THREE.Object3D[]
}

function own(o: THREE.Object3D, shadows: boolean) {
  o.traverse((c) => {
    const m = c as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = shadows
    m.receiveShadow = shadows
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    mats.forEach((x) => tuneKitMaterial(x))
  })
  return o
}

export class Stage {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600)
  readonly theme: Theme
  readonly fx: Fx
  actors: Actor[] = []
  rope!: RopeView
  private sun = new THREE.DirectionalLight()
  private lantern: THREE.PointLight | null = null
  private dyn: Dyn[] = []
  private wheel: THREE.Object3D | null = null
  private wheelPeriod = 14
  parts: StageParts = { buttons: [], levers: [], candy: [], flags: [] }
  private looks!: Looks
  private vents: { x: number; y: number; g?: number; w: number }[] = []
  private winds: { b: [number, number, number, number]; fx: number; fy: number; g?: number }[] = []
  private emitT = 0
  private t = 0
  private camX = 0
  private camY = 0
  private camD = 14
  private flagDone: boolean[] = []

  readonly def: LevelDef
  readonly tier: Tier

  private constructor(def: LevelDef, tier: Tier) {
    this.def = def
    this.tier = tier
    this.theme = THEMES[def.id]
    this.fx = new Fx(tier.particles)
  }

  static async create(def: LevelDef, tier: Tier, maxAniso: number): Promise<Stage> {
    const s = new Stage(def, tier)
    setAnisotropy(Math.min(8, maxAniso))
    const th = s.theme
    const needs = texNeeds(th, def)
    const [kit, onde, klepon, sky, ...texs] = await Promise.all([loadKit(), loadChar('onde'), loadChar('klepon'), th.sky ? loadSky(th.sky) : Promise.resolve(null), ...needs.map((n) => loadTex(n as never))])
    const tex = new Map<string, TexPair>(needs.map((n, i) => [n, texs[i] as TexPair]))
    s.build(kit, tex, sky as THREE.Texture | null, onde, klepon)
    return s
  }

  private build(kit: Kit, tex: Map<string, TexPair>, sky: THREE.Texture | null, onde: Awaited<ReturnType<typeof loadChar>>, klepon: Awaited<ReturnType<typeof loadChar>>) {
    const { def, theme: th, scene } = this
    const sh = this.tier.shadow > 0
    // langit & kabut
    if (sky) {
      scene.background = sky
      scene.environment = sky
      scene.environmentIntensity = th.env
      scene.backgroundIntensity = th.sky === 'malam' ? 0.7 : 1
    } else if (th.grad) {
      scene.add(gradientSky(th.grad[0], th.grad[1]))
      scene.background = new THREE.Color(th.grad[1])
    }
    scene.fog = new THREE.Fog(th.fog, th.fogNear * this.tier.far, th.fogFar * this.tier.far)
    // cahaya
    this.sun.color.set(th.sun.color)
    this.sun.intensity = th.sun.intensity
    if (sh) {
      this.sun.castShadow = true
      this.sun.shadow.mapSize.set(this.tier.shadow, this.tier.shadow)
      const c = this.sun.shadow.camera
      c.left = -20
      c.right = 20
      c.top = 14
      c.bottom = -10
      c.near = 1
      c.far = 80
      this.sun.shadow.bias = -0.0005
      this.sun.shadow.normalBias = 0.03
    }
    scene.add(this.sun, this.sun.target)
    scene.add(new THREE.HemisphereLight(th.sky === 'malam' || !th.sky ? '#8090ff' : '#cfe8ff', '#6a5a48', th.ambient))
    this.looks = makeLooks(th, tex)

    // tanah latar dan dinding latar
    const fl = tex.get(th.floor.tex)!
    const floorMat = groundMaterial({ map: fl.map, normal: fl.normal, scale: th.floor.scale, tint: th.floor.tint, gain: th.floor.gain, deep: 0 })
    const fg = new THREE.PlaneGeometry(def.bounds[1] - def.bounds[0] + 400, 220, 1, 1)
    fg.rotateX(-Math.PI / 2)
    fg.translate((def.bounds[0] + def.bounds[1]) / 2, th.floor.y, BACK - 110)
    fg.setAttribute('aTop', new THREE.BufferAttribute(new Float32Array(fg.getAttribute('position').count).fill(th.floor.y), 1))
    const floor = new THREE.Mesh(fg, floorMat)
    floor.receiveShadow = sh
    scene.add(floor)
    if (th.wall) {
      const w = tex.get(th.wall.look.tex)!
      const wm = groundMaterial({ map: w.map, normal: w.normal, scale: th.wall.look.scale, tint: th.wall.look.tint, gain: th.wall.look.gain, deep: 0 })
      const box: [number, number, number, number] = [def.bounds[0] - 30, th.wall.y0, def.bounds[1] - def.bounds[0] + 60, th.wall.y1 - th.wall.y0]
      const wg = solidGeometry(box, 3, th.wall.z, th.wall.z - 3)
      const wall = new THREE.Mesh(wg, wm)
      wall.receiveShadow = sh
      scene.add(wall)
      if (th.wall.ceil !== undefined) {
        const cg = solidGeometry([def.bounds[0] - 30, th.wall.ceil, def.bounds[1] - def.bounds[0] + 60, 4], 9, FRONT + 1, th.wall.z)
        scene.add(new THREE.Mesh(cg, wm))
      }
    }

    scene.add(buildStatic(def, this.looks, sh))
    // ban berjalan: lapisan sabuk bergaris di atas pijakannya, plus rol di kedua ujung
    for (const s of def.solids) {
      if (!s.belt) continue
      const [x, y, w, h] = s.b
      const belt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.12, FRONT - BACK - 0.6), beltMaterial(s.belt))
      belt.position.set(x + w / 2, y + h - 0.04, (FRONT + BACK) / 2)
      belt.receiveShadow = sh
      scene.add(belt)
      for (const ex of [x + 0.25, x + w - 0.25]) {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, FRONT - BACK - 0.4, 16), new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.9, roughness: 0.3 }))
        roll.rotation.x = Math.PI / 2
        roll.position.set(ex, y + h - 0.2, (FRONT + BACK) / 2)
        scene.add(roll)
      }
    }
    scene.add(buildHazards(def, th, sh))
    this.buildDynamic(kit, sh)
    this.buildKit(kit, sh)

    // hiasan: bibir depan, latar, dan benda jauh
    const sway = new Set([...th.lip, ...th.back].filter((x) => x.sway).map((x) => x.name))
    const seed = def.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)
    const lip = placeScatter(def, th.lip.map((l) => ({ ...l, per10: l.per10 * this.tier.detail })), (x) => surfaceAt(def, x), seed)
    const back = placeScatter(def, th.back.map((l) => ({ ...l, per10: l.per10 * this.tier.props })), () => th.floor.y, seed + 1)
    scene.add(scatterProps(kit, [...lip, ...back], sh, sway))
    for (const [name, fx, z, s] of th.far) {
      if (!kit.has(name)) continue
      const o = own(cloneKit(kit, name), false)
      o.position.set(def.bounds[0] + (def.bounds[1] - def.bounds[0]) * fx, th.floor.y - 0.5, z)
      o.scale.setScalar(s)
      scene.add(o)
    }

    // karakter, tali, partikel
    this.actors = [new Actor(onde, '#ffd2ea', sh), new Actor(klepon, '#d8ffc8', sh)]
    for (const a of this.actors) scene.add(a.root, a.blob)
    this.rope = new RopeView(sh)
    scene.add(this.rope.mesh, this.fx.group)
    if (def.dark) {
      this.lantern = new THREE.PointLight('#ffc87a', 12, 12, 1.4)
      this.lantern.castShadow = false
      scene.add(this.lantern)
      const glow = new THREE.PointLight('#b8ff9a', 2.5, 5, 1.8)
      this.actors[1].root.add(glow)
      glow.position.set(0, 0.6, 0.6)
    }
    this.winds = def.wind.map((w) => ({ b: w.b, fx: w.fx, fy: w.fy, g: w.g }))
    this.vents = def.wind.filter((w) => w.fy > 0).map((w) => ({ x: w.b[0] + w.b[2] / 2, y: w.b[1], g: w.g, w: w.b[2] }))
    for (const v of this.vents) {
      const o = own(cloneKit(kit, 'ventilasi'), sh)
      o.position.set(v.x, v.y, 0)
      o.scale.set(v.w / 2.4, 1, 1)
      scene.add(o)
    }
  }

  /** benda gerak: perahu, gondola, kereta, lift, pintu, batu rapuh */
  private buildDynamic(kit: Kit, sh: boolean) {
    const { def, scene } = this
    def.solids.forEach((s, i) => {
      if (!isDynamic(s)) return
      const [x, y, w, h] = s.b
      let obj: THREE.Object3D
      const top = new THREE.Vector3(x + w / 2, y + h, 0)
      if (s.orbit) {
        obj = own(cloneKit(kit, 'gondola'), sh)
        obj.scale.set(w / 3, 1, 1)
        if (!this.wheel && kit.has('bianglala_roda')) {
          this.wheel = own(cloneKit(kit, 'bianglala_roda'), sh)
          this.wheel.position.set(s.orbit.c[0], s.orbit.c[1] + 1.95, -1.4)
          this.wheelPeriod = s.orbit.period
          const legs = own(cloneKit(kit, 'bianglala_kaki'), sh)
          legs.position.copy(this.wheel.position)
          scene.add(this.wheel, legs)
        }
      } else if (s.k === 'perahu') {
        obj = own(cloneKit(kit, 'perahu'), sh)
        obj.scale.set(w / 4, 1, 1)
      } else if (s.move && s.k === 'logam') {
        obj = own(cloneKit(kit, 'kereta'), sh)
        obj.scale.set(w / 2.6, 1, 1)
      } else if (s.lift && (s.k === 'peti' || s.k === 'logam')) {
        obj = own(cloneKit(kit, 'lift'), sh)
        obj.scale.set(w / 2.4, 1, 1)
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 30, 5), new THREE.MeshStandardMaterial({ color: '#333', metalness: 0.8, roughness: 0.4 }))
        cable.position.set(0, 15, -0.5)
        obj.add(cable)
      } else {
        const g = solidGeometry(s.b, i * 3.1 + 2, s.door !== undefined ? 0.45 : 0.8, s.door !== undefined ? -0.45 : -0.8)
        g.translate(-top.x, -top.y, 0)
        const mesh = new THREE.Mesh(g, s.crumble ? this.looks(s.k).mat.clone() : this.looks(s.k).mat)
        mesh.castShadow = sh
        mesh.receiveShadow = sh
        obj = mesh
      }
      obj.position.copy(top)
      const mats: THREE.Material[] = []
      obj.traverse((c) => {
        const m = c as THREE.Mesh
        if (m.isMesh) mats.push(...(Array.isArray(m.material) ? m.material : [m.material]))
      })
      scene.add(obj)
      this.dyn.push({ i, obj, def: s, base: top, mats })
    })
  }

  /** kait, tombol, tuas, checkpoint, permen, gerbang, papan petunjuk */
  private buildKit(kit: Kit, sh: boolean) {
    const { def, theme: th, scene } = this
    const lineMat = new THREE.MeshStandardMaterial({ color: th.hook === 'lampu' ? '#222' : '#c9a06a', roughness: 0.8 })
    def.hooks.forEach(([x, y], i) => {
      const o = own(cloneKit(kit, th.hook), sh)
      o.position.set(x, y, 0)
      scene.add(o)
      if (th.hookLine === 'atas') {
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 14, 5), lineMat)
        line.position.set(x, y + 7.3 + (th.hook === 'lampion' ? 0.9 : 0.3), 0)
        scene.add(line)
      } else {
        const next = def.hooks[i + 1]
        if (next && Math.abs(next[1] - y) < 2 && next[0] - x < 5) {
          const len = Math.hypot(next[0] - x, next[1] - y)
          const line = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 5), lineMat)
          line.position.set((x + next[0]) / 2, (y + next[1]) / 2 + 0.3, 0)
          line.rotation.z = Math.PI / 2
          scene.add(line)
          const cloth = own(cloneKit(kit, ['baju', 'baju2', 'baju3'][i % 3]), sh)
          cloth.position.set((x + next[0]) / 2, y + 0.3, -0.05)
          scene.add(cloth)
        }
        if (i === 0 || i === def.hooks.length - 1) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 8), new THREE.MeshStandardMaterial({ color: '#6b5a48' }))
          pole.position.set(x + (i === 0 ? -1.5 : 1.5), y - 2.7, -0.3)
          scene.add(pole)
          const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 5), lineMat)
          tie.position.set(x + (i === 0 ? -0.75 : 0.75), y + 0.3, 0)
          tie.rotation.z = Math.PI / 2
          scene.add(tie)
        }
      }
    })
    for (const b of def.buttons) {
      const base = own(cloneKit(kit, 'tombol_dasar'), sh)
      const cap = own(cloneKit(kit, 'tombol_tutup', true), sh)
      const k = (b.w ?? 1.2) / 1.2
      for (const o of [base, cap]) {
        o.position.set(b.x, b.y, 0)
        o.scale.set(k, 1, 1)
        scene.add(o)
      }
      if (b.need === 2) {
        // dua titik penanda: harus diinjak berdua
        for (const dx of [-0.3, 0.3]) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffcc1f', emissiveIntensity: 1.5 }))
          d.position.set(dx * k, 0.16, 0.2)
          cap.add(d)
        }
      }
      this.parts.buttons.push({ cap, y: b.y, down: 0 })
    }
    for (const l of def.levers) {
      const base = own(cloneKit(kit, 'tuas_dasar'), sh)
      base.position.set(l.x, l.y, -0.3)
      const arm = own(cloneKit(kit, 'tuas_gagang'), sh)
      arm.position.set(l.x, l.y + 0.28, -0.3)
      scene.add(base, arm)
      this.parts.levers.push({ arm, on: 0 })
    }
    for (const [x, y] of def.checkpoints) {
      const f = own(cloneKit(kit, 'bendera', true), sh)
      f.position.set(x, y, -0.9)
      scene.add(f)
      this.parts.flags.push(f)
      this.flagDone.push(false)
    }
    for (const [x, y] of def.candy) {
      const c = own(cloneKit(kit, 'permen'), sh)
      c.position.set(x, y, 0)
      c.scale.setScalar(0.9)
      scene.add(c)
      this.parts.candy.push(c)
    }
    const gate = own(cloneKit(kit, 'gapura'), sh)
    gate.position.set(def.goal[0], def.goal[1], -0.6)
    scene.add(gate)
    for (const [x] of def.tips) {
      const y = surfaceAt(def, x)
      if (y === null) continue
      const p = own(cloneKit(kit, 'papan'), sh)
      p.position.set(x, y, -1.5)
      p.scale.setScalar(0.8)
      scene.add(p)
    }
  }

  /** tinggi permukaan di bawah titik (untuk bayangan karakter) */
  groundBelow(rt: LevelRuntime, x: number, y: number): number | null {
    let best: number | null = null
    for (const s of rt.live) {
      if (!s.solid) continue
      const [bx, by, bw, bh] = s.b
      const top = by + bh
      if (x < bx || x > bx + bw || top > y + 0.05) continue
      if (best === null || top > best) best = top
    }
    return best
  }

  /** maju satu frame tampilan */
  update(dt: number, rt: LevelRuntime, s: TaliState, groups: boolean[], local: { pressed: boolean[]; got: Set<number> }, t: number) {
    this.t += dt
    for (const d of this.dyn) {
      const l = rt.live[d.i]
      const [x, y, w, h] = l.b
      d.obj.position.set(x + w / 2, y + h, 0)
      if (d.def.crumble) {
        const shake = l.crumble >= 0 && l.gone < 0 ? Math.sin(this.t * 70) * 0.05 : 0
        d.obj.position.x += shake
        const fall = l.gone >= 0 ? Math.min(1, l.gone / 0.6) : 0
        d.obj.position.y -= fall * fall * 6
        d.obj.visible = l.gone < 0.9
        if (l.gone > 2.6) d.obj.visible = true
      }
      if (d.def.orbit) d.obj.rotation.z = 0
    }
    if (this.wheel) this.wheel.rotation.z = ((t / this.wheelPeriod) % 1) * Math.PI * 2
    this.def.buttons.forEach((b, i) => {
      const p = this.parts.buttons[i]
      const mine = local.pressed[i]
      const n = (s.press[i] ?? 0) !== 0 || mine
      p.down += ((n ? 1 : 0) - p.down) * Math.min(1, dt * 14)
      p.cap.position.y = b.y - p.down * 0.09
    })
    this.def.levers.forEach((l, i) => {
      const p = this.parts.levers[i]
      const want = s.levers[i] ? 1 : 0
      p.on += (want - p.on) * Math.min(1, dt * 10)
      p.arm.rotation.z = (0.6 - p.on * 1.2)
      void l
    })
    this.def.candy.forEach(([x, y], i) => {
      const c = this.parts.candy[i]
      const gone = s.candy[i] || local.got.has(i)
      if (gone && c.visible) {
        c.visible = false
        this.fx.emit('sparkle', x, y, 0.2, 16)
        this.fx.emit('poof', x, y, 0.2, 6)
      }
      if (!gone) {
        c.position.y = y + Math.sin(this.t * 2.2 + i) * 0.12
        c.rotation.y = this.t * 1.4 + i
      }
    })
    this.parts.flags.forEach((f, i) => {
      if (i <= s.checkpoint && !this.flagDone[i]) {
        this.flagDone[i] = true
        const [x, y] = this.def.checkpoints[i]
        this.fx.emit('confetti', x, y + 2.4, -0.6, 30)
        f.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.isMesh) {
            const mat = m.material as THREE.MeshStandardMaterial
            if (mat.name.startsWith('sway_janur')) {
              mat.color.set('#5cf64a')
              mat.emissive.set('#2a8f22')
            }
          }
        })
      }
    })
    // angin & uap
    this.emitT += dt
    if (this.emitT > 0.08) {
      this.emitT = 0
      for (const w of this.winds) {
        if (w.g !== undefined && !groups[w.g]) continue
        const [x, y, bw, bh] = w.b
        if (w.fy > 0) {
          this.fx.emit('steam', x + Math.random() * bw, y + 0.3, (Math.random() - 0.5) * 2, 2)
        } else if (Math.abs(w.fx) > 0) {
          const near = Math.abs(this.camX - (x + bw / 2)) < bw / 2 + 12
          if (near) this.fx.emit('wind', x + Math.random() * bw, y + 1 + Math.random() * (bh - 1), (Math.random() - 0.3) * 3, 1, [Math.sign(w.fx), 0])
        }
      }
      if (this.def.id === 'bromo' || this.def.id === 'malam') {
        for (const h of this.def.hazards) if (h.k === 'lava') this.fx.emit('ember', h.b[0] + Math.random() * h.b[2], h.b[1] + h.b[3], (Math.random() - 0.5) * 3, 1)
      }
    }
  }

  /** kamera mengikuti kedua pemain (sendiri sedikit lebih berat), menjauh kalau terpisah */
  updateCamera(dt: number, me: THREE.Vector3, other: THREE.Vector3 | null, aspect: number, snap = false) {
    const tx = other ? me.x * 0.6 + other.x * 0.4 : me.x
    const ty = other ? me.y * 0.6 + other.y * 0.4 : me.y
    const sep = other ? Math.abs(me.x - other.x) + Math.abs(me.y - other.y) * 1.4 : 0
    const want = Math.max(12.5, Math.min(19, 11 + sep * 0.9)) * (aspect < 1.4 ? 1.25 : 1)
    const k = snap ? 1 : Math.min(1, dt * 3.2)
    this.camX += (Math.max(this.def.bounds[0] + 6, Math.min(this.def.bounds[1] - 6, tx)) - this.camX) * k
    this.camY += (ty + 1.2 - this.camY) * k
    this.camD += (want - this.camD) * Math.min(1, dt * 1.5)
    if (snap) this.camD = want
    const c = this.camera
    c.position.set(this.camX + 0.6, this.camY + 2.4, this.camD)
    c.lookAt(this.camX, this.camY, -1)
    const [sx, sy, sz] = this.theme.sun.dir
    this.sun.position.set(this.camX + sx * 30, this.camY + sy * 30, sz * 30)
    this.sun.target.position.set(this.camX, this.camY - 2, 0)
    if (this.lantern) this.lantern.position.copy(this.actors[0].root.position).add(new THREE.Vector3(0.3, 0.7, 0.9))
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh || (o as THREE.Points).isPoints) {
        m.geometry?.dispose()
      }
    })
    this.actors.forEach((a) => a.dispose())
    this.rope.dispose()
    this.fx.dispose()
  }
}

export const BODY_R = R
