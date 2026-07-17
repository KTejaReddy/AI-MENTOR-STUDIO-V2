import { getAllSections } from './section-registry'

export interface ExportContent {
  title: string
  subject?: string
  topic?: string
  difficulty?: string
  learningMode?: string
  content: Record<string, string>
}

export function generateMarkdown(data: ExportContent, includeMetadata: boolean = true): string {
  const parts: string[] = []

  if (includeMetadata) {
    parts.push(`# ${data.title}`)
    parts.push('')
    if (data.subject) parts.push(`**Subject:** ${data.subject}  `)
    if (data.topic) parts.push(`**Topic:** ${data.topic}  `)
    if (data.difficulty) parts.push(`**Difficulty:** ${data.difficulty}  `)
    if (data.learningMode) parts.push(`**Mode:** ${data.learningMode}  `)
    parts.push('')
    parts.push('---')
    parts.push('')
  }

  const sections = getAllSections()
  sections.forEach((s) => {
    const sectionContent = data.content[s.id]
    if (sectionContent) {
      parts.push(`## ${s.title}`)
      parts.push('')
      parts.push(sectionContent)
      parts.push('')
    }
  })

  return parts.join('\n')
}

export function generateHtml(data: ExportContent, includeMetadata: boolean = true): string {
  const title = data.title
  const sections = getAllSections()
  let body = ''

  if (includeMetadata) {
    body += `<header style="margin-bottom:2rem"><h1>${escapeHtml(title)}</h1>`
    if (data.subject) body += `<p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>`
    if (data.topic) body += `<p><strong>Topic:</strong> ${escapeHtml(data.topic)}</p>`
    if (data.difficulty) body += `<p><strong>Difficulty:</strong> ${escapeHtml(data.difficulty)}</p>`
    if (data.learningMode) body += `<p><strong>Mode:</strong> ${escapeHtml(data.learningMode)}</p>`
    body += '<hr></header>'
  }

  sections.forEach((s) => {
    const c = data.content[s.id]
    if (c) {
      body += `<section style="margin-bottom:1.5rem"><h2>${escapeHtml(s.title)}</h2><div>${escapeHtml(c)}</div></section>`
    }
  })

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(title)}</title>
<style>body{max-width:800px;margin:0 auto;padding:2rem;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1e293b}hr{border:none;border-top:1px solid #e2e8f0;margin:1rem 0}h1{font-size:1.5rem;margin-bottom:0.5rem}h2{font-size:1.25rem;margin:1.5rem 0 0.5rem}section{page-break-inside:avoid}</style>
</head>
<body>${body}</body></html>`
}

export function downloadContent(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printContent(content: string): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(content)
  win.document.close()
  win.focus()
  win.print()
}

export function copyToClipboard(text: string): boolean {
  try {
    navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
