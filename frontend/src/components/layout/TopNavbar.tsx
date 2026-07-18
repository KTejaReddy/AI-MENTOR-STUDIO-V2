import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Menu, MessageSquare, Home, GraduationCap, History,
  Bookmark, StickyNote, Settings2, Info, Sun, Moon, FileText,
  Code2, Bell, Trash2, Plus, User, LogOut, LogIn, Shield,
} from 'lucide-react'

interface TopNavbarProps {
  onToggleSidebar: () => void
  onToggleChat: () => void
  chatOpen: boolean
  onNewLesson?: () => void
}

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/learn', icon: GraduationCap, label: 'Learn' },
  { to: '/document-tutor', icon: FileText, label: 'Doc Tutor' },
  { to: '/compiler-lab', icon: Code2, label: 'Compiler' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]

const utilityItems = [
  { to: '/settings', icon: Settings2, label: 'Settings' },
  { to: '/about', icon: Info, label: 'About' },
]

export function TopNavbar({ onToggleSidebar, onToggleChat, chatOpen, onNewLesson }: TopNavbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications()
  const { user, isAuthenticated, logout, logoutAll } = useAuth()
  const navigate = useNavigate()

  const ThemeIcon = theme === 'dark' ? Moon : Sun

  const handleNewLesson = () => {
    if (onNewLesson) {
      onNewLesson()
    } else {
      navigate('/learn', { state: { openGenerate: true } })
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleLogoutAll = async () => {
    await logoutAll()
    navigate('/login')
  }

  // Get initials for avatar
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user?.email?.charAt(0).toUpperCase() || '?'
  }

  return (
    <header className="m-0 md:mx-3 md:mt-3 pt-[env(safe-area-inset-top)] md:pt-0 h-[calc(3.5rem+env(safe-area-inset-top))] md:h-14 shrink-0 glass rounded-none md:rounded-2xl flex items-center justify-between px-3 md:px-4 z-40 shadow-sm md:shadow-lg relative border-b md:border border-border">
      <div className="flex items-center gap-2">
        <IconButton label="Toggle sidebar" onClick={onToggleSidebar} className="hover:bg-surface-200/50 flex">
          <Menu className="w-[18px] h-[18px]" />
        </IconButton>

        <NavLink to="/" className="flex items-center gap-2 mr-5 group">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-muted/20 group-hover:bg-accent-muted/30 group-hover:shadow-glow-sm transition-all duration-300">
            <Sparkles className="w-[15px] h-[15px] text-[#00f2fe]" />
          </div>
          <span className="text-sm font-bold text-text-primary tracking-tight hidden sm:inline group-hover:text-[#00f2fe] transition-colors">
            Mentor AI
          </span>
        </NavLink>

        <nav className="flex items-center gap-0.5 md:gap-1 overflow-x-auto no-scrollbar mask-edges flex-1 min-w-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 relative z-10 shrink-0',
                  isActive
                    ? 'text-[#00f2fe]'
                    : 'text-text-tertiary hover:text-text-secondary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-accent-muted/15 border border-accent/20 -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <div>
          <Tooltip content="New Lesson (Ctrl+N)">
            <motion.button
              onClick={handleNewLesson}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  '0 0 12px rgba(0, 242, 254, 0.15)',
                  '0 0 24px rgba(0, 242, 254, 0.35)',
                  '0 0 12px rgba(0, 242, 254, 0.15)'
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="flex items-center gap-1.5 px-4 py-1.75 rounded-full bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#8b5cf6] text-white text-xs font-bold border border-white/10 shadow-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Lesson</span>
            </motion.button>
          </Tooltip>
        </div>

        <div>
          <Tooltip content={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            <IconButton label="Toggle theme" onClick={toggleTheme}>
              <ThemeIcon className="w-[18px] h-[18px]" />
            </IconButton>
          </Tooltip>
        </div>

        <div>
          <DropdownMenu
            align="end"
            trigger={
              <Tooltip content="Notifications">
                <IconButton label="Notifications">
                  <div className="relative">
                    <Bell className="w-[18px] h-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-[12px] font-bold text-white border-2 border-surface scale-90 origin-top-right">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </IconButton>
              </Tooltip>
            }
          >
            <div className="w-80 max-h-[400px] flex flex-col card-glass overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-text-primary">Notifications</span>
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors">
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-text-tertiary">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                      className={cn(
                        "p-3 rounded-lg mb-1 last:mb-0 cursor-pointer transition-colors text-left",
                        notif.read ? "bg-transparent opacity-60" : "bg-accent/5 hover:bg-accent/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-text-primary leading-tight">{notif.title}</span>
                        {!notif.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{notif.message}</p>
                      <div className="text-xs text-text-tertiary mt-2">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DropdownMenu>
        </div>

        <div>
          <Tooltip content={chatOpen ? 'Close AI chat' : 'Open AI chat'}>
            <IconButton
              label="AI Chat"
              onClick={onToggleChat}
              className={cn(chatOpen && 'text-accent-light bg-accent/10')}
            >
              <div className="relative">
                <MessageSquare className="w-[18px] h-[18px]" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
              </div>
            </IconButton>
          </Tooltip>
        </div>

        {/* Profile / Avatar Dropdown */}
        {isAuthenticated && user && (
          <DropdownMenu
            align="end"
            trigger={
              <button
                className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-accent to-teal text-white text-xs font-bold shadow-md hover:shadow-glow-sm transition-all duration-300 focus:outline-none"
                title="Profile"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials()
                )}
              </button>
            }
          >
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-semibold text-text-primary truncate">{user.full_name || 'User'}</p>
              <p className="text-xs text-text-tertiary truncate">{user.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="w-4 h-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
            <DropdownMenuItem danger onClick={handleLogoutAll}>
              <Shield className="w-4 h-4" />
              Logout All Devices
            </DropdownMenuItem>
          </DropdownMenu>
        )}

        <div className="hidden lg:flex items-center gap-0.5 ml-2 pl-2 border-l border-border">
          {utilityItems.map((item) => (
            <Tooltip key={item.to} content={item.label}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'text-accent-light bg-accent/10'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-150/60'
                  )
                }
              >
                <item.icon className="w-[15px] h-[15px]" />
              </NavLink>
            </Tooltip>
          ))}
        </div>
      </div>
    </header>
  )
}
