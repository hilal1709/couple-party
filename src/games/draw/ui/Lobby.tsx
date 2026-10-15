import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots } from '@/components/memphis/patterns'
import { Switch } from '@/components/ui/switch'
import { defaultOptions } from '../engine'
import type { LobbyProps } from '../../types'
import type { DrawOptions, Pack } from '../types'
import { parseCustom } from '../words'
import { OPTION_HINT, PACK_INFO } from './copy'

const SWITCH = 'h-7 w-12 shrink-0 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal'

function Radio<T extends number>({ label, value, options, unit, onPick }: { label: string; value: T; options: readonly T[]; unit: string; onPick: (v: T) => void }) {
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

export function Lobby({ players, cta, initial, onSubmit }: LobbyProps<DrawOptions>) {
  const [opts, setOpts] = useState<DrawOptions>(() => ({ ...defaultOptions(), ...initial }))
  const [customText, setCustomText] = useState(() => (initial?.custom ?? []).join(', '))
  const custom = parseCustom(customText)
  // tiap giliran butuh 3 pilihan kata; tanpa paket, kata sendiri minimal 3
  const enough = opts.packs.length > 0 || custom.length >= 3

  const togglePack = (p: Pack, on: boolean) =>
    setOpts({ ...opts, packs: on ? [...opts.packs, p].filter((x, i, a) => a.indexOf(x) === i) : opts.packs.filter((x) => x !== p) })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none">
          <Tape tone="electric">Tebak Gambar</Tape> {players !== undefined && <span className="text-base">· {players} pemain</span>}
        </h2>
        <Slab tone="rose" size="lg" className="ml-auto" disabled={!enough} onClick={() => onSubmit({ ...opts, custom, players: players ?? opts.players })}>
          {cta}
        </Slab>
      </div>

      <p className="text-[13px] font-semibold">Gantian menggambar kata rahasia, yang lain ngetik tebakan. Makin cepat bener, makin banyak poin.</p>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Radio label="Putaran" value={opts.rounds} options={[2, 3, 4] as const} unit="x" onPick={(rounds) => setOpts({ ...opts, rounds })} />
        <Radio label="Waktu" value={opts.seconds} options={[60, 80, 100] as const} unit="s" onPick={(seconds) => setOpts({ ...opts, seconds })} />
      </div>

      <ul className="grid grid-cols-2 gap-3" style={{ backgroundImage: dots('#12121222', 18, 1.4) }}>
        {(Object.keys(PACK_INFO) as Pack[]).map((p, i) => (
          <li key={p} className={i % 2 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'}>
            <label className="flex h-full cursor-pointer items-center gap-3 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab-sm">
              <span className="flex-1">
                <span className="block font-display text-sm uppercase">{PACK_INFO[p].title}</span>
                <span className="block text-[12px] leading-snug text-ink/75">{PACK_INFO[p].line}</span>
              </span>
              <Switch checked={opts.packs.includes(p)} onCheckedChange={(v) => togglePack(p, v)} className={SWITCH} />
            </label>
          </li>
        ))}
        <li className="rotate-[0.4deg]">
          <label className="flex h-full cursor-pointer items-center gap-3 border-[3px] border-ink bg-paper px-3 py-2 shadow-slab-sm">
            <span className="flex-1">
              <span className="block font-display text-sm uppercase">{OPTION_HINT.title}</span>
              <span className="block text-[12px] leading-snug text-ink/75">{OPTION_HINT.line}</span>
            </span>
            <Switch checked={opts.hints} onCheckedChange={(v) => setOpts({ ...opts, hints: v })} className={SWITCH} />
          </label>
        </li>
      </ul>

      <label className="flex flex-col gap-1">
        <span className="font-display text-sm uppercase">
          Kata buatan sendiri <span className="font-sans text-[12px] font-semibold normal-case text-ink/70">· pisahkan dengan koma · {custom.length} kata</span>
        </span>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={2}
          placeholder="nama teman, inside jokes, tempat kencan pertama…"
          className="resize-none border-[3px] border-ink bg-paper px-3 py-2 text-sm font-medium shadow-slab-sm outline-none placeholder:text-ink/45 focus:bg-white"
        />
        {!enough && <span className="self-start border-2 border-ink bg-rose px-2 text-[12px] font-bold">Nyalakan minimal satu paket, atau isi minimal 3 kata sendiri.</span>}
      </label>
    </div>
  )
}
