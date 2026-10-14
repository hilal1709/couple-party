import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef } from 'react'
import { sfx } from '@/audio/audio'
import { cn } from '@/lib/utils'
import { dismissToast, useToasts } from './toast'
import { TONE_CLASS, TONE_ICON } from './tones'

/** Tumpukan toast; dipasang sekali di akar app. Ketuk untuk menutup. */
export function Toaster() {
  const toasts = useToasts()
  const seen = useRef(0)
  useEffect(() => {
    const newest = toasts.at(-1)?.id ?? 0
    if (newest > seen.current) sfx('ui-select', { volume: 0.45 })
    seen.current = Math.max(seen.current, newest)
  }, [toasts])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-[max(12px,env(safe-area-inset-right))] top-[max(10px,env(safe-area-inset-top))] z-[70] flex w-[min(320px,calc(100vw-24px))] flex-col items-end gap-2"
    >
      {toasts.map((t, i) => (
        <button
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          onClick={() => dismissToast(t.id)}
          className={cn(
            'pointer-events-auto flex max-w-full items-center gap-2 border-[3px] border-ink px-3 py-1.5 text-left text-[13px] font-semibold leading-snug shadow-slab',
            'animate-in fade-in-0 slide-in-from-right-8 duration-200 motion-reduce:animate-none',
            i % 2 ? 'rotate-[0.8deg]' : '-rotate-[0.8deg]',
            TONE_CLASS[t.tone],
          )}
        >
          <HugeiconsIcon icon={TONE_ICON[t.tone]} size={18} strokeWidth={2.4} className="shrink-0" />
          <span className="min-w-0">{t.text}</span>
        </button>
      ))}
    </div>
  )
}
