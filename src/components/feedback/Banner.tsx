import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react'
import type { ReactNode } from 'react'
import { hatch } from '@/components/memphis/patterns'
import { cn } from '@/lib/utils'
import type { FeedbackTone } from './toast'
import { TONE_CLASS, TONE_ICON } from './tones'

type Props = {
  tone?: FeedbackTone
  icon?: HugeiconsIconProps['icon']
  title?: ReactNode
  children?: ReactNode
  /** tombol/aksi di sisi kanan */
  action?: ReactNode
  onDismiss?: () => void
  /** strip tipis menempel di atas layar (status jaringan) */
  fixed?: boolean
  className?: string
}

/** Banner Memphis: strip berlis pola arsir di kiri, ikon, isi, dan aksi opsional. */
export function Banner({ tone = 'info', icon, title, children, action, onDismiss, fixed, className }: Props) {
  const body = (
    <div
      role={tone === 'error' || tone === 'warn' ? 'alert' : 'status'}
      className={cn(
        'relative flex items-start gap-2 border-[3px] border-ink py-2 pl-5 pr-3 shadow-slab',
        fixed ? 'pointer-events-auto -skew-x-6 py-0.5 shadow-slab-sm' : '-rotate-[0.6deg]',
        TONE_CLASS[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-2.5 border-r-[3px] border-ink"
        style={{ backgroundImage: hatch(tone === 'error' ? '#ffcae9' : '#121212', 6, 0.9) }}
      />
      <HugeiconsIcon icon={icon ?? TONE_ICON[tone]} size={fixed ? 15 : 19} strokeWidth={2.4} className={cn('shrink-0', fixed ? 'mt-0.5 skew-x-6' : 'mt-0.5')} />
      <div className={cn('min-w-0 flex-1', fixed && 'skew-x-6')}>
        {title && <p className={cn('font-display uppercase', fixed ? 'text-[11px]' : 'text-sm')}>{title}</p>}
        {children && <div className={cn('font-semibold leading-snug', fixed ? 'text-[12px]' : 'text-[13px]')}>{children}</div>}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Tutup" className="-mr-1 grid size-6 shrink-0 place-items-center">
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2.6} />
        </button>
      )}
    </div>
  )
  if (!fixed) return body
  return <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-[max(4px,env(safe-area-inset-top))]">{body}</div>
}
