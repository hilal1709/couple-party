import { Capacitor } from '@capacitor/core'
import { Download04Icon } from '@hugeicons/core-free-icons'
import { useEffect, useState } from 'react'
import { Banner } from '@/components/feedback/Banner'
import { Loader } from '@/components/feedback/Loader'
import { toast } from '@/components/feedback/toast'
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
      toast('Unduhan selesai. Tinggal pasang.', { tone: 'success' })
    } catch (e) {
      setPhase({ k: 'error', rel, message: e instanceof Error ? e.message : String(e) })
      toast('Pembaruan gagal diunduh.', { tone: 'error' })
    }
  }

  const firstNote = rel.notes.split('\n').map((l) => l.replace(/^[-*#\s]+/, '').trim()).find(Boolean)
  const pct = phase.k === 'downloading' ? Math.round(phase.progress * 100) : 0

  return (
    <Banner
      tone={phase.k === 'error' ? 'error' : 'success'}
      icon={Download04Icon}
      className="min-w-0 flex-1"
      title={
        <>
          Versi {rel.version} tersedia <span className="font-sans text-xs normal-case">({rel.sizeMb} MB · kamu di {current})</span>
        </>
      }
      action={
        phase.k === 'available' ? (
          <Slab tone="ink" size="sm" onClick={start}>
            Unduh & pasang
          </Slab>
        ) : phase.k === 'needPermission' ? (
          <>
            <Slab tone="ink" size="sm" onClick={() => ApkUpdater.openInstallSettings()}>
              Buka pengaturan
            </Slab>
            <Slab tone="paper" size="sm" onClick={start}>
              Sudah, lanjut
            </Slab>
          </>
        ) : phase.k === 'error' ? (
          <Slab tone="paper" size="sm" onClick={start}>
            Coba lagi
          </Slab>
        ) : undefined
      }
    >
      {phase.k === 'available' && firstNote && <p className="truncate">{firstNote}</p>}
      {phase.k === 'needPermission' && <p>Android perlu izin "Pasang aplikasi tak dikenal" untuk Couple Party. Aktifkan, lalu kembali ke sini.</p>}
      {phase.k === 'downloading' && (
        <div className="mt-1 flex items-center gap-2" aria-label={`Mengunduh ${pct} persen`}>
          <Loader size={44} />
          <div className="flex-1">
            <div className="h-4 -skew-x-12 border-[3px] border-ink bg-paper">
              <div className="h-full bg-rose transition-[width] duration-150" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs">Mengunduh… {pct}%</p>
          </div>
        </div>
      )}
      {phase.k === 'installing' && <p>Ketuk "Perbarui" di layar pemasang Android. App akan terbuka lagi dengan versi baru.</p>}
      {phase.k === 'error' && <p>{phase.message}. Cek sinyal lalu coba lagi.</p>}
    </Banner>
  )
}
