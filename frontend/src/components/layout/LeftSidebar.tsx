import { memo, useState, useRef, useEffect } from 'react'
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
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />
    case 'generating':
      return (
        <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-lessons)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-lessons)]"></span>
        </span>
      )
    case 'retrying': return <Loader2 className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0 animate-spin" />
    case 'queued': return <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
    case 'error': return <XCircle className="w-3.5 h-3.5 text-[var(--color-error)] shrink-0" />
    default: return <Circle className="w-3.5 h-3.5 text-border shrink-0" />
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
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMobileExpanded(false)
      }
    }
    if (mobileExpanded) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileExpanded])

  const handleMobileClick = () => {
    if (window.innerWidth < 768) {
      setMobileExpanded(true)
    }
  }

  const handleSectionSelect = (sectionId: string) => {
    onSelectSection?.(sectionId)
    setMobileExpanded(false)
  }

  return (
    <>
      <aside className="w-full h-full flex flex-col overflow-hidden shrink-0 panel" style={{ pointerEvents: 'auto' }}>
        <div className="px-4 py-4 border-b border-border shrink-0 max-md:px-2 max-md:flex max-md:justify-center bg-surface-50">
          <h2 className="text-sm font-semibold text-text-primary max-md:hidden tracking-tight">Lesson Sections</h2>
          {isGenerating ? (
            <p className="text-xs text-[var(--color-lessons)] flex items-center gap-1.5 mt-1 font-medium max-md:hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-lessons)] animate-ping" />
              Generating lesson...
            </p>
          ) : doneCount > 0 ? (
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 max-md:hidden font-medium">
              <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" /> {doneCount} / {statusCount} completed
            </p>
          ) : (
            <p className="text-xs text-text-tertiary mt-1 max-md:hidden font-medium">{statusCount} sections</p>
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
                onClick={() => {
                  if (window.innerWidth < 768) handleMobileClick()
                  else handleSectionSelect(sectionId)
                }}
                className={cn(
                  'w-full flex items-center max-md:justify-center gap-2.5 px-3 max-md:px-0 py-2 min-h-[40px] rounded-lg text-xs transition-colors text-left group relative overflow-hidden',
                  isActive
                    ? 'text-[var(--color-lessons)] font-medium bg-[var(--color-lessons)]/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-100',
                  (sStatus === 'waiting') && !isActive && 'opacity-60',
                )}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="relative z-10 text-xs font-mono text-text-tertiary w-4 shrink-0 max-md:hidden">{idx + 1}.</span>
                <span className="relative z-10 w-4 h-4 flex items-center justify-center shrink-0">
                  <Icon className={cn('w-3.5 h-3.5 transition-transform duration-150', isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary')} />
                </span>
                <span className={cn(
                  'relative z-10 flex-1 truncate transition-colors duration-150 max-md:hidden font-medium text-[13px]',
                  (sStatus === 'generating' || sStatus === 'retrying') && 'text-[var(--color-lessons)]',
                )}>
                  {label}
                </span>
                <span className="relative z-10 max-md:absolute max-md:bottom-1 max-md:right-1"><StatusIcon status={sStatus} /></span>
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
              <div className="flex items-center justify-between text-[11px] text-text-tertiary mb-2 font-mono max-md:hidden">
                <span>PROGRESS</span>
                <span className="text-text-primary font-medium">{pct}%</span>
              </div>
              <div className="h-1.5 max-md:h-8 rounded-full bg-surface-200 overflow-hidden relative border border-border">
                <motion.div
                  className="h-full rounded-full bg-[var(--color-lessons)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* Mobile Floating Panel */}
      <AnimatePresence>
        {mobileExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              ref={panelRef}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-[68px] top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0 w-64 bg-surface/95 backdrop-blur-xl border-r border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="px-4 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary">Lesson Sections</h2>
              </div>
              <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                {sections.map((sectionId, idx) => {
                  const sStatus = sectionStatuses[sectionId] || 'waiting'
                  const Icon = getSectionIcon(sectionId)
                  const label = getSectionLabel(sectionId)
                  const isActive = activeSectionId === sectionId

                  return (
                    <button
                      key={sectionId}
                      onClick={() => handleSectionSelect(sectionId)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                        isActive
                          ? 'bg-[var(--color-lessons)]/10 text-[var(--color-lessons)] font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-100',
                        (sStatus === 'waiting') && !isActive && 'opacity-60'
                      )}
                    >
                      <span className="font-mono text-text-tertiary w-4 text-xs">{idx + 1}.</span>
                      <Icon className={cn('w-4 h-4', isActive ? 'text-accent' : 'text-text-tertiary')} />
                      <span className="flex-1 truncate">{label}</span>
                      <StatusIcon status={sStatus} />
                    </button>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
})
