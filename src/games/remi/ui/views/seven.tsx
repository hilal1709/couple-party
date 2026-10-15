import { SUITS, sortHand, SUIT_SYMBOL } from '../../cards'
import { sevenPenalty, sevenPlayable } from '../../modes/seven'
import type { Card, SevenState } from '../../types'
import { CardFace, SUIT_HEX } from '../CardFace'
import { Tag } from './bits'
import type { ModeView } from './types'

const aceLow = (c: Card) => c.r

export const sevenView: ModeView<SevenState> = {
  playable(m, seat) {
    if (m.turn !== seat) return []
    const ok = sevenPlayable(m, seat)
    // tidak bisa jalan: semua kartu boleh dipilih untuk ditutup
    return ok.length ? ok : m.hands[seat].map((c) => c.id)
  },
  pick: 'tap',
  tap(m, id, act, seat) {
    act(sevenPlayable(m, seat).length ? { t: 'play', id } : { t: 'close', id })
  },
  sort: (c) => sortHand(c, aceLow),
  status(m, seat, names) {
    if (!m.hands[seat].length) return 'Kartumu habis'
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    if (!Object.values(m.rows).some(Boolean)) return 'Buka pakai 7 Hati'
    return sevenPlayable(m, seat).length ? 'Pasang satu kartu' : 'Buntu! Tutup satu kartu'
  },
  me: (m, seat) => `minus ${sevenPenalty(m.closed[seat])} dari ${m.closed[seat].length} kartu tertutup`,

  Center({ m }) {
    return (
      <div className="flex flex-col gap-0.5">
        {SUITS.map((s) => {
          const row = m.rows[s]
          return (
            <div key={s} className="flex items-center gap-1">
              <span className="w-4 text-center font-display text-sm" style={{ color: SUIT_HEX[s] }}>
                {SUIT_SYMBOL[s]}
              </span>
              <div className="flex">
                {Array.from({ length: 13 }, (_, i) => i + 1).map((r) => {
                  const on = row && r >= row.lo && r <= row.hi
                  return on ? (
                    <span key={r} className="-mr-1">
                      <CardFace card={{ id: `${s}${r}`, s, r }} width={21} />
                    </span>
                  ) : (
                    <span key={r} className="-mr-1 block h-[29.4px] w-[21px] rounded-[4px] border-2 border-dashed border-ink/15" />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  },

  Actions({ m, seat }) {
    if (m.turn !== seat || sevenPlayable(m, seat).length || !m.hands[seat].length) return null
    return <span className="text-center text-[12px] font-bold">Sentuh kartu yang mau ditutup. Pilih angka kecil biar minusnya sedikit.</span>
  },

  SeatInfo: ({ m, who: o }) => (m.closed[o].length ? <Tag tone="ink">{m.closed[o].length} tutup</Tag> : null),
}
