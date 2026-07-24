import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { useTabs } from '@/contexts/TabContext'
import { recordRecentTopic } from '@/lib/tab-persistence'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { TabBar } from '@/components/workspace/TabBar'
import { GenerationPanel } from '@/components/ai/GenerationPanel'
import { StreamingLesson } from '@/components/ai/StreamingLesson'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GraduationCap, Sparkles, Loader2, List, ChevronLeft, ChevronRight, X } from 'lucide-react'

function truncateLabel(label: string, max = 25): string {
  if (label.length <= max) return label
  return label.slice(0, max - 3) + '...'
}

export function Learn() {
  const { tabs, activeTab, createTab, updateTab, updateMemory } = useTabs()
  const aiGen = useAIGeneration(activeTab)
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  // Read openGenerate from location state and open dialog
  useEffect(() => {
    if (location.state && (location.state as any).openGenerate) {
      setGenerateDialogOpen(true)
      navigate('.', { replace: true, state: {} })
    }
  }, [location.state, navigate])
  const [accumulated, setAccumulated] = useState('')
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    activeTab?.memory?.currentSectionId || null
  )
  const [pendingGen, setPendingGen] = useState<any>(null)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  const aiGenRef = useRef(aiGen)
  aiGenRef.current = aiGen

  useEffect(() => {
    const lesson = aiGenRef.current.lesson
    const tab = activeTabRef.current
    if (tab && (aiGen.status === 'done' || aiGen.status === 'error' || aiGen.status === 'cancelled') && lesson && tab.aiLesson !== lesson) {
      updateTab(tab.id, { aiLesson: lesson })
    }
  }, [aiGen.status, activeTab?.id, updateTab])

  useEffect(() => {
    if (aiGen.status === 'generating' || aiGen.status === 'idle') {
      setAccumulated('')
    }
  }, [aiGen.status])

  // Tab rename to topic when generation starts
  useEffect(() => {
    const tab = activeTabRef.current
    if (tab && aiGen.status === 'generating' && tab.topic && tab.label !== tab.topic) {
      updateTab(tab.id, {
        label: truncateLabel(tab.topic),
        generationStatus: 'generating',
      })
    }
  }, [aiGen.status, updateTab])

  useEffect(() => {
    const tab = activeTabRef.current
    if (tab && contentRef.current) {
      const savedScroll = tab.memory.scrollPosition
      if (savedScroll > 0) {
        contentRef.current.scrollTop = savedScroll
      }
    }
  }, [activeTab?.id])

  const handleScroll = useCallback(() => {
    const tab = activeTabRef.current
    if (contentRef.current && tab) {
      updateMemory(tab.id, { scrollPosition: contentRef.current.scrollTop })
    }
  }, [updateMemory])

  const handleGenerate = useCallback(
    (request: any) => {
      setGenerateDialogOpen(false)
      const trimmedTopic = request.topic.trim()
      createTab({
        label: truncateLabel(trimmedTopic),
        subject: request.subject,
        topic: trimmedTopic,
        difficulty: request.difficulty,
        learningMode: request.learning_mode,
        generationStatus: 'generating',
      })
      setPendingGen(request)
      recordRecentTopic(request.subject, trimmedTopic, request.difficulty, 0, 10)
    },
    [createTab],
  )

  // Only create tab + trigger generation after tab is created and switch happens
  useEffect(() => {
    if (pendingGen) {
      const tab = activeTabRef.current
      if (tab && tab.topic === pendingGen.topic.trim()) {
        aiGenRef.current.generate(pendingGen)
        setPendingGen(null)
        setActiveSectionId('overview')
        updateMemory(tab.id, { currentSectionId: 'overview' })
      }
    }
  }, [pendingGen, activeTab?.id, updateMemory])

  const handleSelectSection = useCallback((sectionId: string) => {
    setActiveSectionId((prev) => {
      if (prev === sectionId) return prev
      return sectionId
    })
    const tab = activeTabRef.current
    if (tab) {
      updateMemory(tab.id, { currentSectionId: sectionId })
    }
    const el = document.querySelector(`[data-section-id="${sectionId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [updateMemory])

  useKeyboardShortcuts([
    { key: 'b', ctrl: true, shift: true, handler: () => setSidebarVisible((v) => !v) },
  ])

  const hasAnyTabs = tabs.length > 0
  const showAiContent = aiGen.status !== 'idle' || aiGen.lesson !== null

  const activeSectionKeys = useMemo(() => {
    if (!aiGen.sectionStatuses) return []
    return Object.keys(aiGen.sectionStatuses)
  }, [aiGen.sectionStatuses])

  const currentIndex = activeSectionKeys.indexOf(activeSectionId || '')
  
  const handlePrevSection = () => {
    if (currentIndex > 0) handleSelectSection(activeSectionKeys[currentIndex - 1])
  }
  
  const handleNextSection = () => {
    if (currentIndex >= 0 && currentIndex < activeSectionKeys.length - 1) {
      handleSelectSection(activeSectionKeys[currentIndex + 1])
    }
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#02040A] relative">
      <div className="h-full flex-shrink-0 w-[68px] md:w-56 lg:w-64 transition-all duration-300 z-20 relative">
        {sidebarVisible && activeTab && (
          <LeftSidebar
            sectionStatuses={aiGen.sectionStatuses}
            isGenerating={aiGen.status === 'generating'}
            completedCount={Object.values(aiGen.sectionStatuses || {}).filter((s) => s === 'completed' || s === 'error').length}
            totalCount={Object.keys(aiGen.sectionStatuses || {}).length}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
          />
        )}
      </div>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {hasAnyTabs ? (
          <>
            <TabBar onNewLesson={() => setGenerateDialogOpen(true)} />

            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-0"
            >
              {showAiContent && activeTab ? (
                <StreamingLesson
                  status={aiGen.status}
                  lesson={aiGen.lesson}
                  mapped={aiGen.mapped}
                  accumulatedContent={accumulated}
                  analysis={aiGen.analysis}
                  errorMessage={aiGen.error}
                  sectionStatuses={aiGen.sectionStatuses}
                  metrics={aiGen.metrics}
                  activeSectionId={activeSectionId}
                  onSelectSection={handleSelectSection}
                  tabInfo={
                    activeTab
                      ? {
                          id: activeTab.id,
                          topic: activeTab.topic,
                          subject: activeTab.subject,
                          difficulty: activeTab.difficulty,
                          generationTime: aiGen.metrics?.totalTime,
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 px-6">
                  <div className="empty-state-icon mb-4">
                    <GraduationCap className="w-6 h-6 text-text-tertiary" />
                  </div>
                  <p className="text-sm text-text-secondary mb-2">
                    Select a lesson tab to view its content.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setGenerateDialogOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-lessons)] text-white text-xs font-semibold shadow-[0_0_15px_rgba(var(--color-lessons-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--color-lessons-rgb),0.5)] transition-shadow"
                  >
                    <Sparkles className="w-4 h-4" />
                    New Lesson
                  </motion.button>
                </div>
              )}
            </div>

          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
            <motion.div
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center max-w-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-lessons)]/10 flex items-center justify-center mb-6 border border-[var(--color-lessons)]/20">
                <Sparkles className="w-8 h-8 text-[var(--color-lessons)]" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Generate Your First AI Lesson
              </h2>
              <p className="text-sm text-text-secondary mb-8 leading-relaxed">
                Create personalized, interactive lessons with AI-powered explanations, examples, quizzes, and more.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setGenerateDialogOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-lessons)] text-white text-sm font-semibold shadow-[0_0_15px_rgba(var(--color-lessons-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--color-lessons-rgb),0.5)] transition-shadow"
              >
                <Sparkles className="w-5 h-5" />
                Generate Lesson
              </motion.button>
              <p className="text-xs text-text-tertiary mt-3">or press Ctrl+N</p>
            </motion.div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {generateDialogOpen && (
          <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)}>
            <DialogContent className="p-0 max-h-[90vh] overflow-visible">
              <GenerationPanel
                status={aiGen.status}
                onGenerate={handleGenerate}
                onCancel={aiGen.cancel}
                onReset={aiGen.reset}
                errorMessage={aiGen.error}
                isDialog
              />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
}
