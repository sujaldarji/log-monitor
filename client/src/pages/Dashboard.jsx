import { useEffect, useState, useCallback } from 'react'
import { useNavigate }  from 'react-router-dom'
import ReactECharts     from 'echarts-for-react'
import { format }       from 'date-fns'
import clsx             from 'clsx'

import LogoutIcon       from '@mui/icons-material/Logout'
import OpenInNewIcon    from '@mui/icons-material/OpenInNew'
import RefreshIcon      from '@mui/icons-material/Refresh'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

import api              from '../lib/axios'
import SettingsPanel    from '../components/SettingsPanel'
import { useUIStore }   from '../store/uistore'
import Snowfall         from 'react-snowfall'

const REFRESH_INTERVAL = 30_000

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  accent:  '#3b82f6',
  error:   '#ef4444',
  emerald: '#10b981',
  amber:   '#f59e0b',
}

// ── Chart axis style per theme ─────────────────────────────────────────────
const ax = (isDark) => ({
  text: isDark ? '#6b8090' : '#64748b',
  line: isDark ? '#182438' : '#e2e8f0',
})

// ── Shared tooltip style ───────────────────────────────────────────────────
const tooltip = (isDark) => ({
  trigger: 'axis',
  backgroundColor: isDark ? '#0d1520' : '#fff',
  borderColor:     isDark ? '#182438' : '#e2e8f0',
  textStyle: { color: isDark ? '#eef2f9' : '#1e293b', fontSize: 13, fontFamily: 'monospace' },
})

// ── Line chart ─────────────────────────────────────────────────────────────
const lineOption = (isDark, data, color, label) => {
  const safe = Array.isArray(data) ? data : []
  const a    = ax(isDark)
  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 16, bottom: 40, left: 52 },
    tooltip: {
      ...tooltip(isDark),
      formatter: (params) => {
        const p = params[0]
        return `<span style="font-family:monospace;font-size:12px">
          ${format(new Date(p.axisValue), 'HH:mm')}<br/><b>${p.value} ${label}</b>
        </span>`
      }
    },
    xAxis: {
      type:      'category',
      data:      safe.map(d => d.time),
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace', formatter: v => format(new Date(v), 'HH:mm') },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type:      'value',
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type:      'line',
      data:      safe.map(d => d.count),
      smooth:    true,
      symbol:    'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '35' },
            { offset: 1, color: color + '00' },
          ]
        }
      }
    }]
  }
}

// ── Horizontal bar chart ───────────────────────────────────────────────────
const hBarOption = (isDark, data, keyField) => {
  const safe   = Array.isArray(data) ? data : []
  const sorted = [...safe].sort((a, b) => a.count - b.count)
  const a      = ax(isDark)
  return {
    backgroundColor: 'transparent',
    grid: { top: 16, right: 80, bottom: 16, left: 100 },
    tooltip: tooltip(isDark),
    xAxis: {
      type:      'value',
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    yAxis: {
      type:      'category',
      data:      sorted.map(d => String(d[keyField])),
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    series: [{
      type:       'bar',
      data:       sorted.map(d => d.count),
      barMaxWidth: 24,
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
        show:       true,
        position:   'right',
        color:      a.text,
        fontSize:   12,
        fontFamily: 'monospace',
        formatter:  p => p.value.toLocaleString(),
      }
    }]
  }
}

// ── Vertical bar chart — index size, solid with very subtle gradient ────────
const vBarOption = (isDark, data) => {
  const safe = Array.isArray(data) ? data : []
  const a    = ax(isDark)
  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 60 },
    tooltip: {
      ...tooltip(isDark),
      formatter: params => {
        const p = params[0]
        return `<span style="font-family:monospace;font-size:12px">
          ${p.axisValue}<br/><b>${p.value} GB</b>
        </span>`
      }
    },
    xAxis: {
      type:      'category',
      data:      safe.map(d => d.date),
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace', formatter: v => v.slice(5) },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type:      'value',
      name:      'GB',
      nameTextStyle: { color: a.text, fontSize: 12 },
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace', formatter: v => `${v}GB` },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type:        'bar',
      data:        safe.map(d => d.sizeGB),
      barMaxWidth: 48,
      itemStyle: {
        // Solid emerald with only a very subtle top-to-bottom fade
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: C.emerald },          // solid at top
            { offset: 1, color: C.emerald + 'cc' },   // only 20% fade at bottom
          ]
        },
        borderRadius: [3, 3, 0, 0],
      },
      label: {
        show:       true,
        position:   'top',
        color:      a.text,
        fontSize:   11,
        fontFamily: 'monospace',
        formatter:  p => `${p.value}GB`,
      }
    }]
  }
}

