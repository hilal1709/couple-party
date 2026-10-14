// Generator animasi Lottie buatan sendiri (bukan unduhan): confetti, ledakan, loader & efek Ular Tangga.
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

// ---------- loader & efek Ular Tangga ----------
const ring = (size, hex, w) => [{ ty: 'el', p: st([0, 0]), s: st([size, size]) }, stroke(hex, w)]
const star = (outer, inner, pts, color) => [
  { ty: 'sr', sy: 1, p: st([0, 0]), or: st(outer), ir: st(inner), os: st(0), is: st(0), r: st(0), pt: st(pts) },
  fill(color),
  stroke('#121212', 3),
]
const fade = (from, to, op) =>
  anim([
    [0, [100]],
    [from, [100]],
    [to, [0]],
    [op - 1, [0]],
  ])
const slabRect = (w, h, color) => [{ ty: 'rc', p: st([0, 0]), s: st([w, h]), r: st(0) }, fill(color), ...(color === '#121212' ? [] : [stroke('#121212', 4)])]

// Loader: tiga bentuk Memphis melompat bergantian di atas balok terrazzo (loop mulus)
function loader() {
  const W = 240
  const H = 170
  const OP = 96
  const baseY = 100
  const layers = []
  const items = [
    ['circle', '#ff37a6', 56, 0],
    ['tri', '#5cf64a', 120, 120],
    ['rect', '#87e752', 184, 180],
  ]
  items.forEach(([kind, color, x, turn], i) => {
    const t0 = i * 18
    const up = t0 + 14
    const land = t0 + 28
    layers.push(
      layer(
        i + 1,
        shape(kind, 34, color),
        {
          p: anim([
            [0, [x, baseY, 0]],
            [t0, [x, baseY, 0]],
            [up, [x, baseY - 50, 0]],
            [land, [x, baseY, 0]],
            [OP - 1, [x, baseY, 0]],
          ]),
          s: anim([
            [0, [100, 100, 100]],
            [t0, [118, 84, 100]],
            [t0 + 5, [90, 112, 100]],
            [up, [100, 100, 100]],
            [land, [122, 80, 100]],
            [land + 7, [100, 100, 100]],
            [OP - 1, [100, 100, 100]],
          ]),
          r: anim([
            [0, [0]],
            [t0, [0]],
            [land, [turn]],
            [OP - 1, [turn]],
          ]),
        },
        OP,
      ),
    )
  })
  // balok terrazzo: serpihan warna di atas badan paper, lalu bayangan keras
  const chips = [
    [-80, -4, '#ff37a6'],
    [-30, 6, '#43b929'],
    [22, -6, '#121212'],
    [70, 5, '#5cf64a'],
  ].map(([cx, cy, c]) => ({ ty: 'gr', nm: 'chip', it: [{ ty: 'el', p: st([cx, cy]), s: st([9, 7]) }, fill(c), tr()] }))
  const slab = layer(10, slabRect(206, 30, '#fff4fa'), { p: st([W / 2, baseY + 36, 0]), sk: st(-8), sa: st(0) }, OP)
  slab.shapes = [...chips, ...slab.shapes]
  layers.push(slab)
  layers.push(layer(11, slabRect(206, 30, '#121212'), { p: st([W / 2 + 5, baseY + 42, 0]), sk: st(-8), sa: st(0) }, OP))
  return doc('loader', W, H, OP, layers)
}

