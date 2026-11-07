import * as THREE from 'three'
import { fbm, rng } from '../sim/noise'
import type { Terrain } from '../sim/terrain'

/**
 * Latar Punggung Hijau (gunung tanpa laut): dasar lembah berhutan dan tiga lapis pegunungan jauh.
 *
 * - Dasar lembah: bidang besar setinggi tepi peta, warna hutan bernoise, ikut kabut adegan.
 * - Hutan lembah: kerucut pinus murah (12 segitiga) di dasar lembah, satu InstancedMesh.
 * - Pegunungan jauh: tiga cincin siluet (300 / 520 / 820 m) tanpa kabut adegan. Warnanya sudah
 *   dicampur ke warna kabut per lapis (perspektif udara), jadi lapis terjauh paling pucat.
 *
 * Semuanya tampilan saja; tidak ada tabrakan. Total 3 draw call.
 */
export function backdrop(t: Terrain, fog: string, detail: number, seed: number) {
  const group = new THREE.Group()
  group.name = 'latar'
  const floorY = Math.min(t.h[0], t.h[t.nx - 1], t.h[t.h.length - 1]) - 0.4
  const cx = 0
  const cz = 0
  const fogC = new THREE.Color(fog)

  // ---------- dasar lembah ----------
  {
    const R = 900
    const seg = 48
    const g = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg).rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const a = new THREE.Color('#4f6b3c')
    const b = new THREE.Color('#38552f')
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // jauh dari gunung boleh bergelombang; dekat peta harus rata dengan tepinya
      const far = Math.min(1, Math.max(0, (Math.max(Math.abs(x) - t.hx, Math.abs(z) - t.hz) - 20) / 160))
      pos.setY(i, floorY + fbm(x * 0.006, z * 0.006, seed + 5, 3) * 18 * far - 0.6 * (1 - far))
      c.copy(a).lerp(b, fbm(x * 0.02, z * 0.02, seed + 6, 2) * 0.5 + 0.5)
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.computeVertexNormals()
    const m = new THREE.MeshLambertMaterial({ vertexColors: true })
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(cx, 0, cz)
    mesh.receiveShadow = false
    group.add(mesh)
  }

  // ---------- hutan lembah ----------
  {
    const cone = new THREE.ConeGeometry(1, 1, 6, 1).translate(0, 0.5, 0)
    const trunk = new THREE.Color('#3b6337')
    const count = Math.round(1400 * Math.max(0.35, detail))
    const im = new THREE.InstancedMesh(cone, new THREE.MeshLambertMaterial({ color: '#ffffff' }), count)
    const r = rng(seed + 77)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    let k = 0
    for (let tries = 0; k < count && tries < count * 6; tries++) {
      const x = (r() * 2 - 1) * 330
      const z = (r() * 2 - 1) * (t.hz + 200)
      // hanya di luar peta medan (di dalam peta ada pohon sungguhan & lereng)
      if (Math.abs(x) < t.hx + 4 && Math.abs(z) < t.hz + 4) continue
      // berkelompok: noise memutuskan ada hutan atau padang
      if (fbm(x * 0.012, z * 0.012, seed + 9, 2) < -0.05) continue
      const h = 7 + r() * 9
      p.set(x, floorY - 0.3, z)
      s.set(h * 0.32, h, h * 0.32)
      m4.compose(p, q, s)
      im.setMatrixAt(k, m4)
      im.setColorAt(k, c.copy(trunk).multiplyScalar(0.8 + r() * 0.45))
      k++
    }
    im.count = k
    im.frustumCulled = false
    group.add(im)
  }

  // ---------- pegunungan jauh: tiga cincin siluet ----------
  {
    const layers = [
      { r: 300, base: 30, amp: 90, mix: 0.45, col: '#5d7a63' },
      { r: 520, base: 60, amp: 170, mix: 0.66, col: '#6f8b86' },
      { r: 820, base: 90, amp: 280, mix: 0.82, col: '#8aa1a6' },
    ]
    const seg = 160
    const pos: number[] = []
    const colA: number[] = []
    const idx: number[] = []
    const c = new THREE.Color()
    layers.forEach((L, li) => {
      c.set(L.col).lerp(fogC, L.mix)
      const top = c.clone()
      // kaki siluet menyatu ke kabut
      const bot = c.clone().lerp(fogC, 0.6)
      const start = pos.length / 3
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2
        // cincin agak lonjong mengikuti peta yang memanjang di z
        const rr = L.r + t.hz * 0.6
        const x = cx + Math.cos(a) * L.r
        const z = cz + Math.sin(a) * rr
        const u = i / seg
        // puncak-puncak tajam: noise berlapis + punggungan (|noise|) untuk siluet bergerigi
        const n = fbm(Math.cos(a) * 2.2 + li * 9, Math.sin(a) * 2.2, seed + 31 + li, 4)
        const ridge = 1 - Math.abs(fbm(u * 18 + li, li * 3.1, seed + 41, 3))
        const hgt = L.base + L.amp * Math.max(0.05, 0.55 + n * 0.8) * (0.55 + 0.45 * ridge)
        pos.push(x, floorY - 20, z, x, floorY + hgt, z)
        colA.push(bot.r, bot.g, bot.b, top.r, top.g, top.b)
      }
      for (let i = 0; i < seg; i++) {
        const a0 = start + i * 2
        idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3))
    g.setIndex(idx)
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(g, m)
    mesh.frustumCulled = false
    // digambar paling dulu: lapis dekat menutupi lapis jauh lewat urutan cincin, gunung menutupi semua
    mesh.renderOrder = -1
    group.add(mesh)
  }
  return group
}
