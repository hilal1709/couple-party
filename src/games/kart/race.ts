import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { LiveChannel, Seat } from '../types'
import { CHARACTERS, LEVEL_INFO, statsFor, type Stats } from './data'
import { BOT_GRACE, COUNTDOWN, FINISH_GRACE, humansDone } from './engine'
import { loadModels, makeKart, placed, withVariants, type KartRig } from './render/models'
import { DRIFT_COLORS, DUST, Particles } from './render/particles'
import { initialTier, TIERS, type Quality, type Tier } from './render/quality'
import { Skids } from './render/skids'
import { buildWorld, type World } from './render/world'
import { botInput, newBrain, type BotBrain } from './sim/bots'
import { BOX_RESPAWN, blockPush, entityPose, hazardContact, onPad, ownerSafe } from './sim/hazards'
import { bounce, collide, driftLevel, hitKart, isShielded, magnetPull, rainKart, spawnKart, stepKart, type Input, type Kart } from './sim/physics'
import { hermite, syncClock } from './sim/interp'
import { buildTrack, pointAt, type Track } from './sim/track'
import { recipeOf } from './render/recipe'
import { setMaxAnisotropy } from './render/tex'
import { TRACKS } from './tracks'
import type { Entity, KartAction, KartState } from './types'

const DT = 1 / 60
/** detik kamera intro menyusuri lintasan sebelum hitung mundur (sama di semua HP) */
const INTRO = 4.5
const SEND_EVERY = 0.1
/** kart HP lain ditampilkan selambat ini (ms): cukup untuk dua paket + jitter jaringan */
const INTERP_DELAY = 200

export type Hud = {
  /** detik tersisa hitung mundur (≤ 0 = sudah jalan) */
  count: number
  rank: number
  total: number
  lap: number
  laps: number
  speed: number
  drift: number
  boost: boolean
  timeMs: number
  finished: boolean
  wrongWay: boolean
  rolling: boolean
  /** posisi semua kart di minimap (0..1) */
  dots: { x: number; z: number; me: boolean; color: string }[]
  slow: boolean
  shield: boolean
  /** kamera intro sedang menyusuri lintasan */
  intro: boolean
}

export type Sound = 'go' | 'count' | 'lap' | 'final' | 'boost' | 'drift' | 'hit' | 'bump' | 'box' | 'item' | 'jump' | 'land' | 'finish' | 'fall' | 'shield' | 'rain' | 'blast' | 'throw' | 'champion' | 'lose'

export type Controls = Input & { item: boolean }

type Remote = { buf: { t: number; p: number[] }[]; off: number | null }

/** pose ringkas yang dikirim ke HP lain: [kart, x, y, z, yaw, kecepatan, slide, flags, kemajuan, setir] */
type Pose = [number, number, number, number, number, number, number, number, number, number]
const F_DRIFT = 1, F_BOOST = 2, F_SPIN = 4, F_SHIELD = 8, F_AIR = 16, F_SLOW = 32, F_OFF = 64, F_BRAKE = 128

const r2 = (v: number) => Math.round(v * 100) / 100
/** perisai gelembung: tepi berkilau pelangi (fresnel), tengah bening, pola heksagon tipis */
const SHIELD_MAT = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = position; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0); }
    void main(){
      float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
      float hex = smoothstep(0.92, 1.0, abs(sin(vP.x*4.0 + time) * sin(vP.y*4.0) * sin(vP.z*4.0 - time)));
      vec3 c = hue(f * 0.8 + time * 0.15 + vP.y * 0.1) * (f * 1.3 + hex * 0.4) + vec3(0.25, 0.55, 1.0) * 0.08;
      gl_FragColor = vec4(c, 1.0);
    }`,
})

/** sumbu kolom setir (setir dimiringkan 60° di model) */
const STEER_AXIS = new THREE.Vector3(0, 0.5, 0.866).normalize()

/** penyaring sebelum bloom: NaN/inf → 0, warna HDR dibatasi */
const SANITIZE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = clamp(c, 0.0, 4.0);
    }`,
}

