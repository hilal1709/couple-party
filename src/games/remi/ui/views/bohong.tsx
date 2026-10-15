import { Slab } from '@/components/memphis/Slab'
import { highAce, rankLabel, suitIndex } from '../../cards'
import { awaitingOut } from '../../modes/bohong'
import type { BohongState } from '../../types'
import { who } from '../copy'
import { CardRow, Pile, Tag } from './bits'
import type { ModeView } from './types'

export const bohongView: ModeView<BohongState> = {
  playable: (m, seat) => (m.turn === seat && !awaitingOut(m) ? m.hands[seat].map((c) => c.id) : []),
  pick: 'select',
  maxSelect: 4,
  sort: (c) => [...c].sort((a, b) => highAce(a.r) - highAce(b.r) || suitIndex(a.s) - suitIndex(b.s)),
  status(m, seat, names) {
    if (awaitingOut(m)) return m.turn === seat ? `${names[m.last!.by]} habis! Percaya?` : `${names[m.last!.by]} habis kartu…`
    if (m.turn !== seat) return `Giliran ${names[m.turn]}`
    return `Buang & ngaku ${rankLabel(m.claim)}`
  },
  me: (m) => `wajib ngaku: ${rankLabel(m.claim)}`,

  Center({ m, seat, names }) {
    const r = m.reveal
    return (
      <div className="flex items-center gap-5">
        <Pile count={m.pile.length} label="Tumpukan" />
        <div className="flex max-w-[260px] flex-col items-center gap-1.5 text-center">
          <span className="font-display text-3xl leading-none">{rankLabel(m.claim)}</span>
          <Tag tone="electric">angka berikutnya</Tag>
          {m.last && (
            <span className="text-[12px] font-bold">
              {who(m.last.by, seat, names)} buang {m.last.cards.length} kartu, ngaku {rankLabel(m.last.claim)}
            </span>
          )}
          {r && !m.last && (
            <div className="flex items-center gap-2">
              <CardRow cards={r.cards} width={28} step={18} />
              <span className="text-left text-[11px] font-bold leading-tight">
                {r.lied ? 'Ketahuan bohong!' : 'Ternyata jujur!'}
                <br />
                {who(r.taker, seat, names)} ambil tumpukan
              </span>
            </div>
          )}
        </div>
      </div>
    )
  },

  Actions({ m, s, seat, sel, setSel, act }) {
    const canCall = !!m.last && m.last.by !== seat
    const myTurn = m.turn === seat && s.phase === 'play'
    return (
      <>
        {myTurn && awaitingOut(m) ? (
          <Slab tone="paper" size="sm" onClick={() => act({ t: 'accept' })}>
            Percaya aja
          </Slab>
        ) : (
          myTurn && (
            <Slab
              tone="grass"
              size="sm"
              disabled={!sel.length}
              onClick={() => {
                act({ t: 'play', ids: sel })
                setSel([])
              }}
            >
              {sel.length ? `Buang ${sel.length} · "${rankLabel(m.claim)}"` : 'Pilih 1–4 kartu'}
            </Slab>
          )
        )}
        {canCall && (
          <Slab tone="rose" size="md" onClick={() => act({ t: 'call' })}>
            Bohong!
          </Slab>
        )}
      </>
    )
  },
}
