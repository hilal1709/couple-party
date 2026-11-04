import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { clockText } from '../engine'
import { MAZE_MARKERS, MAZE_SIZE } from '../modules'
import type { BombModule, ButtonColor, Dir, JinakAction, JinakState, LockLamp, WireColor } from '../types'
import { drawSymbol } from '../ui/symbols'
import { Stage, type Quality } from './stage'

const MODELS = import.meta.glob('/src/assets/jinak/models/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SKY = import.meta.glob('/src/assets/sport/tex/langit-malam.hdr', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const model = (n: string) => MODELS[`/src/assets/jinak/models/${n}.glb`]

/* ukuran sama dengan scripts/blender/jinak.py */
const SLOT = 0.8
const GAP = 0.1
const COLS = 4
const ROWS = 2
const FRONT_W = COLS * SLOT + (COLS + 1) * GAP
const FRONT_H = ROWS * SLOT + (ROWS + 1) * GAP
const DEPTH = 1.0
/** slot ke-1 = timer, modul mengisi sisanya berurutan */
export const TIMER_SLOT = 1
export const moduleSlots = (n: number) => [0, 2, 3, 4, 5, 6, 7].slice(0, n)

const HEX: Record<WireColor | ButtonColor | LockLamp, string> = {
  merah: '#e0262f',
  biru: '#1f5fe0',
  kuning: '#f4c21b',
  hijau: '#2fbf3a',
  putih: '#f2f2ee',
  hitam: '#1b1b1d',
}
const LCD_GREEN = '#9cff6a'

type Hit = { mod: number; part: string; index?: number }
/** aksi modul tanpa `left`: diisi UI dengan sisa waktu saat ini */
export type ModAction = JinakAction extends infer A ? (A extends { left: number } ? Omit<A, 'left'> : never) : never
type Callbacks = {
  act: (a: ModAction) => void
  /** sisa waktu (ms) & teks timer seperti terlihat sekarang */
  left: () => number
  onFocus: (mod: number | null) => void
}

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
/** layar LCD: garis pindai, kisi piksel, kedip halus, dan cahaya berlebih supaya ditangkap bloom */
const LCD_FRAG = `
  uniform sampler2D map; uniform float uTime; uniform float uGlow; uniform vec2 uGrid; uniform float uFlash;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(map, vUv).rgb;
    vec2 px = fract(vUv * uGrid);
    float grid = mix(0.72, 1.0, smoothstep(0.0, 0.18, px.x) * smoothstep(0.0, 0.18, px.y));
    float scan = 0.9 + 0.1 * sin(vUv.y * uGrid.y * 6.2831 * 0.5 + uTime * 3.0);
    float flick = 0.97 + 0.03 * sin(uTime * 57.0) * sin(uTime * 11.0);
    vec2 d = vUv - 0.5;
    float edge = 1.0 - dot(d, d) * 0.9;
    c *= grid * scan * flick * edge * uGlow;
    c += vec3(0.02, 0.015, 0.01) * edge;
    c = mix(c, vec3(2.2, 0.2, 0.15), uFlash);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`

function lcd(tex: THREE.Texture, grid: [number, number], glow = 1.8) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uGlow: { value: glow }, uGrid: { value: new THREE.Vector2(...grid) }, uFlash: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: LCD_FRAG,
    toneMapped: false,
  })
}

class Canvas {
  c = document.createElement('canvas')
  g: CanvasRenderingContext2D
  tex: THREE.CanvasTexture
  constructor(w: number, h: number, aniso: number) {
    this.c.width = w
    this.c.height = h
    this.g = this.c.getContext('2d')!
    this.tex = new THREE.CanvasTexture(this.c)
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.anisotropy = aniso
    this.tex.generateMipmaps = true
    this.tex.minFilter = THREE.LinearMipmapLinearFilter
  }
  done() {
    this.tex.needsUpdate = true
  }
}

/* ---------- 7 segmen ---------- */
const SEG: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' }
function seg(g: CanvasRenderingContext2D, ch: string, x: number, y: number, w: number, h: number, on: string, off: string) {
  const t = w * 0.17
  const skew = w * 0.12
  const half = h / 2
  const bars: Record<string, [number, number, number, number]> = {
    a: [x + t, y, w - 2 * t, t],
    g: [x + t, y + half - t / 2, w - 2 * t, t],
    d: [x + t, y + h - t, w - 2 * t, t],
    f: [x, y + t, t, half - t * 1.5],
    b: [x + w - t, y + t, t, half - t * 1.5],
    e: [x, y + half + t / 2, t, half - t * 1.5],
    c: [x + w - t, y + half + t / 2, t, half - t * 1.5],
  }
  for (const [k, [bx, by, bw, bh]] of Object.entries(bars)) {
    const lit = (SEG[ch] ?? '').includes(k)
    g.fillStyle = lit ? on : off
    const sk = skew * (1 - (by - y) / h)
    g.beginPath()
    const r = Math.min(bw, bh) / 2
    g.roundRect(bx + sk - skew / 2, by, bw, bh, r)
    g.fill()
  }
}

