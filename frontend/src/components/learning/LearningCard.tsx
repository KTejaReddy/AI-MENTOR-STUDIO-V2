import { useState, memo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Copy,
  Printer,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react'

interface LearningCardProps {
  icon: ReactNode
  title: string
  children: ReactNode
  toolbar?: ReactNode
  defaultExpanded?: boolean
  className?: string
}

export const LearningCard = memo(function LearningCard({
  icon,
  title,
  children,
  toolbar,
  defaultExpanded = true,
  className,
}: LearningCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const content = (
    <div
      className={cn(
        'rounded-xl border border-border overflow-hidden transition-all duration-200',
        'bg-surface-100',
        isFullscreen && 'fixed inset-4 z-50 shadow-elevated',
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-150 border-b border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          </motion.div>
          <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span>
          <span className="text-sm font-medium text-text-primary truncate">{title}</span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          {toolbar}
          <Tooltip content="Copy">
            <IconButton label="Copy section" size="sm">
              <Copy className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Print">
            <IconButton label="Print section" size="sm">
              <Printer className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Bookmark">
            <IconButton label="Bookmark" size="sm">
              <Bookmark className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip content={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton
              label="Toggle fullscreen"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsFullscreen(false)} />
        {content}
      </>
    )
  }

  return content
})
