import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

export interface AppNotification {
  id: string
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
}

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('mentor-notifications', [
    {
      id: 'welcome-1',
      title: 'Welcome to Mentor AI Studio 2.0',
      message: 'Explore the new AI document tutor, compiler lab, and optimized lesson generation pipeline.',
      timestamp: Date.now(),
      read: false
    }
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        read: false
      },
      ...prev
    ])
  }, [setNotifications])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [setNotifications])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }, [setNotifications])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [setNotifications])

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        addNotification, 
        markAsRead, 
        markAllAsRead, 
        clearAll 
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
