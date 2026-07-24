import { memo, useEffect, useRef, useState, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import mermaid from 'mermaid'
import 'katex/dist/katex.min.css'
import { AlertTriangle, Lightbulb, Info, CheckCircle2, ChevronRight, Hash, Quote } from 'lucide-react'

mermaid.initialize({ startOnLoad: false })

const darkThemeVariables = {
  primaryColor: '#0F172A',
  primaryTextColor: '#F8FAFC',
  textColor: '#F8FAFC',
  lineColor: '#64748B',
  mainBkg: '#020617',
  primaryBorderColor: '#38BDF8',
  secondaryBorderColor: '#475569',
  tertiaryBorderColor: '#1E293B',
  clusterBkg: '#0F172A',
  clusterBorder: '#1E293B',
  edgeLabelBackground: '#020617',
  fontSize: '14px',
}

function initMermaidTheme() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: darkThemeVariables,
    flowchart: { useMaxWidth: true, htmlLabels: true },
    sequence: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
  })
}

function repairStateDiagramNotes(code: string): string {
  const trimmed = code.trim()
  if (!/^stateDiagram-v2/i.test(trimmed)) return code
  const lines = trimmed.split('\n')
  let firstState: string | null = null
  for (const line of lines) {
    const m = line.match(/state\s+"[^"]*"\s+as\s+(\w+)/) || line.match(/^\s*(\w+)\s*:/)
    if (m) { firstState = m[1]; break }
  }
  if (!firstState) return code
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

function repairMermaid(code: string): string {
  const lines = code.split('\n')
  const repaired = lines.map((line) => {
    let s = line.trim() // Aggressive trim for Mermaid blocks
    s = s.replace(/<\/?(?:think|integer|string|object|array|json)\b[^>]*>/gi, '')
    s = s.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/, '')
    s = s.replace(/--(?![>-])/g, '-->')
    s = s.replace(/\|>/g, '|')
    s = s.replace(/(-[-=]|>|={2,}|-\.->)\s+\|/g, (m) => m.replace(/\s+\|/, '|'))
    
    // Unescape markdown and KaTeX artifacts often injected inside mermaid
    s = s.replace(/\\([`*_{}[\]()#+\-.!])/g, '$1')
    s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    s = s.replace(/\\\( /g, '(').replace(/ \\\)/g, ')')
    s = s.replace(/\\\[ /g, '[').replace(/ \\\]/g, ']')

    // Quote labels containing parentheses, brackets or special characters
    s = s.replace(/(\w+)\[([^\]"]*[(){}:|][^\]"]*)\]\s*/g, (_m, id, label) => `${id}["${label.replace(/"/g, "'")}"] `)
    return s
  }).join('\n').trim()
  return repairStateDiagramNotes(repaired)
}

const MermaidBlock = memo(function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!ref.current || !chart || !chart.trim()) return
    setFailed(false)
    const container = ref.current
    container.innerHTML = ''
    const tryRender = async (code: string, isRetry: boolean) => {
      initMermaidTheme()
      const id = `md-mermaid-${Math.random().toString(36).slice(2, 9)}`
      if (isRetry) {
        try { await mermaid.parse(code) } catch (e) { setFailed(true); return }
      }
      try {
        const { svg } = await mermaid.render(id, code)
        if (container) {
          container.innerHTML = svg
          const svgEl = container.querySelector('svg')
          if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
          
          // Check if mermaid injected a syntax error SVG without throwing
          if (svgEl && svgEl.innerHTML.includes('Syntax error')) {
             setFailed(true)
             return
          }
        }
      } catch (e) {
        if (!isRetry) await tryRender(repairMermaid(code), true)
        else setFailed(true)
      }
    }
    tryRender(chart, false)
  }, [chart])

  if (failed || !chart || !chart.trim()) return null
  return (
    <div className="my-10 flex justify-center p-6 bg-[#0B0F19] border border-white/5 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <div ref={ref} className="w-full" />
    </div>
  )
})

