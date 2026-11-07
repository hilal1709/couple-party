// Skenario: pemain 1 jatuh dari tinggi sampai pingsan; semua HP harus melihat pingsannya;
// host berjalan ke dekatnya dan membangunkan; pemain 1 bangun di HP-nya sendiri.
// Juga: semua pemain bergerak bersamaan (4 pemain), lalu diukur selisih tampilan & koreksi.
export default async function ({ evalIn, wait, n }) {
  const out = { n }
  // semua jalan berputar-putar bersamaan selama 4 dtk (gerak + belok + lompat)
  for (let s = 0; s < n; s++) await evalIn(s, `const r = window.__puncak; let k = 0; window.__drive = setInterval(() => { k++; r.setMove(Math.sin(k * 0.15 + ${s}), Math.cos(k * 0.15)); if (k % 25 === 0) r.jump(); }, 50); return true`)
  await wait(4000)
  for (let s = 0; s < n; s++) await evalIn(s, `clearInterval(window.__drive); window.__puncak.setMove(0, 0); return true`)
  await wait(1200)
  out.moving = []
  for (let s = 0; s < n; s++) out.moving.push(await evalIn(s, `const r = window.__puncak; const st = r.netStats(); return { seat: ${s}, me: [+r.body.x.toFixed(2), +r.body.z.toFixed(2)], agreed: st.agreed, corrected: st.corrected, missed: st.missed, snaps: st.snaps, rtt: st.rtt && Math.round(st.rtt), view: r.s.actors.map((_, i) => { const p = i === r.me ? r.body : r.posOf(i); return [+p.x.toFixed(2), +p.z.toFixed(2)] }) }`))
  // host menjatuhkan pemain 1 dari 30 m (host = otoritas badan)
  await evalIn(0, `const r = window.__puncak; const b = r.bodies[1]; b.y += 30; b.peak = b.y; b.mode = 'air'; b.vy = 0; return true`)
  let seenDown = null
  for (let k = 0; k < 12 && !seenDown; k++) {
    await wait(500)
    const views = []
    for (let s = 0; s < n; s++) views.push(await evalIn(s, `const r = window.__puncak; return { down: r.mount.down[1] !== null, mode: 1 === r.me ? r.body.mode : r.modeOf(1) }`))
    if (views.every((v) => v.down)) seenDown = views
  }
  out.downEverywhere = seenDown
  // host berjalan (dipindah) ke samping pemain 1 lalu menekan Bangunkan
  out.reviveAction = await evalIn(0, `const r = window.__puncak; const t = r.bodies[1]; Object.assign(r.body, { x: t.x + 1, y: t.y, z: t.z, mode: 'ground' }); await new Promise((q) => setTimeout(q, 300)); const a = r.actionNear(); r.doAction(); return a`)
  await wait(2000)
  out.afterRevive = await evalIn(1, `const r = window.__puncak; return { down: r.mount.down[1] !== null, mode: r.body.mode }`)
  return out
}
