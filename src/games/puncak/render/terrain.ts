import * as THREE from 'three'
import { texIndex } from '../mountains'
import { CELL, gradAt, heightAt, layersOf, type Terrain } from '../sim/terrain'
import type { TerrainTex } from './textures'

/** sel per sisi satu potongan medan (32 m) */
const CHUNK = 64

/** AO dari horizon: lembah & kaki tebing lebih gelap (diganti lightmap Blender, dihitung sekali saat muat) */
export function bakeAO(t: Terrain, step = 1): Float32Array {
  const { nx, nz } = t
  const out = new Float32Array(nx * nz)
  const dirs = 6
  const dist = [1.5, 3, 5, 8, 12, 18, 26]
  for (let j = 0; j < nz; j += step) {
    for (let i = 0; i < nx; i += step) {
      const x = i * CELL - t.hx
      const z = j * CELL - t.hz
      const h = t.h[j * nx + i]
      let occ = 0
      for (let d = 0; d < dirs; d++) {
        const a = (d / dirs) * Math.PI * 2 + 0.3
        const dx = Math.cos(a)
        const dz = Math.sin(a)
        let best = 0
        for (const r of dist) {
          const s = (heightAt(t, x + dx * r, z + dz * r) - h) / r
          if (s > best) best = s
        }
        occ += best / Math.sqrt(1 + best * best)
      }
      const v = 1 - (occ / dirs) * 0.85
      for (let jj = j; jj < Math.min(nz, j + step); jj++) for (let ii = i; ii < Math.min(nx, i + step); ii++) out[jj * nx + ii] = v
    }
  }
  return out
}

/** geometri potongan (ci, cj) selebar `span` sampel, langkah `s` sampel per sel; dipotong di tepi peta */
function chunkGeometry(t: Terrain, ao: Float32Array, ci: number, cj: number, s: number, span = CHUNK) {
  const i0 = ci * CHUNK
  const j0 = cj * CHUNK
  // sel yang benar-benar ada di peta (simpul besar di tepi peta tidak membuang segitiga di luar)
  const ca = Math.max(1, Math.min(span / s, Math.ceil((t.nx - 1 - i0) / s)))
  const cb = Math.max(1, Math.min(span / s, Math.ceil((t.nz - 1 - j0) / s)))
  const row = ca + 1
  const verts = row * (cb + 1)
  // tepi turun (skirt) menutupi celah antar tingkat detail
  const skirt = 2 * (ca + cb) + 4
  const total = verts + skirt
  const pos = new Float32Array(total * 3)
  const nor = new Float32Array(total * 3)
  const w = new Float32Array(total * 4)
  const snow = new Float32Array(total)
  const zone = new Float32Array(total)
  const aoA = new Float32Array(total)
  const put = (k: number, gi: number, gj: number, drop: number) => {
    const i = Math.min(t.nx - 1, gi)
    const j = Math.min(t.nz - 1, gj)
    const idx = j * t.nx + i
    const x = i * CELL - t.hx
    const z = j * CELL - t.hz
    pos[k * 3] = x
    pos[k * 3 + 1] = t.h[idx] - drop
    pos[k * 3 + 2] = z
    const [gx, gz] = gradAt(t, x, z)
    const l = Math.hypot(gx, 1, gz)
    nor[k * 3] = -gx / l
    nor[k * 3 + 1] = 1 / l
    nor[k * 3 + 2] = -gz / l
    for (let c = 0; c < 4; c++) w[k * 4 + c] = t.w[idx * 4 + c] / 255
    snow[k] = t.snow[idx] / 255
    zone[k] = t.zone[idx]
    aoA[k] = ao[idx]
  }
  for (let b = 0; b <= cb; b++) for (let a = 0; a <= ca; a++) put(b * row + a, i0 + a * s, j0 + b * s, 0)
  const idx: number[] = []
  for (let b = 0; b < cb; b++) {
    for (let a = 0; a < ca; a++) {
      const p = b * row + a
      idx.push(p, p + row, p + 1, p + 1, p + row, p + row + 1)
    }
  }
  // skirt: keliling potongan
  let k = verts
  const ring: number[] = []
  for (let a = 0; a <= ca; a++) ring.push(a)
  for (let b = 1; b <= cb; b++) ring.push(b * row + ca)
  for (let a = ca - 1; a >= 0; a--) ring.push(cb * row + a)
  for (let b = cb - 1; b >= 1; b--) ring.push(b * row)
  const first = k
  for (const p of ring) {
    const gi = i0 + (p % row) * s
    const gj = j0 + Math.floor(p / row) * s
    // simpul kasar punya selisih tinggi lebih besar dengan tetangga halus: tirai tepi lebih dalam
    put(k++, gi, gj, 1.5 + s * 1.5)
  }
  for (let r = 0; r < ring.length; r++) {
    const a = ring[r]
    const b = ring[(r + 1) % ring.length]
    const sa = first + r
    const sb = first + ((r + 1) % ring.length)
    idx.push(a, sa, b, b, sa, sb)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, k * 3), 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, k * 3), 3))
  g.setAttribute('aW', new THREE.BufferAttribute(w.subarray(0, k * 4), 4))
  g.setAttribute('aSnow', new THREE.BufferAttribute(snow.subarray(0, k), 1))
  g.setAttribute('aZone', new THREE.BufferAttribute(zone.subarray(0, k), 1))
  g.setAttribute('aAO', new THREE.BufferAttribute(aoA.subarray(0, k), 1))
  g.setIndex(idx)
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

