import * as THREE from 'three'

/**
 * Hiasan & rumput yang dibangun per petak (userData.cx/cz/r) digabung jadi SATU InstancedMesh per
 * pasangan geometri+bahan untuk seluruh peta. `update(x, z)` menyalin isi petak dalam jangkauan ke
 * mesh gabungan, jadi draw call = jumlah jenis hiasan, bukan jenis × petak terlihat.
 */
export function mergeTiles(tiles: THREE.InstancedMesh[]) {
  type G = { tiles: THREE.InstancedMesh[]; out: THREE.InstancedMesh }
  const groups = new Map<string, G>()
  for (const t of tiles) {
    const key = `${t.geometry.uuid}|${(t.material as THREE.Material).uuid}`
    const g = groups.get(key)
    if (g) g.tiles.push(t)
    else groups.set(key, { tiles: [t], out: null as unknown as THREE.InstancedMesh })
  }
  for (const g of groups.values()) {
    const first = g.tiles[0]
    const cap = g.tiles.reduce((s, t) => s + t.count, 0)
    const out = new THREE.InstancedMesh(first.geometry, first.material, cap)
    out.castShadow = first.castShadow
    out.receiveShadow = first.receiveShadow
    // isinya berganti-ganti: batas tampilan tidak dihitung ulang, jangan dipangkas frustum
    out.frustumCulled = false
    out.count = 0
    if (g.tiles.some((t) => t.instanceColor)) out.setColorAt(0, new THREE.Color(1, 1, 1))
    g.out = out
  }
  let lastX = Infinity
  let lastZ = Infinity
  let lastR = -1
  return {
    meshes: [...groups.values()].map((g) => g.out),
    /** isi ulang dengan petak yang tepinya dalam `radius` m dari (x, z); murah kalau kamera belum bergeser */
    update(x: number, z: number, radius: number) {
      if (Math.hypot(x - lastX, z - lastZ) < 3 && radius === lastR) return
      lastX = x
      lastZ = z
      lastR = radius
      for (const g of groups.values()) {
        let n = 0
        const dst = g.out.instanceMatrix.array as Float32Array
        const dc = g.out.instanceColor?.array as Float32Array | undefined
        for (const t of g.tiles) {
          if (Math.hypot(t.userData.cx - x, t.userData.cz - z) - ((t.userData.r as number) ?? 0) > radius) continue
          dst.set((t.instanceMatrix.array as Float32Array).subarray(0, t.count * 16), n * 16)
          if (dc) {
            if (t.instanceColor) dc.set((t.instanceColor.array as Float32Array).subarray(0, t.count * 3), n * 3)
            else dc.fill(1, n * 3, (n + t.count) * 3)
          }
          n += t.count
        }
        g.out.count = n
        g.out.visible = n > 0
        g.out.instanceMatrix.needsUpdate = true
        if (g.out.instanceColor) g.out.instanceColor.needsUpdate = true
      }
    },
  }
}
