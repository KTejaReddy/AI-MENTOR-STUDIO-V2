import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { fetchBranches } from '@/lib/api/curriculum'
import type { BranchSummary } from '@/lib/api/curriculum'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useTabs } from '@/contexts/TabContext'
import type { DashRecentTopic } from '@/types/workspace'
import { InteractiveKnowledgeGraph } from '@/components/ui/InteractiveKnowledgeGraph'
import {
  Sparkles, Clock, Code2, Brain, Database, Flame, BookOpen,
  Network, Cpu, Shield, Search, BarChart3, GraduationCap, Layers, AlertCircle,
  Settings, Zap, Truck, Dna, FileText, Bookmark, Edit3, ArrowRight, Play, Target
} from 'lucide-react'

const branchIcons: Record<string, ReactNode> = {
  'computer-science-engineering': <Layers className="w-6 h-6" />,
  'ai-machine-learning': <Brain className="w-6 h-6" />,
  'data-science': <BarChart3 className="w-6 h-6" />,
  'cyber-security': <Shield className="w-6 h-6" />,
  'electronics-communication': <Cpu className="w-6 h-6" />,
  'mechanical-engineering': <Settings className="w-6 h-6" />,
  'civil-engineering': <Layers className="w-6 h-6" />,
  'information-technology': <Database className="w-6 h-6" />,
  'electrical-electronics': <Zap className="w-6 h-6" />,
  'automobile-engineering': <Truck className="w-6 h-6" />,
  'biotechnology': <Dna className="w-6 h-6" />,
  'robotics-automation': <Cpu className="w-6 h-6" />,
  'new-age-specializations': <Sparkles className="w-6 h-6" />,
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full max-w-2xl mx-auto group z-20">
      <div className="absolute inset-0 bg-white/5 blur-xl group-hover:bg-white/10 transition-colors duration-500 rounded-full" />
      <div className="relative flex items-center bg-surface-100/40 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl transition-all duration-300 group-hover:border-white/20">
        <div className="pl-4 pr-3">
          <Search className="w-5 h-5 text-text-tertiary group-focus-within:text-[var(--color-lessons)] transition-colors" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What do you want to master today?"
          className="flex-1 bg-transparent border-none text-sm md:text-base text-white placeholder-white/30 focus:outline-none focus:ring-0 py-2.5"
        />
        <div className="hidden md:flex items-center gap-1.5 px-4">
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/50">⌘K</span>
        </div>
      </div>
    </div>
  )
}

function getBranchForSubject(subject: string): string {
  const sub = subject.toLowerCase()
  if (sub.includes('data structure') || sub.includes('algorithm') || sub.includes('operating system') || sub.includes('dbms') || sub.includes('database') || sub.includes('network') || sub.includes('compiler') || sub.includes('programming') || sub.includes('java') || sub.includes('python')) {
    return 'Computer Science'
  }
  if (sub.includes('machine learning') || sub.includes('ai ') || sub.includes('artificial intelligence') || sub.includes('deep learning') || sub.includes('neural')) {
    return 'AI & ML'
  }
  if (sub.includes('data science') || sub.includes('statistic') || sub.includes('analysis')) {
    return 'Data Science'
  }
  if (sub.includes('cyber') || sub.includes('security') || sub.includes('cryptography')) {
    return 'Cyber Security'
  }
  if (sub.includes('circuit') || sub.includes('electronic') || sub.includes('signal') || sub.includes('communication')) {
    return 'Electronics'
  }
  if (sub.includes('robot') || sub.includes('automat') || sub.includes('sensor')) {
    return 'Robotics'
  }
  if (sub.includes('mechanical') || sub.includes('thermodynamic') || sub.includes('fluid')) {
    return 'Mechanical'
  }
  if (sub.includes('civil') || sub.includes('concrete') || sub.includes('survey')) {
    return 'Civil Eng'
  }
  if (sub.includes('biotech') || sub.includes('gene') || sub.includes('bio')) {
    return 'Biotechnology'
  }
  return 'Engineering'
}

