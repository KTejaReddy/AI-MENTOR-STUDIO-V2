import { motion } from 'framer-motion'
import { Edit3, ArrowRight, PenTool } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function NotesModule() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full min-h-[70vh] flex flex-col md:flex-row items-center justify-center my-24 gap-12 group cursor-pointer overflow-hidden" onClick={() => navigate('/notes')}>
      
      {/* Background Corkboard/Grid effect constrained to this module area */}
      <div className="absolute inset-0 bg-[#1c1917] pointer-events-none z-0 overflow-hidden border-y border-amber-900/20">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(251,191,36,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(251,191,36,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Left Text Content */}
      <div className="flex-1 max-w-md pl-6 md:pl-12 z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-900/30 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase mb-6 rounded-sm">
          <PenTool className="w-3 h-3" />
          Engineering Notebook
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-[#F8FAFC] mb-4">Digital Pad</h2>
        <p className="text-[#94A3B8] text-base leading-relaxed mb-8">
          Jot down logic, sketch architectural diagrams, and connect your freeform thoughts in an unstructured creative environment.
        </p>
        <button className="flex items-center gap-2 text-amber-400 font-bold hover:text-amber-300 transition-colors uppercase tracking-widest text-sm">
          Open Notebook <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right Visual: Messy Desk & Sticky Notes */}
      <div className="relative flex-1 w-full h-[500px] z-10 flex items-center justify-center">
         
         {/* Main Grid Paper Pad */}
         <div className="absolute w-[350px] h-[450px] bg-[#fffbeb] shadow-[20px_20px_60px_rgba(0,0,0,0.8)] rotate-2 group-hover:rotate-1 transition-transform duration-700">
            {/* Binder Rings */}
            <div className="absolute left-4 top-0 bottom-0 w-2 flex flex-col justify-evenly">
               {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-4 border-slate-800 -translate-x-3 bg-gradient-to-b from-slate-400 to-slate-600 shadow-md" />
               ))}
            </div>
            {/* Pad Content */}
            <div className="ml-12 mt-8 mr-8">
               <h3 className="font-['Caveat',cursive,sans-serif] text-4xl text-slate-800 mb-6">System Architecture</h3>
               <div className="w-full h-[1px] bg-blue-300 mb-6" />
               <div className="w-full h-[1px] bg-blue-300 mb-6" />
               <div className="w-full h-[1px] bg-blue-300 mb-6" />
               <div className="w-full h-[1px] bg-blue-300 mb-6" />
               
               {/* Sketch SVG */}
               <svg className="absolute top-[120px] left-[50px] w-48 h-48 pointer-events-none opacity-80" viewBox="0 0 100 100">
                  <path d="M20,20 h60 v40 h-60 z" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="5,5" />
                  <circle cx="50" cy="40" r="15" fill="none" stroke="#0ea5e9" strokeWidth="2" />
                  <path d="M50,55 v20" fill="none" stroke="#334155" strokeWidth="2" />
                  <path d="M45,75 l5,5 l5,-5" fill="none" stroke="#334155" strokeWidth="2" />
               </svg>
            </div>
         </div>

         {/* Floating Sticky Note 1 */}
         <motion.div 
           animate={{ rotate: [-12, -15, -12], y: [0, -5, 0] }}
           transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-12 right-12 w-40 h-40 bg-yellow-300 shadow-lg p-4 group-hover:-translate-y-4 group-hover:shadow-2xl transition-all"
         >
            <div className="w-full flex justify-center mb-2">
               <div className="w-12 h-4 bg-red-400/50 -mt-6 rotate-3 backdrop-blur-sm" /> {/* Tape */}
            </div>
            <p className="font-['Caveat',cursive,sans-serif] text-xl text-slate-800 leading-tight">Don't forget to implement the caching layer!</p>
         </motion.div>

         {/* Floating Sticky Note 2 */}
         <motion.div 
           animate={{ rotate: [8, 5, 8], y: [0, 5, 0] }}
           transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           className="absolute bottom-12 left-0 w-36 h-36 bg-pink-300 shadow-lg p-4 group-hover:-translate-x-4 group-hover:shadow-2xl transition-all"
         >
            <div className="w-4 h-4 rounded-full bg-slate-800 absolute top-2 left-1/2 -translate-x-1/2 shadow-inner shadow-black/50" /> {/* Pin */}
            <p className="font-['Caveat',cursive,sans-serif] text-2xl text-slate-800 mt-4 text-center">TODO: <br/>Fix bug #42</p>
         </motion.div>

      </div>

    </div>
  )
}
