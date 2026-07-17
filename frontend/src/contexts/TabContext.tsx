import { createContext, useContext, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { TabSession, TabMemory } from '@/types/workspace'
import type { Difficulty, LearningMode } from '@/types/ai'

function tabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createTabMemory(): TabMemory {
  return {
    currentSectionId: null,
    scrollPosition: 0,
    expandedSectionIds: [],
    completedSectionIds: [],
    openedCodeBlocks: [],
    notes: [],
    bookmarks: [],
  }
}

export function createTabSession(overrides?: Partial<TabSession>): TabSession {
  const now = Date.now()
  return {
    id: tabId(),
    label: 'Untitled',
    subject: '',
    topic: '',
    difficulty: 'beginner' as Difficulty,
    learningMode: 'default' as LearningMode,
    memory: createTabMemory(),
    aiLesson: null,
    generationStatus: 'idle',
    createdAt: now,
    lastAccessedAt: now,
    studyTime: 0,
    pinned: false,
    ...overrides,
  }
}

function migrateOldNewLessonTab(t: TabSession): boolean {
  return !(t.label === '⭐ New Lesson' && !t.subject && !t.topic && !t.aiLesson)
}

interface TabContextValue {
  tabs: TabSession[]
  activeTabId: string | null
  activeTab: TabSession | null
  createTab: (overrides?: Partial<TabSession>) => string
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<TabSession>) => void
  updateMemory: (tabId: string, updates: Partial<TabMemory>) => void
  reopenLastClosed: () => void
  recentlyClosed: TabSession | null
  pinTab: (tabId: string, pinned: boolean) => void
}

export const TabContext = createContext<TabContextValue | null>(null)

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useLocalStorage<TabSession[]>('mentor-tabs', [])
  const [activeTabId, setActiveTabId] = useLocalStorage<string | null>('mentor-active-tab', null)
  const recentlyClosedRef = useRef<TabSession | null>(null)
  const studyTimersRef = useRef<Map<string, number>>(new Map())
  const tickRef = useRef<number | null>(null)

  // Migrate out old "New Lesson" tabs on init
  useEffect(() => {
    setTabs((prev) => prev.filter(migrateOldNewLessonTab))
  }, [])

  // Activate first tab if activeTabId is stale or null
  useEffect(() => {
    setTabs((prev) => {
      if (prev.length === 0) return prev
      if (!activeTabId || !prev.some((t) => t.id === activeTabId)) {
        setActiveTabId(prev[0].id)
      }
      return prev
    })
  }, [activeTabId, setActiveTabId, setTabs])

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, studyTime: t.studyTime + 1 } : t,
        ),
      )
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [activeTabId, setTabs])

  const createTab = useCallback(
    (overrides?: Partial<TabSession>) => {
      const tab = createTabSession(overrides)
      setTabs((prev) => [...prev, tab])
      setActiveTabId(tab.id)
      return tab.id
    },
    [setTabs, setActiveTabId],
  )

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.id === tabId)
        if (tab) recentlyClosedRef.current = tab
        return prev.filter((t) => t.id !== tabId)
      })
      setActiveTabId((prev) => {
        if (prev !== tabId) return prev
        const remaining = tabs.filter((t) => t.id !== tabId)
        if (remaining.length === 0) return null
        const idx = remaining.findIndex((t) => t.id === tabId)
        return remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0].id
      })
    },
    [setTabs, setActiveTabId, tabs],
  )

  const switchTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId)
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, lastAccessedAt: Date.now() } : t,
        ),
      )
    },
    [setActiveTabId, setTabs],
  )

  const updateTab = useCallback(
    (tabId: string, updates: Partial<TabSession>) => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...updates, lastAccessedAt: Date.now() } : t)))
    },
    [setTabs],
  )

  const updateMemory = useCallback(
    (tabId: string, updates: Partial<TabMemory>) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, memory: { ...t.memory, ...updates }, lastAccessedAt: Date.now() } : t,
        ),
      )
    },
    [setTabs],
  )

  const reopenLastClosed = useCallback(() => {
    if (recentlyClosedRef.current) {
      const tab = recentlyClosedRef.current
      recentlyClosedRef.current = null
      setTabs((prev) => [...prev, tab])
      setActiveTabId(tab.id)
    }
  }, [setTabs, setActiveTabId])

  const pinTab = useCallback(
    (tabId: string, pinned: boolean) => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, pinned } : t)))
    },
    [setTabs],
  )

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        createTab,
        closeTab,
        switchTab,
        updateTab,
        updateMemory,
        reopenLastClosed,
        recentlyClosed: recentlyClosedRef.current,
        pinTab,
      }}
    >
      {children}
    </TabContext.Provider>
  )
}

export function useTabs(): TabContextValue {
  const ctx = useContext(TabContext)
  if (!ctx) throw new Error('useTabs must be used within TabProvider')
  return ctx
}
