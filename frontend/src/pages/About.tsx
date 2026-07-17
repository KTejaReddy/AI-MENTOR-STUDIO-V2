import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles, Github, Globe, Mail, Heart, Brain, Code2, BookOpen, Layers,
} from 'lucide-react'

const techStack = [
  { name: 'React 19', category: 'Frontend', color: 'bg-sky-400' },
  { name: 'TypeScript', category: 'Language', color: 'bg-blue-400' },
  { name: 'FastAPI', category: 'Backend', color: 'bg-emerald-400' },
  { name: 'Tailwind CSS', category: 'Styling', color: 'bg-cyan-400' },
  { name: 'SQLAlchemy', category: 'Database', color: 'bg-orange-400' },
  { name: 'Framer Motion', category: 'Animation', color: 'bg-violet-400' },
  { name: 'Groq API', category: 'AI', color: 'bg-amber-400' },
  { name: 'SQLite', category: 'Storage', color: 'bg-sky-400' },
]

const features = [
  { icon: Brain, title: 'AI-Powered Explanations', description: 'Advanced AI models provide detailed, contextual explanations tailored to engineering concepts' },
  { icon: Code2, title: 'Code Analysis & Review', description: 'Submit code for intelligent analysis, debugging, and optimization suggestions' },
  { icon: BookOpen, title: 'Structured Learning', description: 'Organized by B.Tech curriculum topics for focused and effective learning sessions' },
  { icon: Heart, title: 'Personalized Experience', description: 'Bookmarks, notes, and history adapt to your learning style and progress' },
]

export function About() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-accent-light" />
            </div>
          </div>
          <Badge variant="accent" className="mb-3">Version 2.0.0</Badge>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Mentor <span className="text-gradient">AI Studio</span>
          </h1>
          <p className="text-sm text-text-tertiary max-w-lg mx-auto leading-relaxed">
            A modern AI-powered engineering learning platform designed for B.Tech students.
            Master concepts, write better code, and accelerate your learning journey.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {features.map((feature, i) => (
            <motion.div key={feature.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
              <Card className="p-4 h-full">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-[18px] h-[18px] text-accent-light" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-text-tertiary leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <Separator className="mb-8" />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Technology Stack</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {techStack.map((tech) => (
              <Badge key={tech.name} variant="surface" className="gap-1.5 py-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${tech.color}`} />
                {tech.name}
              </Badge>
            ))}
          </div>
        </motion.div>

        <Separator className="mb-8" />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex items-center justify-center gap-6">
          {[
            { icon: Github, href: '#', label: 'GitHub' },
            { icon: Globe, href: '#', label: 'Website' },
            { icon: Mail, href: '#', label: 'Contact' },
          ].map((link) => (
            <a key={link.label} href={link.href} className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors">
              <link.icon className="w-4 h-4" /> {link.label}
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
