import { useState, useRef, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResizablePanelProps {
  children: ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
  className?: string
  onResize?: (width: number) => void
}

export function ResizablePanel({
  children,
  defaultWidth = 320,
  minWidth = 240,
  maxWidth = 480,
  side = 'right',
  className,
  onResize,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = width
    },
    [width]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isResizing) return
      const delta = side === 'right' ? startXRef.current - e.clientX : e.clientX - startXRef.current
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta))
      setWidth(newWidth)
      onResize?.(newWidth)
    },
    [isResizing, side, minWidth, maxWidth, onResize]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  return (
    <div
      className={cn('relative flex shrink-0', className)}
      style={{ width }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {children}
      <div
        className={cn(
          'absolute top-0 w-1 h-full cursor-col-resize group z-10',
          side === 'right' ? '-left-0.5' : '-right-0.5'
        )}
        onMouseDown={handleMouseDown}
      >
        <div
          className={cn(
            'absolute top-0 h-full w-px transition-colors duration-200',
            isResizing ? 'bg-accent/50' : 'bg-transparent group-hover:bg-border-lighter'
          )}
        />
      </div>
    </div>
  )
}
