import { useEffect, useState, useCallback } from 'react'
import { useNavigate }  from 'react-router-dom'
import { format }       from 'date-fns'
import clsx             from 'clsx'

import LogoutIcon    from '@mui/icons-material/Logout'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RefreshIcon   from '@mui/icons-material/Refresh'

import api           from '../lib/axios'
import SettingsPanel from '../components/SettingsPanel'
import { useUIStore } from '../store/uistore'
import Snowfall      from 'react-snowfall'

// ── Dashboard chart components ──────────────────────────────────────────────
// Each component owns its own chart logic — edit only the file you need
import LogRateChart     from '../components/dashboard/LogRateChart'
import ErrorChart       from '../components/dashboard/ErrorChart'
import TopSourcesChart  from '../components/dashboard/TopSourcesChart'
import TopChannelsChart from '../components/dashboard/TopChannelsChart'
import IndexSizeChart   from '../components/dashboard/IndexSizeChart'

// Phase 2: MetricsStrip  ✅
import MetricsStrip   from '../components/dashboard/MetricsStrip'
// Phase 3: RecentLogs    → import RecentLogsTable from '../components/dashboard/RecentLogsTable'
// Phase 4: InsightsPanel → import InsightsPanel  from '../components/dashboard/InsightsPanel'

const REFRESH_INTERVAL = 30_000

const initState = { data: [], loading: true, error: null }

