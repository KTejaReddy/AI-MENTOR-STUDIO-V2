import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const FigureSection = memo(function FigureSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.content && !data?.caption) return null
  return (
    <div className="text-sm text-text-secondary leading-relaxed space-y-4">
      <div className="p-6 rounded-xl bg-surface-150 border border-border flex items-center justify-center min-h-[120px]">
        {data.content && <p className="text-xs text-text-secondary text-center">{data.content}</p>}
        {!data.content && <p className="text-xs text-text-tertiary italic">[Figure]</p>}
      </div>
      {data.caption && (
        <p className="text-center text-xs text-text-tertiary">{data.caption}</p>
      )}
    </div>
  )
})
