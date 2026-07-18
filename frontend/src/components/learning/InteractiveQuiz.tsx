/**
 * InteractiveQuiz — Parses AI-generated markdown quiz content and renders a
 * fully interactive question-card experience with scoring and navigation.
 *
 * Supports the backend's quiz format:
 *   ## Section A: Multiple Choice
 *   1. Question text
 *   A) / a) / A. / (A) option formats
 *   **Correct Answer: B** or **Correct Answer: [B]** or Correct Answer: B — explanation
 *   **Explanation:** / **Why:** free-text
 *
 * Falls back to MarkdownRenderer if no questions are parsed (e.g. streaming incomplete).
 */
import { useState, useCallback, useMemo, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check, X, ChevronLeft, ChevronRight, RotateCcw,
  ClipboardList, Trophy, Brain, Zap, Target,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  id: number
  question: string
  options: string[]           // e.g. ["Paris", "London", "Berlin", "Rome"]
  correctIndex: number        // 0-based index into shuffled options
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Trick'
  type: 'mcq'
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/** Extract MCQ questions from the backend's markdown quiz output. */
export function parseQuizMarkdown(markdown: string): ParsedQuestion[] {
  if (!markdown?.trim()) return []

  const questions: ParsedQuestion[] = []
  // Split on numbered question markers: "1.", "Q1.", "**1.**", "**Q1**", etc.
  const questionSplitter = /(?:^|\n)\s*(?:\*{0,2})(?:Q\s*)?(\d+)[\.\)]\s*(?:\*{0,2})/gm

  // Find all question-start positions
  const matches: Array<{ index: number; num: number }> = []
  let m: RegExpExecArray | null
  while ((m = questionSplitter.exec(markdown)) !== null) {
    matches.push({ index: m.index, num: parseInt(m[1], 10) })
  }

  if (matches.length === 0) return []

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : markdown.length
    const block = markdown.slice(start, end).trim()

    const parsed = parseQuestionBlock(block, questions.length + 1)
    if (parsed) questions.push(parsed)
  }

  return questions
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function parseQuestionBlock(block: string, id: number): ParsedQuestion | null {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  // --- Extract question text (everything before first option line) ---
  const optionLinePattern = /^(?:\*{0,2})?[A-Ea-e][\.\)]\s+.+/
  let questionEndIdx = lines.findIndex((l) => optionLinePattern.test(l))
  if (questionEndIdx === -1) return null

  // Remove the leading "1." / "Q1." numbering from the question line
  let questionText = lines
    .slice(0, questionEndIdx)
    .join(' ')
    .replace(/^\s*(?:\*{0,2})?(?:Q\s*)?\d+[\.\)]\s*(?:\*{0,2})?/, '')
    .replace(/\*\*/g, '')
    .trim()

  if (!questionText) return null

  // --- Extract options ---
  const optionLines: string[] = []
  let afterOptionsIdx = questionEndIdx

  while (afterOptionsIdx < lines.length) {
    const l = lines[afterOptionsIdx]
    if (optionLinePattern.test(l)) {
      // Strip leading letter marker: "A) ", "A. ", "(A) "
      const text = l.replace(/^(?:\*{0,2})?[A-Ea-e][\.\)]\s+(?:\*{0,2})?/, '').replace(/\*\*/g, '').trim()
      optionLines.push(text)
      afterOptionsIdx++
    } else {
      break
    }
  }

  if (optionLines.length < 2) return null

  // --- Extract correct answer ---
  const remainingBlock = lines.slice(afterOptionsIdx).join('\n')

  // Pattern: **Correct Answer: B** or **Correct Answer: [B] — explanation**
  const correctPattern = /\*{0,2}Correct\s+Answer\s*:\s*\[?([A-Ea-e])\]?(?:\s*[-—]\s*(.+?))?\*{0,2}/i
  const correctMatch = remainingBlock.match(correctPattern)
  if (!correctMatch) return null

  const correctLetter = correctMatch[1].toUpperCase()
  const correctIdx = OPTION_LETTERS.indexOf(correctLetter)
  if (correctIdx === -1 || correctIdx >= optionLines.length) return null

  // --- Extract explanation ---
  const explPattern = /(?:\*{0,2})(?:Explanation|Why(?:\s+others\s+are\s+wrong)?|Note)\s*:\s*\*{0,2}\s*(.+?)(?=\n\n|\n\s*\*{0,2}(?:Q|\d)|\Z)/is
  const explMatch = remainingBlock.match(explPattern)
  const inlineExplanation = correctMatch[2] ? correctMatch[2].trim() : ''
  const blockExplanation = explMatch ? explMatch[1].replace(/\n/g, ' ').trim() : ''
  const explanation = blockExplanation || inlineExplanation || 'See the correct answer above.'

  // --- Difficulty hint from surrounding context ---
  const difficultyHint = (block.match(/\b(Easy|Medium|Hard|Trick(?:y)?)\b/i)?.[1] || 'Medium') as string
  const difficultyMap: Record<string, ParsedQuestion['difficulty']> = {
    easy: 'Easy', medium: 'Medium', hard: 'Hard', trick: 'Trick', tricky: 'Trick',
  }
  const difficulty = difficultyMap[difficultyHint.toLowerCase()] ?? 'Medium'

  // --- Shuffle options while preserving correct answer mapping ---
  const indexed = optionLines.map((text, i) => ({ text, isCorrect: i === correctIdx }))
  for (let j = indexed.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [indexed[j], indexed[k]] = [indexed[k], indexed[j]]
  }
  const shuffledOptions = indexed.map((o) => o.text)
  const newCorrectIndex = indexed.findIndex((o) => o.isCorrect)

  return {
    id,
    question: questionText,
    options: shuffledOptions,
    correctIndex: newCorrectIndex,
    explanation,
    difficulty,
    type: 'mcq',
  }
}

