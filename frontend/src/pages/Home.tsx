import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Brain, Code2, BookOpen, Edit3, Clock, Play, Terminal, Layers, ArrowRight, ChevronRight, Activity, Globe, Database, Cpu, Network, Book } from 'lucide-react'

// --- SVGs for Features ---
const NeuralNetwork = () => (
  <svg viewBox="0 0 800 800" className="w-full h-full text-indigo-500/20 pointer-events-none" fill="none" stroke="currentColor">
    <motion.path 
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
      d="M400,100 C500,200 600,400 700,500 C600,600 500,700 400,700 C300,700 200,600 100,500 C200,400 300,200 400,100 Z" 
      strokeWidth="2" 
    />
    <circle cx="400" cy="100" r="10" fill="#818CF8" />
    <circle cx="700" cy="500" r="15" fill="#6366F1" />
    <circle cx="400" cy="700" r="20" fill="#4F46E5" />
    <circle cx="100" cy="500" r="10" fill="#818CF8" />
    <line x1="400" y1="100" x2="400" y2="700" strokeWidth="1" strokeDasharray="4 4" />
    <line x1="100" y1="500" x2="700" y2="500" strokeWidth="1" strokeDasharray="4 4" />
  </svg>
)

const FloatingTerminal = () => (
  <motion.div 
    animate={{ y: [-5, 5, -5] }}
    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    className="w-full h-full rounded-2xl bg-[#022C22]/80 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden relative"
    style={{ transform: "perspective(1000px) rotateY(10deg) rotateX(5deg)" }}
  >
    <div className="h-8 bg-black/40 border-b border-emerald-500/20 flex items-center px-4 gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
    </div>
    <div className="p-4 md:p-6 font-mono text-emerald-400/80 text-xs md:text-sm leading-loose">
      <p><span className="text-emerald-300">fn</span> <span className="text-blue-300">compile</span>() {'{'}</p>
      <p className="pl-4 text-emerald-500/60">// Compiling OS kernel</p>
      <p className="pl-4">let mut sys = OS::new();</p>
      <p className="pl-4 mt-2">sys.boot();</p>
      <p>{'}'}</p>
    </div>
  </motion.div>
)

