import { forwardRef, type HTMLAttributes, type ReactNode, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
}

export function DropdownMenu({ trigger, children, align = 'start' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 top-full mt-1 min-w-[12rem] p-1.5 rounded-xl',
            'bg-surface-200/95 backdrop-blur-xl border border-border shadow-elevated',
            'animate-fade-in',
            align === 'end' ? 'right-0' : 'left-0'
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

const DropdownMenuItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { danger?: boolean }>(
  ({ className, danger, ...props }, ref) => (
    <div
      ref={ref}
      role="menuitem"
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 min-h-[48px] rounded-lg text-sm cursor-pointer transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-300/50',
        className
      )}
      {...props}
    />
  )
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('h-px bg-border my-1 -mx-1', className)} {...props} />
  )
)
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export { DropdownMenuItem, DropdownMenuSeparator }