function CodeBlock({ className, children, sectionColor, ...props }: { className?: string; children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLPreElement>) {
  const lang = className?.replace('language-', '') || ''
  const code = String(children).replace(/\n$/, '')
  if (lang === 'mermaid') return <MermaidBlock chart={code} />

  const color = sectionColor || '#38BDF8'
  
  return (
    <div className="rounded-2xl overflow-hidden my-8 group relative bg-[#020617] border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]" 
         style={{ boxShadow: `0 20px 40px -15px ${color}30, inset 0 1px 1px rgba(255,255,255,0.1)` }}>
      
      {/* MacOS style window header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/5">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {lang && <span className="text-[11px] font-mono uppercase tracking-[0.2em] font-bold text-[#94A3B8]">{lang}</span>}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors text-white/50 hover:text-white"
        >
          Copy
        </button>
      </div>
      
      <pre className="p-6 overflow-x-auto relative" {...props}>
        <code className="relative text-[13.5px] font-mono text-[#F8FAFC] leading-[1.8] whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  )
}

function InlineCode({ children, sectionColor, ...props }: { children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLElement>) {
  const color = sectionColor || '#38BDF8'
  return (
    <code 
      className="px-1.5 py-0.5 mx-0.5 rounded-md text-[13.5px] font-mono whitespace-nowrap shadow-sm" 
      style={{ 
        color: '#F8FAFC', 
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        borderWidth: '1px'
      }}
      {...props}
    >
      {children}
    </code>
  )
}

function Paragraph({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) {
  const childStr = extractText(children)
  if (childStr.trim().startsWith('Fact:') || childStr.trim().startsWith('Concept:')) {
    return (
      <div className="my-6 p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex gap-4 items-start shadow-lg">
        <div className="mt-1"><Lightbulb className="w-5 h-5 text-amber-400" /></div>
        <p className="text-[17px] leading-[1.9] text-[#E2E8F0]" {...props}>{children}</p>
      </div>
    )
  }
  return <p className="text-[17px] leading-[1.9] text-[#CBD5E1] mb-6 font-normal tracking-wide" {...props}>{children}</p>
}

function Heading({ level, children, sectionColor, ...props }: { level: number; children?: ReactNode; sectionColor?: string } & React.HTMLAttributes<HTMLHeadingElement>) {
  const color = sectionColor || '#38BDF8'
  const Tag = `h${level}` as any

  if (level === 1 || level === 2) {
    return (
      <div className="mt-16 mb-8">
        <Tag className="text-3xl md:text-[40px] font-extrabold tracking-tight text-white flex items-center gap-4 mb-4" {...props}>
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 shrink-0 shadow-inner">
            <Hash className="w-5 h-5" style={{ color }} />
          </span>
          <span className="drop-shadow-lg">{children}</span>
        </Tag>
        <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
        </div>
      </div>
    )
  }

  if (level === 3) {
    return (
      <Tag className="text-xl md:text-[22px] font-bold text-[#F8FAFC] mt-12 mb-5 flex items-center gap-3 tracking-tight" {...props}>
        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
        {children}
      </Tag>
    )
  }

  return <Tag className="text-lg md:text-[19px] font-bold text-[#F8FAFC] mt-8 mb-4 tracking-wide" {...props}>{children}</Tag>
}

function BlockQuote({ children, sectionColor, ...props }: { children?: ReactNode; sectionColor?: string } & React.BlockquoteHTMLAttributes<HTMLElement>) {
  const childStr = extractText(children).toLowerCase()
  let type = 'quote'
  let color = sectionColor || '#38BDF8'
  let Icon = Quote
  
  if (childStr.includes('warning') || childStr.includes('mistake') || childStr.includes('caution')) {
    type = 'warning'
    color = '#F43F5E'
    Icon = AlertTriangle
  } else if (childStr.includes('tip') || childStr.includes('best practice')) {
    type = 'success'
    color = '#10B981'
    Icon = CheckCircle2
  } else if (childStr.includes('note') || childStr.includes('important')) {
    type = 'info'
    color = '#38BDF8'
    Icon = Info
  } else if (childStr.includes('example')) {
    type = 'example'
    color = '#A855F7'
    Icon = Lightbulb
  }

  return (
    <div 
      className="my-8 relative rounded-[24px] overflow-hidden group shadow-2xl"
      style={{ backgroundColor: `${color}05`, border: `1px solid ${color}20` }}
      {...props}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      <div className="absolute top-0 right-0 p-32 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
        <Icon className="w-full h-full" style={{ color }} />
      </div>
      <div className="p-8 relative z-10 flex gap-6 items-start">
        <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 text-[17px] leading-[1.8] text-[#CBD5E1] font-medium [&>*:last-child]:mb-0 pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) return extractText((node as any).props.children)
  return ''
}

function List({ ordered, children, ...props }: { ordered?: boolean; children?: ReactNode } & React.HTMLAttributes<HTMLOListElement | HTMLUListElement>) {
  if (ordered) {
    return <ol {...props} className="space-y-4 mb-8 list-none text-[17px] leading-[1.8] text-[#CBD5E1] counter-reset-list">{children}</ol>
  }
  return <ul {...props} className="space-y-3 mb-8 list-none text-[17px] leading-[1.8] text-[#CBD5E1]">{children}</ul>
}

function ListItem({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLLIElement>) {
  // We use a custom bullet for ul, and ordered list uses a CSS counter approach if needed, 
  // but for simplicity we'll just style all list items with a custom check/arrow graphic.
  return (
    <li className="flex items-start gap-4 relative group" {...props}>
      <span className="mt-1.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/10 group-hover:border-indigo-500/50 transition-colors">
        <ChevronRight className="w-3 h-3 text-[#94A3B8] group-hover:text-indigo-400 transition-colors" />
      </span>
      <div className="flex-1 pt-0.5">{children}</div>
    </li>
  )
}

function Table({ children, ...props }: { children?: ReactNode } & React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto my-8 rounded-[20px] border border-white/10 bg-[#060814] shadow-xl">
      <table className="w-full text-[15px] border-collapse" {...props}>{children}</table>
    </div>
  )
}

function TableHeader({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-[#0F172A] border-b border-white/10" {...props}>{children}</thead>
}

function TableRow({ children, ...props }: { children?: ReactNode } & React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors" {...props}>{children}</tr>
}

function TableCell({ isHeader, children, ...props }: { isHeader?: boolean; children?: ReactNode } & React.HTMLAttributes<HTMLTableCellElement>) {
  const base = 'px-6 py-4 text-left leading-[1.7]'
  if (isHeader) return <th className={`${base} text-[13px] font-bold text-[#F8FAFC] uppercase tracking-widest`} {...props}>{children}</th>
  return <td className={`${base} text-[#CBD5E1] font-medium`} {...props}>{children}</td>
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, sectionColor }: { content?: string; sectionColor?: string }) {
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
          code: ({ className, children }: any) => className ? <CodeBlock className={className} sectionColor={sectionColor}>{children}</CodeBlock> : <InlineCode sectionColor={sectionColor}>{children}</InlineCode>,
          blockquote: ({ children, ...props }: any) => <BlockQuote sectionColor={sectionColor} {...props}>{children}</BlockQuote>,
          table: Table,
          thead: TableHeader,
          tbody: ({ children }: any) => <tbody>{children}</tbody>,
          tr: TableRow,
          th: ({ children }: any) => <TableCell isHeader>{children}</TableCell>,
          td: ({ children }: any) => <TableCell isHeader={false}>{children}</TableCell>,
          a: ({ children, href }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4 decoration-2 decoration-indigo-500/30 hover:decoration-indigo-400 text-indigo-400 hover:text-indigo-300 transition-colors">{children}</a>,
          img: ({ src, alt }: any) => (
            <div className="my-10 rounded-[24px] overflow-hidden border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] relative group">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src={src} alt={alt || ''} className="w-full h-auto object-cover" loading="lazy" />
              {alt && <p className="px-5 py-3 text-[11px] text-[#94A3B8] text-center bg-[#020617] uppercase tracking-[0.15em] font-bold border-t border-white/5">{alt}</p>}
            </div>
          ),
          hr: () => <hr className="my-12 border-white/10" />,
          strong: ({ children }: any) => <strong className="font-bold text-[#F8FAFC]">{children}</strong>,
          em: ({ children }: any) => <em className="italic text-[#94A3B8]">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
