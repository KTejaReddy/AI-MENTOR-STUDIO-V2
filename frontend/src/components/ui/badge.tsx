import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'surface' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'default'
}

export function Badge({ className, variant = 'surface', size = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        {
          'bg-accent/12 text-accent-light border border-accent/20': variant === 'accent',
          'bg-surface-200 text-text-secondary border border-border': variant === 'surface',
          'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20': variant === 'success',
          'bg-amber-500/12 text-amber-400 border border-amber-500/20': variant === 'warning',
          'bg-red-500/12 text-red-400 border border-red-500/20': variant === 'error',
          'bg-sky-500/12 text-sky-400 border border-sky-500/20': variant === 'info',
          'px-1.5 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-0.5 text-xs': size === 'default',
        },
        className
      )}
      {...props}
    />
  )
}
