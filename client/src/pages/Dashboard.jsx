import { useEffect, useState, useCallback } from 'react'
import { useNavigate }   from 'react-router-dom'
import ReactECharts      from 'echarts-for-react'
import { format }        from 'date-fns'
import clsx              from 'clsx'

import LogoutIcon        from '@mui/icons-material/Logout'
import OpenInNewIcon     from '@mui/icons-material/OpenInNew'
import RefreshIcon       from '@mui/icons-material/Refresh'
import ErrorOutlineIcon  from '@mui/icons-material/ErrorOutline'

import api               from '../lib/axios'
import SettingsPanel     from '../components/SettingsPanel'
import { useUIStore }    from '../store/uistore'
import Snowfall          from 'react-snowfall'

const REFRESH_INTERVAL = 30_000

// ── Chart color palette ────────────────────────────────────────────────────
const C = {
  accent:  '#3b82f6',
  error:   '#ef4444',
  emerald: '#10b981',
  amber:   '#f59e0b',
}

// ── Axis / grid colors per theme ──────────────────────────────────────────
const ax = (isDark) => ({
  text:  isDark ? '#475569' : '#64748b',
  line:  isDark ? '#1e293b' : '#e2e8f0',
  bg:    'transparent',
})

// ── Line chart option ──────────────────────────────────────────────────────
const lineOption = (isDark, data, color, label) => {
  const safe = Array.isArray(data) ? data : []
  const a    = ax(isDark)
  return {
    backgroundColor: a.bg,
    grid: { top: 32, right: 16, bottom: 40, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#0d1220' : '#fff',
      borderColor:     isDark ? '#1a2235' : '#e2e8f0',
      textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12, fontFamily: 'monospace' },
      formatter: (params) => {
        const p = params[0]
        return `<span style="font-family:monospace;font-size:11px">
          ${format(new Date(p.axisValue), 'HH:mm')}<br/>
          <b>${p.value} ${label}</b>
        </span>`
      }
    },
    xAxis: {
      type: 'category',
      data: safe.map(d => d.time),
      axisLabel: { color: a.text, fontSize: 11, fontFamily: 'monospace', formatter: v => format(new Date(v), 'HH:mm') },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: a.text, fontSize: 11, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type: 'line',
      data: safe.map(d => d.count),
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '00' },
          ]
        }
      }
    }]
  }
}

// ── Horizontal bar chart option (top sources + top events) ─────────────────
const hBarOption = (isDark, data, keyField, label) => {
  const safe   = Array.isArray(data) ? data : []
  const sorted = [...safe].sort((a, b) => a.count - b.count)
  const a      = ax(isDark)
  return {
    backgroundColor: a.bg,
    grid: { top: 16, right: 72, bottom: 24, left: 80 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#0d1220' : '#fff',
      borderColor:     isDark ? '#1a2235' : '#e2e8f0',
      textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12, fontFamily: 'monospace' },
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: a.text, fontSize: 11, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(d => String(d[keyField])),
      axisLabel: { color: a.text, fontSize: 11, fontFamily: 'monospace' },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    series: [{
      type: 'bar',
      data: sorted.map(d => d.count),
      barMaxWidth: 28,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: C.accent },
            { offset: 1, color: '#1d4ed8' },
          ]
        },
        borderRadius: [0, 3, 3, 0],
      },
      label: {
        show: true, position: 'right',
        color: a.text, fontSize: 11, fontFamily: 'monospace',
        formatter: p => p.value.toLocaleString(),
      }
    }]
  }
}

