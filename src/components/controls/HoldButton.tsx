import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Tombol tahan: melapor saat jari menempel dan saat dilepas, walau jari bergeser keluar tombol. */
export function HoldButton({ label, onHold, className, children }: { label: string; onHold: (v: boolean) => void; className?: string; children: ReactNode }) {
  const [on, setOn] = useState(false)
  const set = (v: boolean) => {
    setOn(v)
    onHold(v)
  }
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn('grid touch-none select-none place-items-center border-[3px] border-ink font-display uppercase text-ink shadow-slab-sm', on && 'translate-y-0.5 shadow-none brightness-90', className)}
    >
      {children}
    </button>
  )
}
