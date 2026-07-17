import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BookOpenText,
  FileText,
  Lightbulb,
  Puzzle,
  BookmarkIcon,
  BarChart3,
  Code2,
  Zap,
  Eye,
  ClipboardList,
  FileSpreadsheet,
  Rocket,
  AlertTriangle,
  Briefcase,
  Library,
} from 'lucide-react'

interface Section {
  id: string
  icon: typeof BookOpenText
  label: string
}

const sections: Section[] = [
  { id: 'explanation', icon: BookOpenText, label: 'Explanation' },
  { id: 'case-study', icon: FileText, label: 'Case Study' },
  { id: 'analogy', icon: Lightbulb, label: 'Analogy' },
  { id: 'examples', icon: Puzzle, label: 'Examples' },
  { id: 'cheat-sheet', icon: BookmarkIcon, label: 'Cheat Sheet' },
  { id: 'diagram', icon: BarChart3, label: 'Diagram' },
  { id: 'code', icon: Code2, label: 'Code' },
  { id: 'complexity', icon: Zap, label: 'Complexity' },
  { id: 'visualizer', icon: Eye, label: 'Visualizer' },
  { id: 'quiz', icon: ClipboardList, label: 'Quiz' },
  { id: 'assignment', icon: FileSpreadsheet, label: 'Assignment' },
  { id: 'projects', icon: Rocket, label: 'Projects' },
  { id: 'common-mistakes', icon: AlertTriangle, label: 'Common Mistakes' },
  { id: 'interview-questions', icon: Briefcase, label: 'Interview Questions' },
]

interface SectionNavProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
}

export function SectionNav({ activeSection, onSectionChange }: SectionNavProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-0.5">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group',
              activeSection === section.id
                ? 'text-accent-light bg-accent/10'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-150'
            )}
          >
            <section.icon className={cn(
              'w-4 h-4 shrink-0',
              activeSection === section.id ? 'text-accent-light' : 'text-text-tertiary group-hover:text-text-secondary'
            )} />
            <span className="truncate">{section.label}</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
