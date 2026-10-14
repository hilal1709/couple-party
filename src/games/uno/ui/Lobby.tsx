import { Settings02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { Slab, Tape } from '@/components/memphis/Slab'
import { dots, squiggles, terrazzo } from '@/components/memphis/patterns'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { CardFace } from '../art/CardArt'
import { defaultOptions } from '../engine'
import type { Face, HouseRules, UnoOptions, Variant } from '../types'
import { HOUSE_INFO, VARIANT_INFO } from './copy'

const SHOWCASE: Record<Variant, Face[]> = {
  classic: [
    { kind: 'num', color: 'red', value: 7 },
    { kind: 'wildDraw', color: null, value: 4 },
    { kind: 'reverse', color: 'blue', value: 0 },
  ],
  flip: [
    { kind: 'flip', color: 'yellow', value: 0 },
    { kind: 'skipAll', color: 'teal', value: 0 },
    { kind: 'draw', color: 'pink', value: 5 },
  ],
  noMercy: [
    { kind: 'wildDraw', color: null, value: 10 },
    { kind: 'discardAll', color: 'green', value: 0 },
    { kind: 'roulette', color: null, value: 0 },
  ],
}

/** Tiap varian benda berbeda di showroom: bentuk, warna, & pola sendiri. */
const STYLE: Record<Variant, { cls: string; bg: React.CSSProperties; tilt: string }> = {
  classic: { cls: 'bg-rose', bg: { backgroundImage: dots('#121212', 16, 1.6) }, tilt: '-rotate-1' },
  flip: { cls: 'bg-ink text-petal', bg: { backgroundImage: terrazzo(11, ['#5cf64a', '#ff37a6', '#ffcae9'], 140, 26) }, tilt: 'rotate-1' },
  noMercy: { cls: 'bg-electric', bg: { backgroundImage: squiggles('#121212', 52, 2.4) }, tilt: '-rotate-[0.6deg]' },
}

export function Lobby({ players, onStart }: { players: number; onStart: (o: UnoOptions) => void }) {
  const [variant, setVariant] = useState<Variant>('classic')
  const [house, setHouse] = useState<HouseRules>(defaultOptions().house)
  const [target, setTarget] = useState(500)
  const [rulesOpen, setRulesOpen] = useState(false)
  const activeHouse = Object.entries(house).filter(([, v]) => v).length

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl leading-none">
        Main <Tape tone="electric">UNO</Tape> versi apa? <span className="text-base">· {players} pemain</span>
      </h2>

      <div role="radiogroup" aria-label="Varian UNO" className="grid grid-cols-3 gap-4">
        {(Object.keys(VARIANT_INFO) as Variant[]).map((v) => {
          const on = v === variant
          const st = STYLE[v]
          return (
            <button
              key={v}
              role="radio"
              aria-checked={on}
              aria-label={`${VARIANT_INFO[v].title}: ${VARIANT_INFO[v].line}`}
              onClick={() => setVariant(v)}
              className={cn(
                'relative flex flex-col items-start gap-2 border-[3px] border-ink p-3 text-left transition-[transform,box-shadow] duration-200 ease-out',
                st.cls,
                st.tilt,
                on ? 'shadow-lift -translate-y-1' : 'shadow-slab-sm',
              )}
              style={st.bg}
            >
              <span className="relative flex h-16 w-24 shrink-0 items-center self-end" aria-hidden>
                {SHOWCASE[v].map((f, i) => (
                  <span
                    key={i}
                    className="absolute"
                    style={{ left: i * 22, transform: `rotate(${(i - 1) * 12}deg) translateY(${i === 1 ? -6 : 0}px)` }}
                  >
                    <CardFace face={f} width={38} />
                  </span>
                ))}
              </span>
              <span className="flex-1">
                <span className={cn('tape font-display text-xl', v === 'flip' ? 'bg-petal text-ink' : 'bg-paper')}>
                  {VARIANT_INFO[v].title}
                </span>
                <span
                  className={cn(
                    'mt-2 block px-1 text-[12px] font-semibold leading-snug',
                    v === 'flip' ? 'bg-ink/80' : 'bg-paper/85',
                  )}
                >
                  {VARIANT_INFO[v].line}
                </span>
              </span>
              {on && (
                <span className="absolute -right-3 -top-3 rotate-12 border-[3px] border-ink bg-paper px-2 font-display text-xs uppercase text-ink">
                  Dipilih
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-stretch gap-4">
        <button
          onClick={() => setRulesOpen(true)}
          className="flex flex-1 items-center gap-2 border-[3px] border-ink bg-paper px-4 py-3 text-left text-sm font-semibold shadow-slab-sm active:translate-y-0.5 active:shadow-none"
        >
          <HugeiconsIcon icon={Settings02Icon} size={18} strokeWidth={2.2} />
          <span className="flex-1">
            Aturan rumah & target
            <span className="block text-xs font-medium text-ink/70">
              {variant === 'classic' ? `${activeHouse} aturan aktif · ` : ''}target {target} poin
            </span>
          </span>
        </button>
        <Slab
          tone="rose"
          size="lg"
          className="flex-1"
          onClick={() => onStart({ variant, target, house: variant === 'classic' ? house : defaultOptions().house })}
        >
          Mulai main
        </Slab>
      </div>

      <Drawer open={rulesOpen} onOpenChange={setRulesOpen}>
        <DrawerContent className="mx-auto max-w-xl border-[3px] border-b-0 border-ink bg-paper">
          <DrawerTitle className="px-5 pt-2 font-display text-2xl uppercase">Aturan rumah</DrawerTitle>
          <DrawerDescription className="px-5 text-sm text-ink/75">
            {variant === 'classic'
              ? 'Campur sesuka kalian. Aturan resmi tetap jadi dasar.'
              : `${VARIANT_INFO[variant].title} sudah punya aturan sendiri; yang bisa diubah cuma target poin.`}
          </DrawerDescription>
          <div className="max-h-[60dvh] overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
            {variant === 'classic' && (
              <ul className="divide-y-2 divide-ink/15">
                {(Object.keys(HOUSE_INFO) as (keyof HouseRules)[]).map((k) => (
                  <li key={k}>
                    <label className="flex cursor-pointer items-center gap-3 py-3">
                      <span className="flex-1">
                        <span className="block font-display text-base uppercase">{HOUSE_INFO[k].title}</span>
                        <span className="block text-[13px] text-ink/75">{HOUSE_INFO[k].line}</span>
                      </span>
                      <Switch
                        checked={house[k]}
                        onCheckedChange={(v) => setHouse({ ...house, [k]: v })}
                        className="h-7 w-12 border-[3px] border-ink data-[state=checked]:bg-fern data-[state=unchecked]:bg-petal"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 font-display text-base uppercase">Target poin</p>
            <div className="mt-2 flex gap-3" role="radiogroup" aria-label="Target poin">
              {[100, 250, 500].map((t) => (
                <Slab key={t} tone={t === target ? 'electric' : 'paper'} active={t === target} size="sm" role="radio" aria-checked={t === target} onClick={() => setTarget(t)}>
                  {t}
                </Slab>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
