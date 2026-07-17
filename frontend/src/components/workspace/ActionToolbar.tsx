import { memo, useCallback } from 'react'
import { Copy, Bookmark, Pin, RefreshCw, Maximize2, Minimize2, Printer, Download, Share2, Eye, Check, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

interface ActionToolbarProps {
  sectionId: string
  sectionTitle: string
  isExpanded: boolean
  isBookmarked: boolean
  isPinned: boolean
  isCompleted: boolean
  onToggleExpand: () => void
  onBookmark: () => void
  onPin: () => void
  onComplete: () => void
  onCopy: () => void
  onPrint: () => void
  onExport: (format: 'markdown' | 'pdf' | 'html') => void
  onFullscreen: () => void
  onShare: () => void
  onRegenerate?: () => void
}

export const ActionToolbar = memo(function ActionToolbar({
  sectionId,
  sectionTitle,
  isExpanded,
  isBookmarked,
  isPinned,
  isCompleted,
  onToggleExpand,
  onBookmark,
  onPin,
  onComplete,
  onCopy,
  onPrint,
  onExport,
  onFullscreen,
  onShare,
  onRegenerate,
}: ActionToolbarProps) {
  const { toast } = useToast()

  const handleCopy = useCallback(() => {
    onCopy()
    toast({ title: 'Copied', description: `${sectionTitle} content copied to clipboard`, duration: 2000 })
  }, [onCopy, sectionTitle, toast])

  const handleBookmark = useCallback(() => {
    onBookmark()
    toast({ title: isBookmarked ? 'Bookmark removed' : 'Bookmarked', description: `${sectionTitle} ${isBookmarked ? 'removed from' : 'added to'} bookmarks`, duration: 2000 })
  }, [onBookmark, isBookmarked, sectionTitle, toast])

  const handlePin = useCallback(() => {
    onPin()
    toast({ title: isPinned ? 'Unpinned' : 'Pinned', description: `${sectionTitle} ${isPinned ? 'unpinned' : 'pinned'}`, duration: 2000 })
  }, [onPin, isPinned, sectionTitle, toast])

  const actions = [
    { icon: isExpanded ? ChevronUp : Eye, label: isExpanded ? 'Collapse' : 'Expand', onClick: onToggleExpand, active: false },
    { icon: Copy, label: 'Copy', onClick: handleCopy, active: false },
    { icon: Bookmark, label: isBookmarked ? 'Bookmarked' : 'Bookmark', onClick: handleBookmark, active: isBookmarked },
    { icon: Pin, label: isPinned ? 'Pinned' : 'Pin', onClick: handlePin, active: isPinned },
    { icon: Check, label: isCompleted ? 'Completed' : 'Mark complete', onClick: onComplete, active: isCompleted },
    { icon: Maximize2, label: 'Fullscreen', onClick: onFullscreen, active: false },
  ]

  return (
    <div className="flex items-center gap-0.5" role="toolbar" aria-label={`Actions for ${sectionTitle}`}>
      {actions.map(({ icon: Icon, label, onClick, active }) => (
        <button
          key={label}
          onClick={onClick}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            active
              ? 'text-accent-light bg-accent/10'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface-200',
          )}
          aria-label={label}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <span className="w-px h-4 bg-border mx-0.5" />
      <button onClick={() => onExport('markdown')} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors" aria-label="Export as Markdown" title="Export Markdown"><Download className="w-3.5 h-3.5" /></button>
      <button onClick={onPrint} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors" aria-label="Print section" title="Print"><Printer className="w-3.5 h-3.5" /></button>
      <button onClick={onShare} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors" aria-label="Share section" title="Share"><Share2 className="w-3.5 h-3.5" /></button>
      {onRegenerate && (
        <button onClick={onRegenerate} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors" aria-label="Regenerate section" title="Regenerate"><RefreshCw className="w-3.5 h-3.5" /></button>
      )}
    </div>
  )
})
