import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Code2, BookOpen, Edit3, Clock, Play, Terminal, Layers, ChevronRight, Activity, Globe, Database, Cpu, Network, Book } from 'lucide-react'

// --- Unique Custom Shapes via CSS Clip Path and Tricks ---

// 1. AI Tutor: Cut Corners Hero Card
const HeroCardStyle = {
  clipPath: 'polygon(40px 0, 100% 0, 100% calc(100% - 60px), calc(100% - 60px) 100%, 0 100%, 0 40px)',
}

// 2. Compiler: Diagonal Top Edge Card
const CompilerCardStyle = {
  clipPath: 'polygon(0 40px, 100% 0, 100% 100%, 0 100%)',
}

// 3. History: Leaf Curved Card (CSS Border Radius trick instead of clip-path for curves)
const HistoryCardStyle = {
  borderRadius: '0 60px 0 60px',
}

// --- Inner Artwork SVGs ---
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
    className="w-[90%] md:w-[500px] h-[300px] bg-[#022C22]/80 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] relative"
    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }} // Micro cut corners
  >
    <div className="h-8 bg-black/40 border-b border-emerald-500/20 flex items-center px-4 gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
    </div>
    <div className="p-6 font-mono text-emerald-400/80 text-sm leading-loose">
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

// --- Shared Magazine Thumbnail ---
function MagazineThumbnail({ title, category, colorClass, gradientClass, heightClass = 'h-[250px]' }: { title: string, category: string, colorClass: string, gradientClass: string, heightClass?: string }) {
  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden group cursor-pointer border border-white/10`}>
      <div className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${gradientClass}`} />
      <div className="absolute inset-0 bg-[#02040A]/60 group-hover:bg-[#02040A]/40 transition-colors duration-500" />
      
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
    <div className="bg-[#02040A] text-white overflow-x-hidden relative font-sans selection:bg-indigo-500/30 min-h-screen">
      
      {/* GLOBAL AMBIENT NOISE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-noise opacity-[0.25] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-32 pt-16 flex flex-col gap-16">

        {/* ─── SECTION 1: AI TUTOR HERO CARD (Cut Corners) ─── */}
        <div className="relative w-full group cursor-pointer shadow-2xl" onClick={() => navigate('/learn', { state: { openGenerate: true } })}>
           {/* Glow behind the card */}
           <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] z-0" />
           
           <div 
             className="relative z-10 w-full bg-[#060814]/90 backdrop-blur-xl border border-indigo-500/30 overflow-hidden flex flex-col md:flex-row items-center justify-between p-10 md:p-16 min-h-[50vh]"
             style={HeroCardStyle}
           >
             {/* Abstract Neural background inside card */}
             <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-40">
                <NeuralNetwork />
             </div>
             
             <div className="relative z-20 max-w-2xl">
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

               <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-extrabold text-sm md:text-base rounded-lg overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all">
                 <Play className="w-4 h-4 fill-black" />
                 Initialize Lesson
               </button>
             </div>
           </div>
           
           {/* Card Border highlight overlay (since clip-path hides standard borders, we use a trick or keep it simple) */}
           <div className="absolute inset-0 border-2 border-indigo-500/50 pointer-events-none z-20" style={HeroCardStyle} />
        </div>

        {/* ─── SECTION 2: FEATURE EXPERIENCES (The Card Family) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-20">
           
           {/* COMPILER CARD (Diagonal Split) */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/compiler-lab')}>
              <div 
                className="absolute inset-0 bg-[#022C22]/80 backdrop-blur-md overflow-hidden flex flex-col justify-end p-10"
                style={CompilerCardStyle}
              >
                 <div className="absolute top-0 right-0 w-[80%] h-full pointer-events-none opacity-30 flex items-start justify-end p-8">
                    <FloatingTerminal />
                 </div>
                 
                 <div className="relative z-10 max-w-sm mt-auto">
                    <div className="w-12 h-12 rounded-lg bg-[#064E3B] border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-3">Compiler Lab</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">Write, debug, and test code instantly with embedded AI tracking.</p>
                 </div>
              </div>
              <div className="absolute inset-0 border border-emerald-500/40 pointer-events-none z-20" style={CompilerCardStyle} />
           </div>

           {/* DOC TUTOR CARD (Folded Paper Style) */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/document-tutor')}>
              {/* Main Paper Layer */}
              <div className="absolute inset-0 bg-[#083344]/80 backdrop-blur-md border border-cyan-500/40 overflow-hidden flex flex-col p-10 z-10"
                   style={{ clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)' }}>
                 
                 <div className="absolute right-[-10%] bottom-[-10%] w-[300px] h-[300px] pointer-events-none opacity-40">
                    {/* Abstract overlapping papers */}
                    <div className="absolute inset-10 bg-cyan-900/50 border border-cyan-400/30 rotate-12" />
                    <div className="absolute inset-10 bg-cyan-950/80 border border-cyan-400/50 -rotate-6" />
                    <div className="absolute inset-14 bg-transparent border-2 border-dashed border-cyan-300/30 rotate-3 flex items-center justify-center">
                       <BookOpen className="w-12 h-12 text-cyan-500/30" />
                    </div>
                 </div>

                 <div className="relative z-10 max-w-sm">
                    <div className="w-12 h-12 rounded-lg bg-[#083344] border border-cyan-500/30 flex items-center justify-center mb-6 text-cyan-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-3">Doc Tutor</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">Extract deep insights from PDFs and instantly map them into dynamic knowledge graphs.</p>
                 </div>
              </div>
              
              {/* Folded Corner Element */}
              <div className="absolute top-0 right-0 w-[40px] h-[40px] bg-cyan-800/80 border-b border-l border-cyan-400/50 z-20 shadow-[-5px_5px_10px_rgba(0,0,0,0.5)]"
                   style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
           </div>

           {/* NOTES CARD (Notebook Stacked Layers) */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/notes')}>
              {/* Bottom Layer */}
              <div className="absolute top-4 left-4 right-[-4px] bottom-[-4px] bg-[#291002] border border-amber-900/50 rounded-xl z-0" />
              {/* Middle Layer */}
              <div className="absolute top-2 left-2 right-[-2px] bottom-[-2px] bg-[#3B1703] border border-amber-700/50 rounded-xl z-0" />
              
              {/* Top Layer */}
              <div className="absolute inset-0 bg-[#451A03]/90 backdrop-blur-md border-2 border-amber-500/40 rounded-xl overflow-hidden flex flex-col p-10 z-10">
                 
                 {/* Binding lines */}
                 <div className="absolute left-6 top-0 bottom-0 w-1 bg-amber-900/50 border-r border-amber-500/20" />
                 
                 <div className="absolute right-10 bottom-10 w-[200px] h-[150px] bg-yellow-600/20 border border-yellow-500/30 rotate-6 shadow-lg pointer-events-none flex items-center justify-center">
                    <Edit3 className="w-10 h-10 text-yellow-500/20" />
                 </div>

                 <div className="relative z-10 max-w-sm pl-8">
                    <div className="w-12 h-12 rounded-lg bg-[#78350F] border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-3">Digital Pad</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">Jot down logic, architectural diagrams, and freeform text seamlessly.</p>
                 </div>
              </div>
           </div>

           {/* HISTORY CARD (Timeline Leaf Curve) */}
           <div className="relative group cursor-pointer shadow-xl h-[450px]" onClick={() => navigate('/history')}>
              <div 
                className="absolute inset-0 bg-[#4C0519]/80 backdrop-blur-md border border-rose-500/40 overflow-hidden flex flex-col justify-end p-10 z-10"
                style={HistoryCardStyle}
              >
                 <div className="absolute right-0 top-[20%] w-[60%] h-[100px] pointer-events-none opacity-50">
                    <WindingTimeline />
                 </div>

                 <div className="relative z-10 max-w-sm mt-auto">
                    <div className="w-12 h-12 rounded-lg bg-[#881337] border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-[#F8FAFC] mb-3">Timeline</h2>
                    <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">Revisit your entire history. Every compilation, document analyzed, and note taken, mapped chronologically.</p>
                 </div>
              </div>
           </div>

        </div>

        {/* ─── SECTION 3: CONTINUE LEARNING (Tech Panel Style) ─── */}
        <section className="relative z-20 mt-8">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-white">Continue Learning</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          
          <div 
            className="w-full relative bg-[#060814]/80 backdrop-blur-md border border-white/20 p-10 flex flex-col md:flex-row gap-10 items-center overflow-hidden"
            style={{ clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))' }} // Hexagonal panel cut
          >
            <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="flex-1 relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Active Lesson</div>
              <h3 className="text-3xl font-bold text-white mb-4">Advanced Distributed Systems</h3>
              <p className="text-[#94A3B8] text-sm md:text-base leading-relaxed mb-8 max-w-md">
                You were studying the CAP Theorem and Paxos consensus algorithms. Ready to dive back into the derivation?
              </p>
              
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
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-10px] border border-indigo-500/30 rounded-full border-dashed" />
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: RECENT LESSONS (Magazine) ─── */}
        <section className="relative z-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl font-black text-white">Recent Lessons</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            <button className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest hover:text-white transition-colors">View All</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="col-span-1 md:col-span-7">
               <MagazineThumbnail title="Understanding Quantum Entanglement" category="Quantum Physics" colorClass="text-fuchsia-400" gradientClass="bg-gradient-to-br from-fuchsia-900 to-transparent" heightClass="h-[350px]" />
            </div>
            <div className="col-span-1 md:col-span-5 flex flex-col gap-6">
               <MagazineThumbnail title="Implementing Paxos in Rust" category="Computer Science" colorClass="text-emerald-400" gradientClass="bg-gradient-to-br from-emerald-900 to-transparent" heightClass="h-[163px]" />
               <MagazineThumbnail title="Navier-Stokes Equations" category="Fluid Dynamics" colorClass="text-cyan-400" gradientClass="bg-gradient-to-br from-cyan-900 to-transparent" heightClass="h-[163px]" />
            </div>
            <div className="col-span-1 md:col-span-4">
               <MagazineThumbnail title="Thermodynamics Laws" category="Physics" colorClass="text-orange-400" gradientClass="bg-gradient-to-br from-orange-900 to-transparent" heightClass="h-[250px]" />
            </div>
            <div className="col-span-1 md:col-span-4">
               <MagazineThumbnail title="Graph Theory Algorithms" category="Mathematics" colorClass="text-blue-400" gradientClass="bg-gradient-to-br from-blue-900 to-transparent" heightClass="h-[250px]" />
            </div>
            <div className="col-span-1 md:col-span-4">
               <MagazineThumbnail title="Transformers Architecture" category="AI / ML" colorClass="text-purple-400" gradientClass="bg-gradient-to-br from-purple-900 to-transparent" heightClass="h-[250px]" />
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: EXPLORE SUBJECTS ─── */}
        <section className="relative z-20">
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
