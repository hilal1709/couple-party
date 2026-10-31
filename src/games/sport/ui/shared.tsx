import { Lottie } from 'lottie-react'
import type { ReactNode } from 'react'
import confetti from '@/assets/lottie/confetti.json'
import { LoadingScreen } from '@/components/feedback/Loader'
import { Modal } from '@/components/feedback/Modal'
import { Slab, Tape } from '@/components/memphis/Slab'
import { QUALITIES, QUALITY_TITLE, saveQuality, type Quality, type Stage } from '../render/stage'
import type { Look, SportAction } from '../types'
import { CharacterMaker } from './CharacterMaker'
import { savedLook } from './lookStore'
import type { SportSettings } from './useSportSettings'

export function SportMenu({ cfg, stage, exit }: { cfg: SportSettings; stage: Stage | null; exit: () => void }) {
  const pick = (q: Quality) => {
    saveQuality(q)
    cfg.setQuality(q)
    stage?.setQuality(q)
  }
  return (
    <Modal open={cfg.menu} onOpenChange={cfg.setMenu} title="Pengaturan" tone="electric">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-16 font-display text-sm uppercase">Kontrol</span>
          <Slab size="sm" tone={cfg.input === 'buttons' ? 'electric' : 'paper'} active={cfg.input === 'buttons'} onClick={() => cfg.choose('buttons')}>
            Tombol
          </Slab>
          <Slab size="sm" tone={cfg.input === 'camera' ? 'electric' : 'paper'} active={cfg.input === 'camera'} onClick={() => cfg.choose('camera')}>
            Kamera
          </Slab>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 font-display text-sm uppercase">Grafis</span>
          {QUALITIES.map((q) => (
            <Slab key={q} size="sm" tone={cfg.quality === q ? 'electric' : 'paper'} active={cfg.quality === q} onClick={() => pick(q)}>
              {QUALITY_TITLE[q]}
            </Slab>
          ))}
        </div>
        <Slab
          tone="paper"
          onClick={() => {
            cfg.setMenu(false)
            cfg.setMaking(true)
          }}
        >
          Ganti karakter
        </Slab>
        <Slab tone="paper" onClick={exit}>
          Keluar
        </Slab>
      </div>
    </Modal>
  )
}

/** Layar muat, layar gagal, dan pembuat karakter pertama kali. */
export function StageCover({ ready, broken, label, exit, cfg, look }: { ready: boolean; broken: boolean; label: string; exit: () => void; cfg: SportSettings; look: Look }) {
  return (
    <>
      {!ready && !broken && (
        <div className="absolute inset-0 z-10 bg-petal">
          <LoadingScreen label={label} />
        </div>
      )}
      {broken && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-petal p-6 text-center">
          <p className="font-display text-lg">Arena gagal dimuat di HP ini.</p>
          <Slab tone="rose" onClick={exit}>
            Ke menu
          </Slab>
        </div>
      )}
      {cfg.making && <CharacterMaker initial={savedLook() ?? look} onDone={cfg.saveMine} />}
    </>
  )
}

export function EndCard({ head, won, act, exit, children }: { head: string; won: boolean; act: (a: SportAction) => void; exit: () => void; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={head} className="fixed inset-0 z-30 flex overflow-y-auto bg-ink/70 px-5 py-3">
      {won && <Lottie src={confetti} autoplay loop className="pointer-events-none fixed inset-0 z-40 size-full" />}
      <div className="m-auto flex w-full max-w-2xl flex-col gap-2 border-[3px] border-ink bg-paper p-3 shadow-lift">
        <Tape tone={won ? 'electric' : 'rose'} className="self-start text-xl">
          {head}
        </Tape>
        {children}
        <div className="flex justify-end gap-2.5">
          <Slab tone="rose" className="px-4" onClick={() => act({ type: 'again' })}>
            Main lagi
          </Slab>
          <Slab tone="paper" className="px-4" onClick={exit}>
            Ke menu
          </Slab>
        </div>
      </div>
    </div>
  )
}

/** Gesture video kecil + tulisan besar: dipakai semua cabang mode kamera. */
export function CameraFrame({ video, highlight }: { video: React.RefObject<HTMLVideoElement | null>; highlight: boolean }) {
  return (
    <div className={`absolute bottom-3 right-3 h-27 w-36 overflow-hidden border-[3px] ${highlight ? 'border-electric' : 'border-ink'} bg-ink`}>
      <video ref={video} playsInline muted className="absolute inset-0 size-full -scale-x-100 object-cover" />
    </div>
  )
}
