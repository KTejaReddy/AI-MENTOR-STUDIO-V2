import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const FlowchartSection = memo(function FlowchartSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const steps = data?.steps ?? data?.items ?? []
  if (!steps.length) return null
  return (
    <div className="relative pl-8 space-y-0">
      {steps.map((step: any, i: number) => (
        <div key={i} className="relative pb-6 last:pb-0">
          <div className="absolute left-0 top-0 w-6 flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-bold text-accent-light z-10">
              {step.step ?? i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-gradient-to-b from-accent/30 to-transparent mt-1" />
            )}
          </div>
          <div className="pl-4">
            <p className="text-xs font-medium text-text-primary mb-0.5">{step.title ?? step.name}</p>
            <p className="text-xs text-text-secondary mb-1">{step.description ?? step.desc ?? ''}</p>
            {step.detail && <p className="text-xs text-text-tertiary">{step.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  )
})
