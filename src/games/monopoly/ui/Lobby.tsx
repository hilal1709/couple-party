import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import type { LobbyProps } from '../../types'
import { defaultOptions } from '../engine'
import type { MonopolyOptions } from '../types'
import { money, OPTION_INFO } from './copy'

type Toggle = keyof typeof OPTION_INFO

const ENDS: { id: string; label: string; end: MonopolyOptions['end']; rounds?: MonopolyOptions['rounds'] }[] = [
  { id: 'r15', label: '15 putaran', end: 'rounds', rounds: 15 },
  { id: 'r25', label: '25 putaran', end: 'rounds', rounds: 25 },
  { id: 'r40', label: '40 putaran', end: 'rounds', rounds: 40 },
  { id: 'bk', label: 'Sampai bangkrut', end: 'bankrupt' },
]

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<MonopolyOptions>) {
  const [opts, setOpts] = useState<MonopolyOptions>(() => ({ ...defaultOptions(), ...initial }))
  const endId = (e: (typeof ENDS)[number]) => (e.end === 'bankrupt' ? opts.end === 'bankrupt' : opts.end === 'rounds' && opts.rounds === e.rounds)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl leading-none">
        <Tape tone="electric">Monopoli</Tape> keliling dunia {players !== undefined && <span className="text-base">· {players} pemain</span>}
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-sm uppercase">Selesai</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kapan selesai">
          {ENDS.map((e) => (
            <Slab
              key={e.id}
              tone={endId(e) ? 'electric' : 'paper'}
              active={endId(e)}
              size="sm"
              role="radio"
              aria-checked={endId(e)}
              onClick={() => setOpts({ ...opts, end: e.end, rounds: e.rounds ?? opts.rounds })}
            >
              {e.label}
            </Slab>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-sm uppercase">Modal awal</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Modal awal">
          {([1500, 2000] as const).map((c) => (
            <Slab
              key={c}
              tone={opts.startCash === c ? 'electric' : 'paper'}
              active={opts.startCash === c}
              size="sm"
              role="radio"
              aria-checked={opts.startCash === c}
              onClick={() => setOpts({ ...opts, startCash: c })}
            >
              {money(c)}
            </Slab>
          ))}
        </div>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: players ?? opts.players })}>
          {cta}
        </Slab>
      </div>

      <p className="text-[13px] font-semibold">
        {opts.end === 'rounds'
          ? `Setelah ${opts.rounds} putaran, yang paling tajir (uang + properti + bangunan) menang.`
          : 'Main terus sampai tinggal satu yang belum bangkrut. Siapin waktu luang.'}{' '}
        Aturan tambahan:
      </p>
      <ul className="grid grid-cols-2 gap-3" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
        {(Object.keys(OPTION_INFO) as Toggle[]).map((k, i) => (
          <li key={k} className={i % 2 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'}>
            <label className="flex h-full cursor-pointer items-center gap-3 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab-sm">
              <span className="flex-1">
                <span className="block font-display text-sm uppercase">{OPTION_INFO[k].title}</span>
                <span className="block text-[12px] leading-snug text-ink/75">{OPTION_INFO[k].line}</span>
              </span>
              <Switch
                checked={opts[k]}
                onCheckedChange={(v) => setOpts({ ...opts, [k]: v })}
                className="h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal"
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
