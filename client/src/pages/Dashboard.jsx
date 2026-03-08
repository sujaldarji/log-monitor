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

const REFRESH_INTERVAL = 30_000   // 30 seconds

// ── Chart theme helpers ────────────────────────────────────────────────────
const chartColors = {
  dark: {
    bg:        'transparent',
    text:      '#64748b',
    line:      '#1e293b',
    accent:    '#3b82f6',
    error:     '#ef4444',
    axisLabel: '#475569',
  },
  light: {
    bg:        'transparent',
    text:      '#94a3b8',
    line:      '#e2e8f0',
    accent:    '#3b82f6',
    error:     '#ef4444',
    axisLabel: '#64748b',
  }
}

// ── Shared axis/grid style for line charts ─────────────────────────────────
const baseLineOption = (isDark, data, color, label) => {
  const safe = Array.isArray(data) ? data : []   // guard against undefined on first render
  const c    = isDark ? chartColors.dark : chartColors.light
  return {
    backgroundColor: c.bg,
    grid:  { top: 32, right: 16, bottom: 40, left: 48 },
    tooltip: {
      trigger:         'axis',
      backgroundColor: isDark ? '#0d1220' : '#ffffff',
      borderColor:     isDark ? '#1a2235' : '#e2e8f0',
      textStyle:       { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
      formatter: (params) => {
        const p = params[0]
        return `<div style="font-family:monospace;font-size:11px">
          ${format(new Date(p.axisValue), 'HH:mm')}
          <br/><b>${p.value} ${label}</b>
        </div>`
      }
    },
    xAxis: {
      type:        'category',
      data:        safe.map(d => d.time),
      axisLabel:   {
        color:     c.axisLabel,
        fontSize:  11,
        fontFamily:'monospace',
        formatter: (val) => format(new Date(val), 'HH:mm'),
      },
      axisLine:    { lineStyle: { color: c.line } },
      splitLine:   { show: false },
    },
    yAxis: {
      type:        'value',
      axisLabel:   { color: c.axisLabel, fontSize: 11, fontFamily: 'monospace' },
      splitLine:   { lineStyle: { color: c.line, type: 'dashed' } },
      axisLine:    { show: false },
    },
    series: [{
      type:      'line',
      data:      safe.map(d => d.count),
      smooth:    true,
      symbol:    'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: {
          type:       'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0,   color: color + '40' },
            { offset: 1,   color: color + '00' },
          ]
        }
      }
    }]
  }
}

