// Generator animasi Lottie buatan sendiri (bukan unduhan): confetti & ledakan bentuk Memphis.
// Jalankan: node scripts/lottie.mjs  → src/assets/lottie/*.json
import { mkdirSync, writeFileSync } from 'node:fs'

const PALETTE = ['#5cf64a', '#87e752', '#43b929', '#ffcae9', '#ff37a6', '#121212']
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1)

let seed = 20261014
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

const st = (v) => ({ a: 0, k: v })
const ease = { i: { x: [0.25], y: [1] }, o: { x: [0.6], y: [0] } }
const anim = (frames) => ({
  a: 1,
  k: frames.map(([t, s], i) => (i < frames.length - 1 ? { t, s, ...ease } : { t, s })),
})

const fill = (hex) => ({ ty: 'fl', c: st(rgb(hex)), o: st(100), r: 1 })
const stroke = (hex, w) => ({ ty: 'st', c: st(rgb(hex)), o: st(100), w: st(w), lc: 2, lj: 2 })
const tr = () => ({ ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100) })

function shape(kind, size, color) {
  const ink = '#121212'
  switch (kind) {
    case 'circle':
      return [{ ty: 'el', p: st([0, 0]), s: st([size, size]) }, fill(color), stroke(ink, 2.5)]
    case 'tri':
      return [{ ty: 'sr', sy: 2, p: st([0, 0]), or: st(size * 0.62), os: st(0), r: st(0), pt: st(3) }, fill(color), stroke(ink, 2.5)]
    case 'rect':
      return [{ ty: 'rc', p: st([0, 0]), s: st([size * 1.3, size * 0.7]), r: st(0) }, fill(color), stroke(ink, 2.5)]
    case 'squiggle': {
      const h = size / 2
      return [
        {
          ty: 'sh',
          ks: st({
            c: false,
            v: [[-size, 0], [-h, 0], [0, 0], [h, 0], [size, 0]],
            i: [[0, 0], [-h / 2, -h], [-h / 2, h], [-h / 2, -h], [-h / 2, h]],
            o: [[h / 2, -h], [h / 2, h], [h / 2, -h], [h / 2, h], [0, 0]],
          }),
        },
        stroke(color === '#ffcae9' ? ink : color, 4),
      ]
    }
  }
}

function layer(ind, items, ks, op) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: `p${ind}`,
    sr: 1,
    ks: { o: st(100), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks },
    ao: 0,
    shapes: [{ ty: 'gr', it: [...items, tr()], nm: 'g' }],
    ip: 0,
    op,
    st: 0,
    bm: 0,
  }
}

const doc = (nm, w, h, op, layers) => ({ v: '5.7.4', fr: 60, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers })

// Confetti: bentuk Memphis jatuh berputar dari atas layar
function confetti() {
  const W = 400
  const H = 720
  const OP = 170
  const layers = []
  for (let i = 0; i < 46; i++) {
    const kind = pick(['circle', 'tri', 'rect', 'squiggle', 'tri', 'circle'])
    const color = pick(PALETTE.slice(0, 5))
    const size = 10 + rand() * 14
    const x0 = rand() * W
    const delay = Math.floor(rand() * 40)
    const drift = (rand() - 0.5) * 140
    const end = delay + 100 + Math.floor(rand() * 30)
    const spin = (rand() > 0.5 ? 1 : -1) * (240 + rand() * 360)
    layers.push(
      layer(
        i + 1,
        shape(kind, size, color),
        {
          p: anim([
            [delay, [x0, -30 - rand() * 60, 0]],
            [end, [x0 + drift, H + 40, 0]],
          ]),
          r: anim([
            [delay, [0]],
            [end, [spin]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('confetti', W, H, OP, layers)
}

// Ledakan UNO!: bentuk terlempar keluar dari tengah lalu menghilang
function burst() {
  const S = 320
  const OP = 70
  const c = S / 2
  const layers = []
  const n = 18
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.3
    const dist = 95 + rand() * 50
    const kind = pick(['circle', 'tri', 'rect', 'squiggle'])
    layers.push(
      layer(
        i + 1,
        shape(kind, 14 + rand() * 10, PALETTE[i % 5]),
        {
          p: anim([
            [0, [c, c, 0]],
            [34, [c + Math.cos(a) * dist, c + Math.sin(a) * dist, 0]],
          ]),
          r: anim([
            [0, [0]],
            [44, [(rand() - 0.5) * 300]],
          ]),
          s: anim([
            [0, [30, 30, 100]],
            [16, [110, 110, 100]],
            [50, [100, 100, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  // bintang pecah di belakang teks
  layers.push(
    layer(
      n + 1,
      [{ ty: 'sr', sy: 1, p: st([0, 0]), or: st(110), ir: st(70), os: st(0), is: st(0), r: st(0), pt: st(12) }, fill('#5cf64a'), stroke('#121212', 5)],
      {
        p: st([c, c, 0]),
        r: anim([
          [0, [-20]],
          [OP - 1, [12]],
        ]),
        s: anim([
          [0, [0, 0, 100]],
          [12, [108, 108, 100]],
          [20, [96, 96, 100]],
          [50, [100, 100, 100]],
          [OP - 1, [0, 0, 100]],
        ]),
      },
      OP,
    ),
  )
  return doc('uno-burst', S, S, OP, layers)
}

mkdirSync('src/assets/lottie', { recursive: true })
writeFileSync('src/assets/lottie/confetti.json', JSON.stringify(confetti()))
writeFileSync('src/assets/lottie/burst.json', JSON.stringify(burst()))
console.log('Lottie dibuat: src/assets/lottie/confetti.json, burst.json')
