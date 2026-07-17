import type { TabSession, TabMemory } from '@/types/workspace'

const TAB_KEY = 'mentor-tabs'
const ACTIVE_KEY = 'mentor-active-tab'
const PINNED_KEY = 'mentor-pinned-lessons'
const RECENT_KEY = 'mentor-recent-topics'
const MEMORY_PREFIX = 'tab-memory-'

export function persistTabs(tabs: TabSession[]): void {
  try { localStorage.setItem(TAB_KEY, JSON.stringify(tabs)) } catch { /* quota exceeded */ }
}

export function loadTabs(): TabSession[] {
  try {
    const raw = localStorage.getItem(TAB_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function persistActiveTabId(id: string | null): void {
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(id)) } catch { /* noop */ }
}

export function loadActiveTabId(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function persistTabMemory(tabId: string, memory: TabMemory): void {
  try { localStorage.setItem(`${MEMORY_PREFIX}${tabId}`, JSON.stringify(memory)) } catch { /* noop */ }
}

export function loadTabMemory(tabId: string): TabMemory | null {
  try {
    const raw = localStorage.getItem(`${MEMORY_PREFIX}${tabId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function recordRecentTopic(subject: string, topic: string, difficulty: string, completed: number, total: number): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const recent = raw ? JSON.parse(raw) : []
    recent.unshift({ subject, topic, difficulty, timestamp: Date.now(), completed, total })
    if (recent.length > 20) recent.length = 20
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch { /* noop */ }
}

export function loadRecentTopics(): any[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function pinLesson(tabId: string, label: string, subject: string, topic: string): void {
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    const pinned = raw ? JSON.parse(raw) : []
    pinned.unshift({ tabId, label, subject, topic, pinnedAt: Date.now() })
    if (pinned.length > 10) pinned.length = 10
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinned))
  } catch { /* noop */ }
}

export function unpinLesson(tabId: string): void {
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    if (!raw) return
    const pinned = JSON.parse(raw).filter((p: any) => p.tabId !== tabId)
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinned))
  } catch { /* noop */ }
}

export function loadPinnedLessons(): any[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function cleanupStaleMemory(keepTabIds: Set<string>): void {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(MEMORY_PREFIX)) {
        const tabId = key.slice(MEMORY_PREFIX.length)
        if (!keepTabIds.has(tabId)) {
          localStorage.removeItem(key)
        }
      }
    }
  } catch { /* noop */ }
}
