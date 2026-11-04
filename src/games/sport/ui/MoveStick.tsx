import { useEffect, useRef, useState } from 'react'

/** Analog gerak: pemain sendiri yang menentukan posisi, ke segala arah. `onMove(x, y)`: kanan & atas positif. */
export function MoveStick({ onMove }: { onMove: (x: number, z: number) => void }) {
  const R = 46
  const base = useRef<HTMLDivElement>(null)
  const id = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const len = Math.min(1, Math.hypot(dx, dy) / R)
    const a = Math.atan2(dy, dx)
    const x = Math.cos(a) * len
    const y = Math.sin(a) * len
    setKnob({ x: x * R, y: y * R })
    onMove(x, -y)
  }
  const end = () => {
    id.current = null
    setKnob({ x: 0, y: 0 })
    onMove(0, 0)
  }
  useEffect(() => () => onMove(0, 0), [onMove])
  return (
    <div
      ref={base}
      aria-label="Analog gerak"
      className="pointer-events-auto absolute bottom-4 left-4 size-[120px] touch-none rounded-full border-[3px] border-paper/80 bg-ink/30"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        id.current = e.pointerId
        update(e)
      }}
      onPointerMove={(e) => id.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="pointer-events-none absolute top-1/2 left-1/2 size-13 rounded-full border-[3px] border-ink bg-electric" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  )
}
