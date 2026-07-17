import { memo } from 'react'
import { LearningCard } from './LearningCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Rocket, Clock, Code2, ListChecks } from 'lucide-react'

interface Project {
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  technologies: string[]
  estimatedTime: string
  prerequisites: string[]
}

interface ProjectCardProps {
  project: Project
}

const difficultyColors = {
  beginner: 'success' as const,
  intermediate: 'warning' as const,
  advanced: 'error' as const,
}

export const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
  return (
    <LearningCard
      icon={<Rocket className="w-4 h-4 text-rose-400" />}
      title={project.title}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary leading-relaxed">{project.description}</p>

        <div className="flex flex-wrap gap-2">
          <Badge variant={difficultyColors[project.difficulty]} size="sm">
            {project.difficulty}
          </Badge>
          {project.technologies.map((tech) => (
            <Badge key={tech} variant="surface" size="sm">
              <Code2 className="w-3 h-3 mr-1" />
              {tech}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-150 border border-border">
            <Clock className="w-4 h-4 text-accent-light" />
            <div>
              <p className="text-[10px] text-text-tertiary">Estimated Time</p>
              <p className="text-xs font-medium text-text-primary">{project.estimatedTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-150 border border-border">
            <ListChecks className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-[10px] text-text-tertiary">Prerequisites</p>
              <p className="text-xs font-medium text-text-primary">{project.prerequisites.length} topics</p>
            </div>
          </div>
        </div>

        {project.prerequisites.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">Prerequisites:</p>
            <ul className="space-y-1">
              {project.prerequisites.map((prereq) => (
                <li key={prereq} className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="primary" size="sm">
            <Rocket className="w-4 h-4" />
            Start Project
          </Button>
          <Button variant="secondary" size="sm">View Details</Button>
        </div>
      </div>
    </LearningCard>
  )
})

export const sampleProject: Project = {
  title: 'Build a BST Library',
  description: 'Implement a complete Binary Search Tree library in Python with insert, delete, search, and traversal operations. Include visualization and testing.',
  difficulty: 'intermediate',
  technologies: ['Python', 'Git', 'pytest'],
  estimatedTime: '3-4 hours',
  prerequisites: ['Python basics', 'Recursion', 'OOP concepts'],
}
