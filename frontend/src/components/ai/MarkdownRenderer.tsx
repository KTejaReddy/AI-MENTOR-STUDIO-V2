import { memo, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import mermaid from 'mermaid'
import { ReactNode } from 'react'
import 'katex/dist/katex.min.css'

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'dark',
  themeVariables: {
    primaryColor: '#14b8a6',
    primaryTextColor: '#e8eaf0',
    primaryBorderColor: '#14b8a680',
    lineColor: '#5eead4',
    secondaryColor: '#1c1f2d',
    tertiaryColor: '#0f1119',
    fontSize: '12px',
  },
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
})

/** Fix invalid `note "text"` in stateDiagram-v2 by converting to proper `note right of` syntax. */
function repairStateDiagramNotes(code: string): string {
  const trimmed = code.trim()
  if (!/^stateDiagram-v2/i.test(trimmed)) return code

  const lines = trimmed.split('\n')

  // Find the first declared state name
  let firstState: string | null = null
  for (const line of lines) {
    const m = line.match(/state\s+"[^"]*"\s+as\s+(\w+)/)
    if (m) { firstState = m[1]; break }
  }
  if (!firstState) {
    for (const line of lines) {
      const m = line.match(/^\s*(\w+)\s*:/)
      if (m) { firstState = m[1]; break }
    }
  }
  if (!firstState) return code

  // Replace standalone `note "text"` with multi-line proper syntax
  let modified = false
  const result = lines.flatMap((line) => {
    const noteMatch = line.match(/^\s*note\s+"([^"]*)"\s*$/)
    if (noteMatch) {
      modified = true
      return [`note right of ${firstState}`, `    ${noteMatch[1]}`, 'end note']
    }
    return [line]
  })

  return modified ? result.join('\n') : code
}

/** Repair common Mermaid syntax issues before rendering.
 *  Processes each line independently to never merge or break lines. */
function repairMermaid(code: string): string {
  const lines = code.split('\n')
  const repaired = lines.map((line) => {
    let s = line.trimEnd()
    // Remove XML/think tags that leak from AI models
    s = s.replace(/<\/?(?:think|integer|string|object|array|json)\b[^>]*>/gi, '')
    // Remove backtick fences
    s = s.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/, '')
    // Fix arrows: -- without > → -->
    s = s.replace(/--(?![>-])/g, '-->')
    // CRITICAL: |label|> → |label| (invalid Mermaid syntax)
    s = s.replace(/\|>/g, '|')
    // Normalize arrow-label spacing: --> |label| → -->|label|
    s = s.replace(/(-[-=]|>|={2,}|-\.->)\s+\|/g, (m) => m.replace(/\s+\|/, '|'))
    // Remove markdown escaping inside mermaid blocks
    s = s.replace(/\\([`*_{}[\]()#+\-.!])/g, '$1')
    // Quote node labels containing special chars (parens, colons, brackets)
    s = s.replace(/(\w+)\[([^\]"]*[(){}:|][^\]"]*)\]\s*/g, (_m, id, label) => `${id}["${label.replace(/"/g, "'")}"] `)
    return s
  }).join('\n')

  // Post-processing: fix stateDiagram-v2 invalid notes
  return repairStateDiagramNotes(repaired)
}

function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorSources, setErrorSources] = useState<{ original: string; repaired: string } | null>(null)

  useEffect(() => {
    if (!ref.current || !chart) return
    setFailed(false)
    setErrorMsg(null)
    setErrorSources(null)
    const container = ref.current
    container.innerHTML = ''

    const originalCode = chart
    const tryRender = async (code: string, isRetry: boolean) => {
      const id = `md-mermaid-${Math.random().toString(36).slice(2, 9)}`
      if (isRetry) {
        try {
          await mermaid.parse(code)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          setErrorSources({ original: originalCode, repaired: code })
          setErrorMsg(msg)
          setFailed(true)
          return
        }
      }
      try {
        const { svg } = await mermaid.render(id, code)
        if (container) {
          container.innerHTML = svg
          const svgEl = container.querySelector('svg')
          if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
        }
      } catch (e) {
        if (!isRetry) {
          await tryRender(repairMermaid(code), true)
        } else {
          const msg = e instanceof Error ? e.message : String(e)
          setErrorSources({ original: originalCode, repaired: code })
          setErrorMsg(msg)
          setFailed(true)
        }
      }
    }

    tryRender(chart, false)
  }, [chart])

  if (failed) {
    return (
      <div className="my-6 flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-border bg-surface-100 text-center gap-2">
        <svg className="w-8 h-8 text-accent-light opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-[11px] text-text-tertiary">Diagram could not be rendered</p>
        {errorMsg && errorMsg !== 'null' && errorMsg !== 'undefined' && (
          <p className="text-[9px] text-text-tertiary/60 max-w-xs leading-relaxed font-mono">{errorMsg}</p>
        )}
        {errorSources && (
          <details className="w-full max-w-md text-left mt-1">
            <summary className="text-[10px] text-accent cursor-pointer font-medium">Show debug info</summary>
            <div className="mt-2 space-y-1">
              <p className="text-[9px] font-semibold text-text-tertiary/70">Parser error:</p>
              <pre className="text-[8px] text-red-400/80 font-mono whitespace-pre-wrap bg-surface-200/50 p-2 rounded max-h-20 overflow-auto">{errorMsg}</pre>
              <p className="text-[9px] font-semibold text-text-tertiary/70">Original Mermaid:</p>
              <pre className="text-[8px] text-text-tertiary/60 font-mono whitespace-pre-wrap bg-surface-200/50 p-2 rounded max-h-24 overflow-auto">{errorSources.original}</pre>
              <p className="text-[9px] font-semibold text-text-tertiary/70">Repaired Mermaid:</p>
              <pre className="text-[8px] text-text-tertiary/60 font-mono whitespace-pre-wrap bg-surface-200/50 p-2 rounded max-h-24 overflow-auto">{errorSources.repaired}</pre>
            </div>
          </details>
        )}
      </div>
    )
  }

  return <div ref={ref} className="my-6 flex justify-center" />
}

