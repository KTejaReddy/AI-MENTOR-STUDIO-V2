import { useState, memo, useEffect, useRef, useCallback } from 'react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'
import { Maximize2, Minimize2, Download, ZoomIn, ZoomOut, GitBranch, RefreshCw } from 'lucide-react'
import mermaid from 'mermaid'

// Initialize mermaid once for this viewer (dark theme matching app)
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
    fontSize: '13px',
    edgeLabelBackground: '#1c1f2d',
    clusterBkg: '#1c1f2d',
    titleColor: '#e8eaf0',
    nodeBorder: '#14b8a680',
    nodeTextColor: '#e8eaf0',
  },
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  sequence: { useMaxWidth: true, mirrorActors: false },
  gantt: { useMaxWidth: true },
  mindmap: { useMaxWidth: true },
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

/** Attempt to auto-repair common Mermaid syntax errors.
 *  Processes each line independently to never merge or break lines. */
function repairMermaidSyntax(code: string): string {
  // 1. Normalise line endings first
  const normalised = code.replace(/\r\n/g, '\n')

  // Process each line independently
  let repaired = normalised.split('\n').map((line) => {
    let s = line.trimEnd()

    // Remove XML / think tags that sometimes leak from AI output
    s = s.replace(/<\/?(?:think|integer|string|object|array|json)\b[^>]*>/gi, '')

    // Remove backtick fences if accidentally included
    s = s.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/, '')

    // Fix double-hyphened arrows: -- → -->
    s = s.replace(/--(?!>|-)/g, '-->')

    // CRITICAL FIX: |label|> → |label| (AI generates invalid |> after labels)
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
  repaired = repairStateDiagramNotes(repaired)

  const validStarts = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'erDiagram', 'gantt', 'pie', 'mindmap', 'timeline', 'gitGraph',
    'quadrantChart', 'requirementDiagram', 'block-beta', 'architecture-beta',
    'journey', 'xychart-beta',
  ]
  const firstToken = repaired.split(/[\s\n]/)[0].toLowerCase()
  const isValid = validStarts.some((s) => firstToken.startsWith(s.toLowerCase()))
  if (!isValid) {
    // Wrap in a simple flowchart
    repaired = `graph TD\n${repaired}`
  }

  return repaired
}

/** Download the rendered SVG as a file. */
function downloadSvg(svgContent: string, filename = 'diagram.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface MermaidViewerProps {
  diagram: string
  title?: string
  className?: string
}

export const MermaidViewer = memo(function MermaidViewer({
  diagram,
  title,
  className,
}: MermaidViewerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [renderState, setRenderState] = useState<'rendering' | 'ok' | 'error'>('rendering')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const svgRef = useRef<string>('')
  const errorSourcesRef = useRef<{ original: string; repaired: string } | null>(null)

  const render = useCallback(async (code: string, isRetry = false) => {
    if (!ref.current || !code?.trim()) return
    setRenderState('rendering')
    setErrorMsg(null)
    errorSourcesRef.current = null

    const originalCode = code
    const id = `mv-${Math.random().toString(36).slice(2, 9)}`
    const codeToRender = isRetry ? repairMermaidSyntax(code) : code.trim()

    if (isRetry) {
      try {
        await mermaid.parse(codeToRender)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errorSourcesRef.current = { original: originalCode, repaired: codeToRender }
        setErrorMsg(msg)
        setRenderState('error')
        if (ref.current) ref.current.innerHTML = ''
        return
      }
    }

    try {
      const { svg } = await mermaid.render(id, codeToRender)
      svgRef.current = svg
      if (ref.current) {
        ref.current.innerHTML = svg
        const svgEl = ref.current.querySelector('svg')
        if (svgEl) {
          svgEl.style.maxWidth = '100%'
          svgEl.style.height = 'auto'
        }
      }
      setRenderState('ok')
    } catch (e) {
      if (!isRetry) {
        await render(code, true)
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        errorSourcesRef.current = { original: originalCode, repaired: codeToRender }
        setErrorMsg(msg)
        setRenderState('error')
        if (ref.current) ref.current.innerHTML = ''
      }
    }
  }, [])

  useEffect(() => {
    render(diagram, false)
  }, [diagram, render])

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-border bg-surface-100', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-150 border-b border-border">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-accent-light" />
          <span className="text-xs font-medium text-text-tertiary">
            {title || 'Diagram'}
          </span>
          {renderState === 'rendering' && (
            <span className="text-xs text-accent animate-pulse font-semibold">Rendering…</span>
          )}
          {renderState === 'error' && (
            <span className="text-xs text-amber-400 font-semibold">Fallback view</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label="Zoom out" size="sm" onClick={() => setZoom(Math.max(40, zoom - 10))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </IconButton>
          <span className="text-xs text-text-tertiary w-8 text-center">{zoom}%</span>
          <IconButton label="Zoom in" size="sm" onClick={() => setZoom(Math.min(250, zoom + 10))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            label="Re-render"
            size="sm"
            onClick={() => render(diagram, true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            label="Download SVG"
            size="sm"
            onClick={() => svgRef.current && downloadSvg(svgRef.current, `${title || 'diagram'}.svg`)}
            disabled={renderState !== 'ok'}
          >
            <Download className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </IconButton>
        </div>
      </div>

      {/* Render area */}
      <div
        className={cn(
          'flex items-center justify-center overflow-auto bg-surface-50',
          isFullscreen ? 'h-[calc(100vh-160px)]' : 'min-h-[260px]',
        )}
      >
        {renderState === 'error' ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-3 bg-surface-50">
            <div className="flex flex-col items-center gap-1 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-1">
                <GitBranch className="w-5 h-5 text-accent-light" />
              </div>
              <p className="text-xs font-semibold text-text-primary">{title || 'Diagram'}</p>
              <p className="text-[11px] text-text-tertiary">
                Preview not available. Showing raw format.
              </p>
            </div>
            
            <div className="w-full text-left bg-surface-200/50 rounded-lg border border-border p-3 overflow-x-auto relative group">
              <button 
                onClick={() => navigator.clipboard.writeText(errorSourcesRef.current?.original || diagram)}
                className="absolute top-2 right-2 p-1.5 rounded bg-surface-300 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy code"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <pre className="text-xs font-mono text-text-secondary whitespace-pre">
                {errorSourcesRef.current?.original || diagram}
              </pre>
            </div>
            
            {process.env.NODE_ENV === 'development' && errorMsg && (
              <details className="w-full text-left mt-2">
                <summary className="text-[10px] text-red-400 cursor-pointer font-medium">Dev Only: Parser Error</summary>
                <pre className="mt-2 text-[10px] text-red-400/80 font-mono whitespace-pre-wrap bg-red-500/10 p-2 rounded max-h-32 overflow-auto">
                  {errorMsg}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
            className="p-6 w-full"
          >
            <div ref={ref} className="flex justify-center items-center" />
          </div>
        )}
      </div>
    </div>
  )
})