const NOISE = `
  float tHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float tNoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(tHash(i), tHash(i + vec2(1, 0)), f.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), f.x), f.y);
  }`

export type TerrainUniforms = {
  uDiff: { value: THREE.DataArrayTexture }
  uNrm: { value: THREE.DataArrayTexture | null }
  uGround: { value: THREE.Vector4[] }
  uCliff: { value: number[] }
  uSnowL: { value: number }
  uScale: { value: number }
  uCliffScale: { value: number }
  uWet: { value: number }
  uTime: { value: number }
  uRain: { value: number }
  uMoss: { value: number }
  uMossL: { value: number }
  uVulk: { value: number }
  uLava: { value: number }
  uRock: { value: THREE.Color[] }
  uSoil: { value: THREE.Color[] }
  uLedge: { value: THREE.Color[] }
}

/**
 * Shader medan: 4 bahan tanah dicampur per titik dengan height-blend (sambungan mengikuti tonjolan tekstur,
 * bukan gradasi buram), tebing triplanar (tanpa tekstur melar di dinding), dan salju yang menumpuk di
 * permukaan menghadap ke atas. AO horizon dari medan meredupkan cahaya langit di lembah.
 */
/** zona terbanyak satu gunung (Punggung Hijau = 6); larik uniform shader sepanjang ini */
const MAXZ = 6
const zonesOf = (t: Terrain) => {
  const z = t.m.zones.slice(0, t.zones)
  while (z.length < MAXZ) z.push(z[z.length - 1])
  return z
}

