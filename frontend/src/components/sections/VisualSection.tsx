import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const VisualSection = memo(function VisualSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.content && !data?.visuals?.length && !data?.items?.length) return null
  const visuals = data.visuals ?? data.items ?? [{ title: data.title, caption: data.caption }]
  return (
    <div className="space-y-6">
      {visuals.map((v: any, i: number) => (
        <div key={i}>
          {v.title && <p className="text-xs font-semibold text-text-primary mb-2">{v.title}</p>}
          <div className="p-4 rounded-xl bg-surface-150 border border-border flex items-center justify-center min-h-[80px]">
            {v.content && <p className="text-xs text-text-secondary">{v.content}</p>}
            {!v.content && <p className="text-xs text-text-tertiary italic">[Visual]</p>}
          </div>
          {v.caption && <p className="text-xs text-text-tertiary mt-1.5 text-center">{v.caption}</p>}
        </div>
      ))}
    </div>
  )
})
