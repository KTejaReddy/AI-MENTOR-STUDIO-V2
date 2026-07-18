import { forwardRef, useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', loading, disabled, children, onClick, ...props }, ref) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])
    const containerRef = useRef<HTMLButtonElement>(null)
    const rippleId = useRef(0)

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = rippleId.current++
      setRipples((prev) => [...prev, { x, y, id }])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
      onClick?.(e)
    }

    return (
      <button
        ref={(el) => {
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
          containerRef.current = el
        }}
        disabled={disabled || loading}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] relative overflow-hidden select-none',
          {
            'bg-gradient-to-br from-accent to-accent-dark text-white shadow-glow-accent hover:shadow-glow-accent-lg hover:brightness-110 hover:scale-[1.02] focus-visible:ring-accent/40': variant === 'primary',
            'bg-surface-200 text-text-secondary border border-border hover:border-border-light hover:text-text-primary hover:bg-surface-250 hover:shadow-sm hover:scale-[1.02] focus-visible:ring-accent/30': variant === 'secondary',
            'text-text-tertiary hover:text-text-primary hover:bg-surface-150 focus-visible:ring-accent/30': variant === 'ghost',
            'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 hover:scale-[1.02] focus-visible:ring-red-500/30': variant === 'danger',
            'bg-accent/10 text-accent-light border border-accent/20 hover:bg-accent/15 hover:scale-[1.02] focus-visible:ring-accent/30': variant === 'accent',
            'min-h-[48px] px-4 md:min-h-[32px] md:h-8 md:px-3 text-sm md:text-xs': size === 'sm',
            'min-h-[48px] px-6 md:min-h-[40px] md:h-10 md:px-4 text-base md:text-sm': size === 'default',
            'min-h-[56px] px-8 md:min-h-[48px] md:h-12 md:px-6 text-lg md:text-base': size === 'lg',
            'min-h-[48px] min-w-[48px] md:min-h-[36px] md:min-w-[36px] md:h-9 md:w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute pointer-events-none rounded-full bg-white/20"
            style={{
              left: r.x - 6,
              top: r.y - 6,
              width: 12,
              height: 12,
              animation: 'ripple 0.6s ease-out forwards',
            }}
          />
        ))}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
