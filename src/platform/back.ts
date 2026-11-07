/**
 * Tombol kembali Android. MainActivity memanggil `window.__cpBack()`: kalau ada layar yang
 * menangani (mengembalikan true), aplikasi tidak ditutup. Tanpa penangan, perilaku bawaan Android
 * berjalan (aplikasi ke latar belakang). Di desktop, tombol Escape memicu penangan yang sama.
 */
type Handler = () => void

const stack: Handler[] = []

declare global {
  interface Window {
    __cpBack?: () => boolean
  }
}

function fire(): boolean {
  const h = stack[stack.length - 1]
  if (!h) return false
  h()
  return true
}

if (typeof window !== 'undefined') {
  window.__cpBack = fire
  window.addEventListener('keydown', (e) => {
    // dialog Radix menutup dirinya sendiri dengan Escape; jangan ikut memicu penangan
    if (e.key !== 'Escape' || e.repeat || document.querySelector('[role="dialog"]')) return
    if (fire()) e.preventDefault()
  })
}

/** daftarkan penangan paling atas; kembalikan fungsi untuk melepasnya */
export function onBack(h: Handler): () => void {
  stack.push(h)
  return () => {
    const i = stack.lastIndexOf(h)
    if (i >= 0) stack.splice(i, 1)
  }
}
