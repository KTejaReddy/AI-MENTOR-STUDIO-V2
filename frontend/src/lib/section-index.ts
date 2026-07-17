import {
  BookOpen,
  FileText,
  Lightbulb,
  List,
  Bookmark,
  BarChart3,
  Code2,
  BrainCircuit,
  HelpCircle,
  GitBranch,
  Puzzle,
  Image,
  Share2,
  Clock,
  MessageSquare,
  Hash,
  ClipboardList,
  Library,
  Globe,
  Eye,
  Move,
} from 'lucide-react'
import { registerSections } from './section-registry'
import type { SectionConfig } from '@/types/learning'

const base = {
  estimatedReadingTime: 5,
  difficulty: 'beginner' as const,
  bookmarkable: true,
  printable: true,
  exportable: true,
  collapsible: true,
  searchable: true,
  defaultVisible: true,
}

const sectionDefinitions: SectionConfig[] = [
  { id: 'explanation', title: 'Explanation', icon: BookOpen, description: 'Detailed concept explanation', order: 1, ...base },
  { id: 'case-study', title: 'Case Study', icon: FileText, description: 'Real-world application analysis', order: 2, ...base },
  { id: 'analogy', title: 'Analogy', icon: Lightbulb, description: 'Relatable metaphor for understanding', order: 3, ...base },
  { id: 'examples', title: 'Examples', icon: List, description: 'Worked-through examples', order: 4, ...base },
  { id: 'cheat-sheet', title: 'Cheat Sheet', icon: Bookmark, description: 'Quick reference summary', order: 5, ...base },
  { id: 'complexity', title: 'Complexity', icon: BarChart3, description: 'Time and space complexity analysis', order: 6, ...base },
  { id: 'code', title: 'Code', icon: Code2, description: 'Implementation in multiple languages', order: 7, ...base },
  { id: 'quiz', title: 'Quiz', icon: BrainCircuit, description: 'Interactive knowledge check', order: 8, ...base },
  { id: 'mcq', title: 'MCQ', icon: HelpCircle, description: 'Multiple choice questions', order: 9, ...base },
  { id: 'comparison', title: 'Comparison', icon: GitBranch, description: 'Compare with alternatives', order: 10, ...base },
  { id: 'problems', title: 'Problems', icon: Puzzle, description: 'Practice problems with solutions', order: 11, ...base },
  { id: 'figure', title: 'Figure', icon: Image, description: 'Visual diagram of the concept', order: 12, ...base },
  { id: 'process', title: 'Process', icon: Share2, description: 'Step-by-step process breakdown', order: 13, ...base },
  { id: 'flowchart', title: 'Flowchart', icon: Move, description: 'Algorithmic flowchart', order: 14, ...base },
  { id: 'timeline', title: 'Timeline', icon: Clock, description: 'Historical development timeline', order: 15, ...base },
  { id: 'faq', title: 'FAQ', icon: MessageSquare, description: 'Frequently asked questions', order: 16, ...base },
  { id: 'key-terms', title: 'Key Terms', icon: Hash, description: 'Glossary of important terms', order: 17, ...base },
  { id: 'prerequisites', title: 'Prerequisites', icon: ClipboardList, description: 'Required background knowledge', order: 18, ...base },
  { id: 'reference', title: 'Reference', icon: Library, description: 'Academic and technical references', order: 19, ...base },
  { id: 'resources', title: 'Resources', icon: Globe, description: 'Learning resources and links', order: 20, ...base },
  { id: 'image', title: 'Image', icon: Eye, description: 'Visual comparison chart', order: 21, ...base },
  { id: 'visual', title: 'Visual', icon: Eye, description: 'Visual structural comparison', order: 22, ...base },
  { id: 'interactive', title: 'Interactive', icon: Move, description: 'Interactive step-by-step walkthrough', order: 23, ...base },
]

export function initializeSections() {
  registerSections(sectionDefinitions)
}
