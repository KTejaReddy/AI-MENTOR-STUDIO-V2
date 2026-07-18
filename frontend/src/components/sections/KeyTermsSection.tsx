import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const KeyTermsSection = memo(function KeyTermsSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const terms = data?.terms ?? data?.items ?? []
  if (!terms.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {terms.map((t: any, i: number) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-150 border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-[5px] shrink-0" />
          <div>
            <p className="text-xs font-semibold text-text-primary mb-0.5">{typeof t === 'string' ? t : t.term ?? t.name}</p>
            {typeof t !== 'string' && (t.def ?? t.definition) && (
              <p className="text-xs text-text-tertiary leading-relaxed">{t.def ?? t.definition}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
})