export default function Dashboard() {
  const navigate = useNavigate()
  const { isDark, snowfall } = useUIStore()

  // ── Chart data state ────────────────────────────────────────────────────
  const [logRate,     setLogRate]     = useState(initState)
  const [errors,      setErrors]      = useState(initState)
  const [topSources,  setTopSources]  = useState(initState)
  const [topChannels, setTopChannels] = useState(initState)
  const [indexSize,   setIndexSize]   = useState(initState)

  const [summary,     setSummary]     = useState({ data: null, loading: true, error: null })
  const [lastRefresh, setLastRefresh] = useState(null)
  const [kibanaUrl,   setKibanaUrl]   = useState(null)

  // Phase 1.1 ✅
  const [timeRange, setTimeRange] = useState('15m')

  // Phase 2.1 ✅
  const [isLive, setIsLive] = useState(true)

  // ── Fetch all stats in parallel ─────────────────────────────────────────
  // Phase 2.2: wrap interval in if (isLive)
  const fetchAll = useCallback(async () => {
    const loading = { loading: true }
    setLogRate(s     => ({ ...s, ...loading }))
    setErrors(s      => ({ ...s, ...loading }))
    setTopSources(s  => ({ ...s, ...loading }))
    setTopChannels(s => ({ ...s, ...loading }))
    setIndexSize(s   => ({ ...s, ...loading }))
    setSummary(s     => ({ ...s, ...loading }))

    const [lr, err, ts, tc, is, sm] = await Promise.allSettled([
      api.get('/stats/log-rate',     { params: { range: timeRange } }),  // Step 1.2 ✅
      api.get('/stats/errors',       { params: { range: timeRange } }),  // Step 1.2 ✅
      api.get('/stats/top-sources',  { params: { range: timeRange } }),  // Step 1.2 ✅
      api.get('/stats/top-channels', { params: { range: timeRange } }),  // Step 1.2 ✅
      api.get('/stats/index-size'),                                       // fixed — not range-dependent
      api.get('/stats/summary',      { params: { range: timeRange } }),  // Phase 3 ✅
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
    setSummary({
      data:    sm.status === 'fulfilled' ? sm.value.data.data : null,
      loading: false,
      error:   sm.status === 'rejected'  ? 'Failed to load' : null,
    })
    setLastRefresh(new Date())
  }, [timeRange])   // Step 1.2 ✅ — refetch whenever range changes

  // Kibana URL — fetched once, not affected by time range
  useEffect(() => {
    api.get('/config/kibana-url')
      .then(({ data }) => setKibanaUrl(data.url))
      .catch(() => setKibanaUrl(null))
  }, [])

  // Initial fetch + auto-refresh — pauses when isLive is false
  useEffect(() => {
    fetchAll()
    if (!isLive) return                              // Step 2.3 ✅ — paused, no interval
    const id = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll, isLive])                             // Step 2.2 ✅ — re-runs when toggled

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally {
      localStorage.removeItem('lm_username')
      navigate('/login')
    }
  }

  const username = localStorage.getItem('lm_username') || 'user'

  return (
    <div className={clsx('relative min-h-screen transition-colors duration-300', isDark ? 'bg-surface' : 'bg-gray-100')}>

      {snowfall && (
        <Snowfall snowflakeCount={120} color={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.4)'} style={{ zIndex: 0 }} />
      )}

      {isDark && <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className={clsx(
        'sticky top-0 z-20 border-b transition-colors duration-300',
        isDark ? 'bg-surface-card border-surface-border' : 'bg-white border-gray-200 shadow-sm'
      )}>
        <div className="max-w-screen-2xl mx-auto px-6 xl:px-10 2xl:px-16 py-3 flex items-center justify-between">

          {/* Left — logo */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border border-accent/60 flex items-center justify-center">
              <div className="w-2 h-2 bg-accent" />
            </div>
            <span className={clsx('font-mono text-sm tracking-[0.15em] uppercase', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
              CLM / Dashboard
            </span>
          </div>

          {/* Right — controls */}
          <div className="flex items-center gap-4">

            {/* Step 1.1 ✅ — time range dropdown */}
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className={clsx(
                'text-sm font-mono px-3 py-1.5 rounded-md border outline-none cursor-pointer transition-all',
                isDark
                  ? 'bg-surface border-surface-border text-ink-secondary hover:border-accent/50'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-accent/50'
              )}
            >
              <option value="15m">Last 15 min</option>
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
            </select>

            {/* Phase 2.1 ✅ — live/pause toggle */}
            <button
              onClick={() => setIsLive(v => !v)}
              className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded-md border transition-all',
                isLive
                  ? isDark
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                    : 'border-emerald-400 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  : isDark
                    ? 'border-surface-border text-ink-muted hover:border-accent hover:text-accent'
                    : 'border-gray-200 text-gray-400 hover:border-accent hover:text-accent'
              )}
            >
              {/* Pulsing dot when live */}
              <span className={clsx(
                'w-2 h-2 rounded-full',
                isLive ? 'bg-emerald-400 animate-pulse' : (isDark ? 'bg-surface-border' : 'bg-gray-300')
              )} />
              {isLive ? 'Live' : 'Paused'}
            </button>

            {lastRefresh && (
              <div className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-full border',
                isDark ? 'border-surface-border text-ink-muted bg-surface' : 'border-gray-200 text-gray-400 bg-gray-50'
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

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 xl:px-10 2xl:px-16 py-6 xl:py-8">

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => navigate('/explorer')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-mono font-medium
                       bg-accent hover:bg-accent-dim text-white transition-all active:scale-[0.99]"
          >
            <OpenInNewIcon sx={{ fontSize: 15 }} />
            Open Log Explorer
          </button>

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

        {/* Phase 3 ✅ — key metrics strip, respects timeRange */}
        <MetricsStrip isDark={isDark} data={summary.data} loading={summary.loading} />

        {/* ── Row 1: Log Rate + Errors ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 mb-4 xl:mb-6">
          <LogRateChart    isDark={isDark} {...logRate}  timeRange={timeRange} />
          <ErrorChart      isDark={isDark} {...errors}   timeRange={timeRange} />
        </div>

        {/* ── Row 2: Top Sources + Top Channels ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 mb-4 xl:mb-6">
          <TopSourcesChart  isDark={isDark} {...topSources}  timeRange={timeRange} />
          <TopChannelsChart isDark={isDark} {...topChannels} timeRange={timeRange} />
        </div>

        {/* Phase 4: <RecentLogsTable isDark={isDark} /> goes here */}

        {/* Phase 5: <InsightsPanel isDark={isDark} /> goes here */}

        {/* ── Row 3: Index Size — fixed, not tied to timeRange ─────────── */}
        <IndexSizeChart isDark={isDark} {...indexSize} />

      </div>

      <SettingsPanel />
    </div>
  )
}