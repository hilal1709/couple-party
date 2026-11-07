import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
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
  | 'turn'
  | 'land'
  | 'reach'
  | 'pull_up'
  | 'slip'
  | 'idle_hurt'
  | 'walk_hurt'
  | 'recover'

/** klip gerak kaki berulang: pindah di antara ini mempertahankan fase langkah */
const LOCO = new Set<string>(['walk', 'run', 'walk_hurt', 'turn'])

/** lama silang (detik) per klip tujuan: kejadian mendadak cepat, gerak biasa lembut */
const FADE: Partial<Record<ClimbClip, number>> = {
  land: 0.06,
  pull_up: 0.08,
  slip: 0.08,
  jump: 0.08,
  lunge: 0.06,
  fall: 0.16,
  recover: 0.12,
  ko: 0.1,
  idle: 0.28,
  idle_hurt: 0.28,
  walk: 0.22,
  run: 0.2,
  turn: 0.15,
}

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
  /** LOD animasi: mixer diperbarui tiap N frame (1 = penuh) */
  private every = 1
  private skip = 0
  private acc = 0
  private roll = 0
  private pitch = 0
  /** versi gabungan (satu mesh, warna per titik) untuk pendaki jauh/teman di profil Hemat */
  private merged: THREE.SkinnedMesh | null = null
  private useMerged = false
  private shadows: boolean

  constructor(gltf: GLTF, look: PuncakLook, shadows: boolean, outline = false) {
    this.shadows = shadows
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
    // warna/topi berubah: versi gabungan dibangun ulang saat dibutuhkan lagi
    if (this.merged) {
      this.merged.removeFromParent()
      this.merged.geometry.dispose()
      this.merged = null
      if (this.useMerged) {
        this.useMerged = false
        this.setMerged(true)
      }
    }
  }

  /** mesh asli pendaki (bukan garis tinta, bukan versi gabungan) */
  private parts() {
    const out: THREE.SkinnedMesh[] = []
    this.root.traverse((o) => {
      const m = o as THREE.SkinnedMesh
      if (m.isSkinnedMesh && !m.userData.ink && !m.userData.merged) out.push(m)
    })
    return out
  }

  /**
   * Gabungkan semua bagian yang sedang terlihat (sesuai topi & wajah) jadi satu SkinnedMesh berwarna per
   * titik: 1 draw call, bukan ±10. Semua bagian memakai kerangka & bind matrix yang sama (satu armature).
   */
  private buildMerged() {
    const shown = (o: THREE.Object3D) => {
      for (let p: THREE.Object3D | null = o; p && p !== this.root; p = p.parent) if (!p.visible && !(p as THREE.Mesh).isMesh) return false
      return true
    }
    const parts = this.parts().filter(shown)
    if (!parts.length) return null
    const geos: THREE.BufferGeometry[] = []
    for (const m of parts) {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as THREE.BufferGeometry
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k)
      const mat = m.material as THREE.MeshStandardMaterial
      const c = mat.color.clone()
      // bahan bercahaya (mata berkilau, lampu helm) tetap terang di versi gabungan
      if (mat.emissive && mat.emissiveIntensity > 0) c.add(mat.emissive.clone().multiplyScalar(mat.emissiveIntensity * 0.5))
      const n = g.attributes.position.count
      const col = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3)
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      // skinIndex bisa Uint8/Uint16: samakan supaya bisa digabung
      const si = g.attributes.skinIndex
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(si.array as ArrayLike<number>), 4))
      geos.push(g)
    }
    const geo = mergeGeometries(geos)
    if (!geo) return null
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })
    addRim(mat, '#fff0dc', 0.26)
    const first = parts[0]
    const mesh = new THREE.SkinnedMesh(geo, mat)
    mesh.userData.merged = true
    mesh.frustumCulled = false
    mesh.castShadow = this.shadows
    first.parent!.add(mesh)
    mesh.bind(first.skeleton, first.bindMatrix)
    return mesh
  }

  /** pakai versi gabungan (true) atau mesh asli (false) */
  setMerged(on: boolean) {
    if (on === this.useMerged) return
    if (on && !this.merged) this.merged = this.buildMerged()
    if (on && !this.merged) return
    this.useMerged = on
    if (this.merged) this.merged.visible = on
    for (const m of this.parts()) m.visible = !on
  }

  setHeadless(on: boolean) {
    this.headless = on
    const pack = this.root.getObjectByName('pack')
    if (pack) pack.visible = !on
  }

  duration(name: ClimbClip) {
    return this.clips[name]?.duration ?? 0
  }

  play(name: ClimbClip, opts: { once?: boolean; fade?: number; speed?: number; restart?: boolean } = {}) {
    const clip = this.clips[name]
    if (!clip) return
    const next = this.mixer.clipAction(clip)
    if (next === this.current && !(opts.once && (opts.restart || this.done()))) {
      next.timeScale = opts.speed ?? 1
      return
    }
    if (next === this.current) {
      // klip sekali jalan yang sama diminta lagi (mis. mendarat dua kali berturut-turut)
      next.reset().play()
      next.timeScale = opts.speed ?? 1
      return
    }
    const fade = opts.fade ?? FADE[name] ?? 0.18
    const prev = this.current
    next.reset()
    next.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = !!opts.once
    next.timeScale = opts.speed ?? 1
    // jalan → lari (dan sebaliknya): kaki yang sama tetap di depan, tidak ada langkah ganda
    if (prev && LOCO.has(name) && LOCO.has(prev.getClip().name)) {
      const d0 = prev.getClip().duration
      next.time = d0 > 0 ? ((prev.time % d0) / d0) * clip.duration : 0
    }
    next.enabled = true
    next.setEffectiveWeight(1)
    next.play()
    if (prev) prev.crossFadeTo(next, fade, false)
    else next.fadeIn(fade)
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

  /** klip sekali jalan sudah selesai (atau tidak ada) */
  done() {
    const a = this.current
    if (!a) return true
    return a.loop === THREE.LoopOnce && a.time >= a.getClip().duration - 1e-3
  }

  /** sisa waktu klip yang sedang diputar (detik pada laju sekarang) */
  remaining() {
    const a = this.current
    if (!a || a.timeScale <= 0) return 0
    return (a.getClip().duration - a.time) / a.timeScale
  }

  /** LOD animasi: 1 = tiap frame, 2/4 = jarak jauh, 0 = di luar layar (tidak diperbarui) */
  setLod(every: number) {
    this.every = every
  }

  /** condong badan (radian): roll ke dalam tikungan, pitch saat mempercepat. Pivot di kaki. */
  lean(roll: number, pitch: number, dt: number) {
    const k = 1 - Math.exp(-dt * 8)
    this.roll += (roll - this.roll) * k
    this.pitch += (pitch - this.pitch) * k
    this.root.rotation.z = this.roll
    this.root.rotation.x = this.pitch
  }

  update(dt: number) {
    this.acc += dt
    if (this.every === 0) return
    if (++this.skip < this.every) return
    this.skip = 0
    dt = this.acc
    this.acc = 0
    this.mixer.update(dt)
    if (this.headless && this.head) this.head.scale.setScalar(0.0001)
    else if (this.head) this.head.scale.setScalar(1)
  }
}
