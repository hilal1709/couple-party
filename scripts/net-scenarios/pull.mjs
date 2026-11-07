// Skenario tarik tangan (2 pemain): klien menggantung di dinding di bawah host; host di bibir atas menekan "Tarik".
// Klien harus terangkat lewat gerak naik tepian (mode 'mantle'), bukan teleport, lalu berdiri di dekat host.
// Diakhiri potret HUD klien dengan ransel terbuka & bar bonus terisi.
export default async function ({ evalIn, wait, tabs }) {
  const out = {}
  const spot = await evalIn(0, `const t = window.__puncak.t
    const i = t.route.findIndex((p, k) => p.climb && k > 0 && p.y - t.route[k - 1].y > 4)
    const a = t.route[i - 1], b = t.route[i]
    return { a, b }`)
  const { a, b } = spot
  const dx = b.x - a.x
  const dz = b.z - a.z
  const d = Math.hypot(dx, dz)
  // klien menahan Pegang dulu supaya menempel di dinding saat dipindah
  await evalIn(1, `window.__puncak.grip(true); return true`)
  await wait(600)
  // host berdiri di bibir atas; klien di dinding ±2,5 m di bawahnya
  await evalIn(0, `const r = window.__puncak, t = r.t
    const H = (x, z) => { const fx = (x + t.hx) / 0.5, fz = (z + t.hz) / 0.5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, h = (p, q) => t.h[q * t.nx + p]; return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v }
    Object.assign(r.bodies[0], { x: ${b.x}, z: ${b.z}, y: H(${b.x}, ${b.z}), mode: 'ground', vx: 0, vy: 0, vz: 0, yaw: Math.atan2(${-dx}, ${-dz}) })
    // titik dinding: menyusuri garis kaki→bibir sampai setinggi bibir − 2,5 m
    let px = ${a.x}, pz = ${a.z}
    for (let s = 0; s <= 1; s += 0.02) { px = ${a.x} + ${dx} * s; pz = ${a.z} + ${dz} * s; if (H(px, pz) > ${b.y} - 2.5) break }
    Object.assign(r.bodies[1], { x: px - ${dx / d} * 0.3, z: pz - ${dz / d} * 0.3, y: H(px, pz) - 0.2, mode: 'climb', vx: 0, vy: 0, vz: 0, nx: ${-dx / d}, ny: 0, nz: ${-dz / d}, yaw: Math.atan2(${dx}, ${dz}) })
    return true`)
  await wait(300)
  out.before = await evalIn(0, `const r = window.__puncak, p = r.bodies[1], h = r.bodies[0]; return { action: r.actionNear()?.label ?? null, dy: +(h.y - p.y).toFixed(2), d: +Math.hypot(h.x - p.x, h.z - p.z).toFixed(2), mode: p.mode }`)
  await evalIn(0, `window.__puncak.doAction(); return true`)
  const modes = []
  for (let k = 0; k < 10; k++) {
    await wait(120)
    modes.push(await evalIn(1, `return window.__puncak.body.mode`))
  }
  await evalIn(1, `window.__puncak.grip(false); return true`)
  await wait(800)
  out.modes = [...new Set(modes)]
  out.after = await evalIn(1, `const r = window.__puncak, me = r.body, h = r.posOf(0); return { mode: me.mode, dy: +(me.y - h.y).toFixed(2), d: +Math.hypot(h.x - me.x, h.z - me.z).toFixed(2) }`)
  out.hostStamina = await evalIn(0, `return +window.__puncak.bodies[0].stamina.toFixed(2)`)
  // HUD: bonus dari kopi + ransel terbuka
  await evalIn(1, `const r = window.__puncak; r.body.bonus = 0.4; r.body.fat.hunger = 0.12; r.body.fat.cold = 0.08; document.querySelector('[aria-label^="Ransel"]')?.click(); return true`)
  await wait(700)
  const shot = await tabs[1].send('Page.captureScreenshot', { format: 'png' })
  out.shot = shot.result?.data?.length ?? 0
  const { writeFileSync } = await import('node:fs')
  writeFileSync(process.env.SHOT ?? 'hud-coop.png', Buffer.from(shot.result.data, 'base64'))
  return out
}
