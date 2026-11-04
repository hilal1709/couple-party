import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { sfx } from '@/audio/audio'

/**
 * Tombol ketuk untuk kontrol game: bereaksi saat jari menempel (pointerdown), bukan `click`.
 * `click` di Android tidak terkirim kalau jari lain sedang menahan stik, jadi tombol Lompat
 * dengan onClick tidak bisa dipakai sambil berjalan.
 */
export function TapButton({ label, onTap, className, children, silent }: { label: string; onTap: () => void; className?: string; children: ReactNode; silent?: boolean }) {
  const [on, setOn] = useState(false)
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // pointer sintetis (tes) tidak bisa ditangkap
        }
        setOn(true)
        if (!silent) sfx('ui-click', { volume: 0.5 })
        onTap()
      }}
      onPointerUp={() => setOn(false)}
      onPointerCancel={() => setOn(false)}
      onContextMenu={(e) => e.preventDefault()}
      // keyboard / pembaca layar: click tanpa pointer (detail 0)
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
      className={cn(
        'grid -skew-x-6 touch-none select-none place-items-center border-[3px] border-ink font-display uppercase text-ink shadow-slab',
        on && 'translate-x-[3px] translate-y-[4px] shadow-slab-sm',
        className,
      )}
    >
      <span className="skew-x-6">{children}</span>
    </button>
  )
}
