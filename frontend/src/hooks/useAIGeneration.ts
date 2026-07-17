import { useState, useRef, useCallback, useEffect } from 'react'
import type { GenerateRequest, Lesson, MappedLesson, GenerationStatus, SseEvent, SectionData } from '@/types/ai'
import { generateLesson } from '@/lib/api/ai'

const ALL_SECTION_TYPES = [
  'overview', 'explanation', 'keyConcepts', 'importantDefinitions',
  'analogy', 'examples', 'caseStudy', 'codeExamples',
  'formulaExplanation', 'diagrams', 'commonMistakes', 'interviewQuestions',
  'quiz', 'assignment', 'miniProject', 'cheatSheet',
  'revisionNotes', 'summary'
]

const SECTION_TITLES: Record<string, string> = {
  overview: '1. Overview',
  explanation: '2. Detailed Explanation',
  keyConcepts: '3. Key Concepts',
  importantDefinitions: '4. Important Definitions',
  analogy: '5. Real-world Analogy',
  examples: '6. Worked Examples',
  caseStudy: '7. Case Study',
  codeExamples: '8. Code Examples',
  formulaExplanation: '9. Formula Explanation',
  diagrams: '10. Diagrams',
  commonMistakes: '11. Common Mistakes',
  interviewQuestions: '12. Interview Questions',
  quiz: '13. Quiz',
  assignment: '14. Assignment',
  miniProject: '15. Mini Project',
  cheatSheet: '16. Cheat Sheet',
  revisionNotes: '17. Revision Notes',
  summary: '18. Summary',
}

interface GenerationResult {
  status: GenerationStatus
  lesson: Lesson | null
  mapped: MappedLesson | null
  error: string | null
  progress: number
  analysis: any | null
  sectionStatuses: Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'>
  metrics: {
    plannerTime?: number
    totalTime?: number
    sections: Record<string, { model: string; elapsed: number; key?: string }>
  }
}

