import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import pendakiUrl from '@/assets/puncak/models/pendaki.glb?url'
import { addRim } from '@/games/sport/render/shaders'
import { CAPS, HAIRS, JACKETS, PACKS, PANTS, SKINS, type PuncakLook } from '../look'
import { inkSkinned } from './ink'

export type ClimbClip =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'climb_idle'
  | 'climb_up'
  | 'climb_side'
  | 'lunge'
  | 'hang'
  | 'slide'
  | 'swim'
  | 'cheer'
  | 'sad'
  | 'eat'
  | 'pull'
  | 'ko'

let source: Promise<GLTF> | null = null
export const loadClimber = () => (source ??= new GLTFLoader().loadAsync(pendakiUrl))

const TINTED = ['skin', 'jacket', 'pants', 'cap', 'pack', 'hair']

/** Satu pendaki gendut: model tersalin, warna sendiri, pemutar animasi sendiri. */
export class Climber {
  root: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private clips: Record<string, THREE.AnimationClip>
  private current: THREE.AnimationAction | null = null
  private mats = new Map<string, THREE.MeshStandardMaterial>()
  private head: THREE.Object3D | null
  /** tampilan orang pertama: kepala & topi dikecilkan ke nol supaya kamera tidak tertutup */
  private headless = false

  constructor(gltf: GLTF, look: PuncakLook, shadows: boolean, outline = false) {
    this.root = cloneSkinned(gltf.scene)
    this.mixer = new THREE.AnimationMixer(this.root)
    this.clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
    this.root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh
      if (!mesh.isMesh) return
      mesh.castShadow = shadows
      mesh.material = this.own(mesh.material as THREE.MeshStandardMaterial)
      mesh.frustumCulled = false
    })
    this.head = this.root.getObjectByName('head') ?? null
    if (outline) inkSkinned(this.root, 0.011)
    this.setLook(look)
    for (const [name, m] of this.mats) addRim(m, '#fff0dc', name === 'skin' ? 0.22 : 0.3)
  }

  private own(m: THREE.MeshStandardMaterial) {
    if (!TINTED.includes(m.name)) return m
    let c = this.mats.get(m.name)
    if (!c) {
      c = m.clone()
      this.mats.set(m.name, c)
    }
    return c
  }

  setLook(l: PuncakLook) {
    this.mats.get('skin')?.color.set(SKINS[l.skin])
    this.mats.get('jacket')?.color.set(JACKETS[l.jacket])
    this.mats.get('pants')?.color.set(PANTS[l.pants])
    this.mats.get('cap')?.color.set(CAPS[l.cap])
    this.mats.get('pack')?.color.set(PACKS[l.cap])
    this.mats.get('hair')?.color.set(HAIRS[l.skin])
    // mesh multi-material terekspor sebagai grup "hat_2" berisi "hat_2_1": cocokkan nama grupnya saja
    this.root.traverse((o) => {
      if (/^hat_\d$/.test(o.name)) o.visible = o.name === `hat_${l.hat}`
      if (/^face_\d$/.test(o.name)) o.visible = o.name === `face_${l.face}`
    })
  }

  setHeadless(on: boolean) {
    this.headless = on
    const pack = this.root.getObjectByName('pack')
    if (pack) pack.visible = !on
  }

  duration(name: ClimbClip) {
    return this.clips[name]?.duration ?? 0
  }

  play(name: ClimbClip, opts: { once?: boolean; fade?: number; speed?: number } = {}) {
    const clip = this.clips[name]
    if (!clip) return
    const next = this.mixer.clipAction(clip)
    if (next === this.current) {
      next.timeScale = opts.speed ?? 1
      return
    }
    next.reset()
    next.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = !!opts.once
    next.timeScale = opts.speed ?? 1
    next.fadeIn(opts.fade ?? 0.18)
    this.current?.fadeOut(opts.fade ?? 0.18)
    next.play()
    this.current = next
  }

  /** atur laju klip yang sedang diputar (0 = membeku di pose) */
  speed(v: number) {
    if (this.current) this.current.timeScale = v
  }

  bone(name: string) {
    return this.root.getObjectByName(name) ?? null
  }

  /** posisi mata di dunia (untuk kamera orang pertama) */
  eye(out: THREE.Vector3) {
    if (!this.head) return this.root.getWorldPosition(out).setY(out.y + 1.25)
    this.head.getWorldPosition(out)
    return out
  }

  update(dt: number) {
    this.mixer.update(dt)
    if (this.headless && this.head) this.head.scale.setScalar(0.0001)
    else if (this.head) this.head.scale.setScalar(1)
  }
}