export function terrainMaterial(t: Terrain, tex: TerrainTex, high: boolean, clock: { value: number } = { value: 0 }) {
  const layers = layersOf(t)
  while (layers.length < MAXZ) layers.push(layers[layers.length - 1])
  const u: TerrainUniforms = {
    uDiff: { value: tex.diff },
    uNrm: { value: tex.nrm },
    uGround: { value: layers.map((l) => new THREE.Vector4(l[0], l[1], l[2], l[3])) },
    uCliff: { value: layers.map((l) => l[4]) },
    uSnowL: { value: texIndex('salju') },
    uScale: { value: 3.4 },
    uCliffScale: { value: 7 },
    uWet: { value: t.m.id === 'rimba' || t.m.id === 'teh' ? 1 : 0 },
    uTime: clock,
    uRain: { value: 0 },
    // lumut menumpuk di bibir tebing & tonjolan (gunung lembap)
    uMoss: { value: ({ rimba: 1, teh: 0.7, langit: 0.55, karang: 0.35 } as Record<string, number>)[t.m.id] ?? 0 },
    uMossL: { value: texIndex('lumut') },
    uVulk: { value: texIndex('vulkanik') },
    uLava: { value: t.m.id === 'kawah' ? 1 : 0 },
    uRock: { value: zonesOf(t).map((z) => new THREE.Color(z.rock)) },
    uSoil: { value: zonesOf(t).map((z) => new THREE.Color(z.soil)) },
    uLedge: { value: zonesOf(t).map((z) => new THREE.Color(z.ledge)) },
  }
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 })
  // dibaca adegan untuk tebing basah saat hujan
  m.userData.u = u
  const nrm = !!tex.nrm
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute vec4 aW; attribute float aSnow; attribute float aZone; attribute float aAO;
         varying vec3 vTW; varying vec3 vTN; varying vec4 vW; varying float vSnow; flat varying int vZone; varying float vAO;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vTN = normalize(mat3(modelMatrix) * objectNormal);
         vW = aW; vSnow = aSnow; vZone = int(aZone + 0.5); vAO = aAO;`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform highp sampler2DArray uDiff;
         ${nrm ? 'uniform highp sampler2DArray uNrm;' : ''}
         uniform vec4 uGround[${MAXZ}]; uniform float uCliff[${MAXZ}]; uniform float uSnowL; uniform float uScale; uniform float uCliffScale; uniform float uWet;
         uniform float uTime; uniform float uRain; uniform float uMoss; uniform float uMossL; uniform float uVulk; uniform float uLava;
         uniform vec3 uRock[${MAXZ}]; uniform vec3 uSoil[${MAXZ}]; uniform vec3 uLedge[${MAXZ}];
         varying vec3 vTW; varying vec3 vTN; varying vec4 vW; varying float vSnow; flat varying int vZone; varying float vAO;
         ${NOISE}
         float lum(vec3 c){ return dot(c, vec3(0.3, 0.55, 0.15)); }
         vec4 sampD(vec2 uv, float l, vec2 dx, vec2 dy){ vec3 c = textureGrad(uDiff, vec3(uv, l), dx, dy).rgb; return vec4(c, lum(c)); }
         ${nrm ? 'vec3 sampN(vec2 uv, float l, vec2 dx, vec2 dy){ return textureGrad(uNrm, vec3(uv, l), dx, dy).rgb; }' : ''}`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 wn = normalize(vTN);
         int zi = clamp(vZone, 0, ${MAXZ - 1});
         vec4 L = uGround[zi];
         float macro = tNoise(vTW.xz * 0.013) * 0.6 + tNoise(vTW.xz * 0.061) * 0.4;
         // tanah: 4 slot, height-blend
         vec2 uvg = vTW.xz / uScale;
         vec2 gdx = dFdx(uvg); vec2 gdy = dFdy(uvg);
         vec4 w = vW;
         vec4 d0 = sampD(uvg, L.x, gdx, gdy);
         vec4 d1 = w.y > 0.02 ? sampD(uvg * 0.93 + 0.37, L.y, gdx, gdy) : vec4(0.0);
         vec4 d2 = w.z > 0.02 ? sampD(uvg * 1.07 + 0.71, L.z, gdx, gdy) : vec4(0.0);
         vec4 d3 = w.w > 0.02 ? sampD(uvg * 0.81 + 0.19, L.w, gdx, gdy) : vec4(0.0);
         vec4 a = w + vec4(d0.a, d1.a, d2.a, d3.a) * 0.55;
         float am = max(max(a.x, a.y), max(a.z, a.w)) - 0.18;
         vec4 bw = max(a - am, 0.0); bw /= max(dot(bw, vec4(1.0)), 1e-4);
         vec3 groundC = d0.rgb * bw.x + d1.rgb * bw.y + d2.rgb * bw.z + d3.rgb * bw.w;
         // tebing: triplanar
         float cl = uCliff[zi];
         vec3 tw = pow(abs(wn), vec3(4.0)); tw /= dot(tw, vec3(1.0));
         vec2 ux = vTW.zy / uCliffScale; vec2 uz = vTW.xy / uCliffScale; vec2 uy = vTW.xz / uCliffScale;
         vec2 xdx = dFdx(ux); vec2 xdy = dFdy(ux); vec2 zdx = dFdx(uz); vec2 zdy = dFdy(uz); vec2 ydx = dFdx(uy); vec2 ydy = dFdy(uy);
         vec4 cx = tw.x > 0.02 ? sampD(ux, cl, xdx, xdy) : vec4(0.0);
         vec4 cz = tw.z > 0.02 ? sampD(uz, cl, zdx, zdy) : vec4(0.0);
         vec4 cy = tw.y > 0.02 ? sampD(uy, cl, ydx, ydy) : vec4(0.0);
         vec4 cliffD = cx * tw.x + cy * tw.y + cz * tw.z;
         float cliffW = smoothstep(0.86, 0.6, wn.y + (cliffD.a - 0.45) * 0.1 + (macro - 0.5) * 0.06);
         // salju di permukaan menghadap atas, tepinya mengikuti tonjolan tanah
         float snowW = 0.0; vec4 snowD = vec4(0.0);
         if (vSnow > 0.02) {
           snowD = sampD(uvg * 0.6, uSnowL, gdx * 0.6, gdy * 0.6);
           float lift = mix(dot(vec4(d0.a, d1.a, d2.a, d3.a), bw), cliffD.a, cliffW);
           snowW = smoothstep(0.42, 0.62, vSnow + (macro - 0.5) * 0.35 - lift * 0.25) * smoothstep(0.42, 0.72, wn.y);
         }
         // gaya referensi: warna batu & tanah per zona, tekstur hanya jadi detail tipis
         float gl = dot(vec4(d0.a, d1.a, d2.a, d3.a), bw);
         vec3 soilC = uSoil[zi] * (0.78 + gl * 0.45);
         // rumput & teh tetap berwarna teksturnya sendiri, pasir/tanah ikut palet
         float green = clamp((groundC.g - max(groundC.r, groundC.b)) * 6.0, 0.0, 1.0);
         vec3 styGround = mix(mix(soilC, groundC, 0.3), groundC * 1.05, green * 0.7);
         // jalan setapak sedikit lebih terang
         styGround = mix(styGround, uLedge[zi] * (0.85 + gl * 0.3), bw.y * 0.35);
         float hgt = clamp(vTW.y / 150.0, 0.0, 1.0);
         vec3 rockC = uRock[zi] * (0.72 + cliffD.a * 0.5) * (0.88 + hgt * 0.18);
         vec3 styCliff = mix(rockC, cliffD.rgb, 0.18);
         vec3 albedo = mix(mix(styGround, styCliff, cliffW), snowD.rgb, snowW);
         // lumut di bibir tebing & puncak tonjolan: permukaan setengah tegak, bercak menurut noise
         float mossW = 0.0;
         if (uMoss > 0.0) {
           float edgeUp = smoothstep(0.5, 0.72, wn.y) * (1.0 - smoothstep(0.86, 0.97, wn.y));
           mossW = uMoss * edgeUp * smoothstep(0.35, 0.6, macro + cliffD.a * 0.3) * (1.0 - snowW);
           vec4 mD = sampD(uvg * 1.3, uMossL, gdx * 1.3, gdy * 1.3);
           albedo = mix(albedo, mD.rgb * 0.95, mossW * 0.85);
         }
         // urat lava di batu vulkanik (Kawah): retakan gelap menyala berdenyut
         float vein = 0.0;
         if (uLava > 0.0) {
           float isV = (abs(cl - uVulk) < 0.5 ? cliffW : 0.0) + (abs(L.x - uVulk) < 0.5 ? bw.x * (1.0 - cliffW) : 0.0);
           vein = isV * smoothstep(0.011, 0.005, mix(gl, cliffD.a, cliffW)) * smoothstep(0.45, 0.75, tNoise(vTW.xz * 0.05 + vTW.y * 0.02));
         }
         albedo *= 0.9 + macro * 0.2;
         diffuseColor.rgb *= albedo;
         float tRough = 0.92;
         // segi batu dipertegas: campur normal datar per segitiga di muka batu
         vec3 fN = normalize(cross(dFdx(vTW), dFdy(vTW)));
         fN *= sign(dot(fN, wn));
         wn = normalize(mix(wn, fN, cliffW * 0.45));
         vec3 tWN = wn;
         ${
           nrm
             ? `{
           vec3 n0 = sampN(uvg, L.x, gdx, gdy);
           vec3 n1 = bw.y > 0.01 ? sampN(uvg * 0.93 + 0.37, L.y, gdx, gdy) : vec3(0.5, 0.5, 0.9);
           vec3 n2 = bw.z > 0.01 ? sampN(uvg * 1.07 + 0.71, L.z, gdx, gdy) : vec3(0.5, 0.5, 0.9);
           vec3 n3 = bw.w > 0.01 ? sampN(uvg * 0.81 + 0.19, L.w, gdx, gdy) : vec3(0.5, 0.5, 0.9);
           vec3 gN = n0 * bw.x + n1 * bw.y + n2 * bw.z + n3 * bw.w;
           vec2 gt = (gN.xy * 2.0 - 1.0) * 0.55;
           vec3 groundW = normalize(vec3(gt.x + wn.x, wn.y, gt.y + wn.z));
           vec3 nx = tw.x > 0.02 ? sampN(ux, cl, xdx, xdy) : vec3(0.5, 0.5, 0.9);
           vec3 nz = tw.z > 0.02 ? sampN(uz, cl, zdx, zdy) : vec3(0.5, 0.5, 0.9);
           vec3 ny = tw.y > 0.02 ? sampN(uy, cl, ydx, ydy) : vec3(0.5, 0.5, 0.9);
           vec2 tx = (nx.xy * 2.0 - 1.0) * 0.6; vec2 tz = (nz.xy * 2.0 - 1.0) * 0.6; vec2 ty = (ny.xy * 2.0 - 1.0) * 0.6;
           vec3 cW = normalize(
             vec3(0.0, tx.y, tx.x) * tw.x + vec3(tz.x, tz.y, 0.0) * tw.z + vec3(ty.x, 0.0, ty.y) * tw.y + wn);
           ${high ? `{
             float near = 1.0 - smoothstep(10.0, 24.0, length(vViewPosition));
             if (near > 0.0) {
               vec3 dn = sampN(ux * 4.0 + uz * 4.0 * tw.z, cl, xdx * 4.0, xdy * 4.0);
               vec2 dt = (dn.xy * 2.0 - 1.0) * 0.35 * near;
               cW = normalize(cW + vec3(dt.x * (1.0 - tw.x), dt.y, dt.x * tw.x));
             }
           }` : ''}
           tWN = normalize(mix(groundW, cW, cliffW));
           tWN = normalize(mix(tWN, wn, snowW * 0.7));
           float gR = gN.z;
           float cR = nx.z * tw.x + ny.z * tw.y + nz.z * tw.z;
           tRough = mix(mix(gR, cR, cliffW), 0.62, snowW);
         }`
             : ''
         }
         // lumut & daun basah: kilap tipis
         tRough = mix(tRough, tRough * 0.6, uWet * (1.0 - snowW) * smoothstep(0.4, 0.8, macro));
         // hujan: tebing gelap & berkilap
         float wetNow = uRain * (1.0 - snowW);
         diffuseColor.rgb *= 1.0 - wetNow * 0.22 * cliffW;
         tRough = mix(tRough, 0.25, wetNow * cliffW * 0.7);`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tWN, 0.0)).xyz);')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           // cahaya tepi lembut: lekuk bongkahan terbaca walau membelakangi matahari
           vec3 Vd = normalize(vViewPosition);
           float fr = pow(1.0 - clamp(dot(normal, Vd), 0.0, 1.0), 3.0);
           totalEmissiveRadiance += vec3(0.75, 0.82, 0.95) * fr * 0.07 * (0.4 + cliffW * 0.6);
           totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * vein * (1.4 + 0.9 * sin(uTime * 2.2 + vTW.x * 0.35 + vTW.z * 0.2));
         }`,
      )
      .replace(
        '#include <aomap_fragment>',
        `float tAO = vAO;
         reflectedLight.indirectDiffuse *= tAO;
         reflectedLight.indirectSpecular *= tAO;
         reflectedLight.directDiffuse *= mix(1.0, tAO, 0.35);`,
      )
  }
  m.customProgramCacheKey = () => `terrain${nrm ? 'n' : ''}${high ? 'h' : ''}`
  return m
}

