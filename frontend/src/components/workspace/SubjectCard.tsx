import { type ReactNode, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface SubjectCardProps {
  icon: ReactNode
  title: string
  description: string
  topicCount: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  onClick?: () => void
  className?: string
}

export function SubjectCard({
  icon,
  title,
  description,
  topicCount,
  difficulty,
  onClick,
  className,
}: SubjectCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    
    // Tilt calculations
    setRotateX(-y / rect.height * 10)
    setRotateY(x / rect.width * 10)
    
    // Glow spot coordinates
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseEnter = () => {
    setHovered(true)
  }

  const handleMouseLeave = () => {
    setHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  const reflectX = -rotateY * 4
  const reflectY = rotateX * 4

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: hovered 
          ? `perspective(800px) scale3d(1.03, 1.03, 1.03) translate3d(0, -10px, 25px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
          : `perspective(800px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)`,
        transition: hovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={cn(
        'card-hover interactive-item p-5 text-left w-full group relative overflow-hidden',
        !hovered && 'float-3d',
        className
      )}
    >
      {/* 3D Glass shine sweep */}
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300 opacity-30 z-20"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
            transform: `translate3d(${reflectX}px, ${reflectY}px, 0)`,
          }}
        />
      )}

      {/* Laser glow overlay */}
      {hovered && (
        <div
          className="absolute pointer-events-none rounded-full blur-[40px] opacity-40 mix-blend-screen"
          style={{
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(0,242,254,0.4) 0%, transparent 70%)',
            left: `${glowPos.x - 60}px`,
            top: `${glowPos.y - 60}px`,
          }}
        />
      )}

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-11 h-11 rounded-xl bg-accent-muted/10 border border-[#00f2fe]/10 flex items-center justify-center shrink-0 group-hover:border-[#00f2fe]/30 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-bold text-text-primary truncate tracking-tight group-hover:text-[#00f2fe] transition-colors">{title}</h3>
            {difficulty && (
              <Badge
                variant={difficulty === 'beginner' ? 'success' : difficulty === 'intermediate' ? 'warning' : 'error'}
                size="sm"
                className="capitalize text-xs px-1.5"
              >
                {difficulty}
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-tertiary line-clamp-2 mb-3 leading-relaxed">{description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary font-mono">{topicCount} TOPICS</span>
            <div className="w-5 h-5 rounded-full bg-white/3 flex items-center justify-center group-hover:bg-[#00f2fe]/15 transition-all">
              <ArrowRight className="w-3 h-3 text-text-tertiary group-hover:text-[#00f2fe] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
