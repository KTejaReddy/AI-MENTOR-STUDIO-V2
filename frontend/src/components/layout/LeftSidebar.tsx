import { memo, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Loader2, Circle, XCircle, Clock,
  BookOpen, Lightbulb, FileText, List, Bookmark, GraduationCap,
  Puzzle, AlertTriangle, HelpCircle, ClipboardList, Map, Code2, Sigma,
  Network, Edit3, Type, FileArchive, ArrowRight
} from 'lucide-react'

const getSectionLabel = (key: string, title?: string) => {
  if (title) return title
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1)
  return capitalized.replace(/([A-Z])/g, ' $1').trim()
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

// Map section to its unique color token
const getSectionColor = (key: string) => {
  const colorMap: Record<string, string> = {
    overview: 'var(--color-lessons)',
    explanation: 'var(--color-ai)',
    keyConcepts: 'var(--color-ai)',
    formulaExplanation: 'var(--color-history)',
    derivation: 'var(--color-analytics)',
    assignment: 'var(--color-bookmarks)',
    visualization: 'var(--color-compiler)',
    diagrams: 'var(--color-compiler)',
    quiz: 'var(--color-notes)',
    summary: '#ec4899', // Pink
  }
  return colorMap[key] || 'var(--text-secondary)'
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
      <aside className="w-full h-full flex flex-col overflow-hidden shrink-0 bg-surface/50 backdrop-blur-xl border-r border-white/5 relative">
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-50" />
        
        {/* Header */}
        <div className="px-5 py-6 shrink-0 relative z-10 border-b border-white/5">
          <div className="flex items-center gap-2 mb-4 max-md:justify-center">
            <div className="w-8 h-8 rounded-full bg-[var(--color-lessons)]/20 flex items-center justify-center border border-[var(--color-lessons)]/30">
              <Map className="w-4 h-4 text-[var(--color-lessons)]" />
            </div>
            <h2 className="text-sm font-bold text-white max-md:hidden tracking-wider uppercase">Journey</h2>
          </div>

          <div className="max-md:hidden flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold font-mono text-white/50">
              <span>{doneCount} / {statusCount}</span>
              <span className="text-white">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--color-lessons)] to-[var(--color-ai)] rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Journey Timeline */}
        <nav className="flex-1 overflow-y-auto select-scrollbar px-3 py-4 space-y-1 relative z-10">
          <div className="absolute left-7 top-0 bottom-0 w-[1px] bg-white/5 max-md:hidden" />
          
          {sections.map((sectionId, idx) => {
            const sStatus = sectionStatuses[sectionId] || 'waiting'
            const Icon = getSectionIcon(sectionId)
            const label = getSectionLabel(sectionId)
            const isActive = activeSectionId === sectionId
            const color = getSectionColor(sectionId)

            return (
              <motion.button
                key={sectionId}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                onClick={() => {
                  if (window.innerWidth < 768) handleMobileClick()
                  else handleSectionSelect(sectionId)
                }}
                className={cn(
                  'w-full flex items-center gap-4 px-2 py-2 min-h-[44px] rounded-xl text-left group relative transition-all duration-300',
                  isActive ? 'bg-white/5 shadow-lg' : 'hover:bg-white/[0.02]',
                  (sStatus === 'waiting') && !isActive && 'opacity-50'
                )}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <motion.div
                    layoutId="activeSectionIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ backgroundColor: color }}
                  />
                )}

                {/* Timeline Node */}
                <div className="relative shrink-0 flex items-center justify-center max-md:mx-auto">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300",
                    isActive ? "bg-white/10" : "bg-surface-50 group-hover:bg-surface-100"
                  )} style={{ borderColor: isActive ? color : 'rgba(255,255,255,0.1)' }}>
                    {sStatus === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color }} />
                    ) : sStatus === 'generating' || sStatus === 'retrying' ? (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
                    ) : (
                      <Icon className="w-4 h-4 transition-colors" style={{ color: isActive ? color : 'rgba(255,255,255,0.4)' }} />
                    )}
                  </div>
                  
                  {/* Small progress ring for active items */}
                  {isActive && sStatus !== 'completed' && (
                    <svg className="absolute inset-0 w-8 h-8 -rotate-90 pointer-events-none">
                      <circle cx="16" cy="16" r="15" fill="none" stroke={color} strokeWidth="1" strokeDasharray="94" strokeDashoffset={sStatus === 'generating' ? "47" : "94"} className="transition-all duration-1000 opacity-50" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 max-md:hidden">
                  <h4 className={cn(
                    "text-[13px] font-bold truncate transition-colors duration-300",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white/90"
                  )}>
                    {label}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{idx + 1}</span>
                    {sStatus === 'completed' && <span className="text-[9px] font-bold uppercase tracking-widest bg-white/10 text-white/50 px-1.5 py-0.5 rounded">Done</span>}
                    {sStatus === 'error' && <span className="text-[9px] font-bold uppercase tracking-widest bg-[var(--color-error)]/20 text-[var(--color-error)] px-1.5 py-0.5 rounded">Error</span>}
                  </div>
                </div>

                {/* Arrow */}
                {isActive && (
                  <ArrowRight className="w-4 h-4 max-md:hidden opacity-50" style={{ color }} />
                )}
              </motion.button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Floating Panel */}
      <AnimatePresence>
        {mobileExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              ref={panelRef}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-[68px] top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0 w-64 bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl z-50 flex flex-col"
            >
              <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Journey</h2>
              </div>
              <nav className="flex-1 overflow-y-auto select-scrollbar p-3 space-y-1 relative">
                <div className="absolute left-7 top-0 bottom-0 w-[1px] bg-white/5" />
                {sections.map((sectionId, idx) => {
                  const sStatus = sectionStatuses[sectionId] || 'waiting'
                  const Icon = getSectionIcon(sectionId)
                  const label = getSectionLabel(sectionId)
                  const isActive = activeSectionId === sectionId
                  const color = getSectionColor(sectionId)

                  return (
                    <button
                      key={sectionId}
                      onClick={() => handleSectionSelect(sectionId)}
                      className={cn(
                        'w-full flex items-center gap-4 px-2 py-2 min-h-[44px] rounded-xl text-left relative transition-colors',
                        isActive ? 'bg-white/5' : 'hover:bg-white/[0.02]',
                        (sStatus === 'waiting') && !isActive && 'opacity-50'
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border shrink-0 z-10",
                        isActive ? "bg-white/10" : "bg-surface-50"
                      )} style={{ borderColor: isActive ? color : 'rgba(255,255,255,0.1)' }}>
                        <Icon className="w-4 h-4" style={{ color: isActive ? color : 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <div className="flex-1 truncate">
                        <h4 className={cn("text-sm font-bold truncate", isActive ? "text-white" : "text-white/60")}>{label}</h4>
                      </div>
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
