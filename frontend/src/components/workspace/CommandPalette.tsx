import { memo, useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { CommandItem } from '@/types/workspace'

interface CommandPaletteProps {
  open: boolean
  query: string
  onQueryChange: (q: string) => void
  commands: CommandItem[]
  onClose: () => void
  onExecute: (command: CommandItem) => void
}

export const CommandPalette = memo(function CommandPalette({
  open,
  query,
  onQueryChange,
  commands,
  onClose,
  onExecute,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (open) {
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, commands.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && commands[selectedIndex]) { onExecute(commands[selectedIndex]); return }
    },
    [commands, selectedIndex, onClose, onExecute],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-100 border border-border rounded-xl shadow-2xl overflow-hidden" role="listbox">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { onQueryChange(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, topics, subjects..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-tertiary"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-text-tertiary bg-surface-200 rounded border border-border">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto" role="listbox">
          {commands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">No results found</div>
          ) : (
            commands.map((cmd, idx) => (
              <button
                key={cmd.id}
                role="option"
                aria-selected={idx === selectedIndex}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  idx === selectedIndex ? 'bg-accent/10 text-accent-light' : 'text-text-primary hover:bg-surface-200',
                )}
                onClick={() => onExecute(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="w-6 h-6 flex items-center justify-center rounded bg-surface-200 text-text-tertiary text-xs">
                  {cmd.icon?.[0] ?? '>'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{cmd.label}</div>
                  <div className="text-xs text-text-tertiary truncate">{cmd.description}</div>
                </div>
                {cmd.shortcut && (
                  <kbd className="shrink-0 px-1.5 py-0.5 text-xs text-text-tertiary bg-surface-200 rounded border border-border">{cmd.shortcut}</kbd>
                )}
                <span className="text-xs text-text-tertiary uppercase tracking-wider shrink-0">{cmd.category}</span>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-xs text-text-tertiary">
          <span><kbd className="px-1 py-0.5 bg-surface-200 rounded border border-border">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-surface-200 rounded border border-border">Enter</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 bg-surface-200 rounded border border-border">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
})
