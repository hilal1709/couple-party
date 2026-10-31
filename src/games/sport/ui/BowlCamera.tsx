import { Lottie } from 'lottie-react'
import { useEffect, useRef, useState } from 'react'
import { Slab } from '@/components/memphis/Slab'
import swingGuide from '@/assets/lottie/sport-swing.json'
import type { PoseFrame } from '../input/pose/tracker'
import { usePoseCamera } from '../input/pose/usePoseCamera'
import { BowlGesture, type BowlSwing } from '../sports/bowling/gesture'
import type { BowlThrow } from '../sports/bowling/sim'
import { CameraFrame } from './shared'

/** badan harus terlihat selama ini sebelum gestur dibaca */
const SETTLE_MS = 800
/** badan hilang selama ini baru dianggap keluar bingkai */
const LOST_MS = 2500

type Read = 'find' | 'lower' | 'swing'

/**
 * Giliran lewat kamera: video kecil untuk mengecek bingkai, tulisan besar karena pemain berdiri jauh.
 * Video tidak dikirim ke mana pun, hanya titik tubuh yang dibaca di HP ini.
 */
export function BowlCamera({ active, onAim, onThrow, onButtons }: { active: boolean; onAim: (th: BowlThrow) => void; onThrow: (th: BowlThrow) => void; onButtons: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const gesture = useRef(new BowlGesture())
  const seenSince = useRef(0)
  const lastSeen = useRef(0)
  const lastX = useRef(99)
  const [read, setRead] = useState<Read>('find')
  const [lost, setLost] = useState(false)

  const onFrame = (f: PoseFrame) => {
    const { pose, swing } = gesture.current.push(f.landmarks, f.at)
    if (!pose) {
      seenSince.current = 0
      setRead('find')
      if (lastSeen.current && f.at - lastSeen.current > LOST_MS) setLost(true)
      return
    }
    lastSeen.current = f.at
    setLost(false)
    seenSince.current ||= f.at
    if (f.at - seenSince.current < SETTLE_MS) return
    setRead(pose.armed ? 'swing' : 'lower')
    if (Math.abs(pose.x - lastX.current) > 0.02) {
      lastX.current = pose.x
      onAim({ x: pose.x, dir: 0, speed: 8, spin: 0 })
    }
    if (swing) throwIt(swing)
  }

  const throwIt = (s: BowlSwing) => {
    gesture.current.reset()
    onThrow({ x: s.x, dir: s.dir, speed: s.speed, spin: s.spin })
  }

  const status = usePoseCamera(video, active, onFrame)

  // giliran baru mulai bersih, supaya sisa ayunan sebelumnya tidak melempar sendiri
  useEffect(() => {
    if (!active) return
    seenSince.current = 0
    lastSeen.current = 0
    gesture.current.reset()
  }, [active])

  const failed = status === 'denied' || status === 'failed'
  const line = failed
    ? status === 'denied'
      ? 'Izin kamera ditolak'
      : 'Kamera tidak bisa dibuka'
    : status !== 'on'
      ? 'Menyiapkan kamera…'
      : read === 'find'
        ? 'Mundur sampai bahu & pinggul kelihatan'
        : read === 'lower'
          ? 'Turunkan tangan dulu'
          : 'AYUNKAN KE ATAS!'

  return (
    <div className={`pointer-events-none absolute inset-0 ${active ? '' : 'invisible'}`}>
      <CameraFrame video={video} highlight={read === 'swing'} />

      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1">
        {read !== 'swing' && !failed && status === 'on' && <Lottie src={swingGuide} autoplay loop className="size-24" />}
        <p aria-live="polite" className={`border-[3px] border-ink px-3 py-1 text-center font-display text-2xl leading-tight ${read === 'swing' ? 'bg-electric' : 'bg-paper'}`}>
          {line}
        </p>
        {(failed || lost) && (
          <Slab tone="rose" size="sm" className="pointer-events-auto mt-1" onClick={onButtons}>
            Pakai tombol
          </Slab>
        )}
      </div>
    </div>
  )
}
