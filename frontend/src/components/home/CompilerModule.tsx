import React from 'react'
import { motion } from 'framer-motion'
import { Terminal, Code2, Folder, FileJson, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const CompilerModule = React.memo(function CompilerModule() {
  const navigate = useNavigate()

  return (
    <div className="relative w-full col-span-12 md:col-span-6 lg:col-span-7 h-[500px] md:h-[400px] flex flex-col md:flex-row items-center justify-between my-0 gap-6 group cursor-pointer bg-[#060814]/40 border border-emerald-500/10 p-6 md:p-0 overflow-hidden shadow-xl" onClick={() => navigate('/compiler-lab')}>
      
      {/* Left Text Content */}
      <div className="flex-1 max-w-sm pl-0 md:pl-12 z-20 flex flex-col items-center text-center md:items-start md:text-left mt-6 md:mt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase mb-6 rounded-sm">
          <Terminal className="w-3 h-3" />
          Execution Environment
        </div>
        <h2 className="text-[32px] md:text-4xl font-black text-[#F8FAFC] mb-2 leading-tight">Compiler Lab</h2>
        <p className="text-[#94A3B8] text-sm leading-relaxed mb-6">
          Write, debug, and test code instantly with an embedded AI orchestrator monitoring your logic paths.
        </p>
        <button className="flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors uppercase tracking-widest text-sm">
          Open Lab <Play className="w-4 h-4 fill-emerald-400" />
        </button>
      </div>

      {/* Right Visual: Floating VS Code IDE */}
      <div className="relative flex flex-1 w-full max-w-sm z-10 scale-[0.65] md:scale-[0.85] origin-top md:origin-right mt-4 md:mt-0 justify-center">
         <div className="w-full bg-[#1E1E1E] rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[350px]">
           {/* Window Header */}
           <div className="h-10 bg-[#323233] border-b border-[#1e1e1e] flex items-center px-4 justify-between">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                 <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                 <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="text-[11px] text-[#cccccc] font-sans">workspace - CompilerLab</div>
              <div className="w-10" />
           </div>

           <div className="flex h-[310px]">
              {/* Activity Bar */}
              <div className="w-12 bg-[#333333] border-r border-[#1e1e1e] flex flex-col items-center py-4 gap-6 text-[#858585]">
                 <Folder className="w-5 h-5 text-white" />
                 <Code2 className="w-5 h-5 hover:text-white transition-colors" />
                 <Terminal className="w-5 h-5 hover:text-white transition-colors" />
              </div>

              {/* Sidebar */}
              <div className="w-48 bg-[#252526] border-r border-[#1e1e1e] py-2 px-4 hidden md:block">
                 <div className="text-[10px] font-bold text-[#cccccc] uppercase tracking-widest mb-3">Explorer</div>
                 <div className="flex flex-col gap-1 text-[13px] text-[#cccccc]">
                    <div className="flex items-center gap-2 py-1"><Folder className="w-4 h-4 text-[#dcb67a]" /> src</div>
                    <div className="flex items-center gap-2 py-1 pl-4 bg-[#37373d] text-white"><Code2 className="w-4 h-4 text-[#519aba]" /> main.rs</div>
                    <div className="flex items-center gap-2 py-1 pl-4"><FileJson className="w-4 h-4 text-[#cbcb41]" /> cargo.toml</div>
                 </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 bg-[#1e1e1e] flex flex-col relative">
                 {/* Tabs */}
                 <div className="h-9 bg-[#2d2d2d] flex items-center">
                    <div className="px-4 h-full bg-[#1e1e1e] text-[#cccccc] text-[13px] flex items-center border-t-2 border-[#519aba]">
                       main.rs
                    </div>
                 </div>
                 
                 {/* Code */}
                 <div className="flex-1 p-4 font-mono text-[13px] leading-loose text-[#d4d4d4] overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] text-[#858585] text-right pr-4 pt-4 select-none">
                       1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7
                    </div>
                    <div className="pl-12">
                       <p><span className="text-[#569cd6]">fn</span> <span className="text-[#dcdcaa]">main</span>() {'{'}</p>
                       <p className="pl-6"><span className="text-[#569cd6]">let</span> <span className="text-[#4fc1ff]">system_active</span> = <span className="text-[#569cd6]">true</span>;</p>
                       <p className="pl-6 text-[#6a9955]">// AI monitoring initialized</p>
                       <p className="pl-6"><span className="text-[#c586c0]">if</span> system_active {'{'}</p>
                       <p className="pl-12"><span className="text-[#4ec9b0]">println!</span>(<span className="text-[#ce9178]">"Compilation ready."</span>);</p>
                       <p className="pl-6">{'}'}</p>
                       <p>{'}'}</p>
                    </div>
                 </div>

                 {/* Split Terminal Pane */}
                 <div className="h-[120px] bg-[#1e1e1e] border-t border-[#444444] p-2 flex flex-col">
                    <div className="text-[11px] text-[#cccccc] uppercase tracking-widest px-2 pb-2">Terminal</div>
                    <div className="flex-1 bg-[#1e1e1e] font-mono text-[12px] px-2 text-[#cccccc]">
                       <p className="text-emerald-400">➜  workspace git:(main) ✗ cargo run</p>
                       <p className="text-[#858585]">   Compiling workspace v0.1.0</p>
                       <p className="text-white mt-1">Compilation ready.</p>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Status Bar */}
           <div className="h-6 bg-[#007acc] text-white text-[10px] flex items-center px-3 justify-between">
              <div className="flex items-center gap-3">
                 <span>main*</span>
                 <span>0 Errors, 0 Warnings</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="text-[#6A9955]">// AI analysis: Memory allocation optimal</div>
              </div>
           </div>
         </div>
      </div>
    </div>
  )
})
