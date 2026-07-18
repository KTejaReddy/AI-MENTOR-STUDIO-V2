import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'
import {
  Bookmark, Search, ExternalLink, Folder, Trash2, Grid3X3, List, X,
} from 'lucide-react'

interface BookmarkItem {
  title: string; subject: string; tags: string[]; added: string
}

export function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const allTags = Array.from(new Set(bookmarks.flatMap(b => b.tags))).sort()

  const filtered = bookmarks.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = !tagFilter || b.tags.includes(tagFilter)
    return matchesSearch && matchesTag
  })

  const handleDelete = (title: string) => {
    setBookmarks(prev => prev.filter(b => b.title !== title))
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Bookmarks</h1>
              <p className="text-sm text-text-tertiary">Saved resources and references</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bookmarks..." className="input pl-9" />
              </div>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-surface-200 text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-100')} aria-label="Grid view">
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={cn('p-2 border-l border-border transition-colors', viewMode === 'list' ? 'bg-surface-200 text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-100')} aria-label="List view">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {allTags.map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all', tagFilter === tag ? 'bg-accent/15 text-accent-light border border-accent/20' : 'bg-surface-150 text-text-tertiary border border-border hover:border-border-light hover:text-text-secondary')}>
                  {tag}
                </button>
              ))}
              {tagFilter && (
                <button onClick={() => setTagFilter(null)} className="px-2 py-1 rounded-lg text-[10px] text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-0.5">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="empty-state-icon">
                <Bookmark className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">No bookmarks yet</h3>
              <p className="text-xs text-text-tertiary">Save important concepts for quick access</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 interactive-group">
                    {filtered.map((bookmark, i) => (
                      <motion.div key={bookmark.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className="glass float-3d interactive-item p-5 group h-full rounded-2xl border border-white/5 shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-[#00f2fe]/20 hover:shadow-[0_0_20px_rgba(0,242,254,0.08)] flex flex-col justify-between">
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#00f2fe]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          <div className="flex items-start gap-3.5 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                              <Folder className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-text-primary truncate mb-1 group-hover:text-[#00f2fe] transition-colors">{bookmark.title}</p>
                              <p className="text-[9px] font-mono text-text-tertiary mb-2 uppercase tracking-wide">{bookmark.subject} · {bookmark.added}</p>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {bookmark.tags.map((tag) => <Badge key={tag} variant="surface" size="sm" className="text-[8px] bg-white/3 border-white/5">{tag}</Badge>)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 justify-end mt-4 pt-3 border-t border-white/5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 md:translate-y-1 md:group-hover:translate-y-0 relative z-10">
                            <IconButton label="Open" size="sm" className="hover:bg-white/5"><ExternalLink className="w-3.5 h-3.5 text-[#00f2fe]" /></IconButton>
                            <IconButton label="Delete" size="sm" onClick={() => handleDelete(bookmark.title)} className="hover:bg-white/5"><Trash2 className="w-3.5 h-3.5 hover:text-red-400" /></IconButton>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((bookmark, i) => (
                      <motion.div key={bookmark.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-150 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{bookmark.title}</p>
                          <p className="text-[10px] text-text-tertiary">{bookmark.subject} · {bookmark.added}</p>
                        </div>
                        <div className="hidden sm:flex gap-1">
                          {bookmark.tags.map((tag) => <Badge key={tag} variant="surface" size="sm">{tag}</Badge>)}
                        </div>
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                          <IconButton label="Open" size="sm"><ExternalLink className="w-3.5 h-3.5" /></IconButton>
                          <IconButton label="Delete" size="sm" onClick={() => handleDelete(bookmark.title)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  )
}
