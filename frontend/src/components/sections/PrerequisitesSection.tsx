import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const PrerequisitesSection = memo(function PrerequisitesSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const prereqs = data?.prerequisites ?? data?.items ?? []
  if (!prereqs.length) return null
  return (
    <div className="space-y-2">
      {data?.description && <p className="text-xs text-text-secondary mb-3">{data.description}</p>}
      {prereqs.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-150 border border-border">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-primary">{typeof p === 'string' ? p : p.topic ?? p.name}</p>
            {typeof p !== 'string' && (p.why ?? p.description) && (
              <p className="text-xs text-text-tertiary">{p.why ?? p.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
})
