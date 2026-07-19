import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RefreshCw, Loader2, Sparkles, CheckCircle2, AlertTriangle, GraduationCap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/api/client'
import { fetchTopicSuggestions } from '@/lib/api/ai'
import { fetchBranches, fetchSubjects } from '@/lib/api/curriculum'
import type { GenerateRequest, GenerationStatus, TopicSuggestion } from '@/types/ai'
import type { BranchSummary, SubjectSummary } from '@/lib/api/curriculum'
import { CustomSelect } from '@/components/ui/select'

interface GenerationPanelProps {
  status: GenerationStatus
  onGenerate: (request: GenerateRequest) => void
  onCancel: () => void
  onReset: () => void
  errorMessage?: string | null
  onWidthChange?: (width: number) => void
  isDialog?: boolean
}

interface TopicValidation {
  valid: boolean
  score: number
  matched_subject?: { id: string; name: string } | null
  reason?: string
  alternatives?: { id: string; name: string; branch: string }[]
}

const difficulties = [
  { value: 'beginner' as const, label: 'Beginner' },
  { value: 'intermediate' as const, label: 'Intermediate' },
  { value: 'advanced' as const, label: 'Advanced' },
  { value: 'expert' as const, label: 'Expert' },
]

const learningModes = [
  { value: 'default' as const, label: 'Standard' },
  { value: 'quick' as const, label: 'Quick' },
  { value: 'deep' as const, label: 'Deep Dive' },
  { value: 'interview' as const, label: 'Interview' },
  { value: 'project' as const, label: 'Project' },
  { value: 'coding' as const, label: 'Coding' },
  { value: 'exam' as const, label: 'Exam' },
  { value: 'quick_revision' as const, label: 'Revision' },
]

function StepBadge({ number }: { number: number }) {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent-light text-xs font-bold shrink-0">
      {number}
    </span>
  )
}

function validateTopicLocally(topic: string): boolean {
  return topic.trim().length >= 2
}

