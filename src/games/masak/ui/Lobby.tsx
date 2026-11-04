import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { BotLevel, LobbyProps } from '../../types'
import { defaultOptions, MAX_COOKS } from '../engine'
import { KITCHEN_IDS, KITCHENS } from '../kitchens'
import type { MasakOptions } from '../types'
import { LEVEL_TITLE } from './copy'

function Choice<T extends string | number>({ label, values, value, show, onPick }: { label: string; values: readonly T[]; value: T; show?: (v: T) => string; onPick: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-sm uppercase">{label}</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {values.map((v) => (
          <Slab key={v} tone={value === v ? 'electric' : 'paper'} active={value === v} size="sm" role="radio" aria-checked={value === v} onClick={() => onPick(v)}>
            {show ? show(v) : v}
          </Slab>
        ))}
      </div>
    </div>
  )
}

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<MasakOptions>) {
  const [opts, setOpts] = useState<MasakOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const n = players ?? opts.players
  const low = Math.max(1, n)
  const totals = Array.from({ length: MAX_COOKS - low + 1 }, (_, i) => low + i)
  const total = Math.max(low, opts.total)
  const set = (p: Partial<MasakOptions>) => setOpts({ ...opts, ...p })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Dapur Kacau</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n, total })}>
          {cta}
        </Slab>
      </div>
      <p className="text-sm text-ink/80">
        {opts.mode === 'versus'
          ? 'Dua tim, dua dapur kembar. Tiap 2 pesanan tersaji dapat jatah Iseng: kulit pisang atau bom tepung ke dapur lawan.'
          : 'Potong, masak, sajikan. Pesanan nggak mau nunggu, kompor nggak mau ngalah.'}
      </p>

      <div>
        <span className="font-display text-sm uppercase">Dapur</span>
        <ul className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Dapur">
          {KITCHEN_IDS.map((m) => {
            const on = opts.kitchen === m
            return (
              <li key={m}>
                <button role="radio" aria-checked={on} onClick={() => set({ kitchen: m })} className={`h-full w-full border-[3px] border-ink px-2 py-1 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}>
                  <span className="block font-display text-sm uppercase">{KITCHENS[m].title}</span>
                  <span className="block text-[11px] leading-tight text-ink/80">{KITCHENS[m].line}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Choice label="Mode" values={['coop', 'versus'] as const} value={opts.mode} show={(v) => (v === 'coop' ? 'Kerja sama' : 'Tanding 2 tim')} onPick={(mode) => set({ mode, total: mode === 'versus' ? Math.max(2, total) : total })} />
        <Choice label="Durasi" values={[120, 180, 240] as const} value={opts.secs} show={(v) => `${v / 60} mnt`} onPick={(secs) => set({ secs })} />
        <Choice label="Koki" values={opts.mode === 'versus' ? totals.filter((v) => v >= 2) : totals} value={total} onPick={(v) => set({ total: v })} />
        {total > n && <Choice label="Bot" values={[1, 2, 3] as const} value={opts.level} show={(v) => LEVEL_TITLE[v as BotLevel]} onPick={(level) => set({ level })} />}
      </div>
    </div>
  )
}
