import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import kokiUrl from '@/assets/masak/models/koki.glb?url'
import { addRim } from '@/games/sport/render/shaders'
import { ANIMALS, type Animal } from '../types'

/** klip lapis badan (root, body, head, kaki) */
export type BodyClip = 'idle' | 'walk' | 'dash'
/** klip lapis tangan */
export type HandClip = 'h_idle' | 'h_walk' | 'h_carry' | 'h_chop' | 'h_wash' | 'h_spray' | 'h_throw'
/** klip penuh: menimpa kedua lapis */
export type FullClip = 'cheer' | 'sad' | 'slip'

/** warna celemek per koki (co-op), dan per tim (versus) */
export const APRONS = ['#ff37a6', '#2f9bff', '#ffb020', '#43b929', '#9b5cff', '#ff6b3d', '#14b8a6', '#e8d22a']
export const TEAM_APRONS = ['#43b929', '#ff37a6']

export const ANIMAL_TITLE: Record<Animal, string> = {
  kucing: 'Kucing',
  beruang: 'Beruang',
  bebek: 'Bebek',
  kodok: 'Kodok',
  panda: 'Panda',
  rubah: 'Rubah',
  kelinci: 'Kelinci',
  ayam: 'Ayam',
}

const RIMMED = new WeakSet<THREE.Material>()

let source: Promise<GLTF> | null = null
export const loadKoki = () => (source ??= new GLTFLoader().loadAsync(kokiUrl))

/** Satu koki hewan: salinan model, kepala hewannya sendiri, celemek berwarna, dan dua lapis animasi. */
export class Koki {
  root: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private clips: Record<string, THREE.AnimationClip>
  private body: THREE.AnimationAction | null = null
  private hands: THREE.AnimationAction | null = null
  private full: THREE.AnimationAction | null = null
  private names = { body: '', hands: '', full: '' }
  private apron: THREE.MeshStandardMaterial | null = null
  private handL: THREE.Object3D | null
  private handR: THREE.Object3D | null

  /** `npc` = warna baju pelanggan: tanpa topi & celemek koki */
  constructor(gltf: GLTF, animal: Animal, apron: string, shadows = true, npc?: string) {
    this.root = cloneSkinned(gltf.scene)
    this.mixer = new THREE.AnimationMixer(this.root)
    this.clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
    this.root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh
      if (!mesh.isMesh) return
      mesh.castShadow = shadows
      mesh.frustumCulled = false
      const m = mesh.material as THREE.MeshStandardMaterial
      if (m.name === 'apron') {
        this.apron ??= m.clone()
        mesh.material = this.apron
      }
      if (npc && m.name === 'jaket') {
        const j = m.clone()
        j.color.set(npc)
        mesh.material = j
      }
    })
    // tepi bercahaya memisahkan koki dari lantai & meja; bahan bersama antarkoki ditambal sekali saja
    this.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined
      if (!(o as THREE.Mesh).isMesh || !m || RIMMED.has(m)) return
      RIMMED.add(m)
      addRim(m, '#fff0dc', 0.25)
    })
    if (npc) for (const n of ['celemek', 'topi']) {
      const o = this.root.getObjectByName(n)
      if (o) o.visible = false
    }
    this.setAnimal(animal)
    this.prune(animal)
    this.setApron(apron)
    this.handL = this.root.getObjectByName('hand_L') ?? null
    this.handR = this.root.getObjectByName('hand_R') ?? null
    this.play('idle')
    this.playHands('h_idle')
  }

  setAnimal(animal: Animal) {
    for (const a of ANIMALS) {
      const o = this.root.getObjectByName(`hewan_${a}`)
      if (o) o.visible = a === animal
    }
  }

  /** kepala hewan lain dibuang dari salinan ini (bukan sekadar disembunyikan): lebih sedikit benda ditelusuri tiap frame */
  private prune(animal: Animal) {
    for (const a of ANIMALS) {
      if (a === animal) continue
      const o = this.root.getObjectByName(`hewan_${a}`)
      o?.parent?.remove(o)
    }
  }

  setApron(color: string) {
    this.apron?.color.set(color)
  }

  private start(name: string, once = false, speed = 1, fade = 0.15) {
    const clip = this.clips[name]
    if (!clip) return null
    const a = this.mixer.clipAction(clip)
    a.reset()
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    a.clampWhenFinished = once
    a.timeScale = speed
    a.fadeIn(fade)
    a.play()
    return a
  }

  /** lapis badan; tidak diulang kalau klipnya sama, hanya kecepatannya yang diganti */
  play(name: BodyClip, speed = 1) {
    if (this.full) return
    if (this.names.body === name) {
      if (this.body) this.body.timeScale = speed
      return
    }
    this.body?.fadeOut(0.15)
    this.body = this.start(name, false, speed)
    this.names.body = name
  }

  playHands(name: HandClip) {
    if (this.full || this.names.hands === name) return
    this.hands?.fadeOut(0.12)
    this.hands = this.start(name, name === 'h_throw', 1, 0.1)
    this.names.hands = name
  }

  /** klip penuh (sorak, sedih, terpeleset); `null` = kembali ke lapis badan & tangan */
  playFull(name: FullClip | null) {
    if ((name ?? '') === this.names.full) return
    this.full?.fadeOut(0.15)
    this.full = null
    this.names.full = name ?? ''
    if (name) {
      this.body?.fadeOut(0.15)
      this.hands?.fadeOut(0.15)
      this.full = this.start(name)
      this.names.body = this.names.hands = ''
    }
  }

  /** titik tengah kedua tangan di dunia: tempat barang yang dibawa */
  handsCenter(out: THREE.Vector3) {
    if (!this.handL || !this.handR) return this.root.getWorldPosition(out)
    const b = new THREE.Vector3()
    this.handL.getWorldPosition(out)
    this.handR.getWorldPosition(b)
    return out.add(b).multiplyScalar(0.5)
  }

  update(dt: number) {
    this.mixer.update(dt)
  }
}
