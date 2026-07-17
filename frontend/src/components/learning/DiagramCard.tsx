import { memo } from 'react'
import { LearningCard } from './LearningCard'
import { MermaidViewer } from '@/components/ui/mermaid-viewer'
import { BarChart3 } from 'lucide-react'

interface DiagramCardProps {
  diagram: string
  title?: string
}

export const DiagramCard = memo(function DiagramCard({
  diagram,
  title = 'Diagram',
}: DiagramCardProps) {
  return (
    <LearningCard
      icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
      title={title}
    >
      <MermaidViewer diagram={diagram} title={title} />
    </LearningCard>
  )
})
