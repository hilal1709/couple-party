import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import chickenUrl from '@/assets/petak/models/ayam.glb?url'
import catUrl from '@/assets/petak/models/kucing.glb?url'
import pigeonUrl from '@/assets/petak/models/merpati.glb?url'
import peopleUrl from '@/assets/petak/models/warga.glb?url'
import type { MapData, MapInfo } from '../maps'

export type Mover = { x: number; z: number; moving: boolean }
export type LifeEvent = { kind: 'merpati' | 'meong'; x: number; z: number }

const SCARE = 5
const SHIRTS = ['#3d8bff', '#ff7a33', '#3aa655', '#f2c21a', '#e0332b']

type Bird = { home: THREE.Vector3; p: THREE.Vector3; yaw: number; state: 'ground' | 'fly' | 'land'; t: number; hop: number; phase: number; angle: number; size: number }
type Flock = { center: THREE.Vector3; birds: Bird[]; rest: number }
type Walker = { root: THREE.Object3D; mixer: THREE.AnimationMixer; walk: THREE.AnimationAction; sit?: THREE.AnimationAction; route: THREE.Vector3[]; i: number; speed: number; wait: number; cool: number }

const SPARROW = new THREE.Color('#a9835c')
const PIGEON = new THREE.Color('#ffffff')
const fly = new THREE.Matrix4()
const q = new THREE.Quaternion()
const s = new THREE.Vector3(1, 1, 1)
const up = new THREE.Vector3(0, 1, 0)

/** route Blender [x, y] → titik three */
const route = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector3(x, 0.04, -y))

/** Merpati, kucing, warga, asap, debu: tiap HP menyimulasikan sendiri, tidak disinkronkan. */
export class Life {
  readonly group = new THREE.Group()
  private flocks: Flock[] = []
  private birds: THREE.InstancedMesh | null = null
  private walkers: Walker[] = []
  private smoke: { points: THREE.Points; mat: THREE.ShaderMaterial } | null = null
  private dust: { points: THREE.Points; mat: THREE.ShaderMaterial } | null = null
  private rain: { points: THREE.Points; mat: THREE.ShaderMaterial } | null = null
  private info: MapInfo
  private events: LifeEvent[] = []
  private density: number
  private map: MapData
  private rnd = Math.random

  constructor(scene: THREE.Scene, map: MapData, info: MapInfo, density: number) {
    this.map = map
    this.info = info
    this.density = density
    scene.add(this.group)
  }

  async load() {
    const loader = new GLTFLoader()
    const [pigeon, cat, people, chicken] = await Promise.all([loader.loadAsync(pigeonUrl), loader.loadAsync(catUrl), loader.loadAsync(peopleUrl), loader.loadAsync(chickenUrl)])
    // sendal warga dan bulu kucing memakai terang menurut map
    const fill = this.info.fill
    this.buildBirds(pigeon.scene)
    for (const r of this.map.life.kucing) this.addWalker(cat, route(r), 1.1, 'kucing', 0, fill)
    for (const r of this.map.life.ayam ?? []) this.addWalker(chicken, route(r), 0.55, 'ayam', 0, fill)
    this.map.life.warga.forEach((r, i) => this.addWalker(people, route(r), 1.35, 'warga', i, fill))
    this.buildSmoke()
    if (this.info.rain) this.buildRain()
    else this.buildDust()
  }

