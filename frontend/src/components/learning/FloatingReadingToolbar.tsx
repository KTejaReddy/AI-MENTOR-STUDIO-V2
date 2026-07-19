import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTabs } from '@/contexts/TabContext'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import {
  Bookmark, Bot, MoreVertical, Share2, Download, Link as LinkIcon,
  Printer, Sparkles, X, FileText, Settings, Languages, Code2, 
  Sigma, Network, HelpCircle, Lightbulb, BookOpen, Clock, Activity
} from 'lucide-react'

interface FloatingReadingToolbarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  activeSectionId?: string | null
  tabId: string
  title: string
  totalSections?: number
  completedSections?: number
  currentSectionIndex?: number
}

const getAIActionsForSection = (sectionId: string | null | undefined) => {
  const id = (sectionId || '').toLowerCase()
  if (id.includes('code')) {
    return [
      { label: 'Explain Code', prompt: 'Please explain this code snippet.', icon: Code2 },
      { label: 'Optimize Code', prompt: 'How can I optimize this code?', icon: Sparkles },
      { label: 'Debug Code', prompt: 'I have a bug related to this code. Help me debug it.', icon: Activity },
    ]
  }
  if (id.includes('formula')) {
    return [
      { label: 'Explain Formula', prompt: 'Explain this formula simply.', icon: Sigma },
      { label: 'Solve Example', prompt: 'Give me a step-by-step example solving this formula.', icon: Lightbulb },
      { label: 'Visualize Formula', prompt: 'How can I visualize this formula?', icon: Network },
    ]
  }
  if (id.includes('diagram') || id.includes('visual')) {
    return [
      { label: 'Explain Diagram', prompt: 'Explain what this diagram is showing.', icon: Network },
      { label: 'Simplify Diagram', prompt: 'Simplify the concepts shown in this diagram.', icon: Lightbulb },
    ]
  }
  if (id.includes('quiz') || id.includes('interview')) {
    return [
      { label: 'Give Hint', prompt: 'Give me a hint for this question.', icon: Lightbulb },
      { label: 'Explain Answer', prompt: 'Explain the correct answer for this.', icon: HelpCircle },
      { label: 'More Questions', prompt: 'Generate similar questions.', icon: Sparkles },
    ]
  }
  
  return [
    { label: 'Explain Simpler', prompt: 'Explain this section simpler, like I am 10 years old.', icon: Lightbulb },
    { label: 'Give Example', prompt: 'Give me a concrete real-world example.', icon: Sparkles },
    { label: 'Generate Quiz', prompt: 'Generate a short quiz on this section.', icon: HelpCircle },
    { label: 'Ask AI', prompt: 'I have a question about this section.', icon: Bot },
  ]
}

