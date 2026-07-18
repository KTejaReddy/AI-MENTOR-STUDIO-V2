import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ProblemsSection = memo(function ProblemsSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const problems = data?.problems ?? data?.items ?? []
  if (!problems.length) return null
  return (
    <div className="space-y-4">
      {problems.map((problem: any, i: number) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-150 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-text-primary">{problem.title}</p>
            {problem.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                problem.difficulty === 'Easy' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                problem.difficulty === 'Medium' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                'bg-red-500/15 text-red-300 border border-red-500/30'
              }`}>
                {problem.difficulty}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {problem.description && <p className="text-xs text-text-secondary">{problem.description}</p>}
            {problem.hint && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <strong>Hint:</strong> {problem.hint}
              </div>
            )}
            {problem.solution && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-surface-150 border-b border-border text-xs text-text-tertiary font-mono">Solution</div>
                <pre className="p-3 text-xs font-mono leading-relaxed text-text-secondary overflow-x-auto"><code>{problem.solution}</code></pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
})
