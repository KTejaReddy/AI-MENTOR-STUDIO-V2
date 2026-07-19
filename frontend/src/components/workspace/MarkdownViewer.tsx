import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface MarkdownViewerProps {
  content?: string
  className?: string
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  if (!content) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-center p-8', className)}>
        <div className="w-16 h-16 rounded-2xl bg-surface-150 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">No content yet</p>
        <p className="text-xs text-text-tertiary max-w-xs">
          Select a section from the sidebar to view learning material
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="prose dark:prose-invert max-w-none px-1">
        {/* Simple markdown rendering - will be replaced with react-markdown */}
        <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </ScrollArea>
  )
}
