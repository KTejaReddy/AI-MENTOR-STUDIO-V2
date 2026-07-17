import { memo, useCallback, lazy, Suspense } from 'react'
import { LearningCard } from './LearningCard'
import { Code2, Play, Sparkles } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const Monaco = lazy(() => import('@/components/ui/monaco').then(m => ({ default: m.Monaco })))

interface CodeCardProps {
  code: string
  language?: string
  title?: string
  onChange?: (code: string) => void
  readOnly?: boolean
}

export const CodeCard = memo(function CodeCard({
  code,
  language = 'python',
  title = 'Code',
  onChange,
  readOnly = true,
}: CodeCardProps) {
  const handleRun = useCallback(() => {}, [])

  const toolbar = (
    <>
      <Tooltip content="Run code">
        <IconButton label="Run" size="sm" onClick={handleRun}>
          <Play className="w-3.5 h-3.5" />
        </IconButton>
      </Tooltip>
      <Tooltip content="Ask AI about code">
        <IconButton label="Ask AI" size="sm">
          <Sparkles className="w-3.5 h-3.5" />
        </IconButton>
      </Tooltip>
    </>
  )

  return (
    <LearningCard
      icon={<Code2 className="w-4 h-4 text-emerald-400" />}
      title={title}
      toolbar={toolbar}
    >
      <Suspense fallback={<div className="h-[400px] rounded-xl bg-surface-150 border border-border flex items-center justify-center text-sm text-text-tertiary">Loading editor...</div>}>
        <Monaco
          value={code}
          language={language}
          onChange={onChange}
          readOnly={readOnly}
        />
      </Suspense>
    </LearningCard>
  )
})
