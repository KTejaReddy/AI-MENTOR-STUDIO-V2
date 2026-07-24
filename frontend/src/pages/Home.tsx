import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SubjectCard } from '@/components/workspace/SubjectCard'
import { fetchBranches } from '@/lib/api/curriculum'
import type { BranchSummary } from '@/lib/api/curriculum'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useTabs } from '@/contexts/TabContext'
import type { DashRecentTopic } from '@/types/workspace'
import {
  Sparkles, Clock, Code2, Brain, Database, Flame, BookOpen,
  Network, Cpu, Shield, Search, BarChart3, GraduationCap, Layers, AlertCircle,
  Settings, Zap, Truck, Dna, FileText, Bookmark, Edit3, ArrowRight, Play, Target
} from 'lucide-react'

const branchIcons: Record<string, ReactNode> = {
  'computer-science-engineering': <Layers className="w-5 h-5 text-[var(--color-lessons)]" />,
  'ai-machine-learning': <Brain className="w-5 h-5 text-[var(--color-ai)]" />,
  'data-science': <BarChart3 className="w-5 h-5 text-[var(--color-analytics)]" />,
  'cyber-security': <Shield className="w-5 h-5 text-[var(--color-practice)]" />,
  'electronics-communication': <Cpu className="w-5 h-5 text-[var(--color-compiler)]" />,
  'mechanical-engineering': <Settings className="w-5 h-5 text-[var(--color-settings)]" />,
  'civil-engineering': <Layers className="w-5 h-5 text-[var(--color-lessons)]" />,
  'information-technology': <Database className="w-5 h-5 text-[var(--color-history)]" />,
  'electrical-electronics': <Zap className="w-5 h-5 text-[var(--color-notes)]" />,
  'automobile-engineering': <Truck className="w-5 h-5 text-accent-light" />,
  'biotechnology': <Dna className="w-5 h-5 text-[var(--color-bookmarks)]" />,
  'robotics-automation': <Cpu className="w-5 h-5 text-[var(--color-ai)]" />,
  'new-age-specializations': <Sparkles className="w-5 h-5 text-[var(--color-about-gold)]" />,
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full lg:w-80 group">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-white transition-colors" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search topics, subjects..."
        aria-label="Search branches"
        className="w-full bg-surface-100/50 backdrop-blur-md border border-white/5 pl-10 pr-4 py-2.5 rounded-xl focus:border-white/20 transition-all font-medium text-xs text-white placeholder-white/30 shadow-inner"
      />
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

interface QuickActionProps {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  colorVar: string
  large?: boolean
}

function QuickActionCard({ icon, title, description, onClick, colorVar, large = false }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden card p-5 md:p-6 text-left w-full flex flex-col justify-between group border-white/5 hover:border-[var(${colorVar})]/30 transition-colors ${large ? 'col-span-2 md:col-span-2 row-span-2' : 'col-span-1'}`}
      style={{ height: large ? '100%' : '140px' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-100)] to-transparent opacity-50 pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" 
        style={{ background: `linear-gradient(45deg, transparent, var(${colorVar}), transparent)` }} 
      />
      <div className="flex items-center justify-between relative z-10">
        <div 
          className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-lg`}
          style={{ backgroundColor: `color-mix(in srgb, var(${colorVar}) 15%, transparent)`, borderColor: `color-mix(in srgb, var(${colorVar}) 30%, transparent)`, color: `var(${colorVar})` }}
        >
          {icon}
        </div>
        {large && <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />}
      </div>
      <div className="mt-auto relative z-10 pt-4">
        <h3 className="text-sm font-bold text-white tracking-tight mb-1 group-hover:text-white transition-colors">{title}</h3>
        <p className="text-xs text-white/50 line-clamp-2 leading-relaxed font-medium">{description}</p>
      </div>
    </motion.button>
  )
}

