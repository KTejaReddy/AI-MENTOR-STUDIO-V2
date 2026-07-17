import { useCallback, useContext } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { TabContext } from '@/contexts/TabContext'

export type ReadingMode = 'normal' | 'focus' | 'reading' | 'presentation' | 'print' | 'zen'

export interface WorkspaceState {
  expandedSectionIds: string[]
  completedSectionIds: string[]
  bookmarkedSectionIds: string[]
  pinnedSectionIds: string[]
  hiddenSectionIds: string[]
  sectionOrder: string[]
  readingMode: ReadingMode
}

const defaultState: WorkspaceState = {
  expandedSectionIds: ['explanation'],
  completedSectionIds: [],
  bookmarkedSectionIds: [],
  pinnedSectionIds: [],
  hiddenSectionIds: [],
  sectionOrder: [],
  readingMode: 'normal',
}

export function useWorkspace() {
  const tabCtx = useContext(TabContext)
  const tabId = tabCtx?.activeTabId ?? 'global'
  const storageKey = `workspace-state-${tabId}`

  const [state, setState] = useLocalStorage<WorkspaceState>(storageKey, defaultState)

  const toggleSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      expandedSectionIds: prev.expandedSectionIds.includes(sectionId)
        ? prev.expandedSectionIds.filter((id) => id !== sectionId)
        : [...prev.expandedSectionIds, sectionId],
    }))
  }, [setState])

  const expandSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      expandedSectionIds: prev.expandedSectionIds.includes(sectionId)
        ? prev.expandedSectionIds
        : [...prev.expandedSectionIds, sectionId],
    }))
  }, [setState])

  const collapseSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      expandedSectionIds: prev.expandedSectionIds.filter((id) => id !== sectionId),
    }))
  }, [setState])

  const completeSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      completedSectionIds: prev.completedSectionIds.includes(sectionId)
        ? prev.completedSectionIds.filter((id) => id !== sectionId)
        : [...prev.completedSectionIds, sectionId],
    }))
  }, [setState])

  const bookmarkSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      bookmarkedSectionIds: prev.bookmarkedSectionIds.includes(sectionId)
        ? prev.bookmarkedSectionIds.filter((id) => id !== sectionId)
        : [...prev.bookmarkedSectionIds, sectionId],
    }))
  }, [setState])

  const pinSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      pinnedSectionIds: prev.pinnedSectionIds.includes(sectionId)
        ? prev.pinnedSectionIds.filter((id) => id !== sectionId)
        : [...prev.pinnedSectionIds, sectionId],
    }))
  }, [setState])

  const hideSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      hiddenSectionIds: prev.hiddenSectionIds.includes(sectionId)
        ? prev.hiddenSectionIds.filter((id) => id !== sectionId)
        : [...prev.hiddenSectionIds, sectionId],
    }))
  }, [setState])

  const setReadingMode = useCallback((readingMode: ReadingMode) => {
    setState((prev) => ({ ...prev, readingMode }))
  }, [setState])

  const expandAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      expandedSectionIds: [...prev.sectionOrder],
    }))
  }, [setState])

  const collapseAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      expandedSectionIds: [],
    }))
  }, [setState])

  const reorderSections = useCallback((newOrder: string[]) => {
    setState((prev) => ({ ...prev, sectionOrder: newOrder }))
  }, [setState])

  const getCompletionPercentage = useCallback(() => {
    if (state.sectionOrder.length === 0) return 0
    return Math.round((state.completedSectionIds.length / state.sectionOrder.length) * 100)
  }, [state.sectionOrder.length, state.completedSectionIds.length])

  return {
    state,
    toggleSection,
    expandSection,
    collapseSection,
    completeSection,
    bookmarkSection,
    pinSection,
    hideSection,
    setReadingMode,
    expandAll,
    collapseAll,
    reorderSections,
    getCompletionPercentage,
    tabId,
  }
}

export function useWorkspaceMemory() {
  const tabCtx = useContext(TabContext)
  const tabId = tabCtx?.activeTabId
  if (!tabId) throw new Error('useWorkspaceMemory requires active tab')
  const [memory, setMemory] = useLocalStorage(`tab-memory-${tabId}`, {
    notes: [] as string[],
    tabsBackup: null as any,
  })
  const addNote = useCallback((note: string) => {
    setMemory((prev) => ({ ...prev, notes: [...prev.notes, note] }))
  }, [setMemory])
  const removeNote = useCallback((index: number) => {
    setMemory((prev) => ({ ...prev, notes: prev.notes.filter((_, i) => i !== index) }))
  }, [setMemory])
  return { memory, addNote, removeNote }
}
