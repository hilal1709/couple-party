/** pola getar per kejadian (ms); pendek supaya tidak mengganggu */
const PATTERN = {
  grab: 12,
  land: 18,
  hardLand: [30, 40, 50],
  slip: [20, 30, 20],
  lunge: 25,
  down: [60, 60, 120],
  pickup: 10,
} satisfies Record<string, number | number[]>

export type Buzz = keyof typeof PATTERN

let enabled = true
let last = 0

export function setHaptics(on: boolean) {
  enabled = on
}

/** getar singkat; dibatasi 1 per 80 ms supaya kejadian beruntun tidak jadi dengung panjang */
export function buzz(kind: Buzz) {
  if (!enabled || typeof navigator.vibrate !== 'function') return
  const now = performance.now()
  if (now - last < 80) return
  last = now
  try {
    navigator.vibrate(PATTERN[kind])
  } catch {
    // WebView tanpa izin VIBRATE: diam saja
  }
}
