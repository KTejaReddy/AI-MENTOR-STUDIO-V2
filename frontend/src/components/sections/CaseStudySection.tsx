import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const CaseStudySection = memo(function CaseStudySection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.content && !data?.sections?.length) return null
  const sections = data.sections ?? [{ title: data.title, content: data.content, insight: data.insight }]
  return (
    <div className="text-sm text-text-secondary leading-relaxed space-y-4">
      {sections.map((s: any, i: number) => (
        <div key={i}>
          {s.title && <p className="font-semibold text-text-primary mb-2">{s.title}</p>}
          {s.content && <p className="text-xs leading-relaxed">{s.content}</p>}
          {s.insight && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <strong>Key Insight:</strong> {s.insight}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
