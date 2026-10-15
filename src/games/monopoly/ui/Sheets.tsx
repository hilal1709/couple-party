import { useState } from 'react'
import { Modal } from '@/components/feedback/Modal'
import { Slab } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import type { Seat } from '../../types'
import { BOARD, GROUP_HEX, squareName } from '../board'
import { canBuild, canMortgage, canSell, canUnmortgage, mortgageValue, tradable, unmortgageCost, validTrade } from '../engine'
import { HOTEL, type MonopolyAction, type MonopolyState } from '../types'
import { SeatDot } from './art'
import { money } from './copy'

const ALL = Array.from({ length: 40 }, (_, i) => i)

function swatch(sq: number) {
  const b = BOARD[sq]
  return b.kind === 'street' ? GROUP_HEX[b.group] : b.kind === 'airport' ? '#121212' : '#fff4fa'
}

function Mini({ children, onClick, tone = 'paper' }: { children: React.ReactNode; onClick?: () => void; tone?: 'paper' | 'electric' | 'rose' | 'ink' }) {
  const off = !onClick
  return (
    <button
      onClick={onClick}
      disabled={off}
      className={cn(
        'border-[3px] border-ink px-1.5 py-0.5 text-[11px] font-bold leading-tight',
        off ? 'bg-paper text-ink/35' : 'shadow-slab-sm active:translate-y-0.5 active:shadow-none',
        !off && tone === 'electric' && 'bg-electric',
        !off && tone === 'rose' && 'bg-rose',
        !off && tone === 'paper' && 'bg-paper',
        !off && tone === 'ink' && 'bg-ink text-petal',
      )}
    >
      {children}
    </button>
  )
}

