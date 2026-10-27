import * as THREE from 'three'

/**
 * Bekas ban: potongan pita gelap di aspal saat drift / rem keras.
 * Satu mesh dengan buffer cincin; potongan terlama ditimpa.
 */
export class Skids {
  readonly mesh: THREE.Mesh
  private pos: Float32Array
  private alpha: Float32Array
  private next = 0
  private max: number
  /** ujung terakhir per roda (kart × 2) */
  private last = new Map<number, [number, number, number, number]>()

  constructor(max = 900) {
    this.max = max
    this.pos = new Float32Array(max * 4 * 3)
    this.alpha = new Float32Array(max * 4)
    const idx: number[] = []
    for (let i = 0; i < max; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(idx)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      vertexShader: 'attribute float alpha; varying float a; void main(){ a = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float a; void main(){ gl_FragColor = vec4(0.06,0.06,0.08, a); }',
    })
    this.mesh = new THREE.Mesh(g, mat)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 1
  }

  /** tandai satu roda; `on` false memutus jejak */
  mark(key: number, x: number, y: number, z: number, yaw: number, on: boolean, strength = 0.45) {
    const hw = 0.22
    const rx = Math.cos(yaw) * hw
    const rz = -Math.sin(yaw) * hw
    const now: [number, number, number, number] = [x - rx, z - rz, x + rx, z + rz]
    const prev = this.last.get(key)
    if (!on) {
      this.last.delete(key)
      return
    }
    this.last.set(key, now)
    if (!prev) return
    if ((prev[0] - now[0]) ** 2 + (prev[1] - now[1]) ** 2 > 16) return
    const i = this.next
    this.next = (this.next + 1) % this.max
    const yy = y + 0.08
    const v = [prev[0], yy, prev[1], prev[2], yy, prev[3], now[0], yy, now[1], now[2], yy, now[3]]
    this.pos.set(v, i * 12)
    this.alpha.fill(strength, i * 4, i * 4 + 4)
    ;(this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(this.mesh.geometry.getAttribute('alpha') as THREE.BufferAttribute).needsUpdate = true
  }

  /** pudarkan pelan-pelan */
  update(dt: number) {
    let changed = false
    for (let i = 0; i < this.alpha.length; i++) {
      if (this.alpha[i] > 0) {
        this.alpha[i] = Math.max(0, this.alpha[i] - dt * 0.025)
        changed = true
      }
    }
    if (changed) (this.mesh.geometry.getAttribute('alpha') as THREE.BufferAttribute).needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
