import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { InteractiveKnowledgeGraph } from '@/components/ui/InteractiveKnowledgeGraph'
import { Brain, Code2, FileText, Edit3, Clock, Sparkles, Play, Terminal, ArrowRight, BookOpen, Layers } from 'lucide-react'
import { MouseEvent, useState } from 'react'

function TiltCard({ children, className, onClick, gradientClass, outlineClass }: { children: React.ReactNode, className?: string, onClick?: () => void, gradientClass: string, outlineClass: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 })
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"])

  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    x.set(0)
    y.set(0)
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={onClick}
      className={`relative cursor-pointer group rounded-[32px] overflow-hidden ${className}`}
    >
      {/* Background glass and border */}
      <div className={`absolute inset-0 bg-[#060814]/80 backdrop-blur-3xl border ${outlineClass} transition-colors duration-500 rounded-[32px] z-0`} />
      
      {/* Inner Highlight */}
      <div className="absolute inset-0 rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] z-10 pointer-events-none" />

      {/* Hover Gradient Overlay */}
      <div 
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10 ${gradientClass}`} 
      />
      
      {/* Dynamic light reflection following mouse */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay"
        style={{
          background: useTransform(
            [mouseXSpring, mouseYSpring],
            ([xPos, yPos]) => `radial-gradient(circle at ${(xPos as number + 0.5) * 100}% ${(yPos as number + 0.5) * 100}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
          ),
          opacity: isHovering ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-30 h-full transform-style-3d">
        <motion.div
          style={{ transform: "translateZ(30px)" }}
          className="h-full"
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  )
}


