import * as THREE from 'three'
import type { Clock } from '@/games/sport/render/shaders'
import { gradAt, heightAt, type Terrain } from '../sim/terrain'
import { loadTex } from './textures'

/** peta tinggi medan sebagai tekstur: air memakainya untuk warna kedalaman & buih pantai */
export function heightTexture(t: Terrain) {
  const tex = new THREE.DataTexture(t.h, t.nx, t.nz, THREE.RedFormat, THREE.FloatType)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

/**
 * Laut: dua lapis normal bergerak, warna dangkal→dalam dari kedalaman medan, buih di garis pantai,
 * pantulan langit HDR dari material standar (fresnel bawaan).
 */
export async function water(t: Terrain, y: number, hTex: THREE.DataTexture, clock: Clock, size: number) {
  const n = await loadTex('air_n.webp', false)
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.06, metalness: 0, transparent: true, envMapIntensity: 1.2 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uClock = clock
    sh.uniforms.uH = { value: hTex }
    sh.uniforms.uN = { value: n }
    sh.uniforms.uHalf = { value: new THREE.Vector2(t.hx, t.hz) }
    sh.uniforms.uSize = { value: new THREE.Vector2(t.sx, t.sz) }
    sh.uniforms.uSea = { value: y }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uClock; uniform sampler2D uH; uniform sampler2D uN; uniform vec2 uHalf; uniform vec2 uSize; uniform float uSea;
         varying vec3 vWW;
         float wDepth(){ vec2 q = (vWW.xz + uHalf) / uSize; if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return 30.0; return uSea - texture2D(uH, q).r; }`,
      )
      .replace(
        '#include <map_fragment>',
        `float dep = wDepth();
         float shallow = exp(-max(dep, 0.0) * 0.35);
         vec3 deepC = vec3(0.02, 0.17, 0.32); vec3 shoreC = vec3(0.12, 0.62, 0.66);
         float foamN = texture2D(uN, vWW.xz * 0.07 + vec2(uClock * 0.02, 0.0)).b;
         float foam = smoothstep(0.9, 0.2, dep + (foamN - 0.5) * 0.8 + sin(uClock * 1.4 + vWW.x * 0.3) * 0.12) * step(0.0, dep + 0.2);
         diffuseColor.rgb = mix(deepC, shoreC, shallow) + foam * 0.8;
         diffuseColor.a = clamp(0.55 + (1.0 - shallow) * 0.45 + foam, 0.0, 1.0) * smoothstep(-0.15, 0.25, dep);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
           vec2 q = vWW.xz * 0.045;
           vec3 a = texture2D(uN, q + vec2(uClock * 0.013, uClock * 0.008)).xyz * 2.0 - 1.0;
           vec3 b = texture2D(uN, q * 2.3 - vec2(uClock * 0.019, -uClock * 0.011)).xyz * 2.0 - 1.0;
           vec2 s = (a.xy + b.xy) * 0.35;
           vec3 wN = normalize(vec3(s.x, 1.0, s.y));
           normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);
         }`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness + foam * 0.5;')
  }
  m.customProgramCacheKey = () => 'puncak-water'
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2), m)
  mesh.position.y = y
  mesh.renderOrder = 1
  return mesh
}

/** lava: menyala, retakan gelap bergerak lambat, ikut bloom */
export async function lava(y: number, size: number, clock: Clock, x = 0, z = 0, circle = false) {
  const noise = await loadTex('awan.webp', false)
  const m = new THREE.MeshStandardMaterial({ color: '#2a0a04', emissive: '#ff4a10', emissiveIntensity: 3, roughness: 0.6 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uClock = clock
    sh.uniforms.uNz = { value: noise }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uClock; uniform sampler2D uNz; varying vec3 vLW;')
      .replace(
        '#include <emissivemap_fragment>',
        `{
           vec2 q = vLW.xz * 0.03;
           float a = texture2D(uNz, q + vec2(uClock * 0.006, uClock * 0.004)).r;
           float b = texture2D(uNz, q * 2.7 - vec2(uClock * 0.01, 0.0)).g;
           float crust = smoothstep(0.45, 0.62, a * 0.6 + b * 0.4);
           totalEmissiveRadiance *= mix(1.4, 0.06, crust) * (0.85 + 0.15 * sin(uClock * 2.0 + vLW.x * 0.2));
           diffuseColor.rgb = mix(vec3(0.6, 0.15, 0.02), vec3(0.06, 0.03, 0.03), crust);
         }`,
      )
  }
  m.customProgramCacheKey = () => 'puncak-lava'
  const geo = circle ? new THREE.CircleGeometry(size, 48) : new THREE.PlaneGeometry(size, size)
  const mesh = new THREE.Mesh(geo.rotateX(-Math.PI / 2), m)
  mesh.position.set(x, y, z)
  return mesh
}

/** lautan awan / kabut lembah: dua lapis noise bergerak, tepi lembut */
export async function clouds(y: number, size: number, color: string, clock: Clock, opacity = 1, scale = 0.012, ground?: { tex: THREE.DataTexture; half: THREE.Vector2; size: THREE.Vector2 }) {
  const noise = await loadTex('awan.webp', false)
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uClock: { value: 0 }, uNz: { value: noise }, uColor: { value: new THREE.Color(color) }, uOp: { value: opacity }, uScale: { value: scale }, uH: { value: null }, uHalf: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uY: { value: y }, uSoft: { value: ground ? 1 : 0 } }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec3 vCW;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vCW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float uClock; uniform sampler2D uNz; uniform vec3 uColor; uniform float uOp; uniform float uScale;
      uniform sampler2D uH; uniform vec2 uHalf; uniform vec2 uSize; uniform float uY; uniform float uSoft;
      varying vec3 vCW;
      void main(){
        vec2 q = vCW.xz * uScale;
        float a = texture2D(uNz, q + vec2(uClock * 0.004, uClock * 0.002)).r;
        float b = texture2D(uNz, q * 2.1 - vec2(uClock * 0.006, 0.0)).g;
        float d = a * 0.65 + b * 0.35;
        float alpha = smoothstep(0.28, 0.7, d) * uOp;
        // tepi lembut di tempat kabut memotong medan (tidak ada garis keras di tebing)
        if (uSoft > 0.5) {
          vec2 q2 = (vCW.xz + uHalf) / uSize;
          if (q2.x > 0.0 && q2.y > 0.0 && q2.x < 1.0 && q2.y < 1.0) alpha *= smoothstep(0.0, 5.0, uY - texture2D(uH, q2).r);
        }
        vec3 c = uColor * (0.82 + d * 0.3);
        gl_FragColor = vec4(c, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  })
  m.uniforms.uClock = clock
  if (ground) {
    m.uniforms.uH.value = ground.tex
    m.uniforms.uHalf.value = ground.half
    m.uniforms.uSize.value = ground.size
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), m)
  mesh.position.y = y
  mesh.renderOrder = 2
  return mesh
}

/**
 * Air terjun menuruni wajah tebing: pita mengikuti permukaan medan dari bibir ke kaki,
 * tekstur bergaris meluncur ke bawah, buih di dasar.
 */
export async function waterfall(t: Terrain, x: number, z: number, dirX: number, dirZ: number, width: number, clock: Clock) {
  const noise = await loadTex('awan.webp', false)
  const rows = 26
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const sx = -dirZ
  const sz = dirX
  for (let r = 0; r <= rows; r++) {
    // jalan keluar dari bibir menuruni lereng
    const d = (r / rows) * 7
    const px = x + dirX * d
    const pz = z + dirZ * d
    const [gx, gz] = gradAt(t, px, pz)
    const gl = Math.hypot(gx, gz) || 1
    const off = 0.35
    for (let c = 0; c <= 1; c++) {
      const s = (c - 0.5) * width
      const qx = px + sx * s
      const qz = pz + sz * s
      pos.push(qx + (-gx / gl) * off, heightAt(t, qx, qz) + 0.15, qz + (-gz / gl) * off)
      uv.push(c, r / rows)
    }
  }
  for (let r = 0; r < rows; r++) {
    const a = r * 2
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uClock: clock, uNz: { value: noise } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uClock; uniform sampler2D uNz; varying vec2 vUv;
      void main(){
        float s = texture2D(uNz, vec2(vUv.x * 0.6, vUv.y * 0.35 - uClock * 0.55)).r;
        float t = texture2D(uNz, vec2(vUv.x * 1.3 + 0.3, vUv.y * 0.8 - uClock * 0.9)).g;
        float streak = smoothstep(0.35, 0.75, s * 0.6 + t * 0.4);
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        vec3 c = mix(vec3(0.55, 0.8, 0.9), vec3(1.0), streak);
        gl_FragColor = vec4(c, (0.45 + streak * 0.5) * edge);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(g, m)
  mesh.renderOrder = 3
  return mesh
}
