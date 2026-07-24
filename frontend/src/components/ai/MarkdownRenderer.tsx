import { memo, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import mermaid from 'mermaid'
import { ReactNode } from 'react'
import 'katex/dist/katex.min.css'

mermaid.initialize({ startOnLoad: false })


const lightThemeVariables = {
  primaryColor: '#FFFFFF',
  primaryTextColor: '#111827',
  textColor: '#111827',
  lineColor: '#6B7280',
  mainBkg: '#FFFFFF',
  primaryBorderColor: '#00C2FF',
  secondaryBorderColor: '#9CA3AF',
  tertiaryBorderColor: '#D1D5DB',
  clusterBkg: '#F3F4F6',
  clusterBorder: '#D1D5DB',
  edgeLabelBackground: '#FFFFFF',
  fontSize: '12px',
}

const darkThemeVariables = {
  primaryColor: '#080812',
  primaryTextColor: '#f8fafc',
  textColor: '#f8fafc',
  lineColor: '#94a3b8',
  mainBkg: '#080812',
  primaryBorderColor: '#00f2fe',
  secondaryBorderColor: '#475569',
  tertiaryBorderColor: '#334155',
  clusterBkg: '#101224',
  clusterBorder: '#1c2040',
  edgeLabelBackground: '#080812',
  fontSize: '12px',
}

function initMermaidTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
    flowchart: { useMaxWidth: true, htmlLabels: true },
    sequence: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
  })
}

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

const MermaidBlock = memo(function MermaidBlock({ chart }: { chart: string }) {
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
      initMermaidTheme()
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
        <p className="text-xs text-text-tertiary">Diagram could not be rendered</p>
        {errorMsg && errorMsg !== 'null' && errorMsg !== 'undefined' && (
          <p className="text-xs text-text-tertiary/60 max-w-xs leading-relaxed font-mono">{errorMsg}</p>
        )}
        {errorSources && (
          <details className="w-full max-w-md text-left mt-1">
            <summary className="text-xs text-accent cursor-pointer font-medium">Show debug info</summary>
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold text-text-tertiary/70">Parser error:</p>
              <pre className="text-[8px] text-red-400/80 font-mono whitespace-pre-wrap bg-surface-200/50 p-2 rounded max-h-20 overflow-auto">{errorMsg}</pre>
              <p className="text-xs font-semibold text-text-tertiary/70">Original Mermaid:</p>
              <pre className="text-[8px] text-text-tertiary/60 font-mono whitespace-pre-wrap bg-surface-200/50 p-2 rounded max-h-24 overflow-auto">{errorSources.original}</pre>
              <p className="text-xs font-semibold text-text-tertiary/70">Repaired Mermaid:</p>
              <pre className="text-[8px] text-text-tertiary/60 font-mono whitespace-pre-wrap bg-surface-200/50 p-2 rounded max-h-24 overflow-auto">{errorSources.repaired}</pre>
            </div>
          </details>
        )}
      </div>
    )
  }

  return <div ref={ref} className="my-6 flex justify-center" />
})

function CodeBlock({ className, children, sectionColor, ...props }: { className?: string; children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLPreElement>) {
  const lang = className?.replace('language-', '') || ''
  const code = String(children).replace(/\n$/, '')

  if (lang === 'mermaid') {
    return <MermaidBlock chart={String(children).replace(/\n$/, '')} />
  }

  return (
    <div className="rounded-xl border overflow-hidden my-6 group" style={{ borderColor: sectionColor ? `${sectionColor}40` : 'var(--border)' }}>
      {lang && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-100/50 backdrop-blur-sm border-b" style={{ borderColor: sectionColor ? `${sectionColor}20` : 'var(--border)' }}>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: sectionColor || 'var(--text-tertiary)' }}>{lang}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
            style={{ color: sectionColor || 'var(--text-secondary)' }}
          >
            Copy
          </button>
        </div>
      )}
      <pre className="p-5 overflow-x-auto bg-surface-50 relative" {...props}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundColor: sectionColor || 'transparent' }} />
        <code className="relative text-[13px] leading-[1.7] md:text-xs font-mono text-white md:leading-relaxed whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  )
}

