import * as THREE from 'three'
import { addWind, type Clock } from './shaders'

const seeded = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647

/** Tiga bilah melengkung dalam satu rumpun; warna pangkal gelap, ujung terang. */
function tuft() {
  const pts: number[] = []
  const shade: number[] = []
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI + 0.4
    const dx = Math.cos(a) * 0.07
    const dz = Math.sin(a) * 0.07
    const lean = (b - 1) * 0.06
    const tip: [number, number, number] = [lean, 0.34, 0.05]
    pts.push(-dx, 0, -dz, dx, 0, dz, tip[0], tip[1], tip[2])
    shade.push(0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 1.15, 1.15, 1.15)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3))
  g.computeVertexNormals()
  return g
}

/**
 * Rumput 3D instanced di luar lapangan, bergerak ditiup angin. `keepOut` memuat kotak yang harus
 * bersih (lapangan, tribun).
 */
export function makeGrass(count: number, half: number, keepOut: (x: number, z: number) => boolean, clock: Clock, base: string) {
  const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.9, vertexColors: true, side: THREE.DoubleSide })
  addWind(mat, clock, { strength: 0.09, height: 0.34 })
  const im = new THREE.InstancedMesh(tuft(), mat, count)
  const r = seeded(19)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  let i = 0
  for (let tries = 0; i < count && tries < count * 8; tries++) {
    const x = (r() * 2 - 1) * half
    const z = (r() * 2 - 1) * half
    if (keepOut(x, z)) continue
    const s = 0.8 + r() * 0.9
    m.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(up, r() * 6.28), new THREE.Vector3(s, s * (0.8 + r() * 0.6), s))
    im.setMatrixAt(i++, m)
  }
  im.count = i
  im.frustumCulled = false
  im.receiveShadow = true
  return im
}
