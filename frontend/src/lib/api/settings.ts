const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getUrl(path: string): string {
  return `${BASE_URL}/api/v1/settings${path}`
}

export interface ApiKeyEntry {
  id: number
  masked_key: string
  label: string | null
  status: string
  provider: string
  is_enabled: boolean
  last_used_at: string | null
  last_error_at: string | null
  last_error_message: string | null
  total_requests: number
  total_errors: number
  created_at: string
  updated_at: string
}

export interface ApiKeyImportResult {
  imported: number
  failed: number
  skipped: number
  results: Array<{ key: string; status: string; message: string }>
}

export interface ApiKeyTestResult {
  key_id: number
  status: string
  message: string
  models_accessible: string[]
  latency_ms: number | null
}

export async function fetchApiKeys(): Promise<{ items: ApiKeyEntry[]; total: number }> {
  const response = await fetch(getUrl('/api-keys'))
  if (!response.ok) throw new Error('Failed to fetch API keys')
  return response.json()
}

export async function importApiKeys(keys: string, provider = 'groq'): Promise<ApiKeyImportResult> {
  const response = await fetch(getUrl('/api-keys/import'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys, provider }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Import failed')
  }
  return response.json()
}

export async function updateApiKey(id: number, data: { label?: string; is_enabled?: boolean }): Promise<ApiKeyEntry> {
  const response = await fetch(getUrl(`/api-keys/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update API key')
  return response.json()
}

export async function deleteApiKey(id: number): Promise<void> {
  const response = await fetch(getUrl(`/api-keys/${id}`), { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete API key')
}

export async function testApiKey(id: number): Promise<ApiKeyTestResult> {
  const response = await fetch(getUrl(`/api-keys/test/${id}`), { method: 'POST' })
  if (!response.ok) throw new Error('Test failed')
  return response.json()
}

export async function syncApiKeys(): Promise<void> {
  await fetch(getUrl('/api-keys/sync'), { method: 'POST' })
}
