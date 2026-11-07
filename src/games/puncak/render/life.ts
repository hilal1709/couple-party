import * as THREE from 'three'

/**
 * Kehidupan kecil di sekitar pemain: kawanan burung di langit, kupu-kupu di dekat tanah,
 * kunang-kunang saat gelap/berkabut, dan tirai hujan bergaris. Semua kosmetik (tidak disinkronkan).
 */

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function wingGeo(span: number, chord: number) {
  // dua segitiga sayap; titik pangkal di x = 0, ujung sayap ke +x
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -chord * 0.5, span, 0, 0, 0, 0, chord * 0.5], 3))
  g.computeVertexNormals()
  return g
}

type Flyer = { g: THREE.Group; l: THREE.Object3D; r: THREE.Object3D; a: number; rad: number; h: number; sp: number; ph: number; ox: number; oz: number }

export class Life {
  readonly group = new THREE.Group()
  private birds: Flyer[] = []
  private flies: (Flyer & { home: THREE.Vector3 })[] = []
  private glow: THREE.Points
  private glowPos: Float32Array
  private glowSeed: Float32Array
  private rain: THREE.LineSegments
  private rainPos: Float32Array
  private rainVel: Float32Array
  private t = 0

  constructor(opts: { birds: boolean; butterflies: boolean; dark: boolean; tier: number }) {
    const ink = new THREE.MeshBasicMaterial({ color: '#2a2230', side: THREE.DoubleSide })
    if (opts.birds) {
      const wg = wingGeo(0.55, 0.28)
      for (let i = 0; i < Math.max(3, Math.round(7 * opts.tier)); i++) {
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4).scale(0.8, 0.7, 2), ink)
        const l = new THREE.Mesh(wg, ink)
        const r = new THREE.Mesh(wg, ink)
        r.scale.x = -1
        g.add(body, l, r)
        this.group.add(g)
        this.birds.push({ g, l, r, a: (i / 7) * Math.PI * 2, rad: rnd(18, 30), h: rnd(14, 24), sp: rnd(0.25, 0.4), ph: rnd(0, 6), ox: rnd(-4, 4), oz: rnd(-4, 4) })
      }
    }
    if (opts.butterflies) {
      const colors = ['#ff37a6', '#ffcc1f', '#5cf64a', '#7ae8ff', '#ff6b35']
      const wg = wingGeo(0.09, 0.1)
      for (let i = 0; i < Math.round(10 * opts.tier); i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide })
        const g = new THREE.Group()
        const l = new THREE.Mesh(wg, mat)
        const r = new THREE.Mesh(wg, mat)
        r.scale.x = -1
        g.add(l, r)
        this.group.add(g)
        this.flies.push({ g, l, r, a: rnd(0, 6), rad: rnd(1, 3), h: rnd(0.4, 1.4), sp: rnd(0.6, 1.2), ph: rnd(0, 6), ox: 0, oz: 0, home: new THREE.Vector3(1e6, 0, 0) })
      }
    }
    // kunang-kunang: titik bercahaya aditif
    const N = opts.dark ? 60 : 30
    this.glowPos = new Float32Array(N * 3)
    this.glowSeed = new Float32Array(N * 4).map(() => Math.random())
    const gg = new THREE.BufferGeometry()
    gg.setAttribute('position', new THREE.BufferAttribute(this.glowPos, 3))
    this.glow = new THREE.Points(gg, new THREE.PointsMaterial({ color: '#d8ff7a', size: 0.14, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.glow.frustumCulled = false
    this.group.add(this.glow)
    // tirai hujan: garis-garis pendek yang jatuh miring mengikuti angin
    const R = Math.round(700 * opts.tier) + 150
    this.rainPos = new Float32Array(R * 6)
    this.rainVel = new Float32Array(R).map(() => rnd(16, 22))
    const rg = new THREE.BufferGeometry()
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3))
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#cfe4ff', transparent: true, opacity: 0, depthWrite: false }))
    this.rain.frustumCulled = false
    this.group.add(this.rain)
  }

  /**
   * @param c posisi kamera, @param p posisi pemain (tanah), @param rain kekuatan hujan 0..1,
   * @param calm 0..1 cuaca tenang (burung & kupu-kupu muncul), @param dusk 0..1 gelap/kabut (kunang-kunang)
   */
  update(dt: number, c: THREE.Vector3, p: THREE.Vector3, wind: [number, number], rain: number, calm: number, dusk: number, groundAt: (x: number, z: number) => number) {
    this.t += dt
    for (const b of this.birds) {
      b.a += b.sp * dt
      const x = p.x + b.ox + Math.cos(b.a) * b.rad
      const z = p.z + b.oz + Math.sin(b.a) * b.rad
      b.g.position.set(x, p.y + b.h + Math.sin(this.t * 0.6 + b.ph) * 1.5, z)
      b.g.rotation.y = -b.a
      const flap = Math.sin(this.t * 9 + b.ph) * 0.7
      b.l.rotation.z = flap
      b.r.rotation.z = -flap
      b.g.visible = calm > 0.4
    }
    for (const f of this.flies) {
      if (f.home.distanceTo(p) > 18) {
        // pindah ke dekat pemain, di atas tanah
        const a = Math.random() * Math.PI * 2
        const d = rnd(3, 12)
        f.home.set(p.x + Math.cos(a) * d, 0, p.z + Math.sin(a) * d)
        f.home.y = groundAt(f.home.x, f.home.z)
      }
      f.a += f.sp * dt
      const x = f.home.x + Math.cos(f.a) * f.rad + Math.sin(this.t * 1.7 + f.ph) * 0.4
      const z = f.home.z + Math.sin(f.a * 1.3) * f.rad
      f.g.position.set(x, f.home.y + f.h + Math.sin(this.t * 2.3 + f.ph) * 0.25, z)
      f.g.rotation.y = -f.a
      const flap = Math.sin(this.t * 22 + f.ph) * 1.1
      f.l.rotation.z = flap
      f.r.rotation.z = -flap
      f.g.visible = calm > 0.6
    }
    // kunang-kunang berkedip di sekitar pemain
    const gm = this.glow.material as THREE.PointsMaterial
    gm.opacity += (dusk * 0.9 - gm.opacity) * Math.min(1, dt * 2)
    this.glow.visible = gm.opacity > 0.02
    if (this.glow.visible) {
      const n = this.glowPos.length / 3
      for (let i = 0; i < n; i++) {
        const s = this.glowSeed
        const a = s[i * 4] * 6.28 + this.t * (0.2 + s[i * 4 + 1] * 0.3)
        const r = 2 + s[i * 4 + 2] * 12
        this.glowPos[i * 3] = p.x + Math.cos(a) * r
        this.glowPos[i * 3 + 2] = p.z + Math.sin(a) * r
        this.glowPos[i * 3 + 1] = p.y + 0.5 + s[i * 4 + 3] * 2.5 + Math.sin(this.t * 1.3 + i) * 0.3
      }
      this.glow.geometry.attributes.position.needsUpdate = true
    }
    // hujan: tetes di kotak 36 m sekitar kamera
    const rm = this.rain.material as THREE.LineBasicMaterial
    rm.opacity += (rain * 0.55 - rm.opacity) * Math.min(1, dt * 2)
    this.rain.visible = rm.opacity > 0.02
    if (this.rain.visible) {
      const n = this.rainVel.length
      const active = Math.round(n * Math.min(1, rain + 0.1))
      const P = this.rainPos
      for (let i = 0; i < n; i++) {
        const o = i * 6
        if (i >= active) {
          P[o + 1] = P[o + 4] = -9999
          continue
        }
        let y = P[o + 1] - this.rainVel[i] * dt
        if (y < c.y - 12 || Math.abs(P[o] - c.x) > 20 || Math.abs(P[o + 2] - c.z) > 20) {
          P[o] = c.x + rnd(-18, 18)
          P[o + 2] = c.z + rnd(-18, 18)
          y = c.y + rnd(2, 16)
        }
        const sx = wind[0] * 0.05
        const sz = wind[1] * 0.05
        P[o] += wind[0] * dt * 0.6
        P[o + 2] += wind[1] * dt * 0.6
        P[o + 1] = y
        P[o + 3] = P[o] - sx
        P[o + 4] = y + 0.7
        P[o + 5] = P[o + 2] - sz
      }
      this.rain.geometry.attributes.position.needsUpdate = true
    }
  }
}
