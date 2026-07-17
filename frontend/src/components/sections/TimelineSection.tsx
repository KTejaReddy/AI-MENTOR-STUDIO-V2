import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const TimelineSection = memo(function TimelineSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const events = data?.events ?? data?.items ?? []
  if (!events.length) return null
  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-accent/40 via-emerald-500/30 to-accent/20" />
      {events.map((ev: any, i: number) => (
        <div key={i} className="relative pb-5 last:pb-0 group">
          <div className={`absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center z-10 bg-accent/20 border-accent/30`}>
            <div className="w-2 h-2 rounded-full bg-current opacity-40" />
          </div>
          <div className="pl-8">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono text-text-tertiary">{ev.era ?? ev.year ?? ev.date}</span>
              <span className="text-xs font-medium text-text-primary">{ev.title ?? ev.event}</span>
            </div>
            <p className="text-xs text-text-secondary">{ev.description ?? ev.desc ?? ''}</p>
          </div>
        </div>
      ))}
    </div>
  )
})
