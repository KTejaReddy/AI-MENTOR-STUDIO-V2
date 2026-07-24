import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SubjectCard } from '@/components/workspace/SubjectCard'
import { ContinueLearning } from '@/components/dashboard/ContinueLearning'
import { fetchBranches } from '@/lib/api/curriculum'
import type { BranchSummary } from '@/lib/api/curriculum'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useTabs } from '@/contexts/TabContext'
import type { DashRecentTopic } from '@/types/workspace'
import {
  Sparkles, BookOpen, Clock, TrendingUp, Code2, Brain, Database,
  Network, Cpu, Shield, Search, BarChart3, GraduationCap, Layers, AlertCircle,
  Settings, Zap, Truck, Dna, FileText, Bookmark, Edit3, ArrowRight
} from 'lucide-react'

const branchIcons: Record<string, ReactNode> = {
  'computer-science-engineering': <Layers className="w-5 h-5 text-accent-light" />,
  'ai-machine-learning': <Brain className="w-5 h-5 text-accent-light" />,
  'data-science': <BarChart3 className="w-5 h-5 text-accent-light" />,
  'cyber-security': <Shield className="w-5 h-5 text-accent-light" />,
  'electronics-communication': <Cpu className="w-5 h-5 text-accent-light" />,
  'mechanical-engineering': <Settings className="w-5 h-5 text-accent-light" />,
  'civil-engineering': <Layers className="w-5 h-5 text-accent-light" />,
  'information-technology': <Database className="w-5 h-5 text-accent-light" />,
  'electrical-electronics': <Zap className="w-5 h-5 text-accent-light" />,
  'automobile-engineering': <Truck className="w-5 h-5 text-accent-light" />,
  'biotechnology': <Dna className="w-5 h-5 text-accent-light" />,
  'robotics-automation': <Cpu className="w-5 h-5 text-accent-light" />,
  'new-age-specializations': <Sparkles className="w-5 h-5 text-accent-light" />,
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full lg:w-80">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search topics, subjects..."
        aria-label="Search branches"
        className="input bg-white/3 border-white/5 pl-10 focus:border-[#00f2fe]/40 transition-all font-medium text-xs py-2"
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
  colorClass: string
}

function QuickActionCard({ icon, title, description, onClick, colorClass }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card card-hover p-4 text-left w-full flex flex-col justify-between h-32"
    >
      <div className="absolute inset-0 bg-surface-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-surface-100 transition-transform duration-300 shrink-0 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-xs font-bold text-text-primary tracking-tight truncate group-hover:text-accent transition-colors">{title}</h3>
        <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2 leading-relaxed">{description}</p>
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
      icon: <Sparkles className="w-4 h-4" />,
      title: "New Lesson",
      description: "Generate a custom AI learning path",
      onClick: () => navigate('/learn', { state: { openGenerate: true } }),
      colorClass: "text-[var(--color-nav)]"
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: "Explain Document",
      description: "Upload PDFs & ask AI questions",
      onClick: () => navigate('/document-tutor'),
      colorClass: "text-[var(--color-ai)]"
    },
    {
      icon: <Code2 className="w-4 h-4" />,
      title: "Open Compiler",
      description: "Practice coding in real-time",
      onClick: () => navigate('/compiler-lab'),
      colorClass: "text-[var(--color-success)]"
    },
    {
      icon: <Clock className="w-4 h-4" />,
      title: "Resume Lesson",
      description: "Continue where you left off",
      onClick: handleContinueLast,
      colorClass: "text-[var(--color-warning)]"
    },
    {
      icon: <Bookmark className="w-4 h-4" />,
      title: "Bookmarks",
      description: "Saved formulas, code & sections",
      onClick: () => navigate('/bookmarks'),
      colorClass: "text-[var(--color-notes)]"
    },
    {
      icon: <Edit3 className="w-4 h-4" />,
      title: "Notes",
      description: "Review your study notebook",
      onClick: () => navigate('/notes'),
      colorClass: "text-[var(--color-ai)]"
    }
  ]

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Welcome Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-1 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-text-tertiary">
                Continue your learning journey
              </p>
            </div>
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 interactive-group">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <QuickActionCard {...action} />
              </motion.div>
            ))}
          </div>

          {/* Expanded Continue Learning Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full mb-8"
          >
            <div className="card p-8 md:p-10 relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-6 border-[var(--color-ai)]/20">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-nav)]/5 to-[var(--color-ai)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 text-center md:text-left flex-1">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 border border-border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                  <Sparkles className="w-8 h-8 text-[var(--color-nav)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-2 group-hover:text-[#00C2FF] transition-colors">Continue Learning</h2>
                  <p className="text-sm text-text-secondary max-w-xl mb-4 md:mb-0 leading-relaxed">
                    Unlock your potential with custom-tailored AI lectures. Select a branch below or generate an automated lesson.
                  </p>
                </div>
              </div>
              <div className="relative z-10 shrink-0">
                <Button variant="primary" size="lg" onClick={() => navigate('/learn')} className="font-semibold shadow-glow-accent px-6 py-3 rounded-xl flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Start Learning
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Recent Lessons Grid */}
          {recentTopics.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Recent Lessons</h2>
                <button onClick={() => navigate('/history')} className="text-xs text-accent-light hover:text-accent transition-colors flex items-center gap-1 font-medium">
                  View History <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 interactive-group">
                {recentTopics.slice(0, 3).map((topic, i) => {
                  const progressPercent = topic.total > 0 ? Math.round((topic.completed / topic.total) * 100) : 0
                  const branch = getBranchForSubject(topic.subject)
                  return (
                    <motion.div
                      key={`${topic.topic}-${i}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => handleLessonOpen(topic)}
                      className="card card-hover p-5 flex flex-col justify-between h-40 group"
                    >
                      <div>
                        <span className="text-xs uppercase tracking-wider font-mono text-accent font-bold mb-1 block">
                          {branch}
                        </span>
                        <h3 className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors truncate mb-1">
                          {topic.topic}
                        </h3>
                        <p className="text-xs text-text-tertiary truncate mb-3">
                          {topic.subject}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5 font-medium">
                          <span>Progress</span>
                          <span>{progressPercent}% ({topic.completed}/{topic.total})</span>
                        </div>
                        <div className="w-full h-1 bg-surface-200 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-[var(--color-nav)] rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary/75 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Opened {formatRelativeTime(topic.timestamp)}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grid Layout: Branches and Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Engineering Branches</h2>
                {!loading && !fetchError && branches.length > 12 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs text-accent-light hover:text-accent transition-colors font-medium"
                  >
                    {showAll ? 'Show less' : `View all (${branches.length})`}
                  </button>
                )}
              </div>

              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-surface-100 border border-border animate-pulse" />
                  ))}
                </div>
              )}

              {fetchError && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                  <p className="text-sm text-text-primary font-medium mb-1">Failed to load branches</p>
                  <p className="text-xs text-text-tertiary max-w-sm">{fetchError}</p>
                </div>
              )}

              {!loading && !fetchError && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={searchQuery || 'all'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 interactive-group"
                  >
                    {filteredBranches.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <Search className="w-8 h-8 text-text-tertiary/50 mb-3" />
                        <p className="text-sm text-text-primary font-medium mb-1">No branches found</p>
                        <p className="text-xs text-text-tertiary">Try a different search term</p>
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
                            className="interactive-item"
                            icon={branchIcons[branch.branch_id] || <GraduationCap className="w-5 h-5 text-accent-light" />}
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
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">
              <ContinueLearning />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
