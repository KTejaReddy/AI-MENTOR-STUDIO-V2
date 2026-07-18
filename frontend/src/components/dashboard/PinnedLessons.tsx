import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DashboardWidget } from './DashboardWidget'
import { Pin, BookOpen } from 'lucide-react'
import type { DashPinnedLesson } from '@/types/workspace'

export const PinnedLessons = memo(function PinnedLessons() {
  const navigate = useNavigate()
  const [pinned] = useLocalStorage<DashPinnedLesson[]>('mentor-pinned-lessons', [])

  if (pinned.length === 0) return null

  return (
    <DashboardWidget title="Pinned" icon={<Pin className="w-4 h-4" />}>
      <div className="space-y-1">
        {pinned.map((p) => (
          <button
            key={p.tabId}
            onClick={() => navigate('/learn')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-100 transition-colors text-left"
          >
            <BookOpen className="w-3 h-3 text-text-tertiary shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-text-primary truncate">{p.topic}</div>
              <div className="text-xs text-text-tertiary">{p.subject}</div>
            </div>
          </button>
        ))}
      </div>
    </DashboardWidget>
  )
})
