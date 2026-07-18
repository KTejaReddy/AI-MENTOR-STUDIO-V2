import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Play, Square, Sparkles, TerminalSquare, RotateCcw, Clock, Cpu, PanelLeftClose, PanelLeftOpen as PanelRightOpen, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'
import { cn } from '@/lib/utils'
import { ResizablePanel } from '@/components/ui/resizable'
import { CustomSelect } from '@/components/ui/select'
import { fetchWithAuth } from '@/lib/api/client'

const LANGUAGES = [
  { id: 'python', label: 'Python (3.10)', version: '3.10.0', defaultCode: 'print("Hello Mentor AI Studio!")' },
  { id: 'javascript', label: 'Node.js', version: '18.15.0', defaultCode: 'console.log("Hello Mentor AI Studio!");' },
  { id: 'c', label: 'C (GCC)', version: '10.2.0', defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello Mentor AI Studio!\\n");\n    return 0;\n}' },
  { id: 'cpp', label: 'C++ (GCC)', version: '10.2.0', defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello Mentor AI Studio!" << std::endl;\n    return 0;\n}' },
  { id: 'java', label: 'Java', version: '15.0.2', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Mentor AI Studio!");\n    }\n}' },
  { id: 'sql', label: 'SQL (SQLite)', version: '3', defaultCode: 'CREATE TABLE test (id INTEGER, name TEXT);\nINSERT INTO test VALUES (1, "Mentor AI Studio");\nSELECT * FROM test;' },
  { id: 'html', label: 'HTML/CSS/JS Preview', version: '5', defaultCode: '<!DOCTYPE html>\n<html>\n<head>\n<style>\n  h1 { color: #14b8a6; font-family: sans-serif; }\n</style>\n</head>\n<body>\n  <h1>Hello Mentor AI Studio!</h1>\n</body>\n</html>' },
]

const EXECUTION_TIMEOUT_MS = 10000

export function CompilerLab() {
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [code, setCode] = useState(language.defaultCode)
  const [output, setOutput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [execTime, setExecTime] = useState(0)
  const [aiOutput, setAiOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'console' | 'ai' | 'preview'>('console')
  const [outputPanelOpen, setOutputPanelOpen] = useState(true)
  const [langSwitchConfirm, setLangSwitchConfirm] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const runTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCode(language.defaultCode)
    if (language.id === 'html') setActiveTab('preview')
    else if (activeTab === 'preview') setActiveTab('console')
  }, [language.id])

  useEffect(() => {
    return () => {
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
    }
  }, [])

  const handleLanguageChange = (newLangId: string) => {
    const currentCode = code.trim()
    const defaultCodeTrimmed = language.defaultCode.trim()
    if (currentCode !== defaultCodeTrimmed && currentCode.length > 0) {
      setLangSwitchConfirm(newLangId)
    } else {
      const lang = LANGUAGES.find(l => l.id === newLangId)
      if (lang) setLanguage(lang)
    }
  }

  const confirmLanguageSwitch = () => {
    if (langSwitchConfirm) {
      const lang = LANGUAGES.find(l => l.id === langSwitchConfirm)
      if (lang) setLanguage(lang)
    }
    setLangSwitchConfirm(null)
  }

  const handleRun = async () => {
    setIsRunning(true)
    setErrorMsg('')
    setExecTime(0)
    setTimedOut(false)
    if (language.id === 'html') {
      setActiveTab('preview')
      if (iframeRef.current) iframeRef.current.srcdoc = code
      setIsRunning(false)
      return
    }
    setOutput('Running...\n')
    setActiveTab('console')

    runTimeoutRef.current = setTimeout(() => {
      setIsRunning(false)
      setTimedOut(true)
      setOutput('Execution timed out.')
    }, EXECUTION_TIMEOUT_MS)

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/compiler/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: language.id, version: language.version, code, stdin: '' })
      })
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
      const data = await res.json()
      if (data.run) {
        if (data.run.stderr) setErrorMsg(data.run.stderr)
        setOutput(data.run.output || (data.run.stderr ? '' : 'Execution finished with no output.'))
        setExecTime(data.run.execution_time_ms || 0)
      } else setOutput('Error executing code.')
    } catch (e) {
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
      setOutput(`Failed to execute: ${e}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleAiAction = async (action: string) => {
    setIsAiProcessing(true)
    setActiveTab('ai')
    setAiOutput('Processing request with AI...\n')
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/compiler/ai-action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, code, language: language.label })
      })
      const data = await res.json()
      setAiOutput(data.result || 'No response from AI.')
    } catch (e) { setAiOutput(`AI Request failed: ${e}`) }
    finally { setIsAiProcessing(false) }
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface overflow-hidden">
      <Dialog open={langSwitchConfirm !== null} onClose={() => setLangSwitchConfirm(null)}>
        <DialogContent>
          <DialogTitle>Switch Language?</DialogTitle>
          <p className="text-sm text-text-tertiary mt-1 mb-4">
            Switching language will replace the current code with the default template. Your current code will be lost.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setLangSwitchConfirm(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={confirmLanguageSwitch}>Switch</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Action Bar */}
      <div className="h-12 border-b border-border bg-surface-100/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <CustomSelect
            className="w-44"
            value={language.id}
            onChange={handleLanguageChange}
            options={LANGUAGES.map(l => ({ value: l.id, label: l.label }))}
          />
          <Button onClick={handleRun} disabled={isRunning} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setOutput(''); setErrorMsg(''); setExecTime(0); setTimedOut(false) }} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          {isRunning && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 border border-amber-400/30 bg-amber-500/10 px-2 py-1 rounded animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Running...
            </div>
          )}
          {timedOut && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-400 border border-red-400/30 bg-red-500/10 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" /> Timed out
            </div>
          )}
          {execTime > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary border border-border bg-surface-200 px-2 py-1 rounded">
              <Clock className="w-3 h-3" /> {execTime}ms
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleAiAction('explain')} disabled={isAiProcessing} className="text-xs h-7">Explain</Button>
          <Button variant="ghost" size="sm" onClick={() => handleAiAction('debug')} disabled={isAiProcessing} className="text-xs h-7">Debug</Button>
          <Button variant="ghost" size="sm" onClick={() => handleAiAction('optimize')} disabled={isAiProcessing} className="text-xs h-7">Optimize</Button>
        </div>
      </div>

      {/* Main Split Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className="flex-1 relative border-r border-border h-full bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language.id === 'c' || language.id === 'cpp' ? 'cpp' : language.id}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
              }}
            />
          </div>
        </div>

        {/* Output Pane Toggle */}
        {!outputPanelOpen && (
          <button
            onClick={() => setOutputPanelOpen(true)}
            className="shrink-0 h-6 md:w-6 md:h-full flex items-center justify-center border-t md:border-t-0 md:border-l border-border bg-surface-100 hover:bg-surface-150 transition-colors text-text-tertiary hover:text-text-primary z-20"
            aria-label="Open output panel"
          >
            <span className="md:hidden text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-[#00f2fe]">Open Panel <PanelRightOpen className="w-3 h-3 rotate-90" /></span>
            <PanelRightOpen className="hidden md:block w-3 h-3 text-[#00f2fe]" />
          </button>
        )}

        {/* Output Pane */}
        {outputPanelOpen && (
          <ResizablePanel
            defaultWidth={380}
            minWidth={280}
            maxWidth={550}
            side="right"
            className="flex flex-col bg-surface-150/90 backdrop-blur-md border-t md:border-t-0 md:border-l border-border relative h-1/2 md:h-full max-md:!w-full z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-none"
          >
            <div className="flex-1 flex flex-col w-full h-full min-w-0 overflow-hidden">
              <div className="flex border-b border-border h-9 shrink-0 w-full bg-surface-200/50">
                {language.id === 'html' ? (
                  <button onClick={() => setActiveTab('preview')} className={cn('flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors', activeTab === 'preview' ? 'text-[#00f2fe] bg-surface-200 border-b-2 border-[#00f2fe]' : 'text-text-tertiary hover:text-text-secondary')}>
                    <Cpu className="w-3.5 h-3.5" /> Live Preview
                  </button>
                ) : (
                  <button onClick={() => setActiveTab('console')} className={cn('flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors', activeTab === 'console' ? 'text-[#00f2fe] bg-surface-200 border-b-2 border-[#00f2fe]' : 'text-text-tertiary hover:text-text-secondary')}>
                    <TerminalSquare className="w-3.5 h-3.5" /> Console
                  </button>
                )}
                <button onClick={() => setActiveTab('ai')} className={cn('flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors', activeTab === 'ai' ? 'text-[#00f2fe] bg-surface-200 border-b-2 border-[#00f2fe]' : 'text-text-tertiary hover:text-text-secondary')}>
                  <Sparkles className="w-3.5 h-3.5" /> AI Assistant
                </button>
                <button onClick={() => setOutputPanelOpen(false)} className="px-3 text-text-tertiary hover:text-text-primary transition-colors border-l border-border" aria-label="Close output panel">
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative flex flex-col w-full">
                {activeTab === 'console' && (
                  <div className="flex-1 overflow-y-auto scrollbar-thin p-4 font-mono bg-[#030307]/75">
                    {/* Prompt Header */}
                    <div className="text-[10px] text-text-tertiary mb-3 flex items-center gap-1.5 opacity-60">
                      <span className="text-[#10b981]">➜</span>
                      <span>compiler-lab</span>
                      <span className="text-[#8b5cf6]">~</span>
                      <span className="text-[#00f2fe] font-bold">active</span>
                    </div>

                    <pre className="text-xs text-[#00f2fe] drop-shadow-[0_0_8px_rgba(0,242,254,0.15)] whitespace-pre-wrap leading-relaxed">
                      {output || (errorMsg ? '' : '// Output will appear here...')}
                    </pre>
                    {errorMsg && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-400 mb-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Error details:
                        </div>
                        <pre className="font-mono text-xs text-red-300/80 whitespace-pre-wrap leading-relaxed">{errorMsg}</pre>
                      </div>
                    )}
                    {!output && !errorMsg && !isRunning && (
                      <div className="flex flex-col items-center justify-center h-[70%] text-text-tertiary/60 text-xs">
                        <TerminalSquare className="w-6 h-6 mb-2 text-text-tertiary/40" />
                        <span>Press <kbd className="kbd mx-1 bg-white/5 text-text-secondary border-white/10 font-bold px-1.5 rounded">Run</kbd> to execute code</span>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'preview' && (
                  <iframe ref={iframeRef} className="w-full h-full bg-white border-0" sandbox="allow-scripts allow-same-origin" srcDoc={code} title="Live preview" />
                )}
                {activeTab === 'ai' && (
                  <div className="flex-1 overflow-y-auto scrollbar-thin p-5 leading-relaxed bg-[#05050b]/40">
                    {isAiProcessing ? (
                      <div className="flex flex-col items-center gap-2.5 text-text-tertiary text-xs justify-center py-12">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00f2fe]" />
                        <span className="font-bold uppercase tracking-wider text-[10px] text-[#00f2fe]/80 animate-pulse">Processing with AI...</span>
                      </div>
                    ) : (
                      <MarkdownRenderer content={aiOutput || '*Run an AI action from the header toolbar to see output explanations here.*'} />
                    )}
                  </div>
                )}
                {((isRunning && activeTab === 'console') || (isAiProcessing && activeTab === 'ai')) ? (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f2fe]"></span>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </ResizablePanel>
        )}
      </div>
    </div>
  )
}
