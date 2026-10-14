/** RNG dengan seed (mulberry32), disimpan di state supaya reducer tetap deterministik & bisa dites. */
export function nextRand(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0
  const nextSeed = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextSeed]
}

export function shuffle<T>(items: T[], seed: number): [T[], number] {
  const arr = [...items]
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    const [r, ns] = nextRand(s)
    s = ns
    const j = Math.floor(r * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return [arr, s]
}
