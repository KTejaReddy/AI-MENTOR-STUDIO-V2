import type { ComponentType, ReactNode } from 'react'

export interface SectionConfig {
  id: string
  title: string
  icon: ComponentType<{ className?: string }>
  description: string
  order: number
  estimatedReadingTime: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  bookmarkable: boolean
  printable: boolean
  exportable: boolean
  collapsible: boolean
  searchable: boolean
  defaultVisible: boolean
}

export interface SectionState {
  expanded: boolean
  completed: boolean
  loading: boolean
}

export interface SectionContextValue {
  sectionId: string
  state: SectionState
  config: SectionConfig
  onToggle: () => void
  onComplete: () => void
  onBookmark: () => void
  onPin: () => void
  onCopy: () => void
  onPrint: () => void
  onFullscreen: () => void
  onExport: () => void
}

export interface SectionComponentProps {
  sectionId: string
}

export type SectionComponent = ComponentType<SectionComponentProps>

export interface SectionDescriptor {
  config: SectionConfig
  component: SectionComponent
}

export type ReadingMode = 'normal' | 'focus' | 'reading' | 'presentation' | 'print' | 'zen'

export interface WorkspaceState {
  activeSectionId: string
  sectionStates: Record<string, SectionState>
  pinnedSectionIds: string[]
  hiddenSectionIds: string[]
  readingMode: ReadingMode
  bookmarkedSectionIds: string[]
  completedSectionIds: string[]
}

export interface LayoutState {
  sidebarWidth: number
  rightPanelWidth: number
  rightPanelOpen: boolean
  sidebarVisible: boolean
}

export interface SearchResult {
  sectionId: string
  sectionTitle: string
  matchText: string
  matchIndex: number
}

export interface ExportPayload {
  sectionId: string
  format: 'markdown' | 'pdf' | 'html'
  content: string
  title: string
}