/** normal map karet kabel: guratan halus memanjang, berulang mulus */
function rubberNormal(): THREE.DataTexture {
  const w = 64
  const h = 256
  const data = new Uint8Array(w * h * 4)
  const height = (x: number, y: number) =>
    0.5 + 0.25 * Math.sin((y / h) * Math.PI * 2 * 40 + Math.sin((x / w) * Math.PI * 2 * 3) * 1.5) + 0.15 * Math.sin((x / w) * Math.PI * 2 * 7 + (y / h) * Math.PI * 2 * 5)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = height((x + 1) % w, y) - height((x - 1 + w) % w, y)
      const dy = height(x, (y + 1) % h) - height(x, (y - 1 + h) % h)
      const n = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize()
      const i = (y * w + x) * 4
      data[i] = (n.x * 0.5 + 0.5) * 255
      data[i + 1] = (n.y * 0.5 + 0.5) * 255
      data[i + 2] = (n.z * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  const t = new THREE.DataTexture(data, w, h)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 6)
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

/** bidang datar menggantikan mesh penanda dari Blender, menghadap +Z lokal slot */
function facePlane(mesh: THREE.Object3D, mat: THREE.Material, axis: 'z' | 'x' | '-x' = 'z') {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const parent = mesh.parent!
  parent.updateWorldMatrix(true, false)
  const inv = parent.matrixWorld.clone().invert()
  let geo: THREE.PlaneGeometry
  const p = new THREE.Mesh(undefined, mat)
  if (axis === 'z') {
    geo = new THREE.PlaneGeometry(size.x, size.y)
    p.position.set(center.x, center.y, box.max.z + 0.0015)
  } else {
    geo = new THREE.PlaneGeometry(size.z, size.y)
    const s = axis === 'x' ? 1 : -1
    p.rotation.y = (s * Math.PI) / 2
    p.position.set(axis === 'x' ? box.max.x + 0.0015 : box.min.x - 0.0015, center.y, center.z)
  }
  p.geometry = geo
  p.applyMatrix4(inv)
  parent.add(p)
  mesh.visible = false
  return p
}

type ModView = {
  group: THREE.Group
  led: THREE.MeshStandardMaterial
  update: (m: BombModule, solved: boolean) => void
  tick?: (t: number) => void
}

export class BombScene {
  stage: Stage
  private cb: Callbacks
  private gltf = new Map<string, GLTF>()
  private bomb = new THREE.Group()
  private world = new THREE.Group()
  private views: ModView[] = []
  private hits: THREE.Object3D[] = []
  private timer: { cv: Canvas; mat: THREE.ShaderMaterial } | null = null
  private lcds: THREE.ShaderMaterial[] = []
  private state: JinakState | null = null
  private builtFor = ''
  private interactive = false
  private aniso = 4
  private wireNormal = rubberNormal()
  /** rotasi bom (drag) & fokus kamera */
  private yaw = 0
  private pitch = 0.12
  private yawT = 0
  private pitchT = 0.12
  private focusMod: number | null = null
  private camPos = new THREE.Vector3()
  private camLook = new THREE.Vector3()
  private shake = 0
  private flash = 0
  private holding: { mod: number; at: number; lit: boolean } | null = null
  /** pilihan lokal penjinak: huruf kata sandi & angka gembok */
  private local = new Map<number, number[]>()
  private ray = new THREE.Raycaster()
  private down: { x: number; y: number; yaw: number; pitch: number; moved: boolean; id: number } | null = null
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, quality: Quality, cb: Callbacks) {
    this.canvas = canvas
    this.cb = cb
    this.stage = new Stage(canvas, quality)
    this.aniso = this.stage.anisotropy
    this.stage.scene.add(this.world)
    this.world.add(this.bomb)
    this.stage.onFrame = (dt, t) => this.frame(dt, t)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
  }

  async load() {
    const loader = new GLTFLoader()
    const names = ['casing', 'panel', 'blank', 'timer', 'button', 'key', 'terminal', 'dial', 'battery', 'desk', 'mug', 'driver']
    await Promise.all(names.map(async (n) => this.gltf.set(n, await loader.loadAsync(model(n)))))
    for (const g of this.gltf.values())
      g.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
        if (!m) return
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap'] as const) {
          const t = m[k]
          if (t) t.anisotropy = this.aniso
        }
        o.castShadow = true
        o.receiveShadow = true
      })
    const sky = await new HDRLoader().loadAsync(Object.values(SKY)[0])
    sky.mapping = THREE.EquirectangularReflectionMapping
    const pmrem = new THREE.PMREMGenerator(this.stage.renderer)
    this.stage.scene.environment = pmrem.fromEquirectangular(sky).texture
    this.stage.scene.environmentIntensity = 0.55
    pmrem.dispose()
    sky.dispose()
    this.stage.scene.background = new THREE.Color('#0d0a0c')
    this.stage.scene.fog = new THREE.Fog('#0d0a0c', 7, 16)
    this.setupRoom()
    this.stage.start()
  }

  private clone(n: string) {
    return this.gltf.get(n)!.scene.clone(true)
  }

  private setupRoom() {
    const s = this.stage
    const lamp = new THREE.SpotLight('#ffe2b8', 60, 14, 0.62, 0.55, 1.6)
    lamp.position.set(-2.6, 4.6, 3.2)
    lamp.target.position.set(0, -0.3, 0)
    lamp.shadow.bias = -0.0004
    lamp.shadow.normalBias = 0.02
    lamp.shadow.radius = 4
    s.scene.add(lamp, lamp.target)
    const rim = new THREE.DirectionalLight('#7fb6ff', 0.9)
    rim.position.set(4, 2.5, -4)
    const fill = new THREE.HemisphereLight('#ffd6ea', '#1a0f0a', 0.35)
    s.scene.add(rim, fill)
    s.lights = [lamp]
    s.setQuality(s.quality)

    const floorY = -FRONT_H / 2 - 0.045
    const desk = this.clone('desk')
    desk.position.y = floorY
    this.world.add(desk)
    const mug = this.clone('mug')
    mug.position.set(-2.75, floorY, 0.7)
    mug.rotation.y = 0.8
    mug.scale.setScalar(1.15)
    this.world.add(mug)
    const drv = this.clone('driver')
    drv.position.set(2.45, floorY + 0.065, 1.05)
    drv.rotation.y = -0.5
    this.world.add(drv)
  }

  /* ---------- bangun bom sesuai state ---------- */

  setState(s: JinakState, interactive: boolean) {
    this.interactive = interactive
    const key = `${s.round}:${s.info.serial}`
    if (key !== this.builtFor) this.build(s, key)
    const prev = this.state
    this.state = s
    this.views.forEach((v, i) => v.update(s.modules[i], s.solved[i]))
    if (prev && s.event && s.event.id !== prev.event?.id && s.event.kind === 'strike') {
      this.shake = 1
      this.flash = 1
      const v = this.views[s.event.mod]
      if (v) v.led.userData.strikeAt = performance.now()
    }
    if (s.phase !== 'live' && this.focusMod !== null) this.focus(null)
  }

  private build(s: JinakState, key: string) {
    this.builtFor = key
    this.bomb.clear()
    this.views = []
    this.hits = []
    this.lcds = []
    this.local.clear()
    this.focusMod = null
    this.yawT = 0

    const casing = this.clone('casing')
    this.bomb.add(casing)
    casing.updateWorldMatrix(true, true)
    // pelat seri & stiker
    const serialMesh = casing.getObjectByName('serial')
    if (serialMesh) {
      const cv = new Canvas(512, 256, this.aniso)
      const g = cv.g
      g.fillStyle = '#f2eee2'
      g.fillRect(0, 0, 512, 256)
      g.strokeStyle = '#121212'
      g.lineWidth = 6
      g.strokeRect(10, 10, 492, 236)
      g.fillStyle = '#121212'
      g.font = '700 38px "Geist Variable", system-ui, sans-serif'
      g.fillText('NO. SERI', 34, 70)
      g.font = '800 104px ui-monospace, "Courier New", monospace'
      g.fillText(s.info.serial, 30, 190)
      g.fillStyle = '#ff37a6'
      g.fillRect(380, 36, 100, 30)
      cv.done()
      facePlane(serialMesh, new THREE.MeshStandardMaterial({ map: cv.tex, roughness: 0.6 }), 'x')
    }
    for (let i = 0; i < 2; i++) {
      const spot = casing.getObjectByName(`stiker${i}`)
      if (!spot) continue
      const word = s.info.stickers[i]
      if (!word) {
        spot.visible = false
        continue
      }
      const cv = new Canvas(512, 256, this.aniso)
      const g = cv.g
      const bg = ['#ffcc1f', '#5cf64a', '#ffcae9', '#87e752', '#ff37a6'][word.length % 5]
      g.fillStyle = bg
      g.beginPath()
      g.roundRect(8, 8, 496, 240, 40)
      g.fill()
      g.lineWidth = 10
      g.strokeStyle = '#121212'
      g.stroke()
      g.fillStyle = '#121212'
      g.font = '900 120px "Dela Gothic One", system-ui, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(word, 256, 136)
      cv.done()
      facePlane(spot, new THREE.MeshStandardMaterial({ map: cv.tex, roughness: 0.45 }), '-x')
    }
    // baterai di rak atas
    for (let i = 0; i < s.info.batteries; i++) {
      const b = this.clone('battery')
      b.position.set(-0.75 + (i % 2) * 1.5 + (i >= 2 ? 0.4 : 0), FRONT_H / 2 + 0.085, -0.05 + (i >= 2 ? 0.25 : 0))
      b.rotation.y = i * 0.07
      this.bomb.add(b)
    }

    // slot
    const slots = moduleSlots(s.modules.length)
    for (let k = 0; k < COLS * ROWS; k++) {
      const g = new THREE.Group()
      const c = k % COLS
      const r = Math.floor(k / COLS)
      g.position.set(-FRONT_W / 2 + GAP + SLOT / 2 + c * (SLOT + GAP), FRONT_H / 2 - GAP - SLOT / 2 - r * (SLOT + GAP), DEPTH / 2 + 0.045)
      g.userData.slot = k
      this.bomb.add(g)
      const mi = slots.indexOf(k)
      if (k === TIMER_SLOT) this.buildTimer(g)
      else if (mi >= 0) this.views[mi] = this.buildModule(g, mi, s.modules[mi], s)
      else {
        const b = this.clone('blank')
        b.position.z = -0.025
        g.add(b)
      }
    }
  }

  private plate(g: THREE.Group) {
    const p = this.clone('panel')
    p.position.z = -0.025
    g.add(p)
    const ledMesh = p.getObjectByName('led') as THREE.Mesh
    const led = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.15, emissive: '#000000', emissiveIntensity: 3 })
    if (ledMesh) ledMesh.material = led
    return led
  }

  private hit(o: THREE.Object3D, h: Hit) {
    o.traverse((x) => {
      x.userData.hit = h
    })
    this.hits.push(o)
  }

  private screen(g: THREE.Group, w: number, h: number, pos: [number, number], px: [number, number], grid: [number, number]) {
    const cv = new Canvas(px[0], px[1], this.aniso)
    const mat = lcd(cv.tex, grid)
    this.lcds.push(mat)
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.03), new THREE.MeshStandardMaterial({ color: '#121214', roughness: 0.35, metalness: 0.2 }))
    bezel.position.set(pos[0], pos[1], 0.015)
    bezel.castShadow = true
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    glass.position.set(pos[0], pos[1], 0.0315)
    g.add(bezel, glass)
    return { cv, mat, glass }
  }

  private buildTimer(g: THREE.Group) {
    const t = this.clone('timer')
    t.position.z = -0.025
    g.add(t)
    const scr = t.getObjectByName('screen')
    const cv = new Canvas(512, 256, this.aniso)
    const mat = lcd(cv.tex, [128, 64], 2.2)
    if (scr) facePlane(scr, mat)
    this.timer = { cv, mat }
    this.lcds.push(mat)
  }

  private key(g: THREE.Group, x: number, y: number, s: number, sx = 1, sy = 1) {
    const k = this.clone('key')
    k.position.set(x, y, 0.035 * s)
    k.scale.set(s * sx, s * sy, s)
    g.add(k)
    const face = k.getObjectByName('face')
    const cv = new Canvas(256, Math.round(256 * (sy / sx)), this.aniso)
    const mat = new THREE.MeshStandardMaterial({ map: cv.tex, roughness: 0.5, emissive: '#000000', emissiveMap: cv.tex, emissiveIntensity: 0 })
    if (face) facePlane(face, mat)
    return { k, cv, mat }
  }

  private buildModule(g: THREE.Group, mod: number, m: BombModule, s: JinakState): ModView {
    const led = this.plate(g)
    const view: ModView = { group: g, led, update: () => {} }
    g.userData.mod = mod
    const plateHit = new THREE.Mesh(new THREE.PlaneGeometry(SLOT, SLOT), new THREE.MeshBasicMaterial({ visible: false }))
    plateHit.position.z = 0.002
    g.add(plateHit)
    this.hit(plateHit, { mod, part: 'plate' })

    switch (m.kind) {
      case 'kabel': {
        const n = m.wires.length
        const top = 0.16
        const bottom = -0.28
        const wires: { whole: THREE.Mesh; cut: THREE.Group }[] = []
        m.wires.forEach((color, i) => {
          const y = n === 1 ? 0 : top - ((top - bottom) * i) / (n - 1)
          const mat = new THREE.MeshPhysicalMaterial({ color: HEX[color], roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.5, normalMap: this.wireNormal, normalScale: new THREE.Vector2(0.6, 0.6) })
          for (const x of [-0.27, 0.27]) {
            const t = this.clone('terminal')
            t.position.set(x, y, 0.012)
            t.scale.setScalar(0.9)
            g.add(t)
          }
          const sag = (i % 2 ? 0.02 : -0.015) + Math.sin(i * 2.3) * 0.01
          const pts = [new THREE.Vector3(-0.27, y, 0.065), new THREE.Vector3(-0.12, y + sag, 0.1), new THREE.Vector3(0.12, y - sag, 0.1), new THREE.Vector3(0.27, y, 0.065)]
          const whole = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.017, 12), mat)
          whole.castShadow = true
          const cut = new THREE.Group()
          for (const side of [-1, 1]) {
            const end = side < 0 ? new THREE.Vector3(-0.05, y - 0.05, 0.12) : new THREE.Vector3(0.06, y + 0.04, 0.13)
            const a = side < 0 ? pts[0] : pts[3]
            const mid = side < 0 ? pts[1] : pts[2]
            const half = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, end]), 20, 0.017, 12), mat)
            const copper = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 10), new THREE.MeshStandardMaterial({ color: '#d98a3a', metalness: 1, roughness: 0.3 }))
            copper.position.copy(end)
            copper.lookAt(mid)
            copper.rotateX(Math.PI / 2)
            cut.add(half, copper)
          }
          cut.visible = false
          g.add(whole, cut)
          const hb = new THREE.Mesh(new THREE.BoxGeometry(0.5, Math.min(0.08, (top - bottom) / Math.max(1, n - 1)), 0.1), new THREE.MeshBasicMaterial({ visible: false }))
          hb.position.set(0, y, 0.09)
          g.add(hb)
          this.hit(hb, { mod, part: 'wire', index: i })
          wires.push({ whole, cut })
        })
        view.update = (mm) => {
          if (mm.kind !== 'kabel') return
          wires.forEach((w, i) => {
            const c = mm.cut.includes(i)
            w.whole.visible = !c
            w.cut.visible = c
          })
        }
        break
      }
      case 'tombol': {
        const b = this.clone('button')
        b.position.set(-0.07, -0.04, 0.0)
        b.scale.setScalar(1.35)
        g.add(b)
        const cap = b.getObjectByName('cap') as THREE.Mesh
        const capMat = (cap.material as THREE.MeshStandardMaterial).clone()
        capMat.color.set(HEX[m.color])
        cap.material = capMat
        const lbl = new Canvas(256, 256, this.aniso)
        lbl.g.fillStyle = m.color === 'putih' || m.color === 'kuning' ? '#121212' : '#ffffff'
        lbl.g.font = '900 74px "Dela Gothic One", system-ui, sans-serif'
        lbl.g.textAlign = 'center'
        lbl.g.textBaseline = 'middle'
        lbl.g.fillText(m.label, 128, 134)
        lbl.done()
        const decal = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40), new THREE.MeshStandardMaterial({ map: lbl.tex, transparent: true, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }))
        decal.position.set(-0.07, -0.04, 0.15 * 1.35 + 0.002)
        g.add(decal)
        const strip = b.getObjectByName('strip') as THREE.Mesh
        const stripMat = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.3, emissive: '#000000', emissiveIntensity: 4 })
        strip.material = stripMat
        strip.scale.set(1, 1, 0.9)
        this.hit(cap, { mod, part: 'cap' })
        this.hit(decal, { mod, part: 'cap' })
        let press = 0
        const capZ = cap.position.z
        view.tick = () => {
          const h = this.holding && this.holding.mod === mod
          press += ((h ? 1 : 0) - press) * 0.35
          cap.position.z = capZ - press * 0.025
          decal.position.z = 0.15 * 1.35 + 0.002 - press * 0.025 * 1.35
          const lit = h && this.holding!.lit
          stripMat.emissive.set(lit ? HEX[m.strip] : '#000000')
          stripMat.color.set(lit ? HEX[m.strip] : '#2a2a2c')
        }
        break
      }
      case 'simbol': {
        const keys = m.symbols.map((sym, i) => {
          const k = this.key(g, (i % 2 ? 0.15 : -0.15), i < 2 ? 0.1 : -0.2, 1.25)
          const draw = (done: boolean) => {
            const gg = k.cv.g
            gg.fillStyle = done ? '#cfffb8' : '#f3ead6'
            gg.fillRect(0, 0, 256, 256)
            drawSymbol(gg, sym, 28, 28, 200, '#141414', 9)
            k.cv.done()
            k.mat.emissiveIntensity = done ? 0.35 : 0
            k.mat.emissive.set(done ? '#5cf64a' : '#000000')
          }
          draw(false)
          this.hit(k.k, { mod, part: 'key', index: i })
          return { ...k, draw, on: false }
        })
        view.update = (mm) => {
          if (mm.kind !== 'simbol') return
          keys.forEach((k, i) => {
            const on = mm.pressed.includes(mm.symbols[i])
            if (on !== k.on) {
              k.on = on
              k.draw(on)
              k.k.position.z = on ? 0.03 : 0.044
            }
          })
        }
        break
      }
      case 'labirin': {
        const scr = this.screen(g, 0.42, 0.42, [0, -0.03], [384, 384], [96, 96])
        const arrows: [Dir, number, number, string][] = [['u', 0, 0.255, '▲'], ['d', 0, -0.315, '▼'], ['l', -0.29, -0.03, '◀'], ['r', 0.29, -0.03, '▶']]
        for (const [dir, x, y, glyph] of arrows) {
          const k = this.key(g, x, y, 0.55)
          k.cv.g.fillStyle = '#26262a'
          k.cv.g.fillRect(0, 0, 256, 256)
          k.cv.g.fillStyle = '#f3ead6'
          k.cv.g.font = '700 150px system-ui, sans-serif'
          k.cv.g.textAlign = 'center'
          k.cv.g.textBaseline = 'middle'
          k.cv.g.fillText(glyph, 128, 140)
          k.cv.done()
          this.hit(k.k, { mod, part: 'arrow', index: ['u', 'd', 'l', 'r'].indexOf(dir) })
        }
        view.update = (mm, solved) => {
          if (mm.kind !== 'labirin') return
          const gg = scr.cv.g
          const N = MAZE_SIZE
          const cell = 384 / N
          gg.fillStyle = '#06140a'
          gg.fillRect(0, 0, 384, 384)
          for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
              gg.fillStyle = '#1d4a24'
              gg.beginPath()
              gg.arc((x + 0.5) * cell, (y + 0.5) * cell, 4, 0, Math.PI * 2)
              gg.fill()
            }
          gg.strokeStyle = LCD_GREEN
          gg.lineWidth = 6
          for (const [x, y] of MAZE_MARKERS[mm.maze]) {
            gg.beginPath()
            gg.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.32, 0, Math.PI * 2)
            gg.stroke()
          }
          const [gx, gy] = mm.goal
          gg.fillStyle = '#ff4a3a'
          gg.beginPath()
          gg.moveTo((gx + 0.5) * cell, (gy + 0.2) * cell)
          gg.lineTo((gx + 0.82) * cell, (gy + 0.8) * cell)
          gg.lineTo((gx + 0.18) * cell, (gy + 0.8) * cell)
          gg.closePath()
          gg.fill()
          const [px, py] = mm.pos
          gg.fillStyle = solved ? LCD_GREEN : '#f4fff0'
          gg.fillRect((px + 0.26) * cell, (py + 0.26) * cell, cell * 0.48, cell * 0.48)
          scr.cv.done()
        }
        break
      }
      case 'sandi': {
        const scr = this.screen(g, 0.6, 0.17, [0, -0.02], [600, 170], [150, 42])
        const pickIdx = this.local.get(mod) ?? [0, 0, 0, 0, 0]
        this.local.set(mod, pickIdx)
        for (let c = 0; c < 5; c++) {
          const x = -0.24 + c * 0.12
          for (const [dir, y, glyph] of [[1, 0.15, '▲'], [-1, -0.19, '▼']] as const) {
            const k = this.key(g, x, y, 0.48)
            k.cv.g.fillStyle = '#26262a'
            k.cv.g.fillRect(0, 0, 256, 256)
            k.cv.g.fillStyle = '#f3ead6'
            k.cv.g.font = '700 140px system-ui, sans-serif'
            k.cv.g.textAlign = 'center'
            k.cv.g.textBaseline = 'middle'
            k.cv.g.fillText(glyph, 128, 140)
            k.cv.done()
            this.hit(k.k, { mod, part: dir > 0 ? 'up' : 'down', index: c })
          }
        }
        const send = this.key(g, 0, -0.32, 0.4, 3.2, 1)
        send.cv.g.fillStyle = '#ff37a6'
        send.cv.g.fillRect(0, 0, 256, send.cv.c.height)
        send.cv.g.fillStyle = '#121212'
        send.cv.g.font = '900 54px "Dela Gothic One", system-ui, sans-serif'
        send.cv.g.textAlign = 'center'
        send.cv.g.textBaseline = 'middle'
        send.cv.g.fillText('KIRIM', 128, send.cv.c.height / 2 + 4)
        send.cv.done()
        this.hit(send.k, { mod, part: 'send' })
        view.update = (mm, solved) => {
          if (mm.kind !== 'sandi') return
          const gg = scr.cv.g
          gg.fillStyle = '#06140a'
          gg.fillRect(0, 0, 600, 170)
          gg.font = '700 118px ui-monospace, "Courier New", monospace'
          gg.textAlign = 'center'
          gg.textBaseline = 'middle'
          const idx = this.local.get(mod)!
          for (let c = 0; c < 5; c++) {
            gg.fillStyle = '#123018'
            gg.fillText('█', 60 + c * 120, 90)
            gg.fillStyle = solved ? '#5cf64a' : LCD_GREEN
            gg.fillText(mm.columns[c][idx[c]], 60 + c * 120, 92)
          }
          scr.cv.done()
        }
        break
      }
      case 'gembok': {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 32, 16), new THREE.MeshStandardMaterial({ color: HEX[m.lamp], emissive: HEX[m.lamp], emissiveIntensity: 2.2, roughness: 0.1 }))
        lamp.position.set(-0.22, 0.22, 0.04)
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.014, 12, 40), new THREE.MeshStandardMaterial({ color: '#d4a64e', metalness: 1, roughness: 0.3 }))
        bezel.position.copy(lamp.position)
        bezel.position.z = 0.035
        g.add(lamp, bezel)
        const shape = this.screen(g, 0.2, 0.15, [0.04, 0.22], [200, 150], [50, 38])
        shape.cv.g.fillStyle = '#06140a'
        shape.cv.g.fillRect(0, 0, 200, 150)
        const sp = new Path2D(SHAPE_PATH[m.shape])
        shape.cv.g.save()
        shape.cv.g.translate(52, 22)
        shape.cv.g.scale(1.05, 1.05)
        shape.cv.g.fillStyle = LCD_GREEN
        shape.cv.g.fill(sp)
        shape.cv.g.restore()
        shape.cv.done()
        const digits = this.local.get(mod) ?? [0, 0, 0]
        this.local.set(mod, digits)
        const wins: Canvas[] = []
        const dials: THREE.Object3D[] = []
        for (let i = 0; i < 3; i++) {
          const x = -0.2 + i * 0.2
          const w = this.screen(g, 0.12, 0.1, [x, 0.04], [120, 100], [30, 25])
          wins.push(w.cv)
          const d = this.clone('dial')
          d.position.set(x, -0.12, 0.08)
          d.scale.setScalar(1.15)
          g.add(d)
          dials.push(d)
          const hb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.18), new THREE.MeshBasicMaterial({ visible: false }))
          hb.position.set(x, -0.1, 0.09)
          g.add(hb)
          this.hit(hb, { mod, part: 'dial', index: i })
        }
        const open = this.key(g, 0, -0.32, 0.4, 3.2, 1)
        open.cv.g.fillStyle = '#5cf64a'
        open.cv.g.fillRect(0, 0, 256, open.cv.c.height)
        open.cv.g.fillStyle = '#121212'
        open.cv.g.font = '900 54px "Dela Gothic One", system-ui, sans-serif'
        open.cv.g.textAlign = 'center'
        open.cv.g.textBaseline = 'middle'
        open.cv.g.fillText('BUKA', 128, open.cv.c.height / 2 + 4)
        open.cv.done()
        this.hit(open.k, { mod, part: 'open' })
        view.update = (_mm, solved) => {
          const ds = this.local.get(mod)!
          wins.forEach((cv, i) => {
            const gg = cv.g
            gg.fillStyle = '#06140a'
            gg.fillRect(0, 0, 120, 100)
            gg.font = '700 84px ui-monospace, "Courier New", monospace'
            gg.textAlign = 'center'
            gg.textBaseline = 'middle'
            gg.fillStyle = solved ? '#5cf64a' : LCD_GREEN
            gg.fillText(String(ds[i]), 60, 54)
            cv.done()
            dials[i].rotation.x = -ds[i] * ((Math.PI * 2) / 10)
          })
          lamp.visible = !solved
        }
        break
      }
    }
    view.update(m, s.solved[mod])
    return view
  }

  /* ---------- input ---------- */

  private pick(e: PointerEvent): Hit | null {
    const r = this.canvas.getBoundingClientRect()
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(v, this.stage.camera)
    const hits = this.ray.intersectObjects(this.hits, true)
    // utamakan bagian modul daripada pelat
    const best = hits.find((h) => h.object.userData.hit && h.object.userData.hit.part !== 'plate') ?? hits.find((h) => h.object.userData.hit)
    return best ? (best.object.userData.hit as Hit) : null
  }

  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId)
    this.down = { x: e.clientX, y: e.clientY, yaw: this.yawT, pitch: this.pitchT, moved: false, id: e.pointerId }
    if (!this.interactive || this.focusMod === null) return
    const h = this.pick(e)
    if (h && h.part === 'cap' && h.mod === this.focusMod) this.holding = { mod: h.mod, at: performance.now(), lit: false }
  }

  private onMove = (e: PointerEvent) => {
    const d = this.down
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.hypot(dx, dy) > 8) d.moved = true
    if (this.focusMod === null && d.moved) {
      this.yawT = THREE.MathUtils.clamp(d.yaw + dx * 0.008, -2.4, 2.4)
      this.pitchT = THREE.MathUtils.clamp(d.pitch + dy * 0.006, -0.35, 0.75)
    }
  }

  private onUp = (e: PointerEvent) => {
    const d = this.down
    this.down = null
    const holding = this.holding
    this.holding = null
    if (holding) {
      const dur = performance.now() - holding.at
      this.cb.act({ type: 'button', mod: holding.mod, hold: dur >= HOLD_MS, shown: clockText(this.cb.left()) })
      return
    }
    if (!d || d.moved || e.type === 'pointercancel') return
    const h = this.pick(e)
    if (this.focusMod === null) {
      if (h) this.focus(h.mod)
      return
    }
    if (!h || h.mod !== this.focusMod) {
      this.focus(h ? h.mod : null)
      return
    }
    if (!this.interactive) return
    this.tapPart(h)
  }

  private tapPart(h: Hit) {
    const s = this.state
    if (!s || s.solved[h.mod]) return
    const m = s.modules[h.mod]
    switch (h.part) {
      case 'wire':
        return this.cb.act({ type: 'cut', mod: h.mod, wire: h.index! })
      case 'key':
        if (m.kind === 'simbol') this.cb.act({ type: 'press', mod: h.mod, symbol: m.symbols[h.index!] })
        return
      case 'arrow':
        return this.cb.act({ type: 'move', mod: h.mod, dir: (['u', 'd', 'l', 'r'] as Dir[])[h.index!] })
      case 'up':
      case 'down': {
        if (m.kind !== 'sandi') return
        const idx = this.local.get(h.mod)!
        const n = m.columns[h.index!].length
        idx[h.index!] = (idx[h.index!] + (h.part === 'up' ? n - 1 : 1)) % n
        this.views[h.mod].update(m, false)
        return
      }
      case 'send':
        if (m.kind === 'sandi') this.cb.act({ type: 'submit', mod: h.mod, word: this.local.get(h.mod)!.map((i, c) => m.columns[c][i]).join('') })
        return
      case 'dial': {
        const ds = this.local.get(h.mod)!
        ds[h.index!] = (ds[h.index!] + 1) % 10
        this.views[h.mod].update(m, false)
        return
      }
      case 'open':
        return this.cb.act({ type: 'unlock', mod: h.mod, code: this.local.get(h.mod)!.join('') })
    }
  }

  /** zoom ke modul (null = lihat seluruh bom) */
  focus(mod: number | null) {
    this.focusMod = mod
    if (mod !== null) {
      this.yawT = 0
      this.pitchT = 0
    }
    this.cb.onFocus(mod)
  }

  /** putar bom ke kiri/kanan untuk melihat sisi (tombol UI) */
  turn(dir: -1 | 1 | 0) {
    if (this.focusMod !== null) this.focus(null)
    this.yawT = dir === 0 ? 0 : THREE.MathUtils.clamp(this.yawT + dir * (Math.PI / 2), -Math.PI * 0.75, Math.PI * 0.75)
  }

  /* ---------- tiap gambar ---------- */

  private frame(dt: number, t: number) {
    const k = 1 - Math.pow(0.0015, dt)
    this.yaw += (this.yawT - this.yaw) * k
    this.pitch += (this.pitchT - this.pitch) * k
    this.bomb.rotation.set(this.pitch * 0.6, this.yaw, 0)

    const cam = this.stage.camera
    const aspect = cam.aspect || 1
    const vfov = THREE.MathUtils.degToRad(cam.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    let pos: THREE.Vector3
    let look: THREE.Vector3
    if (this.focusMod === null || !this.views[this.focusMod]) {
      const span = Math.max((FRONT_W * 1.2) / 2 / Math.tan(hfov / 2), (FRONT_H * 1.9) / 2 / Math.tan(vfov / 2))
      pos = new THREE.Vector3(0, span * 0.3, span)
      look = new THREE.Vector3(0, -0.05, 0)
    } else {
      const g = this.views[this.focusMod].group
      look = g.getWorldPosition(new THREE.Vector3())
      const span = Math.max((SLOT * 1.25) / 2 / Math.tan(hfov / 2), (SLOT * 1.25) / 2 / Math.tan(vfov / 2))
      pos = look.clone().add(new THREE.Vector3(0, span * 0.12, span))
    }
    if (!this.camPos.lengthSq()) {
      this.camPos.copy(pos)
      this.camLook.copy(look)
    }
    const kc = 1 - Math.pow(0.002, dt)
    this.camPos.lerp(pos, kc)
    this.camLook.lerp(look, kc)
    cam.position.copy(this.camPos)
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * 0.06 * this.shake
      cam.position.y += (Math.random() - 0.5) * 0.06 * this.shake
      this.shake = Math.max(0, this.shake - dt * 2.5)
    }
    cam.lookAt(this.camLook)

    if (this.holding && !this.holding.lit && performance.now() - this.holding.at >= HOLD_MS) this.holding.lit = true
    for (const m of this.lcds) m.uniforms.uTime.value = t
    this.flash = Math.max(0, this.flash - dt * 3)
    const now = performance.now()
    const s = this.state
    this.views.forEach((v, i) => {
      v.tick?.(t)
      const struck = now - ((v.led.userData.strikeAt as number) ?? -1e9) < 900
      const solved = s?.solved[i]
      const c = struck ? (Math.floor(now / 120) % 2 ? '#ff2a2a' : '#300000') : solved ? '#45ff3a' : '#000000'
      v.led.emissive.set(c)
      v.led.color.set(struck ? '#ff2a2a' : solved ? '#45ff3a' : '#1a1a1a')
    })
    this.drawTimer()
  }

  /** dipanggil UI tiap gambar lewat cb.left() */
  private drawTimer() {
    const tm = this.timer
    const s = this.state
    if (!tm || !s) return
    const left = s.phase === 'live' ? this.cb.left() : s.phase === 'intro' ? s.timeLeft : s.finalLeft
    const text = clockText(left)
    const key = `${text}|${s.strikes}|${s.phase}`
    tm.mat.uniforms.uFlash.value = this.flash * 0.6
    if (tm.cv.tex.userData.key === key) return
    tm.cv.tex.userData.key = key
    const g = tm.cv.g
    g.fillStyle = '#120303'
    g.fillRect(0, 0, 512, 256)
    const on = s.phase === 'defused' ? '#5cf64a' : '#ff3a24'
    const off = '#2a0806'
    const chars = text.padStart(5, ' ')
    const W = 78
    const H = 140
    let x = 40
    for (const ch of chars) {
      if (ch === ':') {
        g.fillStyle = Math.floor(performance.now() / 500) % 2 || s.phase !== 'live' ? on : off
        g.beginPath()
        g.arc(x + 12, 72, 9, 0, Math.PI * 2)
        g.arc(x + 12, 132, 9, 0, Math.PI * 2)
        g.fill()
        x += 34
        continue
      }
      seg(g, ch === ' ' ? '' : ch, x, 32, W, H, on, off)
      x += W + 20
    }
    g.font = '700 26px "Geist Variable", system-ui, sans-serif'
    g.fillStyle = '#ff9a8a'
    g.fillText('SALAH', 40, 222)
    for (let i = 0; i < s.opts.strikes; i++) {
      const hit = i < s.strikes
      g.fillStyle = hit ? '#ff3a24' : '#3a0c08'
      g.beginPath()
      g.roundRect(150 + i * 46, 200, 34, 30, 6)
      g.fill()
      if (hit) {
        g.strokeStyle = '#120303'
        g.lineWidth = 5
        g.beginPath()
        g.moveTo(158 + i * 46, 206)
        g.lineTo(176 + i * 46, 224)
        g.moveTo(176 + i * 46, 206)
        g.lineTo(158 + i * 46, 224)
        g.stroke()
      }
    }
    tm.cv.done()
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onUp)
    this.wireNormal.dispose()
    this.stage.dispose()
  }
}

/** lama tekan sebelum dianggap "ditahan" (ms) */
export const HOLD_MS = 550

const SHAPE_PATH: Record<string, string> = {
  bulan: 'M64 10 A40 40 0 1 0 64 90 A32 32 0 1 1 64 10 Z',
  bintang: 'M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z',
  ketupat: 'M50 8 L88 50 L50 92 L12 50 Z',
  hati: 'M50 88 C20 66 6 48 14 30 C22 14 44 16 50 32 C56 16 78 14 86 30 C94 48 80 66 50 88 Z',
}
