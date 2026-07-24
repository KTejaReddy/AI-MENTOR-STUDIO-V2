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
import { FloatingReadingToolbar } from '@/components/learning/FloatingReadingToolbar'

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
    id: string
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
            {errorStage && <p className="text-xs text-red-400/80 mt-0.5">Stage: {errorStage}</p>}
          </div>
        )}
        {errorMessage && <p className="text-xs text-red-400/80 mt-3 break-all max-w-lg mx-auto bg-black/20 p-2 rounded-md font-mono">{errorMessage}</p>}
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
    <div className="flex flex-col w-full min-h-full bg-surface-50 text-text-primary">
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 bg-surface-50/95 backdrop-blur-md border-b border-border shadow-sm"
        >
          <div className="h-1 w-full bg-surface-200">
            <motion.div
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-3 gap-2 max-w-4xl mx-auto w-full">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-accent animate-pulse tracking-wide uppercase">
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
                      {prevLabel && <span className="text-text-tertiary font-medium line-through decoration-text-tertiary/50">{prevLabel} ✓</span>}
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
            
            <div className="flex flex-col md:items-end gap-0.5 text-xs text-text-tertiary font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span>~{estimatedTimeRemaining}s remaining</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lesson header: Topic / Subject / Difficulty / Time */}
      {tabInfo && (isDone || isGenerating) && (
        <div className="px-6 md:px-12 lg:px-20 pt-8 pb-4 md:pt-12 md:pb-6 flex flex-col gap-4">
          <div className="max-w-4xl mx-auto w-full border-b border-border/50 pb-6">
            <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight leading-tight">
              {tabInfo.topic}
            </h1>
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {tabInfo.subject && (
                <span className="text-sm text-text-secondary font-medium">
                  {tabInfo.subject}
                </span>
              )}
              {tabInfo.generationTime != null && (
                <span className="text-sm text-text-tertiary flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Generated in {tabInfo.generationTime.toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 px-6 md:px-12 lg:px-20 py-8 md:py-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeSectionId ? (
              <motion.div
                key={activeSectionId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-8">
                  {(() => { 
                    const ActiveIcon = getSectionIcon(activeSectionId)
                    const colorMap: Record<string, string> = {
                      overview: '#3b82f6', explanation: '#64748b', formula: '#a855f7',
                      derivation: '#f97316', visualization: '#10b981', quiz: '#eab308',
                      assignment: '#ef4444', summary: '#ec4899',
                    }
                    const activeColor = colorMap[activeSectionId] || 'var(--text-tertiary)'
                    return <ActiveIcon className="w-6 h-6 md:w-8 md:h-8" style={{ color: activeColor }} /> 
                  })()}
                  <h2 className="text-2xl md:text-4xl font-bold text-text-primary">{lesson?.sections?.[activeSectionId]?.title || getSectionLabel(activeSectionId)}</h2>
                </div>

                {currentSectionStatus === 'waiting' && !currentSectionContent ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <Loader2 className="w-8 h-8 text-text-tertiary animate-spin mb-4" />
                    <p className="text-base text-text-secondary font-medium">Waiting to generate...</p>
                    <p className="text-sm text-text-tertiary mt-2">This section will stream in shortly.</p>
                  </motion.div>
                ) : (
                  <div className="relative">
                    {(currentSectionStatus === 'generating' || currentSectionStatus === 'retrying') && !currentSectionContent ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 py-10 text-text-tertiary"
                      >
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">AI is generating content...</span>
                      </motion.div>
                    ) : null}

                    <AnimatePresence mode="wait">
                      <motion.div
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.4 }}
                      >
                        {showTyping && (currentSectionStatus === 'generating' || currentSectionStatus === 'retrying') && currentSectionContent ? (
                          <div className="relative">
                            {activeSectionId === 'quiz' ? (
                              <InteractiveQuiz content={currentSectionContent || safeAccumulatedContent} isGenerating />
                            ) : (
                              <MarkdownErrorBoundary sectionId={activeSectionId}>
                                <MarkdownRenderer 
                                  content={currentSectionContent || safeAccumulatedContent} 
                                  sectionColor={(() => {
                                    const colorMap: Record<string, string> = {
                                      overview: '#3b82f6', explanation: '#64748b', formula: '#a855f7',
                                      derivation: '#f97316', visualization: '#10b981', quiz: '#eab308',
                                      assignment: '#ef4444', summary: '#ec4899',
                                    };
                                    return colorMap[activeSectionId || ''] || undefined
                                  })()}
                                />
                              </MarkdownErrorBoundary>
                            )}
                            <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1 align-middle rounded-sm" />
                          </div>
                        ) : (
                          <div>
                            {activeSectionId === 'quiz' ? (
                              <InteractiveQuiz content={currentSectionContent || safeAccumulatedContent} />
                            ) : (
                              <MarkdownErrorBoundary sectionId={activeSectionId}>
                                <MarkdownRenderer 
                                  content={currentSectionContent || safeAccumulatedContent} 
                                  sectionColor={(() => {
                                    const colorMap: Record<string, string> = {
                                      overview: '#3b82f6', explanation: '#64748b', formula: '#a855f7',
                                      derivation: '#f97316', visualization: '#10b981', quiz: '#eab308',
                                      assignment: '#ef4444', summary: '#ec4899',
                                    };
                                    return colorMap[activeSectionId || ''] || undefined
                                  })()}
                                />
                              </MarkdownErrorBoundary>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full py-32"
              >
                <BookOpen className="w-12 h-12 text-text-tertiary/50 mb-6" />
                <p className="text-lg text-text-secondary font-medium">Select a section to begin reading.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {tabInfo && (
        <FloatingReadingToolbar
          scrollContainerRef={scrollContainerRef}
          activeSectionId={activeSectionId}
          tabId={tabInfo.id}
          title={tabInfo.topic}
          totalSections={total}
          completedSections={done}
          currentSectionIndex={activeSectionId ? planned.indexOf(activeSectionId) : 0}
        />
      )}
    </div>
  )
})
