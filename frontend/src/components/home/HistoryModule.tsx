import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Activity, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const HistoryModule = React.memo(function HistoryModule() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full col-span-12 md:col-span-6 h-[500px] md:h-[350px] flex flex-col md:flex-row items-center justify-center my-0 gap-6 group cursor-pointer bg-[#0A0A0A] border border-white/5 shadow-xl overflow-hidden p-6 md:p-0" onClick={() => navigate('/history')}>
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-rose-950/10 pointer-events-none z-0" />

      {/* Left Text Content */}
      <div className="relative flex-1 max-w-md pl-0 md:pl-12 z-20 flex flex-col items-center text-center md:items-start md:text-left mt-6 md:mt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/30 border border-rose-500/30 text-rose-400 font-mono text-[10px] uppercase mb-6 rounded-full">
          <Activity className="w-3 h-3" />
          Activity Tracker
        </div>
        <h2 className="text-[32px] md:text-4xl font-black text-[#F8FAFC] mb-2 leading-tight">Neural History</h2>
        <p className="text-[#94A3B8] text-sm leading-relaxed mb-6">
          Track your skill progression over time. View deep analytics on problem-solving speed, accuracy, and knowledge retention.
        </p>
      </div>

      {/* Right Visual: Graph and Analytics */}
      <div className="relative flex flex-1 w-full h-[350px] z-10 items-center justify-center scale-[0.6] md:scale-90 origin-top md:origin-right mt-4 md:mt-0">
         
         {/* The Main Axis (Horizontal glowing line) */}
         <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#f43f5e] opacity-50" />
         <div className="absolute left-0 right-0 h-[1px] bg-rose-400 opacity-80" />

         {/* Orbiting Elements along the axis */}
         <div className="absolute inset-0 max-w-6xl mx-auto flex items-center justify-between px-12">
            
            {/* Node 1 */}
            <div className="relative group/node">
               <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} className="w-4 h-4 rounded-full bg-rose-400 shadow-[0_0_15px_#f43f5e] z-10 relative cursor-pointer" />
               <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-rose-500/50" />
               <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#2e0411] border border-rose-500/30 p-3 min-w-[150px] opacity-50 group-hover/node:opacity-100 transition-opacity">
                  <div className="text-[10px] text-rose-400 font-mono mb-1">09:41 AM</div>
                  <div className="text-sm font-bold text-white">Compiled main.rs</div>
               </div>
            </div>

            {/* Node 2 */}
            <div className="relative group/node">
               <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }} className="w-6 h-6 rounded-full bg-rose-500 shadow-[0_0_20px_#f43f5e] z-10 relative cursor-pointer border-2 border-white" />
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[1px] h-16 bg-rose-500/50" />
               <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#2e0411] border border-rose-500/30 p-3 min-w-[180px] opacity-80 group-hover/node:opacity-100 transition-opacity">
                  <div className="text-[10px] text-rose-400 font-mono mb-1">11:15 AM</div>
                  <div className="text-sm font-bold text-white">Analyzed "Paxos.pdf"</div>
               </div>
            </div>

            {/* Node 3 (Active) */}
            <div className="relative group/node">
               <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-8 h-8 rounded-full bg-rose-600 shadow-[0_0_30px_#f43f5e] z-10 relative cursor-pointer border-2 border-white flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
               </motion.div>
               <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1px] h-20 bg-rose-500/80" />
               <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-rose-950 border border-rose-400 p-4 min-w-[200px] z-20 shadow-2xl">
                  <div className="text-[10px] text-rose-300 font-mono mb-1">CURRENT</div>
                  <div className="text-base font-bold text-white">AI Tutor Session</div>
                  <div className="text-xs text-rose-200 mt-2">Active for 45 mins</div>
               </div>
            </div>

            {/* Node 4 */}
            <div className="relative group/node">
               <div className="w-3 h-3 rounded-full bg-rose-900 border border-rose-500 z-10 relative cursor-pointer" />
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[1px] h-10 bg-rose-900/50" />
               <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#2e0411]/50 border border-rose-900/50 p-2 min-w-[120px] opacity-30">
                  <div className="text-[10px] text-rose-700 font-mono mb-1">Pending</div>
               </div>
            </div>

         </div>

         {/* Sine Wave Background Overlay */}
         <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none" viewBox="0 0 1000 300">
            <motion.path 
               d="M0,150 Q125,50 250,150 T500,150 T750,150 T1000,150" 
               fill="none" 
               stroke="#f43f5e" 
               strokeWidth="2"
               animate={{ d: ["M0,150 Q125,50 250,150 T500,150 T750,150 T1000,150", "M0,150 Q125,250 250,150 T500,150 T750,150 T1000,150", "M0,150 Q125,50 250,150 T500,150 T750,150 T1000,150"] }}
               transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
         </svg>
      </div>

    </div>
  )
})
