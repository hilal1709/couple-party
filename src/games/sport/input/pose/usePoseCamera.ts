import { useEffect, useRef, useState, type RefObject } from 'react'
import { closeCamera, openCamera, PoseTracker, type PoseFrame } from './tracker'

export type CameraStatus = 'off' | 'opening' | 'on' | 'denied' | 'failed'

/**
 * Kamera & pelacak hanya hidup selama `active`. Model tetap termuat di antara giliran
 * supaya giliran berikutnya langsung siap.
 */
export function usePoseCamera(video: RefObject<HTMLVideoElement | null>, active: boolean, onFrame: (f: PoseFrame) => void) {
  const [status, setStatus] = useState<CameraStatus>('off')
  const tracker = useRef<PoseTracker | null>(null)
  // buka-tutup dijalankan berurutan: play() yang tumpang tindih saling membatalkan
  const queue = useRef<Promise<void>>(Promise.resolve())
  const cb = useRef(onFrame)
  useEffect(() => {
    cb.current = onFrame
  })

  useEffect(() => {
    if (!active) return
    let gone = false
    const v = video.current
    if (!v) return
    const open = async () => {
      if (gone) return
      setStatus('opening')
      try {
        await openCamera(v)
        if (!tracker.current) {
          const t = new PoseTracker((f) => cb.current(f))
          await t.load('GPU')
          tracker.current = t
        }
        if (gone) return closeCamera(v)
        tracker.current.start(v)
        setStatus('on')
      } catch (e) {
        closeCamera(v)
        if (!gone) setStatus(e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'failed')
      }
    }
    queue.current = queue.current.then(open)
    return () => {
      gone = true
      tracker.current?.stop()
      queue.current = queue.current.then(() => closeCamera(v))
      setStatus('off')
    }
  }, [active, video])

  useEffect(
    () => () => {
      void queue.current.then(() => {
        tracker.current?.close()
        tracker.current = null
      })
    },
    [],
  )

  return status
}
