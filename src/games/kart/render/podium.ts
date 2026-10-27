import * as THREE from 'three'
import { loadModels, placed } from './models'
import { Particles } from './particles'

/** satu juara di podium: id karakter & warna */
export type Champ = { id: string; color: string }

const PLACE = [
  { x: 0, h: 3.2, color: '#ffcc1f' },
  { x: -4.2, h: 2.2, color: '#c9c9d4' },
  { x: 4.2, h: 1.5, color: '#ff8a1c' },
]

function numberTex(n: number) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const c = cv.getContext('2d')!
  c.fillStyle = '#fff4fa'
  c.font = '900 96px "Dela Gothic One", sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.lineWidth = 10
  c.strokeStyle = '#121212'
  c.strokeText(String(n), 64, 70)
  c.fillText(String(n), 64, 70)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Adegan podium akhir Grand Prix di kanvas sendiri: tiga juara bersorak, confetti, kamera berputar pelan.
 */
export class Podium {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  private raf = 0
  private start = performance.now()
  private last = performance.now()
  private rigs: { root: THREE.Object3D; arms: THREE.Object3D[]; head?: THREE.Object3D; place: number }[] = []
  private confetti = new Particles(500)
  private canvas: HTMLCanvasElement
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene.add(new THREE.HemisphereLight('#fff4fa', '#ff9ad4', 1.6))
    const sun = new THREE.DirectionalLight('#ffffff', 2.4)
    sun.position.set(4, 10, 8)
    this.scene.add(sun, this.confetti.group)
  }

  async show(champs: Champ[]) {
    await loadModels(champs.flatMap((c) => [`char-${c.id}`]))
    if (this.disposed) return
    champs.slice(0, 3).forEach((c, k) => {
      const p = PLACE[k]
      const block = new THREE.Mesh(new THREE.BoxGeometry(3.8, p.h, 3), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4, metalness: k === 0 ? 0.3 : 0.1 }))
      block.position.set(p.x, p.h / 2, 0)
      this.scene.add(block)
      const num = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: numberTex(k + 1), transparent: true }))
      num.position.set(p.x, p.h / 2, 1.51)
      this.scene.add(num)
      const root = placed(`char-${c.id}`)
      // model pembalap berdiri di lantai kart (duduk ~1 m di atasnya): turunkan sedikit
      // model menghadap +Z (ke kamera)
      root.position.set(p.x, p.h - 1.0, 0)
      this.scene.add(root)
      const arms: THREE.Object3D[] = []
      let head: THREE.Object3D | undefined
      root.traverse((o) => {
        if (o.name === 'arm_L' || o.name === 'arm_R') arms.push(o)
        if (o.name === 'head') head = o
      })
      this.rigs.push({ root, arms, head, place: k })
    })
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshStandardMaterial({ color: '#ffcae9', roughness: 0.8 }))
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)
    this.resize()
    this.loop()
  }

  resize() {
    const w = this.canvas.clientWidth || 300
    const h = this.canvas.clientHeight || 200
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const t = (now - this.start) / 1000
    const a = Math.sin(t * 0.3) * 0.5
    this.camera.position.set(Math.sin(a) * 16, 6.5, Math.cos(a) * 16)
    this.camera.lookAt(0, 3, 0)
    for (const r of this.rigs) {
      const jump = r.place === 0 ? Math.abs(Math.sin(t * 4)) * 0.6 : Math.abs(Math.sin(t * 3 + r.place)) * 0.25
      r.root.position.y = PLACE[r.place].h - 1.0 + jump
      for (const [k, arm] of r.arms.entries()) {
        arm.rotation.x = -2.4 + Math.sin(t * 7 + k * Math.PI) * 0.3
        arm.rotation.z = (k ? 1 : -1) * 0.3
      }
      if (r.head) r.head.rotation.z = Math.sin(t * 5 + r.place) * 0.15
    }
    if (Math.random() < dt * 30) this.confetti.burst('confetti', 3, (Math.random() - 0.5) * 14, 14, (Math.random() - 0.5) * 6, 0, -2, 0, 3, ['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff', '#fff4fa'], 1.4)
    this.confetti.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.confetti.dispose()
    this.renderer.dispose()
  }
}