// ─── Difficulty Badge Colors ──────────────────────────────────────────────────

const difficultyStyle: Record<string, string> = {
  Easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  Hard: 'text-red-400 bg-red-500/10 border-red-500/25',
  Trick: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
}

// ─── Single Question Card ─────────────────────────────────────────────────────

interface QuestionCardProps {
  question: ParsedQuestion
  questionNumber: number
  totalQuestions: number
  selected: number | null
  answered: boolean
  onSelect: (idx: number) => void
  onNext: () => void
  onPrev: () => void
  isFirst: boolean
  isLast: boolean
}

const QuestionCard = memo(function QuestionCard({
  question, questionNumber, totalQuestions, selected, answered,
  onSelect, onNext, onPrev, isFirst, isLast,
}: QuestionCardProps) {
  const progress = (questionNumber / totalQuestions) * 100

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#00f2fe] to-[#8b5cf6]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-tertiary">
          Q{questionNumber} / {totalQuestions}
        </span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider',
          difficultyStyle[question.difficulty],
        )}>
          {question.difficulty}
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <h4 className="text-sm font-semibold text-text-primary leading-relaxed mb-5">
            {question.question}
          </h4>

          {/* Options */}
          <div className="space-y-2.5">
            {question.options.map((opt, i) => {
              const isSelected = selected === i
              const isCorrect = i === question.correctIndex
              const showCorrect = answered && isCorrect
              const showWrong = answered && isSelected && !isCorrect

              return (
                <button
                  key={i}
                  onClick={() => onSelect(i)}
                  disabled={answered}
                  aria-label={`Option ${String.fromCharCode(65 + i)}: ${opt}`}
                  className={cn(
                    'w-full text-left min-h-[48px] px-4 py-3.5 rounded-xl text-xs font-medium transition-all border relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                    // Default
                    !answered && !isSelected && 'border-white/6 bg-white/2 text-text-secondary hover:border-[#00f2fe]/30 hover:text-text-primary hover:bg-[#00f2fe]/5',
                    // Selected but not yet answered
                    !answered && isSelected && 'border-[#00f2fe]/50 bg-[#00f2fe]/8 text-[#00f2fe]',
                    // Correct answer
                    showCorrect && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
                    // Wrong selection
                    showWrong && 'border-red-500/50 bg-red-500/10 text-red-300',
                    // Dimmed unselected after answering
                    answered && !isSelected && !isCorrect && 'opacity-35',
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                      !answered && !isSelected && 'bg-white/5 text-text-tertiary',
                      !answered && isSelected && 'bg-[#00f2fe] text-black',
                      showCorrect && 'bg-emerald-500 text-white',
                      showWrong && 'bg-red-500 text-white',
                      answered && !isSelected && !isCorrect && 'bg-white/5 text-text-tertiary',
                    )}>
                      {answered && isSelected
                        ? isCorrect
                          ? <Check className="w-3 h-3" />
                          : <X className="w-3 h-3" />
                        : String.fromCharCode(65 + i)
                      }
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.28 }}
                className="mt-4 overflow-hidden"
              >
                <div className={cn(
                  'p-4 rounded-xl border',
                  selected === question.correctIndex
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20',
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={selected === question.correctIndex ? 'success' : 'error'}
                      size="sm"
                      className="text-[9px] uppercase tracking-wider"
                    >
                      {selected === question.correctIndex ? '✓ Correct' : '✗ Incorrect'}
                    </Badge>
                    <span className="text-[10px] text-text-tertiary">
                      Correct answer: <strong className="text-text-primary">
                        {String.fromCharCode(65 + question.correctIndex)}) {question.options[question.correctIndex]}
                      </strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{question.explanation}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/6">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrev}
          disabled={isFirst}
          className="border-white/6 hover:border-white/12 gap-1.5 min-h-[48px]"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <span className="text-[10px] font-mono text-text-tertiary">
          {questionNumber} OF {totalQuestions}
        </span>
        {answered && (
          <Button
            variant="primary"
            size="sm"
            onClick={onNext}
            className="shadow-glow-accent gap-1.5 min-h-[48px]"
          >
            {isLast ? 'Finish Quiz' : 'Next Question'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
        {!answered && !isFirst && (
          <div className="w-24" /> /* spacer */
        )}
      </div>
    </div>
  )
})

// ─── Results Screen ───────────────────────────────────────────────────────────

interface ResultsScreenProps {
  score: number
  total: number
  onRestart: () => void
}

function ResultsScreen({ score, total, onRestart }: ResultsScreenProps) {
  const pct = Math.round((score / total) * 100)
  const passed = score >= Math.ceil(total * 0.6)
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'F'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center justify-center py-8 text-center gap-4"
    >
      <div className={cn(
        'w-20 h-20 rounded-2xl flex items-center justify-center border text-4xl font-black shadow-inner',
        passed
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
          : 'bg-red-500/10 border-red-500/25 text-red-400',
      )}>
        {grade}
      </div>

      <div>
        <h3 className="text-lg font-bold text-text-primary mb-1">Quiz Complete!</h3>
        <p className="text-sm text-text-tertiary">
          You scored <span className="text-[#00f2fe] font-bold">{score}</span> out of{' '}
          <span className="font-semibold text-text-primary">{total}</span> questions
        </p>
      </div>

      {/* Score ring */}
      <div className="relative w-28 h-28 my-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
            className="text-surface-200" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke={passed ? '#10b981' : '#ef4444'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-black', passed ? 'text-emerald-400' : 'text-red-400')}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-semibold">{score} Correct</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20">
          <X className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-300 font-semibold">{total - score} Incorrect</span>
        </div>
      </div>

      <Badge
        variant={passed ? 'success' : 'error'}
        size="default"
        className="text-[10px] uppercase font-bold px-4 py-1 tracking-widest mt-1"
      >
        {passed ? '🏆 PASSED' : '📚 NEEDS REVIEW'}
      </Badge>

      <Button
        variant="primary"
        size="sm"
        className="mt-4 shadow-glow-accent font-semibold gap-2"
        onClick={onRestart}
      >
        <RotateCcw className="w-4 h-4" />
        Retake Quiz
      </Button>
    </motion.div>
  )
}

// ─── Main InteractiveQuiz Component ──────────────────────────────────────────

interface InteractiveQuizProps {
  content: string   // raw markdown from backend
  isGenerating?: boolean
}

export const InteractiveQuiz = memo(function InteractiveQuiz({
  content,
  isGenerating = false,
}: InteractiveQuizProps) {
  const questions = useMemo(() => {
    return parseQuizMarkdown(content)
  }, [content])

  const [current, setCurrent] = useState(0)
  const [selections, setSelections] = useState<Record<number, number | null>>({})
  const [answered, setAnswered] = useState<Record<number, boolean>>({})
  const [showResults, setShowResults] = useState(false)

  // Reset when content changes significantly (new lesson)
  useEffect(() => {
    setCurrent(0)
    setSelections({})
    setAnswered({})
    setShowResults(false)
  }, [questions.length])

  const handleSelect = useCallback((idx: number) => {
    setCurrent((c) => {
      setSelections((prev) => ({ ...prev, [c]: idx }))
      setAnswered((prev) => ({ ...prev, [c]: true }))
      return c
    })
  }, [])

  const handleNext = useCallback(() => {
    setCurrent((c) => {
      if (c < questions.length - 1) return c + 1
      setShowResults(true)
      return c
    })
  }, [questions.length])

  const handlePrev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1))
  }, [])

  const handleRestart = useCallback(() => {
    setCurrent(0)
    setSelections({})
    setAnswered({})
    setShowResults(false)
  }, [])

  const score = useMemo(() => {
    return questions.reduce((acc, q, i) => {
      return acc + (selections[i] === q.correctIndex ? 1 : 0)
    }, 0)
  }, [questions, selections])

  // If still generating or no questions parsed, show markdown fallback
  if (isGenerating || questions.length === 0) {
    return (
      <div className="space-y-3">
        {questions.length === 0 && !isGenerating && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 mb-4">
            <Brain className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-300">
              Displaying quiz in document format. Interactive mode requires multiple choice questions.
            </p>
          </div>
        )}
        <MarkdownRenderer content={content} />
      </div>
    )
  }

  const q = questions[current]
  const currentSelected = selections[current] ?? null
  const currentAnswered = answered[current] ?? false

  return (
    <div className="space-y-4">
      {/* Quiz header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/15 border border-[#8b5cf6]/25 flex items-center justify-center">
            <ClipboardList className="w-3.5 h-3.5 text-[#8b5cf6]" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary">Interactive Quiz</p>
            <p className="text-[10px] text-text-tertiary">{questions.length} multiple choice questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            Score: <strong className="text-text-primary ml-0.5">{score}/{questions.length}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {Math.round((score / Math.max(questions.length, 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-surface-100 overflow-hidden">
        <div style={{ perspective: 1200 }} className="w-full">
          <motion.div
            animate={{ rotateY: showResults ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 16 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="w-full relative"
          >
            {/* Front: question */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="w-full p-6"
            >
              <QuestionCard
                question={q}
                questionNumber={current + 1}
                totalQuestions={questions.length}
                selected={currentSelected}
                answered={currentAnswered}
                onSelect={handleSelect}
                onNext={handleNext}
                onPrev={handlePrev}
                isFirst={current === 0}
                isLast={current === questions.length - 1}
              />
            </div>

            {/* Back: results */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                position: 'absolute',
                top: 0, left: 0, width: '100%',
              }}
              className="p-6"
            >
              <ResultsScreen score={score} total={questions.length} onRestart={handleRestart} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Question dots */}
      {!showResults && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
          {questions.map((_, i) => {
            const isAnswered = answered[i]
            const isCorrect = isAnswered && selections[i] === questions[i].correctIndex
            const isCurrent = i === current
            return (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to question ${i + 1}`}
                className={cn(
                  'w-2 h-2 rounded-full transition-all focus-visible:outline-none',
                  isCurrent && 'w-4 bg-[#00f2fe]',
                  !isCurrent && isAnswered && isCorrect && 'bg-emerald-500',
                  !isCurrent && isAnswered && !isCorrect && 'bg-red-500',
                  !isCurrent && !isAnswered && 'bg-surface-300 hover:bg-surface-400',
                )}
              />
            )
          })}
        </div>
      )}

      {/* Trophy CTA when all answered but not showing results */}
      {!showResults && Object.keys(answered).length === questions.length && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
        >
          <button
            onClick={() => setShowResults(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#00f2fe] text-white text-xs font-bold shadow-glow-accent hover:opacity-90 transition-opacity"
          >
            <Trophy className="w-4 h-4" />
            View Final Results
          </button>
        </motion.div>
      )}
    </div>
  )
})
