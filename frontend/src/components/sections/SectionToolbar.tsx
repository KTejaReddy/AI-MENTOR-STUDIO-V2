import { memo } from 'react'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Copy,
  Bookmark,
  Pin,
  Printer,
  Maximize2,
  Download,
  Share2,
  CheckCircle2,
} from 'lucide-react'

interface SectionToolbarProps {
  title: string
  icon: React.ReactNode
  expanded: boolean
  completed: boolean
  bookmarked: boolean
  pinned: boolean
  onToggle: () => void
  onCopy: () => void
  onBookmark: () => void
  onPin: () => void
  onPrint: () => void
  onFullscreen: () => void
  onExport: () => void
  onComplete: () => void
}

export const SectionToolbar = memo(function SectionToolbar({
  title,
  icon,
  expanded,
  completed,
  bookmarked,
  pinned,
  onToggle,
  onCopy,
  onBookmark,
  onPin,
  onPrint,
  onFullscreen,
  onExport,
  onComplete,
}: SectionToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-150 border-b border-border">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 min-w-0 text-left group"
      >
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform duration-200',
            !expanded && '-rotate-90'
          )}
        />
        <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span>
        <span className="text-sm font-medium text-text-primary truncate group-hover:text-accent-light transition-colors">
          {title}
        </span>
        {completed && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
      </button>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip content="Mark complete">
          <IconButton label="Mark complete" size="sm" onClick={onComplete}>
            <CheckCircle2 className={cn('w-3.5 h-3.5', completed && 'text-emerald-400')} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Copy">
          <IconButton label="Copy" size="sm" onClick={onCopy}>
            <Copy className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>
        <Tooltip content={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
          <IconButton label="Bookmark" size="sm" onClick={onBookmark}>
            <Bookmark className={cn('w-3.5 h-3.5', bookmarked && 'text-accent-light fill-accent-light')} />
          </IconButton>
        </Tooltip>
        <Tooltip content={pinned ? 'Unpin' : 'Pin'}>
          <IconButton label="Pin" size="sm" onClick={onPin}>
            <Pin className={cn('w-3.5 h-3.5', pinned && 'text-accent-light rotate-45')} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Print">
          <IconButton label="Print" size="sm" onClick={onPrint}>
            <Printer className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Fullscreen">
          <IconButton label="Fullscreen" size="sm" onClick={onFullscreen}>
            <Maximize2 className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Export">
          <IconButton label="Export" size="sm" onClick={onExport}>
            <Download className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Share">
          <IconButton label="Share" size="sm">
            <Share2 className="w-3.5 h-3.5" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  )
})
