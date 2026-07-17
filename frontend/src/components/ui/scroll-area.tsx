import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both'
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-auto scrollbar-thin',
          orientation === 'vertical' && 'overflow-x-hidden',
          orientation === 'horizontal' && 'overflow-y-hidden',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
