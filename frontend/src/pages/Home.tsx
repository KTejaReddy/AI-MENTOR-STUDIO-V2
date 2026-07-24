import React, { Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'

// Eager load Hero
import { AITutorModule } from '../components/home/AITutorModule'

// Lazy load below the fold
const CompilerModule = React.lazy(() => import('../components/home/CompilerModule').then(m => ({ default: m.CompilerModule })))
const DocumentTutorModule = React.lazy(() => import('../components/home/DocumentTutorModule').then(m => ({ default: m.DocumentTutorModule })))
const NotesModule = React.lazy(() => import('../components/home/NotesModule').then(m => ({ default: m.NotesModule })))
const HistoryModule = React.lazy(() => import('../components/home/HistoryModule').then(m => ({ default: m.HistoryModule })))

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="bg-[#000000] text-white w-full overflow-x-hidden relative font-sans selection:bg-indigo-500/30">
      
      {/* GLOBAL AMBIENT NOISE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-noise opacity-[0.25] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-16 pt-8 flex flex-col gap-6 min-h-screen">

        {/* The 5 completely distinct, non-rectangular UI paradigms inside a 12-column grid */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 w-full">
           <AITutorModule />
           
           <Suspense fallback={<div className="col-span-12 md:col-span-7 h-[400px] bg-slate-900/10 animate-pulse rounded-lg border border-slate-800/20" />}>
              <CompilerModule />
           </Suspense>
           
           <Suspense fallback={<div className="col-span-12 md:col-span-5 h-[400px] bg-slate-900/10 animate-pulse rounded-lg border border-slate-800/20" />}>
              <DocumentTutorModule />
           </Suspense>
           
           <Suspense fallback={<div className="col-span-12 md:col-span-6 h-[350px] bg-slate-900/10 animate-pulse rounded-lg border border-slate-800/20" />}>
              <NotesModule />
           </Suspense>
           
           <Suspense fallback={<div className="col-span-12 md:col-span-6 h-[350px] bg-slate-900/10 animate-pulse rounded-lg border border-slate-800/20" />}>
              <HistoryModule />
           </Suspense>
        </div>

        {/* ─── SECTION 6: ABOUT FOOTER ─── */}
        <footer className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-[#94A3B8] text-sm">
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
