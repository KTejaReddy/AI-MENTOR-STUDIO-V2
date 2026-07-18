import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'primary'
  size?: 'sm' | 'default'
  label: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'default', label, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.95]',
          {
            'text-text-tertiary hover:text-text-primary hover:bg-surface-150': variant === 'ghost',
            'text-text-secondary border border-border hover:border-border-light hover:text-text-primary hover:bg-surface-150': variant === 'secondary',
            'bg-accent text-white hover:bg-accent-dark shadow-glow-sm': variant === 'primary',
            'h-10 w-10 md:h-8 md:w-8': size === 'sm',
            'h-11 w-11 md:h-9 md:w-9': size === 'default',
          },
          className
        )}
        {...props}
      />
    )
  }
)
IconButton.displayName = 'IconButton'

export { IconButton }
