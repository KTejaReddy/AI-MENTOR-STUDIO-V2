import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ExplanationSection = memo(function ExplanationSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.content) return null
  const paragraphs = Array.isArray(data.content) ? data.content : [data.content]
  return (
    <div className="text-sm text-text-secondary leading-relaxed space-y-4">
      {paragraphs.map((p: string, i: number) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
})