export function Home() {
  const navigate = useNavigate()
  const { tabs, createTab, switchTab } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')
  const [branches, setBranches] = useState<BranchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [recentTopics] = useLocalStorage<DashRecentTopic[]>('mentor-recent-topics', [])

  useEffect(() => {
    fetchBranches()
      .then((data) => {
        setBranches(data.filter(b => b.branch_id !== 'common-first-year'))
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const handleLessonOpen = (topic: DashRecentTopic) => {
    const existingTab = tabs.find((t) =>
      t.topic.toLowerCase() === topic.topic.toLowerCase() && t.subject.toLowerCase() === topic.subject.toLowerCase()
    )
    if (existingTab) switchTab(existingTab.id)
    else createTab({ label: topic.topic, subject: topic.subject, topic: topic.topic, difficulty: topic.difficulty || 'beginner', learningMode: 'default' })
    navigate('/learn')
  }

  const handleContinueLast = () => {
    if (recentTopics.length > 0) {
      handleLessonOpen(recentTopics[0])
    } else {
      navigate('/learn')
    }
  }

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    if (diff < 60000) return 'Just now'
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  const filteredBranches = searchQuery
    ? branches.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.branch_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : branches.slice(0, 10)

  return (
    <div className="h-full overflow-y-auto scrollbar-none relative bg-noise">
      
      {/* ─── MASSIVE APPLE-STYLE HERO ────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-10 pb-20 px-6 overflow-hidden">
        
        {/* Background Visual Centerpiece */}
        <div className="absolute inset-0 flex items-center justify-center opacity-70">
          <InteractiveKnowledgeGraph />
        </div>

        {/* Foreground Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 text-center max-w-4xl mx-auto flex flex-col items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-100/50 backdrop-blur-xl border border-white/10 text-xs font-bold tracking-widest uppercase text-[var(--color-practice)] mb-8 shadow-2xl">
            <Flame className="w-4 h-4" />
            14 Day Streak
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white tracking-tighter leading-[1.05] mb-6 drop-shadow-2xl">
            Engineering<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-lessons)] via-[var(--color-ai)] to-[var(--color-compiler)]">
              Redefined.
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-white/50 max-w-2xl font-medium leading-relaxed mb-12">
            The world's most advanced AI Tutor. Master complex subjects with personalized roadmaps, visual explanations, and real-time practice.
          </p>

          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Scroll to Explore</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/30 to-transparent" />
        </motion.div>
      </section>

      {/* ─── CONTINUE LEARNING CENTERPIECE ──────────────────────────────────── */}
      {recentTopics.length > 0 && (
        <section className="relative z-20 -mt-20 px-6 md:px-12 max-w-[1400px] mx-auto pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl flex flex-col lg:flex-row group">
              {/* Massive ambient glow */}
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-lessons)]/10 rounded-full blur-[120px] pointer-events-none -mr-[400px] -mt-[400px] group-hover:bg-[var(--color-lessons)]/20 transition-colors duration-1000" />
              
              <div className="relative z-10 flex-1 p-10 md:p-16 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-lessons)] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/50">Continue Learning</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[var(--color-lessons)] group-hover:to-white transition-all duration-500">
                  {recentTopics[0].topic}
                </h2>
                
                <p className="text-lg text-white/50 font-medium mb-10 max-w-xl">
                  {recentTopics[0].subject} • Last opened {formatRelativeTime(recentTopics[0].timestamp)}
                </p>
                
                <div className="flex items-center gap-6">
                  <Button onClick={handleContinueLast} className="h-14 px-8 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-all text-sm font-bold flex items-center gap-3">
                    <Play className="w-5 h-5 fill-current" /> Resume Chapter
                  </Button>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Estimated Time</span>
                    <span className="text-sm font-bold text-white">15 mins</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 lg:w-[450px] bg-white/[0.02] border-l border-white/5 p-10 md:p-16 flex flex-col items-center justify-center">
                {/* SVG Progress Visualization */}
                <div className="relative w-64 h-64">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * (recentTopics[0].total > 0 ? (recentTopics[0].completed / recentTopics[0].total) : 0))}
                      className="text-[var(--color-lessons)] transition-all duration-1000 ease-out" 
                      style={{ filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.4))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white tracking-tighter">
                      {recentTopics[0].total > 0 ? Math.round((recentTopics[0].completed / recentTopics[0].total) * 100) : 0}%
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-lessons)] uppercase tracking-widest mt-2">Mastered</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ─── MAGAZINE LAYOUT: BRANCHES & ACTIVITY ───────────────────────────── */}
      <section className="px-6 md:px-12 max-w-[1400px] mx-auto pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Column (Left, wider) */}
          <div className="lg:col-span-8 space-y-24">
            
            {/* Quick Actions Asymmetric Grid */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-5 h-5 text-[var(--color-ai)]" />
                <h3 className="text-xl font-bold text-white tracking-tight">AI Workspace</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Large Action */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/learn', { state: { openGenerate: true } })}
                  className="md:col-span-2 h-48 rounded-[2rem] p-8 flex flex-col justify-between cursor-pointer border border-white/5 relative overflow-hidden group bg-surface-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-lessons)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-lessons)]/20 flex items-center justify-center">
                      <Brain className="w-7 h-7 text-[var(--color-lessons)]" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-white/20 group-hover:text-white transition-colors" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-2xl font-bold text-white mb-2">Generate Custom Lesson</h4>
                    <p className="text-sm text-white/50">Build a comprehensive learning path with interactive quizzes.</p>
                  </div>
                </motion.div>
                
                {/* Square Action 1 */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/document-tutor')}
                  className="h-48 rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer border border-white/5 relative overflow-hidden group bg-surface-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-ai)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-ai)]/20 flex items-center justify-center relative z-10">
                    <FileText className="w-6 h-6 text-[var(--color-ai)]" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-white mb-1">Doc Tutor</h4>
                    <p className="text-xs text-white/50">Analyze PDFs instantly.</p>
                  </div>
                </motion.div>
                
                {/* Square Action 2 */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/compiler-lab')}
                  className="h-48 rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer border border-white/5 relative overflow-hidden group bg-surface-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-compiler)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-compiler)]/20 flex items-center justify-center relative z-10">
                    <Code2 className="w-6 h-6 text-[var(--color-compiler)]" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-white mb-1">Compiler Lab</h4>
                    <p className="text-xs text-white/50">Practice real-time coding.</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Engineering Branches Grid */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-white/50" />
                  <h3 className="text-xl font-bold text-white tracking-tight">Explore Branches</h3>
                </div>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl bg-surface-100/50 animate-pulse border border-white/5" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredBranches.map((branch, i) => (
                    <motion.div
                      key={branch.branch_id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => navigate('/learn')}
                      className="group cursor-pointer rounded-2xl p-6 bg-surface-50 border border-white/5 hover:bg-surface-100 transition-colors flex items-start gap-5"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-surface-200 border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {branchIcons[branch.branch_id] || <Layers className="w-6 h-6 text-white/50" />}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white mb-1 group-hover:text-[var(--color-lessons)] transition-colors">{branch.name}</h4>
                        <p className="text-xs text-white/40 line-clamp-2">{branch.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Side Column (Right, narrower) */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Recent History Sidebar */}
            {recentTopics.length > 1 && (
              <div className="bg-surface-50 rounded-[2rem] border border-white/5 p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">Recent History</h3>
                  <button onClick={() => navigate('/history')} className="text-xs font-bold text-[var(--color-history)] hover:text-white transition-colors">
                    View All
                  </button>
                </div>
                
                <div className="space-y-6">
                  {recentTopics.slice(1, 5).map((topic, i) => (
                    <div key={i} className="flex gap-4 group cursor-pointer" onClick={() => handleLessonOpen(topic)}>
                      <div className="w-10 h-10 rounded-xl bg-surface-100 border border-white/5 flex items-center justify-center shrink-0 text-[var(--color-history)]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-[var(--color-history)] transition-colors">{topic.topic}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/40 truncate">{topic.subject}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[10px] text-white/30 shrink-0">{formatRelativeTime(topic.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Learning Goals Widget */}
            <div className="bg-surface-50 rounded-[2rem] border border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bookmarks)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-8 flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--color-bookmarks)]" /> Weekly Goal
              </h3>
              
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="text-4xl font-black text-white tracking-tighter mb-1">3 <span className="text-lg text-white/30">/ 4</span></div>
                  <div className="text-xs text-white/50 font-medium">Lessons completed</div>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-surface-200 border-t-[var(--color-bookmarks)] border-r-[var(--color-bookmarks)] border-b-[var(--color-bookmarks)] transform rotate-45 shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
