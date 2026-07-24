import { motion } from 'framer-motion'
import { Brain, Play, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AITutorModule() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full min-h-[60vh] flex items-center justify-center my-24 group cursor-pointer" onClick={() => navigate('/learn', { state: { openGenerate: true } })}>
      {/* Abstract Glowing Core Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-fuchsia-500/20 transition-all duration-1000 delay-100" />

      {/* Floating Elements (Orbital) */}
      <motion.div 
        animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] top-[20%] bg-[#060814]/80 backdrop-blur-md border border-indigo-500/30 p-4 shadow-xl z-20"
        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
      >
        <div className="text-[10px] text-indigo-400 font-mono mb-1">DATA_STREAM_01</div>
        <div className="w-32 h-1.5 bg-indigo-900/50 rounded-full overflow-hidden">
          <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-1/2 h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }} 
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-[5%] bottom-[20%] bg-[#060814]/80 backdrop-blur-md border border-fuchsia-500/30 p-4 shadow-xl z-20"
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-fuchsia-400" />
          <span className="text-xs font-bold text-[#F8FAFC]">Neural Link Active</span>
        </div>
      </motion.div>

      {/* Main Central Console */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between w-full max-w-5xl gap-12 p-8">
        
        {/* Left Side: Animated Orb */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full text-indigo-500/30 group-hover:text-indigo-400/50 transition-colors duration-500 pointer-events-none">
            <motion.circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" 
              animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
            <motion.circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 20" 
              animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
            <motion.path d="M100 10 L100 190 M10 100 L190 100" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          </svg>
          <div className="relative z-10 w-32 h-32 bg-indigo-950/80 backdrop-blur-xl border-2 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.5)] rounded-full flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_80px_rgba(99,102,241,0.8)] transition-all duration-500">
             <Brain className="w-12 h-12 text-indigo-300" />
          </div>
        </div>

        {/* Right Side: Typography and CTA */}
        <div className="flex-1 flex flex-col items-start max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-900/30 border-l-2 border-indigo-500 text-indigo-300 font-bold tracking-widest text-[10px] uppercase mb-6 backdrop-blur-md">
            AI Tutor Environment
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-6 text-[#F8FAFC]">
            Learn <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
              Smarter.
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-[#94A3B8] font-medium leading-relaxed mb-10">
            Generate incredibly detailed, personalized learning journeys instantly.
          </p>

          <button className="group/btn relative inline-flex items-center gap-4 px-8 py-4 bg-white text-black font-extrabold text-sm md:text-base rounded-none overflow-hidden shadow-[4px_4px_0_rgba(99,102,241,0.5)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_rgba(99,102,241,0.5)] transition-all">
            <Play className="w-4 h-4 fill-black" />
            INITIALIZE LESSON
          </button>
        </div>
      </div>
    </div>
  )
}
