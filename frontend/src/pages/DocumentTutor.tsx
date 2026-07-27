import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileUp, FileText, Loader2, LayoutTemplate, X, Download } from 'lucide-react'
import { motion } from 'framer-motion'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/api/client'

interface DocumentItem {
  document_id: string
  filename: string
  title: string
  status: string
  explanation?: string
  id?: string
}

export function DocumentTutor() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
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
        setUploading(false)
        pollDocumentStatus(data.document_id)
        setDocumentError(null)
      } else {
        setDocumentError('Upload failed: Missing document_id in response.')
        setUploading(false)
      }
    } catch (error) {
      console.error(error)
      setDocumentError('An error occurred during upload.')
      setUploading(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const pollDocumentStatus = async (id: string) => {
    setLoading(true)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    const checkStatus = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/document/${id}`)
        const data = await res.json()
        setActiveDoc(data)
        
        if (data.status === 'ready' || data.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setLoading(false)
          if (data.status === 'failed') {
             setDocumentError(data.error || 'Failed to analyze document.')
          }
        }
      } catch (e) {
        console.error(e)
      }
    }

    // Initial check
    await checkStatus()
    // Poll every 2 seconds if not finished
    pollIntervalRef.current = setInterval(checkStatus, 2000)
  }

  const loadDocument = (id: string) => {
    setDocumentError(null)
    pollDocumentStatus(id)
  }

  const handleDownloadMarkdown = () => {
    if (!activeDoc?.explanation) return
    
    const blob = new Blob([activeDoc.explanation], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDoc.title || 'document'}_explanation.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full w-full bg-surface overflow-hidden text-text-primary">
      {/* LEFT SIDEBAR - Document Library */}
      <div className="w-64 border-r border-border flex flex-col bg-surface-150 shrink-0 relative">
        <div className="p-4 border-b border-border space-y-3 flex items-center justify-between">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.pptx,.txt,.md" />
          <Button onClick={() => fileInputRef.current?.click()} className="flex-1" disabled={loading || uploading}>
            {(loading || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
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
                    activeDoc?.id === doc.document_id
                      ? 'border-[var(--color-ai)]/30 bg-[var(--color-ai)]/10'
                      : 'border-border hover:border-border-light hover:bg-surface-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={cn('w-4 h-4 shrink-0', activeDoc?.id === doc.document_id ? 'text-[var(--color-ai)]' : 'text-text-tertiary')} />
                    <span className="text-xs font-medium text-text-primary truncate">{doc.title || doc.filename}</span>
                  </div>
                </button>
              ))}
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

      {/* CENTER - Document Content */}
      <div className="flex-1 flex flex-col bg-surface min-w-0 overflow-hidden relative">
        {activeDoc ? (
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="max-w-4xl mx-auto w-full p-6 lg:p-8 pb-32">
                
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
                      {activeDoc.title || activeDoc.filename}
                    </h1>
                    {activeDoc.status === 'ready' && activeDoc.explanation && (
                      <Button variant="secondary" size="sm" onClick={handleDownloadMarkdown}>
                        <Download className="w-4 h-4 mr-2" /> Download as Markdown
                      </Button>
                    )}
                  </div>
                  {documentError && (
                    <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4 flex items-center gap-2">
                       <X className="w-4 h-4" /> {documentError}
                       <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadDocument(activeDoc.id as string)}>Retry</Button>
                    </div>
                  )}
                </div>

                {/* Explanation Content */}
                {activeDoc.status === 'processing' || loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-[var(--color-ai)] mb-4" />
                    <p className="text-sm font-medium text-text-secondary">Processing document...</p>
                    <p className="text-xs text-text-tertiary mt-2">Generating simplified explanation...</p>
                  </div>
                ) : activeDoc.explanation ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-primary prose-a:text-[var(--color-ai)] bg-surface-100 p-8 rounded-xl border border-border"
                  >
                    <MarkdownRenderer content={activeDoc.explanation} />
                  </motion.div>
                ) : null}
              </div>
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
              {(loading || uploading) && (
                <motion.div
                  className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-ai)] to-transparent z-10"
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-ai)]/20 to-[#8b5cf6]/10 border border-[var(--color-ai)]/20 flex items-center justify-center shrink-0 mb-6 group-hover:scale-105 transition-transform duration-300">
                {(loading || uploading) ? (
                  <Loader2 className="w-8 h-8 text-[var(--color-ai)] animate-spin" />
                ) : (
                  <FileUp className="w-8 h-8 text-[var(--color-ai)]" />
                )}
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-2 group-hover:text-[var(--color-ai)] transition-colors">
                {uploading ? 'Uploading...' : loading ? 'Processing Document...' : 'Upload PDF / Text Document'}
              </h3>
              <p className="text-xs text-text-tertiary max-w-xs leading-relaxed mb-6">
                Upload a document to receive a simplified explanation generated by AI.
              </p>
              <Button variant="primary" size="sm" className="font-semibold shadow-glow-accent" disabled={loading || uploading}>
                Browse Files
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
