import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface AiMarkdownProps {
  content: string
  className?: string
}

export const AiMarkdown = memo(function AiMarkdown({ content, className }: AiMarkdownProps) {
  if (!content) return null

  return (
    <div className={cn('prose dark:prose-invert max-w-none text-sm', className)}>
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-base font-semibold text-text-primary mt-4 mb-2 first:mt-0" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-sm font-semibold text-text-primary mt-3 mb-1.5" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xs font-semibold text-text-primary mt-2 mb-1" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className="text-xs text-text-secondary leading-relaxed mb-2 last:mb-0" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-text-primary" {...props}>
              {children}
            </strong>
          ),
          ul: ({ children, ...props }) => (
            <ul className="space-y-1 mb-2 last:mb-0" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="space-y-1 mb-2 last:mb-0" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="flex items-start gap-2 text-xs text-text-secondary" {...props}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 shrink-0" />
              <span>{children}</span>
            </li>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-surface-200 text-xs font-mono text-accent-light" {...props}>
                  {children}
                </code>
              )
            }
            const language = codeClassName?.replace('language-', '') || ''
            return (
              <div className="my-2 rounded-lg border border-border overflow-hidden last:mb-0">
                {language && (
                  <div className="px-3 py-1 bg-surface-150 border-b border-border text-xs font-mono text-text-tertiary">
                    {language}
                  </div>
                )}
                <pre className="p-3 overflow-x-auto bg-surface-200/50">
                  <code className="text-xs font-mono text-text-secondary leading-relaxed" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          table: ({ children, ...props }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border last:mb-0">
              <table className="w-full text-xs" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-surface-150 border-b border-border" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-3 py-2 text-left text-xs font-medium text-text-primary" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-3 py-2 text-text-secondary border-t border-border" {...props}>
              {children}
            </td>
          ),
          tbody: ({ children, ...props }) => (
            <tbody {...props}>{children}</tbody>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="my-2 pl-3 border-l-2 border-accent/40 text-text-tertiary text-xs italic last:mb-0" {...props}>
              {children}
            </blockquote>
          ),
          hr: ({ ...props }) => (
            <hr className="my-3 border-border" {...props} />
          ),
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-light hover:text-accent underline underline-offset-2"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
