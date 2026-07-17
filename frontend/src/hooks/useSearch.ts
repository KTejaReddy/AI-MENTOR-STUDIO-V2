import { useState, useCallback, useMemo } from 'react'
import { getAllSections } from '@/lib/section-registry'

export interface SearchResultItem {
  sectionId: string
  sectionTitle: string
  matches: { text: string; index: number }[]
  score: number
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])

  const performSearch = useCallback((q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }

    const lowerQuery = q.toLowerCase()
    const sections = getAllSections()
    const found: SearchResultItem[] = []

    sections.forEach((section) => {
      const el = document.getElementById(`section-content-${section.id}`)
      if (!el) return

      const text = el.textContent || ''
      const lowerText = text.toLowerCase()
      let index = 0
      const matches: { text: string; index: number }[] = []

      while (index < lowerText.length) {
        const pos = lowerText.indexOf(lowerQuery, index)
        if (pos === -1) break
        const start = Math.max(0, pos - 40)
        const end = Math.min(text.length, pos + lowerQuery.length + 40)
        const snippet =
          (start > 0 ? '...' : '') +
          text.slice(start, end) +
          (end < text.length ? '...' : '')
        matches.push({ text: snippet, index: pos })
        index = pos + 1
      }

      if (matches.length > 0) {
        found.push({
          sectionId: section.id,
          sectionTitle: section.title,
          matches,
          score: matches.length * 10 + (section.title.toLowerCase().includes(lowerQuery) ? 50 : 0),
        })
      }
    })

    found.sort((a, b) => b.score - a.score)
    setResults(found)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return { query, results, search: performSearch, clear: clearSearch }
}
