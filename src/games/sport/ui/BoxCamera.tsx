import { useEffect, useRef, useState } from 'react'
import { Slab } from '@/components/memphis/Slab'
import type { PoseFrame } from '../input/pose/tracker'
import { usePoseCamera } from '../input/pose/usePoseCamera'
import { BoxGesture } from '../sports/boxing/gesture'
import type { BoxHand, Stance } from '../types'
import { CameraFrame } from './shared'

/** badan harus terlihat selama ini sebelum gestur dibaca */
const SETTLE_MS = 700
const LOST_MS = 2500

/** Tinju lewat kamera: video kecil untuk cek bingkai, gerak badan menjadi sikap & pukulan. */
export function BoxCamera({ active, onStance, onPunch, onButtons }: { active: boolean; onStance: (s: Stance) => void; onPunch: (h: BoxHand, power: number) => void; onButtons: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const gesture = useRef(new BoxGesture())
  const seenSince = useRef(0)
  const lastSeen = useRef(0)
  const last = useRef<Stance>('none')
  const [found, setFound] = useState(false)
  const [lost, setLost] = useState(false)

  const onFrame = (f: PoseFrame) => {
    const r = gesture.current.push(f.landmarks, f.at)
    if (!r.ok) {
      seenSince.current = 0
      setFound(false)
      if (last.current !== 'none') {
        last.current = 'none'
        onStance('none')
      }
      if (lastSeen.current && f.at - lastSeen.current > LOST_MS) setLost(true)
      return
    }
    lastSeen.current = f.at
    setLost(false)
    seenSince.current ||= f.at
    if (f.at - seenSince.current < SETTLE_MS) return
    setFound(true)
    if (r.stance !== last.current) {
      last.current = r.stance
      onStance(r.stance)
    }
    if (r.punch) onPunch(r.punch.hand, r.punch.power)
  }

  const status = usePoseCamera(video, active, onFrame)

  useEffect(() => {
    if (!active) return
    seenSince.current = 0
    lastSeen.current = 0
    gesture.current.reset()
  }, [active])

  const failed = status === 'denied' || status === 'failed'
  const line = failed ? (status === 'denied' ? 'Izin kamera ditolak' : 'Kamera tidak bisa dibuka') : status !== 'on' ? 'Menyiapkan kamera…' : found ? null : 'Mundur sampai bahu & pinggul kelihatan'

  return (
    <div className={`pointer-events-none absolute inset-0 ${active ? '' : 'invisible'}`}>
      <CameraFrame video={video} highlight={found} />
      {line && (
        <p aria-live="polite" className="absolute inset-x-0 bottom-20 mx-auto w-fit border-[3px] border-ink bg-paper px-3 py-1 text-center font-display text-2xl leading-tight">
          {line}
        </p>
      )}
      {(failed || lost) && (
        <Slab tone="rose" size="sm" className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2" onClick={onButtons}>
          Pakai tombol
        </Slab>
      )}
    </div>
  )
}
