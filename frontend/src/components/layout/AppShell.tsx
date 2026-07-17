import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopNavbar } from './TopNavbar'
import { AICompanion } from '@/components/companion/AICompanion'
import { Toaster } from '@/components/ui/toaster'
import { GlobalCommandPalette } from '@/components/layout/GlobalCommandPalette'
import { BackgroundEffects } from '@/components/effects/BackgroundEffects'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isLearnPage = location.pathname === '/learn'

  const handleNewLesson = useCallback(() => {
    navigate('/learn', { state: { openGenerate: true } })
  }, [navigate])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNewLesson()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleNewLesson])

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface flex flex-col relative z-0">
      <BackgroundEffects />

      <TopNavbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
        onNewLesson={handleNewLesson}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10 p-3 pt-2 gap-3">
        {!isLearnPage && sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 overflow-hidden rounded-2xl glass border border-white/5 flex flex-col p-4 shadow-lg"
          >
            <div className="text-xs font-semibold text-text-tertiary mb-3 uppercase tracking-wider">Navigation</div>
            <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-text-tertiary/75 p-2">
              <span className="mb-2">Sidebar active</span>
              <span className="text-[10px]">Navigate tabs from the premium header above.</span>
            </div>
          </motion.div>
        )}

        <main className="flex-1 overflow-hidden rounded-2xl glass border border-white/5 shadow-2xl relative z-10 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full w-full overflow-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 360, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="shrink-0 border-t border-border overflow-hidden z-30"
          >
            <AICompanion />
          </motion.div>
        )}
      </AnimatePresence>

      <GlobalCommandPalette />
      <Toaster />
    </div>
  )
}
