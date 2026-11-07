import { useState } from 'react'
import { Modal } from '@/components/feedback/Modal'
import { Slab } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import type { ButtonSize, GfxChoice, PuncakSettings } from '../platform/settings'

type Tab = 'jeda' | 'grafis' | 'kontrol'

const GFX: [GfxChoice, string, string][] = [
  ['auto', 'Otomatis', 'Dipilih dari kemampuan HP, resolusi disetel sambil main'],
  ['low', 'Hemat', '30 FPS, ±720p, tanpa bayangan peta. Untuk HP RAM 3–4 GB'],
  ['med', 'Sedang', 'Sampai 60 FPS, bayangan & cahaya kilau'],
  ['high', 'Tinggi', '60 FPS, bayangan tajam, resolusi penuh'],
]

const SIZES: [ButtonSize, string][] = [
  ['kecil', 'Kecil'],
  ['sedang', 'Sedang'],
  ['besar', 'Besar'],
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-display text-xs uppercase">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Slab size="sm" tone={on ? 'electric' : 'paper'} active={on} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      {on ? 'Nyala' : 'Mati'}
    </Slab>
  )
}

/**
 * Menu jeda Puncak: lanjut, grafis, kontrol, turun gunung. Saat ada teman, dunia tetap berjalan;
 * menu ini hanya melepas kendali pendaki sendiri.
 */
export function PauseMenu({
  open,
  onOpenChange,
  settings,
  onSettings,
  gfxNow,
  together,
  onLeave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  settings: PuncakSettings
  onSettings: (s: PuncakSettings) => void
  /** profil yang sedang dipakai ronde ini */
  gfxNow: string
  together: boolean
  onLeave: () => void
}) {
  const [tab, setTab] = useState<Tab>('jeda')
  const set = (p: Partial<PuncakSettings>) => onSettings({ ...settings, ...p })
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Istirahat dulu" tone="paper" className="max-h-[calc(100dvh-24px)] w-[min(600px,calc(100vw-32px))] overflow-y-auto">
      <div className="flex gap-1.5" role="tablist">
        {(['jeda', 'grafis', 'kontrol'] as Tab[]).map((t) => (
          <Slab key={t} size="sm" role="tab" aria-selected={tab === t} tone={tab === t ? 'ink' : 'paper'} active={tab === t} onClick={() => setTab(t)}>
            {t === 'jeda' ? 'Jeda' : t === 'grafis' ? 'Grafis' : 'Kontrol'}
          </Slab>
        ))}
      </div>

      {tab === 'jeda' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{together ? 'Teman-temanmu tetap mendaki. Pendakimu diam di tempat selama menu terbuka.' : 'Gunung berhenti sampai kamu lanjut.'}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Slab tone="paper" size="md" onClick={onLeave}>
              Turun gunung
            </Slab>
            <Slab tone="rose" size="md" onClick={() => onOpenChange(false)}>
              Lanjut mendaki
            </Slab>
          </div>
        </div>
      )}

      {tab === 'grafis' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Kualitas grafis">
            {GFX.map(([v, title, line]) => (
              <button
                key={v}
                role="radio"
                aria-checked={settings.gfx === v}
                onClick={() => set({ gfx: v })}
                className={cn('border-[3px] border-ink p-2 text-left', settings.gfx === v ? 'bg-electric shadow-none' : 'bg-paper shadow-slab-sm')}
              >
                <span className="block font-display text-sm uppercase">{title}</span>
                <span className="block text-[11px] leading-tight">{line}</span>
              </button>
            ))}
          </div>
          <p className="text-[12px] text-ink/70">Sekarang: {gfxNow}. Pilihan baru berlaku di pendakian berikutnya.</p>
          <Row label="Statistik">
            <Toggle label="Tampilkan statistik frame" on={settings.stats} onChange={(stats) => set({ stats })} />
            <span className="text-[11px] text-ink/70">FPS, frame terlambat, draw call</span>
          </Row>
        </div>
      )}

      {tab === 'kontrol' && (
        <div className="flex flex-col gap-2.5">
          <Row label="Kamera">
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.1}
              value={settings.sens}
              aria-label="Kecepatan kamera"
              onChange={(e) => set({ sens: Number(e.target.value) })}
              className="h-8 flex-1 accent-rose"
            />
            <span className="w-10 text-right font-display text-sm tabular-nums">{settings.sens.toFixed(1)}×</span>
          </Row>
          <Row label="Balik Y">
            <Toggle label="Balik arah kamera atas-bawah" on={settings.invertY} onChange={(invertY) => set({ invertY })} />
          </Row>
          <Row label="Getar">
            <Toggle label="Getar saat memegang, mendarat, pingsan" on={settings.vibrate} onChange={(vibrate) => set({ vibrate })} />
          </Row>
          <Row label="Ukuran tombol">
            {SIZES.map(([v, t]) => (
              <Slab key={v} size="sm" tone={settings.buttons === v ? 'electric' : 'paper'} active={settings.buttons === v} role="radio" aria-checked={settings.buttons === v} onClick={() => set({ buttons: v })}>
                {t}
              </Slab>
            ))}
          </Row>
        </div>
      )}
    </Modal>
  )
}