/** simpul quadtree medan: tingkat k = sel 0,5·2^k m, sisi 32·2^k m, selalu 64×64 sel */
type Node = { k: number; ci: number; cj: number; x0: number; z0: number; x1: number; z1: number; top: number; mesh: THREE.Mesh | null; used: number; kids: Node[] | null }

/** tingkat terkasar (akar): sel 4 m, sisi 256 m */
const ROOT = 3
/** simpul dipecah saat kamera lebih dekat dari SPLIT × sisinya */
const SPLIT = 0.6

export type TerrainMesh = {
  group: THREE.Group
  material: THREE.MeshStandardMaterial
  /** pilih simpul quadtree menurut jarak kamera; bangun paling banyak `budget` geometri baru */
  update(x: number, z: number, budget?: number): void
  /** jumlah geometri yang sedang ada di memori (untuk statistik) */
  built(): number
  dispose(): void
}

/**
 * Medan sebagai quadtree LOD. Setiap simpul selalu 64×64 sel, tetapi sisinya berlipat dua per tingkat:
 * 32 m (sel 0,5 m) di dekat kamera, lalu 64, 128, dan 256 m (sel 4 m) di kejauhan. Jumlah mesh yang
 * tergambar jadi hampir tetap (belasan–dua puluhan) berapa pun panjang petanya.
 * - Akar dibangun saat muat. Simpul halus dibangun bertahap (beberapa per frame), dan induknya tetap
 *   tampil sampai keempat anaknya siap, jadi tidak ada lubang.
 * - Simpul yang lama tidak dipakai dibuang supaya memori tidak menumpuk.
 * - Celah antar tingkat ditutup "skirt" yang turun di tepi tiap simpul.
 */
