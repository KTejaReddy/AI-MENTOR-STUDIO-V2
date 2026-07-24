import React from 'react'
import { motion } from 'framer-motion'
import { Brain, Play, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const AITutorModule = React.memo(function AITutorModule() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full col-span-12 min-h-[320px] md:min-h-[400px] flex items-center justify-center my-0 group cursor-pointer overflow-hidden" onClick={() => navigate('/learn', { state: { openGenerate: true } })}>
      {/* Abstract Glowing Core Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none transition-all duration-1000 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)] group-hover:bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.25)_0%,transparent_70%)]" style={{ willChange: 'transform' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none transition-all duration-1000 delay-100 bg-[radial-gradient(circle_at_center,rgba(192,38,211,0.15)_0%,transparent_70%)] group-hover:bg-[radial-gradient(circle_at_center,rgba(192,38,211,0.25)_0%,transparent_70%)]" style={{ willChange: 'transform' }} />

      {/* Main Central Console */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-between w-full max-w-5xl gap-6 md:gap-8 p-4">
        
        {/* Left Side: Animated Orb */}
        <div className="relative hidden md:flex w-48 h-48 md:w-56 md:h-56 flex-shrink-0 items-center justify-center">
          <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full text-indigo-500/30 group-hover:text-indigo-400/50 transition-colors duration-500 pointer-events-none">
            <motion.circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" 
              animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
            <motion.circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 20" 
              animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
            <motion.path d="M100 10 L100 190 M10 100 L190 100" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          </svg>
          <div className="relative z-10 w-24 h-24 bg-indigo-950/80 backdrop-blur-xl border-2 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] rounded-full flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(99,102,241,0.8)] transition-all duration-500">
             <Brain className="w-8 h-8 text-indigo-300" />
          </div>
        </div>

        {/* Right Side: Typography and CTA */}
        <div className="flex-1 flex flex-col items-center text-center md:items-start md:text-left max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-900/30 border-l-2 border-indigo-500 text-indigo-300 font-bold tracking-widest text-[9px] uppercase mb-4 backdrop-blur-md">
            AI Tutor Environment
          </div>
          
          <h2 className="text-[42px] sm:text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter leading-[0.95] mb-4 text-[#F8FAFC]">
            Learn <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
              Smarter.
            </span>
          </h2>
          
          <p className="text-base md:text-lg text-[#94A3B8] font-medium leading-relaxed mb-6">
            Generate incredibly detailed, personalized learning journeys instantly.
          </p>

          <button className="group/btn relative inline-flex items-center justify-center gap-3 px-8 min-h-[48px] bg-white text-black font-extrabold text-sm md:text-base rounded-none overflow-hidden shadow-[4px_4px_0_rgba(99,102,241,0.5)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_rgba(99,102,241,0.5)] transition-all">
            <Play className="w-3 h-3 md:w-4 md:h-4 fill-black" />
            INITIALIZE LESSON
          </button>
        </div>
      </div>
    </div>
  )
})
