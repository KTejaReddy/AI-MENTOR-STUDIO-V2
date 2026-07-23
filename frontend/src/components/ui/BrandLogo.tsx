import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-5 h-5 text-text-primary group-hover:opacity-80 transition-opacity duration-250"
          fill="currentColor"
        >
          {/* Geometrically constructed logo matching the ARKORE LOGICS A/R mark */}
          {/* Left isolated triangle */}
          <path d="M 15 80 L 32 80 L 23.5 60 Z" />
          {/* Main intertwined A and R shape */}
          <path d="M 33 55 L 45 30 L 65 30 C 78 30 85 38 85 50 C 85 58 78 65 68 68 L 78 80 L 60 80 L 52 68 L 47 68 L 52 80 L 35 80 L 45 55 Z M 48 55 L 55 55 C 65 55 68 50 68 45 C 68 40 65 38 55 38 L 41 38 Z" fillRule="evenodd" />
        </svg>
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
