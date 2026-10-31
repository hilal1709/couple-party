import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Slab, Tape } from '@/components/memphis/Slab'
import { ACCESSORIES, HAIR_STYLES, HAIRS, PANTS, SHIRTS, SKINS } from '../look'
import { Chibi, loadChibi } from '../render/chibi'
import { Stage } from '../render/stage'
import type { Look } from '../types'

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-display text-[11px] uppercase">{label}</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {colors.map((c, i) => (
          <button key={c} role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} onClick={() => onPick(i)} className={`size-6 border-2 border-ink ${value === i ? 'outline-[3px] outline-offset-1 outline-rose' : ''}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}

function Chips({ label, items, value, onPick }: { label: string; items: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-display text-[11px] uppercase">{label}</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {items.map((t, i) => (
          <button key={t} role="radio" aria-checked={value === i} onClick={() => onPick(i)} className={`h-7 border-2 border-ink px-2 text-[12px] font-bold ${value === i ? 'bg-electric' : 'bg-paper'}`}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Buat karakter sendiri: pratinjau 3D yang berputar, tersimpan di HP ini. */
export function CharacterMaker({ initial, onDone }: { initial: Look; onDone: (l: Look) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const chibi = useRef<Chibi | null>(null)
  const [look, setLook] = useState(initial)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let alive = true
    const stage = new Stage(cv, 'low')
    stage.scene.background = new THREE.Color('#ffcae9')
    stage.scene.add(new THREE.HemisphereLight('#ffffff', '#ff9ad4', 2.2))
    stage.sun.position.set(2, 4, 4)
    stage.sun.intensity = 2
    stage.camera.fov = 28
    stage.camera.position.set(0, 0.9, 3.9)
    stage.camera.lookAt(0, 0.68, 0)
    void loadChibi().then((g) => {
      if (!alive) return
      const c = new Chibi(g, initial)
      c.play('idle')
      stage.scene.add(c.root)
      chibi.current = c
      stage.onFrame = (dt) => {
        c.update(dt)
        c.root.rotation.y = Math.sin(performance.now() / 1400) * 0.5
      }
      stage.start()
    })
    return () => {
      alive = false
      chibi.current = null
      stage.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => chibi.current?.setLook(look), [look])

  const set = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }))

  return (
    <div role="dialog" aria-modal="true" aria-label="Buat karakter" className="fixed inset-0 z-40 flex items-center justify-center bg-ink/70 p-3">
      <div className="flex h-full max-h-[370px] w-full max-w-[720px] gap-3 border-[3px] border-ink bg-paper p-3 shadow-lift">
        <canvas ref={canvas} className="h-full w-48 shrink-0 border-[3px] border-ink" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto pb-1 pr-1">
          <Tape tone="electric" className="self-start text-lg">
            Karaktermu
          </Tape>
          <Swatches label="Kulit" colors={SKINS} value={look.skin} onPick={(skin) => set({ skin })} />
          <Swatches label="Rambut" colors={HAIRS} value={look.hair} onPick={(hair) => set({ hair })} />
          <Chips label="Gaya" items={HAIR_STYLES} value={look.style} onPick={(style) => set({ style })} />
          <Swatches label="Kaos" colors={SHIRTS} value={look.shirt} onPick={(shirt) => set({ shirt })} />
          <Swatches label="Celana" colors={PANTS} value={look.pants} onPick={(pants) => set({ pants })} />
          <Chips label="Pernik" items={ACCESSORIES} value={look.acc} onPick={(acc) => set({ acc })} />
          <Slab tone="rose" className="mt-auto self-end px-5" onClick={() => onDone(look)}>
            Siap
          </Slab>
        </div>
      </div>
    </div>
  )
}
