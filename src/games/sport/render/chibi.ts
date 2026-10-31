import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import chibiUrl from '@/assets/sport/models/chibi.glb?url'
import { HAIRS, PANTS, SHIRTS, SKINS } from '../look'
import { DETAIL } from './lod'
import { addRim } from './shaders'
import { savedQuality } from './stage'
import { applyCloth } from './textures'
import type { Look } from '../types'

export type Clip =
  | 'idle'
  | 'ready'
  | 'bowl'
  | 'cheer'
  | 'sad'
  | 'walk'
  | 'box'
  | 'guard'
  | 'jab_L'
  | 'jab_R'
  | 'hit'
  | 'dodge_L'
  | 'dodge_R'
  | 'ko'
  | 'bow_ready'
  | 'bow_draw'
  | 'bow_loose'
  | 'kick'
  | 'keep'
  | 'dive_L'
  | 'dive_R'
  | 'catch'
  | 'rk_ready'
  | 'swing_F'
  | 'swing_B'
  | 'rk_smash'

let source: Promise<GLTF> | null = null
export const loadChibi = () => (source ??= new GLTFLoader().loadAsync(chibiUrl))

/** Satu karakter: model tersalin, warna sendiri, dan pemutar animasi sendiri. */
export class Chibi {
  root: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private clips: Record<string, THREE.AnimationClip>
  private current: THREE.AnimationAction | null = null
  private mats = new Map<string, THREE.MeshStandardMaterial>()

  constructor(gltf: GLTF, look: Look) {
    this.root = cloneSkinned(gltf.scene)
    this.mixer = new THREE.AnimationMixer(this.root)
    this.clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
    this.root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      // bahan warna-warni disalin per karakter, sisanya bersama
      mesh.material = this.own(mesh.material as THREE.MeshStandardMaterial)
      mesh.frustumCulled = false
    })
    this.setLook(look)
    this.setGear(null)
    // tepi bercahaya memisahkan karakter dari latar; kain hanya kalau grafis mengizinkan
    for (const [name, m] of this.mats) {
      addRim(m, '#fff0dc', name === 'skin' ? 0.22 : 0.3)
      if (DETAIL[savedQuality()].pbr && (name === 'shirt' || name === 'pants')) void applyCloth(m)
    }
  }

  private own(m: THREE.MeshStandardMaterial) {
    if (!['skin', 'hair', 'shirt', 'pants', 'acc'].includes(m.name)) return m
    let c = this.mats.get(m.name)
    if (!c) {
      c = m.clone()
      this.mats.set(m.name, c)
    }
    return c
  }

  setLook(l: Look) {
    this.mats.get('skin')?.color.set(SKINS[l.skin])
    this.mats.get('hair')?.color.set(HAIRS[l.hair])
    this.mats.get('shirt')?.color.set(SHIRTS[l.shirt])
    this.mats.get('pants')?.color.set(PANTS[l.pants])
    // aksesori memakai warna kaos
    this.mats.get('acc')?.color.set(SHIRTS[l.shirt])
    // mesh dua material terekspor sebagai grup "hair_3" berisi "hair_3_1": yang dicocokkan namanya hanya grupnya
    this.root.traverse((o) => {
      if (/^hair_\d$/.test(o.name)) o.visible = o.name === `hair_${l.style}`
      if (/^acc_\d$/.test(o.name)) o.visible = o.name === `acc_${l.acc}`
    })
  }

  /** perlengkapan cabang: sarung tinju, busur, atau raket; kosong = tangan polos */
  setGear(gear: 'gloves' | 'bow' | 'racket' | null) {
    for (const name of ['gloves', 'bow', 'racket']) {
      const g = this.root.getObjectByName(name)
      if (g) g.visible = gear === name
    }
  }

  /** lama klip, detik */
  duration(name: Clip) {
    return this.clips[name]?.duration ?? 0
  }

  play(name: Clip, opts: { once?: boolean; fade?: number; speed?: number } = {}) {
    const clip = this.clips[name]
    if (!clip) return
    const next = this.mixer.clipAction(clip)
    next.reset()
    next.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = !!opts.once
    next.timeScale = opts.speed ?? 1
    next.fadeIn(opts.fade ?? 0.2)
    if (this.current && this.current !== next) this.current.fadeOut(opts.fade ?? 0.2)
    next.play()
    this.current = next
  }

  bone(name: string) {
    return this.root.getObjectByName(name) ?? null
  }

  update(dt: number) {
    this.mixer.update(dt)
  }
}
