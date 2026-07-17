import { createContext, useContext, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { CommandPalette } from '@/components/workspace/CommandPalette'

const AppContext = createContext<{ toggleCommandPalette: () => void } | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const palette = useCommandPalette()

  useKeyboardShortcuts([
    { key: 'k', ctrl: true, handler: () => { palette.toggle() } },
    { key: 'Escape', handler: () => { if (palette.open) palette.close() } },
  ])

  const handleExecute = (cmd: any) => {
    palette.close()
    cmd.action()
  }

  return (
    <AppContext.Provider value={{ toggleCommandPalette: palette.toggle }}>
      {children}
      <CommandPalette
        open={palette.open}
        query={palette.query}
        onQueryChange={palette.setQuery}
        commands={palette.commands}
        onClose={palette.close}
        onExecute={handleExecute}
      />
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
