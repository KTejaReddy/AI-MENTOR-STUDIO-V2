import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Shield, Key, Cpu, RefreshCw, BarChart2,
  List, Terminal, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, Download, Eye, AlertCircle, Play, Pause
} from 'lucide-react'
import { apiClient, getAuthHeaders } from '@/lib/api/client'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// Types for telemetry metrics
interface OverviewStats {
  lessons_today: number
  sections_generated: number
  total_requests: number
  today_requests: number
  total_tokens: number
  today_tokens: number
  average_lesson_time_sec: number
  bottleneck_model: string
  bottleneck_api_key: string
  remaining_estimated_lessons: number
}

interface ModelStats {
  model_name: string
  requests_today: number
  tokens_today: number
  avg_tokens: number
  avg_latency_ms: number
  avg_response_characters: number
  failures: number
  retries: number
  fallbacks: number
  success_rate: number
  remaining_daily_quota: number
  remaining_estimated_lessons: number
}

interface KeyStats {
  key_identifier: string
  requests: number
  tokens: number
  latency_ms: number
  failures: number
  current_status: string
  remaining_quota: string
}

interface RequestLog {
  id: number
  lesson_id: string | null
  section_name: string | null
  subject: string | null
  topic: string | null
  learning_mode: string | null
  model_used: string
  api_key_identifier: string
  provider: string
  request_timestamp: string
  start_time: string
  end_time: string
  latency_ms: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  stream_chunks: number
  retry_count: number
  fallback_used: boolean
  success: boolean
  error_message: string | null
  quality_score: number | null
  response_characters: number
  response_words: number
  response_lines: number
}

interface ErrorStats {
  timeouts: number
  rate_limits_429: number
  provider_errors: number
  retries: number
  fallbacks: number
  cancelled: number
}

interface ChartData {
  time_series: Array<{
    date: string
    requests: number
    tokens: number
    latency_sec: number
  }>
  model_distribution: Array<{ name: string; value: number }>
  section_distribution: Array<{ name: string; value: number }>
  failures_distribution: Array<{ name: string; value: number }>
}

interface LiveEvent {
  lesson_id: string
  subject: string
  topic: string
  type: string
  engine_id?: string
  model?: string
  section_type?: string
  status?: string
  title?: string
  content?: string
  elapsed?: number
  quality_score?: number
  timestamp?: number
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'keys' | 'live' | 'logs' | 'routing'>('overview')
  
  // Loading & Error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [models, setModels] = useState<ModelStats[]>([])
  const [keys, setKeys] = useState<KeyStats[]>([])
  const [errors, setErrors] = useState<ErrorStats | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  const [routing, setRouting] = useState<any>(null)
  
