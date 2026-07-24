import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Code2, Users, Lightbulb, TrendingUp, MonitorPlay, Presentation, BookOpen, Globe, Github, Twitter, Linkedin, Building2, Briefcase, GraduationCap, Users2, Building } from 'lucide-react'
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
      
      // Focus trap basic setup could go here if fully required,
      // but typical React modals in this structure get by with just ESC + click outside.
      
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full sm:max-w-3xl max-h-[90vh] bg-surface-100/95 sm:bg-surface-100/90 backdrop-blur-xl sm:border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-modal-title"
          >
            {/* Top Handle for Mobile */}
            <div className="flex sm:hidden justify-center pt-3 pb-1 w-full absolute top-0 z-20 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-border" />
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 sm:p-8 pt-10 sm:pt-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-surface-200/50 text-text-tertiary hover:text-text-primary transition-colors hidden sm:block"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4 mb-10">
                <div className="p-1 rounded-2xl bg-gradient-to-br from-accent/20 to-teal/20 shadow-lg mb-2">
                  <AppIcon className="w-16 h-16 shadow-none border-none bg-surface-100/50" />
                </div>
                <div>
                  <h1 id="about-modal-title" className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                    ARKORE LOGICS
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-accent mt-1 uppercase">
                    Intelligence at Core
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {/* About & Mission */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-200/30 rounded-xl p-5 border border-border/50">
                    <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-accent" /> About ARKORE LOGICS
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      An EdTech company dedicated to preparing students for the rapidly evolving technology landscape by bridging the gap between academics and industry through practical AI education, technical workshops, bootcamps, seminar sessions, and career-focused learning experiences.
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-surface-200/30 rounded-xl p-5 border border-border/50">
                      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-teal" /> Mission
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        To empower students with practical technical skills, AI literacy, and career awareness by making quality technology education accessible, relevant, and aligned with today's industry needs.
                      </p>
                    </div>
                    <div className="bg-surface-200/30 rounded-xl p-5 border border-border/50">
                      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" /> Vision
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        To become a trusted learning partner for students and institutions by creating industry-ready professionals who confidently leverage modern technologies—especially AI—to solve real-world problems.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-4 px-1 uppercase tracking-wider text-center sm:text-left">Our Services</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: <MonitorPlay className="w-5 h-5" />, label: "AI Tools Masterclass" },
                      { icon: <Code2 className="w-5 h-5" />, label: "Technical Workshops" },
                      { icon: <BookOpen className="w-5 h-5" />, label: "Bootcamps" },
                      { icon: <Presentation className="w-5 h-5" />, label: "Technical Training" },
                      { icon: <Briefcase className="w-5 h-5" />, label: "Career Development" },
                      { icon: <Lightbulb className="w-5 h-5" />, label: "AI Awareness" },
                      { icon: <Users className="w-5 h-5" />, label: "Faculty Development" },
                      { icon: <Building2 className="w-5 h-5" />, label: "Institution Training" },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col items-center justify-center p-3 sm:p-4 bg-surface-200/20 hover:bg-surface-200/50 border border-border/40 rounded-xl text-center transition-colors group">
                        <div className="text-text-tertiary group-hover:text-accent mb-2 transition-colors">{s.icon}</div>
                        <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why Choose Us */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-4 px-1 uppercase tracking-wider text-center sm:text-left">Why Choose Us</h3>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {["AI-first learning", "Industry-oriented curriculum", "Practical workshops", "Hands-on learning", "Career-focused approach", "Emerging technologies"].map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-200/40 border border-border/50 text-xs font-medium text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent/80" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Company Stats */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-4 px-1 uppercase tracking-wider text-center sm:text-left">Community</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { icon: <GraduationCap className="w-4 h-4" />, label: "Engineering Students" },
                      { icon: <Building className="w-4 h-4" />, label: "Engineering Colleges" },
                      { icon: <Users2 className="w-4 h-4" />, label: "Faculty Members" },
                      { icon: <MonitorPlay className="w-4 h-4" />, label: "AI Workshops" },
                      { icon: <Code2 className="w-4 h-4" />, label: "Technical Programs" },
                      { icon: <BookOpen className="w-4 h-4" />, label: "Bootcamps" },
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 bg-surface-200/20 border border-border/40 rounded-xl text-center sm:text-left">
                        <div className="p-2 rounded-lg bg-surface-200/50 text-text-tertiary">
                          {stat.icon}
                        </div>
                        <div className="text-xs font-semibold text-text-secondary">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Buttons */}
            <div className="p-4 sm:p-6 border-t border-border bg-surface-150/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-center">
                <a href="https://arkorelogics.com" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-text-primary text-surface-100 hover:bg-text-secondary text-sm font-semibold rounded-xl transition-colors text-center w-full sm:w-auto shadow-sm">
                  Visit Website
                </a>
                <a href="mailto:contact@arkorelogics.com" className="px-5 py-2.5 bg-surface-200/50 hover:bg-surface-200 text-text-primary border border-border text-sm font-medium rounded-xl transition-colors text-center w-full sm:w-auto">
                  Contact Us
                </a>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                <div className="flex items-center gap-3">
                  <a href="#" className="p-2 rounded-full bg-surface-200/50 hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <a href="#" className="p-2 rounded-full bg-surface-200/50 hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                </div>
                <button onClick={onClose} className="sm:hidden px-4 py-2 bg-surface-200/50 text-text-secondary text-sm font-medium rounded-lg">
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
