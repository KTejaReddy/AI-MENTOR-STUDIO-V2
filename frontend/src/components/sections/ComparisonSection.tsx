import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ComparisonSection = memo(function ComparisonSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const comparisons = data?.comparisons ?? data?.items ?? []
  if (!comparisons.length) return null
  return (
    <div className="space-y-3">
      {comparisons.map((item: any, i: number) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-surface-150 border-b border-border">
            <p className="text-xs font-semibold text-text-primary">{item.title ?? item.name ?? item.structure}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pros</p>
              {(item.pros ?? []).map((p: string, j: number) => (
                <p key={j} className="text-xs text-text-secondary flex items-start gap-1.5">
                  <span className="text-emerald-400">+</span> {p}
                </p>
              ))}
            </div>
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Cons</p>
              {(item.cons ?? []).map((c: string, j: number) => (
                <p key={j} className="text-xs text-text-secondary flex items-start gap-1.5">
                  <span className="text-red-400">−</span> {c}
                </p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})
