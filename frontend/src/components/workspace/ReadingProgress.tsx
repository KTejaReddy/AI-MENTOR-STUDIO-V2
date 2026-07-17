import { memo } from 'react'
import { cn } from '@/lib/utils'

interface ReadingProgressProps {
  progress: number
  activeSection: string | null
  sectionTitles: Record<string, string>
  onSectionClick: (sectionId: string) => void
}

export const ReadingProgress = memo(function ReadingProgress({
  progress,
  activeSection,
  sectionTitles,
  onSectionClick,
}: ReadingProgressProps) {
  return (
    <div className="space-y-2">
      <div className="relative h-1 rounded-full bg-surface-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-text-tertiary text-right">{progress}% complete</p>
      {activeSection && sectionTitles[activeSection] && (
        <p className="text-[10px] text-text-tertiary truncate">
          Current: <span className="text-accent-light">{sectionTitles[activeSection]}</span>
        </p>
      )}
    </div>
  )
})
