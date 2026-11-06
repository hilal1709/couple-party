import * as THREE from 'three'

/** jam bersama semua shader dunia Dapur Kacau (detik) */
export const worldTime = { value: 0 }

function extend(m: THREE.Material, tag: string, fn: (sh: THREE.WebGLProgramParametersWithUniforms) => void) {
  if (m.userData[`fx_${tag}`]) return
  m.userData[`fx_${tag}`] = true
  const prev = m.onBeforeCompile
  const prevKey = m.customProgramCacheKey.call(m)
  m.onBeforeCompile = function (sh, r) {
    prev.call(this, sh, r)
    fn(sh)
  }
  m.customProgramCacheKey = () => `${prevKey}|${tag}`
  m.needsUpdate = true
}

/** air kolam/laut: permukaan naik-turun pelan, kilau riak bergeser, tepi terang menurut sudut pandang */
export function waterShader(m: THREE.Material, wave = 0.06) {
  extend(m, 'air', (sh) => {
    sh.uniforms.uTime = worldTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWorldW;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vec4 wq = modelMatrix * vec4(position, 1.0);
        transformed.y += (sin(wq.x * 0.9 + uTime * 1.3) + sin(wq.z * 1.3 - uTime * 1.1)) * ${wave.toFixed(3)};
        vWorldW = wq.xyz;`,
      )
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWorldW;').replace(
      '#include <dithering_fragment>',
      /* glsl */ `float r1 = sin(vWorldW.x * 2.6 + uTime * 1.6) * sin(vWorldW.z * 3.1 - uTime * 1.2);
      float r2 = sin(vWorldW.x * 6.3 - vWorldW.z * 4.7 + uTime * 2.4);
      float glint = smoothstep(0.55, 1.0, r1 * 0.6 + r2 * 0.4);
      gl_FragColor.rgb += vec3(0.55, 0.7, 0.75) * glint * 0.35;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.82, smoothstep(-1.0, 1.0, r1) * 0.35);
      #include <dithering_fragment>`,
    )
  })
}

/** lava: tekstur mengalir searah sumbu x dan berdenyut terang */
export function lavaShader(m: THREE.MeshStandardMaterial) {
  extend(m, 'lava', (sh) => {
    sh.uniforms.uTime = worldTime
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
      totalEmissiveRadiance *= 0.8 + 0.35 * sin(uTime * 1.7 + vEmissiveMapUv.x * 9.0) * sin(uTime * 0.9 + vEmissiveMapUv.y * 7.0);`)
  })
  if (m.emissiveMap) {
    m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping
    m.userData.flow = true
  }
}

/** daun & tajuk: makin tinggi makin goyang, kibasan kecil cepat */
export function leafShader(m: THREE.Material) {
  extend(m, 'daun', (sh) => {
    sh.uniforms.uTime = worldTime
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      vec4 wl = modelMatrix * vec4(position, 1.0);
      float amp = smoothstep(0.6, 4.0, wl.y) * 0.07 + 0.01;
      float flut = sin(uTime * 6.0 + wl.x * 3.1 + wl.y * 2.3 + wl.z * 2.7) * 0.01;
      transformed += vec3(1.0, 0.1, 0.6) * sin(uTime * 1.6 + wl.x * 0.7 + wl.z * 0.5) * amp + vec3(flut, flut * 0.6, flut);`,
    )
  })
}

/** kain jemuran: amplitudo per titik dari UV kedua Blender (`sway`) */
export function clothShader(m: THREE.Material) {
  extend(m, 'kain', (sh) => {
    sh.uniforms.uTime = worldTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute vec2 sway;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        float wave = sin(uTime * 2.3 + position.x * 1.4 + position.z * 1.1) + 0.5 * sin(uTime * 5.1 + position.z * 3.0);
        transformed += vec3(0.55, 0.0, 0.8) * wave * sway.x * 0.5;`,
      )
  })
}
