// Skenario: diam 6 dtk, lalu laporkan FPS & ping tiap tab (memeriksa apakah alat uji sendiri jadi hambatan)
export default async function ({ evalIn, wait, n }) {
  await wait(6000)
  const out = []
  for (let s = 0; s < n; s++) out.push(await evalIn(s, `const r = window.__puncak; const st = r.netStats(); return { seat: ${s}, fps: r.fps, rtt: st.rtt && Math.round(st.rtt), snaps: st.snaps, missed: st.missed }`))
  return out
}