// ── Vertical bar chart option (index size per day) ─────────────────────────
const vBarOption = (isDark, data) => {
  const safe = Array.isArray(data) ? data : []
  const a    = ax(isDark)
  return {
    backgroundColor: a.bg,
    grid: { top: 32, right: 24, bottom: 40, left: 56 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#0d1220' : '#fff',
      borderColor:     isDark ? '#1a2235' : '#e2e8f0',
      textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12, fontFamily: 'monospace' },
      formatter: params => {
        const p = params[0]
        return `<span style="font-family:monospace;font-size:11px">
          ${p.axisValue}<br/><b>${p.value} GB</b>
        </span>`
      }
    },
    xAxis: {
      type: 'category',
      data: safe.map(d => d.date),
      axisLabel: {
        color: a.text, fontSize: 11, fontFamily: 'monospace',
        formatter: v => v.slice(5),   // show MM-DD only
      },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'GB',
      nameTextStyle: { color: a.text, fontSize: 11 },
      axisLabel: { color: a.text, fontSize: 11, fontFamily: 'monospace', formatter: v => `${v}GB` },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type: 'bar',
      data: safe.map(d => d.sizeGB),
      barMaxWidth: 40,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: C.emerald + 'cc' },
            { offset: 1, color: C.emerald + '44' },
          ]
        },
        borderRadius: [3, 3, 0, 0],
      },
      label: {
        show: true, position: 'top',
        color: a.text, fontSize: 10, fontFamily: 'monospace',
        formatter: p => `${p.value}GB`,
      }
    }]
  }
}

