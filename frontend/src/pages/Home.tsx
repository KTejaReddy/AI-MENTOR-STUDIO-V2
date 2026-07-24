import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { InteractiveKnowledgeGraph } from '@/components/ui/InteractiveKnowledgeGraph'
import { Brain, Code2, FileText, Bookmark, Edit3, Clock, Sparkles, ArrowRight, Play, Cpu } from 'lucide-react'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none relative bg-[#030303] text-white">
      
      {/* ─── GLOBAL NOISE ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />

      {/* ─── PREMIUM HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-32 px-6 overflow-hidden">
        
        {/* Background Visual Centerpiece */}
        <div className="absolute inset-0 flex items-center justify-center opacity-60">
          <InteractiveKnowledgeGraph />
        </div>
        
        {/* Ambient Hero Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-[#8B5CF6]/10 to-transparent blur-[120px] rounded-full pointer-events-none" />

        {/* Foreground Content */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 text-center max-w-5xl mx-auto flex flex-col items-center justify-center"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs font-bold tracking-widest uppercase text-white/70 mb-10 shadow-2xl"
          >
            <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
            The Next Generation Learning Engine
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-black tracking-tighter leading-[1.05] mb-8 drop-shadow-2xl">
            Learn Anything.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/50">
              Visually.
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-white/50 max-w-2xl font-medium leading-relaxed mb-16">
            An intelligent workspace that transforms complex topics into interactive, personalized learning experiences.
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-full bg-white text-black font-bold text-lg overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <Play className="w-5 h-5 fill-current" />
            Generate New Lesson
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </motion.div>
      </section>

      {/* ─── FEATURE MAGAZINE GRID ────────────────────────────────────────────── */}
      <section className="relative z-20 px-6 md:px-12 max-w-[1600px] mx-auto pb-40">
        
        {/* Row 1: Split Layout (AI Tutor & Compiler) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-6 md:mb-8">
          
          {/* AI Tutor (Purple) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="lg:col-span-8 group relative overflow-hidden rounded-[2.5rem] bg-[#0c0514] border border-[#8B5CF6]/10 cursor-pointer min-h-[400px] flex flex-col justify-end p-10 md:p-14"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Neural Graphics */}
            <div className="absolute top-0 right-0 w-full h-full opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full border border-[#8B5CF6]/20 group-hover:scale-110 transition-transform duration-[2s] ease-out" />
              <div className="absolute -top-10 -right-10 w-[300px] h-[300px] rounded-full border border-[#8B5CF6]/30 group-hover:scale-110 transition-transform duration-[1.5s] ease-out delay-75" />
              <div className="absolute top-10 right-10 w-[150px] h-[150px] rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/5 group-hover:scale-110 transition-transform duration-1000 ease-out delay-150 backdrop-blur-3xl" />
              <Cpu className="absolute top-[85px] right-[85px] w-12 h-12 text-[#8B5CF6]/40 group-hover:text-[#8B5CF6]/80 transition-colors duration-700" />
            </div>

            <div className="relative z-10 w-full max-w-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-shadow">
                <Brain className="w-7 h-7 text-[#8B5CF6]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 group-hover:text-[#8B5CF6] transition-colors duration-500">The AI Tutor</h2>
              <p className="text-lg text-white/50 font-medium">Dynamically generates lessons, visualizations, and interactive quizzes tailored to your exact learning requirements.</p>
            </div>
          </motion.div>

          {/* Compiler Lab (Emerald) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate('/compiler-lab')}
            className="lg:col-span-4 group relative overflow-hidden rounded-[2.5rem] bg-[#021008] border border-[#10B981]/10 cursor-pointer min-h-[400px] flex flex-col justify-end p-10"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#10B981]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Code Graphic */}
            <div className="absolute top-10 right-10 flex flex-col gap-2 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
              <div className="w-32 h-2 bg-[#10B981] rounded-full" />
              <div className="w-24 h-2 bg-[#10B981] rounded-full ml-4" />
              <div className="w-40 h-2 bg-[#10B981] rounded-full ml-8" />
              <div className="w-20 h-2 bg-[#10B981] rounded-full ml-4" />
            </div>

            <div className="relative z-10 w-full">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-shadow">
                <Code2 className="w-6 h-6 text-[#10B981]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 group-hover:text-[#10B981] transition-colors duration-500">Compiler Lab</h2>
              <p className="text-sm text-white/50 font-medium">Write, test, and debug code instantly in a robust environment.</p>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Three Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Document Tutor (Blue) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate('/document-tutor')}
            className="group relative overflow-hidden rounded-[2.5rem] bg-[#020b17] border border-[#3B82F6]/10 cursor-pointer min-h-[320px] flex flex-col justify-between p-10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#3B82F6]/10 to-transparent rounded-bl-full" />
            
            <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center relative z-10">
              <FileText className="w-6 h-6 text-[#3B82F6]" />
            </div>
            <div className="relative z-10 mt-12">
              <h2 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-[#3B82F6] transition-colors">Doc Tutor</h2>
              <p className="text-sm text-white/50 font-medium">Extract knowledge directly from PDFs and research papers.</p>
            </div>
          </motion.div>

          {/* Bookmarks (Rose) & Notes (Amber) Split vertically */}
          <div className="grid grid-rows-2 gap-6 md:gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate('/bookmarks')}
              className="group relative overflow-hidden rounded-3xl bg-[#140306] border border-[#F43F5E]/10 cursor-pointer h-full flex flex-col justify-center p-8"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#F43F5E]/5 to-transparent" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/10 flex items-center justify-center shrink-0">
                  <Bookmark className="w-5 h-5 text-[#F43F5E]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#F43F5E] transition-colors">Bookmarks</h3>
                  <p className="text-xs text-white/50 mt-1">Saved formulas & derivations.</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate('/notes')}
              className="group relative overflow-hidden rounded-3xl bg-[#140a00] border border-[#F59E0B]/10 cursor-pointer h-full flex flex-col justify-center p-8"
            >
              <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-evenly py-4 opacity-10">
                {[...Array(6)].map((_, i) => <div key={i} className="w-3 h-3 rounded-full bg-[#F59E0B]" />)}
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#F59E0B] transition-colors">Notebook</h3>
                  <p className="text-xs text-white/50 mt-1">Your personal workspace.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* History (Cyan) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate('/history')}
            className="group relative overflow-hidden rounded-[2.5rem] bg-[#011014] border border-[#06B6D4]/10 cursor-pointer min-h-[320px] flex flex-col p-10"
          >
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 opacity-20">
              <div className="w-3 h-3 rounded-full border-2 border-[#06B6D4]" />
              <div className="w-0.5 h-16 bg-[#06B6D4]/30" />
              <div className="w-3 h-3 rounded-full border-2 border-[#06B6D4]" />
              <div className="w-0.5 h-16 bg-[#06B6D4]/30" />
              <div className="w-3 h-3 rounded-full bg-[#06B6D4]" />
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center relative z-10 mb-auto">
              <Clock className="w-6 h-6 text-[#06B6D4]" />
            </div>
            <div className="relative z-10 mt-12">
              <h2 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-[#06B6D4] transition-colors">History</h2>
              <p className="text-sm text-white/50 font-medium max-w-[200px]">Review your complete learning journey over time.</p>
            </div>
          </motion.div>
        </div>

      </section>
    </div>
  )
}
