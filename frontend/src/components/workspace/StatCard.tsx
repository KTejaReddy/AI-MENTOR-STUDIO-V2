import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  className?: string
}

export function StatCard({ icon, label, value, className }: StatCardProps) {
  return (
    <div className={cn('card p-4 flex items-center gap-3.5 group', className)}>
      <div className="w-10 h-10 rounded-lg bg-surface-100 border border-border flex items-center justify-center shrink-0 group-hover:border-border-light transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-medium text-text-primary leading-tight tracking-tight">{value}</p>
        <p className="text-[11px] text-text-secondary uppercase font-mono tracking-wider truncate mt-0.5">{label}</p>
      </div>
    </div>
  )
}
