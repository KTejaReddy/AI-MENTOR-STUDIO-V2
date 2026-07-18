import { memo, useRef, useEffect, useState } from 'react'
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResultItem } from '@/hooks/useSearch'

interface SearchOverlayProps {
  query: string
  results: SearchResultItem[]
  visible: boolean
  onQueryChange: (query: string) => void
  onClose: () => void
  onSelectResult: (sectionId: string) => void
}

export const SearchOverlay = memo(function SearchOverlay({
  query,
  results,
  visible,
  onQueryChange,
  onClose,
  onSelectResult,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
    setSelectedIndex(-1)
  }, [visible])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      onSelectResult(results[selectedIndex].sectionId)
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-surface-100 border border-border rounded-xl shadow-elevated overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search within this topic..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {query && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-8">No results found</p>
            ) : (
              <div className="space-y-1">
                {results.map((result, i) => (
                  <button
                    key={result.sectionId + i}
                    onClick={() => { onSelectResult(result.sectionId); onClose() }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors',
                      i === selectedIndex ? 'bg-accent/10 border border-accent/20' : 'bg-surface-150 border border-border hover:border-accent/20'
                    )}
                  >
                    <p className="text-xs font-medium text-accent-light mb-1">{result.sectionTitle}</p>
                    <p className="text-xs text-text-tertiary">{result.matches.length} match{result.matches.length > 1 ? 'es' : ''}</p>
                    {result.matches.slice(0, 2).map((match, mi) => (
                      <p key={mi} className="text-xs text-text-secondary mt-1 font-mono leading-relaxed">
                        {match.text}
                      </p>
                    ))}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {query && results.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-xs text-text-tertiary">
            <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /> <ArrowDown className="w-3 h-3" /> Navigate</span>
            <span className="flex items-center gap-1">↵ Select</span>
            <span className="flex items-center gap-1">Esc Close</span>
          </div>
        )}
      </div>
    </div>
  )
})
