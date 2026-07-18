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
    <div className={cn('glass breathe-3d p-4 rounded-xl flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] hover:border-[#00f2fe]/20 hover:shadow-[0_0_20px_rgba(0,242,254,0.08)] border border-white/5 relative group overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00f2fe]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="w-10 h-10 rounded-xl bg-accent-muted/10 border border-[#00f2fe]/10 flex items-center justify-center shrink-0 group-hover:border-[#00f2fe]/30 transition-colors">
        {icon}
      </div>
      <div className="min-w-0 relative z-10">
        <p className="text-lg font-bold text-text-primary leading-tight tracking-tight group-hover:text-[#00f2fe] transition-colors">{value}</p>
        <p className="text-xs text-text-tertiary uppercase font-mono tracking-wider truncate mt-0.5">{label}</p>
      </div>
    </div>
  )
}
