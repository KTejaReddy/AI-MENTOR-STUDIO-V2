import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface SubjectCardProps {
  icon: ReactNode
  title: string
  description: string
  topicCount: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  onClick?: () => void
  className?: string
}

export function SubjectCard({
  icon,
  title,
  description,
  topicCount,
  difficulty,
  onClick,
  className,
}: SubjectCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'card-hover p-4 sm:p-5 text-left w-full group relative overflow-hidden transition-all duration-150',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 border border-border group-hover:border-border-light transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-medium text-text-primary truncate tracking-tight transition-colors">{title}</h3>
            {difficulty && (
              <Badge
                variant={difficulty === 'beginner' ? 'success' : difficulty === 'intermediate' ? 'warning' : 'error'}
                size="sm"
                className="capitalize text-[10px] px-1.5"
              >
                {difficulty}
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">{description}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-tertiary font-mono">{topicCount} TOPICS</span>
            <div className="w-6 h-6 rounded-md bg-surface-50 border border-border flex items-center justify-center group-hover:bg-surface-100 transition-all">
              <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
