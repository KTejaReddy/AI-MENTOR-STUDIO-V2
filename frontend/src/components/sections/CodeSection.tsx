import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const CodeSection = memo(function CodeSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const examples = data?.examples ?? (data?.code ? [data] : [])
  if (!examples.length) return null
  return (
    <div className="space-y-4">
      {examples.map((ex: any, i: number) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-surface-150 border-b border-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400/60" />
            <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
            <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
            {ex.lang && <span className="text-[10px] text-text-tertiary ml-2 font-mono">{ex.lang}</span>}
          </div>
          <pre className="p-4 text-xs font-mono leading-relaxed text-text-secondary overflow-x-auto">
            <code>{ex.code}</code>
          </pre>
        </div>
      ))}
    </div>
  )
})
