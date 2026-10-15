import { Slab } from '@/components/memphis/Slab'
import { SUIT_NAME, SUIT_SYMBOL, sortHand } from '../../cards'
import { cangkulPlayable, mustDig } from '../../modes/cangkulan'
import type { CangkulanState } from '../../types'
import { CardFace } from '../CardFace'
import { who } from '../copy'
import { Pile, Tag } from './bits'
import type { ModeView } from './types'

export const cangkulanView: ModeView<CangkulanState> = {
  playable: cangkulPlayable,
  pick: 'tap',
  tap: (_m, id, act) => act({ t: 'play', id }),
  sort: (c) => sortHand(c),
  status(m, seat, names) {
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    if (mustDig(m, seat)) return m.deck.length ? 'Nyangkul dulu!' : 'Dek habis, pass'
    return m.leadSuit ? `Ikuti ${SUIT_NAME[m.leadSuit]}` : 'Kamu yang buka'
  },
  me: (m) => (m.leadSuit ? `jenis meja: ${SUIT_SYMBOL[m.leadSuit]} ${SUIT_NAME[m.leadSuit]}` : 'bebas buka jenis apa saja'),

  Center({ m, seat, names, act }) {
    const showing = m.trick.length ? m.trick : (m.lastTrick?.plays ?? [])
    const done = !m.trick.length && m.lastTrick
    const canDig = mustDig(m, seat) && m.deck.length > 0
    return (
      <div className="relative flex items-center gap-5">
        <Pile count={m.deck.length} label="Dek" onClick={canDig ? () => act({ t: 'dig' }) : undefined} hot={canDig} />
        <div className="flex flex-col items-center gap-1.5">
          <div className={done ? 'flex gap-1.5 opacity-60' : 'flex gap-1.5'}>
            {showing.map((p) => (
              <div key={p.card.id} className="flex flex-col items-center gap-0.5">
                <CardFace card={p.card} width={46} />
                <span className="max-w-[7ch] truncate text-[10px] font-bold">{p.by < 0 ? 'pembuka' : who(p.by, seat, names)}</span>
              </div>
            ))}
            {!showing.length && <span className="text-[12px] font-semibold text-ink/70">Meja kosong</span>}
          </div>
          {done && <Tag tone="electric">{who(m.lastTrick!.winner, seat, names)} menang trik</Tag>}
          {m.leadSuit && <Tag>Jenis: {SUIT_SYMBOL[m.leadSuit]} {SUIT_NAME[m.leadSuit]}</Tag>}
        </div>
      </div>
    )
  },

  Actions({ m, seat, act }) {
    if (!mustDig(m, seat)) return null
    return m.deck.length ? (
      <Slab tone="rose" size="sm" onClick={() => act({ t: 'dig' })}>
        Cangkul{m.dug ? ` lagi (${m.dug})` : ''}
      </Slab>
    ) : (
      <Slab tone="paper" size="sm" onClick={() => act({ t: 'pass' })}>
        Pass
      </Slab>
    )
  },
}