  // Logs table pagination & filters
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsSkip, setLogsSkip] = useState(0)
  const [logsSearch, setLogsSearch] = useState('')
  const [logsModelFilter, setLogsModelFilter] = useState('')
  const [logsSuccessFilter, setLogsSuccessFilter] = useState<boolean | null>(null)
  
  // Lesson Detail Drawer
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lessonBreakdown, setLessonBreakdown] = useState<RequestLog[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Live Monitor Stream State
  const [liveStreamActive, setLiveStreamActive] = useState(true)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const liveAbortControllerRef = useRef<AbortController | null>(null)

  // Fetch metrics data helper
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, modelsRes, keysRes, errorsRes, chartsRes, routingRes] = await Promise.all([
        apiClient.get('/api/v1/ops/overview'),
        apiClient.get('/api/v1/ops/models'),
        apiClient.get('/api/v1/ops/keys'),
        apiClient.get('/api/v1/ops/errors'),
        apiClient.get('/api/v1/ops/charts'),
        apiClient.get('/api/v1/ops/routing')
      ])
      
      setOverview(overviewRes.data)
      setModels(modelsRes.data)
      setKeys(keysRes.data)
      setErrors(errorsRes.data)
      setCharts(chartsRes.data)
      setRouting(routingRes.data)
    } catch (err: any) {
      console.error('Failed to load operations metrics:', err)
      setError('Could not retrieve dashboard data. Make sure you are authenticated as admin.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch paginated request logs
  const fetchLogs = async () => {
    try {
      const params: any = {
        skip: logsSkip,
        limit: 15
      }
      if (logsSearch) params.search = logsSearch
      if (logsModelFilter) params.model = logsModelFilter
      if (logsSuccessFilter !== null) params.success = logsSuccessFilter
      
      const res = await apiClient.get('/api/v1/ops/requests', { params })
      setLogs(res.data.items)
      setLogsTotal(res.data.total)
    } catch (err) {
      console.error('Failed to load request logs:', err)
    }
  }

  // Fetch lesson breakdown detail
  const fetchBreakdown = async (lessonId: string) => {
    setDrawerLoading(true)
    try {
      const res = await apiClient.get(`/api/v1/ops/lessons/${lessonId}`)
      setLessonBreakdown(res.data)
    } catch (err) {
      console.error('Failed to load lesson breakdown:', err)
    } finally {
      setDrawerLoading(false)
    }
  }

  // Run initial fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Sync logs when filters/pagination changes
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [logsSkip, logsSearch, logsModelFilter, logsSuccessFilter, activeTab])

  // Setup EventSource subscription for live monitor
  useEffect(() => {
    if (activeTab !== 'live' || !liveStreamActive) {
      if (liveAbortControllerRef.current) {
        liveAbortControllerRef.current.abort()
        liveAbortControllerRef.current = null
      }
      return
    }

    liveAbortControllerRef.current = new AbortController()
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

    const subscribeLive = async () => {
      try {
        await fetchEventSource(`${baseUrl}/api/v1/ops/live-stream`, {
          headers: getAuthHeaders(),
          signal: liveAbortControllerRef.current?.signal,
          onmessage(msg) {
            if (msg.event === 'message') {
              try {
                const data = JSON.parse(msg.data)
                setLiveEvents(prev => [
                  { ...data, timestamp: Date.now() },
                  ...prev.slice(0, 49) // Keep last 50 events
                ])
              } catch (err) {
                console.error('Error parsing live SSE event:', err)
              }
            }
          },
          onerror(err) {
            console.error('Live monitor stream disconnected:', err)
          }
        })
      } catch (err) {
        console.error('Failed to start live stream connection:', err)
      }
    }

    subscribeLive()

    return () => {
      if (liveAbortControllerRef.current) {
        liveAbortControllerRef.current.abort()
        liveAbortControllerRef.current = null
      }
    }
  }, [activeTab, liveStreamActive])

  const handleRefresh = () => {
    fetchData()
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }

  // Raw data export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await apiClient.get('/api/v1/ops/requests', { params: { limit: 1000 } })
      const data = res.data.items
      
      let blob: Blob
      let filename = `ai_operations_logs_${new Date().toISOString().slice(0,10)}`
      
      if (format === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        filename += '.json'
      } else {
        const headers = [
          'id', 'lesson_id', 'section_name', 'subject', 'topic', 'model_used', 
          'api_key_identifier', 'latency_ms', 'total_tokens', 'success', 'error_message'
        ]
        const csvRows = [headers.join(',')]
        
        for (const row of data) {
          const values = headers.map(header => {
            const val = row[header]
            if (val === null || val === undefined) return ''
            return `"${String(val).replace(/"/g, '""')}"`
          })
          csvRows.push(values.join(','))
        }
        blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        filename += '.csv'
      }
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Failed to export data:', err)
    }
  }

  const handleOpenDrawer = (lessonId: string) => {
    setSelectedLessonId(lessonId)
    fetchBreakdown(lessonId)
    setDrawerOpen(true)
  }

  // --- Beautiful custom SVG line chart generator ---
  const renderLineChart = (data: any[], valKey: string, stroke: string, fillGradId: string) => {
    if (!data || data.length === 0) return <div className="text-xs text-text-tertiary flex h-full items-center justify-center">No analytics data yet</div>
    
    const w = 500
    const h = 180
    const padding = 25
    
    const rawValues = data.map(d => Number(d[valKey]) || 0)
    const actualMax = Math.max(...rawValues, 0)
    const safeMax = Math.max(actualMax, 1) // Prevent division by zero
    
    const points = data.map((d, i) => {
      const safeCount = Math.max(data.length - 1, 1)
      const x = data.length === 1 
        ? w / 2 
        : padding + (i / safeCount) * (w - padding * 2)
        
      const safeVal = Number(d[valKey]) || 0
      const y = h - padding - (safeVal / safeMax) * (h - padding * 2)
      
      return { x, y, label: d.date || '', value: safeVal }
    })
    
    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
    }, '')
    
    const areaD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${h - padding} L ${points[0].x} ${h - padding} Z`
      : ''

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
        <defs>
          <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Y Axis line / grid */}
        <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={h - padding - (h - padding * 2) / 2} x2={w - padding} y2={h - padding - (h - padding * 2) / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
        
        {/* Area & Path */}
        {points.length > 0 && (
          <>
            <path d={areaD} fill={`url(#${fillGradId})`} />
            <path d={pathD} fill="none" stroke={stroke} strokeWidth={2} />
          </>
        )}
        
        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group/dot">
            <circle cx={p.x} cy={p.y} r={3} fill="#06060c" stroke={stroke} strokeWidth={2} className="cursor-pointer hover:r-5 transition-all" />
            <title>{`${p.label}: ${p.value}`}</title>
          </g>
        ))}

        {/* Labels */}
        {points.length > 0 && (
          <>
            <text x={points[0].x} y={h - 6} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="start">
              {points[0].label ? points[0].label.slice(5) : ''}
            </text>
            <text x={points[points.length - 1].x} y={h - 6} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end">
              {points[points.length - 1].label ? points[points.length - 1].label.slice(5) : ''}
            </text>
            <text x={padding - 4} y={padding + 4} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end">
              {actualMax.toLocaleString()}
            </text>
          </>
        )}
      </svg>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#07070d] p-6 text-text-primary">
        <div className="card-glass border-red-500/20 max-w-md p-6 text-center shadow-2xl flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400 mb-4 border border-red-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-red-400 mb-2">Access Denied / Network Error</h2>
          <p className="text-xs text-text-tertiary mb-6 leading-relaxed">{error}</p>
          <button onClick={handleRefresh} className="btn btn-secondary text-xs flex items-center gap-1.5 px-4 py-2">
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#07070d] text-text-primary relative">
      
      {/* ─── Sticky Header & Tabs ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col">
        {/* ─── Premium Ops Header ───────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#090911]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-glow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-white via-text-secondary to-text-tertiary bg-clip-text text-transparent">
              AI Operations Dashboard
            </h1>
            <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mt-0.5">Internal Monitoring Console</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'logs' && (
            <div className="flex items-center gap-1 border border-white/5 bg-white/[0.02] p-1 rounded-lg">
              <button onClick={() => handleExport('csv')} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/5 rounded transition text-text-secondary hover:text-white">
                <Download className="w-3 h-3 text-[#00f2fe]" /> CSV
              </button>
              <button onClick={() => handleExport('json')} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/5 rounded transition text-text-secondary hover:text-white">
                <Download className="w-3 h-3 text-[#00f2fe]" /> JSON
              </button>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center justify-center p-2 rounded-lg border border-white/5 bg-white/[0.02] text-text-secondary hover:text-white transition hover:bg-white/5 disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-light' : ''}`} />
          </button>
        </div>
      </div>

        {/* ─── Ops Tabs Selector ────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center px-6 border-b border-white/5 bg-[#08080e]/90 backdrop-blur-md overflow-x-auto no-scrollbar gap-1 py-1.5">
        {[
          { id: 'overview', label: 'System Overview', icon: BarChart2 },
          { id: 'live', label: 'Live Monitor', icon: Terminal },
          { id: 'models', label: 'Model Analytics', icon: Cpu },
          { id: 'keys', label: 'API Key Pool', icon: Key },
          { id: 'logs', label: 'Requests Log', icon: List },
          { id: 'routing', label: 'Routing Config', icon: Search }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all relative shrink-0 ${
              activeTab === tab.id
                ? 'text-white bg-white/10 shadow-md border border-white/10'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {/* ─── Central Content Workspace ─────────────────────────────────────────── */}
      <div className="flex-1 p-6 relative z-0 flex flex-col">
        {loading && activeTab !== 'live' ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
              <span className="text-xs text-text-tertiary font-medium">Computing telemetry...</span>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ─── TAB 1: SYSTEM OVERVIEW ────────────────────────────────────────── */}
            {activeTab === 'overview' && overview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Metric Summary Cards */}
                {[
                  { label: 'Lessons Today', val: overview.lessons_today, detail: 'Generations requested today', glow: 'shadow-glow-sm border-blue-500/10' },
                  { label: 'Sections Generated', val: overview.sections_generated, detail: 'Total sections written', glow: 'border-purple-500/10' },
                  { label: 'Today\'s Requests', val: `${overview.today_requests} / ${overview.total_requests}`, detail: 'Requests (Today / Lifetime)', glow: 'border-[#00f2fe]/10' },
                  { label: 'Today\'s Tokens', val: overview.today_tokens.toLocaleString(), detail: `Lifetime: ${overview.total_tokens.toLocaleString()}`, glow: 'border-emerald-500/10' },
                  { label: 'Avg Lesson Latency', val: `${overview.average_lesson_time_sec}s`, detail: 'Average markdown generation time', glow: 'border-amber-500/10' },
                  { label: 'Estimated Remaining Lessons', val: overview.remaining_estimated_lessons, detail: 'Est based on pooled limits', glow: 'border-teal-500/10' },
                  { label: 'Bottleneck Model', val: overview.bottleneck_model.split('/').pop(), detail: 'Highest error count today', glow: 'border-red-500/10 text-red-400' },
                  { label: 'Bottleneck API Key', val: overview.bottleneck_api_key, detail: 'Most failed attempts today', glow: 'border-pink-500/10 text-pink-400' }
                ].map((card, i) => (
                  <div key={i} className={`card-glass p-5 rounded-2xl flex flex-col justify-between ${card.glow} h-32 hover:translate-y-[-2px] transition-transform`}>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{card.label}</span>
                    <div className="text-xl font-extrabold tracking-tight mt-1">{card.val}</div>
                    <span className="text-[9px] text-text-tertiary truncate leading-relaxed mt-2">{card.detail}</span>
                  </div>
                ))}

                {/* Graphs Column */}
                <div className="md:col-span-2 card-glass p-5 rounded-2xl border-white/5 flex flex-col justify-between min-h-[220px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-text-secondary">Requests Over Time</span>
                    <span className="text-[10px] text-text-tertiary">Weekly activity</span>
                  </div>
                  <div className="flex-1 h-32 min-h-0">
                    {charts && renderLineChart(charts.time_series, 'requests', '#00f2fe', 'requestsGrad')}
                  </div>
                </div>

                <div className="md:col-span-2 card-glass p-5 rounded-2xl border-white/5 flex flex-col justify-between min-h-[220px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-[#8b5cf6]">Tokens Consumed</span>
                    <span className="text-[10px] text-text-tertiary">Daily token summaries</span>
                  </div>
                  <div className="flex-1 h-32 min-h-0">
                    {charts && renderLineChart(charts.time_series, 'tokens', '#8b5cf6', 'tokensGrad')}
                  </div>
                </div>

                {/* Error dashboard */}
                {errors && (
                  <div className="md:col-span-4 card-glass p-5 rounded-2xl border-white/5">
                    <span className="text-xs font-bold text-text-secondary block mb-4">Operational Error Center</span>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {[
                        { label: 'Timeouts', val: errors.timeouts, color: 'text-amber-400' },
                        { label: '429 Rate Limits', val: errors.rate_limits_429, color: 'text-red-400' },
                        { label: 'Provider Errors', val: errors.provider_errors, color: 'text-purple-400' },
                        { label: 'Retries Triggered', val: errors.retries, color: 'text-blue-400' },
                        { label: 'Fallbacks Applied', val: errors.fallbacks, color: 'text-emerald-400' },
                        { label: 'Cancelled Requests', val: errors.cancelled, color: 'text-text-tertiary' }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-center">
                          <span className="text-[10px] text-text-tertiary font-bold block mb-1 uppercase tracking-wider">{item.label}</span>
                          <span className={`text-lg font-black ${item.color}`}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── TAB 2: LIVE MONITOR ───────────────────────────────────────────── */}
            {activeTab === 'live' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5 h-full"
              >
                <div className="flex items-center justify-between card-glass px-5 py-3 rounded-xl border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-2.5 w-2.5 rounded-full ${liveStreamActive ? 'bg-emerald-500 animate-pulse shadow-glow-sm' : 'bg-red-500'}`} />
                    <span className="text-xs font-semibold">Live Monitor Status: {liveStreamActive ? 'Connected' : 'Paused'}</span>
                  </div>
                  <button
                    onClick={() => setLiveStreamActive(!liveStreamActive)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs font-semibold hover:bg-white/5 text-text-secondary hover:text-white"
                  >
                    {liveStreamActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause Stream
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume Stream
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 min-h-[300px] overflow-y-auto border border-white/5 card-glass p-5 rounded-2xl flex flex-col">
                  <span className="text-xs font-bold text-text-secondary block mb-4">SSE Generation Event Feed</span>
                  
                  {liveEvents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary">
                      <Terminal className="w-8 h-8 opacity-25 mb-2" />
                      <span className="text-xs">Awaiting AI execution events...</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-2">
                      {liveEvents.map((evt, idx) => (
                        <div key={idx} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-left flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] text-text-tertiary font-semibold uppercase px-2 py-0.5 rounded bg-white/5">
                                {evt.type}
                              </span>
                              <span className="text-[10px] font-bold text-text-secondary">
                                {evt.subject} / {evt.topic}
                              </span>
                              {evt.model && (
                                <span className="text-[9px] text-[#00f2fe] font-mono">
                                  [{evt.model}]
                                </span>
                              )}
                              {evt.section_type && (
                                <span className="text-[9px] text-purple-400">
                                  ({evt.section_type})
                                </span>
                              )}
                              {evt.status && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  evt.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' :
                                  evt.status === 'failed' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'
                                }`}>
                                  {evt.status}
                                </span>
                              )}
                            </div>
                            
                            {evt.content && (
                              <p className="text-[11px] text-text-secondary font-mono truncate max-w-2xl bg-black/20 px-2 py-1 rounded">
                                {evt.content}
                              </p>
                            )}

                            {evt.type === 'section_done' && (
                              <div className="flex items-center gap-3 text-[9px] text-text-tertiary mt-2">
                                <span>Elapsed: {evt.elapsed}s</span>
                                {evt.quality_score && <span>Score: {evt.quality_score}</span>}
                              </div>
                            )}
                          </div>
                          
                          <span className="text-[9px] text-text-tertiary font-mono shrink-0">
                            {new Date(evt.timestamp || Date.now()).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── TAB 3: MODEL ANALYTICS ────────────────────────────────────────── */}
            {activeTab === 'models' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {models.map((m, idx) => (
                    <div key={idx} className="card-glass border-white/5 p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-xs font-black text-text-primary block">{m.model_name}</span>
                          <span className="text-[9px] text-text-tertiary block mt-0.5">LIFETIME STATISTICS</span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded font-black ${
                          m.success_rate >= 0.95 ? 'text-emerald-400 bg-emerald-500/10' :
                          m.success_rate >= 0.85 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
                        }`}>
                          {m.success_rate ? `${(m.success_rate * 100).toFixed(1)}% Success` : '100% Success'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-[9px] text-text-tertiary block uppercase font-bold">Requests Today</span>
                          <span className="text-sm font-extrabold">{m.requests_today}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary block uppercase font-bold">Tokens Today</span>
                          <span className="text-sm font-extrabold">{m.tokens_today.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary block uppercase font-bold">Avg Latency</span>
                          <span className="text-sm font-extrabold text-[#00f2fe]">{m.avg_latency_ms ? `${(m.avg_latency_ms / 1000.0).toFixed(2)}s` : '0s'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary block uppercase font-bold">Avg Tokens/Req</span>
                          <span className="text-sm font-extrabold">{m.avg_tokens.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary block uppercase font-bold">Failures/Retries</span>
                          <span className="text-sm font-extrabold text-red-400">{m.failures} / {m.retries}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary block uppercase font-bold">Fallbacks Run</span>
                          <span className="text-sm font-extrabold text-purple-400">{m.fallbacks}</span>
                        </div>
                      </div>

                      {m.model_name !== 'All Models' && (
                        <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px] text-text-tertiary">
                          <span>Quota Remaining: <strong className="text-text-secondary">{m.remaining_daily_quota.toLocaleString()}</strong></span>
                          <span>Est. Lessons Left: <strong className="text-text-secondary">{m.remaining_estimated_lessons}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── TAB 4: API KEY POOL ────────────────────────────────────────────── */}
            {activeTab === 'keys' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-x-auto border border-white/5 card-glass rounded-2xl"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      <th className="px-6 py-4">Masked Key Identifier</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Total Requests</th>
                      <th className="px-6 py-4 text-right">Total Tokens</th>
                      <th className="px-6 py-4 text-right">Avg Latency</th>
                      <th className="px-6 py-4 text-right">Failures</th>
                      <th className="px-6 py-4">Remaining Quota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k, idx) => (
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors text-xs text-text-secondary">
                        <td className="px-6 py-4 font-mono">{k.key_identifier}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                            k.current_status === 'healthy' ? 'text-emerald-400 bg-emerald-500/10' :
                            k.current_status === 'cooldown' ? 'text-amber-400 bg-amber-500/10 animate-pulse' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {k.current_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">{k.requests.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">{k.tokens.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono text-[#00f2fe]">
                          {k.latency_ms ? `${(k.latency_ms / 1000.0).toFixed(2)}s` : '0s'}
                        </td>
                        <td className="px-6 py-4 text-right text-red-400">{k.failures}</td>
                        <td className="px-6 py-4 font-semibold text-text-tertiary capitalize">{k.remaining_quota}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {/* ─── TAB 5: REQUESTS LOG TABLE ──────────────────────────────────────── */}
            {activeTab === 'logs' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/[0.01] border border-white/5 p-4 rounded-xl items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Search subject, topic, ID..."
                      value={logsSearch}
                      onChange={(e) => { setLogsSearch(e.target.value); setLogsSkip(0); }}
                      className="w-full bg-[#0a0a14] border border-white/5 rounded-lg py-2 pl-9 pr-4 text-xs text-text-secondary focus:outline-none focus:border-white/10"
                    />
                  </div>

                  <div>
                    <select
                      value={logsModelFilter}
                      onChange={(e) => { setLogsModelFilter(e.target.value); setLogsSkip(0); }}
                      className="w-full bg-[#0a0a14] border border-white/5 rounded-lg py-2 px-3 text-xs text-text-secondary focus:outline-none focus:border-white/10"
                    >
                      <option value="">All Models</option>
                      {models.filter(m => m.model_name !== 'All Models').map((m, idx) => (
                        <option key={idx} value={m.model_name}>{m.model_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={logsSuccessFilter === null ? '' : String(logsSuccessFilter)}
                      onChange={(e) => {
                        const val = e.target.value
                        setLogsSuccessFilter(val === '' ? null : val === 'true')
                        setLogsSkip(0)
                      }}
                      className="w-full bg-[#0a0a14] border border-white/5 rounded-lg py-2 px-3 text-xs text-text-secondary focus:outline-none focus:border-white/10"
                    >
                      <option value="">All Statuses</option>
                      <option value="true">Success</option>
                      <option value="false">Failures</option>
                    </select>
                  </div>

                  <div className="text-right text-[10px] text-text-tertiary font-bold">
                    Found {logsTotal.toLocaleString()} requests
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-white/5 card-glass rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                        <th className="px-5 py-4">Timestamp</th>
                        <th className="px-5 py-4">Lesson ID / Section</th>
                        <th className="px-5 py-4">Subject / Topic</th>
                        <th className="px-5 py-4">Model</th>
                        <th className="px-5 py-4 text-right">Latency</th>
                        <th className="px-5 py-4 text-right">Tokens</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors text-xs text-text-secondary">
                          <td className="px-5 py-4 font-mono text-[10px]">
                            {new Date(log.request_timestamp).toLocaleString().slice(5, 17)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-[10px] block opacity-50 truncate max-w-[100px]" title={log.lesson_id || ''}>
                              {log.lesson_id ? log.lesson_id.slice(4) : 'N/A'}
                            </span>
                            <span className="text-purple-400 capitalize block">{log.section_name || 'chat'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="block font-semibold truncate max-w-[150px]">{log.subject}</span>
                            <span className="block text-[10px] text-text-tertiary truncate max-w-[150px]">{log.topic}</span>
                          </td>
                          <td className="px-5 py-4 font-mono text-[10px] text-text-tertiary">
                            {log.model_used.split('/').pop()}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-[#00f2fe]">
                            {(log.latency_ms / 1000.0).toFixed(2)}s
                          </td>
                          <td className="px-5 py-4 text-right font-mono">
                            {log.total_tokens.toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                              log.success ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                            }`}>
                              {log.success ? 'Success' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {log.lesson_id ? (
                              <button
                                onClick={() => handleOpenDrawer(log.lesson_id!)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/5 rounded transition text-text-secondary hover:text-[#00f2fe]"
                                title="View entire lesson breakdown"
                              >
                                <Eye className="w-3.5 h-3.5" /> Inspect
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-2 shrink-0">
                  <button
                    disabled={logsSkip === 0}
                    onClick={() => setLogsSkip(prev => Math.max(0, prev - 15))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs font-semibold hover:bg-white/5 text-text-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  
                  <span className="text-[10px] text-text-tertiary font-bold">
                    Showing {logsSkip + 1} - {Math.min(logsSkip + 15, logsTotal)} of {logsTotal}
                  </span>

                  <button
                    disabled={logsSkip + 15 >= logsTotal}
                    onClick={() => setLogsSkip(prev => prev + 15)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs font-semibold hover:bg-white/5 text-text-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── TAB 6: ROUTING INSPECTOR ───────────────────────────────────────── */}
            {activeTab === 'routing' && routing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              >
                <div className="card-glass border-white/5 p-5 rounded-2xl">
                  <span className="text-xs font-bold text-text-secondary block mb-4">Static & Fallback Route Table</span>
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(routing.routing).map(([sec, cfg]: [string, any], idx) => (
                      <div key={idx} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between text-xs gap-4">
                        <span className="font-bold text-purple-400 capitalize">{sec}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          {cfg.preferred_models.map((m: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-mono truncate" title="Preferred model">
                              {m.split('/').pop()}
                            </span>
                          ))}
                          {cfg.fallback_models.length > 0 && <span className="text-text-tertiary">↓</span>}
                          {cfg.fallback_models.map((m: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-mono truncate" title="Fallback model">
                              {m.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-glass border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-secondary block mb-4">Learning Mode Overrides</span>
                    <div className="flex flex-col gap-4">
                      {Object.entries(routing.overrides).map(([mode, rule]: [string, any], idx) => (
                        <div key={idx} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                          <span className="text-xs font-extrabold text-blue-400 capitalize block mb-2">{mode} Mode</span>
                          <div className="flex flex-col gap-1.5">
                            {Object.entries(rule).map(([sec, model]: [string, any], i) => (
                              <div key={i} className="flex justify-between text-[11px] font-mono">
                                <span className="text-text-tertiary capitalize">{sec}:</span>
                                <span className="text-text-secondary">{model.split('/').pop()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ─── SIDE-DRAWER: LESSON BREAKDOWN DETAILS ────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && selectedLessonId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-[#090910] border-l border-white/5 p-6 z-50 flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="shrink-0 flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div>
                  <h2 className="text-sm font-black">Lesson Telemetry Breakdown</h2>
                  <span className="text-[10px] text-text-tertiary font-mono">ID: {selectedLessonId}</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-text-tertiary hover:text-white rounded-lg hover:bg-white/5 text-xs font-bold"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {drawerLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {lessonBreakdown.map((sec, idx) => (
                      <div key={idx} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl text-left">
                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-purple-400 capitalize">
                            {sec.section_name || 'chat'}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            sec.success ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                          }`}>
                            {sec.success ? 'Success' : 'Failed'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                          <div>
                            <span className="text-text-tertiary block">Model Used:</span>
                            <span className="text-text-secondary truncate block">{sec.model_used.split('/').pop()}</span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block">Latency:</span>
                            <span className="text-[#00f2fe] font-bold">{(sec.latency_ms / 1000.0).toFixed(2)}s</span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block">Tokens (Prompt / Comp / Total):</span>
                            <span className="text-text-secondary">
                              {sec.prompt_tokens} / {sec.completion_tokens} / <strong className="text-white">{sec.total_tokens}</strong>
                            </span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block">Masked Key Identifier:</span>
                            <span className="text-text-secondary truncate block">{sec.api_key_identifier}</span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block">Quality Review Score:</span>
                            <span className="text-emerald-400 font-bold">{sec.quality_score !== null ? `${(sec.quality_score * 100).toFixed(0)}%` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block">Retries / Fallbacks:</span>
                            <span className="text-text-secondary">{sec.retry_count} / {sec.fallback_used ? 'Yes' : 'No'}</span>
                          </div>
                        </div>

                        {sec.error_message && (
                          <div className="mt-3 p-2 bg-red-500/5 border border-red-500/10 rounded text-[9px] text-red-400 font-mono break-all leading-normal">
                            <strong>Error:</strong> {sec.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
