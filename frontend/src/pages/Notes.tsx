import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'
import { cn } from '@/lib/utils'
import {
  StickyNote, Plus, Search, Pin, Trash2, FileText, Clock, Eye, Edit3,
} from 'lucide-react'

interface Note {
  id: string; title: string; content: string; subject: string
  pinned: boolean; createdAt: Date; updatedAt: Date
}

const STORAGE_KEY = 'mentor-notes'

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Note[]
      return parsed.map(n => ({ ...n, createdAt: new Date(n.createdAt), updatedAt: new Date(n.updatedAt) }))
    }
  } catch { /* ignore */ }
  return []
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleFlush() { setNotes(loadNotes()) }
    window.addEventListener('auth:cache-flush', handleFlush)
    return () => window.removeEventListener('auth:cache-flush', handleFlush)
  }, [])

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id)
    }
  }, [notes, selectedId])

  const persistNotes = useCallback((updated: Note[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveNotes(updated), 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const selected = notes.find((n) => n.id === selectedId)
  const filtered = notes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  const handleTitleChange = (title: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) => n.id === selectedId ? { ...n, title, updatedAt: new Date() } : n)
      persistNotes(updated)
      return updated
    })
  }
  const handleContentChange = (content: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) => n.id === selectedId ? { ...n, content, updatedAt: new Date() } : n)
      persistNotes(updated)
      return updated
    })
  }
  const togglePin = () => {
    setNotes((prev) => {
      const updated = prev.map((n) => n.id === selectedId ? { ...n, pinned: !n.pinned } : n)
      persistNotes(updated)
      return updated
    })
  }
  const deleteNote = () => {
    if (!selectedId) return
    setDeleteConfirm(selectedId)
  }
  const confirmDelete = () => {
    if (!deleteConfirm) return
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== deleteConfirm)
      persistNotes(updated)
      return updated
    })
    setSelectedId(null)
    setDeleteConfirm(null)
  }
  const createNote = () => {
    const newNote: Note = { id: `note-${Date.now()}`, title: 'Untitled Note', content: '', subject: 'General', pinned: false, createdAt: new Date(), updatedAt: new Date() }
    setNotes((prev) => {
      const updated = [newNote, ...prev]
      persistNotes(updated)
      return updated
    })
    setSelectedId(newNote.id)
  }

  const wordCount = selected?.content.trim() ? selected.content.trim().split(/\s+/).length : 0

  return (
    <div className="h-full overflow-hidden">
      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogTitle>Delete Note?</DialogTitle>
          <p className="text-sm text-text-tertiary mt-1 mb-4">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-full flex flex-col lg:flex-row">
        <div className="h-1/3 min-h-[250px] lg:h-full w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Notes</h2>
              <Button variant="primary" size="sm" onClick={createNote}>
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notes..." className="input pl-9 text-xs" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <StickyNote className="w-8 h-8 text-text-tertiary mb-2" />
                <p className="text-xs text-text-tertiary">No notes yet</p>
              </div>
            ) : (
              <div className="p-2.5 space-y-2 interactive-group">
                {sorted.map((note) => (
                  <button key={note.id} onClick={() => setSelectedId(note.id)} className={cn(
                    'w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-300 group relative',
                    selectedId === note.id
                      ? 'bg-surface-150 border-[#00f2fe]/25 shadow-md'
                      : 'bg-white/3 border-white/5 hover:border-[#00f2fe]/20 hover:scale-[1.01] float-3d interactive-item'
                  )}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-text-tertiary shrink-0" />
                      <span className="flex-1 text-xs font-medium text-text-primary truncate">{note.title}</span>
                      {note.pinned && <Pin className="w-3 h-3 text-accent-light shrink-0" />}
                    </div>
                    <p className="text-xs text-text-tertiary mt-1 line-clamp-1">{note.content}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{note.subject}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[#05050b]/20">
          {selected ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-surface-100/40 backdrop-blur-sm relative z-10">
                <input value={selected.title} onChange={(e) => handleTitleChange(e.target.value)}
                  className="flex-1 text-base font-bold text-text-primary bg-transparent border-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00f2fe]/40 rounded px-2 py-1 -ml-2 tracking-tight" />
                <div className="flex items-center gap-1">
                  <IconButton label="Toggle preview" size="sm" onClick={() => setPreviewMode(!previewMode)} className="hover:bg-white/5">
                    {previewMode ? <Edit3 className="w-4 h-4 text-[#00f2fe]" /> : <Eye className="w-4 h-4" />}
                  </IconButton>
                  <IconButton label={selected.pinned ? 'Unpin' : 'Pin'} size="sm" onClick={togglePin} className="hover:bg-white/5">
                    <Pin className={cn('w-4 h-4 transition-colors', selected.pinned && 'text-[#00f2fe]')} />
                  </IconButton>
                  <IconButton label="Delete note" size="sm" onClick={deleteNote} className="hover:bg-white/5">
                    <Trash2 className="w-4 h-4 hover:text-red-400" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto scrollbar-thin max-w-4xl mx-auto w-full leading-relaxed">
                {previewMode ? (
                  <div className="prose dark:prose-invert max-w-none text-sm leading-loose">
                    <MarkdownRenderer content={selected.content} />
                  </div>
                ) : (
                  <textarea
                    value={selected.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full text-sm leading-relaxed bg-transparent border-none resize-none outline-none focus:ring-0 text-text-secondary placeholder-text-tertiary/50"
                    placeholder="Start writing in markdown..."
                  />
                )}
              </div>
              <div className="flex items-center gap-4 px-6 py-3 border-t border-border text-xs font-mono text-text-tertiary bg-surface-100/40 backdrop-blur-sm">
                <span>{wordCount} WORDS</span>
                <span>{selected.content.length} CHARS</span>
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3" /> {selected.updatedAt.toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5 text-[#10b981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> AUTO-SAVED
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="empty-state-icon"><StickyNote className="w-8 h-8 text-text-tertiary" /></div>
              <p className="text-sm font-bold text-text-primary mb-1">Select a note</p>
              <p className="text-xs text-text-tertiary">Choose a note from the sidebar or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
