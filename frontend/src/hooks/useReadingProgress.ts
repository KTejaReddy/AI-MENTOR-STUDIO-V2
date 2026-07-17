import { useState, useEffect, useCallback } from 'react'

export function useReadingProgress(scrollContainer?: HTMLElement | null) {
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    const container = scrollContainer || window

    function handleScroll() {
      let scrollTop: number
      let scrollHeight: number
      let clientHeight: number

      if (container instanceof HTMLElement) {
        scrollTop = container.scrollTop
        scrollHeight = container.scrollHeight
        clientHeight = container.clientHeight
      } else {
        scrollTop = window.scrollY
        scrollHeight = document.documentElement.scrollHeight
        clientHeight = window.innerHeight
      }

      const maxScroll = scrollHeight - clientHeight
      if (maxScroll <= 0) {
        setProgress(100)
      } else {
        setProgress(Math.min(100, Math.round((scrollTop / maxScroll) * 100)))
      }

      const sections = document.querySelectorAll('[data-section-id]')
      let current: string | null = null
      sections.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top <= 150) {
          current = el.getAttribute('data-section-id')
        }
      })
      setActiveSection(current)
    }

    const target = container instanceof HTMLElement ? container : window
    target.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => target.removeEventListener('scroll', handleScroll)
  }, [scrollContainer])

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return { progress, activeSection, scrollToSection }
}
