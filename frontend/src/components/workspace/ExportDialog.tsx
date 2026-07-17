import { memo, useState, useCallback } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Download, FileText, FileCode, File } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  sectionTitle: string
  onExport: (format: 'markdown' | 'pdf' | 'html', options?: { includeMetadata?: boolean }) => void
}

const formats = [
  { id: 'markdown' as const, label: 'Markdown', description: '.md — Ideal for docs and notes', icon: FileText },
  { id: 'html' as const, label: 'HTML', description: '.html — Self-contained web format', icon: FileCode },
  { id: 'pdf' as const, label: 'PDF', description: '.pdf — Print-ready document', icon: File },
]

export const ExportDialog = memo(function ExportDialog({
  open,
  onClose,
  sectionTitle,
  onExport,
}: ExportDialogProps) {
  const [selected, setSelected] = useState<'markdown' | 'pdf' | 'html'>('markdown')
  const [includeMetadata, setIncludeMetadata] = useState(true)

  const handleExport = useCallback(() => {
    onExport(selected, { includeMetadata })
    onClose()
  }, [selected, includeMetadata, onExport, onClose])

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="bg-surface-100 border border-border rounded-xl shadow-2xl w-full max-w-sm p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Export</h2>
        <p className="text-xs text-text-tertiary mb-4 truncate">{sectionTitle}</p>

        <div className="space-y-2 mb-4">
          {formats.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                selected === id
                  ? 'border-accent/40 bg-accent/5 text-accent-light'
                  : 'border-border text-text-secondary hover:border-accent/20 hover:bg-surface-200',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[10px] text-text-tertiary">{description}</div>
              </div>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={includeMetadata} onChange={(e) => setIncludeMetadata(e.target.checked)} className="rounded border-border text-accent focus:ring-accent/30" />
          <span className="text-xs text-text-secondary">Include title, subject, and difficulty</span>
        </label>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export {selected.toUpperCase()}
          </Button>
        </div>
      </div>
    </Dialog>
  )
})
