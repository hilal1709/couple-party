// Uji dua HP Petak Cat: dua tab Chrome tanpa throttling lewat ?demo=petak&duo=1.
// Tab 2 (hider) mengecat, tab 1 (pencari) harus menerima cat, melihat pose, dan bisa menangkap.
// Pakai: node scripts/petak-duo.mjs [port-dev] [aktor-pencari]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dev = process.argv[2] ?? '5174'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'duo-'))
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function page() {
  let info
  for (let i = 0; i < 50 && !info; i++) {
    await sleep(200)
    try {
      info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
    } catch {}
  }
  const ws = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.method === 'Runtime.exceptionThrown') console.log('galat halaman:', m.params.exceptionDetails.exception?.description?.slice(0, 200))
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((r) => {
      const n = ++id
      pending.set(n, r)
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const js = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await send('Page.enable')
  await send('Runtime.enable')
  return { send, js }
}

const until = async (p, expr, label, ms = 240000) => {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await p.js(expr)) return
    await sleep(300)
  }
  console.log('teks halaman:', String(await p.js('document.body.innerText')).slice(0, 200))
  console.log('adegan:', await p.js('JSON.stringify({round: !!window.__petak, bodies: window.__petak?.bodies?.length, url: location.href, hidden: document.hidden})'))
  throw new Error(`waktu habis: ${label}`)
}

const URL_BASE = `http://localhost:${dev}/?demo=petak&duo=1&n=2&total=2&hide=20&hunt=60&rounds=1&q=low&seeker=${process.argv[3] ?? 0}`
let failed = false
try {
  const host = await page()
  await host.send('Page.navigate', { url: `${URL_BASE}&seat=0` })
  const guest = await page()
  await guest.send('Page.navigate', { url: `${URL_BASE}&seat=1` })
  const ready = '!!window.__petak?.bodies?.length && !!document.querySelector("[data-seat]")'
  await until(host, ready, 'host siap')
  await until(guest, ready, 'tamu siap')
  await sleep(1000)
  await host.js('window.__petak.s.seekers[0]')
  const seekerSeat = await host.js('window.__petak.s.actors[window.__petak.s.seekers[0]].seat')
  const [seeker, hider, hiderSeat] = seekerSeat === 0 ? [host, guest, 1] : [guest, host, 0]
  console.log('pencari = kursi', seekerSeat)

  // hider mengecat lewat API yang sama dengan tombol Isi, lalu berpose dan bergeser
  await hider.js(`(() => { const r = window.__petak; r.setPainting(true); r.painter.surface.setBrush({ radius: 0.1, color: new (Object.getPrototypeOf(r.world.camera.position).constructor)(0.9, 0.05, 0.05) }); r.painter.surface.fill(); r.paintChanged(); r.setPainting(false); r.setPose('nempel') })()`)
  const hiderActor = await hider.js('window.__petak.me')
  await until(seeker, `window.__petak.bodies[${hiderActor}].material.uniforms.uPaint.value !== window.__petak.white`, 'cat sampai ke pencari', 15000)
  console.log('OK cat sampai ke HP pencari')
  await until(seeker, `window.__petak.remotes.get(${hiderActor}).pose === 'nempel'`, 'pose sampai', 8000)
  console.log('OK pose sampai ke HP pencari')

  await seeker.js('window.__petak.look && 0')
  await until(seeker, "window.__petak.s.phase === 'hunt'", 'fase berburu', 40000)
  console.log('OK fase berburu sampai di kedua HP')

  // salah tangkap saat jauh
  await seeker.js('window.__petak.grab()')
  const penalty = await seeker.js('window.__petak.penalty')
  console.log(penalty > 0 ? 'OK salah tangkap kena jeda' : 'GAGAL jeda salah tangkap', penalty)
  if (!(penalty > 0)) failed = true

  // pencari berjalan ke hider; arah kamera dibidik ke hider
  await sleep(3200)
  await seeker.js(`(() => { const r = window.__petak; const h = r.remotes.get(${hiderActor}); const w = r.walkers[r.me]; const a = Math.atan2(w.x - h.x, w.z - h.z); r.debugPlace(h.x + Math.sin(a) * 2.5, h.z + Math.cos(a) * 2.5, a) })()`)
  await sleep(1200)
  for (let i = 0; i < 12 && !(await seeker.js("window.__petak.s.phase === 'reveal'")); i++) {
    await seeker.js('window.__petak.grab()')
    await sleep(3500)
  }
  await until(seeker, "window.__petak.s.phase === 'reveal'", 'tangkapan sah menutup ronde', 12000)
  await until(hider, "window.__petak.s.phase === 'reveal'", 'tangkapan sampai ke hider', 8000)
  const caught = await seeker.js(`window.__petak.s.caught[${hiderActor}]`)
  console.log('OK tangkapan sah lewat host, detik', caught, 'hiderSeat', hiderSeat)
} catch (e) {
  failed = true
  console.error('GAGAL', e.message)
}
chrome.kill()
await sleep(400)
try {
  rmSync(profile, { recursive: true, force: true })
} catch {}
process.exit(failed ? 1 : 0)