function CodeBlock({ className, children, ...props }: { className?: string; children?: ReactNode } & React.HTMLAttributes<HTMLPreElement>) {
  const lang = className?.replace('language-', '') || ''
  const code = String(children).replace(/\n$/, '')

  if (lang === 'mermaid') {
    return <MermaidBlock chart={String(children).replace(/\n$/, '')} />
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden my-4">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-surface-200 border-b border-border">
          <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">{lang}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-[10px] px-2 py-0.5 rounded bg-surface-300 hover:bg-surface-400 text-text-tertiary hover:text-text-primary transition-colors"
          >
            Copy
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto bg-surface-50" {...props}>
        <code className="text-sm md:text-[11px] font-mono text-text-secondary leading-relaxed whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  )
}

function InlineCode({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-accent/10 text-sm md:text-[10px] font-mono text-accent-light border border-accent/20" {...props}>
      {children}
    </code>
  )
}

function Paragraph({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="text-base md:text-xs text-text-secondary leading-relaxed mb-4 last:mb-0" {...props}>{children}</p>
}

function Heading({ level, children, ...props }: { level: number; children?: ReactNode } & React.HTMLAttributes<HTMLHeadingElement>) {
  const sizes: Record<number, string> = {
    1: 'text-2xl md:text-xl font-bold text-text-primary mt-8 mb-4 pb-2 border-b border-border/50',
    2: 'text-xl md:text-lg font-semibold text-text-primary mt-7 mb-3 pb-1.5 border-b border-border/30',
    3: 'text-lg md:text-base font-semibold text-text-primary mt-6 mb-2',
    4: 'text-base md:text-sm font-medium text-text-primary mt-5 mb-2',
    5: 'text-sm md:text-xs font-medium text-text-primary mt-4 mb-1',
    6: 'text-xs md:text-[11px] font-medium text-text-tertiary mt-3 mb-1 uppercase tracking-wider',
  }
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements as any
  return <Tag className={sizes[level] || sizes[3]} {...props}>{children}</Tag>
}

function Table({ children, ...props }: { children?: ReactNode } & React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-xs border-collapse" {...props}>
        {children}
      </table>
    </div>
  )
}

function TableHeader({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-surface-200" {...props}>{children}</thead>
}

function TableRow({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-border last:border-b-0 hover:bg-surface-100/50" {...props}>{children}</tr>
}

function TableBody({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>
}

function TableCell({ isHeader, children, ...props }: { isHeader?: boolean; children?: ReactNode } & React.HTMLAttributes<HTMLTableCellElement>) {
  const base = 'px-4 py-2.5 text-left leading-relaxed'
  if (isHeader) {
    return <th className={`${base} text-[10px] font-semibold text-text-primary uppercase tracking-wider`} {...props}>{children}</th>
  }
  return <td className={`${base} text-[11px] text-text-secondary`} {...props}>{children}</td>
}

function BlockQuote({ children, ...props }: { children?: ReactNode } & React.BlockquoteHTMLAttributes<HTMLElement>) {
  const childStr = extractText(children)
  let borderColor = 'border-l-accent/40'
  let bgColor = 'bg-accent/5'
  let icon = '💡'

  if (childStr.includes('⚠️') || childStr.includes('Warning') || childStr.includes('warn')) {
    borderColor = 'border-l-amber-500/50'
    bgColor = 'bg-amber-500/8'
    icon = '⚠️'
  } else if (childStr.includes('✅') || childStr.includes('Best Practice') || childStr.includes('Tip') || childStr.includes('💡')) {
    borderColor = 'border-l-emerald-500/50'
    bgColor = 'bg-emerald-500/8'
    icon = '✅'
  } else if (childStr.includes('❌') || childStr.includes('Mistake') || childStr.includes('error')) {
    borderColor = 'border-l-red-500/50'
    bgColor = 'bg-red-500/8'
    icon = '❌'
  } else if (childStr.includes('📝') || childStr.includes('Note') || childStr.includes('info')) {
    borderColor = 'border-l-blue-500/50'
    bgColor = 'bg-blue-500/8'
    icon = '📝'
  }

  return (
    <div className={`${bgColor} ${borderColor} border-l-4 rounded-r-lg px-4 py-3 my-4`} {...props}>
      <div className="text-[11px] text-text-secondary leading-relaxed prose-sm max-w-none [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as any).props.children)
  }
  return ''
}

function List({ ordered, children, ...props }: { ordered?: boolean; children?: ReactNode } & React.HTMLAttributes<HTMLOListElement | HTMLUListElement>) {
  if (ordered) {
    return <ol {...props} className="space-y-1.5 mb-4 list-decimal list-outside ml-4">{children}</ol>
  }
  return <ul {...props} className="space-y-1.5 mb-4 list-disc list-outside ml-4">{children}</ul>
}

function ListItem({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLLIElement>) {
  return <li className="text-xs text-text-secondary leading-relaxed" {...props}>{children}</li>
}

function TaskListItem({ checked, children, ...props }: { checked: boolean; children?: ReactNode } & React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li {...props} className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed mb-1.5">
      <span className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
        checked ? 'bg-accent border-accent' : 'border-text-tertiary'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {children}
    </li>
  )
}

function Link({ href, children, ...props }: { href?: string; children?: ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-accent-light hover:text-accent underline underline-offset-2 decoration-accent/30 hover:decoration-accent/60 transition-colors" {...props}>
      {children}
    </a>
  )
}

function Image({ src, alt, ...props }: { src?: string; alt?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border">
      <img src={src} alt={alt || ''} className="w-full max-w-full" loading="lazy" {...props} />
      {alt && <p className="px-3 py-1.5 text-[9px] text-text-tertiary text-center bg-surface-100">{alt}</p>}
    </div>
  )
}

function HorizontalRule({ ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className="my-8 border-border/50" {...props} />
}

function Strong({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <strong className="font-semibold text-text-primary" {...props}>{children}</strong>
}

function Emphasis({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <em className="italic text-text-secondary" {...props}>{children}</em>
}

function Strikethrough({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <span className="line-through text-text-tertiary" {...props}>{children}</span>
}

interface MarkdownRendererProps {
  content?: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content || !content.trim()) return null

  return (
    <div className="prose-custom max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }: any) => <Heading level={1}>{children}</Heading>,
          h2: ({ children }: any) => <Heading level={2}>{children}</Heading>,
          h3: ({ children }: any) => <Heading level={3}>{children}</Heading>,
          h4: ({ children }: any) => <Heading level={4}>{children}</Heading>,
          h5: ({ children }: any) => <Heading level={5}>{children}</Heading>,
          h6: ({ children }: any) => <Heading level={6}>{children}</Heading>,
          p: Paragraph,
          ul: ({ children }: any) => <List>{children}</List>,
          ol: ({ children }: any) => <List ordered>{children}</List>,
          li: ListItem,
          code: ({ className, children }: { className?: string; children?: ReactNode }) => {
            if (className) return <CodeBlock className={className}>{children}</CodeBlock>
            return <InlineCode>{children}</InlineCode>
          },
          pre: ({ children, ...props }: { children?: ReactNode } & any) => <div {...props}>{children}</div>,
          blockquote: BlockQuote,
          table: Table,
          thead: TableHeader,
          tbody: TableBody,
          tr: TableRow,
          th: ({ children, ...props }: { children?: ReactNode } & any) => <TableCell isHeader={true} {...props}>{children}</TableCell>,
          td: ({ children, ...props }: { children?: ReactNode } & any) => <TableCell isHeader={false} {...props}>{children}</TableCell>,
          a: Link,
          img: Image,
          hr: HorizontalRule,
          strong: Strong,
          em: Emphasis,
          del: Strikethrough,
          input: ({ checked, ...props }: { checked?: boolean } & any) => <TaskListItem checked={!!checked} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