export function Home() {
  const navigate = useNavigate()
  const { tabs, createTab, switchTab } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')
  const [branches, setBranches] = useState<BranchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [recentTopics] = useLocalStorage<DashRecentTopic[]>('mentor-recent-topics', [])

  useEffect(() => {
    fetchBranches()
      .then((data) => {
        setBranches(data.filter(b => b.branch_id !== 'common-first-year'))
        setLoading(false)
      })
      .catch((err) => {
        setFetchError(err?.message || 'Failed to load branches')
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

  const displayedBranches = showAll ? branches : branches.slice(0, 12)
  const filteredBranches = searchQuery
    ? displayedBranches.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.branch_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayedBranches

  const quickActions = [
    {
      icon: <Sparkles className="w-5 h-5 md:w-6 md:h-6" />,
      title: "Generate AI Lesson",
      description: "Create a custom learning path with interactive quizzes and visual explanations.",
      onClick: () => navigate('/learn', { state: { openGenerate: true } }),
      colorVar: "--color-lessons",
      large: true
    },
    {
      icon: <FileText className="w-4 h-4 md:w-5 md:h-5" />,
      title: "Doc Tutor",
      description: "Ask questions on your PDFs",
      onClick: () => navigate('/document-tutor'),
      colorVar: "--color-ai"
    },
    {
      icon: <Code2 className="w-4 h-4 md:w-5 md:h-5" />,
      title: "Compiler Lab",
      description: "Code in real-time",
      onClick: () => navigate('/compiler-lab'),
      colorVar: "--color-compiler"
    },
    {
      icon: <Bookmark className="w-4 h-4 md:w-5 md:h-5" />,
      title: "Bookmarks",
      description: "Saved formulas & sections",
      onClick: () => navigate('/bookmarks'),
      colorVar: "--color-bookmarks"
    },
    {
      icon: <Edit3 className="w-4 h-4 md:w-5 md:h-5" />,
      title: "Notes",
      description: "Your study notebook",
      onClick: () => navigate('/notes'),
      colorVar: "--color-notes"
    }
  ]

  return (
    <div className="h-full overflow-y-auto scrollbar-none relative">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--color-lessons)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 space-y-12">
        {/* Premium Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider uppercase text-white/70">
              <Flame className="w-3.5 h-3.5 text-[var(--color-practice)]" />
              14 Day Streak
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
              What would you like to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-lessons)] to-[var(--color-ai)]">learn today?</span>
            </h1>
            <p className="text-base text-white/50 max-w-xl font-medium leading-relaxed">
              Your personalized AI Mentor Studio. Continue your lessons, explore new engineering branches, or practice coding.
            </p>
          </div>
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </motion.div>

        {/* Asymmetric Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {quickActions.map((action, i) => (
            <QuickActionCard key={action.title} {...action} />
          ))}
        </motion.div>

        {/* Centerpiece: Continue Learning Hero */}
        {recentTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--color-practice)]" /> Jump Back In
            </h2>
            
            {/* The primary most recent topic */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-100 shadow-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 group">
              {/* Background abstract mesh */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-lessons)]/20 via-[var(--color-ai)]/10 to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-lessons)]/20 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000" />
              
              <div className="relative z-10 flex-1 space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--color-lessons)]/10 text-[var(--color-lessons)] text-[10px] font-bold uppercase tracking-wider border border-[var(--color-lessons)]/20">
                  <Clock className="w-3 h-3" /> Last opened {formatRelativeTime(recentTopics[0].timestamp)}
                </div>
                
                <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                  {recentTopics[0].topic}
                </h3>
                
                <p className="text-sm md:text-base text-white/50 font-medium">
                  {recentTopics[0].subject}
                </p>
                
                <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                  <Button onClick={handleContinueLast} className="bg-[var(--color-lessons)] hover:bg-[var(--color-lessons)]/80 text-white rounded-full px-8 py-6 shadow-[0_0_20px_rgba(var(--color-lessons-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--color-lessons-rgb),0.6)] transition-all font-bold text-sm flex items-center gap-2">
                    <Play className="w-4 h-4 fill-current" />
                    Continue Lesson
                  </Button>
                  <span className="text-xs font-bold text-white/40">Est. 15 mins remaining</span>
                </div>
              </div>
              
              {/* Beautiful Progress Ring Mockup */}
              <div className="relative z-10 shrink-0 w-48 h-48 md:w-56 md:h-56">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * (recentTopics[0].total > 0 ? (recentTopics[0].completed / recentTopics[0].total) : 0))}
                    className="text-[var(--color-lessons)] drop-shadow-[0_0_10px_rgba(var(--color-lessons-rgb),0.8)] transition-all duration-1000 ease-out" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-white">
                    {recentTopics[0].total > 0 ? Math.round((recentTopics[0].completed / recentTopics[0].total) * 100) : 0}%
                  </span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Completed</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Other Recent Lessons Grid */}
        {recentTopics.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">Recent Activity</h2>
              <button onClick={() => navigate('/history')} className="text-xs text-[var(--color-history)] hover:text-white transition-colors flex items-center gap-1 font-bold">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentTopics.slice(1, 4).map((topic, i) => {
                const progressPercent = topic.total > 0 ? Math.round((topic.completed / topic.total) * 100) : 0
                return (
                  <motion.div
                    key={`${topic.topic}-${i}`}
                    whileHover={{ y: -6, scale: 1.02 }}
                    onClick={() => handleLessonOpen(topic)}
                    className="card bg-surface-100 border-white/5 hover:border-[var(--color-history)]/30 p-5 flex flex-col gap-4 cursor-pointer group rounded-2xl shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-history)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-history)]/15 transition-colors -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-history)]/10 border border-[var(--color-history)]/20 flex items-center justify-center text-[var(--color-history)] shadow-inner">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 group-hover:text-white transition-colors">
                        {topic.difficulty || 'beginner'}
                      </span>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-sm font-bold text-white group-hover:text-[var(--color-history)] transition-colors truncate mb-1">
                        {topic.topic}
                      </h3>
                      <p className="text-xs text-white/40 truncate">
                        {topic.subject}
                      </p>
                    </div>

                    <div className="mt-auto pt-2 relative z-10">
                      <div className="flex items-center justify-between text-[10px] text-white/50 mb-2 font-bold">
                        <span>Progress</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-history)] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(var(--color-history-rgb),0.5)]"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Engineering Branches Catalog */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pt-8 border-t border-white/5"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-lessons)]" /> Engineering Branches
            </h2>
            {!loading && !fetchError && branches.length > 12 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-white/50 hover:text-white transition-colors font-bold flex items-center gap-1"
              >
                {showAll ? 'Collapse' : `View All (${branches.length})`}
              </button>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-surface-100 border border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {fetchError && (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-surface-100 rounded-2xl border border-white/5">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-sm text-white font-bold mb-1">Failed to load branches</p>
              <p className="text-xs text-white/50 max-w-sm">{fetchError}</p>
            </div>
          )}

          {!loading && !fetchError && (
            <AnimatePresence mode="wait">
              <motion.div
                key={searchQuery || 'all'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filteredBranches.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-surface-100 rounded-2xl border border-white/5">
                    <Search className="w-10 h-10 text-white/20 mb-4" />
                    <p className="text-sm text-white font-bold mb-1">No branches found</p>
                    <p className="text-xs text-white/40">Try a different search term</p>
                  </div>
                ) : (
                  filteredBranches.map((branch, i) => (
                    <motion.div
                      key={branch.branch_id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + (i % 12) * 0.03 }}
                      layout
                    >
                      <SubjectCard
                        className="h-full rounded-2xl shadow-lg border-white/5 hover:border-[var(--color-lessons)]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all bg-surface-100"
                        icon={branchIcons[branch.branch_id] || <GraduationCap className="w-5 h-5 text-white" />}
                        title={branch.name}
                        description={branch.description}
                        topicCount={branch.subject_count}
                        difficulty={branch.subject_count > 20 ? 'advanced' as const : branch.subject_count > 10 ? 'intermediate' as const : 'beginner' as const}
                        onClick={() => navigate('/learn')}
                      />
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  )
}
