import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function AuthCallback() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (!hash) {
      setError('No authentication data received')
      return
    }

    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const userRaw = params.get('user')

    if (!accessToken || !refreshToken) {
      setError('Incomplete authentication data received')
      return
    }

    let userData: any = null
    if (userRaw) {
      try {
        userData = JSON.parse(decodeURIComponent(userRaw))
      } catch {
        setError('Could not parse user profile')
        return
      }
    }

    if (!userData) {
      setError('Could not parse user profile')
      return
    }

    login(accessToken, refreshToken, userData, true)
    navigate('/', { replace: true })
  }, [login, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a12]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 text-center max-w-md w-full mx-4"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <Sparkles className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Sign In Failed</h2>
          <p className="text-sm text-text-tertiary mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="rounded-xl bg-gradient-to-r from-accent to-teal px-6 py-2.5 text-sm font-bold text-white"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a12]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
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
        <p className="text-sm text-text-tertiary">Completing sign in...</p>
      </motion.div>
    </div>
  )
}
