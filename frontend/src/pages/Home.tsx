import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { InteractiveKnowledgeGraph } from '@/components/ui/InteractiveKnowledgeGraph'
import { Brain, Code2, FileText, Bookmark, Edit3, Clock, Sparkles, Play, Cpu, Network } from 'lucide-react'
import { useRef } from 'react'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none relative bg-slate-950 text-white">
      
      {/* ─── GLOBAL BACKGROUND ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        {/* Soft Ambient Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
        
        {/* Clean subtle dot pattern instead of distracting grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px]" />
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
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-400 mb-8 shadow-sm">
            <Sparkles className="w-4 h-4" />
            AI-Powered Learning Platform
          </div>
          
          <h1 className="text-5xl md:text-[5.5rem] font-bold tracking-tight leading-[1.1] mb-6 text-slate-50">
            Learn Engineering <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Smarter.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-10">
            Your complete engineering learning workspace. Generate personalized lessons, visualize complex concepts, and study faster.
          </p>

          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/learn', { state: { openGenerate: true } })}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 font-bold text-lg rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
          >
            <Play className="w-5 h-5 fill-slate-950" />
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
            className="md:col-span-12 relative cursor-pointer group flex flex-col md:flex-row items-center p-8 md:p-12 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-colors shadow-lg hover:shadow-purple-900/20"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10 w-full md:w-1/2 pr-8">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Brain className="w-7 h-7" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">AI Tutor</h2>
              <p className="text-lg text-slate-300 font-medium leading-relaxed">
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
            className="md:col-span-7 relative cursor-pointer group p-8 md:p-10 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-colors shadow-lg hover:shadow-emerald-900/20 flex flex-col justify-between min-h-[360px]"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <Code2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Compiler Lab</h2>
              <p className="text-slate-300 font-medium text-lg max-w-sm leading-relaxed">
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
            className="md:col-span-5 relative cursor-pointer group p-8 md:p-10 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-colors shadow-lg hover:shadow-cyan-900/20 flex flex-col justify-between min-h-[360px]"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Document Tutor</h2>
              <p className="text-slate-300 font-medium text-lg leading-relaxed">
                Extract knowledge directly from PDFs and research papers.
              </p>
            </div>
          </motion.div>

          {/* BOOKMARKS */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => navigate('/bookmarks')}
            className="md:col-span-4 relative cursor-pointer group p-8 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-colors shadow-lg hover:shadow-rose-900/20 text-center flex flex-col items-center justify-center min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Bookmarks</h3>
            <p className="text-sm text-slate-400 font-medium">Saved derivations & resources</p>
          </motion.div>

          {/* NOTES */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => navigate('/notes')}
            className="md:col-span-4 relative cursor-pointer group p-8 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors shadow-lg hover:shadow-amber-900/20 text-center flex flex-col items-center justify-center min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Edit3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Notes</h3>
            <p className="text-sm text-slate-400 font-medium">Your personal workspace</p>
          </motion.div>

          {/* HISTORY */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.5, delay: 0.5 }}
            onClick={() => navigate('/history')}
            className="md:col-span-4 relative cursor-pointer group p-8 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-colors shadow-lg hover:shadow-indigo-900/20 text-center flex flex-col items-center justify-center min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">History</h3>
            <p className="text-sm text-slate-400 font-medium">Review past sessions</p>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
