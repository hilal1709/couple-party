import { useState } from 'react'
import { init, reduce } from './games/uno/engine'
import type { UnoAction, Variant } from './games/uno/types'
import { defaultOptions } from './games/uno/engine'
import { UnoTable } from './games/uno/ui/UnoTable'

/** Hanya untuk development: meja UNO lokal tanpa jaringan (dipakai untuk tangkapan layar review). */
export function Demo({ variant }: { variant: Variant }) {
  // ?turn=lawan menampilkan meja saat giliran lawan
  const viewOther = new URLSearchParams(location.search).get('turn') === 'lawan'
  const [s, setS] = useState(() => init(42, defaultOptions(variant)))
  const act = (a: UnoAction) => setS((cur) => reduce(cur, a, cur.turn))
  return <UnoTable state={s} seat={viewOther ? (s.turn === 0 ? 1 : 0) : s.turn} names={['Andi', 'Sari']} partnerOnline act={act} exit={() => {}} />
}
