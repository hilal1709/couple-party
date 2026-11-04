// Uji dua HP Tali Jodoh: dua tab berbagi state & saluran live lewat ?demo=tali&duo=1.
// Onde (tab 1) dan Klepon (tab 2) jalan ke kanan; tiap tab harus melihat pasangannya di posisi yang sama,
// tali tetap menahan jarak, dan lompatan sampai ke HP lain.
// Pakai: node scripts/tali-duo.mjs [port-dev] [level]
import { createRequire } from 'node:module'

// require supaya Playwright yang terpasang global (NODE_PATH) juga ketemu
const { chromium } = createRequire(import.meta.url)('playwright')

const port = process.argv[2] ?? '5173'
const level = process.argv[3] ?? '0'
const url = (seat) => `http://localhost:${port}/?demo=tali&duo=1&q=low&level=${level}&seat=${seat}`
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] })
const ctx = await browser.newContext({ viewport: { width: 420, height: 200 } })
const tabs = [await ctx.newPage(), await ctx.newPage()]
for (const t of tabs) {
  t.on('pageerror', (e) => console.log('galat halaman:', e.message.slice(0, 200)))
  // dua tab harus sama-sama 'terlihat', kalau tidak requestAnimationFrame di tab belakang berhenti
  const cdp = await ctx.newCDPSession(t)
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await cdp.send('Page.setWebLifecycleState', { state: 'active' })
}
await tabs[0].goto(url(0))
await tabs[1].goto(url(1))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const read = (t) =>
  t.evaluate(() => {
    const r = window.__tali
    if (!r) return null
    const me = r.client.body
    const other = r.partner(Date.now())
    return { me: [me.x, me.y], other: other ? [other.p.x, other.p.y] : null, rope: r.client.rope }
  })

async function until(fn, label, ms = 120000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await fn()) return
    await sleep(500)
  }
  throw new Error(`waktu habis: ${label}`)
}

let fail = 0
const check = (ok, msg) => {
  console.log(ok ? 'OK  ' : 'GAGAL', msg)
  if (!ok) fail++
}

await until(async () => (await read(tabs[0]))?.other && (await read(tabs[1]))?.other, 'kedua tab saling melihat')
check(true, 'kedua tab saling melihat pasangannya')

// Onde jalan ke kanan sendirian: tali harus menahannya dekat Klepon
await tabs[0].evaluate(() => window.__tali.setInput({ x: 1 }))
await sleep(9000)
await tabs[0].evaluate(() => window.__tali.setInput({ x: 0 }))
await sleep(1500)
const a = await read(tabs[0])
const b = await read(tabs[1])
const gap = Math.hypot(a.me[0] - b.me[0], a.me[1] - b.me[1])
check(gap < 6.8, `tali menahan jarak (jarak ${gap.toFixed(2)} m)`)
const drift0 = Math.hypot(a.me[0] - b.other[0], a.me[1] - b.other[1])
const drift1 = Math.hypot(b.me[0] - a.other[0], b.me[1] - a.other[1])
check(drift0 < 0.6 && drift1 < 0.6, `posisi sama di kedua HP (selisih ${drift0.toFixed(2)} / ${drift1.toFixed(2)} m)`)
check(a.me[0] > 4, `Onde benar-benar bergerak (x ${a.me[0].toFixed(2)})`)

// Klepon melompat: tab Onde harus melihatnya naik
await tabs[1].evaluate(() => window.__tali.setInput({ jump: true }))
let peak = 0
for (let i = 0; i < 16; i++) {
  await sleep(150)
  const r = await read(tabs[0])
  if (r?.other) peak = Math.max(peak, r.other[1])
}
await tabs[1].evaluate(() => window.__tali.setInput({ jump: false }))
check(peak > b.me[1] + 0.6, `lompatan Klepon terlihat di HP Onde (puncak ${peak.toFixed(2)}, tanah ${b.me[1].toFixed(2)})`)

await browser.close()
console.log(fail ? `${fail} pemeriksaan gagal` : 'Semua pemeriksaan lolos')
process.exit(fail ? 1 : 0)
