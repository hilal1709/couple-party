import { hwAt, pointAt, type Track } from '../sim/track'

/** tinggi permukaan air */
export const WATER_Y = -2.6

export type GroundShape = 'pesisir' | 'kota' | 'terasering' | 'hutan' | 'ngarai' | 'marshmallow' | 'gunung' | 'kaldera'

const smooth = (a: number, b: number, x: number) => {
  const f = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return f * f * (3 - 2 * f)
}

/** indeks sampel yang berada di atas jembatan, plus titik jarangnya untuk uji jarak */
function bridgeSamples(t: Track) {
  const mask = new Uint8Array(t.n)
  const pts: [number, number][] = []
  for (const [from, to] of t.def.bridges ?? []) {
    for (let i = Math.floor(from * t.n); i < Math.ceil(to * t.n); i++) {
      mask[i % t.n] = 1
      if (i % 8 === 0) pts.push([t.px[i % t.n], t.pz[i % t.n]])
    }
  }
  return { mask, pts }
}

/** posisi landmark bukan gerbang: yang mengapung memaksa laut, sisanya memaksa darat */
const anchors = (t: Track) =>
  (t.def.landmarks ?? []).filter((l) => !l.arch).map((l) => {
    const s = l.at * t.length
    const p = pointAt(t, s, l.side * (hwAt(t, s) + l.dist))
    return { x: p.x, z: p.z, sea: Boolean(l.float) }
  }).sort((a, b) => Number(a.sea) - Number(b.sea))

/**
 * Fungsi tinggi tanah di (x, z) untuk satu lintasan: bahu jalan rata, lalu bentuk khas dunianya.
 * Semua bentuk berawal dari `off` = jarak melewati dinding, jadi tanah tidak pernah naik ke jalan.
 */
export function groundOf(t: Track, shape: GroundShape) {
  const bridge = bridgeSamples(t)
  const marks = shape === 'pesisir' || shape === 'marshmallow' || shape === 'ngarai' ? anchors(t) : []
  return (x: number, z: number): number => {
    if (shape === 'kota') return -0.15
    let bd = Infinity
    let by = 0
    let at = 0
    for (let i = 0; i < t.n; i += 3) {
      const dd = (t.px[i] - x) ** 2 + (t.pz[i] - z) ** 2
      if (dd < bd) {
        bd = dd
        by = t.py[i]
        at = i
      }
    }
    const dist = Math.sqrt(bd)
    const base = by - 0.15
    if (shape === 'kaldera') {
      // danau lava selebar kawah, lalu dinding kawah melingkar di kejauhan
      const off = Math.max(0, dist - (t.hw[at] + 3))
      return base - Math.min(off, 1.5) * 4 + smooth(170, 460, off) * (70 + 26 * Math.sin(x * 0.009) * Math.cos(z * 0.011))
    }
    const off = Math.max(0, dist - (t.wall[at] + 1))
    /** seberapa darat titik ini setelah landmark ikut menentukan */
    const anchored = (start: number, reach = 110) => {
      let land = start
      for (const m of marks) {
        const near = 1 - smooth(40, reach, Math.hypot(m.x - x, m.z - z))
        land = m.sea ? land * (1 - near) : land + (1 - land) * near
      }
      return land
    }
    switch (shape) {
      case 'pesisir': {
        let bay = Infinity
        for (const [bx, bz] of bridge.pts) bay = Math.min(bay, (bx - x) ** 2 + (bz - z) ** 2)
        const n = Math.sin(x * 0.0043 + 1.3) * Math.cos(z * 0.0037 - 0.6) + 0.5 * Math.sin(x * 0.009 + z * 0.007)
        const land = anchored(smooth(-0.15, 0.45, n) * smooth(60, 260, Math.sqrt(bay)))
        const beach = -Math.min(off * 0.07, 9)
        const dune = Math.min(off * 0.05, 1) * (3.2 + 2.6 * Math.sin(x * 0.031 + 2 * Math.sin(z * 0.017)) * Math.cos(z * 0.023))
        return base + beach + (dune - beach) * land - (bridge.mask[at] ? 4.6 : 0)
      }
      case 'marshmallow': {
        // gundukan empuk, sungai cokelat di sela-selanya
        const n = Math.sin(x * 0.0052 + 0.4) * Math.cos(z * 0.0047 + 1.1) + 0.4 * Math.sin(x * 0.011 - z * 0.009)
        const land = anchored(smooth(-0.35, 0.15, n))
        const river = -Math.min(off * 0.08, 8)
        const puff = Math.abs(Math.sin(x * 0.017 + 0.6) * Math.cos(z * 0.019))
        const dome = Math.min(off * 0.1, 1) * (3 + 19 * Math.sqrt(puff))
        return base + river + (dome - river) * land
      }
      case 'terasering': {
        // lereng berundak: ketinggian dibulatkan ke undakan, tepinya curam
        const v = 26 * Math.min(off / 90, 1) * (1.15 + Math.sin(x * 0.0061 + 0.9) * Math.cos(z * 0.0073 - 0.4))
        const S = 3.2
        const c = Math.floor(v / S)
        return base + (c + smooth(0.72, 1, v / S - c)) * S
      }
      case 'hutan':
        return base + Math.min(off * 0.1, 1) * (Math.sin(x * 0.009) * Math.cos(z * 0.011) * 12 + 10 + Math.sin(x * 0.027 + z * 0.019) * 5)
      case 'ngarai': {
        // mesa bertepi curam di atas gurun bergelombang
        const n = Math.sin(x * 0.0071 + 0.7) * Math.cos(z * 0.0059) + 0.6 * Math.sin(x * 0.015 - z * 0.012)
        const mesa = (1 - anchored(0, 95)) * smooth(0.3, 0.42, n) * Math.min(off / 26, 1)
        const dune = Math.min(off * 0.05, 1) * (2.4 + 2 * Math.sin(x * 0.024 + Math.sin(z * 0.013) * 2))
        return base + dune + mesa * (44 + 16 * Math.sin(x * 0.013) * Math.cos(z * 0.016))
      }
      case 'gunung': {
        // punggung gunung tajam mengapit jalan
        const r = 1 - Math.abs(Math.sin(x * 0.0064 + Math.sin(z * 0.0043) * 1.6))
        const r2 = 1 - Math.abs(Math.sin(z * 0.0105 + x * 0.0047))
        return base + Math.min(off / 70, 1) * (14 + r * r * 150 + r2 * r2 * 56) + Math.min(off * 0.1, 3)
      }
    }
  }
}
