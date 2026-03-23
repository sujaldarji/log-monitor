import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation }                  from 'react-router-dom'
import clsx                                          from 'clsx'

import LogoutIcon    from '@mui/icons-material/Logout'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import api                from '../lib/axios'
import SettingsPanel      from '../components/SettingsPanel'
import { useUIStore }     from '../store/uistore'
import Snowfall           from 'react-snowfall'

// ── Explorer sub-components ─────────────────────────────────────────────────
import SearchBar          from '../components/explorer/SearchBar'
import FilterChips        from '../components/explorer/FilterChips'
import LogTable           from '../components/explorer/LogTable'
import PaginationControls from '../components/explorer/PaginationControls'

import { DRILL_DOWN_KEYS } from '../lib/explorerHelpers'

// Phase: add more explorer sub-components here as needed
// e.g. import SavedSearches from '../components/explorer/SavedSearches'

export default function LogExplorer() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, snowfall } = useUIStore()

  // ── Search + filter state ──────────────────────────────────────────────
  const [searchInput,  setSearchInput]  = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [timeRange,    setTimeRange]    = useState('15m')

  // Structured drill-down filters from URL params
  // Shape: { hostname: 'PC-1', channel: 'security' }
  const [drillFilters, setDrillFilters] = useState({})

  // ── Results state ──────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Detail fetch state + cache
  const detailCache = useRef(new Map())
  const [detailLog,     setDetailLog]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState(null)

  // ── Pagination state ───────────────────────────────────────────────────
  const [cursors,     setCursors]     = useState([null])
  const [currentPage, setCurrentPage] = useState(0)
  const [nextAfter,   setNextAfter]   = useState(null)

  // ── Fetch log list ─────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (search, range, afterCursor, filters = {}) => {
    setLoading(true)
    setError(null)
    setExpandedId(null)
    setDetailLog(null)
    try {
      const params = { search, range, ...filters }
      if (afterCursor) params.after = afterCursor
      const { data } = await api.get('/logs', { params })
      setLogs(data.hits)
      setTotal(data.total)
      setNextAfter(data.nextAfter)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch logs.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch single log detail ────────────────────────────────────────────
  const fetchDetail = useCallback(async (id, index) => {
    if (detailCache.current.has(id)) {
      setDetailLog(detailCache.current.get(id))
      setDetailError(null)
      return
    }
    setDetailLog(null)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const params = {}
      if (typeof index === 'string' && index.length > 0) params.index = index
      const { data } = await api.get(`/logs/${id}`, { params })
      detailCache.current.set(id, data)
      setDetailLog(data)
    } catch (err) {
      setDetailError(err.response?.data?.error || 'Failed to load detail.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // ── Read URL params on mount — drill-down entry point ──────────────────
  // Dashboard clicks navigate('/explorer?hostname=PC-1&range=1h')
  // This reads those params, pre-fills filters + range, auto-fetches
  useEffect(() => {
    const p       = new URLSearchParams(location.search)
    const range   = p.get('range') || '15m'
    const filters = {}
    DRILL_DOWN_KEYS.forEach(k => { if (p.get(k)) filters[k] = p.get(k) })

    const searchText = Object.entries(filters).map(([k, v]) => `${k}:${v}`).join(' ')

    setTimeRange(range)
    setDrillFilters(filters)
    setSearchInput(searchText)
    setActiveSearch(searchText)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs('', range, null, filters)
  }, [location.search, fetchLogs])

  // ── Search handlers ────────────────────────────────────────────────────
  const handleSearch = () => {
    // Replace: manual search clears all drill-down filters
    setDrillFilters({})
    setActiveSearch(searchInput)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs(searchInput, timeRange, null, {})
  }

  const handleClear = () => {
    setSearchInput('')
    setActiveSearch('')
    setDrillFilters({})
    setCursors([null])
    setCurrentPage(0)
    fetchLogs('', timeRange, null, {})
  }

  const handleRangeChange = (r) => {
    setTimeRange(r)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs(activeSearch, r, null, drillFilters)
  }

  // Remove a single drill-down filter chip
  const removeFilter = (key) => {
    const updated    = { ...drillFilters }
    delete updated[key]
    const searchText = Object.entries(updated).map(([k, v]) => `${k}:${v}`).join(' ')
    setDrillFilters(updated)
    setSearchInput(searchText)
    setActiveSearch(searchText)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs('', timeRange, null, updated)
  }

  // ── Row click ──────────────────────────────────────────────────────────
  const handleRowClick = (log) => {
    const isOpen = expandedId === log.id
    if (isOpen) {
      setExpandedId(null)
    } else {
      setExpandedId(log.id)
      fetchDetail(log.id, log._index)
    }
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (!nextAfter) return
    const newCursors = [...cursors, nextAfter]
    const newPage    = currentPage + 1
    setCursors(newCursors)
    setCurrentPage(newPage)
    fetchLogs(activeSearch, timeRange, nextAfter, drillFilters)
  }

  const handlePrev = () => {
    if (currentPage === 0) return
    const newPage = currentPage - 1
    setCurrentPage(newPage)
    fetchLogs(activeSearch, timeRange, cursors[newPage], drillFilters)
  }

  // Sequential walk — fetches cursor-only (size:1) for intermediate pages
  // TODO: switch to from/size for instant random access if needed
  const handlePageInput = useCallback(async (targetPage) => {
    if (targetPage < 0) return
    if (targetPage === 0 || cursors[targetPage] !== undefined) {
      setCurrentPage(targetPage)
      fetchLogs(activeSearch, timeRange, cursors[targetPage] ?? null, drillFilters)
      return
    }
    setLoading(true)
    setError(null)
    let localCursors = [...cursors]
    let lastKnown    = localCursors.length - 1
    let lastCursor   = localCursors[lastKnown]
    try {
      while (lastKnown < targetPage) {
        const params = { search: activeSearch, range: timeRange, size: 1, ...drillFilters }
        if (lastCursor) params.after = lastCursor
        const { data } = await api.get('/logs', { params })
        if (!data.nextAfter) {
          setError(`Only ${lastKnown + 1} pages available.`)
          setLoading(false)
          return
        }
        lastKnown++
        lastCursor              = data.nextAfter
        localCursors[lastKnown] = lastCursor
      }
      setCursors(localCursors)
      setCurrentPage(targetPage)
      fetchLogs(activeSearch, timeRange, localCursors[targetPage], drillFilters)
    } catch {
      setError('Failed to jump to page.')
      setLoading(false)
    }
  }, [cursors, activeSearch, timeRange, drillFilters, fetchLogs])

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally {
      localStorage.removeItem('lm_username')
      navigate('/login')
    }
  }

  const username = localStorage.getItem('lm_username') || 'user'

  const paginationProps = {
    isDark, currentPage, nextAfter, total, cursors,
    logsCount:   logs.length,
    onPrev:      handlePrev,
    onNext:      handleNext,
    onPageInput: handlePageInput,
  }

  return (
    <div className={clsx('relative min-h-screen transition-colors duration-300', isDark ? 'bg-surface' : 'bg-gray-100')}>

      {snowfall && (
        <Snowfall snowflakeCount={120} color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.4)'} style={{ zIndex: 0 }} />
      )}
      {isDark && <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />}

      <div className="relative z-10 max-w-[1920px] mx-auto px-6 xl:px-10 2xl:px-20 py-6 xl:py-8">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-2.5 py-1.5 rounded-sm border transition-all',
                isDark ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent' : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
              )}
            >
              <ArrowBackIcon sx={{ fontSize: 14 }} /> Dashboard
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 border border-accent/60 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-accent" />
              </div>
              <span className={clsx('font-mono text-sm tracking-[0.15em] uppercase', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                CLM / Explorer
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>{username}</span>
            <button
              onClick={handleLogout}
              className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded-sm border transition-all',
                isDark ? 'border-surface-border text-ink-secondary hover:border-red-500/50 hover:text-red-400' : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
              )}
            >
              <LogoutIcon sx={{ fontSize: 14 }} /> Logout
            </button>
          </div>
        </div>

        {/* ── Search bar ── */}
        <SearchBar
          isDark={isDark}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          timeRange={timeRange}
          loading={loading}
          logs={logs}
          onSearch={handleSearch}
          onClear={handleClear}
          onRangeChange={handleRangeChange}
        />

        {/* ── Active drill-down filter chips ── */}
        <FilterChips
          isDark={isDark}
          drillFilters={drillFilters}
          onRemove={removeFilter}
          onClearAll={handleClear}
        />

        {/* ── Results summary ── */}
        {total > 0 && (
          <div className={clsx('text-sm font-mono mb-3', isDark ? 'text-ink-muted' : 'text-gray-400')}>
            {total.toLocaleString()} results
            {activeSearch && !Object.keys(drillFilters).length && (
              <span> for <span className="text-accent">{activeSearch}</span></span>
            )}
          </div>
        )}

        {/* ── Pagination top ── */}
        {logs.length > 0 && !loading && (
          <div className="mb-3">
            <PaginationControls {...paginationProps} />
          </div>
        )}

        {/* ── Log table ── */}
        <LogTable
          isDark={isDark}
          logs={logs}
          loading={loading}
          error={error}
          expandedId={expandedId}
          detailLog={detailLog}
          detailLoading={detailLoading}
          detailError={detailError}
          onRowClick={handleRowClick}
          onRowClose={() => setExpandedId(null)}
        />

        {/* ── Pagination bottom ── */}
        {logs.length > 0 && !loading && <PaginationControls {...paginationProps} />}

      </div>

      <SettingsPanel />
    </div>
  )
}