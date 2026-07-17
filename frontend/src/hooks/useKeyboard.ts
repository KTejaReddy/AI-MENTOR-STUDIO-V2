import { useEffect, useCallback } from 'react'

type KeyMap = Record<string, () => void>

export function useKeyboard(keyMap: KeyMap, enabled = true) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      const key = [
        e.ctrlKey || e.metaKey ? 'Ctrl' : '',
        e.shiftKey ? 'Shift' : '',
        e.altKey ? 'Alt' : '',
        e.key.toUpperCase(),
      ]
        .filter(Boolean)
        .join('+')

      const action = keyMap[key]
      if (action) {
        e.preventDefault()
        action()
      }
    },
    [keyMap, enabled]
  )

  useEffect(() => {
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handler])
}
