// Tali di antara dua pinggang: melengkung ke bawah saat kendur, lurus dan bergetar saat tegang.
import * as THREE from 'three'
import { ropeMaterial } from './shaders'

const SEG = 24

export class RopeView {
  readonly mesh: THREE.Mesh
  private mat = ropeMaterial()
  private pts = Array.from({ length: SEG + 1 }, () => new THREE.Vector3())
  private curve = new THREE.CatmullRomCurve3(this.pts)
  private t = 0

  constructor(shadows: boolean) {
    this.mesh = new THREE.Mesh(new THREE.TubeGeometry(this.curve, SEG, 0.07, 7), this.mat)
    this.mesh.castShadow = shadows
    this.mesh.frustumCulled = false
  }

  /** `floor(x, y)` = tinggi tanah di bawah titik tali (null = jurang); tali kendur tergeletak di atasnya */
  update(dt: number, a: THREE.Vector3, b: THREE.Vector3, len: number, floor?: (x: number, y: number) => number | null) {
    this.t += dt
    const d = a.distanceTo(b)
    const slack = Math.max(0, len - d)
    const tension = Math.max(0, Math.min(1, 1 - slack / 0.6))
    this.mat.userData.tension.value += (tension - this.mat.userData.tension.value) * Math.min(1, dt * 8)
    // lengkung rantai didekati parabola; kedalamannya dari panjang tali yang berlebih
    const sag = Math.min(2.6, Math.sqrt(Math.max(0, len * len - d * d)) * 0.48)
    const buzz = tension > 0.95 ? Math.sin(this.t * 60) * 0.025 : 0
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG
      const p = this.pts[i].lerpVectors(a, b, f)
      const bell = 4 * f * (1 - f)
      p.y -= sag * bell
      p.y += buzz * bell
      p.z += 0.12 * bell + 0.15
      if (floor) {
        const g = floor(p.x, Math.max(a.y, b.y))
        if (g !== null && p.y < g + 0.07) p.y = g + 0.07
      }
    }
    this.curve.updateArcLengths()
    const old = this.mesh.geometry
    this.mesh.geometry = new THREE.TubeGeometry(this.curve, SEG, 0.07, 7)
    old.dispose()
  }

  set visible(v: boolean) {
    this.mesh.visible = v
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mat.dispose()
  }
}
