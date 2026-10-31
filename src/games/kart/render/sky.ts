import * as THREE from 'three'

export type SkyLook = {
  zenith: string
  horizon: string
  /** warna di bawah cakrawala (terlihat dari tempat tinggi) */
  below: string
  sun: string
  /** besar piringan matahari / bulan (0 = tanpa) */
  disc: number
  /** kekuatan pendar di sekitar matahari */
  halo: number
  /** banyak awan 0..1 */
  cloud: number
  cloudLit: string
  cloudDark: string
  stars: number
  /** pendar kota / kawah dari cakrawala */
  glow?: string
  /** siluet pegunungan jauh di cakrawala */
  ridge?: string
  /** tirai aurora */
  aurora?: string
}

const vert = /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`

const frag = /* glsl */ `
  uniform vec3 zenith; uniform vec3 horizon; uniform vec3 below; uniform vec3 sunCol; uniform vec3 sunDir;
  uniform float disc; uniform float halo; uniform float cloud; uniform vec3 cloudLit; uniform vec3 cloudDark;
  uniform float stars; uniform vec3 glow; uniform float hasRidge; uniform vec3 ridge; uniform float hasAurora; uniform vec3 aurora;
  varying vec3 vDir;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p){
    float a = 0.5; float s = 0.0;
    for (int k = 0; k < 6; k++) { s += a * noise(p); p = p * 2.02 + 11.0; a *= 0.5; }
    return s;
  }
  void main(){
    vec3 d = normalize(vDir);
    float up = max(d.y, 0.0);
    vec3 c = mix(horizon, zenith, pow(up, 0.55));
    c = mix(c, below, smoothstep(0.0, -0.08, d.y));
    c += glow * exp(-up * 7.0);
    float sd = max(dot(d, sunDir), 0.0);
    c += sunCol * (pow(sd, 18.0) * 0.28 * halo + pow(sd, 220.0) * 0.8 * halo);
    if (stars > 0.0 && d.y > 0.0) {
      vec2 g = vec2(atan(d.z, d.x) * 90.0, asin(d.y) * 90.0);
      vec2 cell = floor(g);
      float pick = hash(cell);
      float tw = smoothstep(0.42, 0.05, length(fract(g) - 0.5));
      c += vec3(0.9, 0.92, 1.0) * step(0.985, pick) * tw * (0.4 + hash(cell + 3.0)) * stars * smoothstep(0.02, 0.25, d.y);
    }
    if (disc > 0.0) c += sunCol * smoothstep(1.0 - disc * 0.0009, 1.0 - disc * 0.0006, sd) * 6.0;
    if (cloud > 0.0 && d.y > 0.0) {
      // awan datar di ketinggian: makin dekat cakrawala makin rapat, lalu memudar ke kabut
      vec2 p = d.xz / (d.y + 0.16) * 1.6;
      float shape = fbm(p + 3.0);
      float cover = smoothstep(0.62 - cloud * 0.3, 0.78 - cloud * 0.22, shape);
      float lit = clamp((shape - fbm(p + sunDir.xz * 0.35 + 3.0)) * 3.2 + 0.68, 0.0, 1.0);
      vec3 cc = mix(cloudDark, cloudLit, lit);
      c = mix(c, cc, cover * smoothstep(0.0, 0.1, d.y));
    }
    if (hasAurora > 0.0 && d.y > 0.0) {
      float az = atan(d.z, d.x);
      float curtain = fbm(vec2(az * 3.0, 1.0));
      float bandY = abs(d.y - 0.3 - curtain * 0.3);
      c += aurora * smoothstep(0.22, 0.0, bandY) * (0.3 + 0.7 * noise(vec2(az * 26.0, d.y * 2.0))) * 0.6;
    }
    if (hasRidge > 0.0) {
      float az = atan(d.z, d.x);
      float peak = 0.03 + fbm(vec2(az * 2.4, 4.0)) * 0.14;
      float near = 0.01 + fbm(vec2(az * 4.6, 9.0)) * 0.08;
      c = mix(c, mix(ridge, horizon, 0.45), smoothstep(peak + 0.004, peak - 0.004, d.y));
      c = mix(c, ridge, smoothstep(near + 0.004, near - 0.004, d.y));
    }
    gl_FragColor = vec4(c, 1.0);
  }`

/**
 * Langit digambar sekali ke cube map, lalu dipakai sebagai latar & pantulan: biaya per bingkai nol,
 * jadi fbm enam oktaf aman juga di HP lama.
 */
export function bakeSky(renderer: THREE.WebGLRenderer, look: SkyLook, sunDir: THREE.Vector3, size: number, hdr: boolean) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, generateMipmaps: false })
  const scene = new THREE.Scene()
  const col = (c: string) => ({ value: new THREE.Color(c) })
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      zenith: col(look.zenith),
      horizon: col(look.horizon),
      below: col(look.below),
      sunCol: col(look.sun),
      sunDir: { value: sunDir.clone().normalize() },
      disc: { value: look.disc },
      halo: { value: look.halo },
      cloud: { value: look.cloud },
      cloudLit: col(look.cloudLit),
      cloudDark: col(look.cloudDark),
      stars: { value: look.stars },
      glow: col(look.glow ?? '#000000'),
      hasRidge: { value: look.ridge ? 1 : 0 },
      ridge: col(look.ridge ?? '#000000'),
      hasAurora: { value: look.aurora ? 1 : 0 },
      aurora: col(look.aurora ?? '#000000'),
    },
  })
  const geo = new THREE.SphereGeometry(10, 32, 16)
  scene.add(new THREE.Mesh(geo, mat))
  new THREE.CubeCamera(0.1, 100, rt).update(renderer, scene)
  geo.dispose()
  mat.dispose()
  return rt
}
