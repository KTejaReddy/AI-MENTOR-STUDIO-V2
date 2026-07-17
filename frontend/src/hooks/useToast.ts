import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error'
  action?: React.ReactNode
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error'
  duration?: number
  action?: React.ReactNode
}

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((options: ToastOptions) => {
    const id = `toast-${++toastCount}`
    const toast: Toast = { id, ...options }
    setToasts(prev => [...prev, toast])

    const duration = options.duration || 4000
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => addToast(options),
    [addToast]
  )

  return { toasts, toast, dismissToast }
}