export function useAIGeneration(activeTab?: any) {
  const [result, setResult] = useState<GenerationResult>({
    status: 'idle',
    lesson: null,
    mapped: null,
    error: null,
    progress: 0,
    analysis: null,
    sectionStatuses: {},
    metrics: { sections: {} },
  })
  
  const abortRef = useRef<AbortController | null>(null)
  const plannedSectionsRef = useRef<string[]>(ALL_SECTION_TYPES)
  
  // Buffers and Playback Refs
  const rawSectionsBuffer = useRef<Record<string, { content: string; isDone: boolean; isError: boolean; sectionData: any }>>({})
  const playedSections = useRef<Record<string, SectionData>>({})
  const playedStatuses = useRef<Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'>>({})
  const currentSectionIdxRef = useRef<number>(0)
  const isGenerationActiveRef = useRef<boolean>(false)
  const playTimerRef = useRef<number | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current)
    }
  }, [])

  useEffect(() => {
    // Cancel any active stream/generation when switching tabs
    abortRef.current?.abort()
    if (playTimerRef.current) {
      cancelAnimationFrame(playTimerRef.current)
      playTimerRef.current = null
    }

    if (activeTab) {
      const hasLesson = !!activeTab.aiLesson
      const initialStatuses: Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'> = {}
      
      if (hasLesson && activeTab.aiLesson?.sections) {
        let completedCount = 0
        for (const st of ALL_SECTION_TYPES) {
          if (activeTab.aiLesson.sections[st]) {
            initialStatuses[st] = 'completed'
            completedCount++
          } else {
            initialStatuses[st] = 'waiting'
          }
        }
        
        playedSections.current = { ...activeTab.aiLesson.sections }
        playedStatuses.current = initialStatuses
        currentSectionIdxRef.current = ALL_SECTION_TYPES.length
        isGenerationActiveRef.current = false
        
        const total = ALL_SECTION_TYPES.length
        const progress = Math.min(Math.round((completedCount / total) * 100), 100)
        
        setResult({
          status: 'done',
          lesson: activeTab.aiLesson,
          mapped: null,
          error: null,
          progress: progress,
          analysis: null,
          sectionStatuses: initialStatuses,
          metrics: { sections: {} },
        })
      } else {
        playedSections.current = {}
        playedStatuses.current = {}
        currentSectionIdxRef.current = 0
        isGenerationActiveRef.current = false
        rawSectionsBuffer.current = {}
        
        setResult({
          status: 'idle',
          lesson: null,
          mapped: null,
          error: null,
          progress: 0,
          analysis: null,
          sectionStatuses: {},
          metrics: { sections: {} },
        })
      }
    } else {
      playedSections.current = {}
      playedStatuses.current = {}
      currentSectionIdxRef.current = 0
      isGenerationActiveRef.current = false
      rawSectionsBuffer.current = {}
      
      setResult({
        status: 'idle',
        lesson: null,
        mapped: null,
        error: null,
        progress: 0,
        analysis: null,
        sectionStatuses: {},
        metrics: { sections: {} },
      })
    }
  }, [activeTab?.id])

  const buildPartialLesson = useCallback((sections: Record<string, SectionData>) => {
    return {
      metadata: {
        title: '',
        subject: '',
        topic: '',
        difficulty: '',
        learningMode: '',
        estimatedReadingTime: 0,
        prerequisites: [],
        learningObjectives: [],
        tags: [],
      },
      sections,
      resources: { keyTerms: [], furtherReading: [] },
    } as Lesson
  }, [])

  const startPlayLoop = useCallback(() => {
    if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current)

    let lastUpdateTime = 0

    const loop = (timestamp: number) => {
      // Throttle updates to ~40ms (25fps) to prevent UI blocking
      if (timestamp - lastUpdateTime < 40) {
        playTimerRef.current = requestAnimationFrame(loop)
        return
      }
      
      const plannedOrder = ALL_SECTION_TYPES.filter(st => 
        plannedSectionsRef.current.includes(st)
      )

      if (plannedOrder.length === 0) {
        playTimerRef.current = requestAnimationFrame(loop)
        return
      }

      let idx = currentSectionIdxRef.current

      if (idx >= plannedOrder.length) {
        if (!isGenerationActiveRef.current) {
          playTimerRef.current = null
          setResult(prev => ({
            ...prev,
            status: 'done',
            progress: 100,
            lesson: buildPartialLesson(playedSections.current)
          }))
        }
        return
      }

      let stateUpdated = false
      
      // Fast-forward multiple completed sections in one frame if they are ready!
      while (idx < plannedOrder.length) {
        const st = plannedOrder[idx]
        const rawSec = rawSectionsBuffer.current[st]

        if (!rawSec) {
          if (playedStatuses.current[st] !== 'generating') {
            playedStatuses.current[st] = 'generating'
            stateUpdated = true
          }
          break // Wait for backend
        }

        const visibleContent = playedSections.current[st]?.content || ''
        const targetContent = rawSec.content || ''
        const visibleLen = visibleContent.length
        const targetLen = targetContent.length

        // FAST FORWARD IF DONE (Zero artificial delay)
        if (rawSec.isDone) {
          playedStatuses.current[st] = rawSec.isError ? 'error' : 'completed'
          playedSections.current[st] = {
            ...rawSec.sectionData,
            content: targetContent,
            type: st as any,
            title: SECTION_TITLES[st] || st
          }
          idx++
          currentSectionIdxRef.current = idx
          stateUpdated = true
          continue // instantly process the next section without waiting!
        }

        // PROGRESSIVE TYPING (Only for currently generating sections)
        if (visibleLen < targetLen) {
          let charsToAppend = 10 
          const diff = targetLen - visibleLen
          if (diff > 800) charsToAppend = 60 
          else if (diff > 300) charsToAppend = 35
          else if (diff > 100) charsToAppend = 18

          const newContent = targetContent.slice(0, visibleLen + charsToAppend)
          playedSections.current[st] = {
            type: st as any,
            title: SECTION_TITLES[st] || st,
            content: newContent
          }
          playedStatuses.current[st] = 'generating'
          stateUpdated = true
          break // typed some characters, wait for next frame
        } else {
          // Waiting for more chunks from backend
          if (playedStatuses.current[st] !== 'generating') {
            playedStatuses.current[st] = 'generating'
            stateUpdated = true
          }
          break
        }
      }

      if (stateUpdated) {
        lastUpdateTime = timestamp
        const completedCount = currentSectionIdxRef.current
        const st = plannedOrder[completedCount]
        let sectionProgress = 0
        if (st && rawSectionsBuffer.current[st]) {
           const vc = playedSections.current[st]?.content?.length || 0
           const tc = rawSectionsBuffer.current[st]?.content?.length || 1
           sectionProgress = vc / tc
        }
        
        const totalCount = plannedOrder.length
        const overallProgress = Math.round(((completedCount + sectionProgress) / totalCount) * 100)

        setResult(prev => ({
          ...prev,
          progress: Math.min(overallProgress, 99),
          lesson: buildPartialLesson(playedSections.current),
          sectionStatuses: { ...playedStatuses.current }
        }))
      }

      playTimerRef.current = requestAnimationFrame(loop)
    }

    playTimerRef.current = requestAnimationFrame(loop)
  }, [buildPartialLesson])

  const generate = useCallback(async (request: GenerateRequest) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current)

    // Reset loop & buffers
    rawSectionsBuffer.current = {}
    playedSections.current = {}
    playedStatuses.current = {}
    for (const st of ALL_SECTION_TYPES) {
      playedStatuses.current[st] = 'waiting'
    }
    currentSectionIdxRef.current = 0
    isGenerationActiveRef.current = true
    plannedSectionsRef.current = ALL_SECTION_TYPES

    setResult({
      status: 'generating', lesson: null, mapped: null,
      error: null, progress: 0, analysis: null,
      sectionStatuses: { ...playedStatuses.current },
      metrics: { sections: {} },
    })

    // Start playback loop
    startPlayLoop()

    let lessonData: Lesson | null = null
    let mappedData: MappedLesson | null = null

    try {
      await generateLesson(request, (event: SseEvent) => {
        if (controller.signal.aborted) return

        switch (event.type) {
          case 'plan': {
            const planned: string[] = event.sections || []
            if (planned.length > 0) {
              plannedSectionsRef.current = planned
              const planStatuses: Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'> = {}
              for (const s of planned) {
                planStatuses[s] = 'waiting'
                if (playedStatuses.current[s] === undefined) {
                  playedStatuses.current[s] = 'waiting'
                }
              }
              setResult((prev) => ({ 
                ...prev, 
                metrics: { ...prev.metrics, plannerTime: event.elapsed || 0 }
              }))
            }
            break
          }

          case 'analysis':
            setResult((prev) => ({ ...prev, analysis: event.data }))
            break

          case 'section_status':
          case 'section_queued':
          case 'section_running':
          case 'section_started': {
            const st = event.section_type
            if (st && !rawSectionsBuffer.current[st]) {
              rawSectionsBuffer.current[st] = { content: '', isDone: false, isError: false, sectionData: null }
            }
            break
          }

          case 'section_chunk': {
            const st = event.section_type
            if (st) {
              if (!rawSectionsBuffer.current[st]) {
                rawSectionsBuffer.current[st] = { content: '', isDone: false, isError: false, sectionData: null }
              }
              rawSectionsBuffer.current[st].content += (event.content || '')
            }
            break
          }

          case 'section_clear': {
            const st = event.section_type
            if (st && rawSectionsBuffer.current[st]) {
              rawSectionsBuffer.current[st].content = ''
            }
            break
          }

          case 'section_done': {
            const st = event.section_type
            const incomingData = event.section_data || {}
            if (st) {
              if (!rawSectionsBuffer.current[st]) {
                rawSectionsBuffer.current[st] = { content: '', isDone: false, isError: false, sectionData: null }
              }
              rawSectionsBuffer.current[st].isDone = true
              rawSectionsBuffer.current[st].isError = event.status === 'error'
              rawSectionsBuffer.current[st].sectionData = incomingData
              
              if (incomingData.content && incomingData.content.length > rawSectionsBuffer.current[st].content.length) {
                rawSectionsBuffer.current[st].content = incomingData.content
              }

              // Capture metrics for sections
              setResult(prev => ({
                ...prev,
                metrics: {
                  ...prev.metrics,
                  sections: {
                    ...prev.metrics.sections,
                    [st]: {
                      model: event.model || 'unknown',
                      elapsed: event.elapsed || 0,
                      key: event.key || 'unknown',
                    }
                  }
                }
              }))
            }
            break
          }

          case 'lesson': {
            lessonData = event.data
            mappedData = event.mapped || null
            isGenerationActiveRef.current = false
            
            setResult(prev => ({
              ...prev,
              mapped: mappedData,
              metrics: {
                ...prev.metrics,
                totalTime: event.total_elapsed || lessonData?.metadata?.total_generation_time || 0
              }
            }))
            break
          }

          case 'error':
            isGenerationActiveRef.current = false
            if (playTimerRef.current) clearInterval(playTimerRef.current)
            setResult((prev) => ({
              ...prev, status: 'error', error: event.content,
            }))
            break

          case 'cancelled':
            isGenerationActiveRef.current = false
            if (playTimerRef.current) clearInterval(playTimerRef.current)
            setResult((prev) => ({ ...prev, status: 'cancelled' }))
            break
        }
      }, controller.signal)

      if (!lessonData && !controller.signal.aborted) {
        isGenerationActiveRef.current = false
      }
    } catch (err: any) {
      isGenerationActiveRef.current = false
      if (playTimerRef.current) clearInterval(playTimerRef.current)
      if (err.name === 'AbortError') {
        setResult((prev) => ({ ...prev, status: 'cancelled' }))
      } else {
        setResult((prev) => ({
          ...prev,
          status: 'error',
          error: err.message || 'Generation failed',
        }))
      }
    }
  }, [buildPartialLesson, startPlayLoop])

  const cancel = useCallback(() => {
    isGenerationActiveRef.current = false
    abortRef.current?.abort()
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current)
      playTimerRef.current = null
    }
    setResult((prev) => ({ ...prev, status: 'cancelled' }))
  }, [])

  const reset = useCallback(() => {
    isGenerationActiveRef.current = false
    abortRef.current?.abort()
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current)
      playTimerRef.current = null
    }
    rawSectionsBuffer.current = {}
    playedSections.current = {}
    playedStatuses.current = {}
    currentSectionIdxRef.current = 0
    setResult({
      status: 'idle', lesson: null, mapped: null,
      error: null, progress: 0, analysis: null,
      sectionStatuses: {},
      metrics: { sections: {} },
    })
  }, [])

  return { ...result, generate, cancel, reset }
}
