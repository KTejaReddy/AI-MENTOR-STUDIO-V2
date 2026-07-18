import type { GenerateRequest, SseEvent, AiModel, TopicSuggestion, SubjectInfo } from '@/types/ai'
import { fetchWithAuth, classifyFetchError } from '@/lib/api/client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getUrl(path: string): string {
  return `${BASE_URL}/api/v1/ai${path}`
}

export async function generateLesson(
  request: GenerateRequest,
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let url = getUrl('/generate')
  let body: any = request

  if (request.is_document && request.document_id) {
    url = `${BASE_URL}/api/v1/document/${request.document_id}/generate`
    body = {
      chapter_id: request.topic,
      difficulty: request.difficulty
    }
  }

  const reqId = Math.random().toString(36).substring(2) + Date.now().toString(36)
  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': reqId },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const detail = errorData?.detail || ''
    const status = response.status
    if (status === 401) throw new Error(detail || 'Authentication required — please log in')
    if (status === 429) throw new Error('Too many requests — please wait a moment')
    if (status >= 500) throw new Error(detail || `Backend error (${status}) — try again later`)
    throw new Error(detail || `Request failed (HTTP ${status})`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6))
          onEvent(parsed as SseEvent)
        } catch {
          // malformed JSON
        }
      } else if (trimmed.startsWith('event: ')) {
        continue
      }
    }
  }
}

export async function analyzeTopic(subject: string, topic: string): Promise<any> {
  const response = await fetchWithAuth(getUrl('/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, topic }),
  })
  if (!response.ok) throw new Error('Analysis failed')
  return response.json()
}

export async function fetchModels(): Promise<AiModel[]> {
  const response = await fetchWithAuth(getUrl('/models'))
  if (!response.ok) throw new Error('Failed to fetch models')
  const data = await response.json()
  return data.models
}

export async function fetchAiHealth(): Promise<any> {
  const response = await fetchWithAuth(getUrl('/health'))
  if (!response.ok) throw new Error('AI health check failed')
  return response.json()
}

export async function clearAiCache(): Promise<number> {
  const response = await fetchWithAuth(getUrl('/cache/clear'), { method: 'POST' })
  const data = await response.json()
  return data.cleared
}

export async function fetchTopicSuggestions(query: string): Promise<TopicSuggestion[]> {
  const response = await fetchWithAuth(getUrl(`/suggestions?query=${encodeURIComponent(query)}`))
  if (!response.ok) return []
  const data = await response.json()
  return data.suggestions
}

export async function fetchSubjects(): Promise<SubjectInfo[]> {
  const response = await fetchWithAuth(getUrl('/subjects'))
  if (!response.ok) return []
  const data = await response.json()
  return data.subjects
}
