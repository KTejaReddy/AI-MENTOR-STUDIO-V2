import { Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { NotFound } from '@/pages/NotFound'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a12]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted/20">
            <Sparkles className="h-6 w-6 text-accent-light" />
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-teal"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  const ADMIN_EMAILS = ['arkoreai0@gmail.com']
  const is_admin = isAuthenticated && user && ADMIN_EMAILS.includes(user.email)

  if (!is_admin) {
    return <NotFound />
  }

  return <Outlet />
}
