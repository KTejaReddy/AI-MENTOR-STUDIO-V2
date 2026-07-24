import { motion } from 'framer-motion'
import { BookOpen, FileText, ArrowRight, Network } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DocumentTutorModule() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full min-h-[70vh] flex flex-col md:flex-row-reverse items-center justify-center my-24 gap-12 group cursor-pointer" onClick={() => navigate('/document-tutor')}>
      
      {/* Right Text Content (Rendered on Left visually due to flex-row-reverse) */}
      <div className="flex-1 max-w-md pr-6 md:pr-12 z-20 text-right flex flex-col items-end">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] uppercase mb-6 rounded-sm">
          <BookOpen className="w-3 h-3" />
          Document Analysis
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-[#F8FAFC] mb-4">Doc Tutor</h2>
        <p className="text-[#94A3B8] text-base leading-relaxed mb-8 text-right">
          Extract deep insights from dense PDFs and automatically map them into interactive knowledge graphs for accelerated learning.
        </p>
        <button className="flex items-center gap-2 text-cyan-400 font-bold hover:text-cyan-300 transition-colors uppercase tracking-widest text-sm flex-row-reverse">
          Upload Document <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Left Visual: Stacked PDF Sheets & Knowledge Graph */}
      <div className="relative flex-1 w-full max-w-2xl h-[500px] perspective-[1200px] z-10 flex items-center justify-center">
        
        {/* Knowledge Graph SVG Background */}
        <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none z-0">
           <svg viewBox="0 0 500 500" className="w-full h-full text-cyan-500/30">
              <motion.line x1="250" y1="250" x2="100" y2="100" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              <motion.line x1="250" y1="250" x2="400" y2="150" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
              <motion.line x1="250" y1="250" x2="150" y2="400" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
              
              <circle cx="100" cy="100" r="20" fill="#083344" stroke="#06b6d4" strokeWidth="2" />
              <circle cx="400" cy="150" r="15" fill="#083344" stroke="#06b6d4" strokeWidth="2" />
              <circle cx="150" cy="400" r="25" fill="#083344" stroke="#06b6d4" strokeWidth="2" />
              
              <Network className="absolute" style={{ left: '80px', top: '80px', width: '40px', height: '40px', color: '#22d3ee', opacity: 0.5 }} />
           </svg>
        </div>

        {/* Floating Paper Stack */}
        <div className="relative w-[300px] h-[400px] transform-style-3d group-hover:rotate-y-12 group-hover:rotate-x-12 transition-transform duration-1000 ease-out z-10">
           
           {/* Bottom Sheet */}
           <div className="absolute inset-0 bg-[#f8fafc] rounded-sm shadow-[10px_10px_30px_rgba(0,0,0,0.8)] rotate-[-6deg] opacity-60 translate-x-4 translate-y-4 border border-slate-300" />
           
           {/* Middle Sheet */}
           <div className="absolute inset-0 bg-[#f1f5f9] rounded-sm shadow-[5px_5px_20px_rgba(0,0,0,0.6)] rotate-[-3deg] opacity-80 translate-x-2 translate-y-2 border border-slate-300" />

           {/* Top PDF Sheet */}
           <div className="absolute inset-0 bg-white rounded-sm shadow-2xl flex flex-col overflow-hidden" style={{ clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)' }}>
              
              {/* Folded Corner */}
              <div className="absolute top-0 right-0 w-[40px] h-[40px] bg-slate-200 shadow-[-4px_4px_10px_rgba(0,0,0,0.1)] z-20" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />

              {/* PDF Content Mockup */}
              <div className="p-6 flex flex-col h-full gap-4 relative z-10">
                 <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div className="w-24 h-2 bg-slate-200 rounded-full" />
                 </div>
                 
                 <div className="flex flex-col gap-3">
                    <div className="w-3/4 h-6 bg-slate-800 rounded-sm mb-2" />
                    <div className="w-full h-2 bg-slate-200 rounded-full" />
                    <div className="w-full h-2 bg-slate-200 rounded-full" />
                    <div className="w-5/6 h-2 bg-slate-200 rounded-full" />
                    <div className="w-full h-2 bg-slate-200 rounded-full" />
                 </div>

                 {/* Highlighted text being extracted */}
                 <div className="mt-4 p-3 bg-cyan-50 border-l-4 border-cyan-400">
                    <div className="w-full h-2 bg-cyan-800/40 rounded-full mb-2" />
                    <div className="w-4/5 h-2 bg-cyan-800/40 rounded-full" />
                 </div>
                 
                 {/* Connection dot on the PDF surface */}
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute right-8 bottom-24 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
              </div>
           </div>
        </div>

      </div>

    </div>
  )
}
