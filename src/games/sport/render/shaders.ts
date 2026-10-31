import * as THREE from 'three'

/** Jam bersama semua shader adegan; dimajukan sekali per gambar. */
export const makeClock = () => ({ value: 0 })
export type Clock = ReturnType<typeof makeClock>

type Patch = (sh: { vertexShader: string; fragmentShader: string; uniforms: Record<string, THREE.IUniform> }) => void

/** Beberapa tambalan bisa ditumpuk pada satu material. */
function patch(m: THREE.Material, key: string, p: Patch) {
  const prev = m.onBeforeCompile
  const prevKey = m.customProgramCacheKey()
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r)
    p(sh)
  }
  m.customProgramCacheKey = () => `${prevKey}|${key}`
  m.needsUpdate = true
}

const NOISE = `
  float sportHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sportNoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sportHash(i), sportHash(i + vec2(1, 0)), f.x), mix(sportHash(i + vec2(0, 1)), sportHash(i + vec2(1, 1)), f.x), f.y);
  }`

/**
 * Angin pada daun, rumput, bendera. Makin jauh dari pangkal makin besar gerakannya; `height` = tinggi
 * model. Fase diambil dari posisi dunia supaya tiap pohon bergerak sendiri.
 */
export function addWind(m: THREE.Material, clock: Clock, opts: { strength?: number; height?: number } = {}) {
  const s = (opts.strength ?? 0.12).toFixed(3)
  const h = (opts.height ?? 6).toFixed(2)
  patch(m, `wind${s}${h}`, (sh) => {
    sh.uniforms.uClock = clock
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uClock;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       {
         vec4 wp = modelMatrix * vec4(position, 1.0);
         #ifdef USE_INSTANCING
           wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
         #endif
         float k = clamp(position.y / ${h}, 0.0, 1.0);
         float gust = sin(uClock * 0.7 + wp.x * 0.13) * 0.5 + 0.5;
         float ph = uClock * 2.3 + wp.x * 0.7 + wp.z * 0.5;
         transformed.x += sin(ph) * ${s} * k * k * (0.6 + gust);
         transformed.z += cos(ph * 0.8) * ${s} * 0.6 * k * k * (0.6 + gust);
       }`,
    )
  })
}

/**
 * Variasi besar pada permukaan luas: noise di ruang dunia mematahkan pola tekstur yang berulang.
 * `wear` (opsional) memudarkan warna di sekitar garis pemain, seperti lapangan yang sering diinjak.
 */
export function addVariation(m: THREE.Material, opts: { scale?: number; amount?: number; wear?: { z: number; halfX: number; halfZ: number } } = {}) {
  const scale = (opts.scale ?? 0.18).toFixed(3)
  const amount = (opts.amount ?? 0.22).toFixed(3)
  const w = opts.wear
  patch(m, `var${scale}${amount}${w ? `${w.z}${w.halfX}${w.halfZ}` : ''}`, (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSportWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSportWorld = (modelMatrix * vec4(position, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSportWorld;\n${NOISE}`).replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       {
         vec2 q = vSportWorld.xz * ${scale};
         float n = sportNoise(q) * 0.6 + sportNoise(q * 3.1) * 0.3 + sportNoise(q * 9.0) * 0.1;
         diffuseColor.rgb *= 1.0 + (n - 0.5) * ${amount} * 2.0;
         ${
           w
             ? `float dx = abs(vSportWorld.x) / ${w.halfX.toFixed(2)};
                float dz = (abs(vSportWorld.z) - ${w.z.toFixed(2)}) / ${w.halfZ.toFixed(2)};
                float worn = exp(-(dx * dx + dz * dz)) * (0.6 + n * 0.6);
                diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.18, 1.1, 0.92), clamp(worn, 0.0, 0.7));`
             : ''
         }
       }`,
    )
  })
}

/** Garis potongan rumput stadion: pita terang-gelap di ruang dunia. */
export function addStripes(m: THREE.Material, width: number) {
  patch(m, `stripes${width}`, (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStripeWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStripeWorld = (modelMatrix * vec4(position, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStripeWorld;')
      .replace('#include <map_fragment>', `#include <map_fragment>\ndiffuseColor.rgb *= mod(floor(vStripeWorld.z / ${width.toFixed(2)}), 2.0) < 1.0 ? 1.0 : 0.7;`)
  })
}

/** Cahaya tepi halus: karakter terpisah dari latar, seperti lampu belakang studio. */
export function addRim(m: THREE.Material, color: string, amount = 0.35) {
  const c = new THREE.Color(color)
  patch(m, `rim${color}${amount}`, (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rimK = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
       outgoingLight += vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)}) * rimK * ${amount.toFixed(3)};
       #include <opaque_fragment>`,
    )
  })
}

/** Denyut halus pada lampu neon. */
export function addPulse(m: THREE.MeshStandardMaterial, clock: Clock) {
  patch(m, 'pulse', (sh) => {
    sh.uniforms.uClock = clock
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uClock;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 0.86 + 0.14 * sin(uClock * 3.0 + vViewPosition.x * 0.4);`)
  })
}
