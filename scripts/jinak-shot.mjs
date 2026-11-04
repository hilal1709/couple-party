// Tangkapan layar Jinak Bom: penjinak (overview + tiap modul), pakar, hasil, dan pembanding anti-aliasing.
// Pakai: node scripts/jinak-shot.mjs [port-dev] [folder-keluaran]
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const port = process.argv[2] ?? '5173'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })
const base = `http://localhost:${port}/?demo=jinak`

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
async function open(query, scale = 2, w = 844, h = 390, quality = 'med') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale })
  page.setDefaultTimeout(180000)
  await page.addInitScript((q) => localStorage.setItem('couple-party:jinak-quality', q), quality)
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
  await page.goto(`${base}&${query}`)
  await page.waitForLoadState('load')
  return page
}
const ready = (p) => p.waitForFunction(() => !!window.__jinakScene && !document.body.innerText.includes('Merakit bom'), null, { timeout: 120000 })
const settle = (p, ms = 2500) => p.waitForTimeout(ms)

// penjinak: tampilan penuh
let p = await open('seat=0&start=1&level=panik&seed=11')
await ready(p)
await settle(p, 4000)
await p.screenshot({ path: `${out}/penjinak-overview.png` })
const kinds = await p.evaluate(() => window.__jinak.s.modules.map((m) => m.kind))
console.log('modul:', kinds.join(', '))
for (let i = 0; i < kinds.length; i++) {
  await p.evaluate((i) => window.__jinakScene.focus(i), i)
  await settle(p, 2200)
  await p.screenshot({ path: `${out}/modul-${i}-${kinds[i]}.png` })
}
// sisi kanan (nomor seri) & kiri (stiker)
await p.evaluate(() => window.__jinakScene.turn(-1))
await settle(p, 2500)
await p.screenshot({ path: `${out}/sisi-kanan.png` })
await p.evaluate(() => {
  window.__jinakScene.turn(0)
  window.__jinakScene.turn(1)
})
await settle(p, 2500)
await p.screenshot({ path: `${out}/sisi-kiri.png` })

// interaksi sungguhan: potong kabel yang benar & salah tekan gembok
const before = await p.evaluate(() => ({ solved: window.__jinak.s.solved.filter(Boolean).length, strikes: window.__jinak.s.strikes }))
await p.evaluate(() => {
  const j = window.__jinak
  const w = j.s.modules.findIndex((m) => m.kind === 'kabel')
  j.solutionOf(j.s, w).forEach((a) => j.act(a))
  const g = j.s.modules.findIndex((m) => m.kind === 'gembok')
  if (g >= 0) j.act({ type: 'unlock', mod: g, code: '000', left: 60000 })
})
await settle(p, 1200)
const after = await p.evaluate(() => ({ solved: window.__jinak.s.solved.filter(Boolean).length, strikes: window.__jinak.s.strikes }))
console.log('sebelum', before, 'sesudah', after)
await p.evaluate(() => window.__jinakScene.focus(window.__jinak.s.modules.findIndex((m) => m.kind === 'kabel')))
await settle(p, 2200)
await p.screenshot({ path: `${out}/kabel-terpotong.png` })
await p.close()

// pakar
p = await open('seat=1&start=1&level=normal&seed=11')
await p.waitForTimeout(3000)
await p.screenshot({ path: `${out}/pakar-awal.png` })
for (const tab of ['Kabel', 'Simbol', 'Labirin', 'Gembok']) {
  await p.getByRole('button', { name: tab, exact: true }).click()
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${out}/pakar-${tab.toLowerCase()}.png` })
}
await p.close()

// intro & hasil
for (const [q, name] of [['seat=0', 'intro'], ['seat=0&end=defused', 'hasil-jinak'], ['seat=1&end=boom', 'hasil-duar']]) {
  p = await open(q)
  await p.waitForTimeout(q.includes('seat=0') ? 9000 : 3000)
  await p.screenshot({ path: `${out}/${name}.png` })
  await p.close()
}

// pembanding anti-aliasing: close-up kabel, AA mati vs Tinggi (MSAA 4x + SMAA), skala 1 supaya tangga piksel kelihatan
for (const aa of ['0', '1']) {
  p = await open(`seat=0&start=1&level=panik&seed=11&aa=${aa}`, 1, 844, 390, 'high')
  await ready(p)
  await settle(p, 3000)
  await p.evaluate(() => window.__jinakScene.turn(0))
  await settle(p, 2500)
  await p.screenshot({ path: `${out}/aa-${aa === '0' ? 'mati' : 'nyala'}.png` })
  await p.close()
}

await browser.close()
console.log(errors.length ? `galat:\n${[...new Set(errors)].join('\n')}` : 'tanpa galat halaman')
