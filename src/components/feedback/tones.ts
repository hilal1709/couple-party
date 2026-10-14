import { Alert02Icon, Cancel01Icon, InformationCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import type { FeedbackTone } from './toast'

export const TONE_CLASS: Record<FeedbackTone, string> = {
  info: 'bg-paper text-ink',
  success: 'bg-electric text-ink',
  warn: 'bg-[#ffcc1f] text-ink',
  error: 'bg-ink text-petal',
}

export const TONE_ICON = {
  info: InformationCircleIcon,
  success: Tick02Icon,
  warn: Alert02Icon,
  error: Cancel01Icon,
} satisfies Record<FeedbackTone, unknown>
