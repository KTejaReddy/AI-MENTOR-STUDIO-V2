import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const CheatSheetSection = memo(function CheatSheetSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.items?.length && !data?.content) return null
  const groups = data.items ?? (data.content ? [{ title: 'Notes', items: Array.isArray(data.content) ? data.content : [data.content] }] : [])
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {groups.map((group: any, i: number) => (
        <div key={i} className={`rounded-xl p-4 border ${group.color === 'amber' ? 'bg-amber-500/5 border-amber-500/10' : group.color === 'violet' ? 'bg-violet-500/5 border-violet-500/10' : 'bg-surface-150 border-border'} ${group.spanFull ? 'sm:col-span-2' : ''}`}>
          {group.title && <p className="text-xs font-semibold text-text-primary mb-3">{group.title}</p>}
          {group.items?.length > 0 && (
            <ul className="space-y-1.5">
              {group.items.map((item: string, j: number) => (
                <li key={j} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="w-1 h-1 rounded-full bg-accent/50 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
})
