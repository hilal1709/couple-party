import { useGSAP } from '@gsap/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { SmileIcon } from '@hugeicons/core-free-icons'
import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '@/audio/audio'
import { cn } from '@/lib/utils'
import type { EmoteChannel } from '@/games/types'
import { bubbleSpot, EMOTES, emoteById, type Emote } from './emotes'

gsap.registerPlugin(useGSAP)

const SHOW_MS = 2500
const COOLDOWN_MS = 1500
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Shown = { key: number; seat: number; emote: Emote }
let keySeq = 0

/** Kursi yang sedang tampil di layar; game menandainya dengan `data-seat`. */
function seatRect(seat: number) {
  for (const el of document.querySelectorAll(`[data-seat="${seat}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return r
  }
  return null
}

function Bubble({ item, name, onDone }: { item: Shown; name: string; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const anchored = useRef(false)
  const [still] = useState(reduceMotion)

  useGSAP(() => {
    const el = box.current!
    const rect = seatRect(item.seat)
    anchored.current = rect !== null
    const { x, y } = bubbleSpot(rect, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight)
    gsap.set(el, { x, y, visibility: 'visible' })
    if (!still) gsap.from(el, { scale: 0.3, rotation: -14, duration: 0.32, ease: 'back.out(2.2)' })
  }, [])

  useEffect(() => {
    const t = setTimeout(onDone, SHOW_MS)
    return () => clearTimeout(t)
  }, [onDone])

  const { emote } = item
  return (
    <div ref={box} className="invisible fixed left-0 top-0 flex w-max max-w-[150px] flex-col items-center">
      {emote.kind === 'sticker' ? (
        <img src={still ? emote.art : emote.anim} alt={emote.label} className="h-16 w-auto drop-shadow-[2px_2px_0_#121212]" draggable={false} />
      ) : (
        <span className="-rotate-2 border-[3px] border-ink bg-paper px-2 py-1 text-center font-display text-sm uppercase leading-tight shadow-slab-sm">{emote.label}</span>
      )}
      <span className="mt-0.5 max-w-full truncate bg-ink px-1.5 text-[10px] font-bold uppercase leading-4 text-paper">{name}</span>
    </div>
  )
}

function Picker({ onPick }: { onPick: (e: Emote) => void }) {
  return (
    <div role="menu" aria-label="Pilih emote" className="grid grid-cols-[auto_auto] gap-2 border-[3px] border-ink bg-paper p-2 shadow-slab">
      <div className="grid grid-cols-4 gap-1">
        {EMOTES.filter((e) => e.kind === 'sticker').map((e) => (
          <button key={e.id} role="menuitem" aria-label={e.label} onClick={() => onPick(e)} className="flex size-14 items-center justify-center border-2 border-transparent hover:border-ink focus-visible:border-ink">
            {e.kind === 'sticker' && <img src={reduceMotion() ? e.art : e.anim} alt="" className="max-h-12 w-auto" draggable={false} />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {EMOTES.filter((e) => e.kind === 'text').map((e) => (
          <button key={e.id} role="menuitem" onClick={() => onPick(e)} className="border-2 border-ink bg-petal px-2 py-1 font-display text-[11px] uppercase leading-tight hover:bg-rose focus-visible:bg-rose">
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Tombol emote, pemilih, dan gelembung di kursi pengirim. Dipasang sekali di Room. */
export function EmoteLayer({ channel, seat, names, low }: { channel: EmoteChannel; seat: number; names: string[]; low?: boolean }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState<Shown[]>([])
  const lastSent = useRef(0)

  const show = useCallback((id: string, from: number) => {
    const emote = emoteById(id)
    if (!emote) return
    // tiap kursi cuma punya satu gelembung
    setShown((cur) => [...cur.filter((s) => s.seat !== from), { key: ++keySeq, seat: from, emote }])
    sfx('ui-select', { volume: 0.35 })
  }, [])

  useEffect(() => channel.on(show), [channel, show])

  const pick = (e: Emote) => {
    setOpen(false)
    const now = Date.now()
    if (now - lastSent.current < COOLDOWN_MS) return
    lastSent.current = now
    channel.send(e.id)
    show(e.id, seat)
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-live="polite">
        {shown.map((s) => (
          <Bubble key={s.key} item={s} name={names[s.seat] ?? '?'} onDone={() => setShown((cur) => cur.filter((c) => c.key !== s.key))} />
        ))}
      </div>
      {open && <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />}
      <div
        className={cn(
          'fixed left-[max(4px,env(safe-area-inset-left))] z-[59] flex gap-2',
          low ? 'bottom-[max(6px,env(safe-area-inset-bottom))] items-end' : 'top-1/2 -translate-y-1/2 items-center',
        )}
      >
        <button
          aria-label="Kirim emote"
          aria-expanded={open}
          onClick={() => {
            sfx('ui-click', { volume: 0.6 })
            setOpen((v) => !v)
          }}
          className={cn('flex size-10 items-center justify-center rounded-full border-[3px] border-ink shadow-slab-sm', open ? 'bg-rose' : 'bg-electric')}
        >
          <HugeiconsIcon icon={SmileIcon} size={22} strokeWidth={2.4} />
        </button>
        {open && <Picker onPick={pick} />}
      </div>
    </>
  )
}
