import { memo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsSection, SettingsRow } from './SettingsSection'
import {
  fetchApiKeys,
  importApiKeys,
  updateApiKey,
  deleteApiKey,
  testApiKey,
  syncApiKeys,
  type ApiKeyEntry,
  type ApiKeyImportResult,
} from '@/lib/api/settings'
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Upload,
  TestTube,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Wifi,
  WifiOff,
  Copy,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Healthy' },
  invalid: { icon: XCircle, color: 'text-red-400', label: 'Invalid' },
  disabled: { icon: EyeOff, color: 'text-text-tertiary', label: 'Disabled' },
  cooldown: { icon: Clock, color: 'text-amber-400', label: 'Cooldown' },
  validating: { icon: Loader2, color: 'text-accent-light', label: 'Validating' },
  failed: { icon: AlertTriangle, color: 'text-red-400', label: 'Failed' },
}

function maskDisplay(key: string): string {
  return key.length > 12 ? `${key.slice(0, 3)}••••••••${key.slice(-4)}` : key
}

export const ApiKeyManager = memo(function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ApiKeyImportResult | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApiKeys()
      setKeys(data.items)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  const filteredKeys = keys.filter(
    (k) =>
      k.masked_key.toLowerCase().includes(search.toLowerCase()) ||
      (k.label && k.label.toLowerCase().includes(search.toLowerCase())),
  )

  const handleImport = useCallback(async () => {
    if (!importText.trim()) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importApiKeys(importText)
      setImportResult(result)
      if (result.imported > 0) await loadKeys()
    } catch (e: any) {
      setImportResult({ imported: 0, failed: 1, skipped: 0, results: [{ key: '', status: 'error', message: e.message }] })
    } finally {
      setImporting(false)
    }
  }, [importText, loadKeys])

  const handleToggle = useCallback(async (key: ApiKeyEntry) => {
    try {
      await updateApiKey(key.id, { is_enabled: !key.is_enabled })
      await loadKeys()
    } catch { /* ignore */ }
  }, [loadKeys])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteApiKey(id)
      await loadKeys()
    } catch { /* ignore */ }
  }, [loadKeys])

  const handleTest = useCallback(async (id: number) => {
    setTestingId(id)
    try {
      await testApiKey(id)
      await loadKeys()
    } catch { /* ignore */ }
    setTestingId(null)
  }, [loadKeys])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await syncApiKeys()
      await loadKeys()
    } catch { /* ignore */ }
    setSyncing(false)
  }, [loadKeys])

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">AI Configuration</h1>
        <p className="text-sm text-text-tertiary">Manage Groq API keys for lesson generation</p>
      </div>

      <SettingsSection title="API Keys" description="Add, manage, and monitor API keys">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keys..."
              className="w-full bg-surface-200 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/40"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setShowImport(true); setImportResult(null); setImportText('') }}>
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} /> Sync
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Shield className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary mb-1">No API keys configured</p>
            <p className="text-xs text-text-tertiary mb-4">Add keys from .env or use bulk import</p>
            <Button variant="primary" size="sm" onClick={() => { setShowImport(true); setImportResult(null); setImportText('') }}>
              <Plus className="w-3.5 h-3.5" /> Add API Key
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredKeys.map((key) => {
              const statusCfg = STATUS_CONFIG[key.status] || STATUS_CONFIG.failed
              const StatusIcon = statusCfg.icon
              return (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
                    key.is_enabled ? 'bg-surface-100 border-border hover:border-accent/20' : 'bg-surface-150/50 border-border/50 opacity-60',
                  )}
                >
                  <span className={cn('shrink-0', statusCfg.color)}>
                    <StatusIcon className={cn('w-4 h-4', key.status === 'validating' && 'animate-spin')} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-text-primary">{maskDisplay(key.masked_key)}</span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        key.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' :
                        key.status === 'invalid' ? 'bg-red-500/10 text-red-400' :
                        key.status === 'disabled' ? 'bg-surface-200 text-text-tertiary' :
                        'bg-amber-500/10 text-amber-400',
                      )}>
                        {statusCfg.label}
                      </span>
                      {key.label && <span className="text-[10px] text-text-tertiary truncate">{key.label}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-tertiary">
                      <span>Req: {key.total_requests}</span>
                      <span>Err: {key.total_errors}</span>
                      {key.last_used_at && <span>Last: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                      {key.last_error_message && <span className="text-red-400/70 truncate max-w-[120px]">{key.last_error_message}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTest(key.id)}
                      disabled={testingId === key.id}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-accent-light hover:bg-surface-200 transition-colors"
                      title="Test connection"
                    >
                      {testingId === key.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleToggle(key)}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors"
                      title={key.is_enabled ? 'Disable' : 'Enable'}
                    >
                      {key.is_enabled ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </SettingsSection>

      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SettingsSection title="Bulk Import" description="Paste API keys, one per line">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`gsk_your_key_1_here\n gsk_your_key_2_here\n gsk_your_key_3_here`}
                className="w-full h-28 bg-surface-200 border border-border rounded-lg p-3 text-xs font-mono text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/40 resize-none"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowImport(false); setImportResult(null); setImportText('') }}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleImport} disabled={importing || !importText.trim()}>
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Import & Validate
                </Button>
              </div>

              {importResult && (
                <div className={cn(
                  'mt-3 p-3 rounded-lg border text-xs',
                  importResult.imported > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20',
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.imported > 0
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="font-medium text-text-primary">
                      {importResult.imported} imported, {importResult.failed} failed, {importResult.skipped} skipped
                    </span>
                  </div>
                  <div className="space-y-1">
                    {importResult.results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-text-tertiary">
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          r.status === 'healthy' ? 'bg-emerald-400' : r.status === 'skipped' ? 'bg-amber-400' : 'bg-red-400',
                        )} />
                        <span className="font-mono">{r.key || '(key)'}</span>
                        <span>—</span>
                        <span className={r.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}>{r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SettingsSection>
          </motion.div>
        )}
      </AnimatePresence>

      {keys.length > 0 && (
        <SettingsSection title="Key Health Summary" description="Overall status of configured keys">
          <div className="grid grid-cols-3 gap-3">
            {['healthy', 'invalid', 'cooldown', 'disabled', 'failed'].map((status) => {
              const count = keys.filter((k) => k.status === status).length
              const cfg = STATUS_CONFIG[status]
              if (!cfg || count === 0) return null
              const Icon = cfg.icon
              return (
                <div key={status} className="bg-surface-100 rounded-lg p-3 flex items-center gap-2.5">
                  <Icon className={cn('w-4 h-4', cfg.color)} />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{count}</div>
                    <div className="text-[10px] text-text-tertiary">{cfg.label}</div>
                  </div>
                </div>
              )
            })}
            <div className="bg-surface-100 rounded-lg p-3 flex items-center gap-2.5">
              <Key className="w-4 h-4 text-accent-light" />
              <div>
                <div className="text-sm font-semibold text-text-primary">{keys.length}</div>
                <div className="text-[10px] text-text-tertiary">Total Keys</div>
              </div>
            </div>
          </div>
        </SettingsSection>
      )}
    </div>
  )
})
