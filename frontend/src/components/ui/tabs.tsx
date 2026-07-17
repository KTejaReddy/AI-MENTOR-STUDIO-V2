import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
  badge?: string | number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, defaultTab, onChange, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center gap-0.5 border-b border-border px-3 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/15 text-accent-light">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn('h-full', activeTab !== tab.id && 'hidden')}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}
