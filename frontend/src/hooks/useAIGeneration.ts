import { useState, useRef, useCallback, useEffect } from 'react'
import type { GenerateRequest, Lesson, MappedLesson, GenerationStatus, SseEvent, SectionData } from '@/types/ai'
import { generateLesson } from '@/lib/api/ai'



interface GenerationResult {
  status: GenerationStatus
  lesson: Lesson | null
  mapped: MappedLesson | null
  error: string | null
  errorCode?: string
  errorStage?: string
  progress: number
  analysis: any | null
  sectionStatuses: Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'>
  metrics: {
    plannerTime?: number
    totalTime?: number
    failedSections?: number
    regeneratedSections?: number
    sections: Record<string, { model: string; elapsed: number; key?: string; retries?: number }>
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
  const plannedSectionsRef = useRef<string[]>([])
  const plannedTitlesRef = useRef<Record<string, string>>({})
  
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
      if (abortRef.current) abortRef.current.abort()
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
        const storedSections = Object.keys(activeTab.aiLesson.sections)
        plannedSectionsRef.current = storedSections
        let completedCount = 0
        for (const st of storedSections) {
          if (activeTab.aiLesson.sections[st]) {
            initialStatuses[st] = 'completed'
            completedCount++
            plannedTitlesRef.current[st] = activeTab.aiLesson.sections[st].title || st
          } else {
            initialStatuses[st] = 'waiting'
          }
        }
        
        playedSections.current = { ...activeTab.aiLesson.sections }
        playedStatuses.current = initialStatuses
        currentSectionIdxRef.current = storedSections.length
        isGenerationActiveRef.current = false
        
        const total = storedSections.length
        const progress = total > 0 ? Math.min(Math.round((completedCount / total) * 100), 100) : 0
        
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
      // Throttle updates to ~50ms (20fps) to prevent React crashes from rapid streaming
      if (timestamp - lastUpdateTime < 50) {
        playTimerRef.current = requestAnimationFrame(loop)
        return
      }
      
      lastUpdateTime = timestamp
      const plannedOrder = plannedSectionsRef.current

      if (plannedOrder.length === 0) {
        playTimerRef.current = requestAnimationFrame(loop)
        return
      }

      let stateUpdated = false
      let allDone = true
      let completedCount = 0

      for (const st of plannedOrder) {
        const rawSec = rawSectionsBuffer.current[st]

        if (!rawSec) {
          allDone = false
          if (playedStatuses.current[st] !== 'waiting') {
            playedStatuses.current[st] = 'waiting'
            stateUpdated = true
          }
          continue
        }

        const currentStatus = rawSec.isError ? 'error' : rawSec.isDone ? 'completed' : 'generating'
        if (!rawSec.isDone) allDone = false
        if (rawSec.isDone && !rawSec.isError) completedCount++

        const visibleContent = playedSections.current[st]?.content || ''
        const targetContent = rawSec.content || ''

        if (visibleContent !== targetContent || playedStatuses.current[st] !== currentStatus) {
          playedStatuses.current[st] = currentStatus
          playedSections.current[st] = {
            ...(rawSec.sectionData || playedSections.current[st] || {}),
            content: targetContent,
            type: st as any,
            title: plannedTitlesRef.current[st] || st
          }
          stateUpdated = true
        }
      }

      if (stateUpdated) {
        const total = plannedOrder.length
        const progress = total > 0 ? Math.min(Math.round((completedCount / total) * 100), 100) : 0

        setResult(prev => ({
          ...prev,
          status: 'generating',
          progress: progress,
          sectionStatuses: { ...playedStatuses.current },
          lesson: buildPartialLesson({ ...playedSections.current })
        }))
      }

      if (allDone && !isGenerationActiveRef.current) {
        playTimerRef.current = null
        setResult(prev => ({
          ...prev,
          status: 'done',
          progress: 100,
          lesson: buildPartialLesson({ ...playedSections.current })
        }))
        return
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
    currentSectionIdxRef.current = 0
    isGenerationActiveRef.current = true
    plannedSectionsRef.current = []
    plannedTitlesRef.current = {}

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
        
        // Log to window for ErrorBoundary diagnostics
        (window as any)._lastSSEEvent = event;
        (window as any)._generationState = {
            progress: Object.keys(playedStatuses.current).length,
            currentStatuses: playedStatuses.current,
            activeBufferLength: Object.keys(rawSectionsBuffer.current).length
        };

        switch (event.type) {
          case 'plan': {
            const planned: string[] = event.sections || []
            if (planned.length > 0) {
              plannedSectionsRef.current = planned
              plannedTitlesRef.current = event.section_titles || {}
              const planStatuses: Record<string, 'waiting' | 'queued' | 'generating' | 'retrying' | 'completed' | 'error'> = {}
              for (const s of planned) {
                planStatuses[s] = 'waiting'
                if (playedStatuses.current[s] === undefined) {
                  playedStatuses.current[s] = 'waiting'
                }
              }
              setResult((prev) => ({ 
                ...prev, 
                metrics: { ...prev.metrics, plannerTime: event.elapsed || 0 },
                sectionStatuses: { ...prev.sectionStatuses, ...planStatuses }
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
              rawSectionsBuffer.current[st].content += (event.content || '');
              const win = window as any;
              win._lastRenderedSection = st;
            }
            break
          }

          case 'section_retry':
          case 'section_clear': {
            const st = event.section_type
            if (st && rawSectionsBuffer.current[st]) {
              rawSectionsBuffer.current[st].content = ''
              rawSectionsBuffer.current[st].isDone = false
              rawSectionsBuffer.current[st].isError = false
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
              if (incomingData.content && typeof incomingData.content === 'string') {
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
                      retries: event.retries || 0,
                    }
                  },
                  failedSections: (prev.metrics.failedSections || 0) + (event.status === 'error' || event.status === 'failed' ? 1 : 0),
                  regeneratedSections: (prev.metrics.regeneratedSections || 0) + ((event.retries || 0) > 0 ? 1 : 0),
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
              errorCode: event.code, errorStage: event.stage
            }))
            break

          case 'cancelled':
            isGenerationActiveRef.current = false
            if (playTimerRef.current) clearInterval(playTimerRef.current)
            setResult((prev) => ({ ...prev, status: 'cancelled', error: 'Generation was cancelled' }))
            break
        }
      }, controller.signal)

      if (!lessonData && !controller.signal.aborted) {
        isGenerationActiveRef.current = false
      }
    } catch (err: any) {
      if (abortRef.current !== controller) {
        // Superseded by a new request.
        return
      }
      isGenerationActiveRef.current = false
      if (playTimerRef.current) clearInterval(playTimerRef.current)
      if (err.name === 'AbortError' || err.message === 'Request was cancelled') {
        console.warn('[SSE_DISCONNECT] Generation aborted by user or tab switch.')
        setResult((prev) => ({ ...prev, status: 'cancelled', error: 'Generation was cancelled.' }))
      } else {
        console.error('[SSE_DISCONNECT] Generation stream failed abruptly:', err)
        setResult((prev) => ({
          ...prev,
          status: 'error',
          error: err.message || 'Generation failed',
          errorCode: 'STREAM_ABRUPT_DISCONNECT',
          errorStage: 'sse_client'
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
