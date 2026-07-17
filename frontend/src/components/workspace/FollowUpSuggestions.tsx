import { memo, useCallback } from 'react'
import { FOLLOW_UP_ACTIONS, type FollowUpAction } from '@/types/workspace'
import { cn } from '@/lib/utils'

interface FollowUpSuggestionsProps {
  sectionId: string
  sectionTitle: string
  onAction: (action: FollowUpAction) => void
  compact?: boolean
}

export const FollowUpSuggestions = memo(function FollowUpSuggestions({
  sectionId,
  sectionTitle,
  onAction,
  compact,
}: FollowUpSuggestionsProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-3" role="group" aria-label={`Follow-up actions for ${sectionTitle}`}>
        {FOLLOW_UP_ACTIONS.slice(0, 4).map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className="px-2 py-1 text-[11px] font-medium rounded-md border border-border bg-surface-100 text-text-secondary hover:bg-accent/10 hover:border-accent/30 hover:text-accent-light transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 pt-3 border-t border-border" role="group" aria-label={`Follow-up actions for ${sectionTitle}`}>
      <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">Explore further</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {FOLLOW_UP_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className={cn(
              'flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors',
              'border border-transparent hover:border-border hover:bg-surface-100',
            )}
            aria-label={action.label}
          >
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent/50 mt-1.5" />
            <div className="min-w-0">
              <span className="block text-xs font-medium text-text-primary truncate">{action.label}</span>
              <span className="block text-[10px] text-text-tertiary truncate">{action.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})
