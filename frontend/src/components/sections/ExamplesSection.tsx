import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ExamplesSection = memo(function ExamplesSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  if (!data?.examples?.length) return null
  return (
    <div className="text-sm text-text-secondary leading-relaxed space-y-4">
      {data.examples.map((example: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-surface-150 border border-border">
          {example.title && <p className="text-xs font-semibold text-text-primary mb-2">{example.title}</p>}
          {example.description && <p className="text-xs text-text-secondary mb-2">{example.description}</p>}
          {example.steps?.length > 0 && (
            <ol className="space-y-1 mb-2">
              {example.steps.map((step: string, j: number) => (
                <li key={j} className="flex items-start gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center text-[9px] text-accent-light shrink-0 mt-0.5">{j + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          {example.result && (
            <div className="p-2 rounded-lg bg-accent/5 border border-accent/10 text-[10px] text-accent-light">{example.result}</div>
          )}
        </div>
      ))}
    </div>
  )
})
