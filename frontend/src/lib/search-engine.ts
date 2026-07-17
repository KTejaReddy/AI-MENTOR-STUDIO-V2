import type { SearchResult } from '@/types/learning'
import { getSectionConfig } from './section-registry'
import { useMemo, useState, useCallback } from 'react'

export function searchSections(
  query: string,
  sectionContents: Record<string, string>,
): SearchResult[] {
  if (!query.trim()) return []

  const lowerQuery = query.toLowerCase()
  const results: SearchResult[] = []

  for (const [sectionId, content] of Object.entries(sectionContents)) {
    const config = getSectionConfig(sectionId)
    if (!config || !config.searchable) continue

    let startIndex = 0
    let matchIndex = 0
    const lowerContent = content.toLowerCase()

    while (matchIndex < 5) {
      const idx = lowerContent.indexOf(lowerQuery, startIndex)
      if (idx === -1) break

      const start = Math.max(0, idx - 40)
      const end = Math.min(content.length, idx + query.length + 40)
      const matchText =
        (start > 0 ? '...' : '') +
        content.slice(start, end) +
        (end < content.length ? '...' : '')

      results.push({
        sectionId,
        sectionTitle: config.title,
        matchText,
        matchIndex: idx,
      })

      startIndex = idx + 1
      matchIndex++
    }
  }

  return results.sort((a, b) => a.matchIndex - b.matchIndex)
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const search = useCallback(
    (q: string, contents: Record<string, string>) => {
      setQuery(q)
      setResults(searchSections(q, contents))
    },
    [],
  )

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return { query, results, search, clear }
}
