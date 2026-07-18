import { memo } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Loader2, Circle, XCircle, Clock,
  BookOpen, Lightbulb, FileText, List, Bookmark, GraduationCap,
  Puzzle, AlertTriangle, HelpCircle, ClipboardList, Map, Code2, Sigma,
  Network, Edit3, Type, FileArchive,
} from 'lucide-react'

const getSectionLabel = (key: string, title?: string) => {
  if (title) return title;
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return capitalized.replace(/([A-Z])/g, ' $1').trim();
}

const getSectionIcon = (key: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    overview: Map, explanation: BookOpen, keyConcepts: Type, importantDefinitions: Bookmark,
    analogy: Lightbulb, examples: List, caseStudy: FileText, codeExamples: Code2,
    formulaExplanation: Sigma, diagrams: Network, commonMistakes: AlertTriangle,
    interviewQuestions: HelpCircle, quiz: ClipboardList, assignment: GraduationCap,
    miniProject: Puzzle, cheatSheet: FileArchive, revisionNotes: Edit3, summary: FileText,
  }
  return iconMap[key] || FileText
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    case 'generating':
      return (
        <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-[#00C2FF] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00C2FF]"></span>
        </span>
      )
    case 'retrying': return <Loader2 className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-spin" />
    case 'queued': return <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
    case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
    default: return <Circle className="w-3.5 h-3.5 text-text-tertiary/20 shrink-0" />
  }
}

interface LeftSidebarProps {
  sectionStatuses?: Record<string, string>
  isGenerating?: boolean
  completedCount?: number
  totalCount?: number
  activeSectionId?: string | null
  onSelectSection?: (sectionId: string) => void
}

export const LeftSidebar = memo(function LeftSidebar({
  sectionStatuses = {},
  isGenerating = false,
  completedCount = 0,
  totalCount = 0,
  activeSectionId = null,
  onSelectSection,
}: LeftSidebarProps) {
  const statusCount = totalCount || Object.keys(sectionStatuses).length
  const doneCount = completedCount || Object.values(sectionStatuses).filter((s) => s === 'completed' || s === 'error').length
  const pct = statusCount > 0 ? Math.round((doneCount / statusCount) * 100) : 0

  const sections = Object.keys(sectionStatuses)

  return (
    <aside className="w-full h-full flex flex-col overflow-hidden shrink-0 panel" style={{ pointerEvents: 'auto' }}>
      <div className="px-4 py-3 border-b border-border shrink-0 max-[429px]:px-2 max-[429px]:flex max-[429px]:justify-center">
        <h2 className="text-xs font-semibold text-text-primary max-[429px]:hidden">Lesson Sections</h2>
        {isGenerating ? (
          <p className="text-xs text-[#00C2FF] flex items-center gap-1.5 mt-0.5 font-medium animate-pulse max-[429px]:hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-ping" />
            Generating lesson...
          </p>
        ) : doneCount > 0 ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5 max-[429px]:hidden">
            <CheckCircle2 className="w-3 h-3" /> {doneCount} / {statusCount} completed
          </p>
        ) : (
          <p className="text-xs text-text-tertiary mt-0.5 max-[429px]:hidden">{statusCount} sections</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5" role="navigation" aria-label="Section navigation" style={{ pointerEvents: 'auto' }}>
        {sections.map((sectionId, idx) => {
          const sStatus = sectionStatuses[sectionId] || 'waiting'
          const Icon = getSectionIcon(sectionId)
          const label = getSectionLabel(sectionId)
          const isActive = activeSectionId === sectionId

            return (
              <motion.button
                key={sectionId}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectSection?.(sectionId)}
                className={cn(
                  'w-full flex items-center max-[429px]:justify-center gap-2.5 px-3 max-[429px]:px-0 py-2.5 min-h-[48px] rounded-xl text-xs transition-all text-left group relative overflow-hidden',
                  isActive
                    ? 'text-[#00f2fe] font-bold drop-shadow-[0_0_6px_rgba(0,242,254,0.3)]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/3',
                  (sStatus === 'waiting') && !isActive && 'opacity-40',
                )}
                aria-current={isActive ? 'true' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="section-active-bg"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00f2fe]/10 to-[#8b5cf6]/8 border border-[#00f2fe]/15"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
                <span className="relative z-10 text-xs font-mono text-text-tertiary w-3 shrink-0 max-[429px]:hidden">{idx + 1}.</span>
                <span className="relative z-10 w-4 h-4 flex items-center justify-center shrink-0">
                  <Icon className={cn('w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110', isActive ? 'text-[#00f2fe] animate-pulse' : 'text-text-secondary')} />
                </span>
                <span className={cn(
                  'relative z-10 flex-1 truncate transition-colors duration-300 max-[429px]:hidden',
                  (sStatus === 'generating' || sStatus === 'retrying') && 'text-[#00f2fe] font-bold animate-pulse',
                )}>
                  {label}
                </span>
                <span className="relative z-10 max-[429px]:absolute max-[429px]:bottom-1 max-[429px]:right-1"><StatusIcon status={sStatus} /></span>
              </motion.button>
            )
          })}
        </nav>

        <AnimatePresence>
          {doneCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 py-4 border-t border-border shrink-0 bg-surface-100/30"
            >
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-2 font-mono max-[429px]:hidden">
                <span>PROGRESS</span>
                <span className="text-[#00f2fe] font-bold">{pct}%</span>
              </div>
              <div className="h-1.5 max-[429px]:h-8 rounded-full bg-surface-200/50 overflow-hidden relative border border-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#8b5cf6] shadow-[0_0_10px_rgba(0,242,254,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    )
  })
