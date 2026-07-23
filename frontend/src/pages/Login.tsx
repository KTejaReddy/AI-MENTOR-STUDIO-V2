import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react'
import { AppIcon } from '@/components/ui/AppIcon'

const PARTICLES = 30

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const particlesRef = useRef<HTMLDivElement>(null)

  const from = (location.state as any)?.from?.pathname || '/'

  useEffect(() => {
    if (isAuthenticated && user) {
      const ADMIN_EMAILS = ['arkoreai0@gmail.com']
      if (ADMIN_EMAILS.includes(user.email)) {
        navigate('/ops-dashboard', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate, from])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx || !particlesRef.current) return
    const container = particlesRef.current
    canvas.width = container.offsetWidth
    canvas.height = container.offsetHeight
    container.appendChild(canvas)

    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    for (let i = 0; i < PARTICLES; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.5 + 0.5,
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach((d) => {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 242, 254, 0.15)'
        ctx.fill()
      })

      dots.forEach((a, i) => {
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0, 242, 254, ${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      container.removeChild(canvas)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      login(data.access_token, data.refresh_token, data.user, rememberMe)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) setError(detail[0]?.msg || 'Invalid input')
      else setError(detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    window.location.href = `${base}/api/v1/auth/login/google`
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a12]">
      <div ref={particlesRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-teal/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <AppIcon className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-wide">Mentor AI Studio</h1>
            <p className="mt-1 text-xs font-bold text-text-tertiary uppercase tracking-wider">by ARKORE LOGICS</p>
            <p className="mt-2 text-sm text-text-tertiary">Sign in to continue your learning journey</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 p-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span className="text-xs text-red-300">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border bg-surface-150/50 py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-tertiary/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-border bg-surface-150/50 py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-tertiary/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-surface-200/50 text-accent focus:ring-accent/20 cursor-pointer"
                />
                <span className="text-xs text-text-tertiary select-none">Remember me</span>
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent to-teal py-2.5 text-sm font-bold text-white shadow-lg transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

            <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleOAuth()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-200/30 py-2.5 text-xs font-medium text-text-secondary hover:bg-surface-200/60 hover:text-text-primary transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-text-tertiary">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-accent-light hover:text-accent transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
