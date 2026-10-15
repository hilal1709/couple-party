import { Slab } from '@/components/memphis/Slab'
import { bjTotal, isBlackjack, MIN_BET } from '../../modes/blackjack'
import type { BlackjackState } from '../../types'
import { sprite } from '../art'
import { BJ_TEXT } from '../copy'
import { CardRow, Chips, Tag } from './bits'
import type { ModeView } from './types'

const BETS = [10, 50, 100, 250]

export const blackjackView: ModeView<BlackjackState> = {
  playable: () => [],
  pick: 'none',
  sort: (c) => c,
  status(m, seat, names) {
    if (m.results[seat] === 'out') return 'Kamu bangkrut'
    if (m.step === 'bet') return m.bets[seat] ? 'Nunggu yang lain pasang' : 'Pasang taruhan'
    if (m.step === 'done') return m.results[seat] ? BJ_TEXT[m.results[seat]!] : 'Selesai'
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    return `Total ${bjTotal(m.hands[seat]).total}. Hit?`
  },
  me(m, seat) {
    const t = m.hands[seat].length ? ` · total ${bjTotal(m.hands[seat]).total}` : ''
    return `${m.bets[seat] ? `taruhan ${m.bets[seat]}` : 'belum pasang'}${t}`
  },

  Center({ m }) {
    const hide = m.step === 'play'
    const shown = hide ? m.dealer.slice(0, 1) : m.dealer
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <img src={sprite('deck')} alt="" className="h-12 w-auto" draggable={false} />
          {m.dealer.length ? <CardRow cards={m.dealer} width={46} step={32} hidden={hide ? m.dealer.length - 1 : 0} /> : <Tag>Bandar nunggu taruhan</Tag>}
        </div>
        {m.dealer.length > 0 && (
          <Tag tone={!hide && bjTotal(m.dealer).total > 21 ? 'rose' : 'electric'}>
            Bandar {hide ? `${bjTotal(shown).total} + ?` : isBlackjack(m.dealer) ? 'blackjack' : bjTotal(m.dealer).total > 21 ? 'bust!' : bjTotal(m.dealer).total}
          </Tag>
        )}
      </div>
    )
  },

  Actions({ m, seat, act }) {
    if (m.results[seat] === 'out') return null
    if (m.step === 'bet') {
      if (m.bets[seat]) return <Chips amount={m.bets[seat]} className="self-center" />
      const stack = m.stack[seat]
      return (
        <div className="grid grid-cols-2 gap-2">
          {BETS.filter((b) => b <= stack).map((b) => (
            <Slab key={b} tone="paper" size="sm" onClick={() => act({ t: 'bet', amount: b })}>
              {b}
            </Slab>
          ))}
          <Slab tone="ink" size="sm" className="col-span-2" disabled={stack < Math.min(MIN_BET, stack)} onClick={() => act({ t: 'bet', amount: stack })}>
            All-in {stack}
          </Slab>
        </div>
      )
    }
    if (m.step !== 'play' || m.turn !== seat || m.done[seat]) return null
    const canDouble = m.hands[seat].length === 2 && m.stack[seat] >= m.bets[seat]
    return (
      <>
        <div className="flex gap-2">
          <Slab tone="rose" size="sm" className="flex-1" onClick={() => act({ t: 'hit' })}>
            Hit
          </Slab>
          <Slab tone="grass" size="sm" className="flex-1" onClick={() => act({ t: 'stand' })}>
            Stand
          </Slab>
        </div>
        {canDouble && (
          <Slab tone="paper" size="sm" onClick={() => act({ t: 'double' })}>
            Double ({m.bets[seat]})
          </Slab>
        )}
      </>
    )
  },

  SeatInfo({ m, who: o }) {
    if (m.results[o] === 'out') return <Tag tone="ink">bangkrut</Tag>
    return (
      <div className="flex items-center gap-1">
        {m.hands[o].length > 0 && <CardRow cards={m.hands[o]} width={18} step={11} />}
        {m.hands[o].length > 0 && <span className="text-[10px] font-bold">{bjTotal(m.hands[o]).total}</span>}
        {m.results[o] ? <Tag tone={m.results[o] === 'win' || m.results[o] === 'blackjack' ? 'electric' : 'ink'}>{BJ_TEXT[m.results[o]!]}</Tag> : m.bets[o] ? <Chips amount={m.bets[o]} size={12} /> : m.step === 'bet' && <Tag>mikir…</Tag>}
      </div>
    )
  },
}
