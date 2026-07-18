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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
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
    setMobileDrawerOpen(false) // Close drawer on mobile selection
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
    <div className="h-full flex overflow-hidden bg-surface-50 relative">
      <div className="hidden md:block h-full">
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

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileDrawerOpen && activeTab && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-[300px] z-50 md:hidden bg-surface flex flex-col shadow-2xl border-r border-border"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <span className="font-bold text-text-primary">Lesson Sections</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="p-2 -mr-2 text-text-secondary hover:text-text-primary bg-surface-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <LeftSidebar
                  sectionStatuses={aiGen.sectionStatuses}
                  isGenerating={aiGen.status === 'generating'}
                  completedCount={Object.values(aiGen.sectionStatuses || {}).filter((s) => s === 'completed' || s === 'error').length}
                  totalCount={Object.keys(aiGen.sectionStatuses || {}).length}
                  activeSectionId={activeSectionId}
                  onSelectSection={handleSelectSection}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-dark text-white text-xs font-semibold shadow-glow-accent hover:shadow-glow-accent-lg transition-shadow"
                  >
                    <Sparkles className="w-4 h-4" />
                    New Lesson
                  </motion.button>
                </div>
              )}
            </div>

            {/* Mobile Bottom Navigation & FAB */}
            {showAiContent && activeTab && (
              <div className="md:hidden fixed bottom-safe-4 left-4 right-4 z-40 pointer-events-none flex flex-col gap-4 mb-4">
                <div className="flex justify-end pointer-events-auto">
                  <button
                    onClick={() => setMobileDrawerOpen(true)}
                    className="flex items-center justify-center w-[52px] h-[52px] rounded-full bg-accent text-white shadow-elevated hover:bg-accent-dark transition-colors"
                  >
                    <List className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between glass rounded-2xl border border-border p-2 shadow-card pointer-events-auto bg-surface-100/90 backdrop-blur-xl">
                  <button
                    onClick={handlePrevSection}
                    disabled={currentIndex <= 0}
                    className="flex items-center gap-1 min-h-[48px] px-4 py-2 text-[15px] font-medium text-text-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-xl active:bg-surface-200"
                  >
                    <ChevronLeft className="w-5 h-5" /> Prev
                  </button>
                  <span className="text-sm font-semibold text-text-tertiary">
                    {currentIndex >= 0 ? `${currentIndex + 1} / ${activeSectionKeys.length}` : ''}
                  </span>
                  <button
                    onClick={handleNextSection}
                    disabled={currentIndex < 0 || currentIndex >= activeSectionKeys.length - 1}
                    className="flex items-center gap-1 min-h-[48px] px-4 py-2 text-[15px] font-medium text-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-xl active:bg-accent/10"
                  >
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center max-w-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 border border-accent/20">
                <Sparkles className="w-8 h-8 text-accent-light" />
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
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-accent to-accent-dark text-white text-sm font-semibold shadow-glow-accent hover:shadow-glow-accent-lg transition-shadow"
              >
                <Sparkles className="w-5 h-5" />
                Generate Lesson
              </motion.button>
              <p className="text-[10px] text-text-tertiary mt-3">or press Ctrl+N</p>
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
