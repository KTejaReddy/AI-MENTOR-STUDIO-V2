import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAuthHeaders, mergeHeaders } from '@/lib/api/client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'error' | 'done'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setMessages([])
    setStatus('idle')
    setError(null)
  }, [])

  const sendMessage = useCallback(async (content: string, context?: string) => {
    if (!content.trim()) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    const assistantMsgId = `msg-assistant-${Date.now()}`
    
    // Add user message, and a placeholder for assistant message
    setMessages(prev => [
      ...prev, 
      userMsg,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
    ])
    
    setStatus('thinking')
    setError(null)

    // Build history excluding the placeholder just added
    const history = messages.map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const reqId = Math.random().toString(36).substring(2) + Date.now().toString(36)
      await fetchEventSource(`${baseUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: mergeHeaders({ 'Content-Type': 'application/json', 'X-Request-ID': reqId }, getAuthHeaders()),
        body: JSON.stringify({
          message: content.trim(),
          history,
          context: context || '',
        }),
        signal: abortControllerRef.current.signal,
        onmessage(msg: any) {
          if (msg.event === 'message') {
            try {
              const data = JSON.parse(msg.data)
              
              if (data.type === 'chunk') {
                setStatus('streaming')
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    return { ...m, content: m.content + data.content }
                  }
                  return m
                }))
              } else if (data.type === 'error') {
                setStatus('error')
                setError(data.content)
              } else if (data.type === 'done') {
                setStatus('done')
                // Optional: clean up `<think>` tags
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    const cleaned = m.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
                    return { ...m, content: cleaned || m.content }
                  }
                  return m
                }))
              }
            } catch (err) {
              console.error('Error parsing SSE message', err)
            }
          }
        },
        onerror(err: any) {
          console.error('SSE Error:', err)
          setStatus('error')
          setError(err.message || 'Connection failed')
          throw err // Stop retrying
        },
        onclose() {
          setStatus(prev => prev === 'streaming' || prev === 'done' ? 'done' : 'error')
        }
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus('error')
        setError(err.message || 'Generation failed')
      }
    }
  }, [messages])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setStatus('done')
    }
  }, [])

  return {
    messages,
    status,
    error,
    sendMessage,
    clear,
    stop,
  }
}
