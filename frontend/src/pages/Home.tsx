import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { InteractiveKnowledgeGraph } from '@/components/ui/InteractiveKnowledgeGraph'
import { Brain, Code2, FileText, Edit3, Clock, Sparkles, Play } from 'lucide-react'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none relative bg-[#020617] text-white">
      
      {/* ─── GLOBAL BACKGROUND ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        {/* Layer 1 is the bg-[#020617] above */}
        
        {/* Layer 2: Large blurred radial gradients with slow movement */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.25)_0%,rgba(0,0,0,0)_70%)] blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.25)_0%,rgba(0,0,0,0)_70%)] blur-[120px]" 
        />
        
        {/* Layer 3: Subtle engineering grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
        
        {/* Layer 4 & 5: Subtle noise overlay for texture */}
        <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />
      </div>

      {/* ─── HERO SECTION ─────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative min-h-[55vh] flex flex-col items-center justify-center pt-24 pb-16 px-6 z-10"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-40 scale-125 pointer-events-none mix-blend-screen">
          <InteractiveKnowledgeGraph />
        </div>
        
        <div className="relative z-20 text-center max-w-4xl mx-auto flex flex-col items-center justify-center mt-12">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-[#CBD5E1] mb-8 shadow-sm backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI-Powered Learning Platform
          </div>
          
          <h1 className="text-5xl md:text-[5.5rem] font-extrabold tracking-tight leading-[1.1] mb-6 text-[#F8FAFC]">
            Learn Engineering <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Smarter.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#CBD5E1] max-w-2xl font-medium leading-relaxed mb-10">
            Your complete engineering learning workspace. Generate personalized lessons, visualize complex concepts, and study faster.
          </p>

          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-[#F8FAFC] text-[#020617] font-bold text-lg rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.35)]"
          >
            <Play className="w-5 h-5 fill-[#020617]" />
            Generate New Lesson
          </motion.button>
        </div>
      </motion.section>

      {/* ─── FEATURE GRID ─────────────────────────────── */}
      <section className="relative z-20 px-6 md:px-12 max-w-[1400px] mx-auto pb-40 pt-10">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          
          {/* AI TUTOR */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5 }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="md:col-span-12 relative cursor-pointer group flex flex-col md:flex-row items-center p-8 md:p-12 overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-[0_8px_40px_-12px_rgba(99,102,241,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.15),transparent_50%)]" />
            
            <div className="relative z-10 w-full md:w-1/2 pr-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Brain className="w-7 h-7" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#F8FAFC] mb-4 tracking-tight">AI Tutor</h2>
              <p className="text-lg text-[#CBD5E1] font-medium leading-relaxed">
                Generate personalized lessons and interactive quizzes tailored to your exact learning requirements.
              </p>
            </div>
          </motion.div>

          {/* COMPILER LAB */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onClick={() => navigate('/compiler-lab')}
            className="md:col-span-7 relative cursor-pointer group p-8 md:p-10 overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col justify-between min-h-[260px] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_8px_40px_-12px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.15),transparent_50%)]" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Code2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#F8FAFC] mb-3 tracking-tight">Compiler Lab</h2>
              <p className="text-[#CBD5E1] font-medium text-lg max-w-sm leading-relaxed">
                Write, test, and debug code instantly in a robust environment.
              </p>
            </div>
          </motion.div>

          {/* DOC TUTOR */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => navigate('/document-tutor')}
            className="md:col-span-5 relative cursor-pointer group p-8 md:p-10 overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col justify-between min-h-[260px] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_8px_40px_-12px_rgba(6,182,212,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.15),transparent_50%)]" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.15),transparent_50%)]" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#F8FAFC] mb-3 tracking-tight">Document Tutor</h2>
              <p className="text-[#CBD5E1] font-medium text-lg leading-relaxed">
                Extract knowledge directly from PDFs and research papers.
              </p>
            </div>
          </motion.div>

          {/* NOTES */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => navigate('/notes')}
            className="md:col-span-6 relative cursor-pointer group p-8 overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-center flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_8px_40px_-12px_rgba(244,63,94,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.1),transparent_70%)]" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/20 group-hover:text-rose-300 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Edit3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Notes</h3>
              <p className="text-sm text-[#94A3B8] group-hover:text-[#CBD5E1] transition-colors font-medium">Your personal workspace</p>
            </div>
          </motion.div>

          {/* HISTORY */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => navigate('/history')}
            className="md:col-span-6 relative cursor-pointer group p-8 overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-center flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-[0_8px_40px_-12px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.1),transparent_70%)]" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">History</h3>
              <p className="text-sm text-[#94A3B8] group-hover:text-[#CBD5E1] transition-colors font-medium">Review past sessions</p>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
