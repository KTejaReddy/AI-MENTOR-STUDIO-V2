import { useState, memo, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  StickyNote,
  Info,
  Clock,
  BookOpen,
  BarChart3,
  Layers,
  Target,
} from 'lucide-react'

interface RightPanelProps {
  topic?: string
}

export const RightPanel = memo(function RightPanel({ topic = 'Binary Search Trees' }: RightPanelProps) {
  const [noteContent, setNoteContent] = useState('')
  const charCount = noteContent.length
  const wordCount = noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteContent(e.target.value)
  }, [])

  const notesTab = (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        <Textarea
          placeholder="Write your notes here..."
          value={noteContent}
          onChange={handleChange}
          className="h-full text-sm leading-relaxed"
        />
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-[10px] text-text-tertiary bg-surface-100">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>{readingTime} min read</span>
        </div>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" />
          Auto-saved
        </span>
      </div>
    </div>
  )

  const propertiesTab = (
    <ScrollArea className="h-full p-3">
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-surface-150 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-3.5 h-3.5 text-accent-light" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Details</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { icon: BookOpen, label: 'Subject', value: 'Data Structures' },
              { icon: BarChart3, label: 'Difficulty', value: 'Intermediate' },
              { icon: Clock, label: 'Est. Time', value: '45 minutes' },
              { icon: Layers, label: 'Sections', value: '15' },
              { icon: Target, label: 'Prerequisites', value: 'Arrays, Recursion' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-text-tertiary">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                <span className="text-text-primary font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-150 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Progress</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Completion</span>
              <span className="text-accent-light font-medium">33%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
              <div className="h-full w-[33%] rounded-full bg-accent/70" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-tertiary">
              <span>5 of 15 sections completed</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )

  return (
    <Tabs
      tabs={[
        { id: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" />, content: notesTab },
        { id: 'properties', label: 'Properties', icon: <Info className="w-3.5 h-3.5" />, content: propertiesTab },
      ]}
      className="h-full bg-surface-50/40"
    />
  )
})