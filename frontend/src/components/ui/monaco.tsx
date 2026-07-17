import { useState, useRef, useCallback, memo } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'
import { Maximize2, Minimize2, Copy, Download, WrapText } from 'lucide-react'

interface MonacoProps {
  value: string
  language?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: number | string
  className?: string
}

export const Monaco = memo(function Monaco({
  value,
  language = 'python',
  onChange,
  readOnly = false,
  height = 400,
  className,
}: MonacoProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [wordWrap, setWordWrap] = useState(true)

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    editor.focus()
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
  }, [value])

  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${language === 'python' ? 'py' : language}`
    a.click()
    URL.revokeObjectURL(url)
  }, [value, language])

  const editorHeight = isFullscreen ? window.innerHeight - 120 : height

  return (
    <div className={cn('relative group rounded-xl overflow-hidden border border-border', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-150 border-b border-border">
        <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
          {language}
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton label="Copy code" size="sm" onClick={handleCopy}>
            <Copy className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton label="Download" size="sm" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            label={wordWrap ? 'Disable wrap' : 'Enable wrap'}
            size="sm"
            onClick={() => setWordWrap(!wordWrap)}
            className={wordWrap ? 'text-accent-light' : ''}
          >
            <WrapText className="w-3.5 h-3.5" />
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
      <Editor
        height={editorHeight}
        language={language}
        value={value}
        onChange={(v) => onChange?.(v || '')}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: wordWrap ? 'on' : 'off',
          tabSize: 4,
          padding: { top: 12 },
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
        }}
      />
    </div>
  )
})