export function FloatingReadingToolbar({
  scrollContainerRef,
  activeSectionId,
  tabId,
  title,
  totalSections = 0,
  completedSections = 0,
  currentSectionIndex = 0,
}: FloatingReadingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  
  const navigate = useNavigate()
  const { toast } = useToast()
  const { activeTab, updateMemory } = useTabs()
  
  const isBookmarked = activeTab?.memory.bookmarks?.some((b) => b.sectionId === activeSectionId) || false
  const overallProgress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  const bookmarkRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let lastScrollY = container.scrollTop
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = container.scrollTop
          const scrollDelta = currentScrollY - lastScrollY
          
          if (currentScrollY > 120) {
            if (scrollDelta > 5) {
              // Scrolling down
              setIsVisible(true)
            } else if (scrollDelta < -15) {
              // Scrolling up quickly
              setIsVisible(false)
              setShowMore(false)
              setShowAI(false)
              setShowProgress(false)
            }
          } else {
            setIsVisible(false)
            setShowMore(false)
            setShowAI(false)
            setShowProgress(false)
          }

          // Auto-save progress throttled
          if (Math.abs(scrollDelta) > 50) {
            updateMemory(tabId, { scrollPosition: currentScrollY, currentSectionId: activeSectionId || null })
          }

          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef, tabId, activeSectionId, updateMemory])

  const handleBookmark = () => {
    if (!activeSectionId || !activeTab) return
    const currentBookmarks = activeTab.memory.bookmarks || []
    let newBookmarks
    if (isBookmarked) {
      newBookmarks = currentBookmarks.filter((b) => b.sectionId !== activeSectionId)
    } else {
      newBookmarks = [...currentBookmarks, {
        id: `bm-${Date.now()}`,
        type: 'section' as const,
        label: title,
        sectionId: activeSectionId,
        timestamp: Date.now()
      }]
    }
    updateMemory(tabId, { bookmarks: newBookmarks })
    
    // Animate button scale briefly
    if (bookmarkRef.current) {
      bookmarkRef.current.animate(
        [{ transform: 'scale(0.8)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
        { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' }
      )
    }
  }

  const dispatchAIAction = (prompt: string) => {
    setShowAI(false)
    window.dispatchEvent(
      new CustomEvent('mentor-toggle-chat', {
        detail: {
          context: `Lesson: ${title}\nSubject: ${activeTab?.subject}\nSection: ${activeSectionId || 'Overview'}\nMode: ${activeTab?.learningMode}\n\n${prompt}`
        }
      })
    )
  }

  const handleNotes = () => {
    setShowMore(false)
    navigate('/notes')
  }

  const handleShare = async () => {
    setShowMore(false)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Lesson: ${title}`, url: window.location.href })
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Link Copied', description: 'Lesson link copied to clipboard.' })
    }
  }

  const handleCopyLink = () => {
    setShowMore(false)
    navigator.clipboard.writeText(window.location.href)
    toast({ title: 'Link Copied', description: 'Lesson link copied to clipboard.' })
  }

  const handleTranslate = () => {
    setShowMore(false)
    toast({ title: 'Translate Lesson', description: 'Translation feature coming soon.' })
  }
  
  const handleSettings = () => {
    setShowMore(false)
    toast({ title: 'Reading Settings', description: 'Settings feature coming soon.' })
  }

  const handlePrint = () => {
    setShowMore(false)
    window.print()
  }

  const scrollToTop = () => {
    setShowProgress(false)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    return null
  }

  const aiActions = getAIActionsForSection(activeSectionId)

  return (
    <>
      <AnimatePresence>
        {isVisible && !showMore && !showAI && !showProgress && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-1 px-3 py-2 rounded-full glass bg-surface-150/80 backdrop-blur-xl border border-border shadow-2xl">
              <button
                ref={bookmarkRef}
                onClick={handleBookmark}
                className={cn(
                  "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-transform active:scale-95",
                  isBookmarked ? "text-accent" : "text-text-secondary"
                )}
                aria-label="Bookmark"
              >
                <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-current")} />
              </button>
              
              <button
                onClick={() => setShowAI(true)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-text-secondary transition-transform active:scale-95 hover:text-accent-light"
                aria-label="AI Assistant"
              >
                <Bot className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowProgress(true)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-text-secondary transition-transform active:scale-95 hover:text-emerald-400"
                aria-label="Reading Progress"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              
              <div className="w-px h-6 bg-border mx-1" />
              
              <button
                onClick={() => setShowMore(true)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-text-secondary transition-transform active:scale-95"
                aria-label="More Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showMore || showAI || showProgress) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowMore(false); setShowAI(false); setShowProgress(false); }}
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex flex-col p-4 pb-8">
                <div className="w-12 h-1.5 bg-surface-300 rounded-full mx-auto mb-6 shrink-0" />
                
                {/* MORE OPTIONS SHEET */}
                {showMore && (
                  <>
                    <div className="flex items-center justify-between px-2 mb-4 shrink-0">
                      <h3 className="text-sm font-bold text-text-primary">More Actions</h3>
                      <button onClick={() => setShowMore(false)} className="p-2 -mr-2 text-text-tertiary">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <button onClick={handleShare} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <Share2 className="w-5 h-5 text-text-tertiary" /> Share Lesson
                      </button>
                      <button onClick={handleCopyLink} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <LinkIcon className="w-5 h-5 text-text-tertiary" /> Copy Lesson Link
                      </button>
                      <button onClick={handleNotes} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <FileText className="w-5 h-5 text-text-tertiary" /> Open Notes
                      </button>
                      <button onClick={() => { setShowMore(false); toast({ title: 'Generating Notes', description: 'AI is generating notes...' }) }} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <Sparkles className="w-5 h-5 text-accent-light" /> Generate Notes
                      </button>
                      <button onClick={() => { setShowMore(false); toast({ title: 'Download PDF', description: 'Exporting as PDF...' }) }} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <Download className="w-5 h-5 text-text-tertiary" /> Download PDF
                      </button>
                      <button onClick={handleTranslate} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <Languages className="w-5 h-5 text-text-tertiary" /> Translate Lesson
                      </button>
                      <button onClick={handleSettings} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <Settings className="w-5 h-5 text-text-tertiary" /> Reading Settings
                      </button>
                      <button onClick={handlePrint} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                        <Printer className="w-5 h-5 text-text-tertiary" /> Print Lesson
                      </button>
                    </div>
                  </>
                )}

                {/* AI ACTION SHEET */}
                {showAI && (
                  <>
                    <div className="flex items-center justify-between px-2 mb-4 shrink-0">
                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-text-primary">AI Assistant</h3>
                        <p className="text-xs text-text-tertiary">Contextual actions for current section</p>
                      </div>
                      <button onClick={() => setShowAI(false)} className="p-2 -mr-2 text-text-tertiary">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {aiActions.map((action, i) => (
                        <button key={i} onClick={() => dispatchAIAction(action.prompt)} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left text-sm font-medium text-text-secondary hover:bg-surface-100 active:bg-surface-200 transition-colors">
                          <action.icon className="w-5 h-5 text-accent-light" /> {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* READING PROGRESS SHEET */}
                {showProgress && (
                  <>
                    <div className="flex items-center justify-between px-2 mb-4 shrink-0">
                      <h3 className="text-sm font-bold text-text-primary">Reading Progress</h3>
                      <button onClick={() => setShowProgress(false)} className="p-2 -mr-2 text-text-tertiary">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="px-2 mb-6 space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-surface-150 border border-border">
                        <div className="flex flex-col">
                          <span className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Current</span>
                          <span className="text-sm font-bold text-text-primary">Section {currentSectionIndex + 1} of {totalSections}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-accent-light" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary font-medium">Overall Progress</span>
                          <span className="text-accent-light font-bold">{overallProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-accent to-emerald-400" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${overallProgress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <button onClick={() => setShowProgress(false)} className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-glow-accent active:scale-[0.98] transition-transform">
                        Continue Reading
                      </button>
                      <button onClick={scrollToTop} className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl text-text-secondary font-medium text-sm active:bg-surface-200 transition-colors">
                        Back to Top
                      </button>
                      
                      {activeTab?.memory.currentSectionId && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs font-semibold text-text-tertiary uppercase px-2 mb-2">Recently Visited</p>
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-100 text-sm">
                            <Clock className="w-4 h-4 text-text-tertiary" />
                            <span className="text-text-secondary capitalize">{activeTab.memory.currentSectionId.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
