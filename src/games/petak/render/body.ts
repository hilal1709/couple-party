import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import url from '@/assets/petak/models/bunglon.glb?url'
import { DECODE_GLSL, encodeLinear } from './paint'
import type { PoseId } from './poses'

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(normalMatrix * objectNormal);
}`

const FRAG = /* glsl */ `
uniform sampler2D uPaint;
uniform float uShade;
varying vec2 vUv;
varying vec3 vN;
${DECODE_GLSL}
void main() {
  vec3 c = decodePaint(texture2D(uPaint, vUv).rgb);
  // cat hampir tak terpengaruh cahaya: warna hasil pipet sudah membawa cahaya tempat itu.
  // Sedikit bayangan menurut normal menjaga bentuk badan tetap terbaca saat belum dicat rapi.
  float s = normalize(vN).y * 0.5 + 0.5;
  // sisik halus: hanya cukup untuk menangkap mata dari dekat, tidak mengubah warna cat secara nyata
  float sisik = sin(vUv.x * 420.0 + sin(vUv.y * 420.0)) * sin(vUv.y * 420.0);
  gl_FragColor = vec4(c * (1.0 + uShade * (s - 0.5) + sisik * 0.018), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const loader = new GLTFLoader()
let base: Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] }> | null = null

/** tekstur 1×1: badan polos sebelum cat datang, dan warna pencari */
export function solidPaint(r: number, g: number, b: number): THREE.DataTexture {
  const px = [r, g, b].map((v) => Math.round(encodeLinear(v) * 255))
  const t = new THREE.DataTexture(new Uint8Array([...px, 255]), 1, 1)
  t.needsUpdate = true
  return t
}

/** satu bunglon: badan bertulang + pupil + pemutar pose */
export class Body {
  readonly root: THREE.Object3D
  readonly skin: THREE.SkinnedMesh
  private pupil: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private clips: Map<string, THREE.AnimationClip>
  private current: THREE.AnimationAction | null = null
  readonly material: THREE.ShaderMaterial

  constructor(scene: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.root = cloneSkinned(scene)
    this.skin = this.root.getObjectByName('badan') as THREE.SkinnedMesh
    this.pupil = this.root.getObjectByName('pupil')!
    this.material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uPaint: { value: null }, uShade: { value: 0.16 } } })
    this.skin.material = this.material
    this.skin.frustumCulled = false
    this.pupil.frustumCulled = false
    this.mixer = new THREE.AnimationMixer(this.root)
    this.clips = new Map(clips.map((c) => [c.name, c]))
  }

  setPaint(tex: THREE.Texture) {
    this.material.uniforms.uPaint.value = tex
  }

  /** `tegak` memutar idle; pose lain beku dan matanya terpejam */
  setPose(id: PoseId) {
    this.play(id === 'tegak' ? 'idle' : `pose_${id}`, id === 'tegak')
    this.pupil.visible = id === 'tegak'
  }

  walk() {
    this.play('walk')
    this.pupil.visible = true
  }

  play(name: string, loop = true) {
    const clip = this.clips.get(name)
    if (!clip) return
    const next = this.mixer.clipAction(clip)
    if (next === this.current) return
    next.reset()
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    next.clampWhenFinished = !loop
    next.play()
    if (this.current) next.crossFadeFrom(this.current, 0.18, false)
    this.current = next
  }

  update(dt: number) {
    this.mixer.update(dt)
  }

  dispose() {
    this.mixer.stopAllAction()
    this.material.dispose()
  }
}

export async function loadBody(): Promise<Body> {
  base ??= loader.loadAsync(url).then((g) => ({ scene: g.scene, clips: g.animations }))
  const { scene, clips } = await base
  return new Body(scene, clips)
}