// ── Chart card wrapper ─────────────────────────────────────────────────────
const ChartCard = ({ isDark, title, children, loading, error }) => (
  <div className={clsx(
    'rounded-sm p-5 flex flex-col gap-3',
    isDark
      ? 'bg-surface-card border border-surface-border'
      : 'bg-white border border-gray-200 shadow-sm'
  )}>
    <div className="flex items-center justify-between">
      <span className={clsx(
        'text-xs font-mono tracking-widest uppercase',
        isDark ? 'text-ink-secondary' : 'text-gray-500'
      )}>
        {title}
      </span>
      {loading && (
        <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      )}
    </div>
    {error ? (
      <div className="flex items-center gap-2 text-red-400 text-xs font-mono py-10 justify-center">
        <ErrorOutlineIcon sx={{ fontSize: 14 }} />
        {error}
      </div>
    ) : children}
  </div>
)

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { isDark, snowfall } = useUIStore()

  // ── Data state ───────────────────────────────────────────────────────────
  const initState = { data: [], loading: true, error: null }
  const [logRate,     setLogRate]     = useState(initState)
  const [errors,      setErrors]      = useState(initState)
  const [topSources,  setTopSources]  = useState(initState)
  const [topEvents,   setTopEvents]   = useState(initState)
  const [indexSize,   setIndexSize]   = useState(initState)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [kibanaUrl,   setKibanaUrl]   = useState(null)

  // ── Fetch all stats in parallel ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    // Set loading on all
    const loading = { loading: true }
    setLogRate(s    => ({ ...s, ...loading }))
    setErrors(s     => ({ ...s, ...loading }))
    setTopSources(s => ({ ...s, ...loading }))
    setTopEvents(s  => ({ ...s, ...loading }))
    setIndexSize(s  => ({ ...s, ...loading }))

    const [lr, err, ts, te, is] = await Promise.allSettled([
      api.get('/stats/log-rate'),
      api.get('/stats/errors'),
      api.get('/stats/top-sources'),
      api.get('/stats/top-events'),
      api.get('/stats/index-size'),
    ])

    const resolve = (result) => ({
      data:    result.status === 'fulfilled' ? result.value.data.data : [],
      loading: false,
      error:   result.status === 'rejected'  ? 'Failed to load' : null,
    })

    setLogRate(resolve(lr))
    setErrors(resolve(err))
    setTopSources(resolve(ts))
    setTopEvents(resolve(te))
    setIndexSize(resolve(is))
    setLastRefresh(new Date())
  }, [])

  // ── Fetch Kibana URL once on mount ───────────────────────────────────────
  useEffect(() => {
    api.get('/config/kibana-url')
      .then(({ data }) => setKibanaUrl(data.url))
      .catch(() => setKibanaUrl(null))
  }, [])

  // ── Initial load + 30s auto-refresh ─────────────────────────────────────
  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll])

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally {
      localStorage.removeItem('lm_username')
      navigate('/login')
    }
  }

  const username = localStorage.getItem('lm_username') || 'user'

  return (
    <div className={clsx(
      'relative min-h-screen transition-colors duration-300',
      isDark ? 'bg-surface' : 'bg-gray-100'
    )}>

      {/* Snowfall */}
      {snowfall && (
        <Snowfall
          snowflakeCount={120}
          color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.4)'}
          style={{ zIndex: 0 }}
        />
      )}

      {/* Dot grid */}
      {isDark && <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />}

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border border-accent/60 flex items-center justify-center">
              <div className="w-2 h-2 bg-accent" />
            </div>
            <span className={clsx(
              'font-mono text-xs tracking-[0.2em] uppercase',
              isDark ? 'text-ink-secondary' : 'text-gray-500'
            )}>
              CLM / Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className={clsx(
                'text-xs font-mono flex items-center gap-1.5',
                isDark ? 'text-ink-muted' : 'text-gray-400'
              )}>
                <RefreshIcon sx={{ fontSize: 12 }} />
                {format(lastRefresh, 'HH:mm:ss')}
              </span>
            )}
            <span className={clsx('text-xs font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
              {username}
            </span>
            <button
              onClick={handleLogout}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-red-500/50 hover:text-red-400'
                  : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
              )}
            >
              <LogoutIcon sx={{ fontSize: 13 }} />
              Logout
            </button>
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/explorer')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-mono
                       bg-accent hover:bg-accent-dim text-white transition-all active:scale-[0.99]"
          >
            <OpenInNewIcon sx={{ fontSize: 15 }} />
            Open Log Explorer
          </button>

          {/* Kibana button — only shown if KIBANA_URL is set in .env */}
          {kibanaUrl && (
            <a
              href={kibanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-mono',
                'border transition-all active:scale-[0.99]',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
                  : 'border-gray-200 text-gray-600 hover:border-accent hover:text-accent'
              )}
            >
              <OpenInNewIcon sx={{ fontSize: 15 }} />
              Open Kibana
            </a>
          )}
        </div>

        {/* ── ROW 1: Logs Per Minute + Error Events ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard isDark={isDark} title="Logs Per Minute — last 15m" loading={logRate.loading} error={logRate.error}>
            <ReactECharts option={lineOption(isDark, logRate.data, C.accent, 'logs')} style={{ height: 220 }} notMerge />
          </ChartCard>
          <ChartCard isDark={isDark} title="Error Events (4625) — last 15m" loading={errors.loading} error={errors.error}>
            <ReactECharts option={lineOption(isDark, errors.data, C.error, 'errors')} style={{ height: 220 }} notMerge />
          </ChartCard>
        </div>

        {/* ── ROW 2: Top Sources + Top Events ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard isDark={isDark} title="Top Log Sources — last 15m" loading={topSources.loading} error={topSources.error}>
            <ReactECharts option={hBarOption(isDark, topSources.data, 'hostname', 'logs')} style={{ height: 260 }} notMerge />
          </ChartCard>
          <ChartCard isDark={isDark} title="Top 5 Events — last 15m" loading={topEvents.loading} error={topEvents.error}>
            <ReactECharts option={hBarOption(isDark, topEvents.data, 'eventid', 'events')} style={{ height: 260 }} notMerge />
          </ChartCard>
        </div>

        {/* ── ROW 3: Index Size Per Day (full width) ────────────────────── */}
        <div className="mb-4">
          <ChartCard isDark={isDark} title="Index Size Per Day — last 10 days" loading={indexSize.loading} error={indexSize.error}>
            <ReactECharts option={vBarOption(isDark, indexSize.data)} style={{ height: 240 }} notMerge />
          </ChartCard>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className={clsx(
          'flex items-center justify-between text-xs font-mono',
          isDark ? 'text-ink-muted' : 'text-gray-400'
        )}>
          <span>Auto-refreshes every 30s</span>
          <span>last 15 minutes · aggregation only</span>
        </div>
      </div>

      <SettingsPanel />
    </div>
  )
}