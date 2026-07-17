import { memo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Download,
  Maximize2,
  Printer,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react'

interface TopicHeaderProps {
  subject: string
  topic: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  mode: string
  readingTime?: string
  onBack?: () => void
}

const difficultyConfig = {
  beginner: { color: 'success' as const, label: 'Beginner' },
  intermediate: { color: 'warning' as const, label: 'Intermediate' },
  advanced: { color: 'error' as const, label: 'Advanced' },
}

export const TopicHeader = memo(function TopicHeader({
  subject,
  topic,
  difficulty,
  mode,
  readingTime = '15 min',
  onBack,
}: TopicHeaderProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const config = difficultyConfig[difficulty]

  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Tooltip content="Go back">
              <IconButton label="Go back" size="sm" onClick={onBack}>
                <ArrowLeft className="w-[18px] h-[18px]" />
              </IconButton>
            </Tooltip>
          )}
          <nav className="hidden sm:flex items-center gap-1.5 text-[10px] text-text-tertiary min-w-0">
            <span className="truncate">{subject}</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-text-secondary truncate">{topic}</span>
          </nav>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip content={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
            <IconButton
              label="Bookmark"
              size="sm"
              onClick={() => setBookmarked(!bookmarked)}
              className={bookmarked ? 'text-accent-light' : ''}
            >
              <Bookmark className="w-[18px] h-[18px]" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Share">
            <IconButton label="Share" size="sm">
              <Share2 className="w-[18px] h-[18px]" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Export as PDF">
            <IconButton label="Export" size="sm">
              <Download className="w-[18px] h-[18px]" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Print">
            <IconButton label="Print" size="sm">
              <Printer className="w-[18px] h-[18px]" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Ask AI">
            <IconButton label="Ask AI" variant="primary" size="sm">
              <Sparkles className="w-[18px] h-[18px]" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-text-primary leading-tight mb-2">
            {topic}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-tertiary">{subject}</span>
            <span className="text-text-tertiary">·</span>
            <Badge variant={config.color} size="sm">{config.label}</Badge>
            <Badge variant="accent" size="sm">{mode}</Badge>
            <span className="text-text-tertiary">·</span>
            <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <Clock className="w-3 h-3" />
              {readingTime} read
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
