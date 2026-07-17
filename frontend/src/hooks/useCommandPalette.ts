import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTabs } from '@/contexts/TabContext'
import type { CommandItem } from '@/types/workspace'

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { createTab } = useTabs()

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { id: 'go-home', label: 'Go to Home', description: 'Navigate to dashboard', category: 'navigate', icon: 'Home', action: () => navigate('/') },
      { id: 'go-learn', label: 'Go to Learn', description: 'Open learning workspace', category: 'navigate', icon: 'BookOpen', action: () => navigate('/learn') },
      { id: 'go-history', label: 'Open History', description: 'View activity history', category: 'navigate', icon: 'Clock', action: () => navigate('/history') },
      { id: 'go-bookmarks', label: 'View Bookmarks', description: 'See saved bookmarks', category: 'navigate', icon: 'Bookmark', action: () => navigate('/bookmarks') },
      { id: 'go-notes', label: 'Open Notes', description: 'View and edit notes', category: 'navigate', icon: 'StickyNote', action: () => navigate('/notes') },
      { id: 'go-settings', label: 'Open Settings', description: 'Configure application', category: 'navigate', icon: 'Settings', action: () => navigate('/settings') },
      { id: 'new-tab', label: 'New Learning Tab', description: 'Start a new learning session', category: 'action', icon: 'Plus', action: () => { createTab({ label: 'New', subject: '', topic: '' }); navigate('/learn') } },
    ]
    if (query) {
      const q = query.toLowerCase()
      return items.filter((i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    }
    return items
  }, [query, navigate, createTab])

  const toggle = useCallback(() => setOpen((v) => !v), [])
  const openPalette = useCallback(() => setOpen(true), [])
  const close = useCallback(() => { setOpen(false); setQuery('') }, [])

  return { open, query, setQuery, commands, toggle, openPalette, close }
}
