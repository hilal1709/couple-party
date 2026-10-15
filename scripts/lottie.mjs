// Generator animasi Lottie buatan sendiri (bukan unduhan): confetti, ledakan, loader, efek Ular Tangga, Tebak Gambar, Kartu Remi, Domino & Monopoli.
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

// ---------- efek Tebak Gambar ----------
const poly = (pts, closed = true) => ({
  ty: 'sh',
  ks: st({ c: closed, v: pts, i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]) }),
})
/** garis yang "tergambar" dari awal ke akhir (trim path) */
const trim = (t0, t1) => ({
  ty: 'tm',
  s: st(0),
  e: anim([
    [0, [0]],
    [t0, [0]],
    [t1, [100]],
  ]),
  o: st(0),
  m: 1,
})
const popScale = (inAt, outFrom, op) =>
  anim([
    [0, [0, 0, 100]],
    [inAt, [0, 0, 100]],
    [inAt + 8, [115, 115, 100]],
    [inAt + 14, [100, 100, 100]],
    [outFrom, [100, 100, 100]],
    [op - 1, [0, 0, 100]],
  ])

// Tebakan benar: lingkaran hijau + centang tergambar + percikan cat
function drawCorrect() {
  const S = 300
  const OP = 60
  const c = S / 2
  const layers = []
  layers.push(
    layer(1, [poly([[-34, 2], [-10, 26], [36, -24]], false), stroke('#121212', 14), trim(8, 22)], { p: st([c, c, 0]), s: popScale(0, 46, OP) }, OP),
  )
  layers.push(layer(2, [{ ty: 'el', p: st([0, 0]), s: st([130, 130]) }, fill('#5cf64a'), stroke('#121212', 6)], { p: st([c, c, 0]), s: popScale(0, 46, OP) }, OP))
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rand() * 0.4
    const dist = 90 + rand() * 40
    layers.push(
      layer(
        i + 3,
        [{ ty: 'el', p: st([0, 0]), s: st([16 + rand() * 12, 12 + rand() * 8]) }, fill(PALETTE[i % 5]), stroke('#121212', 2.5)],
        {
          p: anim([
            [6, [c, c, 0]],
            [30, [c + Math.cos(a) * dist, c + Math.sin(a) * dist, 0]],
          ]),
          s: anim([
            [0, [0, 0, 100]],
            [8, [120, 120, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('draw-correct', S, S, OP, layers)
}

// Nyaris benar: tanda seru kuning bergoyang + garis getar
function drawClose() {
  const S = 240
  const OP = 50
  const c = S / 2
  const shake = anim([0, -14, 12, -10, 8, -4, 0].map((v, k) => [4 + k * 5, [v]]))
  const layers = [
    layer(
      1,
      [
        { ty: 'rc', p: st([0, -16]), s: st([22, 58]), r: st(6) },
        { ty: 'el', p: st([0, 34]), s: st([24, 24]) },
        fill('#ffcc1f'),
        stroke('#121212', 5),
      ],
      { p: st([c, c, 0]), r: shake, s: popScale(0, 40, OP) },
      OP,
    ),
  ]
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const x = side * (52 + k * 18)
      layers.push(
        layer(
          layers.length + 1,
          [poly([[x, -24 + k * 6], [x, 20 - k * 6]], false), stroke(k ? '#ff37a6' : '#121212', 6)],
          { p: st([c, c, 0]), o: fade(14 + k * 4, 34, OP) },
          OP,
        ),
      )
    }
  }
  return doc('draw-close', S, S, OP, layers)
}

// Waktu habis: jam weker berdering (goyang) + gelombang suara
function drawTimeup() {
  const S = 300
  const OP = 72
  const c = S / 2
  const ringing = anim([...Array.from({ length: 10 }, (_, k) => [6 + k * 5, [k % 2 ? 9 : -9]]), [60, [0]]])
  const grow = anim([
    [0, [40, 40, 100]],
    [8, [108, 108, 100]],
    [14, [100, 100, 100]],
  ])
  const at = st([c, c + 10, 0])
  const layers = [
    layer(1, [poly([[0, 0], [0, -34]], false), poly([[0, 0], [24, 10]], false), stroke('#121212', 7)], { p: at, r: ringing, s: grow }, OP),
    layer(2, [{ ty: 'el', p: st([0, 0]), s: st([140, 140]) }, fill('#fff4fa'), stroke('#121212', 7)], { p: at, r: ringing, s: grow }, OP),
    layer(3, [{ ty: 'el', p: st([0, 0]), s: st([160, 160]) }, fill('#ff37a6'), stroke('#121212', 7)], { p: at, r: ringing, s: grow }, OP),
    layer(
      4,
      [{ ty: 'el', p: st([-42, -70]), s: st([42, 42]) }, { ty: 'el', p: st([42, -70]), s: st([42, 42]) }, fill('#5cf64a'), stroke('#121212', 6)],
      { p: at, r: ringing, s: grow },
      OP,
    ),
  ]
  for (let k = 0; k < 3; k++) {
    for (const side of [-1, 1]) {
      const r = 105 + k * 18
      const arc = [-0.5, -0.25, 0, 0.25, 0.5].map((t) => [side * r * Math.cos(t), r * Math.sin(t)])
      layers.push(
        layer(
          layers.length + 1,
          [poly(arc, false), stroke(k === 1 ? '#ff37a6' : '#121212', 5)],
          {
            p: at,
            o: anim([
              [0, [0]],
              [6 + k * 6, [0]],
              [12 + k * 6, [100]],
              [40 + k * 6, [100]],
              [52 + k * 6, [0]],
            ]),
          },
          OP,
        ),
      )
    }
  }
  return doc('draw-timeup', S, S, OP, layers)
}

// Kata dibuka: coretan spiral melebar + bintang terlempar
function drawReveal() {
  const S = 320
  const OP = 64
  const c = S / 2
  const spiral = Array.from({ length: 41 }, (_, k) => {
    const t = k / 40
    const a = t * Math.PI * 5
    return [Math.cos(a) * (8 + 120 * t), Math.sin(a) * (8 + 120 * t)]
  })
  const layers = [layer(1, [poly(spiral, false), stroke('#ff37a6', 7), trim(0, 30)], { p: st([c, c, 0]), o: fade(36, 56, OP) }, OP)]
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    layers.push(
      layer(
        i + 2,
        star(18, 7, 5, pick(['#5cf64a', '#ffcc1f', '#ff37a6', '#87e752'])),
        {
          p: anim([
            [10, [c, c, 0]],
            [40, [c + Math.cos(a) * 130, c + Math.sin(a) * 130, 0]],
          ]),
          r: anim([
            [10, [0]],
            [OP - 1, [220]],
          ]),
          s: anim([
            [0, [0, 0, 100]],
            [10, [0, 0, 100]],
            [18, [120, 120, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('draw-reveal', S, S, OP, layers)
}

// Giliran baru: tiga kartu kata melayang masuk berurutan lalu mengipas
function drawPick() {
  const W = 360
  const H = 260
  const OP = 54
  const colors = ['#ff37a6', '#fff4fa', '#5cf64a']
  const layers = colors.map((color, k) => {
    const i = 2 - k // kartu kanan digambar paling atas
    const t0 = i * 6
    const x = W / 2 + (i - 1) * 70
    return layer(
      k + 1,
      [{ ty: 'rc', p: st([0, 0]), s: st([90, 120]), r: st(8) }, fill(colors[i]), stroke('#121212', 5)],
      {
        p: anim([
          [t0, [W / 2, H + 100, 0]],
          [t0 + 16, [x, H / 2, 0]],
          [OP - 1, [x, H / 2 - 6, 0]],
        ]),
        r: anim([
          [t0, [-40]],
          [t0 + 16, [(i - 1) * 16]],
        ]),
      },
      OP,
    )
  })
  return doc('draw-pick', W, H, OP, layers)
}

// ---------- efek Kartu Remi ----------
const cardBack = (w, h) => [
  { ty: 'rc', p: st([0, 0]), s: st([w * 0.62, h * 0.18]), r: st(0) },
  fill('#121212'),
  { ty: 'rc', p: st([0, 0]), s: st([w, h]), r: st(8) },
  fill('#ff37a6'),
  stroke('#121212', 5),
]
const chipShape = (size, color) => [
  { ty: 'el', p: st([0, 0]), s: st([size * 0.55, size * 0.55]) },
  stroke('#fff4fa', 3),
  ...[0, 1, 2, 3].map((k) => ({
    ty: 'rc',
    p: st([Math.cos((k * Math.PI) / 2) * size * 0.4, Math.sin((k * Math.PI) / 2) * size * 0.4]),
    s: st([size * 0.16, size * 0.16]),
    r: st(0),
  })),
  fill('#fff4fa'),
  { ty: 'el', p: st([0, 0]), s: st([size, size]) },
  fill(color),
  stroke('#121212', 4),
]

// Bagi kartu: lima punggung kartu terbang dari bawah lalu mengipas
function remiDeal() {
  const W = 360
  const H = 240
  const OP = 56
  const layers = []
  for (let k = 0; k < 5; k++) {
    const i = 4 - k
    const t0 = i * 5
    const x = W / 2 + (i - 2) * 46
    layers.push(
      layer(
        k + 1,
        cardBack(70, 100),
        {
          p: anim([
            [t0, [W / 2, H + 90, 0]],
            [t0 + 14, [x, H / 2 + Math.abs(i - 2) * 8, 0]],
          ]),
          r: anim([
            [t0, [-160]],
            [t0 + 14, [(i - 2) * 12]],
          ]),
          o: fade(44, OP - 1, OP),
        },
        OP,
      ),
    )
  }
  return doc('remi-deal', W, H, OP, layers)
}

// Menang pot: chip menyembur ke atas lalu jatuh
function remiChips() {
  const S = 320
  const OP = 72
  const c = S / 2
  const colors = ['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff']
  const layers = []
  for (let i = 0; i < 14; i++) {
    const vx = (rand() - 0.5) * 220
    const peak = 70 + rand() * 90
    const t0 = Math.floor(rand() * 10)
    layers.push(
      layer(
        i + 1,
        chipShape(30 + rand() * 12, colors[i % 4]),
        {
          p: anim([
            [t0, [c, c + 40, 0]],
            [t0 + 22, [c + vx * 0.6, c + 40 - peak, 0]],
            [t0 + 50, [c + vx, S + 40, 0]],
          ]),
          r: anim([
            [t0, [0]],
            [t0 + 50, [(rand() - 0.5) * 540]],
          ]),
          s: anim([
            [0, [0, 0, 100]],
            [t0, [0, 0, 100]],
            [t0 + 6, [100, 100, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('remi-chips', S, S, OP, layers)
}

// Lewat 21: kartu terbelah dua dengan percikan
function remiBust() {
  const S = 300
  const OP = 64
  const c = S / 2
  const zig = [[0, -70], [-10, -40], [8, -10], [-8, 20], [6, 50], [0, 70]]
  const layers = [-1, 1].map((side, k) =>
    layer(
      k + 1,
      [poly([[side * 50, -70], ...zig, [side * 50, 70]]), fill('#fff4fa'), stroke('#121212', 5)],
      {
        p: anim([
          [0, [c, c, 0]],
          [14, [c, c, 0]],
          [40, [c + side * 46, c + 30, 0]],
        ]),
        r: anim([
          [0, [0]],
          [6, [side * -6]],
          [10, [side * 6]],
          [14, [0]],
          [40, [side * 24]],
        ]),
        s: popScale(0, 50, OP),
      },
      OP,
    ),
  )
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.45
    layers.push(
      layer(
        layers.length + 1,
        [poly([[0, 0], [0, -22]], false), stroke(i % 2 ? '#ff37a6' : '#121212', 6)],
        {
          p: anim([
            [14, [c, c - 60, 0]],
            [34, [c + Math.cos(a) * 90, c - 60 + Math.sin(a) * 60, 0]],
          ]),
          r: st([((a + Math.PI / 2) * 180) / Math.PI]),
          o: anim([
            [0, [0]],
            [13, [0]],
            [15, [100]],
            [36, [100]],
            [46, [0]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('remi-bust', S, S, OP, layers)
}

// "Bohong!": cap miring menghantam meja + garis kejut (teksnya ditimpa di UI)
function remiLiar() {
  const S = 340
  const OP = 76
  const c = S / 2
  const slam = anim([
    [0, [260, 260, 100]],
    [9, [92, 92, 100]],
    [14, [104, 104, 100]],
    [18, [100, 100, 100]],
    [58, [100, 100, 100]],
    [OP - 1, [0, 0, 100]],
  ])
  const layers = [
    layer(1, [{ ty: 'rc', p: st([0, 0]), s: st([236, 86]), r: st(0) }, stroke('#121212', 6)], { p: st([c, c, 0]), r: st(-10), s: slam }, OP),
    layer(2, [{ ty: 'rc', p: st([0, 0]), s: st([260, 110]), r: st(0) }, fill('#ff37a6'), stroke('#121212', 7)], { p: st([c, c, 0]), r: st(-10), s: slam }, OP),
  ]
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    layers.push(
      layer(
        layers.length + 1,
        [
          poly(
            [
              [Math.cos(a) * 150, Math.sin(a) * 90],
              [Math.cos(a) * 175, Math.sin(a) * 110],
            ],
            false,
          ),
          stroke(i % 2 ? '#5cf64a' : '#121212', 7),
        ],
        {
          p: st([c, c, 0]),
          o: anim([
            [0, [0]],
            [9, [0]],
            [11, [100]],
            [30, [100]],
            [40, [0]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('remi-liar', S, S, OP, layers)
}

// Joker terungkap: bintang badut berputar + ketupat beterbangan
function remiJoker() {
  const S = 320
  const OP = 76
  const c = S / 2
  const layers = [
    layer(
      1,
      star(70, 30, 5, '#ffcc1f'),
      {
        p: st([c, c, 0]),
        r: anim([
          [0, [-90]],
          [40, [20]],
          [OP - 1, [40]],
        ]),
        s: popScale(0, 60, OP),
      },
      OP,
    ),
    layer(
      2,
      star(96, 54, 10, '#ff37a6'),
      {
        p: st([c, c, 0]),
        r: anim([
          [0, [0]],
          [OP - 1, [-60]],
        ]),
        s: popScale(4, 60, OP),
      },
      OP,
    ),
  ]
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    layers.push(
      layer(
        layers.length + 1,
        [poly([[0, -14], [10, 0], [0, 14], [-10, 0]]), fill(['#5cf64a', '#ff37a6', '#ffcc1f', '#2f7bff'][i % 4]), stroke('#121212', 3)],
        {
          p: anim([
            [8, [c, c, 0]],
            [40, [c + Math.cos(a) * 140, c + Math.sin(a) * 140, 0]],
          ]),
          r: anim([
            [8, [0]],
            [OP - 1, [360]],
          ]),
          s: anim([
            [0, [0, 0, 100]],
            [8, [0, 0, 100]],
            [14, [120, 120, 100]],
            [OP - 1, [0, 0, 100]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('remi-joker', S, S, OP, layers)
}

// Bom (four of a kind / pas 41): ledakan bergerigi + gelombang kejut
function remiBomb() {
  const S = 340
  const OP = 66
  const c = S / 2
  const layers = [
    layer(
      1,
      star(90, 50, 12, '#ffcc1f'),
      {
        p: st([c, c, 0]),
        r: anim([
          [0, [0]],
          [OP - 1, [30]],
        ]),
        s: popScale(0, 44, OP),
      },
      OP,
    ),
    layer(
      2,
      star(120, 70, 12, '#ff37a6'),
      {
        p: st([c, c, 0]),
        r: anim([
          [0, [10]],
          [OP - 1, [-20]],
        ]),
        s: popScale(3, 44, OP),
      },
      OP,
    ),
  ]
  for (let k = 0; k < 3; k++) {
    layers.push(
      layer(
        layers.length + 1,
        ring(60, k === 1 ? '#5cf64a' : '#121212', 6),
        {
          p: st([c, c, 0]),
          s: anim([
            [0, [0, 0, 100]],
            [6 + k * 6, [60, 60, 100]],
            [36 + k * 6, [520, 520, 100]],
          ]),
          o: anim([
            [0, [100]],
            [26 + k * 6, [100]],
            [38 + k * 6, [0]],
            [OP - 1, [0]],
          ]),
        },
        OP,
      ),
    )
  }
  return doc('remi-bomb', S, S, OP, layers)
}

// ---------- efek Domino ----------
const DOTS = {
  0: [],
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}
const grp = (items) => ({ ty: 'gr', it: [...items, tr()], nm: 'g' })
/** kartu domino tegak (w × 2w), angka a di atas, b di bawah; 1 & 4 merah seperti kartu gaple */
const dominoTile = (w, a, b, back = false) => {
  const h = w * 2
  const g = w * 0.27
  const half = (n, cy) => {
    if (!DOTS[n].length) return []
    const d = w * (n === 1 ? 0.24 : 0.17)
    return [grp([...DOTS[n].map(([x, y]) => ({ ty: 'el', p: st([x * g, cy + y * g]), s: st([d, d]) })), fill(n === 1 || n === 4 ? '#ff3b5c' : '#121212')])]
  }
  const body = [{ ty: 'rc', p: st([0, 0]), s: st([w, h]), r: st(w * 0.16) }, fill(back ? '#ff37a6' : '#fff4fa'), stroke('#121212', 5)]
  if (back) return [grp([{ ty: 'el', p: st([0, 0]), s: st([w * 0.5, w * 0.5]) }, fill('#121212')]), ...body]
  return [...half(a, -h / 4), ...half(b, h / 4), grp([{ ty: 'rc', p: st([0, 0]), s: st([w * 0.78, 4]), r: st(0) }, fill('#121212')]), ...body]
}
const dominoChip = (size, color) => [
  ...[0, 1, 2, 3, 4].map((k) => {
    const a = (k * 2 * Math.PI) / 5
    return grp([{ ty: 'el', p: st([Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3]), s: st([size * 0.14, size * 0.14]) }, fill('#fff4fa')])
  }),
  grp([{ ty: 'el', p: st([0, 0]), s: st([size * 0.2, size * 0.2]) }, fill('#121212')]),
  { ty: 'el', p: st([0, 0]), s: st([size, size]) },
  fill(color),
  stroke('#121212', 4),
]

// Bagi kartu: tujuh punggung domino meluncur dari tumpukan tengah ke kiri-kanan
function dominoDeal() {
  const W = 380
  const H = 220
  const OP = 58
  const layers = []
  for (let i = 0; i < 7; i++) {
    const t0 = i * 4
    const x = W / 2 + (i - 3) * 46
    layers.push(
      layer(
        i + 1,
        dominoTile(34, 0, 0, true),
        {
          p: anim([
            [t0, [W / 2, H / 2 + 6, 0]],
            [t0 + 12, [x, H / 2 + (i % 2 ? -8 : 8), 0]],
          ]),
          r: anim([
            [t0, [90]],
            [t0 + 12, [(i - 3) * 5]],
          ]),
          s: anim([
            [0, [0, 0, 100]],
            [t0, [60, 60, 100]],
            [t0 + 12, [100, 100, 100]],
          ]),
          o: fade(46, OP - 1, OP),
        },
        OP,
      ),
    )
  }
  return doc('domino-deal', W, H, OP, layers)
}

// Poin kelipatan 5: bintang kuning meledak dengan sinar berputar
function dominoScore() {
  const S = 300
  const OP = 64
  const c = S / 2
  const layers = [
    layer(1, star(78, 40, 5, '#ffcc1f'), { p: st([c, c, 0]), r: anim([[0, [-40]], [OP - 1, [10]]]), s: popScale(0, 46, OP) }, OP),
    layer(2, ring(150, '#121212', 5), { p: st([c, c, 0]), s: anim([[0, [0, 0, 100]], [6, [40, 40, 100]], [30, [130, 130, 100]]]), o: fade(20, 32, OP) }, OP),
  ]
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    layers.push(
      layer(
        layers.length + 1,
        [poly([[Math.cos(a) * 92, Math.sin(a) * 92], [Math.cos(a) * 128, Math.sin(a) * 128]], false), stroke(i % 2 ? '#5cf64a' : '#ff37a6', 8)],
        { p: st([c, c, 0]), r: anim([[0, [0]], [OP - 1, [36]]]), o: anim([[0, [0]], [6, [0]], [8, [100]], [34, [100]], [44, [0]]]) },
        OP,
      ),
    )
  }
  return doc('domino-score', S, S, OP, layers)
}

// DOMINO! (kartu terakhir): kartu dibanting ke meja + debu & gelombang
function dominoSlam() {
  const S = 340
  const OP = 70
  const c = S / 2
  const layers = [
    layer(
      1,
      dominoTile(70, 6, 6),
      {
        p: anim([[0, [c, -120, 0]], [10, [c, c, 0]]]),
        r: anim([[0, [-30]], [10, [-8]], [14, [-4]]]),
        s: anim([[0, [140, 140, 100]], [10, [100, 100, 100]], [13, [112, 90, 100]], [17, [100, 100, 100]], [54, [100, 100, 100]], [OP - 1, [0, 0, 100]]]),
      },
      OP,
    ),
  ]
  for (let k = 0; k < 2; k++)
    layers.push(
      layer(
        layers.length + 1,
        ring(60, k ? '#5cf64a' : '#121212', 6),
        {
          p: st([c, c + 40, 0]),
          s: anim([[0, [0, 0, 100]], [10 + k * 5, [40, 20, 100]], [40 + k * 5, [500, 200, 100]]]),
          o: anim([[0, [100]], [30 + k * 5, [100]], [42 + k * 5, [0]], [OP - 1, [0]]]),
        },
        OP,
      ),
    )
  for (let i = 0; i < 8; i++) {
    const vx = (i % 2 ? 1 : -1) * (60 + rand() * 90)
    const lift = rand() * 50
    layers.push(
      layer(
        layers.length + 1,
        [{ ty: 'el', p: st([0, 0]), s: st([18, 18]) }, fill(i % 3 ? '#ffcae9' : '#87e752'), stroke('#121212', 3)],
        {
          p: anim([[10, [c, c + 60, 0]], [24, [c + vx * 0.7, c + 20 - lift, 0]], [40, [c + vx, c + 70, 0]]]),
          s: anim([[0, [0, 0, 100]], [10, [0, 0, 100]], [13, [100, 100, 100]], [40, [0, 0, 100]]]),
        },
        OP,
      ),
    )
  }
  return doc('domino-slam', S, S, OP, layers)
}

// Buntu (Gaple tutup): dua kartu saling dorong lalu tanda silang menghantam
function dominoBlocked() {
  const S = 320
  const OP = 70
  const c = S / 2
  const lines = () => [poly([[-60, -60], [60, 60]], false), poly([[60, -60], [-60, 60]], false)]
  const cross = [grp([...lines(), stroke('#ff3b5c', 16)]), ...lines(), stroke('#121212', 28)]
  const layers = [
    layer(1, cross, { p: st([c, c, 0]), s: anim([[0, [0, 0, 100]], [16, [0, 0, 100]], [24, [130, 130, 100]], [30, [100, 100, 100]], [56, [100, 100, 100]], [OP - 1, [0, 0, 100]]]) }, OP),
    layer(2, dominoTile(56, 3, 5), { p: anim([[0, [-60, c, 0]], [14, [c - 40, c, 0]], [18, [c - 52, c, 0]]]), r: anim([[0, [-60]], [14, [-12]]]), o: fade(54, OP - 1, OP) }, OP),
    layer(3, dominoTile(56, 2, 4), { p: anim([[0, [S + 60, c, 0]], [14, [c + 40, c, 0]], [18, [c + 52, c, 0]]]), r: anim([[0, [60]], [14, [12]]]), o: fade(54, OP - 1, OP) }, OP),
  ]
  return doc('domino-blocked', S, S, OP, layers)
}

// Menang pot Qiu Qiu: chip domino menyembur
function dominoChips() {
  const S = 320
  const OP = 72
  const c = S / 2
  const colors = ['#ff37a6', '#5cf64a', '#ffcc1f', '#2f7bff']
  const layers = []
  for (let i = 0; i < 12; i++) {
    const vx = (rand() - 0.5) * 240
    const peak = 60 + rand() * 100
    const t0 = Math.floor(rand() * 10)
    const size = 30 + rand() * 12
    const spin = (rand() - 0.5) * 540
    layers.push(
      layer(
        i + 1,
        dominoChip(size, colors[i % 4]),
        {
          p: anim([[t0, [c, c + 40, 0]], [t0 + 22, [c + vx * 0.6, c + 40 - peak, 0]], [t0 + 50, [c + vx, S + 40, 0]]]),
          r: anim([[t0, [0]], [t0 + 50, [spin]]]),
          s: anim([[0, [0, 0, 100]], [t0, [0, 0, 100]], [t0 + 6, [100, 100, 100]]]),
        },
        OP,
      ),
    )
  }
  return doc('domino-chips', S, S, OP, layers)
}

// Kartu sakti Qiu Qiu: empat balak berputar mengitari bintang
function dominoSpecial() {
  const S = 340
  const OP = 84
  const c = S / 2
  const layers = []
  ;[[0, 0], [3, 3], [5, 5], [6, 6]].forEach(([a, b], i) => {
    const a0 = (i / 4) * 360
    const pos = []
    for (let k = 0; k <= 4; k++) {
      const ang = ((a0 + k * 30) * Math.PI) / 180
      pos.push([k * 12, [c + Math.cos(ang) * 104, c + Math.sin(ang) * 104, 0]])
    }
    layers.push(layer(i + 1, dominoTile(36, a, b), { p: anim(pos), r: anim([[0, [a0]], [48, [a0 + 120]]]), s: popScale(i * 3, 66, OP) }, OP))
  })
  layers.push(layer(layers.length + 1, star(64, 30, 6, '#ffcc1f'), { p: st([c, c, 0]), r: anim([[0, [0]], [OP - 1, [120]]]), s: popScale(6, 66, OP) }, OP))
  layers.push(layer(layers.length + 1, star(92, 60, 12, '#ff37a6'), { p: st([c, c, 0]), r: anim([[0, [0]], [OP - 1, [-60]]]), s: popScale(10, 66, OP) }, OP))
  return doc('domino-special', S, S, OP, layers)
}

// ---------- efek Monopoli ----------
const banknote = (w, color = '#5cf64a') => [
  grp([{ ty: 'el', p: st([0, 0]), s: st([w * 0.34, w * 0.34]) }, fill('#fff4fa'), stroke('#121212', 3)]),
  grp([{ ty: 'rc', p: st([0, 0]), s: st([w * 0.8, w * 0.36]), r: st(0) }, stroke('#121212', 2.5)]),
  { ty: 'rc', p: st([0, 0]), s: st([w, w * 0.5]), r: st(2) },
  fill(color),
  stroke('#121212', 4),
]
const coin = (size) => [
  grp([{ ty: 'rc', p: st([0, 0]), s: st([size * 0.14, size * 0.5]), r: st(0) }, fill('#121212')]),
  { ty: 'el', p: st([0, 0]), s: st([size, size]) },
  fill('#ffcc1f'),
  stroke('#121212', 4),
]
const houseShape = (w, color) => [
  grp([{ ty: 'rc', p: st([0, w * 0.22]), s: st([w * 0.26, w * 0.4]), r: st(0) }, fill('#121212')]),
  poly([[-w / 2, 0], [0, -w * 0.5], [w / 2, 0], [w / 2, w * 0.45], [-w / 2, w * 0.45]]),
  fill(color),
  stroke('#121212', 5),
]

// Beli / terjual: cap bercentang menghantam akta + gelombang
function monopolySold() {
  const S = 300
  const OP = 66
  const c = S / 2
  const check = [poly([[-34, 2], [-8, 26], [38, -24]], false), stroke('#121212', 14)]
  const layers = [
    layer(
      1,
      [grp(check), grp([{ ty: 'rc', p: st([0, 0]), s: st([118, 118]), r: st(10) }, stroke('#121212', 6)]), { ty: 'rc', p: st([0, 0]), s: st([140, 140]), r: st(14) }, fill('#ff37a6'), stroke('#121212', 6)],
      {
        p: st([c, c, 0]),
        r: anim([[0, [-40]], [10, [-14]]]),
        s: anim([[0, [220, 220, 100]], [10, [92, 92, 100]], [14, [104, 104, 100]], [18, [100, 100, 100]], [50, [100, 100, 100]], [OP - 1, [0, 0, 100]]]),
        o: anim([[0, [0]], [4, [100]]]),
      },
      OP,
    ),
    layer(2, ring(120, '#121212', 6), { p: st([c, c, 0]), s: anim([[0, [0, 0, 100]], [10, [60, 60, 100]], [34, [190, 190, 100]]]), o: fade(24, 36, OP) }, OP),
  ]
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3
    layers.push(
      layer(
        layers.length + 1,
        [poly([[Math.cos(a) * 96, Math.sin(a) * 96], [Math.cos(a) * 126, Math.sin(a) * 126]], false), stroke(i % 2 ? '#5cf64a' : '#ffcc1f', 8)],
        { p: st([c, c, 0]), o: anim([[0, [0]], [10, [0]], [12, [100]], [30, [100]], [40, [0]]]) },
        OP,
      ),
    )
  }
  return doc('monopoly-sold', S, S, OP, layers)
}

// Bayar sewa / pajak: lembaran uang beterbangan keluar
function monopolyRent() {
  const S = 300
  const OP = 64
  const c = S / 2
  const layers = []
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.34
    const dist = 100 + rand() * 40
    const t0 = i * 2
    layers.push(
      layer(
        i + 1,
        i % 3 === 2 ? coin(30) : banknote(56, i % 2 ? '#5cf64a' : '#87e752'),
        {
          p: anim([[t0, [c, c + 30, 0]], [t0 + 26, [c + Math.cos(a) * dist, c + 30 + Math.sin(a) * dist, 0]], [t0 + 46, [c + Math.cos(a) * dist * 1.1, c + 30 + Math.sin(a) * dist * 0.6 + 40, 0]]]),
          r: anim([[t0, [0]], [t0 + 46, [(rand() - 0.5) * 300]]]),
          s: anim([[0, [0, 0, 100]], [t0, [0, 0, 100]], [t0 + 6, [100, 100, 100]], [t0 + 40, [100, 100, 100]], [t0 + 48, [0, 0, 100]]]),
        },
        OP,
      ),
    )
  }
  return doc('monopoly-rent', S, S, OP, layers)
}

// Bangun: rumah jatuh, memantul, debu di kanan-kiri
function monopolyBuild() {
  const S = 260
  const OP = 60
  const c = S / 2
  const layers = [
    layer(
      1,
      houseShape(96, '#5cf64a'),
      {
        p: anim([[0, [c, -80, 0]], [12, [c, c + 10, 0]]]),
        s: anim([[0, [90, 110, 100]], [12, [100, 100, 100]], [15, [118, 82, 100]], [20, [94, 106, 100]], [25, [100, 100, 100]], [46, [100, 100, 100]], [OP - 1, [0, 0, 100]]]),
      },
      OP,
    ),
  ]
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? 1 : -1
    const vx = dir * (40 + rand() * 50)
    layers.push(
      layer(
        layers.length + 1,
        [{ ty: 'el', p: st([0, 0]), s: st([16, 16]) }, fill(i % 3 ? '#ffcae9' : '#fff4fa'), stroke('#121212', 3)],
        {
          p: anim([[12, [c + dir * 40, c + 62, 0]], [34, [c + dir * 40 + vx, c + 40 - rand() * 30, 0]]]),
          s: anim([[0, [0, 0, 100]], [12, [0, 0, 100]], [15, [100, 100, 100]], [34, [0, 0, 100]]]),
        },
        OP,
      ),
    )
  }
  return doc('monopoly-build', S, S, OP, layers)
}

// Masuk penjara: jeruji turun berderak, gembok mengunci
function monopolyJail() {
  const S = 280
  const OP = 76
  const c = S / 2
  const bars = []
  for (let k = -2; k <= 2; k++) bars.push(grp([{ ty: 'rc', p: st([k * 34, 0]), s: st([14, 180]), r: st(4) }, fill('#121212')]))
  const frame = [grp([{ ty: 'rc', p: st([0, -92]), s: st([190, 18]), r: st(0) }, fill('#121212')]), grp([{ ty: 'rc', p: st([0, 92]), s: st([190, 18]), r: st(0) }, fill('#121212')]), ...bars]
  const lock = [
    grp([{ ty: 'el', p: st([0, 6]), s: st([12, 12]) }, fill('#121212')]),
    grp([poly([[-16, -8], [-16, -26], [16, -26], [16, -8]], false), stroke('#121212', 8)]),
    { ty: 'rc', p: st([0, 8]), s: st([50, 40]), r: st(6) },
    fill('#ffcc1f'),
    stroke('#121212', 5),
  ]
  const layers = [
    layer(1, lock, { p: st([c, c + 30, 0]), s: anim([[0, [0, 0, 100]], [20, [0, 0, 100]], [28, [130, 130, 100]], [34, [100, 100, 100]], [60, [100, 100, 100]], [OP - 1, [0, 0, 100]]]), r: anim([[28, [-14]], [34, [10]], [40, [0]]]) }, OP),
    layer(2, frame, { p: anim([[0, [c, -120, 0]], [14, [c, c, 0]], [18, [c, c - 10, 0]], [22, [c, c, 0]]]), o: fade(58, OP - 1, OP) }, OP),
  ]
  return doc('monopoly-jail', S, S, OP, layers)
}

// Tarik kartu: kartu berputar (balik) sambil membesar, kilau bintang
function monopolyCard() {
  const S = 300
  const OP = 56
  const c = S / 2
  const face = [
    grp([poly([[-10, -26], [10, -26], [10, 8], [-10, 8]]), fill('#121212')]),
    grp([{ ty: 'el', p: st([0, 30]), s: st([16, 16]) }, fill('#121212')]),
    { ty: 'rc', p: st([0, 0]), s: st([120, 170]), r: st(10) },
    fill('#ffcae9'),
    stroke('#121212', 6),
  ]
  const layers = [
    layer(
      1,
      face,
      {
        p: anim([[0, [c, c + 60, 0]], [16, [c, c, 0]]]),
        s: anim([[0, [10, 60, 100]], [8, [100, 80, 100]], [12, [-100, 100, 100]], [18, [100, 100, 100]], [40, [100, 100, 100]], [OP - 1, [0, 0, 100]]]),
        r: anim([[0, [-20]], [18, [-6]]]),
      },
      OP,
    ),
  ]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    layers.push(
      layer(layers.length + 1, star(16, 6, 4, i % 2 ? '#5cf64a' : '#ffcc1f'), { p: st([c + Math.cos(a) * 110, c + Math.sin(a) * 110, 0]), s: popScale(10 + i * 2, 36, OP), r: anim([[0, [0]], [OP - 1, [90]]]) }, OP),
    )
  }
  return doc('monopoly-card', S, S, OP, layers)
}

// Bangkrut: celengan bergetar lalu pecah berkeping, koin terakhir terlempar
function monopolyBankrupt() {
  const S = 320
  const OP = 84
  const c = S / 2
  const pig = [
    grp([{ ty: 'el', p: st([52, -4]), s: st([30, 24]) }, fill('#ff8ec9'), stroke('#121212', 4)]),
    grp([{ ty: 'el', p: st([20, -22]), s: st([10, 10]) }, fill('#121212')]),
    grp([{ ty: 'rc', p: st([-6, -40]), s: st([30, 8]), r: st(2) }, fill('#121212')]),
    grp([poly([[-30, -34], [-14, -60], [-4, -36]]), fill('#ff8ec9'), stroke('#121212', 4)]),
    grp([{ ty: 'rc', p: st([-30, 42]), s: st([16, 20]), r: st(3) }, fill('#ff8ec9'), stroke('#121212', 4)]),
    grp([{ ty: 'rc', p: st([24, 42]), s: st([16, 20]), r: st(3) }, fill('#ff8ec9'), stroke('#121212', 4)]),
    { ty: 'el', p: st([0, 0]), s: st([130, 100]) },
    fill('#ffcae9'),
    stroke('#121212', 5),
  ]
  const layers = [
    layer(
      1,
      pig,
      {
        p: anim([[0, [c, c, 0]], [4, [c - 6, c, 0]], [8, [c + 6, c, 0]], [12, [c - 6, c, 0]], [16, [c + 6, c, 0]], [20, [c, c, 0]]]),
        s: anim([[0, [0, 0, 100]], [4, [100, 100, 100]], [22, [110, 92, 100]], [26, [0, 0, 100]]]),
      },
      OP,
    ),
  ]
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const d = 90 + rand() * 50
    const shard = [poly([[-12, -10], [14, -6], [4, 14]]), fill(i % 2 ? '#ffcae9' : '#ff8ec9'), stroke('#121212', 3)]
    layers.push(
      layer(
        layers.length + 1,
        shard,
        {
          p: anim([[24, [c, c, 0]], [44, [c + Math.cos(a) * d, c + Math.sin(a) * d, 0]], [70, [c + Math.cos(a) * d * 1.2, c + Math.sin(a) * d + 80, 0]]]),
          r: anim([[24, [0]], [70, [(rand() - 0.5) * 400]]]),
          s: anim([[0, [0, 0, 100]], [24, [0, 0, 100]], [26, [100, 100, 100]], [62, [100, 100, 100]], [70, [0, 0, 100]]]),
        },
        OP,
      ),
    )
  }
  layers.push(
    layer(
      layers.length + 1,
      coin(34),
      {
        p: anim([[24, [c, c, 0]], [44, [c + 30, c - 110, 0]], [70, [c + 60, S + 40, 0]]]),
        r: anim([[24, [0]], [70, [540]]]),
        s: anim([[0, [0, 0, 100]], [24, [0, 0, 100]], [27, [100, 100, 100]]]),
      },
      OP,
    ),
  )
  return doc('monopoly-bankrupt', S, S, OP, layers)
}

// Jackpot Parkir Bebas: air mancur koin & uang dengan bintang besar
function monopolyJackpot() {
  const S = 320
  const OP = 84
  const c = S / 2
  const layers = [layer(1, star(70, 34, 8, '#ffcc1f'), { p: st([c, c, 0]), r: anim([[0, [0]], [OP - 1, [90]]]), s: popScale(0, 64, OP) }, OP)]
  for (let i = 0; i < 16; i++) {
    const vx = (rand() - 0.5) * 260
    const peak = 80 + rand() * 90
    const t0 = Math.floor(rand() * 16)
    layers.push(
      layer(
        layers.length + 1,
        i % 2 ? coin(26 + rand() * 8) : banknote(48, i % 4 ? '#5cf64a' : '#87e752'),
        {
          p: anim([[t0, [c, c + 30, 0]], [t0 + 22, [c + vx * 0.6, c + 30 - peak, 0]], [t0 + 52, [c + vx, S + 40, 0]]]),
          r: anim([[t0, [0]], [t0 + 52, [(rand() - 0.5) * 600]]]),
          s: anim([[0, [0, 0, 100]], [t0, [0, 0, 100]], [t0 + 5, [100, 100, 100]]]),
        },
        OP,
      ),
    )
  }
  return doc('monopoly-jackpot', S, S, OP, layers)
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
  'draw-correct': drawCorrect(),
  'draw-close': drawClose(),
  'draw-timeup': drawTimeup(),
  'draw-reveal': drawReveal(),
  'draw-pick': drawPick(),
  'remi-deal': remiDeal(),
  'remi-chips': remiChips(),
  'remi-bust': remiBust(),
  'remi-liar': remiLiar(),
  'remi-joker': remiJoker(),
  'remi-bomb': remiBomb(),
  // Domino ditaruh paling akhir supaya acakan efek lain tidak berubah
  'domino-deal': dominoDeal(),
  'domino-score': dominoScore(),
  'domino-slam': dominoSlam(),
  'domino-blocked': dominoBlocked(),
  'domino-chips': dominoChips(),
  'domino-special': dominoSpecial(),
  // Monopoli paling akhir, supaya acakan efek lain tidak berubah
  'monopoly-sold': monopolySold(),
  'monopoly-rent': monopolyRent(),
  'monopoly-build': monopolyBuild(),
  'monopoly-jail': monopolyJail(),
  'monopoly-card': monopolyCard(),
  'monopoly-bankrupt': monopolyBankrupt(),
  'monopoly-jackpot': monopolyJackpot(),
}
for (const [name, json] of Object.entries(out)) writeFileSync(`src/assets/lottie/${name}.json`, JSON.stringify(json))
console.log('Lottie dibuat:', Object.keys(out).join(', '))
