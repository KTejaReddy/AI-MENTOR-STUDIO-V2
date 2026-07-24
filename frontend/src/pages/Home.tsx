import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { InteractiveKnowledgeGraph } from '@/components/ui/InteractiveKnowledgeGraph'
import { Brain, Code2, FileText, Bookmark, Edit3, Clock, Sparkles, Play, Cpu, Network } from 'lucide-react'
import { useRef } from 'react'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none relative bg-[#01030B] text-white">
      
      {/* ─── GLOBAL DEEP SPACE CANVAS & PARTICLES ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a1930_0%,#01030B_100%)] opacity-80" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.04%22/%3E%3C/svg%3E')] mix-blend-overlay" />
        
        {/* Animated Grid Floor */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[40vh] border-t border-cyan-900/30 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_100%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"
          style={{ transform: 'perspective(500px) rotateX(60deg) scale(2)', transformOrigin: 'top' }}
        />
      </div>

      {/* ─── HUD HERO (ENGINEERING CONSTELLATION) ─────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-32 px-6 z-10"
      >
        {/* Massive 3D Glass Circle Centerpiece */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-cyan-500/10 bg-cyan-900/5 backdrop-blur-[2px] pointer-events-none flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.05)]">
          <div className="w-[600px] h-[600px] rounded-full border border-blue-500/20 bg-blue-900/5 animate-[spin_60s_linear_infinite]" />
          <div className="absolute w-[400px] h-[400px] rounded-full border border-purple-500/20 bg-purple-900/5 animate-[spin_40s_linear_infinite_reverse]" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-70 scale-125 pointer-events-none">
          <InteractiveKnowledgeGraph />
        </div>
        
        <div className="relative z-20 text-center max-w-5xl mx-auto flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#05131e]/80 backdrop-blur-md border border-cyan-500/30 text-xs font-bold tracking-widest uppercase text-cyan-400 mb-12 shadow-[0_0_20px_rgba(6,182,212,0.2)]" style={{ clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
            <Sparkles className="w-4 h-4" />
            Mentor OS v2.0
          </div>
          
          <h1 className="text-6xl md:text-[7rem] font-black tracking-tighter leading-[0.9] mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            ENGINEER<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
              TOMORROW
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-cyan-100/50 max-w-2xl font-medium leading-relaxed mb-16 tracking-wide">
            Initialize learning sequence. Construct robust mental models through advanced holographic tutoring.
          </p>

          {/* HUD Styled CTA */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="group relative inline-flex items-center gap-6 px-12 py-6 bg-[#04111d] text-cyan-300 font-black text-xl uppercase tracking-widest overflow-hidden border border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:bg-[#082236]"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            {/* Glowing Corner Accents */}
            <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
            <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
            
            {/* Scanning Line */}
            <div className="absolute inset-0 w-full h-[2px] bg-cyan-400/50 group-hover:animate-scanline blur-[1px]" />
            
            <Play className="w-6 h-6 fill-cyan-400 group-hover:scale-125 transition-transform" />
            Generate Core Lesson
          </motion.button>
        </div>
      </motion.section>

      {/* ─── HUD ENVIRONMENTS (BREAKING THE GRID) ─────────────────────────────── */}
      <section className="relative z-20 px-6 md:px-12 max-w-[1800px] mx-auto pb-60 pt-20">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
          
          {/* AI TUTOR: PURPLE UNIVERSE (Curved Panel) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="md:col-span-12 relative h-[500px] cursor-pointer group flex items-center p-12 overflow-hidden"
            style={{ 
              borderRadius: '100px 0 100px 0',
              background: 'linear-gradient(135deg, rgba(20,5,40,0.9) 0%, rgba(5,2,10,0.9) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: 'inset 0 0 100px rgba(139,92,246,0.1), 0 20px 50px rgba(0,0,0,0.5)'
            }}
          >
            {/* Floating Purple Nebula */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(139,92,246,0.15),transparent_50%)] group-hover:scale-110 transition-transform duration-[3s]" />
            
            {/* Animated Nodes (SVG) */}
            <div className="absolute right-0 w-1/2 h-full opacity-40 group-hover:opacity-80 transition-opacity duration-1000">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle cx="20" cy="30" r="2" fill="#C084FC" className="animate-pulse" />
                <circle cx="80" cy="20" r="1.5" fill="#C084FC" className="animate-pulse" style={{ animationDelay: '1s' }} />
                <circle cx="60" cy="80" r="2.5" fill="#C084FC" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
                <circle cx="30" cy="70" r="1" fill="#C084FC" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
                <path d="M20 30 Q 50 10 80 20 T 60 80 T 30 70 Z" fill="none" stroke="rgba(192,132,252,0.2)" strokeWidth="0.5" />
                <path d="M20 30 L 60 80 M 80 20 L 30 70" fill="none" stroke="rgba(192,132,252,0.2)" strokeWidth="0.5" strokeDasharray="2 2" className="animate-[dash_20s_linear_infinite]" />
              </svg>
            </div>

            <div className="relative z-10 w-full max-w-2xl">
              <div className="w-16 h-16 bg-[#1a0b2e] border border-purple-500/30 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(139,92,246,0.4)]" style={{ transform: 'rotate(45deg)' }}>
                <Brain className="w-8 h-8 text-purple-400" style={{ transform: 'rotate(-45deg)' }} />
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">AI ORACLE</h2>
              <p className="text-xl text-purple-200/60 font-medium tracking-wide max-w-xl">
                Advanced neural generation protocol. Synthesizing personalized learning architectures in real-time.
              </p>
            </div>
          </motion.div>

          {/* COMPILER: GREEN DIGITAL LAB (Trapezoid HUD) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            onClick={() => navigate('/compiler-lab')}
            className="md:col-span-7 relative h-[450px] cursor-pointer group p-10 overflow-hidden flex flex-col justify-end"
            style={{ 
              clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 calc(100% - 40px))',
              background: 'linear-gradient(180deg, rgba(2,20,10,0.9) 0%, rgba(1,10,5,0.9) 100%)',
              boxShadow: 'inset 0 0 50px rgba(16,185,129,0.1)'
            }}
          >
            {/* Outer Border simulation since clip-path cuts borders */}
            <div className="absolute inset-[1px] pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 calc(100% - 40px))', background: 'rgba(16,185,129,0.2)', zIndex: -1 }} />
            <div className="absolute inset-[2px] pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 40px, 100% 100%, 0 calc(100% - 40px))', background: 'linear-gradient(180deg, rgba(2,20,10,1) 0%, rgba(1,10,5,1) 100%)', zIndex: -1 }} />

            {/* Matrix Lines */}
            <div className="absolute top-0 right-10 bottom-0 w-32 flex justify-between opacity-20 group-hover:opacity-40 transition-opacity">
              <div className="w-px h-full bg-gradient-to-b from-transparent via-emerald-500 to-transparent animate-[scanline_3s_linear_infinite]" />
              <div className="w-px h-full bg-gradient-to-b from-transparent via-emerald-500 to-transparent animate-[scanline_4s_linear_infinite_reverse]" />
              <div className="w-px h-full bg-gradient-to-b from-transparent via-emerald-500 to-transparent animate-[scanline_2.5s_linear_infinite]" />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 mb-6">
                <Code2 className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Compiler Matrix</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 text-shadow-[0_0_20px_rgba(16,185,129,0.5)]">EXECUTION CORE</h2>
              <p className="text-emerald-200/50 font-medium max-w-sm tracking-wide">Secure isolated runtime environment. Compile and deploy code nodes instantly.</p>
            </div>
          </motion.div>

          {/* DOC TUTOR: BLUE HOLOGRAPHIC (Layered sheets) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            onClick={() => navigate('/document-tutor')}
            className="md:col-span-5 relative h-[450px] cursor-pointer group p-10 overflow-hidden flex flex-col justify-start"
            style={{ 
              clipPath: 'polygon(0 40px, 100% 0, 100% calc(100% - 40px), 0 100%)',
              background: 'linear-gradient(180deg, rgba(5,15,35,0.9) 0%, rgba(2,5,15,0.9) 100%)',
            }}
          >
            {/* Outer Border simulation */}
            <div className="absolute inset-[1px] pointer-events-none" style={{ clipPath: 'polygon(0 40px, 100% 0, 100% calc(100% - 40px), 0 100%)', background: 'rgba(59,130,246,0.2)', zIndex: -1 }} />
            <div className="absolute inset-[2px] pointer-events-none" style={{ clipPath: 'polygon(0 40px, 100% 0, 100% calc(100% - 40px), 0 100%)', background: 'linear-gradient(180deg, rgba(5,15,35,1) 0%, rgba(2,5,15,1) 100%)', zIndex: -1 }} />

            {/* Holographic Sheets */}
            <div className="absolute bottom-10 right-10 w-40 h-40">
              <div className="absolute inset-0 border border-blue-500/30 bg-blue-500/5 rotate-6 group-hover:rotate-12 transition-transform duration-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" />
              <div className="absolute inset-0 border border-blue-500/30 bg-blue-500/10 -rotate-3 group-hover:-rotate-6 transition-transform duration-500 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-12 h-12 text-blue-400 opacity-50" />
              </div>
            </div>

            <div className="relative z-10 mt-16">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4 text-shadow-[0_0_20px_rgba(59,130,246,0.5)]">DATA INGEST</h2>
              <p className="text-blue-200/50 font-medium max-w-[200px] tracking-wide">Extract telemetry and logic directly from raw documentation.</p>
            </div>
          </motion.div>

          {/* HEXAGONAL ROW (Bookmarks & Notes) */}
          <div className="md:col-span-12 flex flex-col md:flex-row gap-8 justify-center items-center py-10">
            
            {/* Bookmarks (Rose Ribbons) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              onClick={() => navigate('/bookmarks')}
              className="relative w-[300px] h-[350px] cursor-pointer group flex flex-col items-center justify-center text-center p-8"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: 'rgba(20,5,10,0.8)',
                boxShadow: 'inset 0 0 50px rgba(244,63,94,0.1)'
              }}
            >
              <div className="absolute inset-[1px] pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'rgba(244,63,94,0.3)', zIndex: -1 }} />
              <div className="absolute inset-[2px] pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'rgba(20,5,10,1)', zIndex: -1 }} />
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.2),transparent_60%)] group-hover:scale-125 transition-transform duration-700" />
              
              <Bookmark className="w-10 h-10 text-rose-500 mb-6 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
              <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-2">Memory</h3>
              <p className="text-xs text-rose-200/50 uppercase tracking-widest font-bold">Saved Vectors</p>
            </motion.div>

            {/* Intersecting graphic */}
            <div className="hidden md:flex flex-col items-center gap-2 opacity-30">
              <div className="w-16 h-px bg-white" />
              <Network className="w-6 h-6 text-white" />
              <div className="w-16 h-px bg-white" />
            </div>

            {/* Notes (Amber Core) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.1 }}
              onClick={() => navigate('/notes')}
              className="relative w-[300px] h-[350px] cursor-pointer group flex flex-col items-center justify-center text-center p-8"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: 'rgba(20,15,5,0.8)',
                boxShadow: 'inset 0 0 50px rgba(245,158,11,0.1)'
              }}
            >
              <div className="absolute inset-[1px] pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'rgba(245,158,11,0.3)', zIndex: -1 }} />
              <div className="absolute inset-[2px] pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'rgba(20,15,5,1)', zIndex: -1 }} />
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.15),transparent_60%)] group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
              
              <Edit3 className="w-10 h-10 text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
              <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-2">Logs</h3>
              <p className="text-xs text-amber-200/50 uppercase tracking-widest font-bold">Local Storage</p>
            </motion.div>
          </div>

          {/* HISTORY: CYAN TIMELINE (Glass Tunnel) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            onClick={() => navigate('/history')}
            className="md:col-span-12 relative h-[300px] cursor-pointer group flex items-center justify-center overflow-hidden"
            style={{ 
              borderRadius: '200px',
              background: 'linear-gradient(90deg, rgba(1,10,15,0.9) 0%, rgba(5,20,30,0.9) 50%, rgba(1,10,15,0.9) 100%)',
              borderTop: '1px solid rgba(6,182,212,0.3)',
              borderBottom: '1px solid rgba(6,182,212,0.3)',
            }}
          >
            {/* Orbital Rings */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity duration-1000">
              <div className="w-[1000px] h-[300px] border border-cyan-500/50 rounded-[100%] animate-[spin_20s_linear_infinite]" style={{ transform: 'rotateX(75deg)' }} />
              <div className="absolute w-[800px] h-[200px] border border-cyan-500/30 rounded-[100%] animate-[spin_15s_linear_infinite_reverse]" style={{ transform: 'rotateX(75deg)' }} />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <Clock className="w-12 h-12 text-cyan-400 mb-4 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)] group-hover:scale-125 transition-transform duration-500" />
              <h2 className="text-4xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Archive</h2>
            </div>
          </motion.div>

        </div>
      </section>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  )
}
