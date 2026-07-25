import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Play, Square, TerminalSquare, RotateCcw, Clock, Cpu, PanelLeftClose, PanelLeftOpen as PanelRightOpen, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResizablePanel } from '@/components/ui/resizable'
import { CustomSelect } from '@/components/ui/select'
import { fetchWithAuth } from '@/lib/api/client'

const LANGUAGES = [
  { id: 'python', label: 'Python (3.10)', version: '3.10.0', defaultCode: 'print("Hello, World!")' },
  { id: 'c', label: 'C (GCC)', version: '10.2.0', defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!");\n    return 0;\n}' },
  { id: 'cpp', label: 'C++ (GCC)', version: '10.2.0', defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!";\n    return 0;\n}' },
  { id: 'java', label: 'Java', version: '15.0.2', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
  { id: 'javascript', label: 'Node.js', version: '18.15.0', defaultCode: 'console.log("Hello, World!");' },
  { id: 'csharp', label: 'C# (.NET)', version: '7.0', defaultCode: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}' },
  { id: 'go', label: 'Go', version: '1.20', defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
  { id: 'rust', label: 'Rust', version: '1.70', defaultCode: 'fn main() {\n    println!("Hello, World!");\n}' },
  { id: 'php', label: 'PHP', version: '8.2', defaultCode: '<?php\necho "Hello, World!";\n?>' },
  { id: 'kotlin', label: 'Kotlin', version: '1.8', defaultCode: 'fun main() {\n    println("Hello, World!")\n}' },
]

const EXECUTION_TIMEOUT_MS = 10000

export function CompilerLab() {
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [code, setCode] = useState(language.defaultCode)
  const [stdin, setStdin] = useState('')
  const [output, setOutput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [compileOutput, setCompileOutput] = useState('')
  const [execTime, setExecTime] = useState(0)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [compilerVersion, setCompilerVersion] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [outputPanelOpen, setOutputPanelOpen] = useState(true)
  const [langSwitchConfirm, setLangSwitchConfirm] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const runTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCode(language.defaultCode)
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
    setCompileOutput('')
    setExecTime(0)
    setExitCode(null)
    setCompilerVersion('')
    setTimedOut(false)
    if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
    setOutput('Running...\n')

    runTimeoutRef.current = setTimeout(() => {
      setIsRunning(false)
      setTimedOut(true)
      setOutput('Execution timed out.')
    }, EXECUTION_TIMEOUT_MS)

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/compiler/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: language.id, version: language.version, code, stdin })
      })
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
      const data = await res.json()
      if (data.run) {
        if (data.run.stderr) setErrorMsg(data.run.stderr)
        if (data.run.compile_output) setCompileOutput(data.run.compile_output)
        
        setOutput(data.run.stdout || (data.run.stderr || data.run.compile_output ? '' : 'Execution finished with no output.'))
        setExecTime(data.run.time_ms || 0)
        setExitCode(data.run.exit_code)
        setCompilerVersion(data.run.compiler_version || '')
      } else setOutput('Error executing code.')
    } catch (e) {
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current)
      setOutput(`Failed to execute: ${e}`)
    } finally {
      setIsRunning(false)
    }
  }

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
            <div className="flex items-center gap-1.5 text-xs text-amber-400 border border-amber-400/30 bg-amber-500/10 px-2 py-1 rounded animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Running...
            </div>
          )}
          {timedOut && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 border border-red-400/30 bg-red-500/10 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" /> Timed out
            </div>
          )}
          {execTime > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary border border-border bg-surface-200 px-2 py-1 rounded">
                <Clock className="w-3 h-3" /> {execTime}ms
              </div>
              {exitCode !== null && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-text-tertiary border border-border bg-surface-200 px-2 py-1 rounded">
                  <TerminalSquare className="w-3 h-3" /> Exit: {exitCode}
                </div>
              )}
              {compilerVersion && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-text-tertiary border border-border bg-surface-200 px-2 py-1 rounded">
                  <Cpu className="w-3 h-3" /> {compilerVersion}
                </div>
              )}
            </div>
          )}
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
            <span className="md:hidden text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[var(--color-compiler)]">Open Panel <PanelRightOpen className="w-3 h-3 rotate-90" /></span>
            <PanelRightOpen className="hidden md:block w-3 h-3 text-[var(--color-compiler)]" />
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
              <div className="flex-1 overflow-hidden relative flex flex-col w-full">
                  <div className="flex-1 flex flex-col font-mono bg-[#030307]/75">
                    
                    {/* Stdin Input */}
                    <div className="p-3 border-b border-border/50 shrink-0 bg-black/20">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Standard Input (stdin)</div>
                        <button onClick={() => setOutputPanelOpen(false)} className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="Close output panel">
                          <PanelLeftClose className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={stdin}
                        onChange={e => setStdin(e.target.value)}
                        placeholder="Provide inputs here before running..."
                        className="w-full h-12 bg-transparent text-xs text-text-secondary placeholder:text-text-tertiary/30 outline-none resize-y min-h-[40px] font-mono scrollbar-thin"
                        spellCheck={false}
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                      {/* Prompt Header */}
                      <div className="text-xs text-text-tertiary mb-3 flex items-center gap-1.5 opacity-60">
                        <span className="text-[#10b981]">➜</span>
                        <span>compiler-lab</span>
                        <span className="text-[#8b5cf6]">~</span>
                        <span className="text-[var(--color-compiler)] font-bold">active</span>
                      </div>

                      {compileOutput && (
                        <div className="mb-4 p-3 rounded-lg bg-surface-200/50 border border-border">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-text-tertiary mb-1.5">
                            <Cpu className="w-3 h-3" /> Compilation Output:
                          </div>
                          <pre className="font-mono text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{compileOutput}</pre>
                        </div>
                      )}

                      <pre className="text-xs text-[var(--color-compiler)] drop-shadow-[0_0_8px_rgba(var(--color-compiler-rgb),0.15)] whitespace-pre-wrap leading-relaxed">
                        {output || (errorMsg || compileOutput ? '' : '// Output will appear here...')}
                      </pre>
                    {errorMsg && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-1.5">
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
                  </div>
                {isRunning ? (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-compiler)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-compiler)]"></span>
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
