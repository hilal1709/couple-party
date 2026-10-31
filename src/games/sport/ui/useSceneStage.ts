import { useEffect, useRef, useState } from 'react'
import { savedQuality, Stage, type Quality } from '../render/stage'

/** Panggung + adegan satu cabang: dibuat saat papan terbuka, dibuang saat keluar. */
export function useSceneStage<T extends { load: () => Promise<void> }>(make: (st: Stage) => T, onDowngrade: (q: Quality) => void) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const scene = useRef<T | null>(null)
  const [ready, setReady] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let alive = true
    const st = new Stage(cv, savedQuality())
    const sc = make(st)
    stage.current = st
    st.onDowngrade = onDowngrade
    sc.load()
      .then(() => {
        if (!alive) return
        scene.current = sc
        st.start()
        setReady(true)
      })
      .catch(() => alive && setBroken(true))
    return () => {
      alive = false
      scene.current = null
      stage.current = null
      setReady(false)
      st.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { canvas, stage, scene, ready, broken }
}
