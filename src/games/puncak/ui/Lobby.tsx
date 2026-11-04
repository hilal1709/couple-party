import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import type { BotLevel, LobbyProps } from '../../types'
import { defaultOptions, MAX_CLIMBERS } from '../engine'
import { MOUNTAIN_IDS, MOUNTAINS } from '../mountains'
import type { PuncakOptions } from '../types'
import { LEVEL_TITLE, LOOT_TITLE, WEATHER_TITLE } from './copy'

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

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<PuncakOptions>) {
  const [opts, setOpts] = useState<PuncakOptions>(() => ({ ...defaultOptions(players ?? 2), ...initial }))
  const n = Math.min(MAX_CLIMBERS, players ?? opts.players)
  const low = Math.max(1, n)
  const totals = Array.from({ length: MAX_CLIMBERS - low + 1 }, (_, i) => low + i)
  const total = Math.max(low, opts.total)
  const set = (p: Partial<PuncakOptions>) => setOpts({ ...opts, ...p })
  const ids = [...MOUNTAIN_IDS, 'acak'] as const

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Puncak Berdua</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n, total })}>
          {cta}
        </Slab>
      </div>
      <p className="text-sm text-ink/80">Panjat bareng sampai puncak. Stamina terbatas, tebing licin, jatuh bisa pingsan. Saling tarik, bangunkan, dan bagi bekal.</p>

      <div>
        <span className="font-display text-sm uppercase">Gunung</span>
        <ul className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gunung">
          {ids.map((m) => {
            const on = opts.mountain === m
            return (
              <li key={m}>
                <button role="radio" aria-checked={on} onClick={() => set({ mountain: m })} className={`h-full w-full border-[3px] border-ink px-2 py-1 text-left ${on ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm'}`}>
                  <span className="block font-display text-sm uppercase">{m === 'acak' ? 'Acak' : MOUNTAINS[m].title}</span>
                  <span className="block text-[11px] leading-tight text-ink/80">{m === 'acak' ? 'Diundi tiap main' : MOUNTAINS[m].line}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Choice label="Rute" values={[2, 4] as const} value={opts.zones} show={(v) => (v === 4 ? 'Penuh 4 zona' : 'Pendek 2 zona')} onPick={(zones) => set({ zones })} />
        <Choice label="Cuaca" values={['cerah', 'angin', 'ekstrem'] as const} value={opts.weather} show={(v) => WEATHER_TITLE[v]} onPick={(weather) => set({ weather })} />
        <Choice label="Item" values={['sedikit', 'normal', 'banyak'] as const} value={opts.loot} show={(v) => LOOT_TITLE[v]} onPick={(loot) => set({ loot })} />
        <Choice label="Pendaki" values={totals} value={total} onPick={(v) => set({ total: v })} />
        {total > n && <Choice label="Bot" values={[1, 2, 3] as const} value={opts.level} show={(v) => LEVEL_TITLE[v as BotLevel]} onPick={(level) => set({ level })} />}
      </div>
    </div>
  )
}
