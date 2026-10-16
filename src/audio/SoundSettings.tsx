import { VolumeHighIcon, VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { Slab } from '@/components/memphis/Slab'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { setSettings, sfx, useAudioSettings } from './audio'

const CREDITS = [
  { what: 'Musik menu', title: 'Funked Up', by: 'Joth', url: 'https://opengameart.org/content/funked-up' },
  { what: 'Musik UNO', title: 'Funky Menu Loop', by: 'iamoneabe', url: 'https://opengameart.org/content/funky-menu-loop' },
  { what: 'Musik Ular Tangga', title: 'Happy Clappy Loop', by: 'OwlishMedia', url: 'https://opengameart.org/content/happy-clappy-loop' },
  { what: 'Musik Tebak Gambar', title: 'Cozy Puzzle In-Game 1', by: 'MintoDog', url: 'https://opengameart.org/content/cozy-puzzle-in-game-1' },
  { what: 'Musik Kartu Remi', title: 'Mocha Frapp', by: 'Pro Sensory (Alex McCulloch)', url: 'https://opengameart.org/content/mocha-frapp' },
  { what: 'Musik Domino', title: 'Reggae', by: 'Pro Sensory (Alex McCulloch)', url: 'https://opengameart.org/content/reggae' },
  { what: 'Musik Monopoli', title: 'Catchy Swing', by: 'Doge', url: 'https://opengameart.org/content/catchy-swing' },
  { what: 'Musik Ludo', title: 'Oldskool', by: 'Of Far Different Nature', url: 'https://opengameart.org/content/oldskool' },
  { what: 'Musik Siapa Mata-mata', title: 'Sneaking Around', by: 'Umplix', url: 'https://opengameart.org/content/sneaking-around' },
  { what: 'Suara kartu', title: 'Casino Audio', by: 'Kenney', url: 'https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips' },
  { what: 'Suara tombol', title: 'Interface Sounds', by: 'Kenney', url: 'https://opengameart.org/content/interface-sounds' },
  { what: 'Jingle saksofon, steel drum, hit & pizzicato', title: 'Music Jingles', by: 'Kenney', url: 'https://opengameart.org/content/85-short-music-jingles' },
]

/** Tombol speaker yang membuka pengaturan suara. */
export function SoundButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const st = useAudioSettings()
  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          sfx('ui-open')
        }}
        aria-label="Pengaturan suara"
        className={cn(
          'grid size-9 shrink-0 place-items-center border-[3px] border-ink bg-paper shadow-slab-sm active:translate-y-0.5 active:shadow-none',
          className,
        )}
      >
        <HugeiconsIcon icon={st.muted ? VolumeMute02Icon : VolumeHighIcon} size={18} strokeWidth={2.4} />
      </button>
      <SoundDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}

function SoundDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const st = useAudioSettings()
  const [credits, setCredits] = useState(false)
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-xl border-[3px] border-b-0 border-ink bg-paper">
        <DrawerTitle className="px-5 pt-2 font-display text-xl uppercase">Suara</DrawerTitle>
        <DrawerDescription className="px-5 text-sm text-ink/75">Diatur per HP, tidak memengaruhi pemain lain.</DrawerDescription>
        <div className="max-h-[70dvh] space-y-5 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <label className="grid grid-cols-[88px_1fr_40px] items-center gap-3">
            <span className="font-display text-sm uppercase">Musik</span>
            <Slider
              value={[Math.round(st.music * 100)]}
              max={100}
              step={5}
              onValueChange={([v]) => setSettings({ music: v / 100 })}
              aria-label="Volume musik"
            />
            <span className="text-right text-sm font-semibold">{Math.round(st.music * 100)}</span>
          </label>
          <label className="grid grid-cols-[88px_1fr_40px] items-center gap-3">
            <span className="font-display text-sm uppercase">Efek</span>
            <Slider
              value={[Math.round(st.sfx * 100)]}
              max={100}
              step={5}
              onValueChange={([v]) => setSettings({ sfx: v / 100 })}
              onValueCommit={() => sfx('card-place-2')}
              aria-label="Volume efek suara"
            />
            <span className="text-right text-sm font-semibold">{Math.round(st.sfx * 100)}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Slab
              tone={st.muted ? 'rose' : 'paper'}
              size="sm"
              aria-pressed={st.muted}
              onClick={() => {
                setSettings({ muted: !st.muted })
                if (st.muted) sfx('ui-toggle')
              }}
            >
              <HugeiconsIcon icon={st.muted ? VolumeMute02Icon : VolumeHighIcon} size={16} strokeWidth={2.4} />
              {st.muted ? 'Suara mati' : 'Bisukan semua'}
            </Slab>
            <Slab tone="paper" size="sm" aria-expanded={credits} onClick={() => setCredits((c) => !c)}>
              Kredit audio
            </Slab>
          </div>
          {credits && (
            <div className="border-[3px] border-ink bg-petal p-3">
              <p className="text-[13px] font-semibold">Semua audio berlisensi CC0 (domain publik). Terima kasih kepada:</p>
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {CREDITS.map((c) => (
                  <li key={c.title}>
                    <span className="font-display text-xs uppercase">{c.what}:</span> “{c.title}” oleh {c.by}
                    <span className="block break-all text-xs text-ink/70">{c.url}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
