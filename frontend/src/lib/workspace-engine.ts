import type { WorkspaceState, SectionState, ReadingMode } from '@/types/learning'
import { getSectionConfig, getVisibleSections } from './section-registry'

const STORAGE_KEY = 'mentor-ai-workspace'

export function createInitialWorkspaceState(): WorkspaceState {
  const sections = getVisibleSections()
  const sectionStates: Record<string, SectionState> = {}

  for (const section of sections) {
    sectionStates[section.id] = {
      expanded: true,
      completed: false,
      loading: false,
    }
  }

  return {
    activeSectionId: sections[0]?.id || '',
    sectionStates,
    pinnedSectionIds: [],
    hiddenSectionIds: [],
    readingMode: 'normal',
    bookmarkedSectionIds: [],
    completedSectionIds: [],
  }
}

export function loadWorkspaceState(): WorkspaceState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

export function saveWorkspaceState(state: WorkspaceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function toggleSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  return {
    ...state,
    activeSectionId: sectionId,
    sectionStates: {
      ...state.sectionStates,
      [sectionId]: {
        ...state.sectionStates[sectionId],
        expanded: !state.sectionStates[sectionId]?.expanded,
      },
    },
  }
}

export function expandSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  return {
    ...state,
    sectionStates: {
      ...state.sectionStates,
      [sectionId]: { ...state.sectionStates[sectionId], expanded: true },
    },
  }
}

export function collapseSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  return {
    ...state,
    sectionStates: {
      ...state.sectionStates,
      [sectionId]: { ...state.sectionStates[sectionId], expanded: false },
    },
  }
}

export function completeSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  const completedSet = new Set(state.completedSectionIds)
  if (completedSet.has(sectionId)) {
    completedSet.delete(sectionId)
  } else {
    completedSet.add(sectionId)
  }
  return {
    ...state,
    completedSectionIds: Array.from(completedSet),
    sectionStates: {
      ...state.sectionStates,
      [sectionId]: { ...state.sectionStates[sectionId], completed: !state.sectionStates[sectionId]?.completed },
    },
  }
}

export function bookmarkSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  const set = new Set(state.bookmarkedSectionIds)
  if (set.has(sectionId)) set.delete(sectionId)
  else set.add(sectionId)
  return { ...state, bookmarkedSectionIds: Array.from(set) }
}

export function pinSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  const set = new Set(state.pinnedSectionIds)
  if (set.has(sectionId)) set.delete(sectionId)
  else set.add(sectionId)
  return { ...state, pinnedSectionIds: Array.from(set) }
}

export function hideSection(state: WorkspaceState, sectionId: string): WorkspaceState {
  const set = new Set(state.hiddenSectionIds)
  set.add(sectionId)
  return { ...state, hiddenSectionIds: Array.from(set) }
}

export function setReadingMode(state: WorkspaceState, mode: ReadingMode): WorkspaceState {
  return { ...state, readingMode: mode }
}

export function expandAll(state: WorkspaceState): WorkspaceState {
  const sectionStates = { ...state.sectionStates }
  for (const id of Object.keys(sectionStates)) {
    sectionStates[id] = { ...sectionStates[id], expanded: true }
  }
  return { ...state, sectionStates }
}

export function collapseAll(state: WorkspaceState): WorkspaceState {
  const sectionStates = { ...state.sectionStates }
  for (const id of Object.keys(sectionStates)) {
    sectionStates[id] = { ...sectionStates[id], expanded: false }
  }
  return { ...state, sectionStates }
}

export function getCompletionPercentage(state: WorkspaceState): number {
  const total = Object.keys(state.sectionStates).length
  if (total === 0) return 0
  return Math.round((state.completedSectionIds.length / total) * 100)
}

export function getSectionOrder(state: WorkspaceState): string[] {
  const allIds = Object.keys(state.sectionStates)
  const pinned = allIds.filter((id) => state.pinnedSectionIds.includes(id))
  const unpinned = allIds.filter((id) => !state.pinnedSectionIds.includes(id))
  return [...pinned, ...unpinned]
}
