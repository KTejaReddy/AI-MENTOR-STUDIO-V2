import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ProcessSection = memo(function ProcessSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const processes = data?.processes ?? data?.items ?? []
  if (!processes.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {processes.map((proc: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-surface-150 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-text-primary">{proc.title}</p>
            {proc.complexity && <span className="ml-auto text-[10px] font-mono text-accent-light">{proc.complexity}</span>}
          </div>
          {(proc.steps ?? []).length > 0 && (
            <ol className="space-y-1">
              {(proc.steps ?? []).map((s: string, j: number) => (
                <li key={j} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="w-4 h-4 rounded bg-accent/10 flex items-center justify-center text-[9px] text-accent-light shrink-0 mt-0.5">{j + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
})
