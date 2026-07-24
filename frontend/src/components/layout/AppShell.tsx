import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopNavbar } from './TopNavbar'
import { MobileDrawer } from './MobileDrawer'
import { AICompanion } from '@/components/companion/AICompanion'
import { Toaster } from '@/components/ui/toaster'
import { BackgroundEffects } from '@/components/effects/BackgroundEffects'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

const pageVariants = {
  initial: { opacity: 0, scale: 0.985, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    y: -8,
    transition: {
      duration: 0.22,
      ease: 'easeInOut',
    },
  },
}

export function AppShell() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()

  const handleNewLesson = useCallback(() => {
    navigate('/learn', { state: { openGenerate: true } })
  }, [navigate])

  // Handle Mobile hardware back button for chat drawer
  useEffect(() => {
    if (chatOpen) {
      window.history.pushState({ chatOpen: true }, '')
    } else {
      // If we are setting chatOpen to false, and the state exists, we pop it manually (cleanup)
      if (window.history.state?.chatOpen) {
        window.history.back()
      }
    }
  }, [chatOpen])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (chatOpen && !e.state?.chatOpen) {
        setChatOpen(false)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [chatOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNewLesson()
      }
    }
    const handleToggleChat = () => {
      setChatOpen(true)
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mentor-toggle-chat', handleToggleChat)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mentor-toggle-chat', handleToggleChat)
    }
  }, [handleNewLesson])

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-surface flex flex-col relative z-0">
      <BackgroundEffects />

      <TopNavbar
        onToggleSidebar={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
        onNewLesson={handleNewLesson}
      />

      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10 p-0 md:p-3 md:pt-2">

        <main className="flex-1 overflow-hidden rounded-none md:rounded-[var(--radius-xl)] bg-surface-50 border-0 md:border border-border shadow-lg relative z-10 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full w-full overflow-hidden"
            >
              <ErrorBoundary>
                {outlet}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {chatOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            {/* Chat Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed md:static inset-x-0 bottom-0 top-[20%] md:top-auto md:bottom-auto md:h-[360px] md:shrink-0 border-t border-border overflow-hidden z-50 md:z-30 rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none flex flex-col bg-surface"
            >
              <AICompanion />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toaster />
    </div>
  )
}