// ── Bar chart option for top sources ──────────────────────────────────────
const barOption = (isDark, data) => {
  const safe   = Array.isArray(data) ? data : []   // guard against undefined
  const c      = isDark ? chartColors.dark : chartColors.light
  const sorted = [...safe].sort((a, b) => a.count - b.count)
  return {
    backgroundColor: c.bg,
    grid:  { top: 16, right: 64, bottom: 24, left: 120 },
    tooltip: {
      trigger:         'axis',
      backgroundColor: isDark ? '#0d1220' : '#ffffff',
      borderColor:     isDark ? '#1a2235' : '#e2e8f0',
      textStyle:       { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
    },
    xAxis: {
      type:      'value',
      axisLabel: { color: c.axisLabel, fontSize: 11, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: c.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    yAxis: {
      type:      'category',
      data:      sorted.map(d => d.hostname),
      axisLabel: { color: c.axisLabel, fontSize: 11, fontFamily: 'monospace' },
      axisLine:  { lineStyle: { color: c.line } },
      splitLine: { show: false },
    },
    series: [{
      type:      'bar',
      data:      sorted.map(d => d.count),
      barMaxWidth: 32,
      itemStyle: {
        color: {
          type:       'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#1d4ed8' },
          ]
        },
        borderRadius: [0, 2, 2, 0],
      },
      label: {
        show:      true,
        position:  'right',
        color:     c.axisLabel,
        fontSize:  11,
        fontFamily:'monospace',
        formatter: (p) => p.value.toLocaleString(),
      }
    }]
  }
}

// ── Chart card wrapper ─────────────────────────────────────────────────────
const ChartCard = ({ isDark, title, children, loading, error }) => (
  <div className={clsx(
    'rounded-sm p-5 flex flex-col gap-3',
    isDark ? 'bg-surface-card border border-surface-border' : 'bg-white border border-gray-200 shadow-sm'
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
      <div className="flex items-center gap-2 text-red-400 text-xs font-mono py-8 justify-center">
        <ErrorOutlineIcon sx={{ fontSize: 14 }} />
        {error}
      </div>
    ) : (
      children
    )}
  </div>
)

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { isDark, snowfall } = useUIStore()

  // ── Data state ───────────────────────────────────────────────────────────
  const [logRate,     setLogRate]     = useState({ data: [], loading: true, error: null })
  const [errors,      setErrors]      = useState({ data: [], loading: true, error: null })
  const [topSources,  setTopSources]  = useState({ data: [], loading: true, error: null })
  const [lastRefresh, setLastRefresh] = useState(null)

  // ── Fetch all three stats in parallel ───────────────────────────────────
  const fetchAll = useCallback(async () => {
    // Set loading on each
    setLogRate    (s => ({ ...s, loading: true }))
    setErrors     (s => ({ ...s, loading: true }))
    setTopSources (s => ({ ...s, loading: true }))

    // Run all three in parallel
    const [lrRes, errRes, tsRes] = await Promise.allSettled([
      api.get('/stats/log-rate'),
      api.get('/stats/errors'),
      api.get('/stats/top-sources'),
    ])

    setLogRate({
      data:    lrRes.status  === 'fulfilled' ? lrRes.value.data.data   : [],
      loading: false,
      error:   lrRes.status  === 'rejected'  ? 'Failed to load'        : null,
    })
    setErrors({
      data:    errRes.status === 'fulfilled' ? errRes.value.data.data  : [],
      loading: false,
      error:   errRes.status === 'rejected'  ? 'Failed to load'        : null,
    })
    setTopSources({
      data:    tsRes.status  === 'fulfilled' ? tsRes.value.data.data   : [],
      loading: false,
      error:   tsRes.status  === 'rejected'  ? 'Failed to load'        : null,
    })

    setLastRefresh(new Date())
  }, [])

  // ── Initial fetch + 30s auto-refresh ────────────────────────────────────
  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(interval)    // cleanup on unmount
  }, [fetchAll])

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
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

      {/* ── Snowfall ──────────────────────────────────────────────────────── */}
      {snowfall && (
        <Snowfall
          snowflakeCount={120}
          color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.4)'}
          style={{ zIndex: 0 }}
        />
      )}

      {/* ── Dot grid (dark only) ──────────────────────────────────────────── */}
      {isDark && <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />}

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">

          {/* Logo + title */}
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

          {/* Right side — refresh timestamp + logout */}
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

            

            <button
              onClick={handleLogout}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm',
                'border transition-all duration-150',
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

        {/* ── Open Log Explorer button ─────────────────────────────────────── */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/explorer')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-mono
                       bg-accent hover:bg-accent-dim text-white transition-all duration-150
                       active:scale-[0.99]"
          >
            <OpenInNewIcon sx={{ fontSize: 15 }} />
            Open Log Explorer
          </button>
        </div>

        {/* ── Charts grid ──────────────────────────────────────────────────── */}

        {/* Row 1: Logs Per Minute + Error Events side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          <ChartCard
            isDark={isDark}
            title="Logs Per Minute — last 15m"
            loading={logRate.loading}
            error={logRate.error}
          >
            <ReactECharts
              option={baseLineOption(isDark, logRate.data, '#3b82f6', 'logs')}
              style={{ height: 220 }}
              notMerge={true}
            />
          </ChartCard>

          <ChartCard
            isDark={isDark}
            title="Error Events (4625) — last 15m"
            loading={errors.loading}
            error={errors.error}
          >
            <ReactECharts
              option={baseLineOption(isDark, errors.data, '#ef4444', 'errors')}
              style={{ height: 220 }}
              notMerge={true}
            />
          </ChartCard>
        </div>

        {/* Row 2: Top Log Sources full width */}
        <ChartCard
          isDark={isDark}
          title="Top Log Sources — last 15m"
          loading={topSources.loading}
          error={topSources.error}
        >
          <ReactECharts
            option={barOption(isDark, topSources.data)}
            style={{ height: 280 }}
            notMerge={true}
          />
        </ChartCard>

      </div>

      {/* ── Floating settings ────────────────────────────────────────────── */}
      <SettingsPanel />

    </div>
  )
}