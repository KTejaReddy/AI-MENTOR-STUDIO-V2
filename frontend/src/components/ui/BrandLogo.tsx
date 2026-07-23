import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import logoSrc from '@/assets/branding/arkore-logo.png'

interface BrandLogoProps {
  className?: string
  collapsed?: boolean
}

export function BrandLogo({ className, collapsed = false }: BrandLogoProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-center gap-2 group cursor-pointer", className)}
    >
      <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-surface-100 group-hover:bg-surface-200 transition-colors duration-250">
        <img 
          src={logoSrc} 
          alt="ARKORE LOGICS Logo" 
          className="w-5 h-5 object-contain group-hover:opacity-80 transition-opacity duration-250"
        />
      </div>
      {!collapsed && (
        <div className="flex flex-col items-start justify-center hidden sm:flex">
          <span className="text-[13px] font-bold text-text-primary tracking-wide group-hover:text-text-secondary transition-colors duration-250 leading-tight">
            Mentor AI Studio
          </span>
          <span className="text-[9px] font-medium text-text-tertiary uppercase tracking-wider leading-tight">
            by ARKORE LOGICS
          </span>
        </div>
      )}
      {!collapsed && (
        <div className="flex flex-col items-start justify-center sm:hidden">
          <span className="text-[13px] font-bold text-text-primary tracking-wide group-hover:text-text-secondary transition-colors duration-250 leading-tight">
            Mentor AI Studio
          </span>
        </div>
      )}
    </motion.div>
  )
}
