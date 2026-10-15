import { Slab } from '@/components/memphis/Slab'
import { SUIT_NAME, sortHand } from '../../cards'
import { value41 } from '../../modes/remi41'
import type { Remi41State } from '../../types'
import { CardFace } from '../CardFace'
import { Pile, Tag } from './bits'
import type { ModeView } from './types'

export const remi41View: ModeView<Remi41State> = {
  playable: (m, seat) => (m.turn === seat && m.step === 'discard' ? m.hands[seat].filter((c) => c.id !== m.took).map((c) => c.id) : []),
  pick: 'tap',
  tap: (_m, id, act) => act({ t: 'discard', id }),
  sort: (c) => sortHand(c),
  status(m, seat, names) {
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    return m.step === 'draw' ? 'Ambil satu kartu' : 'Buang satu kartu'
  },
  me(m, seat) {
    const v = value41(m.hands[seat])
    return `nilai ${v.value} (${SUIT_NAME[v.suit]})`
  },

  Center({ m, seat, act }) {
    const draw = m.turn === seat && m.step === 'draw'
    const top = m.discard[m.discard.length - 1]
    const v = value41(m.hands[seat])
    return (
      <div className="flex items-center gap-6">
        <Pile count={m.deck.length} label="Dek" onClick={draw ? () => act({ t: 'drawDeck' }) : undefined} hot={draw} />
        <button
          disabled={!draw || !top}
          onClick={() => act({ t: 'drawDiscard' })}
          aria-label={top ? 'Ambil kartu buangan' : 'Buangan kosong'}
          className="relative flex flex-col items-center transition-transform active:scale-95 disabled:cursor-default"
        >
          {top ? (
            <CardFace card={top} width={50} />
          ) : (
            <span className="block h-[70px] w-[50px] rounded-[8px] border-[3px] border-dashed border-ink/50" />
          )}
          {draw && top && <span aria-hidden className="absolute -bottom-2 left-1 right-1 h-1.5 -skew-x-12 border-2 border-ink bg-electric" />}
          <span className="mt-1 border-2 border-ink bg-paper px-1 font-display text-[9px] uppercase">Buangan</span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-4xl leading-none">{v.value}</span>
          <Tag tone={v.value >= 35 ? 'electric' : 'paper'}>nilaimu · target 41</Tag>
        </div>
      </div>
    )
  },

  Actions({ m, seat, act }) {
    if (m.turn !== seat || m.step !== 'draw') return null
    return (
      <>
        <Slab tone="rose" size="sm" onClick={() => act({ t: 'drawDeck' })} disabled={!m.deck.length}>
          Ambil dek
        </Slab>
        <Slab tone="paper" size="sm" onClick={() => act({ t: 'drawDiscard' })} disabled={!m.discard.length}>
          Ambil buangan
        </Slab>
      </>
    )
  },
}