/** Kelola properti sendiri: bangun / jual bangunan / gadai / tebus. */
export function ManageSheet({
  open,
  onOpenChange,
  s,
  seat,
  act,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  s: MonopolyState
  seat: Seat
  act: (a: MonopolyAction) => void
}) {
  const mine = ALL.filter((sq) => s.owner[sq] === seat)
  const debt = s.phase === 'debt' && s.debts[0]?.who === seat ? s.debts[0] : null
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Kelola properti"
      tone="electric"
      className="w-[min(560px,calc(100vw-32px))]"
      description={
        debt
          ? `Kurang ${money(debt.amount - s.cash[seat])} buat bayar utang ${money(debt.amount)}. Jual bangunan atau gadai dulu.`
          : `Uangmu ${money(s.cash[seat])}. Rumah dibangun merata, hotel setelah 4 rumah.`
      }
    >
      {mine.length === 0 && <p className="text-[13px] font-semibold">Belum punya properti. Beli dulu, baru pamer.</p>}
      <ul className="flex flex-col gap-1.5">
        {mine.map((sq) => {
          const b = BOARD[sq]
          const h = s.houses[sq]
          return (
            <li key={sq} className="flex flex-wrap items-center gap-1.5 border-[3px] border-ink bg-paper px-2 py-1">
              <span className="size-4 shrink-0 border-2 border-ink" style={{ background: swatch(sq) }} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                {squareName(sq)}
                {b.kind === 'street' && h > 0 && <span className="ml-1 text-ink/70">· {h === HOTEL ? 'hotel' : `${h} rumah`}</span>}
                {s.mortgaged[sq] && <span className="ml-1 text-[#d0213f]">· digadai</span>}
              </span>
              {b.kind === 'street' && (
                <>
                  <Mini tone="electric" onClick={canBuild(s, seat, sq) && !debt ? () => act({ type: 'build', sq }) : undefined}>
                    +{h === 4 ? 'Hotel' : 'Rumah'} {money(b.house)}
                  </Mini>
                  <Mini onClick={canSell(s, seat, sq) ? () => act({ type: 'sell', sq }) : undefined}>Jual +{money(b.house / 2)}</Mini>
                </>
              )}
              {s.opts.mortgage &&
                (s.mortgaged[sq] ? (
                  <Mini tone="rose" onClick={canUnmortgage(s, seat, sq) && !debt ? () => act({ type: 'unmortgage', sq }) : undefined}>
                    Tebus {money(unmortgageCost(sq))}
                  </Mini>
                ) : (
                  <Mini tone="ink" onClick={canMortgage(s, seat, sq) ? () => act({ type: 'mortgage', sq }) : undefined}>
                    Gadai +{money(mortgageValue(sq))}
                  </Mini>
                ))}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

function Stepper({ value, max, onChange, label }: { value: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <Mini onClick={value > 0 ? () => onChange(Math.max(0, value - 50)) : undefined}>−50</Mini>
      <Mini onClick={value > 0 ? () => onChange(Math.max(0, value - 10)) : undefined}>−10</Mini>
      <span className="w-16 text-center font-display text-sm">{money(value)}</span>
      <Mini onClick={value + 10 <= max ? () => onChange(value + 10) : undefined}>+10</Mini>
      <Mini onClick={value + 50 <= max ? () => onChange(value + 50) : undefined}>+50</Mini>
    </div>
  )
}

function Picks({ list, picked, toggle }: { list: number[]; picked: number[]; toggle: (sq: number) => void }) {
  if (!list.length) return <p className="text-[11px] font-semibold text-ink/60">Tidak ada properti yang bisa ditukar.</p>
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((sq) => (
        <button
          key={sq}
          onClick={() => toggle(sq)}
          aria-pressed={picked.includes(sq)}
          className={cn(
            'flex items-center gap-1 border-[3px] border-ink px-1.5 py-0.5 text-[11px] font-bold',
            picked.includes(sq) ? 'bg-electric shadow-slab-sm' : 'bg-paper',
          )}
        >
          <span className="size-3 border-2 border-ink" style={{ background: swatch(sq) }} />
          {squareName(sq)}
        </button>
      ))}
    </div>
  )
}

/** Susun tawaran tukar: properti & uang dari dua arah. */
export function TradeSheet({
  open,
  onOpenChange,
  s,
  seat,
  names,
  act,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  s: MonopolyState
  seat: Seat
  names: string[]
  act: (a: MonopolyAction) => void
}) {
  const others = s.pos.map((_, i) => i).filter((i) => i !== seat && !s.bankrupt[i])
  const [to, setTo] = useState<Seat>(others[0] ?? 0)
  const [give, setGive] = useState<number[]>([])
  const [get, setGet] = useState<number[]>([])
  const [giveCash, setGiveCash] = useState(0)
  const [getCash, setGetCash] = useState(0)
  const partner = others.includes(to) ? to : (others[0] ?? 0)
  const toggle = (list: number[], set: (v: number[]) => void) => (sq: number) => set(list.includes(sq) ? list.filter((x) => x !== sq) : [...list, sq])
  const trade = { to: partner, give, get, giveCash, getCash }
  const ok = validTrade(s, { ...trade, from: seat })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ajak tukar" tone="rose" className="w-[min(600px,calc(100vw-32px))]">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tukar dengan">
        {others.map((i) => (
          <button
            key={i}
            role="radio"
            aria-checked={partner === i}
            onClick={() => {
              setTo(i)
              setGet([])
              setGetCash(0)
            }}
            className={cn('flex items-center gap-1.5 border-[3px] border-ink px-2 py-0.5 text-[12px] font-bold', partner === i ? 'bg-rose shadow-slab-sm' : 'bg-paper')}
          >
            <SeatDot seat={i} size={12} /> {names[i]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-1.5">
          <p className="font-display text-[12px] uppercase">Kamu kasih</p>
          <Picks list={ALL.filter((sq) => tradable(s, seat, sq))} picked={give} toggle={toggle(give, setGive)} />
          <Stepper value={giveCash} max={s.cash[seat]} onChange={setGiveCash} label="Uang yang kamu kasih" />
        </section>
        <section className="flex flex-col gap-1.5">
          <p className="font-display text-[12px] uppercase">Kamu minta dari {names[partner]}</p>
          <Picks list={ALL.filter((sq) => tradable(s, partner, sq))} picked={get} toggle={toggle(get, setGet)} />
          <Stepper value={getCash} max={s.cash[partner]} onChange={setGetCash} label="Uang yang kamu minta" />
        </section>
      </div>
      <Slab
        tone="rose"
        size="sm"
        disabled={!ok}
        onClick={() => {
          act({ type: 'propose', trade })
          setGive([])
          setGet([])
          setGiveCash(0)
          setGetCash(0)
          onOpenChange(false)
        }}
      >
        Kirim tawaran
      </Slab>
    </Modal>
  )
}

/** Ringkasan tawaran tukar, dilihat semua pemain. */
export function TradeSummary({ s, names, seat }: { s: MonopolyState; names: string[]; seat: Seat }) {
  const t = s.trade!
  const name = (i: Seat) => (i === seat ? 'Kamu' : names[i])
  const side = (sqs: number[], cash: number) =>
    [...sqs.map(squareName), ...(cash > 0 ? [money(cash)] : [])].join(', ') || 'nggak ada'
  return (
    <div className="grid grid-cols-2 gap-2 text-[12px] font-semibold leading-snug">
      <p>
        <span className="block font-display text-[11px] uppercase">{name(t.from)} kasih</span>
        {side(t.give, t.giveCash)}
      </p>
      <p>
        <span className="block font-display text-[11px] uppercase">{name(t.to)} kasih</span>
        {side(t.get, t.getCash)}
      </p>
    </div>
  )
}
