import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/icon-button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useTabs } from '@/contexts/TabContext'
import {
  Clock, Search, Trash2, BookOpen, Brain, Code2, MessageSquare, ArrowUpDown,
} from 'lucide-react'

interface HistoryEntry {
  id: string; type: 'lesson' | 'quiz' | 'code' | 'question'; title: string; subject: string
  time: string; timestamp: number; duration?: string; difficulty: string; isReal: boolean; score?: string
}

const activityIcons: Record<HistoryEntry['type'], React.ComponentType<{className?: string}>> = { lesson: BookOpen, quiz: Brain, code: Code2, question: MessageSquare }
const activityColors: Record<HistoryEntry['type'], string> = {
  lesson: 'text-accent-light bg-accent/10',
  quiz: 'text-amber-400 bg-amber-500/10',
  code: 'text-emerald-400 bg-emerald-500/10',
  question: 'text-sky-400 bg-sky-500/10',
}

export function History() {
  const navigate = useNavigate()
  const { tabs, createTab, switchTab } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [sortAsc, setSortAsc] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [realHistory, setRealHistory] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('mentor-recent-topics')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const [mockHistory, setMockHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function handleFlush() {
      try {
        const raw = localStorage.getItem('mentor-recent-topics')
        setRealHistory(raw ? JSON.parse(raw) : [])
      } catch { setRealHistory([]) }
      setMockHistory([])
    }
    window.addEventListener('auth:cache-flush', handleFlush)
    return () => window.removeEventListener('auth:cache-flush', handleFlush)
  }, [])

  const formatTime = (timestamp: number): string => {
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

  const handleDelete = (e: React.MouseEvent, entry: any) => {
    e.stopPropagation()
    setConfirmDelete(entry.id)
  }

  const confirmDeleteEntry = () => {
    if (!confirmDelete) return
    const entry = [...realHistory.map((item, idx) => ({
      id: `real-${item.timestamp}-${idx}`, type: 'lesson' as const, title: item.topic, subject: item.subject,
      time: formatTime(item.timestamp), timestamp: item.timestamp, duration: '10 sections', difficulty: item.difficulty, isReal: true, score: undefined
    })), ...mockHistory.map((item, idx) => ({
      id: `mock-${idx}`, type: item.type, title: item.title, subject: item.subject,
      time: item.time, timestamp: Date.now() - (idx + 1) * 3600000 * 2,
      duration: item.duration, difficulty: 'beginner', isReal: false, score: item.score,
    }))].find(e => e.id === confirmDelete)

    if (entry?.isReal) {
      const updated = realHistory.filter((item) => item.timestamp !== entry.timestamp)
      localStorage.setItem('mentor-recent-topics', JSON.stringify(updated))
      setRealHistory(updated)
    } else if (entry) {
      setMockHistory((prev) => prev.filter((item) => item.title !== entry.title))
    }
    setConfirmDelete(null)
  }

  const handleEntryClick = (entry: any) => {
    const existingTab = tabs.find((t) =>
      t.topic.toLowerCase() === entry.title.toLowerCase() && t.subject.toLowerCase() === entry.subject.toLowerCase()
    )
    if (existingTab) switchTab(existingTab.id)
    else createTab({ label: entry.title, subject: entry.subject, topic: entry.title, difficulty: entry.difficulty || 'beginner', learningMode: 'default' })
    navigate('/learn')
  }

  const combinedHistory = [
    ...realHistory.map((item, idx) => ({
      id: `real-${item.timestamp}-${idx}`, type: 'lesson' as const, title: item.topic, subject: item.subject,
      time: formatTime(item.timestamp), timestamp: item.timestamp, duration: '10 sections', difficulty: item.difficulty, isReal: true, score: undefined
    })),
    ...mockHistory.map((item, idx) => ({
      id: `mock-${idx}`, type: item.type, title: item.title, subject: item.subject,
      time: item.time, timestamp: Date.now() - (idx + 1) * 3600000 * 2,
      duration: item.duration, difficulty: 'beginner', isReal: false, score: item.score,
    })),
  ].sort((a, b) => sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp)

  const filtered = combinedHistory.filter((entry) => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'all' || entry.type === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <Dialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogTitle>Delete Entry?</DialogTitle>
          <p className="text-sm text-text-tertiary mt-1 mb-4">Remove this entry from your history.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDeleteEntry}><Trash2 className="w-4 h-4" /> Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">History</h1>
              <p className="text-sm text-text-tertiary">Your learning journey</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search history..." className="input pl-9" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All' }, { id: 'lesson', label: 'Lessons' },
              { id: 'code', label: 'Code' }, { id: 'quiz', label: 'Quizzes' }, { id: 'question', label: 'Questions' },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                filter === f.id ? 'bg-accent/15 text-accent-light border border-accent/20' : 'bg-surface-150 text-text-tertiary border border-border hover:border-border-light hover:text-text-secondary'
              )}>
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <IconButton label={sortAsc ? 'Newest first' : 'Oldest first'} onClick={() => setSortAsc(!sortAsc)}>
                <ArrowUpDown className={cn('w-4 h-4 transition-transform', sortAsc && 'rotate-180')} />
              </IconButton>
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-100 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-surface-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-48 bg-surface-200 rounded" />
                    <div className="h-2 w-32 bg-surface-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="empty-state-icon"><Clock className="w-8 h-8 text-text-tertiary" /></div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">No history found</h3>
              <p className="text-xs text-text-tertiary">Start learning to build your history</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="relative pl-6 border-l border-white/5 space-y-3 ml-3 my-4">
              {filtered.map((entry, i) => {
                const Icon = activityIcons[entry.type]
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => handleEntryClick(entry)}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl glass breathe-3d border border-white/5 hover:border-[#00f2fe]/20 hover:shadow-[0_0_20px_rgba(0,242,254,0.06)] hover:bg-[#05050b]/40 transition-all duration-300 cursor-pointer relative"
                  >
                    {/* Timeline Node Connector */}
                    <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#00f2fe] border-2 border-surface shadow-[0_0_8px_rgba(0,242,254,0.8)] z-10 transition-transform duration-300 group-hover:scale-125" />
                    
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5', activityColors[entry.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate tracking-tight group-hover:text-[#00f2fe] transition-colors">{entry.title}</p>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-text-tertiary uppercase tracking-wide">
                        <span>{entry.subject}</span>
                        <span>·</span>
                        <span>{entry.time}</span>
                        {entry.duration && <><span>·</span><span>{entry.duration}</span></>}
                        {entry.score && <Badge variant={parseInt(entry.score) >= 8 ? 'success' : 'warning'} size="sm" className="ml-1 text-[8px]">{entry.score}</Badge>}
                      </div>
                    </div>
                    <IconButton label="Delete" size="sm" onClick={(e: React.MouseEvent) => handleDelete(e, entry)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-white/5 shrink-0">
                      <Trash2 className="w-4 h-4 hover:text-red-400" />
                    </IconButton>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
