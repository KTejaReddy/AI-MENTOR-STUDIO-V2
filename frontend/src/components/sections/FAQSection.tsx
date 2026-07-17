import { memo } from 'react'
import type { SectionComponentProps } from '@/types/learning'

export const FAQSection = memo(function FAQSection({ sectionId, data }: SectionComponentProps & { data?: any }) {
  const faqs = data?.faqs ?? data?.items ?? []
  if (!faqs.length) return null
  return (
    <div className="space-y-2">
      {faqs.map((faq: any, i: number) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-surface-150">
            <p className="text-xs font-medium text-text-primary">Q: {faq.q ?? faq.question}</p>
          </div>
          <div className="px-4 py-3 bg-surface-100">
            <p className="text-xs text-text-secondary">A: {faq.a ?? faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
})
