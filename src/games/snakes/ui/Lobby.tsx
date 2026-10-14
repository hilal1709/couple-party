import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import { defaultOptions } from '../engine'
import type { SnakesOptions } from '../types'
import { OPTION_INFO } from './copy'

type Toggle = keyof typeof OPTION_INFO

export function Lobby({ players, onStart }: { players: number; onStart: (o: SnakesOptions) => void }) {
  const [opts, setOpts] = useState<SnakesOptions>(() => ({ ...defaultOptions(), players }))

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl leading-none">
        <Tape tone="electric">Ular Tangga</Tape> tantangan <span className="text-base">· {players} pemain</span>
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-sm uppercase">Tolak / gagal tantangan</span>
        <div className="flex gap-3" role="radiogroup" aria-label="Hukuman tantangan">
          {([3, 5] as const).map((n) => (
            <Slab
              key={n}
              tone={opts.penalty === n ? 'electric' : 'paper'}
              active={opts.penalty === n}
              size="sm"
              role="radio"
              aria-checked={opts.penalty === n}
              onClick={() => setOpts({ ...opts, penalty: n })}
            >
              Mundur {n}
            </Slab>
          ))}
        </div>
        <Slab tone="rose" size="lg" className="ml-auto" onClick={() => onStart({ ...opts, players })}>
          Mulai main
        </Slab>
      </div>

      <p className="text-[13px] font-semibold">Yang pertama sampai kotak 100 menang. Nyalakan bumbu yang kalian mau:</p>
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
