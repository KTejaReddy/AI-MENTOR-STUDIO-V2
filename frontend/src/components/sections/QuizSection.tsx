import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const QuizSection = memo(function QuizSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const questions = data?.questions ?? data?.quiz ?? []
  if (!questions.length) return null
  return (
    <div className="space-y-4">
      {questions.map((q: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-3">Q{i + 1}. {q.q ?? q.question}</p>
          {q.options?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {q.options.map((opt: string, oi: number) => (
                <div
                  key={oi}
                  className={`px-3 py-2 rounded-lg text-xs transition-all ${
                    oi === (q.correct ?? q.answerIndex)
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-surface-200 border border-border text-text-secondary'
                  }`}
                >
                  <span className="font-mono text-xs opacity-60 mr-2">{String.fromCharCode(65 + oi)}</span>
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
