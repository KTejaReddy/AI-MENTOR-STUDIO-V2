import { useState, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LearningCard } from './LearningCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClipboardList, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Question {
  id: number
  question: string
  options: string[]
  correct: number
  explanation: string
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: 'What is the time complexity of searching in a balanced BST?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correct: 1,
    explanation: 'In a balanced BST, each comparison eliminates half of the remaining tree, resulting in O(log n) comparisons for search operations.',
  },
  {
    id: 2,
    question: 'Which traversal of a BST produces elements in sorted order?',
    options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
    correct: 1,
    explanation: 'In-order traversal (Left → Root → Right) visits nodes in non-decreasing order, which is the sorted order of elements.',
  },
  {
    id: 3,
    question: 'What happens when you insert elements in sorted order into a standard BST?',
    options: ['Tree becomes balanced', 'Tree degenerates to linked list', 'Insert fails', 'Tree doubles in size'],
    correct: 1,
    explanation: 'Inserting sorted elements creates a skewed tree where each node has only one child, degenerating into a linked list with O(n) operations.',
  },
]

export const QuizCard = memo(function QuizCard() {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const question = sampleQuestions[current]
  const progress = ((current + 1) / sampleQuestions.length) * 100

  const handleSelect = useCallback((index: number) => {
    if (answered) return
    setSelected(index)
    setAnswered(true)
    if (index === question.correct) {
      setScore((s) => s + 1)
    }
  }, [answered, question])

  const handleNext = useCallback(() => {
    if (current < sampleQuestions.length - 1) {
      setCurrent((c) => c + 1)
      setSelected(null)
      setAnswered(false)
    } else {
      setShowResults(true)
    }
  }, [current])

  const handlePrevious = useCallback(() => {
    if (current > 0) {
      setCurrent((c) => c - 1)
      setSelected(null)
      setAnswered(false)
    }
  }, [current])

  const handleRestart = useCallback(() => {
    setCurrent(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setShowResults(false)
  }, [])

  return (
    <LearningCard
      icon={<ClipboardList className="w-4 h-4 text-[#8b5cf6]" />}
      title={showResults ? "Quiz Results" : `Quiz: Question ${current + 1} of ${sampleQuestions.length}`}
    >
      <div style={{ perspective: 1200 }} className="w-full min-h-[350px] relative">
        <motion.div
          animate={{ rotateY: showResults ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 16 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="w-full h-full min-h-[350px] relative"
        >
          {/* FRONT FACE: Quiz Questions */}
          <div
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            className="w-full h-full"
          >
            <div className="space-y-4">
              <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#00f2fe] to-[#8b5cf6]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <h4 className="text-sm font-bold text-text-primary mb-4 leading-relaxed">{question.question}</h4>

                  <div className="space-y-2.5">
                    {question.options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(i)}
                        disabled={answered}
                        className={cn(
                          'w-full text-left px-4 py-3.5 rounded-xl text-xs font-semibold transition-all border relative overflow-hidden',
                          selected === i && answered && i === question.correct && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
                          selected === i && answered && i !== question.correct && 'border-red-500/50 bg-red-500/10 text-red-400',
                          selected === i && !answered && 'border-[#00f2fe]/40 bg-[#00f2fe]/10 text-[#00f2fe]',
                          selected !== i && 'border-white/5 hover:border-[#00f2fe]/20 text-text-secondary hover:text-text-primary bg-white/3',
                          answered && selected !== i && 'opacity-40'
                        )}
                      >
                        <div className="flex items-center gap-3 relative z-10">
                          <span className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0',
                            selected === i && answered && i === question.correct && 'bg-emerald-500 text-white',
                            selected === i && answered && i !== question.correct && 'bg-red-500 text-white',
                            selected === i && !answered && 'bg-[#00f2fe] text-black font-bold',
                            selected !== i && 'bg-white/5 text-text-tertiary'
                          )}>
                            {answered && selected === i
                              ? i === question.correct
                                ? <Check className="w-3 h-3" />
                                : <X className="w-3 h-3" />
                              : String.fromCharCode(65 + i)
                            }
                          </span>
                          {option}
                        </div>
                      </button>
                    ))}
                  </div>

                  {answered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={selected === question.correct ? 'success' : 'error'} size="sm" className="text-[9px]">
                          {selected === question.correct ? 'Correct Explanation' : 'Incorrect Explanation'}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-tertiary leading-relaxed">{question.explanation}</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <Button variant="secondary" size="sm" onClick={handlePrevious} disabled={current === 0} className="border-white/5 hover:border-white/10">
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-[10px] font-mono text-text-tertiary">
                  {current + 1} OF {sampleQuestions.length}
                </span>
                {answered && (
                  <Button variant="primary" size="sm" onClick={handleNext} className="shadow-glow-accent">
                    {current < sampleQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* BACK FACE: Quiz Results */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#00f2fe]/10 border border-[#8b5cf6]/20 flex items-center justify-center mb-5 shadow-inner">
              <ClipboardList className="w-8 h-8 text-[#8b5cf6]" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2">Quiz Complete!</h3>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-5xl font-extrabold text-[#00f2fe] drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">{score}</span>
              <span className="text-lg text-text-tertiary font-mono">/ {sampleQuestions.length}</span>
            </div>
            <Badge variant={score >= 2 ? 'success' : 'error'} size="default" className="text-[10px] uppercase font-mono px-3.5 py-1">
              {score >= 2 ? 'PASSED STATUS' : 'TRY AGAIN STATUS'}
            </Badge>
            <Button variant="primary" size="sm" className="mt-8 shadow-glow-accent font-semibold" onClick={handleRestart}>
              Restart Quiz Activity
            </Button>
          </div>
        </motion.div>
      </div>
    </LearningCard>
  )
})
