import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Code2, Users, Lightbulb, TrendingUp, MonitorPlay, Presentation, BookOpen, Globe, Github, Twitter, Linkedin, Building2, Briefcase, GraduationCap, Users2, Building, CheckCircle2 } from 'lucide-react'
import { AppIcon } from './AppIcon'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
          {/* Subtle backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 100, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full sm:max-w-[780px] h-[90vh] sm:h-auto sm:max-h-[80vh] bg-surface-100 sm:border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-modal-title"
          >
            {/* Handle for Mobile */}
            <div className="flex sm:hidden justify-center pt-3 w-full absolute top-0 z-30" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-border" />
            </div>

            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 sm:px-6 py-4 mt-4 sm:mt-0 border-b border-border bg-surface-100/95 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="p-1 rounded-xl bg-surface-200/50">
                  <AppIcon className="w-10 h-10 border-none bg-transparent shadow-none" />
                </div>
                <div>
                  <h2 id="about-modal-title" className="text-base sm:text-lg font-bold text-text-primary leading-tight">
                    ARKORE LOGICS
                  </h2>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-accent mt-0.5 uppercase">
                    Intelligence at Core
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="hidden sm:flex p-2 rounded-full hover:bg-surface-200/50 text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 sm:p-8 space-y-10 bg-surface-100">
              
              {/* 1. About */}
              <section>
                <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">About ARKORE LOGICS</h3>
                <p className="text-[14px] text-text-secondary leading-relaxed max-w-3xl">
                  An EdTech company dedicated to preparing students for the rapidly evolving technology landscape by bridging the gap between academics and industry through practical AI education, technical workshops, bootcamps, seminar sessions, and career-focused learning experiences.
                </p>
              </section>

              {/* 2 & 3. Mission and Vision */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-200/20 hover:bg-surface-200/40 transition-colors rounded-xl p-5 border border-border/50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-teal">
                    <TrendingUp className="w-4 h-4" />
                    <h4 className="text-sm font-semibold text-text-primary">Mission</h4>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    To empower students with practical technical skills, AI literacy, and career awareness by making quality technology education accessible, relevant, and aligned with today's industry needs.
                  </p>
                </div>
                <div className="bg-surface-200/20 hover:bg-surface-200/40 transition-colors rounded-xl p-5 border border-border/50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <Lightbulb className="w-4 h-4" />
                    <h4 className="text-sm font-semibold text-text-primary">Vision</h4>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    To become a trusted learning partner for students and institutions by creating industry-ready professionals who confidently leverage modern technologies—especially AI—to solve real-world problems.
                  </p>
                </div>
              </section>

              {/* 4. Services */}
              <section>
                <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4">Core Services</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: <MonitorPlay className="w-4 h-4" />, label: "AI Tools Masterclass" },
                    { icon: <Code2 className="w-4 h-4" />, label: "Technical Workshops" },
                    { icon: <BookOpen className="w-4 h-4" />, label: "Bootcamps" },
                    { icon: <Presentation className="w-4 h-4" />, label: "Technical Training" },
                    { icon: <Briefcase className="w-4 h-4" />, label: "Career Development" },
                    { icon: <Lightbulb className="w-4 h-4" />, label: "AI Awareness" },
                    { icon: <Users className="w-4 h-4" />, label: "Faculty Programs" },
                    { icon: <Building2 className="w-4 h-4" />, label: "Institution Solutions" },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-4 bg-surface-200/20 hover:bg-surface-200/60 border border-border/40 rounded-xl text-center transition-colors group">
                      <div className="text-text-tertiary group-hover:text-accent mb-2.5 transition-colors">{s.icon}</div>
                      <span className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">{s.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. Why Choose Us */}
              <section>
                <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4">Why Choose Us</h3>
                <div className="flex flex-wrap gap-2">
                  {["AI-first learning", "Industry-oriented curriculum", "Practical workshops", "Hands-on learning", "Career-focused approach", "Emerging technologies"].map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200/30 border border-border/50 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-default">
                      <CheckCircle2 className="w-3 h-3 text-accent" />
                      {item}
                    </span>
                  ))}
                </div>
              </section>

              {/* 6. Company Philosophy */}
              <section className="bg-accent/5 border border-accent/10 rounded-xl p-6 text-center">
                <p className="text-sm font-medium text-accent italic">
                  "Empowering the next generation with intelligence at the core."
                </p>
              </section>
              
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 px-5 sm:px-6 py-4 border-t border-border bg-surface-100/95 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <a href="https://arkorelogics.com" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-text-primary text-surface-100 hover:bg-text-secondary text-sm font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap">
                  Visit Website
                </a>
                <a href="mailto:contact@arkorelogics.com" className="px-4 py-2 bg-surface-200/50 hover:bg-surface-200 text-text-primary border border-border text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                  Contact Us
                </a>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <a href="#" className="hidden sm:flex p-2 rounded-lg text-text-tertiary hover:bg-surface-200/50 hover:text-text-primary transition-colors" aria-label="LinkedIn">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#" className="hidden sm:flex p-2 rounded-lg text-text-tertiary hover:bg-surface-200/50 hover:text-text-primary transition-colors" aria-label="Twitter">
                  <Twitter className="w-4 h-4" />
                </a>
                <button onClick={onClose} className="px-4 py-2 bg-surface-200/50 hover:bg-surface-200 text-text-secondary hover:text-text-primary text-sm font-medium rounded-lg transition-colors border border-transparent hover:border-border whitespace-nowrap">
                  Close
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
