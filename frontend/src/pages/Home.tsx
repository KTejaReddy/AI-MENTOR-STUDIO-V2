import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Brain, Code2, BookOpen, Edit3, Clock, Play, Terminal, Layers } from 'lucide-react'

// Abstract SVGs for the environments
const NeuralNetwork = () => (
  <svg viewBox="0 0 800 800" className="w-full h-full text-indigo-500/20" fill="none" stroke="currentColor">
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
    
    {/* Floating particles */}
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.circle
        key={i}
        cx={Math.random() * 800}
        cy={Math.random() * 800}
        r={Math.random() * 4 + 1}
        fill="#A855F7"
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.8, 0.2]
        }}
        transition={{
          duration: 3 + Math.random() * 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 2
        }}
      />
    ))}
  </svg>
)

const FloatingTerminal = () => (
  <motion.div 
    animate={{ y: [-10, 10, -10] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    className="w-[800px] h-[500px] rounded-3xl bg-[#022C22]/80 backdrop-blur-3xl border border-emerald-500/30 shadow-[0_0_100px_rgba(16,185,129,0.2)] overflow-hidden relative"
    style={{ transform: "perspective(1200px) rotateY(15deg) rotateX(10deg)" }}
  >
    {/* Header */}
    <div className="h-12 bg-black/40 border-b border-emerald-500/20 flex items-center px-6">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
      </div>
      <div className="mx-auto text-emerald-500/50 font-mono text-xs">compiler_core.rs</div>
    </div>
    <div className="p-8 font-mono text-emerald-400/80 text-sm md:text-base leading-loose relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <p><span className="text-emerald-300">fn</span> <span className="text-blue-300">initialize_neural_engine</span>() -{'>'} Result{'<'}(), Error{'>'} {'{'}</p>
        <p className="pl-6 text-emerald-500/60">// Booting distributed compilation environment</p>
        <p className="pl-6">let core = Engine::new(Config::default());</p>
        <p className="pl-6">core.allocate_threads(64).await?;</p>
        <p className="pl-6 mt-4">println!("System online.");</p>
        <p className="pl-6">Ok(())</p>
        <p>{'}'}</p>
        <div className="mt-6 flex items-center gap-2">
          <span className="text-emerald-500">root@mentor:~$</span>
          <motion.div 
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2.5 h-5 bg-emerald-400"
          />
        </div>
      </motion.div>
    </div>
  </motion.div>
)

const StaggeredDocuments = () => (
  <div className="relative w-[600px] h-[600px]">
    {/* Back layer */}
    <motion.div 
      animate={{ y: [-15, 15, -15], rotateZ: [-5, -2, -5] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-10 left-10 w-[400px] h-[500px] bg-[#083344]/60 backdrop-blur-lg border border-cyan-500/20 rounded-2xl p-8 opacity-50 shadow-2xl"
    >
      <div className="w-3/4 h-4 bg-cyan-500/20 rounded mb-4" />
      <div className="w-full h-3 bg-cyan-500/10 rounded mb-2" />
      <div className="w-5/6 h-3 bg-cyan-500/10 rounded mb-2" />
      <div className="w-full h-3 bg-cyan-500/10 rounded mb-2" />
    </motion.div>
    
    {/* Middle Layer */}
    <motion.div 
      animate={{ y: [10, -10, 10], rotateZ: [2, 5, 2] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute top-20 left-24 w-[400px] h-[500px] bg-[#083344]/80 backdrop-blur-xl border border-cyan-400/30 rounded-2xl p-8 opacity-80 shadow-2xl"
    >
       <div className="w-1/2 h-6 bg-cyan-400/30 rounded mb-6" />
       <div className="w-full h-3 bg-cyan-400/20 rounded mb-3" />
       <div className="w-full h-3 bg-cyan-400/20 rounded mb-3" />
       <div className="w-2/3 h-3 bg-cyan-400/20 rounded mb-3" />
    </motion.div>

    {/* Front Layer */}
    <motion.div 
      animate={{ y: [-5, 5, -5], rotateZ: [-1, 1, -1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute top-32 left-40 w-[400px] h-[500px] bg-[#020617] backdrop-blur-2xl border-2 border-cyan-400/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(34,211,238,0.2)]"
    >
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-6">
        <BookOpen className="w-8 h-8 text-cyan-400" />
      </div>
      <div className="w-3/4 h-8 bg-cyan-400/40 rounded-lg mb-8" />
      <div className="space-y-4">
        <div className="w-full h-4 bg-cyan-400/20 rounded-md" />
        <div className="w-full h-4 bg-cyan-400/20 rounded-md" />
        <div className="w-4/5 h-4 bg-cyan-400/20 rounded-md" />
        <div className="w-full h-4 bg-cyan-400/20 rounded-md mt-8" />
        <div className="w-2/3 h-4 bg-cyan-400/20 rounded-md" />
      </div>
      {/* Knowledge graph lines overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <line x1="50" y1="300" x2="200" y2="400" stroke="#22D3EE" strokeWidth="2" />
        <line x1="200" y1="400" x2="350" y2="350" stroke="#22D3EE" strokeWidth="2" />
        <circle cx="50" cy="300" r="6" fill="#22D3EE" />
        <circle cx="200" cy="400" r="8" fill="#22D3EE" />
        <circle cx="350" cy="350" r="6" fill="#22D3EE" />
      </svg>
    </motion.div>
  </div>
)

const OrganicNotes = () => (
  <div className="relative w-[600px] h-[600px] flex items-center justify-center">
    <motion.div 
      animate={{ scale: [1, 1.05, 1], rotate: [0, 90, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_60%)] blur-2xl rounded-full"
    />
    <motion.svg viewBox="0 0 400 400" className="w-[80%] h-[80%] absolute z-10" stroke="rgba(245,158,11,0.4)" fill="none" strokeWidth="3">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
        d="M50,200 C50,100 150,50 250,100 C350,150 300,300 200,350 C100,400 50,300 50,200 Z"
      />
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 1 }}
        d="M100,250 Q200,100 300,250 T100,250"
      />
    </motion.svg>
    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#451A03] border border-amber-500/40 rounded-xl shadow-[0_10px_40px_rgba(245,158,11,0.2)] rotate-[-12deg] p-4 flex flex-col gap-2 z-20">
      <div className="w-full h-2 bg-amber-500/20 rounded" />
      <div className="w-5/6 h-2 bg-amber-500/20 rounded" />
      <div className="w-full h-2 bg-amber-500/20 rounded" />
    </div>
    <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-[#78350F] border border-amber-400/50 rounded-xl shadow-[0_15px_50px_rgba(245,158,11,0.3)] rotate-[8deg] p-5 flex flex-col gap-3 z-30">
      <div className="w-full h-2.5 bg-amber-400/30 rounded" />
      <div className="w-3/4 h-2.5 bg-amber-400/30 rounded" />
      <div className="w-full h-2.5 bg-amber-400/30 rounded" />
      <div className="w-1/2 h-2.5 bg-amber-400/30 rounded" />
    </div>
  </div>
)

const WindingHistory = () => (
  <div className="relative w-[100vw] h-[400px] overflow-hidden -ml-6 md:-ml-12 lg:-ml-20">
    <svg viewBox="0 0 1200 400" className="w-full h-full text-rose-500/30" fill="none" stroke="currentColor">
      <motion.path 
         d="M-100,200 C200,300 400,100 600,200 C800,300 1000,100 1300,200" 
         strokeWidth="4" 
         strokeDasharray="10 10"
         animate={{ strokeDashoffset: [0, -100] }}
         transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Nodes */}
      <circle cx="200" cy="225" r="15" fill="#4C0519" stroke="#F43F5E" strokeWidth="3" />
      <circle cx="500" cy="175" r="10" fill="#4C0519" stroke="#F43F5E" strokeWidth="2" />
      <circle cx="800" cy="225" r="20" fill="#BE123C" stroke="#FDA4AF" strokeWidth="4" />
      <circle cx="1100" cy="175" r="12" fill="#4C0519" stroke="#F43F5E" strokeWidth="2" />
    </svg>
    <div className="absolute top-1/2 left-[800px] -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
  </div>
)


export function Home() {
  const navigate = useNavigate()
  const { scrollYProgress } = useScroll()

  // Parallax effects tied to global scroll
  const aiY = useTransform(scrollYProgress, [0, 0.3], [0, 150])
  const compilerY = useTransform(scrollYProgress, [0.1, 0.5], [-100, 100])
  const docY = useTransform(scrollYProgress, [0.3, 0.7], [-50, 150])

  return (
    <div className="bg-[#02040A] text-white overflow-x-hidden min-h-screen relative font-sans selection:bg-indigo-500/30">
      
      {/* ─── GLOBAL AMBIENT NOISE & LIGHTING ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-noise opacity-[0.25] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* ─── SCENE 1: AI TUTOR (HERO) ─────────────────────────────── */}
      <section className="relative min-h-[100vh] w-full flex items-center pt-32 pb-32 z-10">
        {/* Abstract Background Graphic Bleeding off right */}
        <motion.div 
          style={{ y: aiY }}
          className="absolute top-[-10%] right-[-20%] md:right-[-10%] w-[120vw] md:w-[70vw] h-[100vh] pointer-events-none z-0"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_60%)] blur-[100px]" />
          <NeuralNetwork />
        </motion.div>

        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full max-w-[1600px] mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 font-bold tracking-widest text-xs uppercase mb-10 shadow-[0_0_30px_rgba(99,102,241,0.2)] backdrop-blur-md">
              <Brain className="w-4 h-4" />
              AI Tutor Environment
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-[7.5rem] font-black tracking-tighter leading-[0.95] mb-8 text-[#F8FAFC]">
              Intelligence <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">
                Engineered.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[#94A3B8] font-medium leading-relaxed max-w-xl mb-12">
              Generate incredibly detailed, personalized learning journeys. The neural engine adapts to your exact specifications, instantly.
            </p>

            <button 
              onClick={() => navigate('/learn', { state: { openGenerate: true } })}
              className="group relative inline-flex items-center gap-4 px-10 py-5 bg-white text-black font-extrabold text-lg rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_80px_rgba(255,255,255,0.4)] transition-all hover:scale-105 duration-300"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Play className="w-5 h-5 fill-black" />
                Initialize Lesson
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── SCENE 2: COMPILER LAB ─────────────────────────────── */}
      <section className="relative min-h-[100vh] w-full flex items-center py-32 z-20 overflow-hidden">
        {/* Bleeding Background Color */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[80vw] h-[80vh] bg-[radial-gradient(ellipse_at_left,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none blur-[100px] z-0" />

        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          
          {/* Left Side Artwork */}
          <motion.div 
            style={{ y: compilerY }}
            className="flex-1 w-full relative h-[600px] flex items-center max-md:hidden"
          >
            <div className="absolute left-[-20%] z-0">
               <FloatingTerminal />
            </div>
          </motion.div>

          {/* Right Side Content */}
          <div className="flex-1 w-full md:text-right flex flex-col md:items-end z-10">
            <div className="w-16 h-16 rounded-3xl bg-[#064E3B] border border-emerald-500/30 flex items-center justify-center mb-8 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              <Terminal className="w-8 h-8" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-[#F8FAFC] mb-6 tracking-tight">Compiler Lab</h2>
            <p className="text-xl md:text-2xl text-[#94A3B8] font-medium leading-relaxed max-w-xl mb-12">
              A robust execution environment built for speed. Write, debug, and test code instantly with embedded AI assistance tracking your logic.
            </p>
            <button 
              onClick={() => navigate('/compiler-lab')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold text-lg rounded-2xl hover:bg-emerald-900/60 hover:text-emerald-200 transition-all hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]"
            >
              Open Terminal
            </button>
          </div>

        </div>
      </section>

      {/* ─── SCENE 3: DOCUMENT TUTOR ─────────────────────────────── */}
      <section className="relative min-h-[100vh] w-full flex items-center py-32 z-30 overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[70vw] h-[70vh] bg-[radial-gradient(ellipse_at_right,rgba(6,182,212,0.1)_0%,transparent_70%)] pointer-events-none blur-[100px] z-0" />

        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full max-w-[1600px] mx-auto flex flex-col md:flex-row-reverse items-center justify-between gap-12">
          
          {/* Right Side Artwork */}
          <motion.div 
            style={{ y: docY }}
            className="flex-1 w-full relative h-[600px] flex items-center justify-end max-md:hidden"
          >
            <div className="absolute right-[-10%] z-0">
               <StaggeredDocuments />
            </div>
          </motion.div>

          {/* Left Side Content */}
          <div className="flex-1 w-full z-10">
            <div className="w-16 h-16 rounded-3xl bg-[#083344] border border-cyan-500/30 flex items-center justify-center mb-8 text-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-[#F8FAFC] mb-6 tracking-tight">Doc Tutor</h2>
            <p className="text-xl md:text-2xl text-[#94A3B8] font-medium leading-relaxed max-w-xl mb-12">
              Transform static PDFs into dynamic knowledge graphs. Extract deep insights and generate comprehensive study materials instantly.
            </p>
            <button 
              onClick={() => navigate('/document-tutor')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-lg rounded-2xl hover:bg-cyan-900/60 hover:text-cyan-200 transition-all hover:shadow-[0_0_40px_rgba(6,182,212,0.2)]"
            >
              Analyze Documents
            </button>
          </div>

        </div>
      </section>

      {/* ─── SCENE 4: NOTES & HISTORY (BLENDED BOTTOM) ─────────────────────────────── */}
      <section className="relative min-h-[120vh] w-full pt-32 pb-48 z-40 overflow-hidden flex flex-col justify-between">
        
        {/* Ambient background mixing amber and rose */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#451a03]/5 to-[#4c0519]/10 pointer-events-none z-0" />
        
        {/* Notes Content */}
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-12 mb-32">
          <div className="flex-1 w-full z-10">
            <div className="w-16 h-16 rounded-3xl bg-[#451A03] border border-amber-500/30 flex items-center justify-center mb-8 text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
              <Edit3 className="w-8 h-8" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-[#F8FAFC] mb-6 tracking-tight">Digital Scratchpad</h2>
            <p className="text-xl md:text-2xl text-[#94A3B8] font-medium leading-relaxed max-w-xl mb-12">
              Jot down logic, formulas, and architecture plans in a freeform environment. Pure focus, zero friction.
            </p>
            <button 
              onClick={() => navigate('/notes')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-amber-950/40 border border-amber-500/30 text-amber-300 font-bold text-lg rounded-2xl hover:bg-amber-900/60 hover:text-amber-200 transition-all hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]"
            >
              Open Workspace
            </button>
          </div>
          <div className="flex-1 w-full flex justify-center max-md:hidden z-0">
            <OrganicNotes />
          </div>
        </div>

        {/* History Content */}
        <div className="relative z-10 w-full flex flex-col items-center text-center pt-24 border-t border-white/5">
          <div className="absolute bottom-0 left-0 w-full pointer-events-none opacity-50">
             <WindingHistory />
          </div>
          
          <div className="relative z-10 mb-20">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#4C0519] border border-rose-500/30 flex items-center justify-center mb-8 text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-[#F8FAFC] mb-6 tracking-tight">Timeline</h2>
            <p className="text-xl md:text-2xl text-[#94A3B8] font-medium leading-relaxed max-w-2xl mx-auto mb-12">
              Every concept learned, every line compiled. Revisit your entire engineering journey instantly.
            </p>
            <button 
              onClick={() => navigate('/history')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 font-bold text-lg rounded-2xl hover:bg-rose-900/60 hover:text-rose-200 transition-all hover:shadow-[0_0_40px_rgba(244,63,94,0.2)]"
            >
              View History
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
