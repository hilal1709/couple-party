import { useState } from 'react'
import { Slab } from '@/components/memphis/Slab'
import { sortHand } from '../../cards'
import { minRaiseTo, toCall } from '../../modes/poker'
import type { PokerState } from '../../types'
import { sprite } from '../art'
import { CardBack, CardFace } from '../CardFace'
import { streetName } from '../copy'
import { CardRow, Chips, Tag } from './bits'
import type { ModeView } from './types'

const pot = (m: PokerState) => m.committed.reduce((a, b) => a + b, 0)

export const pokerView: ModeView<PokerState> = {
  playable: () => [],
  pick: 'none',
  sort: (c) => sortHand(c),
  status(m, seat, names) {
    if (m.result) return 'Showdown!'
    if (!m.inHand[seat]) return 'Kamu bangkrut'
    if (m.folded[seat]) return 'Kamu fold, nonton dulu'
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    return toCall(m, seat) > 0 ? `Call ${toCall(m, seat)}?` : 'Check atau raise'
  },
  me: (m, seat) => [m.bet[seat] ? `taruhan ${m.bet[seat]}` : '', seat === m.dealer ? 'dealer' : ''].filter(Boolean).join(' · ') || 'tunggu giliran',

  Center({ m, s }) {
    const slots = Array.from({ length: 5 }, (_, i) => m.board[i])
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {slots.map((c, i) =>
            c ? <CardFace key={c.id} card={c} width={46} /> : <CardBack key={i} width={46} className="opacity-40" />,
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tag tone="electric">{streetName(m.street)}</Tag>
          <span className="flex items-center gap-1 border-[3px] border-ink bg-paper px-2 py-0.5 shadow-slab-sm">
            <span className="font-display text-[11px] uppercase">Pot</span>
            <Chips amount={pot(m)} />
          </span>
          <Tag>
            Blind {s.opts.blind / 2}/{s.opts.blind}
          </Tag>
        </div>
      </div>
    )
  },

  Actions({ m, seat, act, s }) {
    const [extra, setExtra] = useState(0)
    if (m.result || m.turn !== seat || m.folded[seat] || !m.inHand[seat]) return null
    const need = toCall(m, seat)
    const maxTo = m.bet[seat] + m.stack[seat]
    const minTo = Math.min(maxTo, minRaiseTo(m))
    const to = Math.min(maxTo, minTo + extra)
    const step = s.opts.blind
    const canRaise = maxTo > m.high
    return (
      <>
        <div className="flex gap-2">
          <Slab tone="paper" size="sm" className="flex-1" onClick={() => act({ t: 'fold' })}>
            Fold
          </Slab>
          <Slab tone="grass" size="sm" className="flex-1" onClick={() => act(need > 0 ? { t: 'call' } : { t: 'check' })}>
            {need > 0 ? `Call ${need}` : 'Check'}
          </Slab>
        </div>
        {canRaise && (
          <div className="flex items-center gap-1">
            <button aria-label="Kurangi raise" className="grid size-8 place-items-center border-[3px] border-ink bg-paper font-display" onClick={() => setExtra(Math.max(0, extra - step))}>
              −
            </button>
            <Slab
              tone="rose"
              size="sm"
              className="flex-1 px-1"
              onClick={() => {
                act(to >= maxTo ? { t: 'allin' } : { t: 'raise', to })
                setExtra(0)
              }}
            >
              {to >= maxTo ? 'All-in' : `Raise ${to}`}
            </Slab>
            <button aria-label="Tambah raise" className="grid size-8 place-items-center border-[3px] border-ink bg-paper font-display" onClick={() => setExtra(Math.min(maxTo - minTo, extra + step))}>
              +
            </button>
          </div>
        )}
        {canRaise && to < maxTo && (
          <Slab tone="ink" size="sm" onClick={() => act({ t: 'allin' })}>
            All-in {maxTo}
          </Slab>
        )}
      </>
    )
  },

  SeatInfo({ m, who: o }) {
    const shown = m.result?.shown && m.inHand[o] && !m.folded[o]
    return (
      <div className="flex items-center gap-1">
        {shown ? (
          <CardRow cards={m.hands[o]} width={20} step={14} />
        ) : (
          o === m.dealer && <img src={sprite('dealer-btn')} alt="Dealer" className="size-4" draggable={false} />
        )}
        {!m.inHand[o] ? (
          <Tag tone="ink">bangkrut</Tag>
        ) : m.folded[o] ? (
          <Tag tone="ink">fold</Tag>
        ) : m.stack[o] === 0 ? (
          <Tag tone="rose">all-in</Tag>
        ) : m.bet[o] ? (
          <Chips amount={m.bet[o]} size={12} />
        ) : null}
        {shown && m.result?.names[o] && <span className="text-[9px] font-bold">{m.result.names[o]}</span>}
      </div>
    )
  },
}
