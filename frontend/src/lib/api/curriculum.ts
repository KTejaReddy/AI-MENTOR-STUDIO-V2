import { fetchWithAuth } from '@/lib/api/client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface BranchSummary {
  branch_id: string
  name: string
  description: string
  category: string
  subject_count: number
  lab_count: number
}

export interface SubjectSummary {
  id: string
  name: string
  code: string | null
  branch_id: string
  branch_name: string
  category: string
  semester: number | null
  difficulty: string
  tags: string[]
}

export interface CurriculumStats {
  total_branches: number
  total_subjects: number
  total_labs: number
  branches: BranchSummary[]
}

export interface SearchResult {
  query: string
  total: number
  subjects: SubjectSummary[]
  branches: BranchSummary[]
}

export interface AutocompleteSuggestion {
  type: 'subject' | 'branch' | 'tag'
  label: string
  value: string
}

export async function fetchBranches(): Promise<BranchSummary[]> {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/v1/curriculum/branches`)
    if (!res.ok) return []
    const data = await res.json()
    return data.branches || []
  } catch { return [] }
}

export async function fetchBranchDetail(branchId: string): Promise<any> {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/v1/curriculum/branches/${branchId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function fetchSubjects(branchId?: string): Promise<SubjectSummary[]> {
  try {
    const url = branchId
      ? `${BASE_URL}/api/v1/curriculum/subjects?branch_id=${branchId}`
      : `${BASE_URL}/api/v1/curriculum/subjects`
    const res = await fetchWithAuth(url)
    if (!res.ok) return []
    const data = await res.json()
    return data.subjects || []
  } catch { return [] }
}

export async function fetchSubjectDetail(subjectId: string): Promise<any> {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/v1/curriculum/subjects/${subjectId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function searchCurriculum(query: string): Promise<SearchResult> {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/v1/curriculum/search?query=${encodeURIComponent(query)}`)
    if (!res.ok) return { query, total: 0, subjects: [], branches: [] }
    return await res.json()
  } catch { return { query, total: 0, subjects: [], branches: [] } }
}

export async function fetchAutocomplete(query: string, limit = 10): Promise<AutocompleteSuggestion[]> {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/v1/curriculum/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.suggestions || []
  } catch { return [] }
}

export async function fetchCurriculumStats(): Promise<CurriculumStats | null> {
  try {
    const res = await fetchWithAuth(`${BASE_URL}/api/v1/curriculum/stats`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}
