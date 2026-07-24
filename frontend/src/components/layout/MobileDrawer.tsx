import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'
import {
  Home, GraduationCap, FileText, Code2, History,
  StickyNote, Info, LogOut, Bell, X, User
} from 'lucide-react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/learn', icon: GraduationCap, label: 'Learn' },
  { to: '/document-tutor', icon: FileText, label: 'Doc Tutor' },
  { to: '/compiler-lab', icon: Code2, label: 'Compiler' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { logout, user } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    onClose()
    navigate('/login')
  }

  const navigateTo = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="md:hidden fixed top-0 left-0 bottom-0 w-4/5 max-w-[320px] bg-surface z-[70] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-150/50 pt-[env(safe-area-inset-top,1rem)]">
              <span className="font-bold text-text-primary">Mentor AI</span>
              <button onClick={onClose} className="p-2 -mr-2 text-text-tertiary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {/* Primary Nav */}
              <div className="px-2 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent/10 text-[#00f2fe]'
                          : 'text-text-secondary hover:bg-surface-100 hover:text-text-primary'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="my-4 mx-4 h-px bg-border" />

              {/* Secondary */}
              <div className="px-2 space-y-1">
                <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-100 transition-colors cursor-default">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-text-tertiary" />
                    Notifications
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button onClick={() => navigateTo('/about')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-100 transition-colors">
                  <Info className="w-5 h-5 text-text-tertiary" />
                  About
                </button>
              </div>
            </div>

            {/* Bottom */}
            <div className="p-4 border-t border-border bg-surface-150/50 pb-[calc(env(safe-area-inset-bottom,1rem)+1rem)]">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-teal flex items-center justify-center text-white font-bold shrink-0">
                  {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-text-primary truncate">{user?.full_name || 'User'}</span>
                  <span className="text-xs text-text-tertiary truncate">{user?.email}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-colors">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
