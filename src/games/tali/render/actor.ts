// Karakter di layar: model Blender beranimasi, menghadap arah gerak, plus bayangan bulat lembut.
import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Pose } from '../sim/client'
import { patchRim } from './shaders'

export type Clip = 'idle' | 'run' | 'jump' | 'fall' | 'hang' | 'brace' | 'reel' | 'cheer' | 'land'

let shadowTex: THREE.Texture | null = null
function blobTexture() {
  if (shadowTex) return shadowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31)
  grad.addColorStop(0, 'rgba(0,0,0,0.55)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  shadowTex = new THREE.CanvasTexture(c)
  return shadowTex
}

export class Actor {
  readonly root = new THREE.Group()
  private model: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private actions = new Map<Clip, THREE.AnimationAction>()
  private clip: Clip = 'idle'
  private yaw = 0
  private squash = 0
  readonly blob: THREE.Mesh
  /** posisi pinggang (ujung tali) di dunia */
  readonly waist = new THREE.Vector3()

  constructor(gltf: GLTF, rim: string, shadows: boolean) {
    this.model = gltf.scene.clone(true)
    this.model.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = shadows
      m.receiveShadow = false
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      patchRim(mat, rim, 0.5)
      m.material = mat
    })
    this.root.add(this.model)
    this.mixer = new THREE.AnimationMixer(this.model)
    for (const a of gltf.animations) {
      const act = this.mixer.clipAction(a)
      if (a.name === 'jump' || a.name === 'land') {
        act.setLoop(THREE.LoopOnce, 1)
        act.clampWhenFinished = true
      }
      this.actions.set(a.name as Clip, act)
    }
    this.actions.get('idle')?.play()
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }))
    this.blob.rotation.x = -Math.PI / 2
    this.blob.renderOrder = 1
  }

  private play(c: Clip, fade = 0.15) {
    if (c === this.clip) return
    const next = this.actions.get(c)
    const prev = this.actions.get(this.clip)
    if (!next) return
    next.reset()
    next.play()
    if (prev) next.crossFadeFrom(prev, fade, false)
    this.clip = c
  }

  /** `ground` = tinggi tanah di bawah karakter (untuk bayangan); null = jurang */
  update(dt: number, p: Pose, mood: 'play' | 'cheer', landed: boolean, ground: number | null) {
    const c: Clip =
      mood === 'cheer'
        ? 'cheer'
        : p.hold === 2
          ? 'hang'
          : p.hold === 1
            ? p.reel
              ? 'reel'
              : 'brace'
            : p.ground
              ? Math.abs(p.vx) > 0.6
                ? 'run'
                : 'idle'
              : p.vy > 1.5
                ? 'jump'
                : 'fall'
    this.play(c, c === 'run' || c === 'idle' ? 0.12 : 0.1)
    const run = this.actions.get('run')
    if (run) run.timeScale = Math.max(0.6, Math.min(1.6, Math.abs(p.vx) / 3.6))
    this.mixer.update(dt)
    if (landed) this.squash = 1
    this.squash = Math.max(0, this.squash - dt * 5)
    const want = c === 'hang' || c === 'cheer' ? 0 : p.face * 0.95
    this.yaw += (want - this.yaw) * Math.min(1, dt * 10)
    this.model.rotation.y = this.yaw
    const s = Math.sin(this.squash * Math.PI) * 0.18
    this.model.scale.set(1 + s, 1 - s, 1 + s)
    // condong sedikit ke arah gerak di udara
    this.model.rotation.z = p.ground || p.hold ? 0 : -Math.max(-0.25, Math.min(0.25, p.vx * 0.035))
    this.root.position.set(p.x, p.y, 0)
    this.waist.set(p.x + Math.sin(this.yaw) * 0.12, p.y - 0.13, Math.cos(this.yaw) * 0.12)
    if (ground === null || p.y - ground > 8) this.blob.visible = false
    else {
      const h = Math.max(0, p.y - 0.42 - ground)
      this.blob.visible = true
      this.blob.position.set(p.x, ground + 0.02, 0.05)
      const k = Math.max(0.35, 1 - h * 0.15)
      this.blob.scale.setScalar(k)
      ;(this.blob.material as THREE.MeshBasicMaterial).opacity = k
    }
  }

  set visible(v: boolean) {
    this.root.visible = v
    if (!v) this.blob.visible = false
  }

  dispose() {
    this.mixer.stopAllAction()
    this.model.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) (m.material as THREE.Material).dispose()
    })
    this.blob.geometry.dispose()
    ;(this.blob.material as THREE.Material).dispose()
  }
}