export function buildTerrainMesh(t: Terrain, ao: Float32Array, mat: THREE.MeshStandardMaterial, shadows: boolean, far: number): TerrainMesh {
  const group = new THREE.Group()
  group.name = 'medan'
  let live = 0
  let clock = 0
  const sea = t.m.sea ? t.m.sea.y - (t.m.sea.kind === 'awan' ? 4 : 6) : -Infinity
  const make = (k: number, ci: number, cj: number): Node | null => {
    const span = CHUNK << k
    const i0 = ci * CHUNK
    const j0 = cj * CHUNK
    if (i0 >= t.nx - 1 || j0 >= t.nz - 1) return null
    const iE = Math.min(t.nx - 1, i0 + span)
    const jE = Math.min(t.nz - 1, j0 + span)
    let top = -Infinity
    const st = Math.max(1, span >> 4)
    for (let j = j0; j <= jE; j += st) for (let i = i0; i <= iE; i += st) top = Math.max(top, t.h[j * t.nx + i])
    // seluruhnya jauh di bawah laut/awan: tidak perlu digambar
    if (top < sea) return null
    return { k, ci, cj, x0: i0 * CELL - t.hx, z0: j0 * CELL - t.hz, x1: iE * CELL - t.hx, z1: jE * CELL - t.hz, top, mesh: null, used: 0, kids: null }
  }
  const build = (n: Node) => {
    const mesh = new THREE.Mesh(chunkGeometry(t, ao, n.ci, n.cj, 1 << n.k, CHUNK << n.k), mat)
    mesh.receiveShadow = shadows
    // kotak bayangan matahari ±38 m: cukup simpul dua tingkat terhalus yang melempar bayangan
    mesh.castShadow = shadows && n.k <= 1
    mesh.visible = false
    mesh.matrixAutoUpdate = false
    group.add(mesh)
    n.mesh = mesh
    live++
  }
  const drop = (n: Node) => {
    if (n.mesh) {
      group.remove(n.mesh)
      n.mesh.geometry.dispose()
      n.mesh = null
      live--
    }
  }
  const kidsOf = (n: Node) => {
    if (!n.kids) {
      const c = 1 << (n.k - 1)
      n.kids = [make(n.k - 1, n.ci, n.cj), make(n.k - 1, n.ci + c, n.cj), make(n.k - 1, n.ci, n.cj + c), make(n.k - 1, n.ci + c, n.cj + c)].filter((q): q is Node => !!q)
    }
    return n.kids
  }
  const roots: Node[] = []
  const rootSpan = CHUNK << ROOT
  for (let cj = 0; cj * CHUNK < t.nz - 1; cj += rootSpan / CHUNK) {
    for (let ci = 0; ci * CHUNK < t.nx - 1; ci += rootSpan / CHUNK) {
      const n = make(ROOT, ci, cj)
      if (!n) continue
      build(n)
      roots.push(n)
    }
  }
  const all = () => {
    const out: Node[] = []
    const walk = (n: Node) => {
      out.push(n)
      for (const c of n.kids ?? []) walk(c)
    }
    roots.forEach(walk)
    return out
  }
  return {
    group,
    material: mat,
    update(x, z, budget = 2) {
      clock++
      const show = new Set<Node>()
      const dist = (n: Node) => Math.hypot(Math.max(n.x0 - x, 0, x - n.x1), Math.max(n.z0 - z, 0, z - n.z1))
      // pilih simpul: pecah kalau dekat; anak yang belum siap dibangun (terdekat dulu), induk tampil sementara
      const want: Node[] = []
      const visit = (n: Node) => {
        n.used = clock
        const size = (CHUNK << n.k) * CELL
        if (n.k > 0 && dist(n) < size * SPLIT * far) {
          const kids = kidsOf(n)
          if (kids.every((c) => c.mesh)) {
            kids.forEach(visit)
            return
          }
          for (const c of kids) if (!c.mesh) want.push(c)
        }
        show.add(n)
      }
      roots.forEach(visit)
      want.sort((a, b) => dist(a) - dist(b))
      for (const n of want) {
        if (budget-- <= 0) break
        build(n)
      }
      for (const n of all()) {
        if (n.mesh) n.mesh.visible = show.has(n)
        // tidak dipakai ±10 dtk (300 panggilan): buang geometrinya; akar selalu disimpan
        if (n.k < ROOT && n.mesh && !show.has(n) && clock - n.used > 300) drop(n)
      }
    },
    built: () => live,
    dispose() {
      for (const n of all()) drop(n)
    },
  }
}
