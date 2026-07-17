import { memo } from 'react'
import { LearningCard } from './LearningCard'
import { Badge } from '@/components/ui/badge'
import { BookmarkIcon, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react'

interface CheatSheetSection {
  title: string
  items: string[]
  variant?: 'default' | 'tip' | 'warning' | 'formula'
}

interface CheatSheetCardProps {
  title?: string
  sections?: CheatSheetSection[]
}

const sectionStyles = {
  default: 'bg-surface-150 border border-border',
  tip: 'bg-accent/5 border border-accent/10',
  warning: 'bg-amber-500/5 border border-amber-500/10',
  formula: 'bg-violet-500/5 border border-violet-500/10',
}

const sectionIcons = {
  default: BookmarkIcon,
  tip: Lightbulb,
  warning: AlertTriangle,
  formula: RefreshCw,
}

export const CheatSheetCard = memo(function CheatSheetCard({
  title = 'Quick Reference',
  sections = sampleSections,
}: CheatSheetCardProps) {
  return (
    <LearningCard
      icon={<BookmarkIcon className="w-4 h-4 text-amber-400" />}
      title={title}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => {
          const Icon = sectionIcons[section.variant || 'default']
          return (
            <div
              key={section.title}
              className={`rounded-xl p-4 ${sectionStyles[section.variant || 'default']}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-semibold text-text-primary">{section.title}</span>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-accent/50 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </LearningCard>
  )
})

const sampleSections: CheatSheetSection[] = [
  {
    title: 'Key Properties',
    items: [
      'Left subtree < Node < Right subtree',
      'No duplicate nodes (standard BST)',
      'In-order traversal gives sorted order',
      'Height affects all operations',
    ],
  },
  {
    title: 'Memory Tricks',
    variant: 'tip',
    items: [
      'LRN = Left, Root, Right for in-order',
      'Smaller goes left, larger goes right',
      'Think of a binary search dictionary',
    ],
  },
  {
    title: 'Common Errors',
    variant: 'warning',
    items: [
      'Forgetting to update parent references',
      'Not handling empty trees',
      'Confusing BST property with heap property',
    ],
  },
  {
    title: 'Complexity Formula',
    variant: 'formula',
    items: [
      'Search: O(log n) average, O(n) worst',
      'Insert: O(log n) average, O(n) worst',
      'Space: O(n) for n nodes',
      'Height: log₂(n) ≤ h ≤ n',
    ],
  },
]