  private buildBirds(model: THREE.Object3D) {
    const meshes: THREE.Mesh[] = []
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
    })
    const perFlock = Math.max(3, Math.round(7 * this.density))
    const sparrows = this.map.life.burung ?? []
    const total = (this.map.life.merpati.length + sparrows.length) * perFlock
    if (!total || !meshes.length) return
    // merpati satu warna per instance: geometri digabung, sayap dikepak di vertex shader lewat |x|
    // dunia tanpa lampu aktif: warna titik ditampilkan langsung
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true })
    const uFlap = { value: 0 }
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFlap = uFlap
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uFlap;\nattribute float aPhase;\nattribute float aFly;')
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
          float w = max(0.0, abs(position.x) - 0.05);
          transformed.y += w * sin(uFlap * 26.0 + aPhase * 6.0) * 1.6 * aFly;`,
        )
    }
    // model punya satu primitive per warna: disatukan, warnanya pindah ke atribut titik
    const geo = mergeGeometries(
      meshes.map((m) => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', m.geometry.attributes.position)
        g.setAttribute('normal', m.geometry.attributes.normal)
        g.setIndex(m.geometry.index)
        const c = (m.material as THREE.MeshStandardMaterial).color
        const n = g.attributes.position.count
        const colors = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3)
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        return g
      }),
    )
    const birds = new THREE.InstancedMesh(geo, mat, total)
    birds.frustumCulled = false
    const phases = new Float32Array(total)
    const flying = new Float32Array(total)
    for (let i = 0; i < total; i++) phases[i] = this.rnd()
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
    geo.setAttribute('aFly', new THREE.InstancedBufferAttribute(flying, 1))
    birds.userData.flap = uFlap
    this.birds = birds
    this.group.add(birds)
    const flocks = [...this.map.life.merpati.map((p) => ({ p, size: 1 })), ...sparrows.map((p) => ({ p, size: 0.45 }))]
    flocks.forEach(({ p: [x, y, z], size }, f) => {
      const center = new THREE.Vector3(x, y, z)
      const list: Bird[] = []
      for (let i = 0; i < perFlock; i++) {
        const home = center.clone().add(new THREE.Vector3((this.rnd() - 0.5) * 2.4, 0, (this.rnd() - 0.5) * 2.4))
        list.push({ home, p: home.clone(), yaw: this.rnd() * 6.28, state: 'ground', t: this.rnd() * 3, hop: 0, phase: this.rnd() * 6.28, angle: this.rnd() * 6.28, size })
        // burung gereja: lebih kecil dan cokelat
        birds.setColorAt(f * perFlock + i, size < 1 ? SPARROW : PIGEON)
      }
      this.flocks.push({ center, birds: list, rest: 0 })
    })
  }

  private addWalker(gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }, pts: THREE.Vector3[], speed: number, kind: 'kucing' | 'warga' | 'ayam', n: number, fill: number) {
    const root = cloneSkinned(gltf.scene)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.frustumCulled = false
      const mat = m.material as THREE.MeshStandardMaterial
      // tidak punya lightmap: tanpa ini gelap total di bawah langit yang redup
      const lit = mat.clone()
      lit.emissive.copy(mat.color).multiplyScalar(fill)
      if (kind === 'warga' && mat.name === 'shirt') {
        lit.color.set(SHIRTS[n % SHIRTS.length])
        lit.emissive.copy(lit.color).multiplyScalar(fill)
      }
      m.material = lit
    })
    root.position.copy(pts[0])
    this.group.add(root)
    const mixer = new THREE.AnimationMixer(root)
    const walk = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'jalan')!)
    walk.play()
    const clip = THREE.AnimationClip.findByName(gltf.animations, 'duduk')
    this.walkers.push({ root, mixer, walk, sit: clip ? mixer.clipAction(clip) : undefined, route: pts, i: 1, speed, wait: 0, cool: 0 })
  }

  private particles(count: number, vertex: string, fragment: string, seed: (i: number, a: Float32Array) => void, blending: THREE.Blending) {
    const pos = new Float32Array(count * 3)
    const aSeed = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) seed(i, aSeed)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 4))
    const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending, uniforms: { uTime: { value: 0 }, uPx: { value: 1 } } })
    const points = new THREE.Points(g, mat)
    points.frustumCulled = false
    this.group.add(points)
    return { points, mat }
  }

  private buildSmoke() {
    const spots = this.map.life.asap
    if (!spots.length) return
    const each = Math.round(14 * this.density)
    this.smoke = this.particles(
      spots.length * each,
      /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime; uniform float uPx;
      varying float vA;
      void main() {
        float t = fract(uTime * 0.16 + aSeed.w);
        vec3 p = aSeed.xyz + vec3(sin(t * 6.0 + aSeed.w * 30.0) * 0.14 + t * 0.5, t * 2.3, t * 0.2);
        vA = smoothstep(0.0, 0.12, t) * (1.0 - t) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.2 + t * 0.9) * uPx / -mv.z;
      }`,
      /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vec3(0.92, 0.9, 0.86), vA * (1.0 - smoothstep(0.2, 1.0, d)));
      }`,
      (i, a) => {
        const p = spots[Math.floor(i / each)]
        a.set([p[0], p[1], p[2], (i % each) / each], i * 4)
      },
      THREE.NormalBlending,
    )
  }

  private buildDust() {
    const count = Math.round(150 * this.density)
    this.dust = this.particles(
      count,
      /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime; uniform float uPx;
      varying float vA;
      void main() {
        float t = uTime * (0.04 + aSeed.w * 0.05);
        vec3 p = aSeed.xyz + vec3(sin(t * 3.0 + aSeed.y) * 1.6 + t * 0.9, sin(t * 2.0 + aSeed.x) * 0.7, cos(t * 2.4 + aSeed.z) * 1.6);
        p.xz = mod(p.xz + 24.0, 48.0) - 24.0;
        vA = 0.3 + 0.5 * sin(uTime * 2.0 + aSeed.w * 40.0) * sin(uTime * 2.0 + aSeed.w * 40.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(6.0, 0.05 * uPx / -mv.z);
      }`,
      /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.6), vA * (1.0 - d));
      }`,
      (i, a) => a.set([(this.rnd() - 0.5) * 48, 0.4 + this.rnd() * 4.5, (this.rnd() - 0.5) * 40, this.rnd()], i * 4),
      THREE.AdditiveBlending,
    )
  }

  /** hujan: tetes garis mengelilingi kamera, tidak turun di bawah atap */
  private buildRain() {
    const roofs = this.map.life.atap.slice(0, 4)
    while (roofs.length < 4) roofs.push([0, 0, 0, 0])
    const count = Math.round(520 * this.density + 120)
    this.rain = this.particles(
      count,
      /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime; uniform float uPx;
      uniform vec3 uCam;
      uniform vec4 uRoof[4];
      varying float vA;
      void main() {
        float fall = fract(aSeed.y - uTime * (0.9 + aSeed.w * 0.3));
        vec3 p = vec3(aSeed.x, fall * 9.0, aSeed.z);
        p.xz = uCam.xz + mod(p.xz - uCam.xz + 13.0, 26.0) - 13.0;
        vA = 0.32;
        for (int i = 0; i < 4; i++) {
          if (p.x > uRoof[i].x && p.x < uRoof[i].z && p.z > uRoof[i].y && p.z < uRoof[i].w) vA = 0.0;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(46.0, 0.5 * uPx / -mv.z);
      }`,
      /* glsl */ `
      varying float vA;
      void main() {
        if (vA <= 0.0) discard;
        float d = abs(gl_PointCoord.x - 0.5) * 2.0;
        gl_FragColor = vec4(vec3(0.78, 0.86, 1.0), vA * (1.0 - smoothstep(0.0, 0.05, d)));
      }`,
      (i, a) => a.set([(this.rnd() - 0.5) * 26, this.rnd(), (this.rnd() - 0.5) * 26, this.rnd()], i * 4),
      THREE.NormalBlending,
    )
    this.rain.mat.uniforms.uCam = { value: new THREE.Vector3() }
    this.rain.mat.uniforms.uRoof = { value: roofs.map(([a, b, c, d]) => new THREE.Vector4(a, b, c, d)) }
  }

  /** ukuran titik mengikuti tinggi layar */
  resize(height: number) {
    for (const p of [this.smoke, this.dust, this.rain]) if (p) p.mat.uniforms.uPx.value = height * 1.2
  }

  private updateBirds(dt: number, t: number, movers: Mover[]) {
    const mesh = this.birds
    if (!mesh) return
    const flying = mesh.geometry.attributes.aFly as THREE.InstancedBufferAttribute
    ;(mesh.userData.flap as { value: number }).value = t
    let idx = 0
    for (const f of this.flocks) {
      const near = movers.some((m) => m.moving && Math.hypot(m.x - f.center.x, m.z - f.center.z) < SCARE)
      if (near && f.birds[0].state === 'ground' && f.rest <= 0) {
        for (const b of f.birds) {
          b.state = 'fly'
          b.t = 8 + this.rnd() * 5
        }
        f.rest = 10
        this.events.push({ kind: 'merpati', x: f.center.x, z: f.center.z })
      }
      f.rest -= dt
      for (const b of f.birds) {
        if (b.state === 'fly') {
          b.t -= dt
          b.angle += dt * 1.1
          const target = new THREE.Vector3(f.center.x + Math.cos(b.angle) * 7, 6.5 + Math.sin(b.angle * 2 + b.phase) * 1.2, f.center.z + Math.sin(b.angle) * 7)
          b.yaw = Math.atan2(target.x - b.p.x, target.z - b.p.z)
          b.p.lerp(target, 1 - Math.exp(-dt * 1.3))
          if (b.t <= 0) b.state = 'land'
        } else if (b.state === 'land') {
          b.yaw = Math.atan2(b.home.x - b.p.x, b.home.z - b.p.z)
          b.p.lerp(b.home, 1 - Math.exp(-dt * 1.6))
          if (b.p.distanceTo(b.home) < 0.05) {
            b.p.copy(b.home)
            b.state = 'ground'
          }
        } else {
          b.t -= dt
          if (b.t <= 0) {
            // jalan-jalan kecil sambil mematuk
            b.t = 1 + this.rnd() * 3
            b.yaw = this.rnd() * 6.28
            b.hop = 0.5
          }
          if (b.hop > 0) {
            b.hop -= dt
            b.home.x += Math.sin(b.yaw) * dt * 0.25
            b.home.z += Math.cos(b.yaw) * dt * 0.25
            b.p.copy(b.home)
          }
        }
        flying.setX(idx, b.state === 'ground' ? 0 : 1)
        q.setFromAxisAngle(up, b.yaw + Math.PI)
        const peck = b.state === 'ground' && Math.sin(t * 4 + b.phase) > 0.9 ? 0.06 : 0
        fly.compose(b.p, q, s.setScalar(b.size))
        fly.elements[13] -= peck
        mesh.setMatrixAt(idx++, fly)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    flying.needsUpdate = true
  }

  private updateWalkers(dt: number, movers: Mover[]) {
    for (const w of this.walkers) {
      w.mixer.update(dt)
      w.cool -= dt
      if (w.wait > 0) {
        w.wait -= dt
        if (w.sit && w.cool <= 0 && movers.some((m) => m.moving && Math.hypot(m.x - w.root.position.x, m.z - w.root.position.z) < 3.5)) {
          w.cool = 7
          this.events.push({ kind: 'meong', x: w.root.position.x, z: w.root.position.z })
        }
        if (w.wait <= 0 && w.sit) {
          w.sit.fadeOut(0.3)
          w.walk.reset().fadeIn(0.3).play()
        }
        continue
      }
      const target = w.route[w.i]
      const dx = target.x - w.root.position.x
      const dz = target.z - w.root.position.z
      const d = Math.hypot(dx, dz)
      if (d < 0.12) {
        w.i = (w.i + 1) % w.route.length
        if (w.sit && this.rnd() < 0.6) {
          w.wait = 4 + this.rnd() * 7
          w.walk.fadeOut(0.3)
          w.sit.reset().fadeIn(0.3).play()
        }
        continue
      }
      w.root.position.x += (dx / d) * w.speed * dt
      w.root.position.z += (dz / d) * w.speed * dt
      const yaw = Math.atan2(dx, dz)
      let turn = yaw - w.root.rotation.y
      turn = Math.atan2(Math.sin(turn), Math.cos(turn))
      w.root.rotation.y += turn * Math.min(1, dt * 6)
    }
  }

  /** `movers` = semua pemain; mengembalikan kejadian untuk suara */
  update(dt: number, t: number, movers: Mover[], cam: THREE.Vector3): LifeEvent[] {
    this.updateBirds(dt, t, movers)
    this.updateWalkers(dt, movers)
    if (this.smoke) this.smoke.mat.uniforms.uTime.value = t
    if (this.dust) this.dust.mat.uniforms.uTime.value = t
    if (this.rain) {
      this.rain.mat.uniforms.uTime.value = t
      this.rain.mat.uniforms.uCam.value.copy(cam)
    }
    return this.events.splice(0)
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      ;(m.material as THREE.Material | undefined)?.dispose?.()
    })
  }
}