const StaggeredDocuments = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <motion.div 
      animate={{ y: [-10, 10, -10], rotateZ: [-5, -2, -5] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute w-[80%] h-[120%] bg-[#083344]/60 backdrop-blur-md border border-cyan-500/20 rounded-xl p-6 opacity-50"
    />
    <motion.div 
      animate={{ y: [-5, 5, -5], rotateZ: [-1, 1, -1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute w-[80%] h-[120%] bg-[#020617]/90 backdrop-blur-xl border-2 border-cyan-400/40 rounded-xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.2)] ml-8 mt-8"
    >
      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
        <BookOpen className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="w-3/4 h-4 bg-cyan-400/40 rounded mb-4" />
      <div className="space-y-2">
        <div className="w-full h-2 bg-cyan-400/20 rounded" />
        <div className="w-4/5 h-2 bg-cyan-400/20 rounded" />
        <div className="w-full h-2 bg-cyan-400/20 rounded" />
      </div>
    </motion.div>
  </div>
)

const OrganicNotes = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.2),transparent_70%)] blur-xl" />
    <motion.div 
      animate={{ y: [-5, 5, -5], rotateZ: [-10, -5, -10] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      className="absolute w-24 h-24 bg-[#451A03] border border-amber-500/40 rounded-lg shadow-xl p-3 flex flex-col gap-1.5 -ml-16 -mt-10"
    >
      <div className="w-full h-1.5 bg-amber-500/30 rounded" />
      <div className="w-5/6 h-1.5 bg-amber-500/30 rounded" />
      <div className="w-full h-1.5 bg-amber-500/30 rounded" />
    </motion.div>
    <motion.div 
      animate={{ y: [5, -5, 5], rotateZ: [5, 10, 5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute w-28 h-28 bg-[#78350F] border border-amber-400/50 rounded-lg shadow-xl p-4 flex flex-col gap-2 ml-10 mt-10"
    >
      <div className="w-full h-2 bg-amber-400/40 rounded" />
      <div className="w-3/4 h-2 bg-amber-400/40 rounded" />
      <div className="w-1/2 h-2 bg-amber-400/40 rounded" />
    </motion.div>
  </div>
)

// --- Shared Magazine Thumbnail ---
function MagazineThumbnail({ title, category, colorClass, gradientClass, heightClass = 'h-[250px]' }: { title: string, category: string, colorClass: string, gradientClass: string, heightClass?: string }) {
  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden group cursor-pointer`}>
      <div className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${gradientClass}`} />
      <div className="absolute inset-0 bg-[#02040A]/60 group-hover:bg-[#02040A]/40 transition-colors duration-500" />
      <div className="absolute inset-0 border border-white/5 group-hover:border-white/20 transition-colors duration-500 rounded-2xl z-10" />
      
      <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${colorClass}`}>{category}</div>
        <h3 className="text-xl font-bold text-white leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/50 transition-all">{title}</h3>
      </div>
    </div>
  )
}

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="bg-[#02040A] text-white overflow-x-hidden relative font-sans selection:bg-indigo-500/30">
      
      {/* GLOBAL AMBIENT NOISE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-noise opacity-[0.25] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-32">
        
        {/* ─── SECTION 1: AI TUTOR HERO (45-55vh) ─── */}
        <section className="relative w-full min-h-[50vh] flex items-center pt-24 pb-16">
          <div className="absolute top-0 right-[-10%] w-[60%] h-[120%] pointer-events-none z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-[80px]" />
            <NeuralNetwork />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 font-bold tracking-widest text-[10px] uppercase mb-8 backdrop-blur-md">
              <Brain className="w-3 h-3" />
              AI Tutor Environment
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-6 text-[#F8FAFC]">
              Learn <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
                Smarter.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#94A3B8] font-medium leading-relaxed max-w-lg mb-8">
              Generate incredibly detailed, personalized learning journeys instantly.
            </p>

            <button 
              onClick={() => navigate('/learn', { state: { openGenerate: true } })}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-extrabold text-sm md:text-base rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all hover:scale-105 duration-300"
            >
              <Play className="w-4 h-4 fill-black" />
              Initialize Lesson
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        </section>

        {/* ─── SECTION 2: FEATURE EXPERIENCES (Modules) ─── */}
        <section className="py-16 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 relative z-20">
          
          {/* Compiler Module */}
          <div className="col-span-1 md:col-span-8 flex flex-col md:flex-row items-center gap-8 relative p-8 md:p-12 rounded-[2rem] bg-gradient-to-br from-emerald-950/20 to-transparent border border-emerald-900/30 overflow-hidden group">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(16,185,129,0.1)_0%,transparent_70%)] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-50" />
            <div className="flex-1 w-full relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#064E3B] border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Terminal className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-[#F8FAFC] mb-4 tracking-tight">Compiler Lab</h2>
              <p className="text-[#94A3B8] font-medium leading-relaxed mb-6">Write, debug, and test code instantly with embedded AI assistance.</p>
              <button onClick={() => navigate('/compiler-lab')} className="text-emerald-400 font-bold flex items-center gap-2 hover:text-emerald-300 transition-colors">
                Open Terminal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 w-full h-[200px] relative z-10 max-md:hidden">
              <FloatingTerminal />
            </div>
          </div>

          {/* Doc Tutor Module */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-6 relative p-8 md:p-10 rounded-[2rem] bg-gradient-to-br from-cyan-950/20 to-transparent border border-cyan-900/30 overflow-hidden group">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.1)_0%,transparent_70%)] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-50" />
             <div className="w-12 h-12 rounded-2xl bg-[#083344] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] relative z-10">
                <BookOpen className="w-6 h-6" />
             </div>
             <div className="relative z-10">
               <h2 className="text-2xl font-black text-[#F8FAFC] mb-3 tracking-tight">Doc Tutor</h2>
               <p className="text-sm text-[#94A3B8] font-medium leading-relaxed mb-6">Extract deep insights from PDFs instantly.</p>
               <button onClick={() => navigate('/document-tutor')} className="text-cyan-400 font-bold text-sm flex items-center gap-2 hover:text-cyan-300 transition-colors">
                 Analyze Docs <ArrowRight className="w-4 h-4" />
               </button>
             </div>
             <div className="absolute right-[-20%] bottom-[-10%] w-[200px] h-[200px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-700">
               <StaggeredDocuments />
             </div>
          </div>

          {/* Notes Module */}
          <div className="col-span-1 md:col-span-4 flex flex-col items-center text-center relative p-8 md:p-10 rounded-[2rem] border border-amber-900/30 overflow-hidden group">
            <div className="absolute inset-0 pointer-events-none z-0">
               <OrganicNotes />
            </div>
            <div className="relative z-10 flex flex-col items-center mt-auto pt-24">
              <div className="w-12 h-12 rounded-2xl bg-[#451A03] border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                <Edit3 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-[#F8FAFC] mb-2 tracking-tight">Notes</h2>
              <button onClick={() => navigate('/notes')} className="text-amber-400 font-bold text-sm flex items-center gap-2 hover:text-amber-300 transition-colors mt-2">
                Open Pad <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* History Module */}
          <div className="col-span-1 md:col-span-8 flex flex-col justify-center relative p-8 md:p-12 rounded-[2rem] bg-gradient-to-tl from-rose-950/20 to-transparent border border-rose-900/30 overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(244,63,94,0.1)_0%,transparent_70%)] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-50" />
            <div className="relative z-10 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#4C0519] border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-[#F8FAFC] mb-4 tracking-tight">Timeline</h2>
              <p className="text-[#94A3B8] font-medium leading-relaxed mb-6">Revisit your entire engineering journey and review past lessons.</p>
              <button onClick={() => navigate('/history')} className="text-rose-400 font-bold flex items-center gap-2 hover:text-rose-300 transition-colors">
                View History <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {/* Winding path abstract */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-700">
               <svg viewBox="0 0 200 400" className="w-full h-full text-rose-500/50" fill="none" stroke="currentColor">
                 <path d="M200,50 C100,100 50,200 150,300 C200,350 100,400 50,350" strokeWidth="2" strokeDasharray="6 6" />
                 <circle cx="150" cy="300" r="8" fill="#4C0519" stroke="#F43F5E" strokeWidth="2" />
                 <circle cx="100" cy="115" r="5" fill="#4C0519" stroke="#F43F5E" strokeWidth="2" />
               </svg>
            </div>
          </div>

        </section>

        {/* ─── SECTION 3: CONTINUE LEARNING ─── */}
        <section className="py-16 relative z-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-white">Continue Learning</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          
          <div className="w-full relative rounded-[2rem] bg-[#060814]/80 backdrop-blur-md border border-white/10 p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="flex-1 relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Active Lesson</div>
              <h3 className="text-3xl font-bold text-white mb-4">Advanced Distributed Systems</h3>
              <p className="text-[#94A3B8] text-sm md:text-base leading-relaxed mb-8 max-w-md">
                You were studying the CAP Theorem and Paxos consensus algorithms. Ready to dive back into the derivation?
              </p>
              
              {/* Progress Timeline */}
              <div className="flex items-center gap-3 w-full max-w-md mb-8">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 rounded-full w-[60%] shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400">60%</span>
              </div>

              <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 text-sm">
                Resume Lesson <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="shrink-0 w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-indigo-500/20 flex items-center justify-center relative shadow-[0_0_50px_rgba(99,102,241,0.15)] z-10 bg-[#02040A]">
               <Activity className="w-12 h-12 md:w-16 md:h-16 text-indigo-400" />
               {/* Orbit rings */}
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-10px] border border-indigo-500/30 rounded-full border-dashed" />
               <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute inset-[-20px] border border-indigo-500/10 rounded-full" />
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: RECENT LESSONS (Magazine) ─── */}
        <section className="py-16 relative z-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl font-black text-white">Recent Lessons</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            <button className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest hover:text-white transition-colors">View All</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="col-span-1 md:col-span-7">
               <MagazineThumbnail 
                 title="Understanding Quantum Entanglement in Computing" 
                 category="Quantum Physics" 
                 colorClass="text-fuchsia-400" 
                 gradientClass="bg-gradient-to-br from-fuchsia-900 to-transparent"
                 heightClass="h-[350px]"
               />
            </div>
            <div className="col-span-1 md:col-span-5 flex flex-col gap-6">
               <MagazineThumbnail 
                 title="Implementing Paxos in Rust" 
                 category="Computer Science" 
                 colorClass="text-emerald-400" 
                 gradientClass="bg-gradient-to-br from-emerald-900 to-transparent"
                 heightClass="h-[163px]"
               />
               <MagazineThumbnail 
                 title="Navier-Stokes Equations Simplified" 
                 category="Fluid Dynamics" 
                 colorClass="text-cyan-400" 
                 gradientClass="bg-gradient-to-br from-cyan-900 to-transparent"
                 heightClass="h-[163px]"
               />
            </div>
            <div className="col-span-1 md:col-span-4">
               <MagazineThumbnail 
                 title="Thermodynamics Laws" 
                 category="Physics" 
                 colorClass="text-orange-400" 
                 gradientClass="bg-gradient-to-br from-orange-900 to-transparent"
                 heightClass="h-[250px]"
               />
            </div>
            <div className="col-span-1 md:col-span-4">
               <MagazineThumbnail 
                 title="Graph Theory Algorithms" 
                 category="Mathematics" 
                 colorClass="text-blue-400" 
                 gradientClass="bg-gradient-to-br from-blue-900 to-transparent"
                 heightClass="h-[250px]"
               />
            </div>
            <div className="col-span-1 md:col-span-4">
               <MagazineThumbnail 
                 title="Transformers Architecture" 
                 category="AI / ML" 
                 colorClass="text-purple-400" 
                 gradientClass="bg-gradient-to-br from-purple-900 to-transparent"
                 heightClass="h-[250px]"
               />
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: EXPLORE SUBJECTS ─── */}
        <section className="py-16 relative z-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl font-black text-white">Explore Subjects</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Computer Science', icon: Code2, color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
              { name: 'Mathematics', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-950/40' },
              { name: 'Physics', icon: Database, color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/40' },
              { name: 'Engineering', icon: Cpu, color: 'text-amber-400', bg: 'bg-amber-950/40' },
              { name: 'AI / ML', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-950/40' },
              { name: 'Networking', icon: Network, color: 'text-cyan-400', bg: 'bg-cyan-950/40' },
              { name: 'Literature', icon: Book, color: 'text-rose-400', bg: 'bg-rose-950/40' },
              { name: 'History', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-950/40' },
            ].map((subject) => (
              <div key={subject.name} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subject.bg} border border-white/5 group-hover:scale-110 transition-transform`}>
                   <subject.icon className={`w-5 h-5 ${subject.color}`} />
                </div>
                <span className="font-bold text-sm text-[#F8FAFC] group-hover:text-white transition-colors">{subject.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTION 6: ABOUT FOOTER ─── */}
        <footer className="mt-20 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-[#94A3B8] text-sm">
          <div className="flex items-center gap-2">
             <Layers className="w-5 h-5 text-indigo-400" />
             <span className="font-bold text-white tracking-wide">Mentor AI Studio</span>
          </div>
          <div className="flex gap-6 font-medium">
             <span className="cursor-pointer hover:text-white transition-colors">Documentation</span>
             <span className="cursor-pointer hover:text-white transition-colors">Privacy</span>
             <span className="cursor-pointer hover:text-white transition-colors">Terms</span>
          </div>
          <div className="text-xs uppercase tracking-widest opacity-50 font-bold">
            Engineering OS v2.0
          </div>
        </footer>

      </div>
    </div>
  )
}
