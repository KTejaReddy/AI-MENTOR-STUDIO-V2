import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, AlertCircle } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#06060c] text-text-primary px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center flex flex-col items-center max-w-md"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-6 text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        
        <h1 className="text-6xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-red-400 to-amber-500 bg-clip-text text-transparent">
          404
        </h1>
        
        <h2 className="text-xl font-bold mb-4 text-text-secondary">
          Page Not Found
        </h2>
        
        <p className="text-sm text-text-tertiary mb-8 leading-relaxed">
          The page you are looking for does not exist or you do not have permission to view it.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold tracking-wide transition-all shadow-lg"
        >
          <Home className="h-4 w-4 text-accent-light" />
          Back to Home
        </motion.button>
      </motion.div>
    </div>
  )
}
