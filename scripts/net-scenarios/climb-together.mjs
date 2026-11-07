// Skenario: semua pemain manusia berjalan ke tebing pertama lalu memanjat bersama.
// Diperiksa: host melihat gerak & mode tiap klien; klien melihat host & klien lain; prediksi jarang dikoreksi;
// klien yang curang memindahkan badannya sendiri dikembalikan host.
const setup = `
  const r = window.__puncak; const t = r.t;
  const i = t.route.findIndex((p) => p.climb); const foot = t.route[i - 1]; const top = t.route[i];
  const d = Math.hypot(top.x - foot.x, top.z - foot.z);
  r.camYaw = Math.atan2(top.x - foot.x, top.z - foot.z);
`

export default async function ({ evalIn, wait, n }) {
  const out = {}
  // semua pemain: dorong maju ke tebing sambil menahan Pegang dan naik
  for (let s = 0; s < n; s++) await evalIn(s, setup + `r.grip(true); r.setMove(0, 1); return true`)
  const samples = []
  for (let k = 0; k < 8; k++) {
    await wait(1000)
    const row = []
    for (let s = 0; s < n; s++) {
      row.push(
        await evalIn(
          s,
          `const r = window.__puncak;
           const me = r.me;
           const view = r.s.actors.map((a, i) => { const p = i === me ? r.body : r.posOf(i); return [i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), i === me ? r.body.mode : r.modeOf(i)] });
           return { seat: ${s}, view, net: r.netStats(), anims: r.anims }`,
        ),
      )
    }
    samples.push(row)
  }
  // selisih: posisi tiap manusia menurut host vs menurut dirinya sendiri vs menurut klien lain
  const last = samples[samples.length - 1]
  const host = last[0]
  out.final = last.map((r) => ({ seat: r.seat, net: r.net, me: r.view.find(([i]) => i === r.seat), anims: r.anims }))
  out.disagree = []
  for (let a = 0; a < n; a++) {
    const truth = host.view.find(([i]) => i === a)
    for (const r of last) {
      const seen = r.view.find(([i]) => i === a)
      out.disagree.push({ actor: a, viewer: r.seat, dist: +Math.hypot(truth[1] - seen[1], truth[2] - seen[2], truth[3] - seen[3]).toFixed(2), modeHost: truth[4], modeSeen: seen[4] })
    }
  }
  out.climbedOnHost = host.view.filter(([i]) => i < n).map(([i, , y, , mode]) => ({ actor: i, y, mode }))
  // klien 1 curang: pindahkan badannya 40 m ke atas di HP-nya sendiri
  await evalIn(1, `const r = window.__puncak; r.body.y += 40; return true`)
  await wait(1500)
  out.cheat = await evalIn(1, `const r = window.__puncak; return { y: +r.body.y.toFixed(2), corrected: r.netStats().corrected }`)
  out.cheatHostView = await evalIn(0, `const r = window.__puncak; return +r.posOf(1).y.toFixed(2)`)
  return out
}
