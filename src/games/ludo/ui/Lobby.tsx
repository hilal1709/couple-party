import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import type { LobbyProps } from '../../types'
import { minArms } from '../board'
import { defaultOptions, teamsAllowed } from '../engine'
import type { Arms, LudoOptions } from '../types'
import { OPTION_INFO } from './copy'

type Toggle = keyof typeof OPTION_INFO

const BOARDS: { arms: Arms; label: string }[] = [
  { arms: 4, label: 'Salib · 4' },
  { arms: 6, label: 'Heksagon · 6' },
  { arms: 8, label: 'Oktagon · 8' },
]

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<LudoOptions>) {
  const [opts, setOpts] = useState<LudoOptions>(() => {
    const o = { ...defaultOptions(players ?? 2), ...initial }
    return players !== undefined && o.arms < players ? { ...o, arms: minArms(players) } : o
  })
  const n = players ?? opts.players
  const teamsOk = players === undefined || teamsAllowed(players)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl leading-none">
        <Tape tone="electric">Ludo</Tape> saling makan {players !== undefined && <span className="text-base">· {players} pemain</span>}
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-sm uppercase">Papan</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bentuk papan">
          {BOARDS.map((b) => {
            const on = opts.arms === b.arms
            return (
              <Slab
                key={b.arms}
                tone={on ? 'electric' : 'paper'}
                active={on}
                size="sm"
                role="radio"
                aria-checked={on}
                disabled={players !== undefined && b.arms < players}
                onClick={() => setOpts({ ...opts, arms: b.arms })}
              >
                {b.label}
              </Slab>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-sm uppercase">Bidak</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Bidak per pemain">
          {([2, 3, 4] as const).map((p) => (
            <Slab
              key={p}
              tone={opts.pieces === p ? 'electric' : 'paper'}
              active={opts.pieces === p}
              size="sm"
              role="radio"
              aria-checked={opts.pieces === p}
              onClick={() => setOpts({ ...opts, pieces: p })}
            >
              {p} bidak
            </Slab>
          ))}
        </div>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onSubmit({ ...opts, players: n, teams: opts.teams && teamsOk })}>
          {cta}
        </Slab>
      </div>

      <p className="text-[13px] font-semibold">
        Papan {opts.arms} lengan muat sampai {opts.arms} pemain. Angka 6 = keluar kandang & lempar lagi, makan lawan juga dapat bonus. Aturan tambahan:
      </p>
      <ul className="grid grid-cols-3 gap-3" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
        {(Object.keys(OPTION_INFO) as Toggle[]).map((k, i) => {
          const locked = k === 'teams' && !teamsOk
          return (
            <li key={k} className={i % 2 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'}>
              <label className="flex h-full cursor-pointer items-center gap-3 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab-sm">
                <span className="flex-1">
                  <span className="block font-display text-sm uppercase">{OPTION_INFO[k].title}</span>
                  <span className="block text-[12px] leading-snug text-ink/75">{locked ? 'Butuh 4, 6, atau 8 pemain.' : OPTION_INFO[k].line}</span>
                </span>
                <Switch
                  checked={opts[k] && !locked}
                  disabled={locked}
                  onCheckedChange={(v) => setOpts({ ...opts, [k]: v })}
                  className="h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal"
                />
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
