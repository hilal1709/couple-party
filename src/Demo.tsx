import { useState } from 'react'
import { defaultOptions, init, reduce } from './games/uno/engine'
import type { UnoAction, Variant } from './games/uno/types'
import { UnoTable } from './games/uno/ui/UnoTable'
import * as drawEngine from './games/draw/engine'
import type { DrawAction } from './games/draw/types'
import { DrawBoard } from './games/draw/ui/DrawBoard'

const NAMES = ['Andi', 'Sari', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita']

/**
 * Hanya untuk development: meja UNO lokal tanpa jaringan (tangkapan layar review).
 * ?demo=classic|flip|noMercy  &n=2..8 jumlah pemain  &turn=lawan untuk melihat dari kursi yang bukan giliran.
 */
export function Demo({ variant }: { variant: Variant | 'draw' }) {
  if (variant === 'draw') return <DrawDemo />
  return <UnoDemo variant={variant} />
}

/**
 * Tebak Gambar lokal: ?demo=draw&n=2..8 &seat=kursi yang dilihat &phase=draw (langsung menggambar).
 * Tombol kursi di pojok kanan bawah untuk pindah sudut pandang.
 */
function DrawDemo() {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 3)))
  const [seat, setSeat] = useState(() => Math.min(n - 1, Number(q.get('seat') ?? 0)))
  const [s, setS] = useState(() => {
    const st = drawEngine.init(42, { ...drawEngine.defaultOptions(), players: n })
    return q.get('phase') === 'draw' ? drawEngine.reduce(st, { type: 'pick', i: 0 }, 0) : st
  })
  // timeUp & next hanya sah dari host (kursi 0)
  const act = (a: DrawAction) => setS((cur) => drawEngine.reduce(cur, a, a.type === 'timeUp' || a.type === 'next' ? 0 : seat))
  return (
    <>
      <DrawBoard state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
      <div className="fixed bottom-1 left-1/2 z-50 flex -translate-x-1/2 gap-1 opacity-60">
        {NAMES.slice(0, n).map((nm, i) => (
          <button key={nm} onClick={() => setSeat(i)} className={`border-2 border-ink px-1 text-[10px] ${i === seat ? 'bg-electric' : 'bg-paper'}`}>
            {i}
          </button>
        ))}
      </div>
    </>
  )
}

function UnoDemo({ variant }: { variant: Variant }) {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 2)))
  const viewOther = q.get('turn') === 'lawan'
  const [s, setS] = useState(() => init(42, defaultOptions(variant, n)))
  const act = (a: UnoAction) => setS((cur) => reduce(cur, a, cur.turn))
  const seat = viewOther ? (s.turn + 1) % n : s.turn
  return <UnoTable state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
}
