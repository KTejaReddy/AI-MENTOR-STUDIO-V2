import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Code2, BookOpen, Edit3, Clock, Play, Terminal, Layers, ChevronRight, Activity, Globe, Database, Cpu, Network, Book } from 'lucide-react'

// --- INNER ARTWORK COMPONENTS ---
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
  </svg>
)

const FloatingTerminal = () => (
  <motion.div 
    animate={{ y: [-5, 5, -5] }}
    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    className="w-[90%] md:w-[400px] h-[250px] bg-[#022C22]/90 backdrop-blur-md border border-emerald-500/50 relative shadow-2xl"
    style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
  >
    <div className="h-8 bg-black/40 border-b border-emerald-500/20 flex items-center px-4 gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
    </div>
    <div className="p-6 font-mono text-emerald-400/80 text-xs md:text-sm leading-loose">
      <p><span className="text-emerald-300">fn</span> <span className="text-blue-300">compile</span>() {'{'}</p>
      <p className="pl-4 text-emerald-500/60">// Distributed compilation engine initialized</p>
      <p className="pl-4">let mut sys = OS::new();</p>
      <p className="pl-4 mt-2">sys.boot();</p>
      <p>{'}'}</p>
    </div>
  </motion.div>
)

const WindingTimeline = () => (
  <svg viewBox="0 0 800 200" className="w-full h-full pointer-events-none">
    <motion.path
      d="M0,100 C200,200 400,0 600,100 C700,150 750,50 800,100"
      fill="none"
      stroke="rgba(244, 63, 94, 0.3)"
      strokeWidth="4"
      strokeDasharray="10 10"
      animate={{ strokeDashoffset: [0, -200] }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
    />
    <circle cx="300" cy="150" r="12" fill="#4C0519" stroke="#F43F5E" strokeWidth="3" />
    <circle cx="600" cy="100" r="16" fill="#4C0519" stroke="#F43F5E" strokeWidth="4" />
  </svg>
)

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="bg-[#000000] text-white w-full overflow-x-hidden relative font-sans selection:bg-indigo-500/30">
      
      {/* GLOBAL AMBIENT NOISE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-noise opacity-[0.25] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-32 pt-16 flex flex-col gap-24">

        {/* ─── VARIANT A: AI TUTOR (Angled Left Edge) ─── */}
        <div className="relative w-full group cursor-pointer shadow-2xl" onClick={() => navigate('/learn', { state: { openGenerate: true } })}>
           <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] z-0" />
           
           <div 
             className="relative z-10 w-full bg-[#060814]/90 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between p-10 md:p-16 min-h-[50vh]"
             style={{ 
                clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
             }}
           >
             <div className="absolute inset-0 border-l-2 border-indigo-500/50 pointer-events-none" style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)' }} />

             <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-40">
                <NeuralNetwork />
             </div>
             
             <div className="relative z-20 max-w-2xl pl-12 md:pl-24">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold tracking-widest text-[10px] uppercase mb-8 shadow-lg">
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

               <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-extrabold text-sm md:text-base rounded-none overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                 <Play className="w-4 h-4 fill-black" />
                 Initialize Lesson
               </button>
             </div>
           </div>
        </div>

        {/* ─── FEATURE GRID ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-20">
           
           {/* ─── VARIANT B: COMPILER (Hexagonal Silhouette) ─── */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/compiler-lab')}>
              <div 
                className="absolute inset-0 bg-[#022C22]/90 backdrop-blur-md overflow-hidden flex flex-col p-10"
                style={{ clipPath: 'polygon(40px 0, calc(100% - 40px) 0, 100% 40px, 100% calc(100% - 40px), calc(100% - 40px) 100%, 40px 100%, 0 calc(100% - 40px), 0 40px)' }}
              >
                 <div className="absolute inset-0 border-2 border-emerald-500/40 pointer-events-none" />

                 <div className="absolute top-0 right-0 w-[90%] h-[70%] pointer-events-none opacity-40 flex items-start justify-end p-4">
                    <FloatingTerminal />
                 </div>
                 
                 <div className="relative z-10 max-w-sm mt-auto">
                    <div className="w-12 h-12 bg-[#064E3B] border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400"
                         style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                      <Terminal className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-2">Compiler Lab</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed">Write, debug, and test code instantly with embedded AI tracking.</p>
                 </div>
              </div>
           </div>

           {/* ─── VARIANT C: NOTES (Layered Overlapping Panels) ─── */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/notes')}>
              {/* Back layers */}
              <div className="absolute top-8 left-[-15px] w-full h-[90%] bg-[#291002] border border-amber-900/50 -rotate-3 z-0" />
              <div className="absolute top-4 left-[-5px] w-full h-[95%] bg-[#3B1703] border border-amber-700/50 -rotate-1 z-0" />
              
              {/* Main Panel */}
              <div className="absolute inset-0 bg-[#451A03]/95 backdrop-blur-md border border-amber-500/40 overflow-hidden flex flex-col p-10 z-10 shadow-2xl">
                 <div className="absolute right-[-20px] bottom-[-20px] w-[250px] h-[250px] bg-amber-600/10 border border-amber-500/30 rotate-12 pointer-events-none flex items-center justify-center">
                    <Edit3 className="w-16 h-16 text-amber-500/20" />
                 </div>

                 <div className="relative z-10 max-w-sm">
                    <div className="w-12 h-12 bg-[#78350F] border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400 rounded-none shadow-md">
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-2">Digital Pad</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed">Jot down logic, architectural diagrams, and freeform text seamlessly.</p>
                 </div>
              </div>
           </div>

           {/* ─── VARIANT D: DOC TUTOR (Folded Paper Corner) ─── */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/document-tutor')}>
              {/* Main Background with cut corner */}
              <div className="absolute inset-0 bg-[#083344]/95 backdrop-blur-md overflow-hidden flex flex-col p-10 z-10"
                   style={{ clipPath: 'polygon(0 0, calc(100% - 60px) 0, 100% 60px, 100% 100%, 0 100%)' }}>
                 <div className="absolute inset-0 border border-cyan-500/30 pointer-events-none" />

                 <div className="absolute right-0 bottom-0 w-[300px] h-[300px] pointer-events-none opacity-40">
                    <div className="absolute inset-8 bg-cyan-950/80 border border-cyan-400/50 -rotate-6 flex items-center justify-center">
                       <BookOpen className="w-12 h-12 text-cyan-500/30" />
                    </div>
                 </div>

                 <div className="relative z-10 max-w-sm mt-auto">
                    <div className="w-12 h-12 bg-[#083344] border border-cyan-500/30 flex items-center justify-center mb-6 text-cyan-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-2">Doc Tutor</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed">Extract deep insights from PDFs and instantly map them into dynamic knowledge graphs.</p>
                 </div>
              </div>
              
              {/* Physical Fold Element */}
              <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-cyan-200/20 border-b border-l border-cyan-300/40 z-20 shadow-[-5px_5px_15px_rgba(0,0,0,0.6)]"
                   style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}>
                  <div className="w-full h-full bg-gradient-to-bl from-cyan-400/10 to-transparent" />
              </div>
           </div>

           {/* ─── VARIANT E: HISTORY (Stepped Engineering Panel) ─── */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/history')}>
              <div 
                className="absolute inset-0 bg-[#4C0519]/90 backdrop-blur-md overflow-hidden flex flex-col p-10 z-10"
                style={{ clipPath: 'polygon(0 0, 60% 0, 60% 40px, 100% 40px, 100% 100%, 0 100%)' }}
              >
                 <div className="absolute inset-0 border border-rose-500/30 pointer-events-none" />

                 <div className="absolute right-0 top-[20%] w-[100%] h-[200px] pointer-events-none opacity-40">
                    <WindingTimeline />
                 </div>

                 <div className="relative z-10 max-w-sm mt-auto">
                    <div className="w-12 h-12 bg-[#881337] border-2 border-rose-500/50 flex items-center justify-center mb-6 text-rose-400 rounded-full">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-2">Timeline</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed">Revisit your entire history. Every compilation, document analyzed, and note taken, mapped chronologically.</p>
                 </div>
              </div>
           </div>

        </div>

        {/* ─── VARIANT F: CONTINUE LEARNING (Offset Asymmetric Container) ─── */}
        <section className="relative z-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-white">Continue Learning</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          
          <div 
            className="w-full relative bg-[#060814]/90 backdrop-blur-md p-10 md:p-16 flex flex-col md:flex-row gap-10 items-center shadow-xl"
            style={{ clipPath: 'polygon(0 40px, 100% 0, calc(100% - 40px) 100%, 40px 100%)' }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="flex-1 relative z-10 pl-8">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Active Lesson</div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Advanced Distributed Systems</h3>
              <p className="text-[#94A3B8] text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                You were studying the CAP Theorem and Paxos consensus algorithms. Ready to dive back into the derivation?
              </p>
              
              <div className="flex items-center gap-3 w-full max-w-md mb-8">
                <div className="flex-1 h-2 bg-white/5 rounded-none overflow-hidden border border-white/10">
                   <div className="h-full bg-indigo-500 w-[60%] shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400">60%</span>
              </div>

              <button className="px-8 py-4 bg-white text-black font-bold rounded-none hover:bg-indigo-50 transition-colors flex items-center gap-2 text-sm shadow-[4px_4px_0_rgba(99,102,241,0.5)]">
                Resume Lesson <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="shrink-0 w-40 h-40 bg-[#02040A] border border-indigo-500/40 flex items-center justify-center relative shadow-[0_0_50px_rgba(99,102,241,0.2)] z-10 rotate-3">
               <Activity className="w-16 h-16 text-indigo-400" />
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-15px] border border-indigo-500/30 border-dashed" />
            </div>
          </div>
        </section>

        {/* ─── VARIANT H: RECENT LESSONS (Floating Split Panel) ─── */}
        <section className="relative z-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl font-black text-white">Recent Lessons</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Split Panel Sidebar (Variant H) */}
            <div className="w-full md:w-1/3 bg-[#0a0a14] border border-fuchsia-500/20 p-8 flex flex-col justify-between min-h-[400px]" style={{ clipPath: 'polygon(0 0, 100% 20px, 100% calc(100% - 20px), 0 100%)' }}>
               <div>
                 <div className="text-[10px] font-bold uppercase tracking-widest mb-4 text-fuchsia-400">Featured</div>
                 <h3 className="text-2xl font-bold text-white leading-tight mb-4">Understanding Quantum Entanglement</h3>
                 <p className="text-[#94A3B8] text-sm">Deep dive into Bell's inequality and quantum superposition mechanics.</p>
               </div>
               <button className="mt-8 text-fuchsia-400 text-sm font-bold tracking-widest uppercase flex items-center gap-2 hover:text-fuchsia-300">
                  Review <ChevronRight className="w-4 h-4" />
               </button>
            </div>
            
            {/* Split Panel Body */}
            <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { title: "Implementing Paxos in Rust", category: "Computer Science", color: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-500/20" },
                 { title: "Navier-Stokes Equations", category: "Fluid Dynamics", color: "text-cyan-400", bg: "bg-cyan-950/20", border: "border-cyan-500/20" },
                 { title: "Thermodynamics Laws", category: "Physics", color: "text-orange-400", bg: "bg-orange-950/20", border: "border-orange-500/20" },
                 { title: "Graph Theory Algorithms", category: "Mathematics", color: "text-blue-400", bg: "bg-blue-950/20", border: "border-blue-500/20" }
               ].map((item, i) => (
                 <div key={i} className={`p-6 border ${item.border} ${item.bg} hover:bg-white/[0.02] transition-colors cursor-pointer flex flex-col justify-between`} style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                   <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${item.color}`}>{item.category}</div>
                   <h4 className="text-lg font-bold text-white">{item.title}</h4>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* ─── VARIANT G: EXPLORE SUBJECTS (Blueprint Frame) ─── */}
        <section className="relative z-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl font-black text-white">Explore Subjects</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 relative">
            {/* SVG Blueprint Frame */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none">
               <rect x="10" y="10" width="calc(100% - 20px)" height="calc(100% - 20px)" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
               <line x1="0" y1="10" x2="20" y2="10" stroke="white" strokeWidth="2" />
               <line x1="10" y1="0" x2="10" y2="20" stroke="white" strokeWidth="2" />
               <line x1="calc(100% - 20px)" y1="10" x2="100%" y2="10" stroke="white" strokeWidth="2" />
               <line x1="calc(100% - 10px)" y1="0" x2="calc(100% - 10px)" y2="20" stroke="white" strokeWidth="2" />
               <line x1="0" y1="calc(100% - 10px)" x2="20" y2="calc(100% - 10px)" stroke="white" strokeWidth="2" />
               <line x1="10" y1="calc(100% - 20px)" x2="10" y2="100%" stroke="white" strokeWidth="2" />
               <line x1="calc(100% - 20px)" y1="calc(100% - 10px)" x2="100%" y2="calc(100% - 10px)" stroke="white" strokeWidth="2" />
               <line x1="calc(100% - 10px)" y1="calc(100% - 20px)" x2="calc(100% - 10px)" y2="100%" stroke="white" strokeWidth="2" />
            </svg>

            {[
              { name: 'Computer Science', icon: Code2, color: 'text-emerald-400' },
              { name: 'Mathematics', icon: Globe, color: 'text-blue-400' },
              { name: 'Physics', icon: Database, color: 'text-fuchsia-400' },
              { name: 'Engineering', icon: Cpu, color: 'text-amber-400' },
              { name: 'AI / ML', icon: Brain, color: 'text-purple-400' },
              { name: 'Networking', icon: Network, color: 'text-cyan-400' },
              { name: 'Literature', icon: Book, color: 'text-rose-400' },
              { name: 'History', icon: Clock, color: 'text-orange-400' },
            ].map((subject) => (
              <div key={subject.name} className="flex flex-col items-center justify-center gap-4 p-8 bg-[#0a0a14]/50 border border-white/5 hover:border-white/20 cursor-pointer transition-all group backdrop-blur-sm" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                <subject.icon className={`w-8 h-8 ${subject.color} group-hover:scale-110 transition-transform`} />
                <span className="font-bold text-sm text-[#F8FAFC] group-hover:text-white transition-colors">{subject.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTION 6: ABOUT FOOTER ─── */}
        <footer className="mt-8 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-[#94A3B8] text-sm">
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
