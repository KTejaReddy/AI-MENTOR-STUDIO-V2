import type { ExportPayload } from '@/types/learning'

export function generateMarkdown(payload: ExportPayload): string {
  const lines = [
    `# ${payload.title}`,
    '',
    payload.content,
    '',
    `---`,
    `*Exported from Mentor AI Studio*`,
  ]
  return lines.join('\n')
}

export function generateHtml(payload: ExportPayload): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1a1a2e; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.5rem; border: 1px solid #ddd; text-align: left; }
    blockquote { border-left: 3px solid #14b8a6; margin: 0; padding: 0.5rem 1rem; background: #f0fdfa; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${payload.title}</h1>
  ${payload.content}
  <hr>
  <p style="color: #888; font-size: 0.875rem;">Exported from Mentor AI Studio</p>
</body>
</html>`
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function triggerPrint(content: string, title: string) {
  const html = generateHtml({ content, title, format: 'html', sectionId: '' })
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

export function exportSection(payload: ExportPayload) {
  switch (payload.format) {
    case 'markdown': {
      const md = generateMarkdown(payload)
      triggerDownload(md, `${payload.title.replace(/\s+/g, '-').toLowerCase()}.md`, 'text/markdown')
      break
    }
    case 'html': {
      const html = generateHtml(payload)
      triggerDownload(html, `${payload.title.replace(/\s+/g, '-').toLowerCase()}.html`, 'text/html')
      break
    }
    case 'pdf': {
      triggerPrint(payload.content, payload.title)
      break
    }
  }
}
