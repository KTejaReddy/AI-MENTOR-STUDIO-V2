import { useState, useRef, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUp, FileText, Search, BookMarked, List, Loader2, Zap, LayoutTemplate, PanelLeftClose, PanelLeftOpen, ChevronRight, Sparkles, X } from 'lucide-react'
import { motion } from 'framer-motion'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'
import { useTabs } from '@/contexts/TabContext'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { StreamingLesson } from '@/components/ai/StreamingLesson'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/api/client'

interface DocumentItem {
  document_id: string
  filename: string
  title: string
  outline?: any
  full_text?: string
  metadata?: any
  knowledge_graph?: any
}

const AI_ACTIONS = [
  { id: 'explain', label: 'Explain Selection', icon: Sparkles },
  { id: 'summarize', label: 'Summarize', icon: FileText },
  { id: 'quiz', label: 'Generate Quiz', icon: Zap },
  { id: 'simplify', label: 'Simplify', icon: ChevronRight },
  { id: 'examples', label: 'Examples', icon: List },
  { id: 'notes', label: 'Generate Notes', icon: BookMarked },
]

export function DocumentTutor() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tutorPanelOpen, setTutorPanelOpen] = useState(true)

  const [selectedText, setSelectedText] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null)

  const [tutorContent, setTutorContent] = useState('')
  const [tutorLoading, setTutorLoading] = useState(false)
  const [activeChapter, setActiveChapter] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'lesson' | 'original'>('lesson')

  const aiGen = useAIGeneration()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { createTab } = useTabs()

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)
    }
  }, [])

  const loadDocuments = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/document/list`)
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadDocuments()
    const handleClickOutside = () => setContextMenu(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/document/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.document_id) {
        await loadDocuments()
        loadDocument(data.document_id)
        setDocumentError(null)
      } else {
        setDocumentError('Upload failed: Missing document_id in response.')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const loadDocument = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/document/${id}`)
      const data = await res.json()
      setActiveDoc(data)
      setTutorContent('')
      setActiveChapter(null)
      if (!data.outline?.chapters || data.outline.chapters.length === 0) {
        setDocumentError('Analyzing document structure...')
        const analyzeRes = await fetchWithAuth(`${API_BASE}/api/v1/document/${id}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: id })
        })
        const analyzedData = await analyzeRes.json()
        setActiveDoc(analyzedData)
        setDocumentError(null)
        if (analyzedData.outline?.chapters?.length > 0) {
          if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)
          generateTimeoutRef.current = setTimeout(() => generateChapterLesson(analyzedData, analyzedData.outline.chapters[0].title), 500)
        }
      } else {
        if (data.outline?.chapters?.length > 0) {
          if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)
          generateTimeoutRef.current = setTimeout(() => generateChapterLesson(data, data.outline.chapters[0].title), 500)
        }
      }
    } catch (e) {
      console.error(e)
      setDocumentError("Failed to load document.")
    } finally {
      setLoading(false)
    }
  }

  const generateChapterLesson = async (doc: DocumentItem, chapterTitle: string) => {
    const chapter = doc.outline?.chapters?.find((c: any) => c.title === chapterTitle)
    setActiveChapter(chapter || { title: chapterTitle })
    let difficulty = (doc.metadata?.difficulty || 'intermediate').toLowerCase()
    if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(difficulty)) difficulty = 'intermediate'
    aiGen.generate({
      subject: doc.metadata?.subject || doc.filename,
      topic: chapterTitle,
      difficulty: difficulty as any,
      learning_mode: 'deep',
      is_document: true,
      document_id: doc.document_id
    })
    setActiveTab('lesson')
  }

  const handleParagraphClick = (text: string) => {
    setSelectedText(text)
    handleDocumentAction('Explain Selection', false, text)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim())
      setContextMenu({ x: e.pageX, y: e.pageY })
    } else {
      setContextMenu(null)
    }
  }

  const handleDocumentAction = async (action: string, isChapterAction = false, overrideSelection: string | null = null, chapterTitle = '') => {
    if (!activeDoc?.document_id || isChapterAction) return
    setTutorLoading(true)
    setTutorContent('')
    setContextMenu(null)
    try {
      let endpoint = `${API_BASE}/api/v1/document/${activeDoc.document_id}/explain`
      let reqBody: any = {}
      if (action === 'Explain Selection') {
        reqBody = { selection: overrideSelection || selectedText || "General overview", chapter_id: chapterTitle || activeChapter?.title || undefined }
      } else if (action === 'Summarize') {
        endpoint = `${API_BASE}/api/v1/document/${activeDoc.document_id}/summary`
        reqBody = { chapter_id: chapterTitle || activeChapter?.title || undefined }
      } else {
        endpoint = `${API_BASE}/api/v1/document/${activeDoc.document_id}/chat`
        reqBody = { query: action, context: overrideSelection || selectedText || undefined }
      }
      const res = await fetchWithAuth(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) })
      const data = await res.json()
      setTutorContent(data.result || "No content generated.")
    } catch (e) {
      console.error(e)
      setTutorContent("An error occurred.")
    } finally {
      setTutorLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full bg-surface overflow-hidden text-text-primary">
      {/* LEFT SIDEBAR - Document Library & Outline */}
      <div className={cn(
        'border-r border-border flex flex-col bg-surface-150 shrink-0 transition-all duration-200 z-40',
        sidebarOpen ? 'w-full md:w-64 absolute md:relative inset-y-0 left-0' : 'w-0 overflow-hidden'
      )}>
        <div className="p-4 border-b border-border space-y-3 flex items-center justify-between">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.pptx,.txt,.md" />
          <Button onClick={() => fileInputRef.current?.click()} className="flex-1" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Upload Document'}
          </Button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-text-tertiary">
             <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {documents.length > 0 && (
            <div className="space-y-1.5">
              <p className="section-title">Your Documents</p>
              {documents.map((doc) => (
                <button
                  key={doc.document_id}
                  onClick={() => loadDocument(doc.document_id)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    activeDoc?.document_id === doc.document_id
                      ? 'border-[var(--color-ai)]/30 bg-[var(--color-ai)]/10'
                      : 'border-border hover:border-border-light hover:bg-surface-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={cn('w-4 h-4 shrink-0', activeDoc?.document_id === doc.document_id ? 'text-[var(--color-ai)]' : 'text-text-tertiary')} />
                    <span className="text-xs font-medium text-text-primary truncate">{doc.title || doc.filename}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeDoc && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveDoc(null)} className="btn-ghost text-xs h-6 px-2">
                  ← Library
                </button>
              </div>
              <div>
                <p className="section-title">Document Outline</p>
                <div className="space-y-0.5 ml-1 pl-3 border-l-2 border-border">
                  {activeDoc.outline?.chapters?.map((ch: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => generateChapterLesson(activeDoc, ch.title)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                        activeChapter?.title === ch.title
                          ? 'bg-[var(--color-ai)]/10 text-[var(--color-ai)] font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-200'
                      )}
                    >
                      <span className="text-xs text-text-tertiary mr-2 font-mono">{idx + 1}.</span>
                      {ch.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {documents.length === 0 && !activeDoc && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <LayoutTemplate className="w-10 h-10 text-text-tertiary/40 mb-3" />
              <p className="text-xs text-text-tertiary">Upload a document to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="shrink-0 w-6 flex items-center justify-center border-r border-border bg-surface-100 hover:bg-surface-150 transition-colors text-text-tertiary hover:text-text-primary"
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose className="w-3 h-3" /> : <PanelLeftOpen className="w-3 h-3" />}
      </button>

      {/* CENTER - Document Content */}
      <div
        className="flex-1 flex flex-col bg-surface min-w-0 overflow-hidden relative"
        onContextMenu={handleContextMenu}
        ref={contentRef}
      >
        {activeDoc ? (
          <div className="flex flex-col h-full w-full">
            {/* Tabs Header */}
            <div className="flex border-b border-border bg-surface-100/80 backdrop-blur-sm px-4 pt-2 shrink-0">
              <button
                onClick={() => setActiveTab('lesson')}
                className={cn(
                  'px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                  activeTab === 'lesson' ? 'border-[var(--color-ai)] text-[var(--color-ai)]' : 'border-transparent text-text-tertiary hover:text-text-secondary'
                )}
              >
                AI Lesson
              </button>
              <button
                onClick={() => setActiveTab('original')}
                className={cn(
                  'px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                  activeTab === 'original' ? 'border-[var(--color-ai)] text-[var(--color-ai)]' : 'border-transparent text-text-tertiary hover:text-text-secondary'
                )}
              >
                Original Document
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === 'lesson' ? (
                <div className="max-w-4xl mx-auto w-full p-6 lg:p-8 pb-32">
                  {/* Document Header */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
                        {activeDoc.outline?.title || activeDoc.filename}
                      </h1>
                      <Button variant="secondary" size="sm" onClick={() => handleDocumentAction('Summarize')} disabled={!activeDoc?.document_id}>
                        <Zap className="w-4 h-4" /> Summarize
                      </Button>
                    </div>
                    {documentError && (
                      <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4">
                        {documentError}
                      </div>
                    )}
                  </div>

                  {/* Document Overview */}
                  {activeDoc.metadata && (
                    <div className="mb-8 p-5 bg-surface-100 rounded-xl border border-border">
                      <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-[var(--color-ai)]" /> Document Overview
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-surface-200/50 rounded-lg">
                          <p className="text-xs text-text-tertiary uppercase font-semibold mb-0.5">Subject</p>
                          <p className="text-xs text-text-primary font-medium">{activeDoc.metadata.subject || '—'}</p>
                        </div>
                        <div className="p-3 bg-surface-200/50 rounded-lg">
                          <p className="text-xs text-text-tertiary uppercase font-semibold mb-0.5">Difficulty</p>
                          <p className="text-xs text-text-primary font-medium capitalize">{activeDoc.metadata.difficulty || '—'}</p>
                        </div>
                        <div className="p-3 bg-surface-200/50 rounded-lg">
                          <p className="text-xs text-text-tertiary uppercase font-semibold mb-0.5">Reading Time</p>
                          <p className="text-xs text-text-primary font-medium">{activeDoc.metadata.reading_time_minutes || 30} mins</p>
                        </div>
                        <div className="p-3 bg-surface-200/50 rounded-lg">
                          <p className="text-xs text-text-tertiary uppercase font-semibold mb-0.5">Branch</p>
                          <p className="text-xs text-text-primary font-medium">{activeDoc.metadata.branch || 'General'}</p>
                        </div>
                      </div>
                      {activeDoc.metadata.learning_objectives?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-text-tertiary uppercase font-semibold mb-2">Learning Objectives</p>
                          <ul className="list-disc pl-5 text-xs text-text-secondary space-y-1">
                            {activeDoc.metadata.learning_objectives.map((obj: string, i: number) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activeDoc.knowledge_graph?.nodes?.length > 0 && (
                        <div>
                          <p className="text-xs text-text-tertiary uppercase font-semibold mb-2">Key Concepts</p>
                          <div className="flex flex-wrap gap-1.5">
                            {activeDoc.knowledge_graph.nodes.map((node: any, i: number) => (
                              <Badge key={i} variant="accent" size="sm">{node.label}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Streaming Lesson */}
                  {activeChapter ? (
                    <div className="w-full">
                      <StreamingLesson
                        status={aiGen.status}
                        lesson={aiGen.lesson}
                        mapped={aiGen.mapped}
                        accumulatedContent=""
                        analysis={aiGen.analysis}
                        errorMessage={aiGen.error}
                        sectionStatuses={aiGen.sectionStatuses}
                        metrics={aiGen.metrics}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-20 text-text-tertiary">
                      <p className="text-sm">Select a chapter from the outline to begin the lesson</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full p-6 lg:p-8 pb-32">
                  <div className="bg-surface-100 p-6 rounded-xl border border-border whitespace-pre-wrap font-mono text-xs text-text-secondary leading-relaxed">
                    {activeDoc.full_text || "Document text is empty or could not be extracted."}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-md p-10 rounded-[var(--radius-xl)] card border border-border shadow-2xl bg-surface-150/40 cursor-pointer flex flex-col items-center group relative overflow-hidden"
            >
              {/* Scanline Animation */}
              {loading && (
                <motion.div
                  className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-ai)] to-transparent z-10"
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-ai)]/20 to-[#8b5cf6]/10 border border-[var(--color-ai)]/20 flex items-center justify-center shrink-0 mb-6 group-hover:scale-105 transition-transform duration-300">
                {loading ? (
                  <Loader2 className="w-8 h-8 text-[var(--color-ai)] animate-spin" />
                ) : (
                  <FileUp className="w-8 h-8 text-[var(--color-ai)]" />
                )}
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-2 group-hover:text-[var(--color-ai)] transition-colors">
                {loading ? 'Processing Document...' : 'Upload PDF / Text Document'}
              </h3>
              <p className="text-xs text-text-tertiary max-w-xs leading-relaxed mb-6">
                Drag and drop your file here, or click to browse. We will build a customized interactive lesson structure.
              </p>
              <Button variant="primary" size="sm" className="font-semibold shadow-glow-accent" disabled={loading}>
                Browse Files
              </Button>
            </motion.div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-surface-200 border border-border shadow-elevated rounded-lg py-1.5 w-52 z-50 flex flex-col"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
            aria-label="AI actions"
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-text-tertiary border-b border-border mb-1 uppercase tracking-wider">AI Actions</div>
            {['Explain Selection', 'Simplify', 'Generate Quiz', 'Generate Notes', 'Generate Flashcards'].map(action => (
              <button
                key={action}
                onClick={() => handleDocumentAction(action)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDocumentAction(action) } }}
                className="text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-[var(--color-ai)] hover:text-white transition-colors focus-visible:outline-none focus-visible:bg-[var(--color-ai)]/20"
                role="menuitem"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL - AI Tutor */}
      <div className={cn(
        'border-l border-border flex flex-col bg-surface-150 shrink-0 transition-all duration-200',
        tutorPanelOpen ? 'w-72' : 'w-0 overflow-hidden'
      )}>
        <div className="panel-header">
          <Zap className="w-4 h-4 text-[var(--color-ai)]" />
          <span className="panel-title">AI Tutor</span>
          <button onClick={() => setTutorPanelOpen(false)} className="ml-auto text-text-tertiary hover:text-text-primary transition-colors">
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3 border-b border-border grid grid-cols-2 gap-1.5">
          {AI_ACTIONS.map((act) => (
            <Button key={act.id} variant="secondary" size="sm" className="text-xs justify-start h-7 px-2 border-white/5 hover:border-[var(--color-ai)]/20" onClick={() => handleDocumentAction(act.label)} disabled={!activeDoc?.document_id || tutorLoading}>
              <act.icon className="w-3 h-3 shrink-0 text-[var(--color-ai)]" />
              <span className="truncate">{act.label}</span>
            </Button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 bg-surface-200/30">
          {tutorLoading && !tutorContent && (
            <div className="flex items-center gap-2 text-text-tertiary text-xs p-4 justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-ai)]" /> Thinking...
            </div>
          )}
          {tutorContent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 rounded-[var(--radius-md)] border border-border shadow-sm bg-surface-100/50"
            >
              <MarkdownRenderer content={tutorContent} />
            </motion.div>
          )}
          {!tutorContent && !tutorLoading && (
            <div className="text-center text-text-tertiary text-xs mt-10 px-2 leading-relaxed font-mono">
              <p>Highlight text and right-click, or choose an action above to start learning</p>
            </div>
          )}
        </div>
      </div>

      {/* Tutor Panel Toggle (when closed) */}
      {!tutorPanelOpen && (
        <button onClick={() => setTutorPanelOpen(true)} className="shrink-0 w-6 flex items-center justify-center border-l border-border bg-surface-100 hover:bg-surface-150 transition-colors text-text-tertiary hover:text-text-primary" aria-label="Open AI tutor">
          <PanelLeftOpen className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
