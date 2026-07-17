import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DashboardWidget } from './DashboardWidget'
import { BookOpen, Clock, TrendingUp } from 'lucide-react'
import type { DashRecentTopic } from '@/types/workspace'

export const ContinueLearning = memo(function ContinueLearning() {
  const navigate = useNavigate()
  const [recentTopics] = useLocalStorage<DashRecentTopic[]>('mentor-recent-topics', [])

  const recent = recentTopics.slice(0, 5)

  if (recent.length === 0) {
    return (
      <DashboardWidget title="Continue Learning" icon={<BookOpen className="w-4 h-4" />}>
        <p className="text-xs text-text-tertiary text-center py-6">
          No learning history yet.<br />
          <button onClick={() => navigate('/learn')} className="text-accent-light hover:underline mt-1 inline-block">
            Start a lesson
          </button>
        </p>
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Continue Learning"
      icon={<Clock className="w-4 h-4" />}
      action={<button onClick={() => navigate('/learn')} className="text-[10px] text-accent-light hover:underline">Open</button>}
    >
      <div className="space-y-1.5">
        {recent.map((topic, idx) => (
          <button
            key={`${topic.subject}-${topic.topic}-${idx}`}
            onClick={() => navigate('/learn')}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-surface-100 transition-colors text-left"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded bg-surface-200 text-text-tertiary text-xs">
              <BookOpen className="w-3 h-3" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-text-primary truncate">{topic.topic}</div>
              <div className="text-[10px] text-text-tertiary">{topic.subject} · {topic.difficulty}</div>
            </div>
            <div className="shrink-0 text-[10px] text-text-tertiary">
              {topic.completed}/{topic.total}
            </div>
          </button>
        ))}
      </div>
    </DashboardWidget>
  )
})
