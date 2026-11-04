import { Modal } from '@/components/feedback/Modal'
import { Slab } from '@/components/memphis/Slab'
import { cn } from '@/lib/utils'
import { CAPS, FACES, HATS, JACKETS, PANTS, SKINS, type PuncakLook } from '../look'

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-display text-xs uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {colors.map((c, i) => (
          <button
            key={c + i}
            role="radio"
            aria-checked={value === i}
            aria-label={`${label} ${i + 1}`}
            onClick={() => onPick(i)}
            className={cn('size-7 border-[3px] border-ink', value === i ? 'scale-110 shadow-none ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'shadow-slab-sm')}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  )
}

function Styles({ label, names, value, onPick }: { label: string; names: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-display text-xs uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {names.map((n, i) => (
          <Slab key={n} size="sm" tone={value === i ? 'electric' : 'paper'} active={value === i} role="radio" aria-checked={value === i} onClick={() => onPick(i)}>
            {n}
          </Slab>
        ))}
      </div>
    </div>
  )
}

/** Ganti gaya pendaki di tengah pendakian: langsung terlihat di gunung, tersimpan untuk main berikutnya. */
export function LookMaker({ open, onOpenChange, look, onChange }: { open: boolean; onOpenChange: (v: boolean) => void; look: PuncakLook; onChange: (l: PuncakLook) => void }) {
  const set = (p: Partial<PuncakLook>) => onChange({ ...look, ...p })
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Gaya pendaki" tone="electric" className="w-[min(560px,calc(100vw-32px))]">
      <div className="flex flex-col gap-2.5">
        <Styles label="Topi" names={HATS} value={look.hat} onPick={(hat) => set({ hat })} />
        <Styles label="Wajah" names={FACES} value={look.face} onPick={(face) => set({ face })} />
        <Swatches label="Kulit" colors={SKINS} value={look.skin} onPick={(skin) => set({ skin })} />
        <Swatches label="Jaket" colors={JACKETS} value={look.jacket} onPick={(jacket) => set({ jacket })} />
        <Swatches label="Celana" colors={PANTS} value={look.pants} onPick={(pants) => set({ pants })} />
        <Swatches label="Topi & tas" colors={CAPS} value={look.cap} onPick={(cap) => set({ cap })} />
      </div>
      <Slab tone="rose" size="md" className="self-end" onClick={() => onOpenChange(false)}>
        Siap mendaki
      </Slab>
    </Modal>
  )
}
