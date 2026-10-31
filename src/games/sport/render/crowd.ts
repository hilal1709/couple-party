import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Clock } from './shaders'

export type Seat = { x: number; y: number; z: number; rot: number }

const SHIRTS = ['#d93a84', '#3f9a33', '#d9a92a', '#2f7fb8', '#d9682c', '#6a4ac0', '#e8e4dc', '#2a2a34', '#b83232']
const SKINS = ['#f0c8a0', '#d8a678', '#b07a4c', '#7a4e2e']
const HAIRS = ['#1a1412', '#3d2616', '#6b4522', '#c9a040', '#8a8a92']

/** Baris kursi lurus, dipakai untuk menyusun tribun tiap arena. */
export function rowSeats(from: [number, number, number], to: [number, number, number], gap: number, rot: number): Seat[] {
  const d = Math.hypot(to[0] - from[0], to[2] - from[2])
  const n = Math.floor(d / gap)
  return Array.from({ length: n }, (_, i) => {
    const k = (i + 0.5) / n
    return { x: from[0] + (to[0] - from[0]) * k, y: from[1], z: from[2] + (to[2] - from[2]) * k, rot }
  })
}

const seeded = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647

/**
 * Tiga lapis instanced (baju, kulit, rambut) yang bergerak sama lewat shader. Atribut `aArm` menandai
 * titik lengan: saat `excite` naik penonton melompat dan mengangkat tangan, tanpa beban CPU per orang.
 */
export class Crowd {
  readonly group = new THREE.Group()
  private excite = { value: 0 }
  private target = 0

  constructor(seats: Seat[], clock: Clock, density: number) {
    const rnd = seeded(77)
    const kept = seats.filter(() => rnd() < density)
    const part = (geos: THREE.BufferGeometry[], colors: string[], rough: number) => {
      const g = mergeGeometries(geos.map((x) => x.toNonIndexed()))!
      const mat = new THREE.MeshStandardMaterial({ roughness: rough })
      const excite = this.excite
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uClock = clock
        sh.uniforms.uExcite = excite
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uClock; uniform float uExcite; attribute float aArm;')
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             {
               float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
               float beat = sin(uClock * (1.4 + fract(ph) * 0.8) + ph);
               float jump = max(0.0, sin(uClock * 8.0 + ph * 3.0));
               transformed.y += (beat * 0.012 + jump * 0.2 * uExcite);
               transformed.x += sin(uClock * 0.9 + ph) * 0.015;
               // lengan terangkat: titik lengan diputar naik dari bahu
               float up = aArm * (uExcite * (0.7 + 0.3 * sin(uClock * 9.0 + ph)) + max(0.0, sin(uClock * 0.35 + ph * 5.0) - 0.92) * 8.0);
               transformed.y += up * 0.42;
               transformed.z += up * 0.1;
             }`,
          )
      }
      const im = new THREE.InstancedMesh(g, mat, kept.length)
      const col = new THREE.Color()
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const up = new THREE.Vector3(0, 1, 0)
      const r2 = seeded(colors.length * 13 + 5)
      kept.forEach((s, i) => {
        const size = 0.92 + r2() * 0.18
        m.compose(new THREE.Vector3(s.x, s.y, s.z), q.setFromAxisAngle(up, s.rot + (r2() - 0.5) * 0.5), new THREE.Vector3(size, size, size))
        im.setMatrixAt(i, m)
        im.setColorAt(i, col.set(colors[Math.floor(r2() * colors.length)]))
      })
      im.castShadow = false
      im.frustumCulled = false
      this.group.add(im)
    }

    const tag = (g: THREE.BufferGeometry, arm: number) => {
      g.setAttribute('aArm', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(arm), 1))
      g.deleteAttribute('uv')
      return g
    }
    const torso = tag(new THREE.CapsuleGeometry(0.17, 0.3, 2, 7).translate(0, 0.42, 0), 0)
    const legs = tag(new THREE.BoxGeometry(0.3, 0.3, 0.34).translate(0, 0.1, 0.1), 0)
    part([torso, legs], SHIRTS, 0.85)
    const head = tag(new THREE.IcosahedronGeometry(0.14, 1).translate(0, 0.8, 0), 0)
    const armL = tag(new THREE.CapsuleGeometry(0.05, 0.3, 1, 5).translate(-0.22, 0.42, 0.03), 1)
    const armR = tag(new THREE.CapsuleGeometry(0.05, 0.3, 1, 5).translate(0.22, 0.42, 0.03), 1)
    part([head, armL, armR], SKINS, 0.6)
    const hair = tag(new THREE.SphereGeometry(0.15, 7, 4, 0, Math.PI * 2, 0, 1.35).translate(0, 0.83, -0.015), 0)
    part([hair], HAIRS, 0.75)
  }

  /** Sorakan: naik seketika lalu reda sendiri. */
  cheer(amount = 1) {
    this.target = Math.max(this.target, amount)
  }

  update(dt: number) {
    this.excite.value += (this.target - this.excite.value) * Math.min(1, dt * 6)
    this.target = Math.max(0, this.target - dt * 0.45)
  }
}
