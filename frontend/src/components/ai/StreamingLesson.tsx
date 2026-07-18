import React, { memo, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarkdownRenderer } from './MarkdownRenderer'
import { InteractiveQuiz } from '@/components/learning/InteractiveQuiz'
import type { Lesson, MappedLesson, GenerationStatus } from '@/types/ai'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Loader2, Circle, XCircle, BookOpen, Lightbulb,
  FileText, List, Bookmark, GraduationCap, Puzzle, AlertTriangle,
  HelpCircle, ClipboardList, Clock, Map, Code2, Sigma,
  Network, Edit3, Type, FileArchive,
} from 'lucide-react'

class MarkdownErrorBoundary extends React.Component<{children: React.ReactNode, sectionId?: string}, {hasError: boolean, error?: Error}> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[REACT_CRASH] Markdown Render Crash in section ${this.props.sectionId || 'unknown'}:`, error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400">
          <p className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Error rendering section {this.props.sectionId}</p>
          <p className="text-xs font-mono mt-1 opacity-80">{this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

interface StreamingLessonProps {
  status: GenerationStatus
  lesson: Lesson | null
  mapped: MappedLesson | null
  accumulatedContent: string
  analysis: any | null
  errorMessage?: string | null
  errorCode?: string
  errorStage?: string
  sectionStatuses?: Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'>
  metrics?: {
    plannerTime?: number
    totalTime?: number
    failedSections?: number
    regeneratedSections?: number
    sections: Record<string, { model: string; elapsed: number; key?: string; retries?: number }>
  }
  activeSectionId?: string | null
  onSelectSection?: (sectionId: string) => void
  tabInfo?: {
    topic: string
    subject: string
    difficulty: string
    generationTime?: number
  }
}

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

function TypewriterText({ text, speed = 12 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')
    timerRef.current = setInterval(() => {
      if (idxRef.current < text.length) {
        setDisplayed(text.slice(0, idxRef.current + 1))
        idxRef.current++
      } else {
        clearInterval(timerRef.current)
      }
    }, speed)
    return () => clearInterval(timerRef.current)
  }, [text, speed])

  return <>{displayed}</>
}

const difficultyColors: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-red-400 bg-red-500/10 border-red-500/20',
  expert: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export const StreamingLesson = memo(function StreamingLesson({
  status, lesson, accumulatedContent, analysis, errorMessage, errorCode, errorStage, sectionStatuses = {}, metrics,
  activeSectionId = null, onSelectSection, tabInfo,
}: StreamingLessonProps) {
  const isGenerating = status === 'generating'
  const isDone = status === 'done'
  const prevStatusRef = useRef(status)
  const [showTyping, setShowTyping] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Smooth scroll container to top on section switch
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeSectionId])



  useEffect(() => {
    if (prevStatusRef.current !== 'generating' && status === 'generating') setShowTyping(true)
    if (status === 'done' || status === 'error') setShowTyping(false)
    prevStatusRef.current = status
  }, [status])

  if (status === 'idle') return null

  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 m-8 rounded-xl bg-red-500/5 border border-red-500/20 text-center"
      >
        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-red-300">Generation Failed</p>
        {errorCode && (
          <div className="mt-4 inline-block bg-red-500/10 border border-red-500/20 rounded-md px-3 py-1.5">
            <p className="text-xs font-mono text-red-300 font-bold">{errorCode}</p>
            {errorStage && <p className="text-[10px] text-red-400/80 mt-0.5">Stage: {errorStage}</p>}
          </div>
        )}
        {errorMessage && <p className="text-[11px] text-red-400/80 mt-3 break-all max-w-lg mx-auto bg-black/20 p-2 rounded-md font-mono">{errorMessage}</p>}
      </motion.div>
    )
  }

  const planned = Object.keys(sectionStatuses)
  const total = planned.length
  const done = planned.filter((s) => sectionStatuses[s] === 'completed' || sectionStatuses[s] === 'error').length
  const pct = (done / total) * 100
  const estimatedTimeRemaining = (total - done) * 15

  const currentSectionStatus = activeSectionId ? (sectionStatuses[activeSectionId] || 'waiting') : 'waiting'
  const quizSection = lesson?.sections?.['quiz']
  const rawCurrentSectionContent = (activeSectionId && lesson?.sections?.[activeSectionId]?.content) || ''
  const currentSectionContent = rawCurrentSectionContent
  const safeAccumulatedContent = accumulatedContent

  return (
    <div className="flex flex-col w-full min-h-full">
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-150/80 backdrop-blur-sm border-b border-border shrink-0 sticky top-0 z-10"
        >
          <div className="h-1 w-full bg-surface-300">
            <motion.div
              className="h-full bg-gradient-to-r from-accent via-emerald-400 to-accent shadow-[0_0_10px_rgba(0,194,255,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#00C2FF] animate-pulse tracking-wide uppercase">
                Generating lesson...
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <span>{done} / {total} completed</span>
                <span className="text-text-tertiary font-normal">·</span>
                {(() => {
                  const currentGenerating = planned.find((s) => sectionStatuses[s] === 'generating')
                  const currentGeneratingLabel = currentGenerating ? (lesson?.sections?.[currentGenerating]?.title || getSectionLabel(currentGenerating)) : ''
                  const activeIdx = currentGenerating ? planned.indexOf(currentGenerating) : -1
                  const prevSection = activeIdx > 0 ? planned[activeIdx - 1] : null
                  const prevLabel = prevSection ? (lesson?.sections?.[prevSection]?.title || getSectionLabel(prevSection)) : ''
                  return (
                    <>
                      {prevLabel && <span className="text-text-tertiary font-medium line-through decoration-emerald-400/50">{prevLabel} ✓</span>}
                      {currentGeneratingLabel ? (
                        <span className="text-accent font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                          {currentGeneratingLabel}...
                        </span>
                      ) : (
                        <span className="text-text-tertiary font-medium">Starting...</span>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
            
            <div className="flex flex-col md:items-end gap-0.5 text-[10px] text-text-tertiary font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span>~{estimatedTimeRemaining}s remaining</span>
              </div>
              <div className="flex gap-2">
                {metrics?.plannerTime && <span className="text-[9px]">Planner: {metrics.plannerTime}s</span>}
                {metrics?.regeneratedSections ? <span className="text-[9px] text-amber-400/80">Retries: {metrics.regeneratedSections}</span> : null}
                {metrics?.failedSections ? <span className="text-[9px] text-red-400/80">Failed: {metrics.failedSections}</span> : null}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lesson header: Topic / Subject / Difficulty / Time */}
      {tabInfo && (isDone || isGenerating) && (
        <div className="px-4 md:px-10 lg:px-16 pt-8 pb-4 md:pt-6 md:pb-2 flex flex-col gap-4 md:gap-8">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-start gap-4 mb-1">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 border border-accent/20">
                <GraduationCap className="w-5 h-5 text-accent-light" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[26px] md:text-[32px] font-bold text-text-primary leading-tight">
                  {tabInfo.topic}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {tabInfo.subject && (
                    <span className="text-[11px] text-text-secondary font-medium">
                      {tabInfo.subject}
                    </span>
                  )}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize',
                      difficultyColors[tabInfo.difficulty] || 'text-text-tertiary bg-surface-200 border-border',
                    )}
                  >
                    {tabInfo.difficulty}
                  </span>
                  {tabInfo.generationTime != null && (
                    <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Generated in {tabInfo.generationTime.toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 px-4 py-6 md:p-10 lg:px-16 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeSectionId ? (
              <motion.div
                key={activeSectionId}
                initial={{ opacity: 0, y: 24, scale: 0.98, rotateX: 3 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, scale: 0.98, rotateX: -3 }}
                transition={{ type: 'spring', stiffness: 130, damping: 17 }}
                style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  {(() => { const ActiveIcon = getSectionIcon(activeSectionId); return <ActiveIcon className="w-6 h-6 text-accent-light" /> })()}
                  <h1 className="text-[22px] md:text-[28px] font-bold text-text-primary">{lesson?.sections?.[activeSectionId]?.title || getSectionLabel(activeSectionId)}</h1>
                  <div className="ml-auto flex gap-2">
                    {currentSectionStatus === 'generating' && (
                      <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent-light text-[10px] font-semibold border border-accent/20 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Generating
                      </span>
                    )}
                    {currentSectionStatus === 'completed' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {currentSectionStatus === 'queued' && (
                      <span className="px-2.5 py-1 rounded-full bg-surface-200 text-text-tertiary text-[10px] font-semibold border border-border flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Queued
                      </span>
                    )}
                  </div>
                </div>

                {currentSectionStatus === 'waiting' && !currentSectionContent ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="empty-state-icon">
                      <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
                    </div>
                    <p className="text-sm text-text-secondary font-medium">Waiting to generate...</p>
                    <p className="text-xs text-text-tertiary mt-1">This section will stream in shortly.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    className={cn(
                      "relative transition-all duration-500 rounded-2xl p-5 border border-transparent",
                      (currentSectionStatus === 'generating' || currentSectionStatus === 'retrying') &&
                        "bg-[#00f2fe]/3 border-[#00f2fe]/10 shadow-[0_0_24px_rgba(0,242,254,0.05)]"
                    )}
                  >
                    {/* Energy Sweep Scanline */}
                    {(currentSectionStatus === 'generating' || currentSectionStatus === 'retrying') && (
                      <motion.div
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00f2fe] to-transparent opacity-50 z-20"
                        animate={{ top: ['0%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                    )}

                    {(currentSectionStatus === 'generating' || currentSectionStatus === 'retrying') && !currentSectionContent ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2.5 py-6 text-text-tertiary justify-center"
                      >
                        <Loader2 className="w-4 h-4 animate-spin text-[#00f2fe]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#00f2fe]/80 animate-pulse">AI is building knowledge...</span>
                      </motion.div>
                    ) : null}

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSectionId + (showTyping ? '-typing' : '-final')}
                        initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {showTyping && (currentSectionStatus === 'generating' || currentSectionStatus === 'retrying') && currentSectionContent ? (
                          <div className="relative leading-relaxed">
                            {activeSectionId === 'quiz' ? (
                              <InteractiveQuiz content={currentSectionContent || safeAccumulatedContent} isGenerating />
                            ) : (
                              <MarkdownErrorBoundary sectionId={activeSectionId}>
                                <MarkdownRenderer content={currentSectionContent || safeAccumulatedContent} />
                              </MarkdownErrorBoundary>
                            )}
                            <span className="inline-block w-2.5 h-4 bg-gradient-to-t from-[#00f2fe] to-[#8b5cf6] animate-pulse ml-1 align-middle rounded-sm shadow-[0_0_8px_rgba(0,242,254,0.8)]" />
                          </div>
                        ) : (
                          <div className="leading-relaxed">
                            {activeSectionId === 'quiz' ? (
                              <InteractiveQuiz content={currentSectionContent || safeAccumulatedContent} />
                            ) : (
                              <MarkdownErrorBoundary sectionId={activeSectionId}>
                                <MarkdownRenderer content={currentSectionContent || safeAccumulatedContent} />
                              </MarkdownErrorBoundary>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full py-20"
              >
                <div className="empty-state-icon">
                  <BookOpen className="w-6 h-6 text-text-tertiary" />
                </div>
                <p className="text-sm text-text-secondary">Select a section to view its content.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
})