export function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none relative bg-[#02040A] text-white perspective-[2000px]">
      
      {/* ─── GLOBAL BACKGROUND ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        {/* Layer 1 is the bg-[#02040A] above */}
        
        {/* Layer 2: Deep space mesh gradients */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15)_0%,rgba(0,0,0,0)_60%)] blur-[150px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,rgba(0,0,0,0)_60%)] blur-[150px]" 
        />
        <motion.div 
          animate={{ rotate: [0, 360], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[20%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.1)_0%,rgba(0,0,0,0)_60%)] blur-[120px]" 
        />
        
        {/* Layer 3: Engineering grid mask */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,#000_10%,transparent_80%)]" />
        
        {/* Layer 4: Noise overlay for physical texture */}
        <div className="absolute inset-0 bg-noise opacity-[0.25] mix-blend-overlay" />
      </div>

      {/* ─── HERO SECTION ─────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative min-h-[50vh] flex flex-col items-center justify-center pt-24 pb-12 px-6 z-10"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-30 scale-125 pointer-events-none mix-blend-screen filter blur-[1px]">
          <InteractiveKnowledgeGraph />
        </div>
        
        <div className="relative z-20 text-center max-w-5xl mx-auto flex flex-col items-center justify-center mt-8">
          
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0F172A]/80 border border-white/10 text-sm font-semibold text-[#CBD5E1] mb-8 shadow-[0_0_30px_rgba(56,189,248,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl">
            <Layers className="w-4 h-4 text-sky-400" />
            Engineering Operating System
          </div>
          
          <h1 className="text-5xl md:text-[6rem] font-extrabold tracking-tighter leading-[1.05] mb-6 text-white drop-shadow-2xl">
            Learn Engineering <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400">
              Smarter.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#94A3B8] max-w-2xl font-medium leading-relaxed mb-10">
            A premium desktop workspace for engineers. Generate deep lessons, visualize complex algorithms, and compile code instantly.
          </p>

        </div>
      </motion.section>

      {/* ─── FEATURE GRID ─────────────────────────────── */}
      <section className="relative z-20 px-6 md:px-12 max-w-[1400px] mx-auto pb-40 pt-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 auto-rows-min">
          
          {/* AI TUTOR - Neural Graphic World */}
          <TiltCard
            className="md:col-span-12 min-h-[380px] hover:shadow-[0_20px_80px_-20px_rgba(99,102,241,0.5)]"
            gradientClass="bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.2),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.2),transparent_60%)]"
            outlineClass="border-white/[0.05] group-hover:border-indigo-500/50"
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
          >
            <div className="flex flex-col md:flex-row h-full p-10 md:p-14">
              <div className="flex-1 flex flex-col justify-center pr-8 relative z-20">
                <div className="w-16 h-16 rounded-[20px] bg-[#1E1B4B] border border-indigo-500/30 flex items-center justify-center mb-8 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                  <Brain className="w-8 h-8" />
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-[#F8FAFC] mb-5 tracking-tight drop-shadow-lg">AI Tutor</h2>
                <p className="text-xl text-[#94A3B8] font-medium leading-relaxed mb-8 max-w-xl group-hover:text-[#CBD5E1] transition-colors">
                  Generate personalized lessons and interactive quizzes. The AI adapts to your exact learning requirements and visualizes concepts dynamically.
                </p>
                <div className="mt-auto">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#F8FAFC] text-[#020617] font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all">
                    <Play className="w-4 h-4 fill-[#020617]" />
                    Generate New Lesson
                  </div>
                </div>
              </div>
              
              {/* Premium Abstract Art Area */}
              <div className="flex-1 relative h-full min-h-[200px] mt-8 md:mt-0 max-md:hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Neural Web Graphic */}
                  <div className="w-[120%] h-[120%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PGNpcmNsZSBjeD0iMjAwIiBjeT0iMjAwIiByPSIxNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg5OSwxMDIsMjQxLDAuMikiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iNCA0Ii8+PGNpcmNsZSBjeD0iMjAwIiBjeT0iMjAwIiByPSIxMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNjgsODUsMjQ3LDAuMykiIHN0cm9rZS13aWR0aD0iMSIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg5OSwxMDIsMjQxLDAuNSkiIHN0cm9rZS13aWR0aD0iMSIvPjxwb2x5Z29uIHBvaW50cz0iMjAwLDUwIDI4NiwxNTAgMjAwLDI1MCAxMTQsMTUwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] bg-center bg-no-repeat bg-contain opacity-50 group-hover:scale-105 group-hover:opacity-80 transition-all duration-1000" />
                </div>
              </div>
            </div>
          </TiltCard>

          {/* COMPILER LAB - Terminal Matrix World */}
          <TiltCard
            className="md:col-span-7 min-h-[360px] hover:shadow-[0_20px_80px_-20px_rgba(16,185,129,0.5)]"
            gradientClass="bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.15),transparent_60%)]"
            outlineClass="border-white/[0.05] group-hover:border-emerald-500/50"
            onClick={() => navigate('/compiler-lab')}
          >
            <div className="flex flex-col h-full p-10 md:p-12 relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-[#064E3B] border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <Terminal className="w-7 h-7" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#F8FAFC] mb-4 tracking-tight">Compiler Lab</h2>
              <p className="text-lg text-[#94A3B8] font-medium max-w-sm leading-relaxed group-hover:text-[#CBD5E1] transition-colors relative z-20">
                Write, test, and debug code instantly in a robust environment with AI assistance.
              </p>
              
              {/* Code Snippet Graphic Background */}
              <div className="absolute right-[-10%] bottom-[-10%] w-[70%] h-[80%] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none rotate-[-5deg]">
                <div className="w-full h-full rounded-xl border border-emerald-500/30 bg-[#022c22]/80 backdrop-blur-sm p-6 shadow-2xl">
                  <div className="flex gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="font-mono text-sm text-emerald-400/80 space-y-2">
                    <p><span className="text-emerald-300">fn</span> main() {'{'}</p>
                    <p className="pl-4">println!("Hello OS!");</p>
                    <p className="pl-4">system.compile();</p>
                    <p>{'}'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* DOC TUTOR - Knowledge Graph World */}
          <TiltCard
            className="md:col-span-5 min-h-[360px] hover:shadow-[0_20px_80px_-20px_rgba(6,182,212,0.5)]"
            gradientClass="bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.15),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.15),transparent_60%)]"
            outlineClass="border-white/[0.05] group-hover:border-cyan-500/50"
            onClick={() => navigate('/document-tutor')}
          >
            <div className="flex flex-col h-full p-10 md:p-12 relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-[#083344] border border-cyan-500/30 flex items-center justify-center mb-6 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <BookOpen className="w-7 h-7" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#F8FAFC] mb-4 tracking-tight">Doc Tutor</h2>
              <p className="text-lg text-[#94A3B8] font-medium leading-relaxed group-hover:text-[#CBD5E1] transition-colors relative z-20">
                Extract knowledge directly from PDFs and research papers.
              </p>

              {/* Floating Documents Graphic */}
              <div className="absolute right-0 bottom-[-20px] w-48 h-48 opacity-20 group-hover:opacity-40 transition-all duration-700 pointer-events-none group-hover:translate-y-[-10px]">
                <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-400" fill="currentColor">
                  <path d="M20 10h40l20 20v60H20V10z" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M60 10v20h20" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="30" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="2"/>
                  <line x1="30" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="2"/>
                  <line x1="30" y1="80" x2="50" y2="80" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
          </TiltCard>

          {/* NOTES - Amber Workspace */}
          <TiltCard
            className="md:col-span-6 min-h-[280px] hover:shadow-[0_20px_80px_-20px_rgba(245,158,11,0.4)]"
            gradientClass="bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)]"
            outlineClass="border-white/[0.05] group-hover:border-amber-500/50"
            onClick={() => navigate('/notes')}
          >
            <div className="flex flex-col items-center text-center justify-center h-full p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgNDBoNDB2LTEuNUgwem0wLTUuNWg0MHYtMS41SDB6IiBmaWxsPSJyZ2JhKDI0NSwxNTgsMTEsMC4wNykiLz48L3N2Zz4=')] opacity-50" />
              
              <div className="w-14 h-14 rounded-2xl bg-[#451A03] border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] relative z-10">
                <Edit3 className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight relative z-10">Notes</h3>
              <p className="text-base text-[#94A3B8] font-medium group-hover:text-[#CBD5E1] transition-colors relative z-10">Your engineering scratchpad.</p>
            </div>
          </TiltCard>

          {/* HISTORY - Rose/Orange Timeline */}
          <TiltCard
            className="md:col-span-6 min-h-[280px] hover:shadow-[0_20px_80px_-20px_rgba(244,63,94,0.4)]"
            gradientClass="bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.15),transparent_70%)]"
            outlineClass="border-white/[0.05] group-hover:border-rose-500/50"
            onClick={() => navigate('/history')}
          >
            <div className="flex flex-col items-center text-center justify-center h-full p-10 relative overflow-hidden">
              {/* Concentric circles background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                <div className="w-48 h-48 border border-rose-500/30 rounded-full" />
                <div className="absolute w-64 h-64 border border-rose-500/20 rounded-full" />
                <div className="absolute w-80 h-80 border border-rose-500/10 rounded-full" />
              </div>

              <div className="w-14 h-14 rounded-2xl bg-[#4C0519] border border-rose-500/30 flex items-center justify-center mb-5 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] relative z-10">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight relative z-10">History</h3>
              <p className="text-base text-[#94A3B8] font-medium group-hover:text-[#CBD5E1] transition-colors relative z-10">Review past sessions.</p>
            </div>
          </TiltCard>

        </div>
      </section>
    </div>
  )
}
