import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ResourcesSection = memo(function ResourcesSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const resources = data?.resources ?? data?.items ?? []
  if (!resources.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {resources.map((r: any, i: number) => (
        <div key={i} className="p-3 rounded-xl bg-surface-150 border border-border hover:border-accent/30 transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-1">
            {r.type && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                r.type === 'Article' ? 'bg-accent/15 text-accent-light' :
                r.type === 'Video' ? 'bg-red-500/15 text-red-300' :
                r.type === 'Tutorial' ? 'bg-blue-500/15 text-blue-300' :
                r.type === 'Course' ? 'bg-violet-500/15 text-violet-300' :
                r.type === 'Practice' ? 'bg-emerald-500/15 text-emerald-300' :
                'bg-amber-500/15 text-amber-300'
              }`}>
                {r.type}
              </span>
            )}
            {r.difficulty && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                r.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-300' :
                r.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-300' :
                'bg-red-500/10 text-red-300'
              }`}>
                {r.difficulty}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-text-primary">{r.title ?? r.name}</p>
        </div>
      ))}
    </div>
  )
})
