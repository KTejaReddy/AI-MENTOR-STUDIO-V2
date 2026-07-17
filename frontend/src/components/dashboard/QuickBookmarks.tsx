import { memo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DashboardWidget } from './DashboardWidget'
import { Bookmark } from 'lucide-react'
import type { TabSession } from '@/types/workspace'

export const QuickBookmarks = memo(function QuickBookmarks() {
  const [tabs] = useLocalStorage<TabSession[]>('mentor-tabs', [])
  const allBookmarks = tabs.flatMap((t) =>
    (t.memory?.bookmarks ?? []).map((b) => ({ ...b, tabLabel: t.label, subject: t.subject })),
  ).slice(0, 5)

  if (allBookmarks.length === 0) return null

  const typeLabels: Record<string, string> = { topic: 'Topic', section: 'Section', code: 'Code', formula: 'Formula', interview: 'Interview' }

  return (
    <DashboardWidget title="Recent Bookmarks" icon={<Bookmark className="w-4 h-4" />}>
      <div className="space-y-1">
        {allBookmarks.map((b) => (
          <div key={b.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg">
            <span className="px-1 py-0.5 text-[9px] font-medium bg-surface-200 rounded text-text-tertiary">{typeLabels[b.type] ?? b.type}</span>
            <span className="text-xs text-text-primary truncate">{b.label}</span>
          </div>
        ))}
      </div>
    </DashboardWidget>
  )
})