// ── Chart card ─────────────────────────────────────────────────────────────
// No border — shadow only + subtle left accent line
const ChartCard = ({ isDark, title, children, loading, error }) => (
  <div className={clsx(
    'rounded-md flex flex-col gap-3 overflow-hidden',
    isDark
      ? 'bg-surface-card shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
      : 'bg-white shadow-md'
  )}>
    {/* Left accent bar + title row */}
    <div className={clsx(
      'flex items-center justify-between px-6 pt-5 pb-0',
      'border-l-[3px] border-accent'
    )}>
      <span className={clsx(
        'text-sm font-mono font-medium',
        isDark ? 'text-ink-secondary' : 'text-gray-600'
      )}>
        {title}
      </span>
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      )}
    </div>

    {/* Chart area */}
    <div className="px-2 pb-4">
      {error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm font-mono py-10 justify-center">
          <ErrorOutlineIcon sx={{ fontSize: 16 }} />
          {error}
        </div>
      ) : children}
    </div>
  </div>
)

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { isDark, snowfall } = useUIStore()

  const initState = { data: [], loading: true, error: null }
  const [logRate,     setLogRate]     = useState(initState)
  const [errors,      setErrors]      = useState(initState)
  const [topSources,  setTopSources]  = useState(initState)
  const [topChannels, setTopChannels] = useState(initState)
  const [indexSize,   setIndexSize]   = useState(initState)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [kibanaUrl,   setKibanaUrl]   = useState(null)

  // ── Fetch all 5 stats in parallel ────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const loading = { loading: true }
    setLogRate(s     => ({ ...s, ...loading }))
    setErrors(s      => ({ ...s, ...loading }))
    setTopSources(s  => ({ ...s, ...loading }))
    setTopChannels(s => ({ ...s, ...loading }))
    setIndexSize(s   => ({ ...s, ...loading }))

    const [lr, err, ts, tc, is] = await Promise.allSettled([
      api.get('/stats/log-rate'),
      api.get('/stats/errors'),
      api.get('/stats/top-sources'),
      api.get('/stats/top-channels'),
      api.get('/stats/index-size'),
    ])

    const resolve = (r) => ({
      data:    r.status === 'fulfilled' ? r.value.data.data : [],
      loading: false,
      error:   r.status === 'rejected'  ? 'Failed to load'  : null,
    })

    setLogRate(resolve(lr))
    setErrors(resolve(err))
    setTopSources(resolve(ts))
    setTopChannels(resolve(tc))
    setIndexSize(resolve(is))
    setLastRefresh(new Date())
  }, [])

  // Fetch Kibana URL once on mount
  useEffect(() => {
    api.get('/config/kibana-url')
      .then(({ data }) => setKibanaUrl(data.url))
      .catch(() => setKibanaUrl(null))
  }, [])

  // Initial fetch + 30s auto-refresh
  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll])

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

      {snowfall && (
        <Snowfall
          snowflakeCount={120}
          color={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.4)'}
          style={{ zIndex: 0 }}
        />
      )}

      {isDark && <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />}

      {/* ── Top bar — grounded with bg + bottom divider ──────────────── */}
      <div className={clsx(
        'sticky top-0 z-20 border-b transition-colors duration-300',
        isDark
          ? 'bg-surface-card border-surface-border'
          : 'bg-white border-gray-200 shadow-sm'
      )}>
        <div className="max-w-screen-2xl mx-auto px-6 xl:px-10 2xl:px-16 py-3 flex items-center justify-between">

          {/* Left — logo + label */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border border-accent/60 flex items-center justify-center">
              <div className="w-2 h-2 bg-accent" />
            </div>
            <span className={clsx(
              'font-mono text-sm tracking-[0.15em] uppercase',
              isDark ? 'text-ink-secondary' : 'text-gray-500'
            )}>
              CLM / Dashboard
            </span>
          </div>

          {/* Right — last refresh pill + username + logout */}
          <div className="flex items-center gap-4">

            {/* Last refresh pill */}
            {lastRefresh && (
              <div className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-full border',
                isDark
                  ? 'border-surface-border text-ink-muted bg-surface'
                  : 'border-gray-200 text-gray-400 bg-gray-50'
              )}>
                <RefreshIcon sx={{ fontSize: 12 }} />
                {format(lastRefresh, 'HH:mm:ss')}
              </div>
            )}

            <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
              {username}
            </span>

            <button
              onClick={handleLogout}
              className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded-md border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-red-500/50 hover:text-red-400'
                  : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
              )}
            >
              <LogoutIcon sx={{ fontSize: 14 }} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 xl:px-10 2xl:px-16 py-6 xl:py-8">

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-7">
          {/* Log Explorer — blue */}
          <button
            onClick={() => navigate('/explorer')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-mono font-medium
                       bg-accent hover:bg-accent-dim text-white transition-all active:scale-[0.99]"
          >
            <OpenInNewIcon sx={{ fontSize: 15 }} />
            Open Log Explorer
          </button>

          {/* Kibana — amber, only shown if URL configured */}
          {kibanaUrl && (
            <a
              href={kibanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-mono font-medium
                         bg-amber-500 hover:bg-amber-400 text-white transition-all active:scale-[0.99]"
            >
              <OpenInNewIcon sx={{ fontSize: 15 }} />
              Open Kibana
            </a>
          )}
        </div>

        {/* ── ROW 1: Logs Per Minute + Error Events ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 mb-4 xl:mb-6">
          <ChartCard isDark={isDark} title="Logs Per Minute — last 15m" loading={logRate.loading} error={logRate.error}>
            <ReactECharts
              option={lineOption(isDark, logRate.data, C.accent, 'logs')}
              style={{ height: 220 }}
              className="xl:!h-[280px] 2xl:!h-[320px]"
              notMerge
            />
          </ChartCard>
          <ChartCard isDark={isDark} title="Error Events (4625) — last 15m" loading={errors.loading} error={errors.error}>
            <ReactECharts
              option={lineOption(isDark, errors.data, C.error, 'errors')}
              style={{ height: 220 }}
              className="xl:!h-[280px] 2xl:!h-[320px]"
              notMerge
            />
          </ChartCard>
        </div>

        {/* ── ROW 2: Top Sources + Top Channels ───────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 mb-4 xl:mb-6">
          <ChartCard isDark={isDark} title="Top Log Sources — last 15m" loading={topSources.loading} error={topSources.error}>
            <ReactECharts
              option={hBarOption(isDark, topSources.data, 'hostname')}
              style={{ height: 260 }}
              className="xl:!h-[300px] 2xl:!h-[340px]"
              notMerge
            />
          </ChartCard>
          <ChartCard isDark={isDark} title="Top 5 Channels — last 15m" loading={topChannels.loading} error={topChannels.error}>
            <ReactECharts
              option={hBarOption(isDark, topChannels.data, 'channel')}
              style={{ height: 260 }}
              className="xl:!h-[300px] 2xl:!h-[340px]"
              notMerge
            />
          </ChartCard>
        </div>

        {/* ── ROW 3: Index Size full width ────────────────────────────── */}
        <ChartCard isDark={isDark} title="Index Size Per Day — last 10 days" loading={indexSize.loading} error={indexSize.error}>
          <ReactECharts
            option={vBarOption(isDark, indexSize.data)}
            style={{ height: 240 }}
            className="xl:!h-[300px] 2xl:!h-[340px]"
            notMerge
          />
        </ChartCard>

      </div>

      <SettingsPanel />
    </div>
  )
}