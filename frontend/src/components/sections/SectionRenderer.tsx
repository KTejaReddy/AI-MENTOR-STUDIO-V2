import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionToolbar } from './SectionToolbar'
import { FollowUpSuggestions } from '@/components/workspace/FollowUpSuggestions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { useTabs } from '@/contexts/TabContext'
import { getSectionConfig } from '@/lib/section-registry'
import { exportSection } from '@/lib/export-engine'
import { cn } from '@/lib/utils'
import type { SectionComponentProps } from '@/types/learning'
import type { FollowUpAction } from '@/types/workspace'

interface SectionRendererProps {
  sectionId: string
  component: React.ComponentType<SectionComponentProps>
  showFollowUps?: boolean
}

export const SectionRenderer = memo(function SectionRenderer({
  sectionId,
  component: ContentComponent,
  showFollowUps = true,
}: SectionRendererProps) {
  const {
    state,
    toggleSection,
    completeSection,
    bookmarkSection,
    pinSection,
  } = useWorkspace()
  const aiGen = useAIGeneration()
  const { activeTab, createTab, updateTab } = useTabs()

  const config = getSectionConfig(sectionId)
  const isExpanded = state.expandedSectionIds.includes(sectionId)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const Icon = config?.icon

  const handleCopy = useCallback(() => {
    const el = document.getElementById(`section-content-${sectionId}`)
    if (el) {
      navigator.clipboard.writeText(el.textContent || '')
    }
  }, [sectionId])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExport = useCallback(() => {
    if (!config) return
    const el = document.getElementById(`section-content-${sectionId}`)
    exportSection({
      sectionId,
      format: 'markdown',
      content: el?.textContent || '',
      title: config.title,
    })
  }, [sectionId, config])

  const handleFollowUp = useCallback(
    (action: FollowUpAction) => {
      if (activeTab) {
        const context = `Current section: ${config?.title ?? sectionId}. Topic: ${activeTab.topic}. ${action.prompt}`
        const tab = createTab({
          label: `${config?.title ?? sectionId} — ${action.label}`,
          subject: activeTab.subject,
          topic: activeTab.topic,
          difficulty: activeTab.difficulty,
          learningMode: activeTab.learningMode,
        })
        aiGen.generate({
          subject: activeTab.subject,
          topic: activeTab.topic,
          difficulty: activeTab.difficulty,
          learning_mode: activeTab.learningMode,
          context,
        })
        if (tab) {
          updateTab(tab, { label: `${config?.title ?? sectionId} — ${action.label}` })
        }
      }
    },
    [activeTab, config, aiGen, createTab, updateTab],
  )

  if (!config) return null

  const content = (
    <div
      data-section
      className={cn(
        'rounded-xl border border-border overflow-hidden transition-all duration-200',
        'bg-surface-100',
        isFullscreen && 'fixed inset-4 z-50 shadow-elevated overflow-y-auto',
      )}
    >
      <SectionToolbar
        title={config.title}
        icon={Icon ? <Icon className="w-4 h-4" /> : null}
        expanded={isExpanded}
        completed={state.completedSectionIds.includes(sectionId)}
        bookmarked={state.bookmarkedSectionIds.includes(sectionId)}
        pinned={state.pinnedSectionIds.includes(sectionId)}
        onToggle={() => toggleSection(sectionId)}
        onCopy={handleCopy}
        onBookmark={() => bookmarkSection(sectionId)}
        onPin={() => pinSection(sectionId)}
        onPrint={handlePrint}
        onFullscreen={() => setIsFullscreen(!isFullscreen)}
        onExport={handleExport}
        onComplete={() => completeSection(sectionId)}
      />
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div
              id={`section-content-${sectionId}`}
              className="p-4"
            >
              <ContentComponent sectionId={sectionId} />
              {showFollowUps && (
                <FollowUpSuggestions
                  sectionId={sectionId}
                  sectionTitle={config.title}
                  onAction={handleFollowUp}
                  compact
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsFullscreen(false)} />
        {content}
      </>
    )
  }

  return content
})
