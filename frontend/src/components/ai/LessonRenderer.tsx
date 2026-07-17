import { memo } from 'react'
import type { SectionData, MappedSection, Lesson, MappedLesson } from '@/types/ai'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './MarkdownRenderer'
import {
  BookOpen, Lightbulb, FileText, List, Bookmark, Code2, Image, Sigma, BarChart3,
  Eye, BrainCircuit, HelpCircle, Puzzle, MessageSquare, ClipboardList, CheckSquare, GraduationCap, AlertTriangle,
} from 'lucide-react'

interface LessonRendererProps {
  lesson: Lesson
  mapped?: MappedLesson | null
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  explanation: BookOpen, analogy: Lightbulb, caseStudy: FileText,
  examples: List, cheatSheet: Bookmark, code: Code2,
  diagram: Image, formula: Sigma, complexity: BarChart3,
  visualization: Eye, quiz: BrainCircuit, interviewQuestions: HelpCircle,
  projects: Puzzle, mistakes: MessageSquare, commonMistakes: AlertTriangle,
  prerequisites: ClipboardList, proof: CheckSquare,
  assignment: GraduationCap,
}

function SectionCard({ icon, title, children, className }: { icon?: React.ReactNode; title?: string; children: React.ReactNode; className?: string }) {
  if (!children) return null
  return (
    <div className={cn('rounded-xl border border-border overflow-hidden bg-surface-100', className)}>
      {(icon || title) && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-150 border-b border-border">
          {icon && <span className="w-4 h-4 flex items-center justify-center text-accent-light shrink-0">{icon}</span>}
          {title && <span className="text-xs font-medium text-text-primary">{title}</span>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function ContentMarkdown({ content }: { content?: string }) {
  if (!content) return <p className="text-[10px] text-text-tertiary italic">Content not available</p>
  return <MarkdownRenderer content={content} />
}

const SECTION_COMPONENTS: Record<string, React.ComponentType<{ data: any }>> = {}

export const LessonRenderer = memo(function LessonRenderer({ lesson, mapped }: LessonRendererProps) {
  const { metadata, sections } = lesson
  if (!sections) return null

  const orderedSections = mapped?.sections || Object.entries(sections).map(([type, data]) => ({
    type,
    component: type,
    props: data as any,
    title: (data as any).title || type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
  }))

  return (
    <div className="space-y-3">
      {metadata.learningObjectives && metadata.learningObjectives.length > 0 && (
        <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
          <p className="text-[9px] font-semibold text-accent-light uppercase tracking-wider mb-1.5">Learning Objectives</p>
          <ul className="space-y-0.5">
            {metadata.learningObjectives.map((obj: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[10px] text-text-secondary">
                <span className="w-1 h-1 rounded-full bg-accent/60 mt-[5px] shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {orderedSections.map((section: any) => {
        const content = section.props?.content || ''
        const Icon = ICON_MAP[section.type]
        return (
          <SectionCard
            key={section.type}
            icon={Icon ? <Icon className="w-4 h-4" /> : undefined}
            title={section.title}
          >
            <ContentMarkdown content={content} />
          </SectionCard>
        )
      })}

      {lesson.resources?.keyTerms && lesson.resources.keyTerms.length > 0 && (
        <SectionCard icon={<Bookmark className="w-4 h-4" />} title="Key Terms">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lesson.resources.keyTerms.map((kt: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-surface-150 border border-border">
                <p className="text-xs font-semibold text-accent-light mb-0.5">{kt.term}</p>
                <p className="text-[10px] text-text-secondary">{kt.definition}</p>
                {kt.context && <p className="text-[9px] text-text-tertiary mt-0.5">Context: {kt.context}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {lesson.resources?.furtherReading && lesson.resources.furtherReading.length > 0 && (
        <SectionCard icon={<BookOpen className="w-4 h-4" />} title="Further Reading">
          <div className="space-y-2">
            {lesson.resources.furtherReading.map((fr: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-150 border border-border">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 mt-0.5 ${
                  fr.type === 'article' ? 'bg-accent/15 text-accent-light' :
                  fr.type === 'book' ? 'bg-blue-500/15 text-blue-300' :
                  fr.type === 'paper' ? 'bg-violet-500/15 text-violet-300' :
                  'bg-amber-500/15 text-amber-300'
                }`}>
                  {fr.type}
                </span>
                <div>
                  <p className="text-xs font-medium text-text-primary">{fr.title}</p>
                  {fr.description && <p className="text-[9px] text-text-tertiary">{fr.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
})
