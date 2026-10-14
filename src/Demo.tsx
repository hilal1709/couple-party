import { useState } from 'react'
import { defaultOptions, init, reduce } from './games/uno/engine'
import type { UnoAction, Variant } from './games/uno/types'
import { UnoTable } from './games/uno/ui/UnoTable'

const NAMES = ['Andi', 'Sari', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita']

/**
 * Hanya untuk development: meja UNO lokal tanpa jaringan (tangkapan layar review).
 * ?demo=classic|flip|noMercy  &n=2..8 jumlah pemain  &turn=lawan untuk melihat dari kursi yang bukan giliran.
 */
export function Demo({ variant }: { variant: Variant }) {
  const q = new URLSearchParams(location.search)
  const n = Math.min(8, Math.max(2, Number(q.get('n') ?? 2)))
  const viewOther = q.get('turn') === 'lawan'
  const [s, setS] = useState(() => init(42, defaultOptions(variant, n)))
  const act = (a: UnoAction) => setS((cur) => reduce(cur, a, cur.turn))
  const seat = viewOther ? (s.turn + 1) % n : s.turn
  return <UnoTable state={s} seat={seat} names={NAMES.slice(0, n)} online={Array(n).fill(true)} act={act} exit={() => {}} />
}
