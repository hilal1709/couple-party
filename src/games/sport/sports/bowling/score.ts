/** Aturan skor bowling untuk jumlah frame berapa pun; frame terakhir boleh sampai 3 lemparan. */

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

/** Sudah selesaikah frame ini? */
export function frameDone(rolls: number[], last: boolean) {
  if (!last) return rolls[0] === 10 || rolls.length === 2
  if (rolls.length < 2) return false
  return rolls.length === 3 || rolls[0] + rolls[1] < 10
}

/** Pin perlu didirikan ulang setelah lemparan ini? */
export function resetPins(rolls: number[], last: boolean) {
  if (!last) return false
  if (rolls.length === 1) return rolls[0] === 10
  const [a, b] = rolls
  if (rolls.length === 2) return a === 10 ? b === 10 : a + b === 10
  return true
}

/** Skor kumulatif per frame; null = belum bisa dihitung (bonus menunggu lemparan berikutnya). */
export function runningScores(frames: number[][], total: number): (number | null)[] {
  const flat = frames.flat()
  const out: (number | null)[] = []
  let at = 0
  let run = 0
  for (let f = 0; f < total; f++) {
    const r = frames[f] ?? []
    const last = f === total - 1
    if (!frameDone(r, last)) {
      out.push(null)
      continue
    }
    if (last) run += sum(r)
    else {
      const bonus = r[0] === 10 ? 2 : r[0] + r[1] === 10 ? 1 : 0
      const span = r.length + bonus
      if (at + span > flat.length) {
        out.push(null)
        at += r.length
        continue
      }
      run += sum(flat.slice(at, at + span))
    }
    at += r.length
    out.push(run)
  }
  return out
}

export function totalScore(frames: number[][], total: number) {
  return runningScores(frames, total).reduce<number>((best, v) => v ?? best, 0)
}

/** Tanda di kotak skor: X, /, -, atau angka. */
export function rollMarks(rolls: number[], last: boolean): string[] {
  return rolls.map((v, i) => {
    if (v === 0) return '-'
    const fresh = i === 0 || (last && (rolls[i - 1] === 10 || (i === 2 && rolls[0] + rolls[1] === 10)))
    if (fresh) return v === 10 ? 'X' : String(v)
    return rolls[i - 1] + v === 10 ? '/' : String(v)
  })
}
