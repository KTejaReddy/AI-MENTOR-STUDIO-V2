// ===== Section Component Types (Direct JSON → Component mapping) =====

export interface SectionBase {
  type: string
  title: string
  content?: string
  metadata?: Record<string, any>
}

export interface GenericSection extends SectionBase {
  type: string
  content: string
}

export interface ExplanationSection extends SectionBase {
  type: 'explanation'
  content: string
}

export interface AnalogySection extends SectionBase {
  type: 'analogy'
  source: string
  target: string
  explanation: string
}

export interface CaseStudySection extends SectionBase {
  type: 'caseStudy'
  industry: string
  problem: string
  solution: string
  outcome: string
  keyTakeaway: string
}

export interface ExamplesSection extends SectionBase {
  type: 'examples'
  items: ExampleItem[]
}

export interface ExampleItem {
  problem: string
  solution: string
  explanation: string
}

export interface CheatSheetSection extends SectionBase {
  type: 'cheatSheet'
  keyPoints: string[]
  formulas: string[]
  mnemonics: string[]
}

export interface CodeSection extends SectionBase {
  type: 'code'
  language: string
  code: string
  explanation: string
}

export interface DiagramSection extends SectionBase {
  type: 'diagram'
  description: string
  ascii: string
}

export interface FormulaSection extends SectionBase {
  type: 'formula'
  notation: string
  formula: string
  derivation: string
}

export interface ComplexitySection extends SectionBase {
  type: 'complexity'
  bestCase: string
  averageCase: string
  worstCase: string
  spaceComplexity: string
  explanation: string
}

export interface VisualizationSection extends SectionBase {
  type: 'visualization'
  steps: string[]
}

export interface QuizSection extends SectionBase {
  type: 'quiz'
  questions: QuizItem[]
}

