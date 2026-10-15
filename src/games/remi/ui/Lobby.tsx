import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import { defaultOptions } from '../engine'
import { fitsMode, MODE_INFO, MODES } from '../modes'
import type { LobbyProps } from '../../types'
import type { RemiOptions } from '../types'
import { modeArt } from './art'

function Radio<T extends number>({ label, value, options, unit = '', onPick }: { label: string; value: T; options: readonly T[]; unit?: string; onPick: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-sm uppercase">{label}</span>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {options.map((n) => (
          <Slab key={n} tone={value === n ? 'electric' : 'paper'} active={value === n} size="sm" role="radio" aria-checked={value === n} onClick={() => onPick(n)}>
            {n}
            {unit}
          </Slab>
        ))}
      </div>
    </div>
  )
}

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<RemiOptions>) {
  const [opts, setOpts] = useState<RemiOptions>(() => {
    const base = { ...defaultOptions(), ...initial }
    // mode bawaan yang pas dengan jumlah pemain di room
    if (players !== undefined && !fitsMode(base.mode, players)) base.mode = MODES.find((m) => fitsMode(m, players)) ?? base.mode
    return base
  })
  const info = MODE_INFO[opts.mode]
  const fits = players === undefined || fitsMode(opts.mode, players)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Kartu Remi</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" disabled={!fits} onClick={() => onSubmit({ ...opts, players: players ?? opts.players })}>
          {cta}
        </Slab>
      </div>

      <ul className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Jenis permainan" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
        {MODES.map((m, i) => {
          const mi = MODE_INFO[m]
          const on = opts.mode === m
          const ok = players === undefined || fitsMode(m, players)
          return (
            <li key={m} className={i % 2 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'}>
              <button
                role="radio"
                aria-checked={on}
                onClick={() => setOpts({ ...opts, mode: m })}
                className={cn(
                  'flex h-full w-full items-center gap-1.5 border-[3px] border-ink px-1.5 py-1 text-left transition-transform active:translate-y-0.5',
                  on ? 'bg-electric shadow-slab' : 'bg-paper shadow-slab-sm',
                  !ok && 'opacity-55',
                )}
              >
                <img src={modeArt(m)} alt="" className="h-9 w-10 shrink-0 object-contain" draggable={false} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-[12px] uppercase leading-tight">{mi.title}</span>
                  <span className="block text-[10px] font-semibold text-ink/70">
                    {mi.min}–{mi.max} pemain{mi.chips ? ' · chip' : ''}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="text-[13px] font-semibold">
        <span className="font-display uppercase">{info.title}:</span> {info.line}
      </p>
      {!fits && (
        <span className="self-start border-2 border-ink bg-rose px-2 text-[12px] font-bold">
          {info.title} untuk {info.min}–{info.max} pemain. Pilih mode lain atau atur jumlah pemain di room.
        </span>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {info.chips ? (
          <>
            <Radio label="Tangan" value={opts.hands} options={[5, 10, 15] as const} onPick={(hands) => setOpts({ ...opts, hands })} />
            <Radio label="Modal" value={opts.chips} options={[500, 1000, 2000] as const} onPick={(chips) => setOpts({ ...opts, chips })} />
            {opts.mode === 'poker' && <Radio label="Big blind" value={opts.blind} options={[20, 50, 100] as const} onPick={(blind) => setOpts({ ...opts, blind })} />}
          </>
        ) : (
          <Radio label="Ronde" value={opts.rounds} options={[3, 5, 7] as const} onPick={(rounds) => setOpts({ ...opts, rounds })} />
        )}
        {opts.mode === 'cangkulan' && <Radio label="Kartu awal" value={opts.cangkulHand} options={[5, 7] as const} onPick={(cangkulHand) => setOpts({ ...opts, cangkulHand })} />}
      </div>
    </div>
  )
}
