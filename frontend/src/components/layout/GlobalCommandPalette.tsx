import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { 
  Home, GraduationCap, History, Bookmark, 
  StickyNote, Settings2, Info,
  Search, FileText, Code2
} from 'lucide-react'
import '@/components/layout/cmdk.css'
import '@/components/layout/cmdk.css'

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Palette"
      className="cmdk-dialog"
    >
      <div className="cmdk-dialog-overlay" onClick={() => setOpen(false)} />
      <div className="cmdk-dialog-content">
        <div className="flex items-center px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary mr-2" />
          <Command.Input 
            autoFocus 
            placeholder="Type a command or search..." 
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-text-tertiary">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-semibold text-text-tertiary">
            <Command.Item onSelect={() => runCommand(() => navigate('/'))} className="cmdk-item">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/learn'))} className="cmdk-item">
              <GraduationCap className="w-4 h-4 mr-2" />
              Go to Learn
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/document-tutor'))} className="cmdk-item">
              <FileText className="w-4 h-4 mr-2" />
              Go to Document Tutor
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/compiler-lab'))} className="cmdk-item">
              <Code2 className="w-4 h-4 mr-2" />
              Go to Compiler Lab
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/history'))} className="cmdk-item">
              <History className="w-4 h-4 mr-2" />
              Go to History
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/bookmarks'))} className="cmdk-item">
              <Bookmark className="w-4 h-4 mr-2" />
              Go to Bookmarks
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/notes'))} className="cmdk-item">
              <StickyNote className="w-4 h-4 mr-2" />
              Go to Notes
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-semibold text-text-tertiary mt-2">
            <Command.Item onSelect={() => runCommand(() => navigate('/settings'))} className="cmdk-item">
              <Settings2 className="w-4 h-4 mr-2" />
              Open Settings
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/about'))} className="cmdk-item">
              <Info className="w-4 h-4 mr-2" />
              About Mentor AI
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
