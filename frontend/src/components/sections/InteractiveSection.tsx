import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const InteractiveSection = memo(function InteractiveSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const simulations = data?.simulations ?? data?.items ?? []
  const hasContent = simulations.length > 0 || data?.content
  if (!hasContent) return null
  return (
    <div className="space-y-4">
      {simulations.map((sim: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-surface-150 border border-border">
          {sim.title && <p className="text-xs font-semibold text-text-primary mb-3">{sim.title}</p>}
          {sim.steps?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {sim.steps.map((step: string, j: number) => (
                <div key={j} className="flex items-start gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-surface-200 flex items-center justify-center text-[9px] text-text-tertiary shrink-0 mt-0.5">{j + 1}</span>
                  <span className="text-text-secondary">{step}</span>
                </div>
              ))}
            </div>
          )}
          {sim.result && (
            <div className="p-2 rounded-lg bg-accent/5 border border-accent/10 text-[10px] text-accent-light">{sim.result}</div>
          )}
        </div>
      ))}
      {data?.content && !simulations.length && (
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs text-text-secondary">{data.content}</p>
        </div>
      )}
    </div>
  )
})
