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
        'max-w-[85%] rounded-[18px] px-4 py-3 text-sm leading-relaxed overflow-hidden shadow-sm',
        msg.role === 'user'
          ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/10 text-white rounded-tr-sm'
          : 'bg-[#18181B] border border-white/5 text-slate-200 rounded-tl-sm prose-sm dark:prose-invert prose-p:leading-normal prose-pre:my-2 prose-pre:bg-black/50'
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
          <span className="text-xs font-semibold text-text-primary tracking-wide uppercase">AI Assistant</span>
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
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.1)] border border-white/5">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-white mb-3 tracking-tight">Ask me anything</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              I can explain concepts, solve problems, review code, generate quizzes, and answer questions related to this lesson.
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

      <div className="px-6 py-4 border-t border-white/5 shrink-0 bg-surface-50/95 pb-[calc(env(safe-area-inset-bottom,1rem)+1rem)]">
        <div className="relative flex items-center gap-3 max-w-4xl mx-auto w-full">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'thinking' || status === 'streaming' ? "AI is typing..." : "Ask anything about this lesson..."}
            disabled={status === 'thinking' || status === 'streaming'}
            rows={1}
            className="flex-1 bg-[#121214] border border-[rgba(255,255,255,0.08)] rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.15)] resize-none transition-all disabled:opacity-50 h-[56px] min-h-[56px] leading-[22px]"
          />
          {status === 'thinking' || status === 'streaming' ? (
            <button onClick={stop} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors">
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button 
              onClick={handleSend} 
              disabled={!input.trim()} 
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale-[50%] hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] disabled:hover:shadow-none"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
