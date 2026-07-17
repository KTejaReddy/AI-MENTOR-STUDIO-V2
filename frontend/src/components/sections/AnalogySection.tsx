import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const AnalogySection = memo(function AnalogySection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.content && !data?.analogies?.length) return null
  const analogies = data.analogies ?? [{ title: data.title, content: data.content, note: data.note }]
  return (
    <div className="text-sm text-text-secondary leading-relaxed space-y-4">
      {analogies.map((a: any, i: number) => (
        <div key={i} className="space-y-3">
          {a.title && <p className="font-semibold text-text-primary">{a.title}</p>}
          {a.content && <p>{a.content}</p>}
          {a.note && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              {a.note}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
