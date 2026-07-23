import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconButton } from '@/components/ui/icon-button'
import { useChat } from '@/hooks/useChat'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'
import { cn } from '@/lib/utils'
import {
  Send, Sparkles, Lightbulb, FileText, HelpCircle, Code2, Search,
  GitCompare, Globe, Trash2, Mic, Paperclip, Loader2, AlertCircle, RefreshCw, Square
} from 'lucide-react'

const suggestions = [
  { icon: Lightbulb, label: 'Explain Like I\'m 10', prompt: 'Explain this like I\'m 10 years old' },
  { icon: FileText, label: 'Summarize', prompt: 'Summarize the key points' },
  { icon: Search, label: 'Find Mistakes', prompt: 'Find common mistakes in' },
  { icon: GitCompare, label: 'Compare', prompt: 'Compare and contrast' },
  { icon: Code2, label: 'Give Example', prompt: 'Give me a concrete example of' },
  { icon: Globe, label: 'Real World', prompt: 'What are real-world applications of' },
]

const ChatMessage = memo(function ChatMessage({ msg }: { msg: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
    >
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-3.5 h-3.5 text-accent-light" />
        </div>
      )}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-hidden',
        msg.role === 'user'
          ? 'bg-accent/15 text-text-primary rounded-tr-sm'
          : 'bg-surface-100 border border-border text-text-secondary rounded-tl-sm prose-sm dark:prose-invert prose-p:leading-normal prose-pre:my-2 prose-pre:bg-surface-200'
      )}>
        {msg.role === 'user' ? (
          msg.content
        ) : (
          msg.content ? (
            <MarkdownRenderer content={msg.content} />
          ) : (
            <div className="flex items-center gap-2 h-5 text-text-tertiary">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs animate-pulse">Thinking...</span>
            </div>
          )
        )}
      </div>
    </motion.div>
  )
}, (prev, next) => prev.msg.id === next.msg.id && prev.msg.content === next.msg.content)

export const AICompanion = memo(function AICompanion() {
  const [input, setInput] = useState('')
  const { messages, status, error, sendMessage, clear, stop } = useChat()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastInputRef = useRef('')

  useEffect(() => { 
    inputRef.current?.focus() 
    
    const handleContextEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.context) {
        setInput(`Regarding ${customEvent.detail.context}:\n\n`)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
    window.addEventListener('mentor-toggle-chat', handleContextEvent)
    return () => window.removeEventListener('mentor-toggle-chat', handleContextEvent)
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, status, error])

  const handleSend = useCallback(() => {
    if (!input.trim() || status === 'thinking' || status === 'streaming') return
    const text = input.trim()
    lastInputRef.current = text
    sendMessage(text)
    setInput('')
  }, [input, status, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const handleSuggestion = useCallback((prompt: string) => {
    setInput(prompt + ' ')
    inputRef.current?.focus()
  }, [])

  const handleRetry = useCallback(() => {
    if (lastInputRef.current) sendMessage(lastInputRef.current)
  }, [sendMessage])

  return (
    <div className="flex flex-col h-full bg-surface-50/95 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-accent-light" />
          </div>
          <span className="text-xs font-semibold text-text-primary">AI Assistant</span>
          <span className="text-xs text-text-tertiary hidden sm:inline">Groq · Llama 3.3 70B</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {messages.length > 0 && (
            <IconButton label="Clear conversation" size="sm" onClick={clear}>
              <Trash2 className="w-3.5 h-3.5" />
            </IconButton>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-accent-light" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Ask me anything</p>
            <p className="text-xs text-text-tertiary max-w-xs">
              I can help explain concepts, review code, debug issues, or answer questions about this topic
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}
          {status === 'error' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm leading-relaxed rounded-tl-sm flex flex-col gap-2">
                <span className="font-medium">Connection Error</span>
                <p className="text-xs text-red-300/80">{error || 'Failed to communicate with AI.'}</p>
                <button onClick={handleRetry} className="mt-1 flex items-center self-start gap-1.5 px-3 py-1.5 rounded-md bg-red-500/20 text-xs font-medium hover:bg-red-500/30 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {messages.length === 0 && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s.label} onClick={() => handleSuggestion(s.prompt)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-tertiary border border-border hover:border-border-light hover:text-text-secondary hover:bg-surface-150 transition-all"
              >
                <s.icon className="w-3 h-3" /> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border shrink-0 pb-[calc(env(safe-area-inset-bottom,0.5rem)+0.75rem)]">
        <div className="relative flex items-end gap-2">
          <div className="flex items-center gap-1 absolute left-2 bottom-2.5 z-10">
            <IconButton label="Attach file" size="sm">
              <Paperclip className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton label="Voice input" size="sm">
              <Mic className="w-3.5 h-3.5" />
            </IconButton>
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'thinking' || status === 'streaming' ? "AI is typing..." : "Ask a question..."}
            disabled={status === 'thinking' || status === 'streaming'}
            rows={1}
            className="flex-1 bg-surface-150 border border-border rounded-xl pl-16 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 resize-none transition-all max-h-24 disabled:opacity-50"
            style={{ minHeight: 40 }}
          />
          {status === 'thinking' || status === 'streaming' ? (
            <IconButton label="Stop generating" onClick={stop}
              className="absolute right-2 bottom-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Square className="w-[14px] h-[14px] fill-current" />
            </IconButton>
          ) : (
            <IconButton label="Send message" variant="primary" onClick={handleSend} disabled={!input.trim()} className="absolute right-2 bottom-2">
              <Send className="w-[18px] h-[18px]" />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  )
})
