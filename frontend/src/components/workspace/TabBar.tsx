import { memo, useRef, useCallback, useEffect } from 'react'
import { useTabs } from '@/contexts/TabContext'
import { cn } from '@/lib/utils'
import { X, GraduationCap, Pin, PinOff, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface TabBarProps {
  onNewLesson?: () => void
}

function truncateLabel(label: string, max = 25): string {
  if (label.length <= max) return label
  return label.slice(0, max - 3) + '...'
}

export const TabBar = memo(function TabBar({ onNewLesson }: TabBarProps) {
  const { tabs, activeTabId, switchTab, closeTab, pinTab } = useTabs()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeTabId])

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) { e.preventDefault(); closeTab(tabId) }
    },
    [closeTab],
  )

  // Sort: pinned first, then by lastAccessedAt descending
  const sorted = [...tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.lastAccessedAt - a.lastAccessedAt
  })

  if (tabs.length === 0) return null

  return (
    <div className="flex items-center bg-surface-200/80 border-b border-border shrink-0 overflow-hidden" role="tablist" aria-label="Learning sessions">
      <div ref={scrollRef} className="flex-1 flex overflow-x-auto scrollbar-none touch-pan-x snap-x snap-mandatory">
        {sorted.map((tab) => {
          const isActive = tab.id === activeTabId
          const truncated = truncateLabel(tab.label)
          const needsTooltip = tab.label.length > 25

          return (
            <div
              key={tab.id}
              ref={tab.id === activeTabId ? activeRef : undefined}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              onClick={() => switchTab(tab.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(tab.id) } }}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
              className={cn(
                'group flex items-center gap-1.5 px-3 py-2 min-h-[48px] text-[13px] border-r border-border transition-colors shrink-0 max-w-48 cursor-pointer relative snap-start',
                isActive
                  ? 'bg-surface-50 text-text-primary border-t-2 border-t-accent border-b-0 shadow-sm'
                  : 'bg-surface-200 text-text-tertiary hover:bg-surface-150 hover:text-text-secondary border-t-2 border-t-transparent',
              )}
            >
              <GraduationCap
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isActive ? 'text-accent-light' : 'text-text-tertiary group-hover:text-text-secondary',
                )}
              />
              {needsTooltip ? (
                <Tooltip content={tab.label}>
                  <span className="truncate">{truncated}</span>
                </Tooltip>
              ) : (
                <span className="truncate">{truncated}</span>
              )}
              {tab.subject && (
                <span className="text-xs text-text-tertiary hidden sm:inline truncate max-w-[4rem] opacity-60">
                  {tab.subject}
                </span>
              )}

              {/* Pin button */}
              <button
                onClick={(e) => { e.stopPropagation(); pinTab(tab.id, !tab.pinned) }}
                className={cn(
                  'shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-all -ml-1',
                  tab.pinned
                    ? 'text-accent-light opacity-100'
                    : 'opacity-0 md:opacity-0 group-hover:opacity-100 opacity-100 sm:opacity-0 text-text-tertiary hover:text-text-primary',
                )}
                aria-label={tab.pinned ? 'Unpin tab' : 'Pin tab'}
              >
                {tab.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>

              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                className="shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-all -ml-1"
                aria-label="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>
      <button
        onClick={onNewLesson}
        className="shrink-0 px-2.5 py-2 text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors border-l border-border"
        aria-label="New learning session"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
})
