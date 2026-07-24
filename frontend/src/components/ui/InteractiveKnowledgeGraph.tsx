import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Sparkles, Brain, Cpu, Database, Flame, Code2 } from 'lucide-react'

const nodes = [
  { id: 1, x: 20, y: 30, icon: Brain, color: 'var(--color-ai)' },
  { id: 2, x: 50, y: 15, icon: Sparkles, color: 'var(--color-lessons)' },
  { id: 3, x: 80, y: 35, icon: Code2, color: 'var(--color-compiler)' },
  { id: 4, x: 30, y: 70, icon: Database, color: 'var(--color-analytics)' },
  { id: 5, x: 70, y: 75, icon: Cpu, color: 'var(--color-history)' },
  { id: 6, x: 50, y: 50, icon: Flame, color: 'var(--color-practice)' },
]

const edges = [
  { source: 1, target: 2 },
  { source: 2, target: 3 },
  { source: 1, target: 4 },
  { source: 4, target: 6 },
  { source: 6, target: 2 },
  { source: 6, target: 5 },
  { source: 3, target: 5 },
]

export function InteractiveKnowledgeGraph() {
  const [mounted, setMounted] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[var(--color-ai)]/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[var(--color-compiler)]/20 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--color-lessons)]/20 rounded-full blur-[90px]" />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {edges.map((edge, i) => {
          const sourceNode = nodes.find(n => n.id === edge.source)!
          const targetNode = nodes.find(n => n.id === edge.target)!
          const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target
          
          return (
            <motion.line
              key={i}
              x1={`${sourceNode.x}%`}
              y1={`${sourceNode.y}%`}
              x2={`${targetNode.x}%`}
              y2={`${targetNode.y}%`}
              stroke={isHighlighted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
              strokeWidth={isHighlighted ? "0.3" : "0.1"}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: i * 0.1 + 0.5, ease: "easeOut" }}
            />
          )
        })}

        {/* Animated Particles flowing through edges */}
        {edges.map((edge, i) => {
          const sourceNode = nodes.find(n => n.id === edge.source)!
          const targetNode = nodes.find(n => n.id === edge.target)!
          
          return (
            <motion.circle
              key={`particle-${i}`}
              r="0.5"
              fill={sourceNode.color}
              initial={{ x: `${sourceNode.x}%`, y: `${sourceNode.y}%`, opacity: 0 }}
              animate={{
                x: [`${sourceNode.x}%`, `${targetNode.x}%`],
                y: [`${sourceNode.y}%`, `${targetNode.y}%`],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "linear"
              }}
            />
          )
        })}
      </svg>

      {/* Interactive HTML Nodes */}
      {nodes.map((node, i) => {
        const Icon = node.icon
        const isHovered = hoveredNode === node.id

        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: i * 0.1, duration: 0.8 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <motion.div
              animate={{ 
                y: isHovered ? -5 : [0, -8, 0],
                scale: isHovered ? 1.1 : 1
              }}
              transition={{ 
                y: isHovered ? { duration: 0.2 } : { duration: 4 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' }
              }}
              className="relative group"
            >
              <div 
                className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: node.color }}
              />
              <div 
                className="relative flex items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-[1.25rem] bg-surface-50/80 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden transition-all duration-300 group-hover:border-white/30"
              >
                <div 
                  className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ backgroundColor: node.color }}
                />
                <Icon 
                  className="w-5 h-5 md:w-6 md:h-6 transition-colors duration-300"
                  style={{ color: node.color }}
                />
              </div>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
