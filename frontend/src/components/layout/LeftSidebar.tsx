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

// Deep, vibrant color mapping for engineering OS feel
export const getSectionColor = (key: string) => {
  const colorMap: Record<string, string> = {
    overview: '#38bdf8', // Sky Blue
    explanation: '#818cf8', // Indigo
    keyConcepts: '#6366f1', // Deeper Indigo
    formula: '#10b981', // Emerald
    formulaExplanation: '#34d399', // Light Emerald
    visualization: '#06b6d4', // Cyan
    diagrams: '#0ea5e9', // Light Blue
    examples: '#a855f7', // Purple
    codeExamples: '#d946ef', // Fuchsia
    quiz: '#f43f5e', // Rose
    assignment: '#f97316', // Orange
    summary: '#f59e0b', // Amber
  }
  return colorMap[key] || '#94a3b8'
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
      <aside className="w-full h-full flex flex-col overflow-hidden shrink-0 bg-[#060814]/90 backdrop-blur-2xl border-r border-white/5 relative shadow-[20px_0_40px_-10px_rgba(0,0,0,0.5)]">
        {/* Layered Lighting */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none mix-blend-screen" />
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-[0.15]" />
        
        {/* Header */}
        <div className="px-5 py-6 shrink-0 relative z-10 border-b border-white/[0.03] bg-white/[0.01]">
          <div className="flex items-center gap-3 mb-5 max-md:justify-center">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Map className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-[13px] font-black text-[#F8FAFC] max-md:hidden tracking-[0.15em] uppercase">Journey</h2>
          </div>

          <div className="max-md:hidden flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold font-mono text-[#94A3B8]">
              <span>{doneCount} / {statusCount} <span className="uppercase text-[9px] tracking-wider ml-1 opacity-50">Nodes</span></span>
              <span className="text-white bg-white/10 px-1.5 py-0.5 rounded shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#0F172A] rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Journey Timeline */}
        <nav className="flex-1 overflow-y-auto select-scrollbar px-3 py-6 space-y-3 relative z-10">
          {/* Animated Connecting Line Background */}
          <div className="absolute left-[27px] top-10 bottom-10 w-[2px] bg-white/[0.03] max-md:hidden rounded-full overflow-hidden">
             {/* Progress fill line */}
             <motion.div 
               className="w-full bg-gradient-to-b from-indigo-500 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.5)]"
               initial={{ height: 0 }}
               animate={{ height: `${pct}%` }}
               transition={{ duration: 1, ease: 'easeOut' }}
             />
          </div>
          
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
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05, type: 'spring', damping: 20 }}
                onClick={() => {
                  if (window.innerWidth < 768) handleMobileClick()
                  else handleSectionSelect(sectionId)
                }}
                className={cn(
                  'w-full flex items-center gap-4 px-2 py-2.5 rounded-[16px] text-left group relative transition-all duration-300',
                  isActive ? 'bg-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/[0.02]' : 'hover:bg-white/[0.02] border border-transparent',
                  (sStatus === 'waiting') && !isActive && 'opacity-40 grayscale-[50%]'
                )}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <motion.div
                    layoutId="activeSectionIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                )}

                {/* Timeline Node */}
                <div className="relative shrink-0 flex items-center justify-center max-md:mx-auto">
                  <div className={cn(
                    "rounded-[12px] flex items-center justify-center border transition-all duration-500",
                    isActive ? "w-10 h-10 bg-[#0F172A]" : "w-8 h-8 bg-[#020617] group-hover:bg-[#0F172A]"
                  )} style={{ 
                    borderColor: isActive ? color : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? `0 0 25px -5px ${color}, inset 0 1px 1px rgba(255,255,255,0.2)` : 'none'
                  }}>
                    {sStatus === 'completed' ? (
                      <CheckCircle2 className={isActive ? "w-5 h-5" : "w-4 h-4"} style={{ color }} />
                    ) : sStatus === 'generating' || sStatus === 'retrying' ? (
                      <Loader2 className={cn("animate-spin", isActive ? "w-5 h-5" : "w-4 h-4")} style={{ color }} />
                    ) : (
                      <Icon className={cn("transition-colors", isActive ? "w-5 h-5" : "w-4 h-4")} style={{ color: isActive ? color : 'rgba(255,255,255,0.3)' }} />
                    )}
                  </div>
                  
                  {/* Orbiting ring for active items */}
                  {isActive && sStatus !== 'completed' && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-[-4px] rounded-[14px] border border-dashed opacity-50"
                      style={{ borderColor: color }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 max-md:hidden flex flex-col justify-center pt-0.5">
                  <h4 className={cn(
                    "text-[14px] font-extrabold truncate transition-colors duration-300 tracking-tight",
                    isActive ? "text-[#F8FAFC]" : "text-[#94A3B8] group-hover:text-[#CBD5E1]"
                  )}>
                    {label}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: isActive ? color : 'rgba(255,255,255,0.3)' }}>
                      STEP {idx + 1}
                    </span>
                    {sStatus === 'completed' && <span className="text-[8px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-[1px] rounded-full">Completed</span>}
                    {sStatus === 'error' && <span className="text-[8px] font-bold uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-[1px] rounded-full">Error</span>}
                  </div>
                </div>

                {/* Arrow */}
                {isActive && (
                  <ArrowRight className="w-4 h-4 max-md:hidden opacity-80 transition-transform group-hover:translate-x-1" style={{ color }} />
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
              className="md:hidden fixed inset-0 z-40 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div
              ref={panelRef}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-[68px] top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0 w-64 bg-[#060814]/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl z-50 flex flex-col"
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
                        isActive ? "bg-[#0F172A]" : "bg-[#020617]"
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
