import type { ReadingMode, SectionConfig } from './learning'
import type { Difficulty, LearningMode } from './ai'

export type BookmarkType = 'topic' | 'section' | 'code' | 'formula' | 'interview'

export interface TabMemory {
  currentSectionId: string | null
  scrollPosition: number
  expandedSectionIds: string[]
  completedSectionIds: string[]
  openedCodeBlocks: string[]
  notes: string[]
  bookmarks: TabBookmark[]
}

export interface TabSession {
  id: string
  label: string
  subject: string
  topic: string
  difficulty: Difficulty
  learningMode: LearningMode
  memory: TabMemory
  aiLesson: any | null
  generationStatus: string
  createdAt: number
  lastAccessedAt: number
  studyTime: number
  pinned?: boolean
}

export interface TabBookmark {
  id: string
  type: BookmarkType
  label: string
  sectionId?: string
  code?: string
  formula?: string
  timestamp: number
}

export interface DashboardStats {
  totalStudyTime: number
  completedSections: number
  totalBookmarks: number
  topicCount: number
  mostStudiedSubject: string
  lastStudiedAt: number | null
  weeklyActivity: Record<string, number>
}

export interface DashRecentTopic {
  subject: string
  topic: string
  difficulty: Difficulty
  timestamp: number
  completed: number
  total: number
}

export interface DashPinnedLesson {
  tabId: string
  label: string
  subject: string
  topic: string
  pinnedAt: number
}

export interface CommandItem {
  id: string
  label: string
  description: string
  category: 'navigate' | 'action' | 'recent'
  icon?: string
  shortcut?: string
  action: () => void
}

export interface FollowUpAction {
  id: string
  label: string
  description: string
  prompt: string
}

export const FOLLOW_UP_ACTIONS: FollowUpAction[] = [
  { id: 'visual', label: 'Explain visually', description: 'Diagrams and visual explanations', prompt: 'Explain this topic using diagrams, flowcharts, and visual metaphors.' },
  { id: 'examples', label: 'More examples', description: 'Additional practical examples', prompt: 'Provide more detailed real-world examples of this concept.' },
  { id: 'mathematical', label: 'Explain mathematically', description: 'Formal mathematical treatment', prompt: 'Explain this topic with mathematical rigor, including formulas and derivations.' },
  { id: 'daily-life', label: 'Daily life analogy', description: 'Real-world analogies', prompt: 'Explain this concept using simple daily life analogies.' },
  { id: 'exam-questions', label: 'Exam questions', description: 'Practice exam problems', prompt: 'Generate exam-style questions about this topic with detailed answers.' },
  { id: 'interview-questions', label: 'Interview questions', description: 'Technical interview prep', prompt: 'Generate common technical interview questions about this topic.' },
  { id: 'mistakes', label: 'Common mistakes', description: 'Frequent errors and pitfalls', prompt: 'Explain the most common mistakes students make with this topic and how to avoid them.' },
  { id: 'cheat-sheet', label: 'Generate cheat sheet', description: 'Quick reference summary', prompt: 'Create a concise cheat sheet covering the key points of this topic.' },
  { id: 'applications', label: 'Practical applications', description: 'Real-world use cases', prompt: 'Describe practical real-world applications and use cases of this concept.' },
  { id: 'mini-project', label: 'Mini project', description: 'Build something to learn', prompt: 'Suggest a mini project that helps practice and understand this topic.' },
  { id: 'comparison', label: 'Compare with another topic', description: 'Side-by-side analysis', prompt: 'Compare this topic with related concepts, highlighting similarities and differences.' },
  { id: 'deep-dive', label: 'Deep dive', description: 'Advanced exploration', prompt: 'Provide an advanced, in-depth exploration of this topic beyond the basics.' },
]

export const BOOKMARK_ICONS: Record<BookmarkType, string> = {
  topic: 'Bookmark',
  section: 'FileText',
  code: 'Code',
  formula: 'FunctionSquare',
  interview: 'Briefcase',
}
