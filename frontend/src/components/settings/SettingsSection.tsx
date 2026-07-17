import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
        )}
      </div>
      <div className="card p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && (
          <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
