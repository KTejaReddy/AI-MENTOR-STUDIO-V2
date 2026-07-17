import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const ComplexitySection = memo(function ComplexitySection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const rows = data?.table ?? data?.rows ?? []
  const insights = data?.insights ?? []
  if (!rows.length && !data?.content) return null
  return (
    <div className="text-sm text-text-secondary leading-relaxed space-y-4">
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-150 border-b border-border">
                {Object.keys(rows[0]).map((key) => (
                  <th key={key} className="px-4 py-2.5 text-left text-text-primary font-medium capitalize">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-surface-100 transition-colors">
                  {Object.values(row).map((val: any, j: number) => (
                    <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-medium text-text-primary' : 'text-center font-mono'} text-xs`}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {insights.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-150 border border-border">
          <p className="text-xs font-semibold text-text-primary mb-2">Key Insights</p>
          <ul className="space-y-2 text-xs">
            {insights.map((insight: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data?.content && !rows.length && (
        <p>{data.content}</p>
      )}
    </div>
  )
})
