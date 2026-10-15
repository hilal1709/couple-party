import { Slab } from '@/components/memphis/Slab'
import { cardLabel } from '../../cards'
import { beats, btValue, comboOf } from '../../modes/bigtwo'
import type { BigTwoState, Card, ComboKind } from '../../types'
import { who } from '../copy'
import { CardRow, Tag } from './bits'
import type { ModeView } from './types'

export const COMBO_NAME: Record<ComboKind, string> = {
  single: 'Satu',
  pair: 'Pair',
  triple: 'Triple',
  straight: 'Straight',
  flush: 'Flush',
  full: 'Full house',
  four: 'Four of a kind',
  sflush: 'Straight flush',
}

function selection(m: BigTwoState, seat: number, sel: string[]) {
  const cards = sel.map((id) => m.hands[seat].find((c) => c.id === id)).filter(Boolean) as Card[]
  const combo = cards.length ? comboOf(cards) : null
  let why = ''
  if (!cards.length) why = 'Pilih kartu dulu'
  else if (!combo) why = 'Bukan kombinasi sah'
  else if (m.mustInclude && !sel.includes(m.mustInclude)) {
    const c = m.hands[seat].find((x) => x.id === m.mustInclude)
    why = `Wajib pakai ${c ? cardLabel(c) : 'kartu terendah'}`
  } else if (m.table && !beats(combo, m.table.combo)) why = m.table.combo.size !== combo.size ? `Harus ${m.table.cards.length} kartu` : 'Kurang tinggi'
  return { combo, why }
}

export const bigtwoView: ModeView<BigTwoState> = {
  playable: (m, seat) => (m.turn === seat ? m.hands[seat].map((c) => c.id) : []),
  pick: 'select',
  maxSelect: 5,
  sort: (c) => [...c].sort((a, b) => btValue(a) - btValue(b)),
  status(m, seat, names) {
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    if (m.mustInclude) return 'Buka pakai kartu terendah'
    return m.table ? 'Kalahkan atau pass' : 'Bebas jalan!'
  },
  me: () => '3 terendah … 2 tertinggi · ♦ < ♣ < ♥ < ♠',

  Center({ m, seat, names }) {
    return (
      <div className="flex flex-col items-center gap-2">
        {m.table ? (
          <>
            <CardRow cards={m.table.cards} width={50} step={34} />
            <Tag tone="electric">
              {who(m.table.by, seat, names)} · {COMBO_NAME[m.table.combo.kind]}
            </Tag>
          </>
        ) : (
          <Tag tone="paper" className="text-[12px]">
            Meja bersih · {who(m.turn, seat, names)} bebas jalan
          </Tag>
        )}
      </div>
    )
  },

  Actions({ m, seat, sel, setSel, act }) {
    if (m.turn !== seat) return null
    const { combo, why } = selection(m, seat, sel)
    return (
      <>
        <Slab
          tone="rose"
          size="sm"
          disabled={!!why}
          onClick={() => {
            act({ t: 'play', ids: sel })
            setSel([])
          }}
        >
          {combo && !why ? `Banting ${COMBO_NAME[combo.kind]}` : 'Banting'}
        </Slab>
        {why && sel.length > 0 && <span className="text-center text-[11px] font-bold">{why}</span>}
        {m.table && (
          <Slab
            tone="paper"
            size="sm"
            onClick={() => {
              act({ t: 'pass' })
              setSel([])
            }}
          >
            Pass
          </Slab>
        )}
      </>
    )
  },

  SeatInfo: ({ m, who: o }) => (m.passed[o] ? <Tag tone="ink">pass</Tag> : null),
}
