/** naik sedikit tiap paket (ms): selisih jam ikut pulih kalau jaringan memang melambat */
const CLOCK_DRIFT = 2

/**
 * Selisih jam HP pengirim → HP ini, diambil dari paket tercepat.
 * Paket yang telat tetap mendapat waktu aslinya, jadi jitter jaringan tidak ikut menjadi gerakan.
 */
export function syncClock(off: number | null, sample: number): number {
  return off === null ? sample : Math.min(sample, off + CLOCK_DRIFT)
}

/** kurva melewati dua titik mengikuti kecepatan di ujungnya (detik `h`), supaya tikungan tidak bersudut */
export function hermite(p0: number, v0: number, p1: number, v1: number, f: number, h: number): number {
  const f2 = f * f
  const f3 = f2 * f
  return (2 * f3 - 3 * f2 + 1) * p0 + (f3 - 2 * f2 + f) * h * v0 + (3 * f2 - 2 * f3) * p1 + (f3 - f2) * h * v1
}
