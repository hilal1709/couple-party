import type { ReactNode } from 'react'
import type { BoxHand, Stance } from '../types'

function Pad({ label, tone, size = 'size-16', onDown, onUp, children }: { label: string; tone: string; size?: string; onDown: () => void; onUp?: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
      className={`${size} ${tone} touch-none select-none rounded-full border-[3px] border-ink font-display uppercase leading-tight text-ink shadow-slab-sm active:translate-y-0.5`}
    >
      {children}
    </button>
  )
}

/** Jempol kiri menghindar & menangkis, jempol kanan memukul. */
export function BoxButtons({ onStance, onPunch }: { onStance: (s: Stance) => void; onPunch: (h: BoxHand, power: number) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between">
      <div className="pointer-events-auto flex items-end gap-2">
        <Pad label="Hindar ke kiri" tone="bg-petal text-lg" onDown={() => onStance('dodgeL')}>
          ◀
        </Pad>
        <Pad label="Hindar ke kanan" tone="bg-petal text-lg" onDown={() => onStance('dodgeR')}>
          ▶
        </Pad>
        <Pad label="Tangkis, tahan" tone="bg-electric text-[10px]" size="size-18" onDown={() => onStance('guard')} onUp={() => onStance('none')}>
          Tangkis
        </Pad>
      </div>
      <div className="pointer-events-auto flex items-end gap-2">
        <Pad label="Pukul kiri" tone="bg-rose text-[13px]" size="size-20" onDown={() => onPunch('L', 0.55)}>
          Kiri
        </Pad>
        <Pad label="Pukul kanan" tone="bg-rose text-[13px]" size="size-20" onDown={() => onPunch('R', 0.55)}>
          Kanan
        </Pad>
      </div>
    </div>
  )
}
