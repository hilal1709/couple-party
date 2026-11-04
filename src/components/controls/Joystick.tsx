import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const R = 52

/**
 * Area stik gerak: stik muncul di bawah jari yang pertama menyentuh area ini.
 * `onMove(x, y)` panjang 0..1, y positif = ke atas layar.
 */
export function Joystick({ onMove, className }: { onMove: (x: number, y: number) => void; className?: string }) {
  const el = useRef<HTMLDivElement>(null)
  const finger = useRef<{ id: number; x: number; y: number } | null>(null)
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)

  const down = (e: React.PointerEvent) => {
    if (finger.current) return
    el.current!.setPointerCapture(e.pointerId)
    const rect = el.current!.getBoundingClientRect()
    finger.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    setStick({ x: e.clientX - rect.left, y: e.clientY - rect.top, dx: 0, dy: 0 })
  }

  const move = (e: React.PointerEvent) => {
    const f = finger.current
    if (!f || f.id !== e.pointerId) return
    const dx = e.clientX - f.x
    const dy = e.clientY - f.y
    const len = Math.min(1, Math.hypot(dx, dy) / R)
    const a = Math.atan2(dy, dx)
    onMove(Math.cos(a) * len, -Math.sin(a) * len)
    setStick((s) => s && { ...s, dx: Math.cos(a) * len * R, dy: Math.sin(a) * len * R })
  }

  const up = (e: React.PointerEvent) => {
    if (finger.current?.id !== e.pointerId) return
    finger.current = null
    onMove(0, 0)
    setStick(null)
  }

  return (
    <div ref={el} data-testid="joystick" className={cn('touch-none', className)} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {stick && (
        <span className="pointer-events-none absolute size-[104px] rounded-full border-[3px] border-paper/70 bg-ink/25" style={{ left: stick.x - R, top: stick.y - R }}>
          <span className="absolute top-1/2 left-1/2 size-12 rounded-full border-[3px] border-ink bg-electric" style={{ transform: `translate(calc(-50% + ${stick.dx}px), calc(-50% + ${stick.dy}px))` }} />
        </span>
      )}
    </div>
  )
}
