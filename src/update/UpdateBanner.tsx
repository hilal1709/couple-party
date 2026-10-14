import { Capacitor } from '@capacitor/core'
import { Download04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useState } from 'react'
import { Slab } from '@/components/memphis/Slab'
import { APP_VERSION, ApkUpdater, compareVersions, fetchLatest, installedVersion, type Release } from './updater'

type Phase =
  | { k: 'idle' }
  | { k: 'available'; rel: Release }
  | { k: 'needPermission'; rel: Release }
  | { k: 'downloading'; rel: Release; progress: number }
  | { k: 'installing'; rel: Release }
  | { k: 'error'; rel: Release; message: string }

/**
 * Cek versi terbaru di GitHub Releases saat app dibuka (khusus APK).
 * Kalau ada yang lebih baru: unduh di dalam app lalu buka pemasang Android.
 */
export function UpdateBanner() {
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [current, setCurrent] = useState(APP_VERSION)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let alive = true
    ;(async () => {
      const [rel, cur] = await Promise.all([fetchLatest(), installedVersion()])
      if (!alive) return
      setCurrent(cur)
      if (rel && compareVersions(rel.version, cur) > 0) setPhase({ k: 'available', rel })
    })()
    return () => {
      alive = false
    }
  }, [])

  if (phase.k === 'idle') return <p className="text-xs font-semibold text-ink/70">Versi {current}</p>

  const rel = phase.rel
  const start = async () => {
    try {
      const { allowed } = await ApkUpdater.canInstall()
      if (!allowed) return setPhase({ k: 'needPermission', rel })
      setPhase({ k: 'downloading', rel, progress: 0 })
      const sub = await ApkUpdater.addListener('progress', ({ progress }) =>
        setPhase((p) => (p.k === 'downloading' ? { ...p, progress } : p)),
      )
      await ApkUpdater.downloadAndInstall({ url: rel.apkUrl })
      await sub.remove()
      setPhase({ k: 'installing', rel })
    } catch (e) {
      setPhase({ k: 'error', rel, message: e instanceof Error ? e.message : String(e) })
    }
  }

  const firstNote = rel.notes.split('\n').map((l) => l.replace(/^[-*#\s]+/, '').trim()).find(Boolean)

  return (
    <div role="status" className="relative -rotate-1 border-[3px] border-ink bg-electric p-3 shadow-slab">
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={Download04Icon} size={20} strokeWidth={2.4} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm uppercase">
            Versi {rel.version} tersedia <span className="font-sans text-xs normal-case">({rel.sizeMb} MB · kamu di {current})</span>
          </p>
          {firstNote && <p className="mt-0.5 truncate text-[13px] font-semibold">{firstNote}</p>}

          {phase.k === 'available' && (
            <Slab tone="ink" size="sm" className="mt-2" onClick={start}>
              Unduh & pasang
            </Slab>
          )}

          {phase.k === 'needPermission' && (
            <div className="mt-2 space-y-2 text-[13px] font-semibold">
              <p>Android perlu izin "Pasang aplikasi tak dikenal" untuk Couple Party. Aktifkan, lalu kembali ke sini.</p>
              <div className="flex gap-2">
                <Slab tone="ink" size="sm" onClick={() => ApkUpdater.openInstallSettings()}>
                  Buka pengaturan
                </Slab>
                <Slab tone="paper" size="sm" onClick={start}>
                  Sudah, lanjut
                </Slab>
              </div>
            </div>
          )}

          {phase.k === 'downloading' && (
            <div className="mt-2" aria-label={`Mengunduh ${Math.round(phase.progress * 100)} persen`}>
              <div className="h-4 -skew-x-12 border-[3px] border-ink bg-paper">
                <div className="h-full bg-rose transition-[width] duration-150" style={{ width: `${Math.round(phase.progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs font-semibold">Mengunduh… {Math.round(phase.progress * 100)}%</p>
            </div>
          )}

          {phase.k === 'installing' && (
            <p className="mt-2 text-[13px] font-semibold">Ketuk "Perbarui" di layar pemasang Android. App akan terbuka lagi dengan versi baru.</p>
          )}

          {phase.k === 'error' && (
            <div className="mt-2 space-y-2 text-[13px] font-semibold">
              <p>{phase.message}. Cek sinyal lalu coba lagi.</p>
              <Slab tone="ink" size="sm" onClick={start}>
                Coba lagi
              </Slab>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
