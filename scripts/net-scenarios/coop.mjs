// Skenario kerja sama (2 pemain, host = 0, klien = 1), Punggung Hijau:
// ransel di HP klien, lempar–tangkap, pingsan kelelahan → digendong ke api unggun → bangun,
// api unggun menunggu semua pendaki. Badan klien dipindah di HOST (otoritas), bukan di HP klien.
export default async function ({ evalIn, wait }) {
  const out = {}
  const put = (seat, who, x, z, extra = '') =>
    evalIn(seat, `const r = window.__puncak, t = r.t, b = r.bodies[${who}]
      const fx = (${x} + t.hx) / 0.5, fz = (${z} + t.hz) / 0.5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j
      const H = (a, c) => t.h[c * t.nx + a]
      const y = H(i, j) * (1 - u) * (1 - v) + H(i + 1, j) * u * (1 - v) + H(i, j + 1) * (1 - u) * v + H(i + 1, j + 1) * u * v
      Object.assign(b, { x: ${x}, y: y + 0.05, z: ${z}, vx: 0, vy: 0, vz: 0, mode: 'ground', peak: y }); ${extra}; return true`)
  const camp = (k) => evalIn(0, `const c = window.__puncak.t.camps[${k}]; return [c.x, c.y, c.z]`)

  // 1. ransel di HP klien: kapur saku → ransel, lalu roti ransel → saku
  out.bagStart = await evalIn(1, `const r = window.__puncak; return { inv: r.mount.inv[r.me], bag: r.mount.bag[r.me] }`)
  await evalIn(1, `window.__puncak.stashSlot(1); return true`)
  await wait(1500)
  await evalIn(1, `window.__puncak.unstashSlot(0); return true`)
  await wait(1500)
  out.bagEnd = await evalIn(1, `const r = window.__puncak; return { inv: r.mount.inv[r.me], bag: r.mount.bag[r.me], hudBag: r.mount.bag[r.me].filter(Boolean).length }`)

  // 2. lempar: host melempar sekali ke tanah kosong (catat titik jatuh), lalu klien berdiri di sana & host melempar lagi
  const [cx, , cz] = await camp(0)
  await put(0, 0, cx, cz + 3, 'b.yaw = 0; r.camYaw = 0')
  await put(0, 1, cx + 30, cz + 3)
  await wait(800)
  await evalIn(0, `window.__puncak.throwSlot(0); return true`)
  await wait(900)
  const land = await evalIn(0, `const d = window.__puncak.mount.drops.at(-1); return d ? [d.x, d.z, d.item] : null`)
  out.throwLand = land
  await evalIn(0, `const r = window.__puncak; r.mount.inv[0][0] = 'sate'; r.dirty = true; return true`)
  await put(0, 1, land[0], land[1])
  await put(0, 0, cx, cz + 3, 'b.yaw = 0; r.camYaw = 0')
  await wait(1200)
  await evalIn(0, `window.__puncak.throwSlot(0); return true`)
  await wait(2000)
  out.caught = await evalIn(1, `const r = window.__puncak; return [...r.mount.inv[r.me], ...r.mount.bag[r.me]].includes('sate')`)

  // 3. klien pingsan kelelahan di hutan; host menggendongnya ke api unggun 0 (menyala) → bangun
  const [hx, , hz] = await camp(1)
  await put(0, 1, hx, hz - 20, 'b.fat.fall = 0.6; b.fat.hunger = 0.45')
  await wait(1500)
  out.spentDown = await evalIn(1, `const r = window.__puncak; return { down: r.mount.down[r.me] !== null, spent: r.mount.spent[r.me], mode: r.body.mode }`)
  await put(0, 0, hx + 1, hz - 20)
  await wait(600)
  out.hostAction = await evalIn(0, `const a = window.__puncak.actionNear(); return a && a.label`)
  await evalIn(0, `window.__puncak.doAction(); return true`)
  await wait(800)
  out.carrying = await evalIn(0, `const r = window.__puncak; return { carry: r.mount.carry[0], hud: r.actionNear()?.label }`)
  // berjalan (dipindah) ke api unggun 0: klien ikut di punggung
  await put(0, 0, cx + 1.5, cz)
  await wait(400)
  out.onBack = await evalIn(0, `const r = window.__puncak, a = r.bodies[0], b = r.bodies[1]; return Math.round(Math.hypot(a.x - b.x, a.z - b.z) * 100) / 100`)
  await wait(1500)
  out.afterCamp = await evalIn(1, `const r = window.__puncak; return { down: r.mount.down[r.me] !== null, mode: r.body.mode, max: Math.round((1 - (r.body.fat.fall + r.body.fat.hunger + r.body.fat.cold)) * 100) }`)

  // 4. api unggun 1 menunggu dua pendaki
  await put(0, 0, hx, hz)
  await put(0, 1, cx + 2, cz)
  await wait(1500)
  out.waitAlone = await evalIn(0, `const r = window.__puncak; return { lit: r.mount.lit, wait: r.campWait() }`)
  await put(0, 1, hx + 1.5, hz + 0.5)
  await wait(1500)
  out.litTogether = await evalIn(1, `const r = window.__puncak; return { lit: r.mount.lit }`)
  return out
}