// Dadu mendarat: debu & bentuk terpental ke samping
function diceRoll() {
  const S = 300
  const OP = 48
  const layers = []
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1
    const dx = side * (50 + rand() * 90)
    const dy = -20 - rand() * 60
    layers.push(
      layer(
        i + 1,
        shape(pick(['circle', 'circle', 'tri', 'rect']), 10 + rand() * 12, PALETTE[i % 5]),
        {
          p: anim([
            [0, [S / 2, S * 0.62, 0]],
            [26, [S / 2 + dx, S * 0.62 + dy, 0]],
          ]),
          s: anim([
            [0, [40, 40, 100]],
            [10, [110, 110, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
          r: anim([
            [0, [0]],
            [OP - 1, [side * 200]],
          ]),
        },
        OP,
      ),
    )
  }
  layers.push(
    layer(
      20,
      ring(60, '#121212', 4),
      {
        p: st([S / 2, S * 0.62, 0]),
        s: anim([
          [0, [20, 8, 100]],
          [30, [300, 110, 100]],
        ]),
        o: fade(8, 30, OP),
      },
      OP,
    ),
  )
  return doc('dice-roll', S, S, OP, layers)
}

// Naik tangga: bintang & panah melesat ke atas
function ladderUp() {
  const W = 220
  const H = 320
  const OP = 66
  const layers = []
  for (let i = 0; i < 9; i++) {
    const x = 30 + rand() * (W - 60)
    const d = Math.floor(rand() * 18)
    layers.push(
      layer(
        i + 1,
        star(12 + rand() * 8, 5, 5, pick(['#5cf64a', '#87e752', '#ff37a6', '#ffcc1f'])),
        {
          p: anim([
            [d, [x, H - 30, 0]],
            [d + 40, [x + (rand() - 0.5) * 40, 30 + rand() * 50, 0]],
          ]),
          r: anim([
            [d, [0]],
            [d + 40, [180]],
          ]),
          s: anim([
            [0, [0, 0, 100]],
            [d, [0, 0, 100]],
            [d + 8, [120, 120, 100]],
            [d + 30, [100, 100, 100]],
            [d + 46, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  const arrow = {
    ty: 'sh',
    ks: st({
      c: true,
      v: [[0, -40], [30, -6], [12, -6], [12, 40], [-12, 40], [-12, -6], [-30, -6]],
      i: Array.from({ length: 7 }, () => [0, 0]),
      o: Array.from({ length: 7 }, () => [0, 0]),
    }),
  }
  layers.push(
    layer(
      30,
      [arrow, fill('#5cf64a'), stroke('#121212', 5)],
      {
        p: anim([
          [0, [W / 2, H - 40, 0]],
          [36, [W / 2, 70, 0]],
        ]),
        s: anim([
          [0, [40, 40, 100]],
          [12, [115, 115, 100]],
          [36, [100, 100, 100]],
          [OP - 1, [60, 60, 100]],
        ]),
        o: fade(40, OP - 2, OP),
      },
      OP,
    ),
  )
  return doc('ladder-up', W, H, OP, layers)
}

// Digigit ular: ledakan bergerigi + pecahan zigzag
function snakeBite() {
  const S = 300
  const OP = 54
  const c = S / 2
  const layers = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    layers.push(
      layer(
        i + 1,
        shape('squiggle', 14, i % 2 ? '#ff37a6' : '#121212'),
        {
          p: anim([
            [4, [c, c, 0]],
            [30, [c + Math.cos(a) * 120, c + Math.sin(a) * 120, 0]],
          ]),
          r: st((a * 180) / Math.PI),
          s: anim([
            [0, [0, 0, 100]],
            [6, [100, 100, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  layers.push(
    layer(
      20,
      star(96, 52, 9, '#ff37a6'),
      {
        p: st([c, c, 0]),
        r: anim([
          [0, [-25]],
          [OP - 1, [10]],
        ]),
        s: anim([
          [0, [0, 0, 100]],
          [8, [115, 115, 100]],
          [14, [92, 92, 100]],
          [34, [100, 100, 100]],
          [OP - 1, [0, 0, 100]],
        ]),
      },
      OP,
    ),
  )
  return doc('snake-bite', S, S, OP, layers)
}

// Dapat item: cincin melebar + bentuk terlempar
function itemPop() {
  const S = 300
  const OP = 56
  const c = S / 2
  const layers = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const dist = 80 + rand() * 40
    const ex = c + Math.cos(a) * dist
    const ey = c + Math.sin(a) * dist
    layers.push(
      layer(
        i + 1,
        shape(pick(['circle', 'tri', 'rect', 'squiggle']), 12 + rand() * 8, PALETTE[i % 5]),
        {
          p: anim([
            [0, [c, c, 0]],
            [28, [ex, ey - 20, 0]],
            [OP - 1, [ex, ey + 30, 0]],
          ]),
          r: anim([
            [0, [0]],
            [OP - 1, [(rand() - 0.5) * 400]],
          ]),
          s: anim([
            [0, [30, 30, 100]],
            [12, [110, 110, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  layers.push(
    layer(
      20,
      ring(80, '#5cf64a', 8),
      {
        p: st([c, c, 0]),
        s: anim([
          [0, [10, 10, 100]],
          [26, [240, 240, 100]],
        ]),
        o: fade(10, 28, OP),
      },
      OP,
    ),
  )
  return doc('item-pop', S, S, OP, layers)
}

// Kartu tantangan muncul: kilau garis memancar
function cardPop() {
  const S = 300
  const OP = 40
  const c = S / 2
  const layers = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const v = (r) => [Math.cos(a) * r, Math.sin(a) * r]
    layers.push(
      layer(
        i + 1,
        [{ ty: 'sh', ks: st({ c: false, v: [v(20), v(46)], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]] }) }, stroke(i % 2 ? '#ff37a6' : '#121212', 7)],
        {
          p: st([c, c, 0]),
          s: anim([
            [0, [100, 100, 100]],
            [22, [300, 300, 100]],
          ]),
          o: fade(10, 30, OP),
        },
        OP,
      ),
    )
  }
  return doc('card-pop', S, S, OP, layers)
}

mkdirSync('src/assets/lottie', { recursive: true })
// urutan penting: confetti & burst duluan supaya hasil acaknya tetap sama seperti sebelumnya
const out = {
  confetti: confetti(),
  burst: burst(),
  loader: loader(),
  'dice-roll': diceRoll(),
  'ladder-up': ladderUp(),
  'snake-bite': snakeBite(),
  'item-pop': itemPop(),
  'card-pop': cardPop(),
}
for (const [name, json] of Object.entries(out)) writeFileSync(`src/assets/lottie/${name}.json`, JSON.stringify(json))
console.log('Lottie dibuat:', Object.keys(out).join(', '))