function InlineCode({ children, sectionColor, ...props }: { children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <code 
      className="px-1.5 py-0.5 rounded text-[13px] md:text-xs font-mono border" 
      style={{ 
        color: sectionColor || 'var(--accent-light)', 
        backgroundColor: sectionColor ? `${sectionColor}15` : 'rgba(255,255,255,0.05)',
        borderColor: sectionColor ? `${sectionColor}30` : 'var(--border)'
      }}
      {...props}
    >
      {children}
    </code>
  )
}

function Paragraph({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="text-lg leading-[1.85] text-text-secondary mb-6 font-normal last:mb-0" {...props}>{children}</p>
}

function Heading({ level, children, sectionColor, ...props }: { level: number; children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLHeadingElement>) {
  const sizes: Record<number, string> = {
    1: 'text-4xl md:text-5xl font-black text-text-primary mt-16 mb-8 pb-4 tracking-tight border-b border-border/50',
    2: 'text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-6 pb-2 tracking-tight border-b border-border/30',
    3: 'text-xl md:text-2xl font-bold text-text-primary mt-10 mb-4 tracking-tight',
    4: 'text-lg md:text-xl font-bold text-text-primary mt-8 mb-4',
    5: 'text-base md:text-lg font-bold text-text-primary mt-6 mb-3',
    6: 'text-sm font-bold text-text-tertiary mt-6 mb-3 uppercase tracking-widest',
  }
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements as any
  
  return (
    <Tag 
      className={sizes[level] || sizes[3]} 
      {...props}
    >
      {level <= 2 && sectionColor ? (
        <span className="flex items-center gap-3">
          <span className="w-1.5 h-8 rounded-sm" style={{ backgroundColor: sectionColor }} />
          {children}
        </span>
      ) : (
        children
      )}
    </Tag>
  )
}

function Table({ children, ...props }: { children?: ReactNode } & React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto my-6 md:my-4 rounded-lg border border-border">
      <table className="w-full text-[13px] md:text-xs border-collapse" {...props}>
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
  const base = 'px-4 py-3 md:py-2.5 text-left leading-[1.7] md:leading-relaxed'
  if (isHeader) {
    return <th className={`${base} text-[13px] md:text-xs font-semibold text-text-primary uppercase tracking-wider`} {...props}>{children}</th>
  }
  return <td className={`${base} text-[14px] md:text-xs text-text-secondary`} {...props}>{children}</td>
}

function BlockQuote({ children, sectionColor, ...props }: { children?: ReactNode; sectionColor?: string } & React.BlockquoteHTMLAttributes<HTMLElement>) {
  const childStr = extractText(children)
  let borderColor = sectionColor || 'var(--border)'
  let bgColor = sectionColor ? `${sectionColor}15` : 'var(--surface-100)'

  if (childStr.includes('⚠️') || childStr.includes('Warning') || childStr.includes('warn')) {
    borderColor = '#f59e0b'
    bgColor = 'rgba(245, 158, 11, 0.1)'
  } else if (childStr.includes('✅') || childStr.includes('Best Practice') || childStr.includes('Tip') || childStr.includes('💡')) {
    borderColor = '#10b981'
    bgColor = 'rgba(16, 185, 129, 0.1)'
  } else if (childStr.includes('❌') || childStr.includes('Mistake') || childStr.includes('error')) {
    borderColor = '#ef4444'
    bgColor = 'rgba(239, 68, 68, 0.1)'
  } else if (childStr.includes('📝') || childStr.includes('Note') || childStr.includes('info')) {
    borderColor = '#3b82f6'
    bgColor = 'rgba(59, 130, 246, 0.1)'
  }

  return (
    <div 
      className="border-l-[4px] rounded-r-lg px-6 py-5 my-8" 
      style={{ backgroundColor: bgColor, borderColor }} 
      {...props}
    >
      <div className="text-lg leading-[1.85] text-text-secondary font-normal prose-sm max-w-none [&>*:last-child]:mb-0">
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
    return <ol {...props} className="space-y-3 mb-8 list-decimal list-outside ml-6 text-lg leading-[1.85] text-text-secondary">{children}</ol>
  }
  return <ul {...props} className="space-y-3 mb-8 list-disc list-outside ml-6 text-lg leading-[1.85] text-text-secondary">{children}</ul>
}

function ListItem({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLLIElement>) {
  return <li className="text-lg leading-[1.85] text-text-secondary" {...props}>{children}</li>
}

function TaskListItem({ checked, sectionColor, children, ...props }: { checked: boolean; children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li {...props} className="flex items-start gap-3 text-lg leading-[1.85] text-text-secondary mb-3">
      <span 
        className="mt-1.5 w-5 h-5 rounded border flex items-center justify-center shrink-0"
        style={{ 
          backgroundColor: checked ? (sectionColor || 'var(--accent)') : 'transparent',
          borderColor: checked ? (sectionColor || 'var(--accent)') : 'var(--border)'
        }}
      >
        {checked && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {children}
    </li>
  )
}

function Link({ href, children, sectionColor, ...props }: { href?: string; children?: ReactNode; sectionColor?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity" 
      style={{ color: sectionColor || 'var(--accent)', textDecorationColor: sectionColor ? `${sectionColor}40` : 'var(--border)' }}
      {...props}>
      {children}
    </a>
  )
}

function Image({ src, alt, ...props }: { src?: string; alt?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <div className="my-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <img src={src} alt={alt || ''} className="w-full max-w-full" loading="lazy" {...props} />
      {alt && <p className="px-4 py-2.5 text-xs text-white/50 text-center bg-surface-100/50 backdrop-blur-md uppercase tracking-widest font-bold">{alt}</p>}
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
  sectionColor?: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, sectionColor }: MarkdownRendererProps) {
  if (!content || !content.trim()) return null

  return (
    <div className="prose-custom max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }: any) => <Heading level={1} sectionColor={sectionColor}>{children}</Heading>,
          h2: ({ children }: any) => <Heading level={2} sectionColor={sectionColor}>{children}</Heading>,
          h3: ({ children }: any) => <Heading level={3} sectionColor={sectionColor}>{children}</Heading>,
          h4: ({ children }: any) => <Heading level={4} sectionColor={sectionColor}>{children}</Heading>,
          h5: ({ children }: any) => <Heading level={5} sectionColor={sectionColor}>{children}</Heading>,
          h6: ({ children }: any) => <Heading level={6} sectionColor={sectionColor}>{children}</Heading>,
          p: Paragraph,
          ul: ({ children }: any) => <List>{children}</List>,
          ol: ({ children }: any) => <List ordered>{children}</List>,
          li: ListItem,
          code: ({ className, children }: { className?: string; children?: ReactNode }) => {
            if (className) return <CodeBlock className={className} sectionColor={sectionColor}>{children}</CodeBlock>
            return <InlineCode sectionColor={sectionColor}>{children}</InlineCode>
          },
          pre: ({ children, ...props }: { children?: ReactNode } & any) => <div {...props}>{children}</div>,
          blockquote: ({ children, ...props }: any) => <BlockQuote sectionColor={sectionColor} {...props}>{children}</BlockQuote>,
          table: Table,
          thead: TableHeader,
          tbody: TableBody,
          tr: TableRow,
          th: ({ children, ...props }: { children?: ReactNode } & any) => <TableCell isHeader={true} {...props}>{children}</TableCell>,
          td: ({ children, ...props }: { children?: ReactNode } & any) => <TableCell isHeader={false} {...props}>{children}</TableCell>,
          a: ({ children, href, ...props }: any) => <Link href={href} sectionColor={sectionColor} {...props}>{children}</Link>,
          img: Image,
          hr: HorizontalRule,
          strong: Strong,
          em: Emphasis,
          del: Strikethrough,
          input: ({ checked, ...props }: { checked?: boolean } & any) => <TaskListItem checked={!!checked} sectionColor={sectionColor} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