export const GenerationPanel = memo(function GenerationPanel({
  status,
  onGenerate,
  onCancel,
  onReset,
}: GenerationPanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [branchId, setBranchId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate')
  const [learningMode, setLearningMode] = useState<'default' | 'quick' | 'deep' | 'interview' | 'project' | 'coding' | 'exam' | 'research' | 'quick_revision'>('default')

  const [branches, setBranches] = useState<BranchSummary[]>([])
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('recent-topics') || '[]') } catch { return [] }
  })
  const [topicValidation, setTopicValidation] = useState<TopicValidation | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const validateRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const selectedBranch = branches.find(b => b.branch_id === branchId)
  const selectedSubject = subjects.find(s => s.id === subjectId)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
  }, [])

  useEffect(() => {
    function handleFlush() {
      try { setRecentSearches(JSON.parse(localStorage.getItem('recent-topics') || '[]')) }
      catch { setRecentSearches([]) }
    }
    window.addEventListener('auth:cache-flush', handleFlush)
    return () => window.removeEventListener('auth:cache-flush', handleFlush)
  }, [])

  useEffect(() => {
    if (!branchId) {
      setSubjects([])
      setSubjectId('')
      return
    }
    setSubjectId('')
    fetchSubjects(branchId).then(setSubjects).catch(() => setSubjects([]))
  }, [branchId])

  useEffect(() => {
    if (topic.length < 2) {
      setSuggestions([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const results = await fetchTopicSuggestions(topic)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [topic])

  useEffect(() => {
    if (topic.length < 3 || !subjectId) {
      setTopicValidation(null)
      return
    }
    clearTimeout(validateRef.current)
    validateRef.current = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/curriculum/validate/subject?subject_id=${encodeURIComponent(subjectId)}&topic=${encodeURIComponent(topic)}`)
        if (res.ok) {
          const data = await res.json()
          setTopicValidation(data)
        }
      } catch {}
    }, 500)
    return () => clearTimeout(validateRef.current)
  }, [topic, subjectId])

  const saveRecentSearch = useCallback((search: string) => {
    setRecentSearches((prev) => {
      const next = [search, ...prev.filter((s) => s !== search)].slice(0, 5)
      localStorage.setItem('recent-topics', JSON.stringify(next))
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!topic.trim() || !subjectId) return
      saveRecentSearch(topic.trim())
      onGenerate({
        subject: selectedSubject?.name || '',
        topic: topic.trim(),
        difficulty,
        learning_mode: learningMode,
      })
      setShowSuggestions(false)
    },
    [topic, difficulty, learningMode, onGenerate, saveRecentSearch, selectedSubject, subjectId],
  )

  const selectSuggestion = useCallback((suggestion: TopicSuggestion) => {
    setTopic(suggestion.topic)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [])

  const selectRecentSearch = useCallback((search: string) => {
    setTopic(search)
    setShowSuggestions(false)
  }, [])

  const isGenerating = status === 'generating'
  const canGenerate = branchId && subjectId && topic.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-border overflow-hidden bg-surface shadow-card"
    >
      <div className="px-4 md:px-6 py-3 border-b border-border flex items-center gap-2 bg-surface-50/60">
        <GraduationCap className="w-4 h-4 text-accent-light" />
        <span className="text-xs font-semibold text-text-primary">Generate Lesson</span>
      </div>

      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepBadge number={1} />
            <label className="text-xs font-semibold text-text-primary tracking-wide">Branch</label>
          </div>
          <CustomSelect
            value={branchId}
            onChange={setBranchId}
            options={branches.map((b) => ({ value: b.branch_id, label: b.name }))}
            placeholder="Select a branch..."
            disabled={isGenerating}
            searchable
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepBadge number={2} />
            <label className="text-xs font-semibold text-text-primary tracking-wide">Subject</label>
          </div>
          <CustomSelect
            value={subjectId}
            onChange={setSubjectId}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            placeholder={branchId ? 'Select a subject...' : 'Select a branch first'}
            disabled={isGenerating || !branchId}
            searchable
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepBadge number={3} />
            <label className="text-xs font-semibold text-text-primary tracking-wide">Topic</label>
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
              }}
              onFocus={() => {
                setShowSuggestions(suggestions.length > 0);
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="e.g. Binary Search Trees, Merge Sort, Deadlock"
              className={cn(
                'w-full px-3 py-2 min-h-[48px] rounded-xl border text-[15px] text-text-primary placeholder:text-text-tertiary outline-none transition-all',
                topicValidation && !topicValidation.valid ? 'border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20' : 'border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/20',
                !subjectId ? 'bg-surface-150/50 border-border/50 cursor-not-allowed' : 'bg-surface-200/80',
              )}
              disabled={isGenerating || !subjectId}
            />
            <AnimatePresence>
              {topicValidation && topic.length >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    'absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs',
                    topicValidation.valid ? 'text-emerald-400' : 'text-amber-400',
                  )}
                >
                  {topicValidation.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-0 right-0 mt-1 bg-surface-100 border border-border rounded-lg shadow-elevated z-20 max-h-48 overflow-y-auto"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-150 hover:text-text-primary transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3 text-accent-light shrink-0" />
                      <span className="font-medium text-accent-light">{s.topic}</span>
                      <span className="text-text-tertiary ml-auto">in {s.subject}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!topic && recentSearches.length > 0 && !showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-100 border border-border rounded-lg shadow-elevated z-20">
                <p className="px-3 py-1.5 text-xs text-text-tertiary uppercase tracking-wider">Recent</p>
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => selectRecentSearch(s)}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-150 hover:text-text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {topicValidation && !topicValidation.valid && topicValidation.alternatives && topicValidation.alternatives.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <p className="text-xs text-amber-600 dark:text-amber-300 mb-1">Did you mean one of these subjects?</p>
                <div className="flex flex-wrap gap-1">
                  {topicValidation.alternatives.map((alt: { id: string; name: string; branch: string }, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSubjectId(alt.id)}
                      className="px-2 py-1 text-xs rounded bg-amber-500/10 text-amber-700 dark:text-amber-200 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      {alt.name} <span className="text-amber-400/60">({alt.branch})</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <StepBadge number={4} />
            <label className="text-xs font-semibold text-text-primary tracking-wide">Generate</label>
          </div>
          {isGenerating ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-full flex items-center justify-center gap-1.5 px-4 min-h-[48px] py-2.5 rounded-xl bg-red-500/15 text-red-300 border border-red-500/25 text-sm font-medium hover:bg-red-500/25 transition-all active:scale-[0.98]"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Stop Generation
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canGenerate}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-4 min-h-[48px] py-2.5 rounded-xl text-sm font-bold transition-all border',
                canGenerate
                  ? 'bg-accent/20 text-accent-light border-accent/30 hover:bg-accent/30 hover:shadow-glow-sm active:scale-[0.98] cursor-pointer'
                  : 'bg-surface-200/50 text-text-tertiary border-border cursor-not-allowed opacity-50',
              )}
            >
              <Send className="w-3.5 h-3.5" /> Generate Lesson
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {status === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between"
          >
            <span className="text-xs text-emerald-300">Lesson generated successfully</span>
            <button onClick={onReset} className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors">
              <RefreshCw className="w-3 h-3" /> New Topic
            </button>
          </motion.div>
        )}

        {status === 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20"
          >
            <span className="text-xs text-amber-300">Generation cancelled</span>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-4 py-2 bg-red-500/10 border-t border-red-500/20"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-red-300 font-medium">Generation failed</span>
              <button onClick={onReset} className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
            {errorMessage && (
              <p className="text-xs text-red-400/80 leading-relaxed break-all">{errorMessage}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
