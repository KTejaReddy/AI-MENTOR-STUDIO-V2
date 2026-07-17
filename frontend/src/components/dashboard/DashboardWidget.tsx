import { memo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardWidgetProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  action?: ReactNode
}

export const DashboardWidget = memo(function DashboardWidget({
  title,
  icon,
  children,
  className,
  action,
}: DashboardWidgetProps) {
  return (
    <div className={cn('bg-surface-50 border border-border rounded-xl p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-text-tertiary">{icon}</span>}
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
})
