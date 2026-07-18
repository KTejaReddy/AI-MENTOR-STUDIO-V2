import { memo, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DashboardWidget } from './DashboardWidget'
import { BarChart3, TrendingUp, BookOpen, Bookmark, Clock } from 'lucide-react'
import type { DashRecentTopic, DashboardStats } from '@/types/workspace'

export const WeeklyStats = memo(function WeeklyStats() {
  const [recentTopics] = useLocalStorage<DashRecentTopic[]>('mentor-recent-topics', [])
  const [tabs] = useLocalStorage<any[]>('mentor-tabs', [])

  const stats = useMemo<DashboardStats>(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const weeklyActivity: Record<string, number> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    recentTopics.forEach((t) => {
      if (t.timestamp >= weekAgo) {
        const day = days[new Date(t.timestamp).getDay()]
        weeklyActivity[day] = (weeklyActivity[day] || 0) + 1
      }
    })

    const subjectCounts: Record<string, number> = {}
    recentTopics.forEach((t) => { subjectCounts[t.subject] = (subjectCounts[t.subject] || 0) + 1 })
    const mostStudied = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    const totalStudyTime = tabs.reduce((acc: number, t: any) => acc + (t.studyTime || 0), 0)

    return {
      totalStudyTime,
      completedSections: recentTopics.reduce((acc, t) => acc + t.completed, 0),
      totalBookmarks: 0,
      topicCount: recentTopics.length,
      mostStudiedSubject: mostStudied,
      lastStudiedAt: recentTopics[0]?.timestamp ?? null,
      weeklyActivity,
    }
  }, [recentTopics, tabs])

  const maxActivity = Math.max(...Object.values(stats.weeklyActivity), 1)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const formatStudyTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <DashboardWidget title="Weekly Stats" icon={<BarChart3 className="w-4 h-4" />}>
      <div className="space-y-3">
        {/* Activity chart */}
        <div className="flex items-end gap-1.5 h-16">
          {days.map((day) => {
            const count = stats.weeklyActivity[day] ?? 0
            const height = Math.round((count / maxActivity) * 100)
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-text-tertiary">{count || ''}</span>
                <div className="w-full rounded-sm bg-surface-200 relative" style={{ height: '48px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-sm bg-accent/60 transition-all duration-500"
                    style={{ height: `${Math.max(height, count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="text-xs text-text-tertiary">{day}</span>
              </div>
            )
          })}
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-100 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-0.5">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Study Time</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{formatStudyTime(stats.totalStudyTime)}</span>
          </div>
          <div className="bg-surface-100 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-0.5">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">Topics</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{stats.topicCount}</span>
          </div>
          <div className="bg-surface-100 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-0.5">
              <BookOpen className="w-3 h-3" />
              <span className="text-xs">Subject</span>
            </div>
            <span className="text-sm font-semibold text-text-primary truncate">{stats.mostStudiedSubject}</span>
          </div>
          <div className="bg-surface-100 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-text-tertiary mb-0.5">
              <Bookmark className="w-3 h-3" />
              <span className="text-xs">Completed</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{stats.completedSections}</span>
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
})
