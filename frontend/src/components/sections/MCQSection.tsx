import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const MCQSection = memo(function MCQSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const questions = data?.questions ?? data?.mcqs ?? []
  if (!questions.length) return null
  return (
    <div className="space-y-4">
      {questions.map((mcq: any, i: number) => (
        <div key={i} className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-medium text-text-primary mb-3">Q{i + 1}. {mcq.q ?? mcq.question}</p>
          {mcq.options?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {mcq.options.map((opt: string, oi: number) => (
                <div
                  key={oi}
                  className={`px-3 py-2 rounded-lg text-xs ${
                    String.fromCharCode(65 + oi) === (mcq.answer ?? mcq.correctOption)
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
          {mcq.explanation && (
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 text-xs text-accent-light">
              <span className="font-semibold">Answer: {mcq.answer ?? mcq.correctOption}</span> — {mcq.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
