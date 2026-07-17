import { useState, useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, side = 'top', delay = 400 }: TooltipProps) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), delay)
  }

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current)
    setShow(false)
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-surface-400/95 backdrop-blur-md border border-border-light rounded-md shadow-lg whitespace-nowrap pointer-events-none animate-fade-in',
            side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
            side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-1.5',
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-1.5',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-1.5'
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
