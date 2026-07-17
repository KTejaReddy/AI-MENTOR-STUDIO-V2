import { getAllSections, getVisibleSections } from './section-registry'
import type { TabSession } from '@/types/workspace'
import type { SubjectInfo } from '@/types/ai'

export interface GlobalSearchResult {
  id: string
  type: 'section' | 'topic' | 'subject' | 'bookmark' | 'note' | 'history' | 'tab'
  label: string
  description: string
  detail?: string
  score: number
  action?: () => void
}

export function searchSections(query: string): GlobalSearchResult[] {
  const q = query.toLowerCase()
  const sections = getAllSections()
  const results: GlobalSearchResult[] = []

  sections.forEach((s) => {
    if (s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
      results.push({
        id: `section-${s.id}`,
        type: 'section',
        label: s.title,
        description: s.description,
        score: s.title.toLowerCase().includes(q) ? 90 : 50,
      })
    }
  })

  return results.sort((a, b) => b.score - a.score)
}

export function searchTabs(tabs: TabSession[], query: string): GlobalSearchResult[] {
  const q = query.toLowerCase()
  return tabs
    .filter((t) => t.label.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q))
    .map((t) => ({
      id: `tab-${t.id}`,
      type: 'tab' as const,
      label: t.label,
      description: `${t.subject} — ${t.topic}`,
      score: t.label.toLowerCase().includes(q) ? 85 : 60,
    }))
    .sort((a, b) => b.score - a.score)
}

export function searchBookmarks(tabs: TabSession[], query: string): GlobalSearchResult[] {
  const q = query.toLowerCase()
  const results: GlobalSearchResult[] = []
  tabs.forEach((t) => {
    ;(t.memory?.bookmarks ?? []).forEach((b) => {
      if (b.label.toLowerCase().includes(q)) {
        results.push({
          id: `bookmark-${b.id}`,
          type: 'bookmark',
          label: b.label,
          description: `${t.subject} — ${t.topic}`,
          detail: b.type,
          score: 75,
        })
      }
    })
  })
  return results.sort((a, b) => b.score - a.score)
}

export function searchSubjects(subjects: SubjectInfo[], query: string): GlobalSearchResult[] {
  const q = query.toLowerCase()
  return subjects
    .filter((s) => s.name.toLowerCase().includes(q))
    .map((s) => ({
      id: `subject-${s.id}`,
      type: 'subject' as const,
      label: s.name,
      description: s.description ?? '',
      score: 80,
    }))
}

export function searchNotes(notes: { title: string; content: string; id: number }[], query: string): GlobalSearchResult[] {
  const q = query.toLowerCase()
  return notes
    .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    .map((n) => ({
      id: `note-${n.id}`,
      type: 'note' as const,
      label: n.title,
      description: n.content.slice(0, 120),
      score: 70,
    }))
}
