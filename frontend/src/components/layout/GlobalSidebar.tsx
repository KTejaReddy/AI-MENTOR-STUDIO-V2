import { motion } from 'framer-motion'
import { Award, Zap, Target, CalendarDays, Sparkles, TrendingUp, Compass, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GlobalSidebar() {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 overflow-hidden bg-transparent border-0 flex flex-col px-4 py-2 hidden xl:flex gap-4 scrollbar-none overflow-y-auto h-full pb-8"
    >
      {/* Profile / XP Widget */}
      <div className="card p-4 bg-surface-50/50 backdrop-blur-md border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-lessons)]/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-[var(--color-analytics)]" />
            Daily Progress
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-analytics)]/20 text-[var(--color-analytics)]">
            Lvl 12
          </span>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-text-primary">2,450</span>
            <span className="text-xs text-text-tertiary">XP</span>
          </div>
          <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-gradient-to-r from-[var(--color-lessons)] to-[var(--color-ai)] rounded-full w-[70%]" />
          </div>
          <p className="text-[10px] text-text-tertiary text-right">550 XP to Level 13</p>
        </div>
      </div>

      {/* Learning Streak Widget */}
      <div className="card p-4 bg-surface-50/50 backdrop-blur-md border border-white/5 group">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-practice)]/10 flex items-center justify-center border border-[var(--color-practice)]/20 shadow-[0_0_15px_rgba(var(--color-practice-rgb),0.15)] group-hover:shadow-[0_0_20px_rgba(var(--color-practice-rgb),0.3)] transition-shadow">
            <TrendingUp className="w-5 h-5 text-[var(--color-practice)]" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary">14 Day Streak</div>
            <div className="text-[11px] text-text-tertiary">You're on fire! Keep it up.</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-text-tertiary font-medium">{day}</span>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                i < 5 ? "bg-[var(--color-practice)] text-white shadow-[0_0_10px_rgba(var(--color-practice-rgb),0.4)]" : "bg-surface-200 text-text-tertiary"
              )}>
                {i < 5 && '✓'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card p-4 bg-surface-50/50 backdrop-blur-md border border-white/5 relative overflow-hidden group">
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[var(--color-ai)]/10 rounded-full blur-2xl transition-transform group-hover:scale-150" />
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 relative z-10">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-ai)]" />
          Recommended For You
        </div>
        
        <div className="space-y-3 relative z-10">
          <div className="p-3 rounded-lg bg-surface-100 border border-white/5 hover:border-[var(--color-ai)]/30 transition-colors cursor-pointer group/item">
            <div className="text-xs font-bold text-text-primary mb-1 group-hover/item:text-[var(--color-ai)] transition-colors">Advanced React Patterns</div>
            <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
              <Clock className="w-3 h-3" /> 45 mins • Software Eng
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-surface-100 border border-white/5 hover:border-[var(--color-lessons)]/30 transition-colors cursor-pointer group/item">
            <div className="text-xs font-bold text-text-primary mb-1 group-hover/item:text-[var(--color-lessons)] transition-colors">Python Data Structures</div>
            <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
              <Clock className="w-3 h-3" /> 30 mins • Computer Science
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Goal Widget */}
      <div className="card p-4 bg-surface-50/50 backdrop-blur-md border border-white/5">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
          <Target className="w-3.5 h-3.5 text-[var(--color-bookmarks)]" />
          Weekly Goal
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-200"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
              />
              <path
                style={{ color: 'var(--color-bookmarks)' }}
                strokeDasharray="75, 100"
                className="text-current transition-all duration-1000"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-text-primary">75%</span>
          </div>
          <div>
            <div className="text-xs font-bold text-text-primary">3 of 4 lessons</div>
            <div className="text-[10px] text-text-tertiary">completed this week</div>
          </div>
        </div>
      </div>
      
    </motion.div>
  )
}
