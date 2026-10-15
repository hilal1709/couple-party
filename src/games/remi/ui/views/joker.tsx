import { Slab } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import { highAce, suitIndex } from '../../cards'
import { jokerTarget } from '../../modes/joker'
import type { JokerState } from '../../types'
import { CardBack } from '../CardFace'
import { who } from '../copy'
import { CardRow, Tag } from './bits'
import type { ModeView } from './types'

export const jokerView: ModeView<JokerState> = {
  playable: () => [],
  pick: 'none',
  // urutkan per angka supaya kelihatan kartu mana yang belum berpasangan
  sort: (c) => [...c].sort((a, b) => highAce(a.r) - highAce(b.r) || suitIndex(a.s) - suitIndex(b.s)),
  status(m, seat, names) {
    if (!m.hands[seat].length) return 'Kamu sudah aman!'
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    return `Comot kartu ${names[jokerTarget(m, seat)]}`
  },
  me: (m, seat) => (m.hands[seat].some((c) => c.s === 'X') ? 'Joker ada di tanganmu… sstt' : 'tanganmu bebas Joker'),

  Center({ m, seat, names, act }) {
    const target = jokerTarget(m, seat)
    const mine = m.turn === seat
    const showFor = mine ? target : jokerTarget(m, m.turn)
    const cards = m.hands[showFor]
    const n = cards.length
    const step = Math.min(38, 360 / Math.max(n, 1))
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="bg-paper px-1 text-[12px] font-bold">
          {mine ? `Pilih satu kartu ${names[target]}:` : `${who(m.turn, seat, names)} lagi milih kartu ${who(showFor, seat, names)}`}
        </span>
        <div className="relative h-[72px]" style={{ width: Math.max(0, n - 1) * step + 46 }}>
          {cards.map((c, i) => (
            <button
              key={c.id}
              disabled={!mine}
              onClick={() => act({ t: 'pick', i })}
              aria-label={`Kartu ke-${i + 1}`}
              className={cn('absolute top-1 transition-transform', mine && 'hover:-translate-y-2 active:-translate-y-1')}
              style={{ left: i * step, transform: `rotate(${(i - (n - 1) / 2) * 3}deg)` }}
            >
              <CardBack width={46} />
            </button>
          ))}
        </div>
        {m.last?.paired && (
          <div className="flex items-center gap-2">
            <CardRow cards={m.last.paired} width={22} step={15} />
            <Tag tone="electric">{who(m.last.by, seat, names)} dapat pasangan</Tag>
          </div>
        )}
      </div>
    )
  },

  Actions({ m, seat, act }) {
    if (m.hands[seat].length < 2) return null
    return (
      <Slab tone="paper" size="sm" onClick={() => act({ t: 'shuffle' })}>
        Acak kartuku
      </Slab>
    )
  },

  SeatInfo: ({ m, who: o }) => (m.finished.includes(o) ? <Tag tone="electric">aman</Tag> : null),
}