export interface QuizItem {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface InterviewSection extends SectionBase {
  type: 'interviewQuestions'
  questions: InterviewItem[]
}

export interface InterviewItem {
  question: string
  expectedAnswer: string
  difficulty: string
  tips: string
}

export interface ProjectsSection extends SectionBase {
  type: 'projects'
  projects: ProjectItem[]
}

export interface ProjectItem {
  title: string
  description: string
  skills: string[]
  difficulty: string
}

export interface MistakesSection extends SectionBase {
  type: 'mistakes'
  items: MistakeItem[]
}

export interface MistakeItem {
  mistake: string
  why: string
  correction: string
  tip: string
}

export interface PrerequisitesSection extends SectionBase {
  type: 'prerequisites'
  items: PrerequisiteItem[]
}

export interface PrerequisiteItem {
  topic: string
  importance: string
  suggestedResources: string
}

export interface ProofSection extends SectionBase {
  type: 'proof'
  statement: string
  proof: string
}

export interface AssignmentSection extends SectionBase {
  type: 'assignment'
  content: string
}

export interface CommonMistakesSection extends SectionBase {
  type: 'commonMistakes'
  content: string
}

export type SectionData =
  | ExplanationSection
  | AnalogySection
  | CaseStudySection
  | ExamplesSection
  | CheatSheetSection
  | CodeSection
  | DiagramSection
  | FormulaSection
  | ComplexitySection
  | VisualizationSection
  | QuizSection
  | InterviewSection
  | ProjectsSection
  | MistakesSection
  | PrerequisitesSection
  | ProofSection
  | AssignmentSection
  | CommonMistakesSection
  | GenericSection

// ===== Lesson Types =====

export interface LessonMetadata {
  title: string
  subject: string
  topic: string
  difficulty: string
  learningMode: string
  estimatedReadingTime: number
  prerequisites: string[]
  learningObjectives: string[]
  tags: string[]
  total_generation_time?: number
}

export interface LessonResources {
  keyTerms: KeyTermItem[]
  furtherReading: FurtherReadingItem[]
}

export interface KeyTermItem {
  term: string
  definition: string
  context: string
}

export interface FurtherReadingItem {
  title: string
  type: string
  description: string
}

export interface Lesson {
  metadata: LessonMetadata
  sections: Record<string, SectionData>
  resources: LessonResources
}

export interface MappedSection {
  type: string
  component: string
  props: SectionData
  title: string
}

export interface MappedLesson {
  metadata: {
    title: string
    summary: string
    subject: string
    topic: string
    difficulty: string
    estimatedReadingTime: number
    sectionsCount: number
    tags: string[]
    prerequisites: string[]
  }
  sections: MappedSection[]
  sidebarItems: { id: string; title: string; icon: string }[]
}

// ===== API Types =====

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type LearningMode = 'default' | 'quick' | 'deep' | 'interview' | 'project' | 'coding' | 'exam' | 'research' | 'quick_revision'

export interface GenerateRequest {
  subject: string
  topic: string
  difficulty: Difficulty
  learning_mode: LearningMode
  output_language?: string
  context?: string
  is_document?: boolean
  document_id?: string
}

export interface ChatRequest {
  message: string
  history?: { role: string; content: string }[]
  context?: string
}

export interface SseChunk {
  type: 'chunk'
  content: string
}

export interface SseAnalysis {
  type: 'analysis'
  data: {
    category: string
    confidence: number
    sections_planned: string[]
  }
}

export interface SseLesson {
  type: 'lesson'
  data: Lesson
  mapped: MappedLesson
  repaired: boolean
  cached: boolean
  total_elapsed?: number
}

export interface SseError {
  type: 'error'
  content: string
}

export interface SseRetry {
  type: 'retry'
  attempt: number
}

export interface SseDone {
  type: 'done'
  finish_reason: string
  usage?: Record<string, number>
}

export interface SseCancelled {
  type: 'cancelled'
}

export interface AssignmentSection extends SectionBase {
  type: 'assignment'
  content: string
}

export interface CommonMistakesSection extends SectionBase {
  type: 'commonMistakes'
  content: string
}

export interface SectionStatus {
  type: string
  status: 'waiting' | 'generating' | 'completed' | 'error'
}

export interface SseSectionDone {
  type: 'section_done'
  section_type: string
  section_data: any
  status: 'completed' | 'error' | 'failed'
  engine_id: string
  elapsed: number
  model: string
  key?: string
  retries?: number
}

export interface SseSectionStatus {
  type: 'section_status'
  section_type: string
  status: 'waiting' | 'generating' | 'completed' | 'error'
  title?: string
  engine_id?: string
}

export interface SseSectionChunk {
  type: 'section_chunk'
  section_type: string
  content: string
  engine_id?: string
}

export interface SseSectionClear {
  type: 'section_clear'
  section_type: string
  engine_id?: string
}

export interface SsePlan {
  type: 'plan'
  sections: string[]
  section_titles?: Record<string, string>
  topic_category?: string
  elapsed?: number
}

export interface SseSectionQueued {
  type: 'section_queued'
  section_type: string
}

export interface SseSectionRunning {
  type: 'section_running'
  section_type: string
}

export interface SseSectionRetry {
  type: 'section_retry'
  section_type: string
}

export interface SseSectionFallback {
  type: 'section_fallback'
  section_type: string
}

export interface SseSectionStarted {
  type: 'section_started'
  section_type: string
  title?: string
}

export type SseEvent = SseChunk | SseAnalysis | SseLesson | SseError | SseRetry | SseDone | SseCancelled | SseSectionDone | SseSectionStatus | SseSectionChunk | SseSectionClear | SsePlan | SseSectionQueued | SseSectionRunning | SseSectionRetry | SseSectionFallback | SseSectionStarted

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error' | 'cancelled'

export interface GenerationState {
  status: GenerationStatus
  lesson: Lesson | null
  mapped: MappedLesson | null
  error: string | null
  progress: number
  analysis: SseAnalysis['data'] | null
  sectionStatuses: Record<string, 'waiting' | 'generating' | 'completed' | 'error'>
}

export interface AiModel {
  id: string
  provider: string
  category: string
}

export interface TopicSuggestion {
  subject: string
  subject_id: string
  topic: string
}

export interface SubjectInfo {
  id: string
  name: string
  category: string
  description: string
  topics: string[]
}
