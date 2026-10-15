import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { sprite } from '../art'
import { CardBack, CardFace } from '../CardFace'
import type { Card } from '../../types'

/** Tumpukan kartu tertutup dengan jumlahnya. */
export function Pile({ count, width = 46, label, onClick, hot }: { count: number; width?: number; label?: string; onClick?: () => void; hot?: boolean }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      aria-label={label ? `${label}: ${count} kartu` : `${count} kartu`}
      className={cn('relative flex flex-col items-center', onClick && 'transition-transform active:scale-95')}
    >
      <span className="relative block" style={{ width: width + 6, height: width * 1.4 + 6 }}>
        {count > 1 && <CardBack width={width} className="absolute left-1.5 top-1.5" />}
        {count > 0 ? (
          <CardBack width={width} className="absolute left-0 top-0" />
        ) : (
          <span className="absolute inset-0 rounded-[8px] border-[3px] border-dashed border-ink/50" style={{ width, height: width * 1.4 }} />
        )}
        {hot && <span aria-hidden className="absolute -bottom-2 left-1 right-2 h-1.5 -skew-x-12 border-2 border-ink bg-electric" />}
      </span>
      <span className="mt-1 border-2 border-ink bg-paper px-1 font-display text-[9px] uppercase">
        {label ? `${label} · ` : ''}
        {count}
      </span>
    </Comp>
  )
}

/** Deretan kartu bertumpuk sebagian. */
export function CardRow({ cards, width = 44, step, hidden = 0, className }: { cards: Card[]; width?: number; step?: number; hidden?: number; className?: string }) {
  const gap = step ?? width * 0.55
  const n = cards.length
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: n ? (n - 1) * gap + width : width, height: width * 1.4 }}>
      {cards.map((c, i) => (
        <span key={c.id + i} className="absolute top-0" style={{ left: i * gap }}>
          {i >= n - hidden ? <CardBack width={width} /> : <CardFace card={c} width={width} />}
        </span>
      ))}
    </div>
  )
}

/** Label kecil miring di meja. */
export function Tag({ children, tone = 'paper', className }: { children: ReactNode; tone?: 'paper' | 'electric' | 'rose' | 'ink'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block border-2 border-ink px-1.5 font-display text-[10px] uppercase leading-relaxed',
        tone === 'paper' && 'bg-paper',
        tone === 'electric' && 'bg-electric',
        tone === 'rose' && 'bg-rose',
        tone === 'ink' && 'bg-ink text-petal',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Tumpukan chip kecil + angka. */
export function Chips({ amount, size = 18, className }: { amount: number; size?: number; className?: string }) {
  const n = amount <= 0 ? 0 : Math.min(3, Math.ceil(Math.log10(amount + 1)))
  return (
    <span className={cn('inline-flex items-center gap-1 font-display text-[11px]', className)}>
      <span className="relative inline-block" style={{ width: size, height: size + n * 3 }}>
        {Array.from({ length: Math.max(1, n) }, (_, i) => (
          <img key={i} src={sprite(`chip-${i % 4}`)} alt="" className="absolute left-0" style={{ width: size, bottom: i * 3, opacity: n ? 1 : 0.35 }} draggable={false} />
        ))}
      </span>
      {amount}
    </span>
  )
}