/** color grading akhir: saturasi & kontras naik sedikit supaya warna kartun lebih tegas */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.22 }, contrast: { value: 1.08 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat; uniform float contrast; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      vec3 g = mix(vec3(l), c.rgb, sat);
      g = (g - 0.5) * contrast + 0.5;
      // vinyet tipis
      float v = smoothstep(1.15, 0.45, length(vUv - 0.5));
      gl_FragColor = vec4(g * tint * mix(0.82, 1.0, v), c.a);
    }`,
}
/** dev: kart sendiri disetir AI (?autopilot=1) untuk tangkapan layar */
const AUTOPILOT = import.meta.env.DEV && new URLSearchParams(location.search).has('autopilot')

type Opts = {
  canvas: HTMLCanvasElement
  state: KartState
  seat: Seat
  live?: LiveChannel
  act: (a: KartAction) => void
  onHud: (h: Hud) => void
  /** `noFx`: kejadian dunia yang tidak menyangkut kart sendiri, jadi tanpa efek layar */
  onSound: (s: Sound, info?: { rate?: number; volume?: number; noFx?: boolean }) => void
  /** tingkat grafis turun otomatis */
  onQuality?: (q: Quality) => void
}

export class Race {
  private o: Opts
  private t: Track
  private world!: World
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private meshes: THREE.Group[] = []
  private karts: Kart[] = []
  private stats: Stats[] = []
  /** kart yang disimulasikan HP ini: milik sendiri (+ semua bot kalau host) */
  private mine: number
  private local = new Set<number>()
  private brains = new Map<number, BotBrain>()
  private remotes = new Map<number, Remote>()
  /** kemajuan (meter total) & putaran yang sudah lewat per kart */
  private prog: number[]
  private crossed: number[]
  private state: KartState
  private startAt = performance.now()
  private goAt: number
  private acc = 0
  /** pose kart lokal sebelum tick terakhir: layar menggambar di antara dua tick */
  private before = new Map<number, { x: number; y: number; z: number; yaw: number }>()
  private sendAcc = 0
  private hudAcc = 0
  private raf = 0
  private last = performance.now()
  private born = new Map<number, number>()
  private handled = new Set<string>()
  private seenEvents = 0
  private rolling = new Map<number, number>()
  private botItemT = new Map<number, number>()
  private firstFinishAt = 0
  private humansDoneAt = 0
  private ended = false
  private wrongT = 0
  private countShown = 99
  private entityMeshes = new Map<number, THREE.Object3D>()
  private fxGroup = new THREE.Group()
  private clouds = new Map<number, THREE.Object3D>()
  private shieldMeshes = new Map<number, THREE.Mesh>()
  private camPos = new THREE.Vector3()
  private camLook = new THREE.Vector3()
  private fpsT = 0
  private fpsN = 0
  private ratio: number
  /** ukuran canvas diganti tepat sebelum render, karena mengubahnya mengosongkan layar */
  private sizeDirty = true
  private contextLost = false
  private tier: Tier
  private composer: EffectComposer | null = null
  private particles!: Particles
  private skids!: Skids
  /** guncangan kamera (meter), meluruh cepat */
  private shake = 0
  /** squash kart setelah mendarat, per kart */
  private squash: number[] = []
  private introSkipped = false
  /** saat kart sendiri finish (untuk kamera berputar) */
  private finishAt = 0
  /** nilai setir terakhir per kart (-1..1), untuk animasi pembalap & roda depan */
  private steers: number[] = []
  private stopLive?: () => void
  private disposed = false
  controls: Controls = { steer: 0, gas: true, brake: false, drift: false, item: false }

  constructor(o: Opts) {
    this.o = o
    this.state = o.state
    const id = o.state.schedule[o.state.race]
    this.t = buildTrack(TRACKS[id])
    this.goAt = this.startAt + (INTRO + COUNTDOWN) * 1000
    this.mine = o.state.racers.findIndex((r) => r.seat === o.seat)
    this.tier = initialTier()
    this.ratio = Math.min(this.tier.ratio, window.devicePixelRatio || 1)
    // antialias hanya bisa dipilih saat renderer dibuat; selalu nyala supaya tetap ada setelah turun ke Hemat
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' })
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy())
    this.renderer.setPixelRatio(this.ratio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    if (this.tier.shadow) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.5, 4000)
    const n = o.state.racers.length
    this.prog = Array(n).fill(0)
    this.crossed = Array(n).fill(0)
    this.squash = Array(n).fill(0)
    this.steers = Array(n).fill(0)
    o.state.racers.forEach((r, i) => {
      // pemain di barisan belakang grid (kamera bebas, ada yang dikejar)
      this.karts.push(spawnKart(this.t, n - 1 - i))
      this.stats.push(statsFor(r.char, r.body))
      const local = i === this.mine || (r.seat === null && o.seat === 0)
      if (local) this.local.add(i)
      else this.remotes.set(i, { buf: [], off: null })
      if (r.seat === null) this.brains.set(i, newBrain(i * 7919 + 13))
    })
    // masuk balapan yang sudah jalan (muat ulang): benda & kejadian lama jangan diputar lagi
    const start = performance.now()
    for (const e of o.state.entities) this.born.set(e.id, start - 60_000)
    for (const ev of o.state.events) this.seenEvents = Math.max(this.seenEvents, ev.id)
    o.canvas.addEventListener('webglcontextlost', this.onContextLost)
    o.canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    this.stopLive = o.live?.on((d) => this.onLive(d))
    // dev: taruh kart sendiri di jarak tertentu (?at=meter) untuk memotret bagian lintasan
    const at = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('at')) : 0
    if (at && this.mine >= 0) {
      const k = this.karts[this.mine]
      const p = pointAt(this.t, at, 0)
      Object.assign(k, { x: p.x, z: p.z, y: p.y, yaw: p.yaw, i: Math.round(at / 2) % this.t.n, s: at })
      this.crossed[this.mine] = 1
    }
  }

  /** muat model lalu mulai loop render */
  async start() {
    const th = this.t.def
    await loadModels([
      ...withVariants(th.theme.props.map(([n]) => n)),
      ...(recipeOf(th).models ?? []),
      ...withVariants(recipeOf(th).wind.map(([n]) => n)),
      ...withVariants(['rumput-kecil', 'bunga', 'pakis', 'kerikil-kecil', 'kit-arah-kiri', 'kit-arah-kanan', 'kit-bendera']),
      ...(th.landmarks ?? []).map((l) => l.model),
      'camar',
      ...th.hazards.flatMap((h) => ('model' in h ? [h.model] : [])),
      'jamur-pantul', 'batu-jatuh', 'pisang', 'roket', 'petasan', 'item-box', 'awan',
      ...this.state.racers.flatMap((r) => [`kart-${r.body}`, `char-${CHARACTERS[r.char].id}`, `kart-${r.body}-lod`, `char-${CHARACTERS[r.char].id}-lod`]),
    ])
    if (this.disposed) return
    this.world = await buildWorld(this.t, this.tier, this.renderer)
    if (this.disposed) return
    if (import.meta.env.DEV) {
      const w = window as unknown as { __race: Race; __races?: Race[] }
      w.__race = this
      ;(w.__races ??= []).push(this)
    }
    this.particles = new Particles(this.tier.particles)
    this.skids = new Skids()
    this.world.scene.add(this.fxGroup, this.particles.group, this.skids.mesh)
    this.state.racers.forEach((r) => {
      const c = CHARACTERS[r.char]
      const m = makeKart(c.id, c.color, r.body, this.tier.q === 'low')
      m.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true
      })
      // bayangan kontak lembut di bawah kart (tetap ada walau bayangan real-time menyala)
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7, 18), new THREE.MeshBasicMaterial({ color: '#121212', transparent: true, opacity: this.tier.shadow ? 0.18 : 0.32, depthWrite: false }))
      sh.rotation.x = -Math.PI / 2
      sh.position.y = 0.08
      m.add(sh)
      m.userData.shadow = sh
      this.meshes.push(m)
      this.world.scene.add(m)
    })
    this.fitFar()
    this.setupPost()
    this.applySize()
    this.placeCamera(true)
    this.startAt = performance.now()
    this.goAt = this.startAt + (INTRO + COUNTDOWN) * 1000
    this.last = performance.now()
    this.loop()
  }

  /** MSAA + bloom + tone mapping akhir (grafis Sedang/Tinggi); FXAA hanya menambal MSAA 2x di Sedang */
  private setupPost() {
    this.dropPost()
    if (!this.tier.post) return
    const recipe = recipeOf(this.t.def)
    const samples = Math.min(this.tier.samples, this.renderer.capabilities.maxSamples)
    const c = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples }))
    c.addPass(new RenderPass(this.world.scene, this.camera))
    // buang piksel NaN & batasi kecerahan sebelum bloom; satu piksel rusak bisa memutihkan seluruh layar
    c.addPass(new ShaderPass(SANITIZE))
    const [strength, radius, threshold] = recipe.bloom
    c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold))
    c.addPass(new OutputPass())
    const grade = new ShaderPass(GRADE)
    grade.uniforms.sat.value = recipe.grade.sat
    grade.uniforms.contrast.value = recipe.grade.contrast
    grade.uniforms.tint.value.fromArray(recipe.grade.tint)
    c.addPass(grade)
    if (samples < 4) c.addPass(new FXAAPass())
    this.composer = c
  }

  /** Hemat: benda di balik kabut tidak perlu digambar sama sekali */
  private fitFar() {
    this.camera.far = this.tier.q === 'low' ? (this.world.scene.fog as THREE.Fog).far + 60 : 4000
    this.camera.updateProjectionMatrix()
  }

  private dropPost() {
    this.composer?.passes.forEach((p) => p.dispose())
    this.composer?.dispose()
    this.composer = null
  }

  /** ganti tingkat grafis saat balapan (dari panel pengaturan atau turun otomatis) */
  setQuality(q: Quality) {
    this.tier = TIERS[q]
    this.ratio = Math.min(this.tier.ratio, window.devicePixelRatio || 1)
    this.renderer.shadowMap.enabled = this.tier.shadow > 0
    if (this.world) {
      const sun = this.world.sun
      sun.castShadow = this.tier.shadow > 0
      if (this.tier.shadow) sun.shadow.mapSize.set(this.tier.shadow, this.tier.shadow)
      sun.shadow.map?.dispose()
      sun.shadow.map = null
      this.world.scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => (mt.needsUpdate = true))
      })
      this.world.setTier(this.tier)
      this.fitFar()
      this.setupPost()
    }
    this.resize()
  }

  /** ukuran baru dipasang di bingkai berikutnya, sesaat sebelum menggambar */
  resize() {
    this.sizeDirty = true
  }

  private applySize() {
    this.sizeDirty = false
    const c = this.o.canvas
    const w = c.clientWidth || window.innerWidth
    const h = c.clientHeight || window.innerHeight
    this.renderer.setPixelRatio(this.ratio)
    this.renderer.setSize(w, h, false)
    this.composer?.setPixelRatio(this.ratio)
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    this.contextLost = true
  }

  /** three.js mengunggah ulang aset sendiri; yang hasil render (langit, bloom, bayangan) dibuat lagi */
  private onContextRestored = () => {
    this.contextLost = false
    if (!this.world) return
    this.world.restore(this.renderer)
    this.world.sun.shadow.map?.dispose()
    this.world.sun.shadow.map = null
    this.setupPost()
    this.resize()
  }

  /** state baru dari host: item, benda, kejadian */
  setState(s: KartState) {
    this.state = s
    for (const e of s.entities) if (!this.born.has(e.id)) this.born.set(e.id, performance.now())
    for (const [r, at] of this.rolling) if (s.items[r] || performance.now() - at > 2500) this.rolling.delete(r)
    for (const ev of s.events) {
      if (ev.id <= this.seenEvents) continue
      this.seenEvents = Math.max(this.seenEvents, ev.id)
      if (ev.kind === 'awan') {
        const ranks = this.ranks()
        const now = performance.now()
        const dry = new Set<number>()
        for (const i of this.local) {
          if (i !== ev.by && ranks.indexOf(i) < ranks.indexOf(ev.by) && this.state.times[i] === null) {
            const wet = rainKart(this.karts[i])
            if (!wet) dry.add(i)
            if (i === this.mine) this.o.onSound(wet ? 'rain' : 'shield')
          }
        }
        // semua HP menampilkan awan di atas kart yang kena; perisai menahannya
        ranks.slice(0, ranks.indexOf(ev.by)).filter((i) => !dry.has(i) && !((this.remotePose(i, now)?.flags ?? 0) & F_SHIELD)).forEach((i) => this.showCloud(i))
      }
    }
    // kotak item: begitu item datang, mainkan bunyi
    if (this.mine >= 0 && s.items[this.mine] && !this.lastItem) this.o.onSound('item')
    this.lastItem = this.mine >= 0 ? s.items[this.mine] : null
  }
  private lastItem: KartState['items'][number] = null

  private onLive(d: unknown) {
    const m = d as { p?: Pose[]; at?: number }
    if (!m.p) return
    const now = performance.now()
    const at = m.at ?? now
    for (const p of m.p) {
      const r = this.remotes.get(p[0])
      if (!r) continue
      r.off = syncClock(r.off, now - at)
      const last = r.buf[r.buf.length - 1]
      r.buf.push({ t: Math.max(at + r.off, last ? last.t + 1 : 0), p })
      if (r.buf.length > 12) r.buf.shift()
      this.prog[p[0]] = p[8]
    }
  }

  /** peringkat saat ini: yang sudah finish menurut urutan, sisanya menurut kemajuan */
  private ranks(): number[] {
    const done = this.state.order.filter((i) => this.state.times[i] !== null)
    const rest = this.karts.map((_, i) => i).filter((i) => !done.includes(i))
    rest.sort((a, b) => this.prog[b] - this.prog[a])
    return [...done, ...rest]
  }

  useItem() {
    if (this.mine < 0) return
    this.fire(this.mine)
  }

  private fire(i: number) {
    const item = this.state.items[i]
    const k = this.karts[i]
    if (!item || k.spinT > 0 || k.fallT > 0 || performance.now() < this.goAt) return
    const fx = Math.sin(k.yaw)
    const fz = Math.cos(k.yaw)
    let x = k.x, z = k.z, s = k.s, back = false
    switch (item) {
      case 'pisang':
      case 'pisang3':
        x = k.x - fx * 3.5
        z = k.z - fz * 3.5
        back = true
        break
      case 'roket':
        s = k.s + 5
        if (i === this.mine) this.o.onSound('throw', { rate: 1.3 })
        break
      case 'petasan': {
        const p = pointAt(this.t, k.s + 30, k.lateral)
        x = p.x
        z = p.z
        if (i === this.mine) this.o.onSound('throw')
        break
      }
      case 'sambal':
      case 'sambal3':
        k.boostT = Math.max(k.boostT, 1.5)
        if (i === this.mine) this.o.onSound('boost', { rate: 1.1 })
        break
      case 'perisai':
        k.shieldT = 12
        if (i === this.mine) this.o.onSound('shield')
        break
      case 'magnet':
        k.magnetT = 2.8
        if (i === this.mine) this.o.onSound('boost', { rate: 0.8 })
        break
    }
    this.o.act({ type: 'use', racer: i, x: r2(x), z: r2(z), s: r2(s), lane: r2(k.lateral), back })
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const frame = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    this.acc += frame
    let steps = 0
    while (this.acc >= DT && steps < 5) {
      for (const i of this.local) {
        const k = this.karts[i]
        this.before.set(i, { x: k.x, y: k.y, z: k.z, yaw: k.yaw })
      }
      this.tick(now)
      this.acc -= DT
      steps++
    }
    if (steps === 5) this.acc = 0
    this.adapt(frame)
    if (this.sizeDirty) this.applySize()
    this.render(now, frame)
  }

  private raceTime(now: number) {
    return Math.max(0, (now - this.goAt) / 1000)
  }

  private tick(now: number) {
    const go = now >= this.goAt
    const time = this.raceTime(now)
    const s = this.state
    const skill = LEVEL_INFO[s.opts.level].skill
    const ranks = this.ranks()
    const leaderProg = this.prog[ranks[0]] ?? 0

    for (const i of this.local) {
      const k = this.karts[i]
      const finished = s.times[i] !== null || this.crossed[i] - 1 >= s.opts.laps
      const isBot = s.racers[i].seat === null || finished || AUTOPILOT
      let inp: Input
      if (!go) inp = { steer: 0, gas: false, brake: false, drift: false }
      else if (isBot) {
        const brain = this.brains.get(i) ?? this.ensureBrain(i)
        inp = botInput(k, brain, this.t, DT, finished ? 0.6 : skill)
      } else inp = this.controls

      // bot: rubber-band ringan supaya balapan tetap rapat
      let speed = 1
      if (s.racers[i].seat === null) {
        speed = LEVEL_INFO[s.opts.level].speed
        const gap = leaderProg - this.prog[i]
        const humanBest = Math.max(...s.racers.map((r, j) => (r.seat !== null ? this.prog[j] : -Infinity)))
        if (this.prog[i] > humanBest + 120) speed *= 0.92
        else if (gap > 200) speed *= 1.06
      }
      const ev = stepKart(k, inp, this.stats[i], this.t, DT, { speed })
      this.steers[i] += ((k.drift ? k.drift * 0.6 + inp.steer * 0.4 : inp.steer) - this.steers[i]) * 0.2
      const me = i === this.mine
      if (ev.lap) {
        this.crossed[i]++
        const done = this.crossed[i] - 1
        if (done >= 1 && done < s.opts.laps) {
          this.o.act({ type: 'lap', racer: i, lap: done })
          if (me) this.o.onSound(done === s.opts.laps - 1 ? 'final' : 'lap')
        }
        if (done >= s.opts.laps && s.times[i] === null && !this.handled.has(`fin${i}`)) {
          this.handled.add(`fin${i}`)
          this.o.act({ type: 'finish', racer: i, time: (now - this.goAt) | 0 })
          if (me) {
            this.o.onSound('finish')
            this.finishAt = now
            this.particles?.burst('confetti', 60, k.x, k.y + 4, k.z, 0, 8, 0, 14, ['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff', '#fff4fa'])
          }
          if (s.racers[i].seat !== null && !this.firstFinishAt) this.firstFinishAt = now
        }
      }
      if (ev.land) this.squash[i] = 1
      if (ev.boost && this.particles) this.particles.burst('spark', 14, k.x, k.y + 0.6, k.z, 0, 4, 0, 10, [DRIFT_COLORS[ev.boost], '#ffffff'])
      if (me) {
        if (ev.boost) this.o.onSound('boost', { rate: 0.9 + ev.boost * 0.1 })
        if (ev.jump) this.o.onSound('jump')
        if (ev.land) this.o.onSound('land')
        if (ev.bump) {
          this.o.onSound('bump', { volume: 0.5 })
          this.shake = Math.max(this.shake, 0.35)
        }
        if (ev.fell) this.o.onSound('fall')
      }
      this.prog[i] = (this.crossed[i] - 1) * this.t.length + k.s

      if (!go) continue
      if (k.magnetT > 0) this.pullMagnet(i, k, ranks, now)
      // panel turbo
      if (onPad(this.t, k.s, k.lateral) && k.boostT < 0.6) {
        k.boostT = 1
        if (me) this.o.onSound('boost', { rate: 1.2, volume: 0.7 })
      }
      // rintangan
      const hz = hazardContact(this.t, time, k.x, k.z, k.y)
      if (hz === 'bounce' && !k.airborne) {
        bounce(k, 1)
        if (me) this.o.onSound('jump', { rate: 1.3 })
      } else if (hz === 'hit') {
        const fresh = k.shieldT > 0
        if (hitKart(k, 1.2)) {
          this.particles?.burst('star', 10, k.x, k.y + 2.5, k.z, 0, 3, 0, 7, ['#ffcc1f', '#fff4fa'])
          if (me) {
            this.o.onSound('hit')
            this.shake = 0.8
          }
        } else if (fresh && me) this.o.onSound('shield')
      }
      const push = blockPush(this.t, k.x, k.z)
      if (push) {
        k.x += push.nx * push.depth
        k.z += push.nz * push.depth
        if (k.speed > 18) {
          k.speed *= 0.5
          if (me) this.o.onSound('bump')
        }
      }
      // tabrakan antar kart
      for (let j = 0; j < this.karts.length; j++) {
        if (j === i) continue
        const other = this.local.has(j) ? this.karts[j] : this.remotePose(j, now)
        if (other && collide(k, this.stats[i].weight, other, this.stats[j].weight) && me && Math.abs(k.speed) > 15) this.o.onSound('bump', { volume: 0.6 })
      }
      // kotak item
      for (const b of this.world.boxes) {
        if (!this.takeBox(b, k, now)) continue
        if (!s.items[i] && !this.rolling.has(i) && s.times[i] === null) {
          this.rolling.set(i, now)
          this.o.act({ type: 'box', racer: i, rank: ranks.indexOf(i) })
          if (me) this.o.onSound('box')
          if (!me) this.botItemT.set(i, 1.5 + Math.random() * 4)
        }
      }
      // benda item
      for (const e of s.entities) this.checkEntity(i, k, e, now)
      // bot memakai item
      if (s.racers[i].seat === null && s.items[i]) {
        const left = (this.botItemT.get(i) ?? 2) - DT
        this.botItemT.set(i, left)
        if (left <= 0) {
          this.botItemT.set(i, 1 + Math.random() * 3)
          this.fire(i)
        }
      }
    }

    // kart HP lain: kotaknya pecah juga di layar ini
    if (go) {
      for (const i of this.remotes.keys()) for (const b of this.world.boxes) this.takeBox(b, this.karts[i], now)
    }

    // kart sendiri: deteksi salah arah
    if (this.mine >= 0 && go) {
      const k = this.karts[this.mine]
      const dot = Math.sin(k.yaw) * this.t.tx[k.i] + Math.cos(k.yaw) * this.t.tz[k.i]
      this.wrongT = dot < -0.3 && k.speed > 4 ? this.wrongT + DT : 0
    }

    // host menutup balapan
    if (this.o.seat === 0 && !this.ended && s.phase === 'race') {
      if (humansDone(s) && !this.humansDoneAt) this.humansDoneAt = now
      const lost = this.firstFinishAt && now - this.firstFinishAt > FINISH_GRACE * 1000
      const botsLate = this.humansDoneAt && now - this.humansDoneAt > BOT_GRACE * 1000
      if (lost || botsLate) {
        this.ended = true
        const rest = ranks.filter((i) => s.times[i] === null)
        this.o.act({ type: 'end', rest })
      }
    }
    if (s.times.some((t, i) => t !== null && s.racers[i].seat !== null) && !this.firstFinishAt) this.firstFinishAt = now
  }

  /** kart menyentuh kotak yang sedang ada: kotak pecah dan muncul lagi nanti */
  private takeBox(b: World['boxes'][number], k: Kart, now: number) {
    if (now < b.hiddenUntil) return false
    if ((b.x - k.x) ** 2 + (b.z - k.z) ** 2 > 2.6 ** 2 || Math.abs(b.y - k.y - 1.4) > 3) return false
    b.hiddenUntil = now + BOX_RESPAWN * 1000
    this.boxBurst(b.x, b.y, b.z)
    return true
  }

  /** magnet: kart ditarik ke lawan tepat di depannya */
  private pullMagnet(i: number, k: Kart, ranks: number[], now: number) {
    const j = ranks[ranks.indexOf(i) - 1]
    if (j === undefined) return
    const target = this.local.has(j) ? this.karts[j] : this.remotePose(j, now)
    if (target && magnetPull(k, target, DT) && Math.random() < DT * 40) this.particles?.emit('spark', k.x, k.y + 1, k.z, (target.x - k.x) * 0.4, 1, (target.z - k.z) * 0.4, '#7fd0ff')
  }

  private ensureBrain(i: number) {
    const b = newBrain(i * 31 + 7)
    this.brains.set(i, b)
    return b
  }

  private checkEntity(i: number, k: Kart, e: Entity, now: number) {
    const key = `${e.id}:${i}`
    if (this.handled.has(key)) return
    const age = (now - (this.born.get(e.id) ?? now)) / 1000
    const p = entityPose(this.t, e, age)
    if (!p || !p.live) return
    if (ownerSafe(e, i, age)) return
    if ((p.x - k.x) ** 2 + (p.z - k.z) ** 2 > (p.r + 1.3) ** 2 || Math.abs(p.y - k.y) > 4) return
    this.handled.add(key)
    const shielded = isShielded(k)
    const hit = hitKart(k, e.kind === 'petasan' ? 1.5 : 1.15)
    if (hit) this.particles?.burst('star', 12, k.x, k.y + 2.5, k.z, 0, 3, 0, 8, ['#ffcc1f', '#fff4fa', '#ff37a6'])
    if (hit && i === this.mine) this.shake = e.kind === 'petasan' ? 1.4 : 0.8
    if (hit || shielded) this.o.act({ type: 'hit', racer: i, id: e.id })
    if (i === this.mine && (hit || shielded)) this.o.onSound(shielded ? 'shield' : e.kind === 'petasan' ? 'blast' : 'hit')
  }

  /** pose kart HP lain yang diinterpolasi */
  private remotePose(i: number, now: number): { x: number; y: number; z: number; yaw: number; slide: number; flags: number; speed: number; steer: number } | null {
    const r = this.remotes.get(i)
    if (!r || !r.buf.length) return null
    const t = now - INTERP_DELAY
    let a = r.buf[0]
    let b = r.buf[r.buf.length - 1]
    for (let k = 0; k < r.buf.length - 1; k++) {
      if (r.buf[k].t <= t && r.buf[k + 1].t >= t) {
        a = r.buf[k]
        b = r.buf[k + 1]
        break
      }
    }
    if (t >= b.t) {
      // ekstrapolasi sebentar dengan kecepatan terakhir
      const dt = Math.min(0.25, (t - b.t) / 1000)
      const p = b.p
      return { x: p[1] + Math.sin(p[4]) * p[5] * dt, y: p[2], z: p[3] + Math.cos(p[4]) * p[5] * dt, yaw: p[4], slide: p[6], flags: p[7], speed: p[5], steer: p[9] ?? 0 }
    }
    const f = b.t === a.t ? 1 : Math.max(0, (t - a.t) / (b.t - a.t))
    let dy = b.p[4] - a.p[4]
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    const L = (u: number, v: number) => u + (v - u) * f
    const h = (b.t - a.t) / 1000
    const x = hermite(a.p[1], Math.sin(a.p[4]) * a.p[5], b.p[1], Math.sin(b.p[4]) * b.p[5], f, h)
    const z = hermite(a.p[3], Math.cos(a.p[4]) * a.p[5], b.p[3], Math.cos(b.p[4]) * b.p[5], f, h)
    return { x, y: L(a.p[2], b.p[2]), z, yaw: a.p[4] + dy * f, slide: L(a.p[6], b.p[6]), flags: b.p[7], speed: b.p[5], steer: b.p[9] ?? 0 }
  }

  private render(now: number, frame: number) {
    const time = this.raceTime(now)
    this.world.update(time, now, this.camPos)
    const poses: Pose[] = []
    this.karts.forEach((k, i) => {
      const m = this.meshes[i]
      let x = k.x, y = k.y, z = k.z, yaw = k.yaw, slide = k.slide, flags = 0, speed = k.speed
      if (this.local.has(i)) {
        flags = (k.drift ? F_DRIFT : 0) | (k.boostT > 0 ? F_BOOST : 0) | (k.spinT > 0 ? F_SPIN : 0) | (isShielded(k) ? F_SHIELD : 0) | (k.airborne ? F_AIR : 0) | (k.slowT > 0 ? F_SLOW : 0) | (k.offroad ? F_OFF : 0) | (this.isBraking(i) ? F_BRAKE : 0)
        poses.push([i, r2(x), r2(y), r2(z), r2(yaw), r2(speed), r2(slide), flags | (driftLevel(k) << 8), Math.round(this.prog[i]), r2(this.steers[i])])
        const q = this.before.get(i)
        if (q) {
          const f = this.acc / DT
          x = q.x + (x - q.x) * f
          y = q.y + (y - q.y) * f
          z = q.z + (z - q.z) * f
          yaw = q.yaw + (yaw - q.yaw) * f
        }
        if (k.fallT > 0) y -= (1.2 - k.fallT) * 6
      } else {
        const p = this.remotePose(i, now)
        if (p) {
          ;({ x, y, z, yaw, slide, flags, speed } = p)
          this.steers[i] += (p.steer - this.steers[i]) * 0.3
        }
        // HP lain: pakai posisi interpolasi juga untuk tabrakan
        k.x = x; k.y = y; k.z = z
      }
      m.position.set(x, y, z)
      m.rotation.y = yaw + slide
      const ud = m.userData as KartRig & { shadow: THREE.Mesh }
      ud.tilt.rotation.z = (flags & F_DRIFT ? (slide > 0 ? 1 : -1) * 0.12 : 0) + Math.sin(now / 90 + i) * Math.min(0.02, Math.abs(speed) / 2000)
      ud.tilt.position.y = flags & F_AIR ? 0 : Math.abs(Math.sin(now / 70 + i)) * Math.min(0.06, Math.abs(speed) / 600)
      this.animateRig(ud, i, speed, flags, now, frame)
      const gi = Math.round(k.s / 2)
      const gy = this.t.py[((gi % this.t.n) + this.t.n) % this.t.n]
      ud.shadow.position.y = Math.max(0.08, gy - y + 0.1)
      this.shieldFx(i, m, (flags & F_SHIELD) !== 0)
      // squash & stretch saat mendarat
      if (this.squash[i] > 0) {
        this.squash[i] = Math.max(0, this.squash[i] - frame * 4)
        const q = Math.sin(this.squash[i] * Math.PI) * 0.18
        m.scale.set(1 + q, 1 - q, 1 + q)
      } else m.scale.set(1, 1, 1)
      this.effects(i, x, y, z, yaw, speed, flags, frame)
    })
    this.ambient(frame)
    this.particles.update(frame)
    this.skids.update(frame)

    // kirim pose ke HP lain
    this.sendAcc += frame
    if (this.o.live && this.sendAcc >= SEND_EVERY && poses.length) {
      this.sendAcc = Math.min(this.sendAcc - SEND_EVERY, SEND_EVERY)
      this.o.live.send({ p: poses, at: Math.round(now) })
    }

    this.renderEntities(now, frame)
    this.updateClouds(now, frame)
    SHIELD_MAT.uniforms.time.value = now / 1000
    this.placeCamera(false, frame)
    this.followSun()
    if (this.contextLost) {
      // tunggu context kembali; simulasi & pengiriman pose tetap jalan
    } else if (this.composer) this.composer.render(frame)
    else this.renderer.render(this.world.scene, this.camera)

    // hitung mundur: lampu gerbang menyala satu per satu lalu hijau
    const left = (this.goAt - now) / 1000
    this.world.setLights(left <= 0 ? 6 : Math.max(0, Math.min(5, Math.floor(((COUNTDOWN - left) / (COUNTDOWN - 0.6)) * 5))))
    const c = Math.ceil(left)
    if (c !== this.countShown && c <= 3 && c >= 0) {
      this.countShown = c
      this.o.onSound(c === 0 ? 'go' : 'count')
    }

    this.hudAcc += frame
    if (this.hudAcc >= 0.1) {
      this.hudAcc = 0
      this.emitHud(now, left)
    }
  }

  private emitHud(now: number, left: number) {
    const s = this.state
    const ranks = this.ranks()
    const i = Math.max(0, this.mine)
    const k = this.karts[i]
    const bounds = this.bounds ?? (this.bounds = this.mapBounds())
    this.o.onHud({
      count: left,
      rank: ranks.indexOf(i) + 1,
      total: this.karts.length,
      lap: Math.min(s.opts.laps, Math.max(1, this.crossed[i])),
      laps: s.opts.laps,
      speed: Math.round(Math.abs(k.speed) * 3.6),
      drift: driftLevel(k),
      boost: k.boostT > 0,
      timeMs: s.times[i] ?? Math.max(0, now - this.goAt),
      finished: s.times[i] !== null || this.crossed[i] - 1 >= s.opts.laps,
      wrongWay: this.wrongT > 1,
      rolling: this.rolling.has(i),
      dots: this.karts.map((kk, j) => ({
        x: (kk.x - bounds.x) / bounds.w,
        z: (kk.z - bounds.z) / bounds.w,
        me: j === i,
        color: CHARACTERS[s.racers[j].char].color,
      })),
      slow: k.slowT > 0,
      shield: k.shieldT > 0,
      intro: !this.introSkipped && now - this.startAt < INTRO * 1000,
    })
  }

  private bounds?: { x: number; z: number; w: number }
  mapBounds() {
    const t = this.t
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let i = 0; i < t.n; i++) {
      minX = Math.min(minX, t.px[i]); maxX = Math.max(maxX, t.px[i])
      minZ = Math.min(minZ, t.pz[i]); maxZ = Math.max(maxZ, t.pz[i])
    }
    const w = Math.max(maxX - minX, maxZ - minZ) * 1.08
    return { x: (minX + maxX) / 2 - w / 2, z: (minZ + maxZ) / 2 - w / 2, w }
  }

  /** garis lintasan untuk minimap (0..1) */
  mapPath(): string {
    const b = this.mapBounds()
    const pts: string[] = []
    for (let i = 0; i < this.t.n; i += 6) pts.push(`${(((this.t.px[i] - b.x) / b.w) * 100).toFixed(1)},${(((this.t.pz[i] - b.z) / b.w) * 100).toFixed(1)}`)
    return pts.join(' ')
  }

  /** lewati kamera intro (hitung mundur tetap sama di semua HP) */
  skipIntro() {
    this.introSkipped = true
  }

  private placeCamera(snap: boolean, frame = 0) {
    const i = Math.max(0, this.mine)
    const k = this.karts[i]
    const m = this.meshes[i]
    if (!m) return
    const now = performance.now()
    const fx = Math.sin(k.yaw)
    const fz = Math.cos(k.yaw)
    // kamera rendah & dekat seperti game kart konsol: kart + pembalap terlihat besar
    const back = 6.2 + Math.min(2.2, Math.abs(k.speed) / 18)
    let want = new THREE.Vector3(m.position.x - fx * back, m.position.y + 2.9, m.position.z - fz * back)
    let look = new THREE.Vector3(m.position.x + fx * 8, m.position.y + 1.9, m.position.z + fz * 8)
    const intro = (now - this.startAt) / (INTRO * 1000)
    if (intro < 1 && !this.introSkipped) {
      // intro: terbang rendah menyusuri lintasan menuju grid start, lalu menyatu ke kamera kejar
      const u = intro * intro * (3 - 2 * intro)
      const L = this.t.length
      const s = L * 0.16 * (1 - u) - 30 * u
      const p = pointAt(this.t, s, (1 - u) * 26)
      const q = pointAt(this.t, s - 60, 0)
      want = new THREE.Vector3(p.x, p.y + 6 + (1 - u) * 34, p.z)
      look = new THREE.Vector3(q.x, q.y + 2, q.z)
      if (u > 0.85) {
        const f = (u - 0.85) / 0.15
        want.lerp(new THREE.Vector3(m.position.x - fx * back, m.position.y + 2.9, m.position.z - fz * back), f)
        look.lerp(new THREE.Vector3(m.position.x + fx * 8, m.position.y + 1.9, m.position.z + fz * 8), f)
      }
      snap = true
    } else if (this.finishAt) {
      // finish: kamera mengitari kart sendiri
      const a = (now - this.finishAt) / 1000 * 0.45 + k.yaw + Math.PI
      want = new THREE.Vector3(m.position.x + Math.sin(a) * 8.5, m.position.y + 3.4, m.position.z + Math.cos(a) * 8.5)
      look = new THREE.Vector3(m.position.x, m.position.y + 1.8, m.position.z)
    }
    if (snap) {
      this.camPos.copy(want)
      this.camLook.copy(look)
    } else {
      const f = 1 - Math.pow(0.0008, frame)
      this.camPos.lerp(want, f)
      this.camLook.lerp(look, Math.min(1, f * 1.6))
    }
    this.camera.position.copy(this.camPos)
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6
      this.shake = Math.max(0, this.shake - frame * 2.5)
    }
    this.camera.lookAt(this.camLook)
    const fov = 62 + (k.boostT > 0 ? 12 : 0) + Math.min(8, Math.abs(k.speed) / 6)
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, frame * 4)
      this.camera.updateProjectionMatrix()
    }
  }

  /** roda berputar & berbelok, setir diputar, pembalap miring/menoleh, pusing saat kena, selebrasi saat finish */
  private animateRig(r: KartRig, i: number, speed: number, flags: number, now: number, dt: number) {
    const st = this.steers[i]
    const t = now / 1000
    for (const w of r.wheels) w.rotation.x += (speed * dt) / 0.5
    for (const w of r.front) w.rotation.y = -st * 0.45
    for (const s of r.steer) s.quaternion.setFromAxisAngle(STEER_AXIS, st * 1.4)
    const spin = (flags & F_SPIN) !== 0
    const done = this.state.times[i] !== null
    const boost = (flags & F_BOOST) !== 0
    for (const b of r.body) {
      b.rotation.z = st * 0.16
      b.position.y = Math.sin(t * 9 + i) * Math.min(0.04, Math.abs(speed) / 900)
    }
    for (const h of r.head) {
      h.rotation.y = -st * 0.35 + (spin ? Math.sin(t * 14) * 0.5 : 0)
      h.rotation.z = st * 0.2 + (spin ? Math.cos(t * 11) * 0.3 : 0)
      h.rotation.x = boost ? -0.18 : done ? Math.sin(t * 6) * 0.15 : 0
    }
    // lengan: ikut memutar setir; finish = kedua tangan diangkat & dilambai
    for (const [arms, side] of [[r.armL, -1], [r.armR, 1]] as const) {
      for (const a of arms) {
        if (done) {
          a.rotation.x = -2.3 + Math.sin(t * 8 + side) * 0.25
          a.rotation.z = side * 0.25
        } else {
          a.rotation.x = st * side * 0.35
          a.rotation.z = 0
        }
      }
    }
  }

  /**
   * Partikel suasana di sekitar kamera sesuai tema (salju turun, debu gurun, kunang-kunang, bara, kelopak)
   * plus asap dari cerobong / kawah landmark. Jumlahnya mengikuti tingkat grafis.
   */
  private ambient(dt: number) {
    const p = this.particles
    const c = this.camPos
    const k = Math.min(1, this.tier.particles / 420)
    // cincin di sekitar kamera, tidak terlalu dekat lensa (partikel dekat kamera jadi raksasa & menutup layar)
    const around = (r: number, y0: number, y1: number) => {
      const a = Math.random() * Math.PI * 2
      const d = 14 + Math.random() * (r / 2 - 14)
      return [c.x + Math.cos(a) * d, c.y + y0 + Math.random() * (y1 - y0), c.z + Math.sin(a) * d] as const
    }
    const rate = (n: number) => Math.random() < dt * n * k
    switch (this.t.def.id) {
      case 'salju':
        for (let j = 0; j < 3; j++) if (rate(40)) {
          const [x, y, z] = around(90, 6, 30)
          p.emit('snow', x, y, z, 1.5, -2, 0.5, '#ffffff', 0.45)
        }
        break
      case 'neon':
        for (let j = 0; j < 4; j++) if (rate(45)) {
          const [x, y, z] = around(70, 4, 26)
          p.emit('rain', x, y, z, 1, -46, 0.6, '#c4d0ff', 0.5)
        }
        break
      case 'candi':
        if (rate(25)) {
          const [x, y, z] = around(80, 0, 6)
          p.emit('dust', x, y, z, 9, 0.4, 3, '#f2d79a', 1)
        }
        break
      case 'jamur':
        if (rate(18)) {
          const [x, y, z] = around(70, 1, 10)
          p.emit('star', x, y, z, (Math.random() - 0.5) * 1.5, 0.6, (Math.random() - 0.5) * 1.5, Math.random() < 0.5 ? '#c8ff5a' : '#5cf6ff', 0.35)
        }
        break
      case 'lava':
        for (let j = 0; j < 2; j++) if (rate(30)) {
          const [x, y, z] = around(90, -2, 4)
          p.emit('fire', x, y, z, (Math.random() - 0.5) * 2, 3 + Math.random() * 4, (Math.random() - 0.5) * 2, Math.random() < 0.6 ? '#ff8a1c' : '#ffcc1f', 0.3)
        }
        break
      case 'permen':
        if (rate(14)) {
          const [x, y, z] = around(80, 8, 26)
          p.emit('confetti', x, y, z, 0.5, -1, 0.3, ['#ff37a6', '#ffcae9', '#13bfae', '#ffcc1f'][Math.floor(Math.random() * 4)], 1.2)
        }
        break
    }
    for (const s of this.world.smoke) {
      if ((s.x - c.x) ** 2 + (s.z - c.z) ** 2 > 700 ** 2) continue
      if (rate(12)) p.emit('smoke', s.x + (Math.random() - 0.5) * 3, s.y, s.z + (Math.random() - 0.5) * 3, 1.5, 4, 0.5, this.t.def.id === 'lava' ? '#5a4a50' : '#fff4fa', 6)
    }
  }

  private isBraking(i: number) {
    return i === this.mine && this.controls.brake && Math.abs(this.karts[i].speed) > 10
  }

  /** peta bayangan matahari mengikuti pemain supaya tajam di sekitar kamera */
  private followSun() {
    const m = this.meshes[Math.max(0, this.mine)]
    const s = this.world.sun
    if (!m || !s.castShadow) return
    s.target.position.copy(m.position)
    s.position.set(m.position.x + 60, m.position.y + 110, m.position.z + 40)
  }

  /** percikan drift, api turbo, debu offroad, bintang pusing, bekas ban — untuk semua kart (dari flags pose) */
  private effects(i: number, x: number, y: number, z: number, yaw: number, speed: number, flags: number, dt: number) {
    const p = this.particles
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)
    const back = (side: number, b = 1.4) => [x - fx * b + rx * side, z - fz * b + rz * side] as const
    const near = (x - this.camPos.x) ** 2 + (z - this.camPos.z) ** 2 < 160 ** 2
    const air = (flags & F_AIR) !== 0
    const drift = (flags & F_DRIFT) !== 0
    const lvl = (flags >> 8) & 3
    if (near && drift && !air) {
      for (const side of [-1, 1]) {
        const [wx, wz] = back(side * 1.05)
        if (lvl > 0 && Math.random() < dt * 55) p.emit('spark', wx, y + 0.3, wz, -fx * 4 + (Math.random() - 0.5) * 6, 3 + Math.random() * 3, -fz * 4 + (Math.random() - 0.5) * 6, DRIFT_COLORS[lvl])
        if (Math.random() < dt * 14) p.emit('smoke', wx, y + 0.4, wz, -fx * 2, 1, -fz * 2, '#e8e8f0', 0.8)
      }
    }
    if (near && flags & F_BOOST) {
      const pipes = (this.meshes[i].userData as KartRig).exhaust
      for (const e of pipes.length ? pipes : [new THREE.Vector3(0, 0.9, -2)]) {
        // lokal kart → dunia (kart berputar di sumbu Y)
        const ex = x + e.x * rx + e.z * fx
        const ez = z + e.x * rz + e.z * fz
        if (Math.random() < dt * 70) p.emit('fire', ex, y + e.y, ez, -fx * (6 + Math.random() * 4), 0.5, -fz * (6 + Math.random() * 4), Math.random() < 0.5 ? '#ff8a1c' : '#ffcc1f', 0.9)
      }
    }
    if (near && flags & F_OFF && !air && Math.abs(speed) > 8) {
      const d = DUST[this.t.def.theme.offroad] ?? DUST.pasir
      for (const side of [-1, 1]) {
        const [wx, wz] = back(side * 1.05)
        if (Math.random() < dt * 22) p.emit(d.kind, wx, y + 0.3, wz, -fx * 3 + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, -fz * 3 + (Math.random() - 0.5) * 3, d.colors[Math.floor(Math.random() * d.colors.length)])
      }
    }
    if (near && flags & F_SPIN && Math.random() < dt * 8) p.emit('star', x, y + 3.2, z, (Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3, '#ffcc1f')
    // bekas ban: drift atau rem di aspal
    const marking = (drift || (flags & F_BRAKE) !== 0) && !air && !(flags & F_OFF)
    for (const side of [-1, 1]) {
      const [wx, wz] = back(side * 1.05, 1.1)
      this.skids.mark(i * 2 + (side > 0 ? 1 : 0), wx, y, wz, yaw, marking, drift ? 0.5 : 0.35)
    }
  }

  /** benda item di lintasan: model detail + jejak api roket, percikan sumbu & ledakan petasan */
  private renderEntities(now: number, dt: number) {
    const alive = new Set<number>()
    const p0 = this.particles
    for (const e of this.state.entities) {
      const age = (now - (this.born.get(e.id) ?? now)) / 1000
      const p = entityPose(this.t, e, age)
      if (!p) continue
      alive.add(e.id)
      let m = this.entityMeshes.get(e.id)
      if (!m) {
        m = placed(e.kind)
        m.scale.setScalar(e.kind === 'pisang' ? 1.25 : 1.1)
        this.fxGroup.add(m)
        this.entityMeshes.set(e.id, m)
      }
      m.position.set(p.x, p.y, p.z)
      if (e.kind === 'pisang') {
        m.position.y = p.y - 0.25
        m.rotation.y = e.id * 1.7
      } else if (e.kind === 'roket') {
        const q = pointAt(this.t, e.s + age * 62, e.lane)
        m.rotation.set(0, q.yaw, Math.sin(age * 9) * 0.25)
        m.position.y = p.y - 0.6 + Math.sin(age * 7) * 0.2
        // jejak api & asap dari nosel belakang (depan model = +Z)
        const bx = p.x - Math.sin(q.yaw) * 1.2
        const bz = p.z - Math.cos(q.yaw) * 1.2
        if (Math.random() < dt * 90) p0.emit('fire', bx, p.y - 0.1, bz, (Math.random() - 0.5) * 2, 0.5, (Math.random() - 0.5) * 2, Math.random() < 0.5 ? '#ff8a1c' : '#ffcc1f', 1.1)
        if (Math.random() < dt * 30) p0.emit('smoke', bx, p.y, bz, 0, 1, 0, '#f0eef4', 0.8)
      } else if (e.kind === 'petasan') {
        const blast = p.live
        m.visible = age < 0.8
        m.rotation.set(age * 6, age * 4, 0)
        // percikan sumbu saat melayang
        if (!blast && age < 0.8 && Math.random() < dt * 50) p0.emit('spark', p.x, p.y + 1.2, p.z, (Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4, '#ffcc1f', 0.8)
        if (blast && !this.handled.has(`snd${e.id}`)) {
          this.handled.add(`snd${e.id}`)
          // ledakan di kejauhan: bunyinya mengecil, tanpa efek layar (efek "kena" hanya dari checkEntity)
          const mine = this.karts[Math.max(0, this.mine)]
          const far = Math.hypot(mine.x - p.x, mine.z - p.z)
          if (far < 160) this.o.onSound('blast', { volume: 0.6 * (1 - far / 160), noFx: true })
          if (far < 40) this.shake = Math.max(this.shake, 0.6 * (1 - far / 40))
          p0.burst('fire', 40, p.x, p.y + 1, p.z, 0, 4, 0, 22, ['#ff8a1c', '#ffcc1f', '#ff3b5c'], 2.2)
          p0.burst('smoke', 22, p.x, p.y + 1.5, p.z, 0, 3, 0, 10, ['#8a8090', '#c8c0d0'], 2.4)
          p0.burst('spark', 30, p.x, p.y + 1, p.z, 0, 8, 0, 26, ['#ffffff', '#ffcc1f', '#ff37a6'])
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffcc1f', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))
          ring.rotation.x = Math.PI / 2
          ring.position.set(p.x, p.y + 0.5, p.z)
          ring.userData.born = now
          this.fxGroup.add(ring)
          this.rings.push(ring)
        }
      }
    }
    for (const [id, m] of this.entityMeshes) {
      if (alive.has(id)) continue
      this.fxGroup.remove(m)
      this.entityMeshes.delete(id)
    }
    // gelombang kejut petasan melebar & memudar
    this.rings = this.rings.filter((r) => {
      const a = (now - (r.userData.born as number)) / 1000
      if (a > 0.5) {
        this.fxGroup.remove(r)
        return false
      }
      r.scale.setScalar(1 + a * 16)
      ;(r.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - a / 0.5)
      return true
    })
  }
  private rings: THREE.Mesh[] = []

  /** pecahan kotak item saat diambil */
  private boxBurst(x: number, y: number, z: number) {
    this.particles?.burst('star', 14, x, y, z, 0, 3, 0, 9, ['#ff3b5c', '#ffcc1f', '#5cf64a', '#2f7bff', '#ff37a6', '#fff4fa'], 1.1)
    this.particles?.burst('spark', 18, x, y, z, 0, 4, 0, 12, ['#ffffff', '#bfe9ff'])
  }

  private showCloud(i: number) {
    if (this.clouds.has(i)) return
    const g = new THREE.Group()
    const c = placed('awan')
    c.scale.setScalar(1.5)
    c.rotation.y = Math.PI
    g.add(c)
    g.userData.until = performance.now() + 4000
    this.fxGroup.add(g)
    this.clouds.set(i, g)
  }

  private updateClouds(now: number, dt: number) {
    for (const [i, c] of this.clouds) {
      if (now > (c.userData.until as number)) {
        this.fxGroup.remove(c)
        this.clouds.delete(i)
        continue
      }
      const m = this.meshes[i]
      c.position.set(m.position.x, m.position.y + 6.8 + Math.sin(now / 300) * 0.2, m.position.z)
      c.rotation.y = m.rotation.y
      // hujan menetes ke pembalap
      for (let k = 0; k < 2; k++) {
        if (Math.random() < dt * 40) this.particles.emit('splash', c.position.x + (Math.random() - 0.5) * 2.4, c.position.y - 0.8, c.position.z + (Math.random() - 0.5) * 2.4, 0, -10, 0, '#4a9aff', 0.5)
      }
    }
  }

  private shieldFx(i: number, m: THREE.Group, on: boolean) {
    let s = this.shieldMeshes.get(i)
    if (on && !s) {
      s = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 3), SHIELD_MAT)
      s.position.y = 1.7
      m.add(s)
      this.shieldMeshes.set(i, s)
    }
    if (s) {
      s.visible = on
      if (on) s.rotation.y += 0.02
    }
  }

  /** turunkan resolusi kalau HP kewalahan */
  private adapt(frame: number) {
    this.fpsT += frame
    this.fpsN++
    if (this.fpsT < 2) return
    const fps = this.fpsN / this.fpsT
    this.fpsT = 0
    this.fpsN = 0
    if (fps >= 40) return
    if (this.ratio > 1) {
      this.ratio = Math.max(1, this.ratio - 0.25)
      this.resize()
    } else if (this.tier.q !== 'low') {
      // masih lambat: turunkan tingkat grafis satu langkah, resolusi jangan naik lagi
      const ratio = this.ratio
      this.setQuality(this.tier.q === 'high' ? 'med' : 'low')
      this.ratio = Math.min(this.ratio, ratio)
      this.o.onQuality?.(this.tier.q)
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.stopLive?.()
    this.o.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.o.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.particles?.dispose()
    this.skids?.dispose()
    this.dropPost()
    this.world?.dispose()
    this.renderer.dispose()
    // tiap balapan memakai canvas baru; context lama dilepas supaya tidak menumpuk sampai batas browser.
    // canvas yang masih terpasang dipakai lagi (StrictMode), jadi context-nya jangan dimatikan
    const { canvas } = this.o
    setTimeout(() => {
      if (!canvas.isConnected) this.renderer.forceContextLoss()
    })
  }
}
