import { useState, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LearningCard } from './LearningCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Briefcase, Eye, EyeOff, Bookmark, Lightbulb } from 'lucide-react'

interface InterviewQuestion {
  question: string
  answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  hint?: string
}

interface InterviewCardProps {
  questions?: InterviewQuestion[]
}

const sampleQuestions: InterviewQuestion[] = [
  {
    question: 'Validate whether a binary tree is a BST',
    answer: 'Use in-order traversal: traverse the tree and check if values are strictly increasing. Alternatively, use the min-max approach where each node must be within a valid range [min, max]. For the root, range is (-∞, +∞). For left child: range becomes (-∞, parent.val). For right child: range becomes (parent.val, +∞).',
    difficulty: 'medium',
    topic: 'Trees',
    hint: 'Think about what property a BST maintains between parent and child nodes.',
  },
  {
    question: 'Find the kth smallest element in a BST',
    answer: 'Perform an in-order traversal and keep a counter. When counter equals k, return the current node\'s value. This works because in-order traversal of a BST gives sorted order. Optimized approach: augment each node with a left subtree size count for O(log n) query.',
    difficulty: 'medium',
    topic: 'Trees',
    hint: 'What traversal gives you sorted order in a BST?',
  },
]

const difficultyColors = {
  easy: 'success' as const,
  medium: 'warning' as const,
  hard: 'error' as const,
}

export const InterviewCard = memo(function InterviewCard({
  questions = sampleQuestions,
}: InterviewCardProps) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [showHint, setShowHint] = useState<Record<number, boolean>>({})

  const toggleReveal = useCallback((index: number) => {
    setRevealed((prev) => ({ ...prev, [index]: !prev[index] }))
  }, [])

  const toggleHint = useCallback((index: number) => {
    setShowHint((prev) => ({ ...prev, [index]: !prev[index] }))
  }, [])

  return (
    <LearningCard
      icon={<Briefcase className="w-4 h-4 text-sky-400" />}
      title="Interview Questions"
    >
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface-150 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 text-xs font-bold text-sky-400">
                  Q{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary mb-1">{q.question}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={difficultyColors[q.difficulty]} size="sm">
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-text-tertiary">{q.topic}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHint(i)}
                    className="text-text-tertiary"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={revealed[i] ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => toggleReveal(i)}
                  >
                    {revealed[i] ? (
                      <><EyeOff className="w-4 h-4" /> Hide</>
                    ) : (
                      <><Eye className="w-4 h-4" /> Reveal</>
                    )}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {showHint[i] && q.hint && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3"
                  >
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      💡 {q.hint}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {revealed[i] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                      <p className="text-xs font-medium text-accent-light mb-2">Solution:</p>
                      <p className="text-xs text-text-secondary leading-relaxed">{q.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </LearningCard>
  )
})
