import { useState, useCallback, useRef, useEffect }  from 'react'
import { useNavigate }                    from 'react-router-dom'
import { format }                         from 'date-fns'
import clsx                               from 'clsx'

import SearchIcon        from '@mui/icons-material/Search'
import LogoutIcon        from '@mui/icons-material/Logout'
import ArrowBackIcon     from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore'
import ExpandLessIcon    from '@mui/icons-material/ExpandLess'
import ContentCopyIcon   from '@mui/icons-material/ContentCopy'
import CheckIcon         from '@mui/icons-material/Check'
import ErrorOutlineIcon  from '@mui/icons-material/ErrorOutline'
import InboxIcon         from '@mui/icons-material/Inbox'

import api               from '../lib/axios'
import SettingsPanel     from '../components/SettingsPanel'
import { useUIStore }    from '../store/uiStore'
import Snowfall          from 'react-snowfall'

// ── Time range options ─────────────────────────────────────────────────────
const TIME_RANGES = [
  { label: 'Last 15 min', value: '15m' },
  { label: 'Last 1 hour', value: '1h'  },
  { label: 'Last 6 hours',value: '6h'  },
  { label: 'Last 24 hours',value: '24h' },
]

// ── Event ID badge color map ───────────────────────────────────────────────
const eventColor = (id) => {
  if (id === 4625) return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (id === 4624) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  return 'text-ink-secondary bg-surface-border/30 border-surface-border'
}

// ── Truncate message ───────────────────────────────────────────────────────
const truncate = (str, n = 100) =>
  str && str.length > n ? str.slice(0, n) + '…' : str

// ── Copy to clipboard hook ─────────────────────────────────────────────────
const useCopy = () => {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

// ── Expanded row — raw JSON view ───────────────────────────────────────────
const ExpandedRow = ({ isDark, log, onClose }) => {
  const { copied, copy } = useCopy()
  const json = JSON.stringify(log, null, 2)

  return (
    <tr>
      <td colSpan={4} className={clsx(
        'px-4 py-3 border-b',
        isDark ? 'border-surface-border bg-surface' : 'border-gray-100 bg-gray-50'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className={clsx(
            'text-xs font-mono tracking-widest uppercase',
            isDark ? 'text-ink-secondary' : 'text-gray-400'
          )}>
            Raw JSON — {log.id}
          </span>
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={() => copy(json)}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-sm border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
                  : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
              )}
            >
              {copied
                ? <><CheckIcon sx={{ fontSize: 12 }} /> Copied</>
                : <><ContentCopyIcon sx={{ fontSize: 12 }} /> Copy</>
              }
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className={clsx(
                'text-xs font-mono px-2.5 py-1 rounded-sm border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-red-500/50 hover:text-red-400'
                  : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
              )}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* JSON block */}
        <pre className={clsx(
          'text-xs font-mono rounded-sm p-4 overflow-x-auto leading-relaxed',
          isDark ? 'bg-surface-DEFAULT text-ink-primary' : 'bg-white text-gray-700 border border-gray-200'
        )}>
          {json}
        </pre>
      </td>
    </tr>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function LogExplorer() {
  const navigate = useNavigate()
  const { isDark, snowfall } = useUIStore()

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]   = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [timeRange, setTimeRange]       = useState('15m')

  // ── Results state ─────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [expandedId, setExpandedId] = useState(null)   // which row is expanded

  // ── Pagination — stack of search_after cursors ────────────────────────────
  // cursors[0] = null (first page), cursors[1] = cursor after page 1, etc.
  const [cursors,     setCursors]     = useState([null])
  const [currentPage, setCurrentPage] = useState(0)
  const [nextAfter,   setNextAfter]   = useState(null)

  // ── Fetch logs ────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (search, range, afterCursor) => {
    setLoading(true)
    setError(null)
    setExpandedId(null)   // collapse any open row on new fetch

    try {
      const params = { search, range }
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

  // ── Auto-load on mount — no need to press Search manually ────────────────
  useEffect(() => { fetchLogs('', '15m', null) }, [fetchLogs])

  // ── Search trigger (Enter key) ────────────────────────────────────────────
  const handleSearch = () => {
    setActiveSearch(searchInput)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs(searchInput, timeRange, null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  // ── Time range change ─────────────────────────────────────────────────────
  const handleRangeChange = (e) => {
    const range = e.target.value
    setTimeRange(range)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs(activeSearch, range, null)
  }

  // ── Next page ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (!nextAfter) return
    const newCursors = [...cursors, nextAfter]
    const newPage    = currentPage + 1
    setCursors(newCursors)
    setCurrentPage(newPage)
    fetchLogs(activeSearch, timeRange, nextAfter)
  }

  // ── Prev page ─────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (currentPage === 0) return
    const newPage    = currentPage - 1
    const prevCursor = cursors[newPage]
    setCurrentPage(newPage)
    fetchLogs(activeSearch, timeRange, prevCursor)
  }

  // ── Row expand toggle ─────────────────────────────────────────────────────
  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally {
      localStorage.removeItem('lm_username')
      navigate('/login')
    }
  }

  const username    = localStorage.getItem('lm_username') || 'user'
  const pageDisplay = total > 0 ? `Page ${currentPage + 1}` : ''

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

      {/* ── Dot grid ──────────────────────────────────────────────────────── */}
      {isDark && <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />}

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Back to dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-sm border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
                  : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
              )}
            >
              <ArrowBackIcon sx={{ fontSize: 13 }} />
              Dashboard
            </button>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border border-accent/60 flex items-center justify-center">
                <div className="w-2 h-2 bg-accent" />
              </div>
              <span className={clsx(
                'font-mono text-xs tracking-[0.2em] uppercase',
                isDark ? 'text-ink-secondary' : 'text-gray-500'
              )}>
                CLM / Explorer
              </span>
            </div>
          </div>

          {/* Right: username + logout */}
          <div className="flex items-center gap-4">
            <span className={clsx(
              'text-xs font-mono',
              isDark ? 'text-ink-muted' : 'text-gray-400'
            )}>
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

        {/* ── Search bar ────────────────────────────────────────────────────── */}
        <div className={clsx(
          'flex items-center gap-3 p-4 rounded-sm mb-4 border',
          isDark ? 'bg-surface-card border-surface-border' : 'bg-white border-gray-200 shadow-sm'
        )}>

          {/* Search input */}
          <div className="relative flex-1">
            <span className={clsx(
              'absolute left-3 top-1/2 -translate-y-1/2',
              isDark ? 'text-ink-muted' : 'text-gray-400'
            )}>
              <SearchIcon sx={{ fontSize: 16 }} />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Search logs… e.g. "login" or "eventid:4624" or "hostname:server01"'
              className={clsx(
                'w-full pl-9 pr-4 py-2 rounded-sm text-sm font-mono transition-all duration-200',
                'outline-none border',
                isDark
                  ? 'bg-surface border-surface-border text-ink-primary placeholder-ink-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20'
                  : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-accent/50'
              )}
            />
          </div>

          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={handleRangeChange}
            className={clsx(
              'text-xs font-mono px-3 py-2 rounded-sm border outline-none cursor-pointer transition-all',
              isDark
                ? 'bg-surface border-surface-border text-ink-secondary hover:border-accent/50'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-accent/50'
            )}
          >
            {TIME_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-mono
                       bg-accent hover:bg-accent-dim text-white transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <SearchIcon sx={{ fontSize: 14 }} />
            }
            Search
          </button>
        </div>

        {/* ── Results summary ────────────────────────────────────────────────── */}
        {total > 0 && (
          <div className={clsx(
            'text-xs font-mono mb-3',
            isDark ? 'text-ink-muted' : 'text-gray-400'
          )}>
            {total.toLocaleString()} results
            {activeSearch && <span> for <span className="text-accent">"{activeSearch}"</span></span>}
          </div>
        )}

        {/* ── Log table ─────────────────────────────────────────────────────── */}
        <div className={clsx(
          'rounded-sm border overflow-hidden mb-4',
          isDark ? 'border-surface-border' : 'border-gray-200 shadow-sm'
        )}>
          <table className="w-full text-sm">

            {/* Table header */}
            <thead>
              <tr className={clsx(
                'text-xs font-mono tracking-widest uppercase',
                isDark ? 'bg-surface-card border-b border-surface-border text-ink-secondary' : 'bg-gray-50 border-b border-gray-200 text-gray-500'
              )}>
                <th className="px-4 py-3 text-left w-44">Timestamp</th>
                <th className="px-4 py-3 text-left w-36">Hostname</th>
                <th className="px-4 py-3 text-left w-24">Event ID</th>
                <th className="px-4 py-3 text-left">Message</th>
              </tr>
            </thead>

            <tbody>
              {/* ── Loading skeleton ───────────────────────────────────────── */}
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={clsx(
                  'border-b',
                  isDark ? 'border-surface-border' : 'border-gray-100'
                )}>
                  {[44, 36, 24, 'full'].map((w, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className={clsx(
                        'h-3 rounded animate-pulse',
                        isDark ? 'bg-surface-border' : 'bg-gray-200',
                        j === 3 ? 'w-3/4' : 'w-full'
                      )} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* ── Error state ────────────────────────────────────────────── */}
              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-red-400">
                      <ErrorOutlineIcon sx={{ fontSize: 24 }} />
                      <span className="text-sm font-mono">{error}</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Empty state ────────────────────────────────────────────── */}
              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className={clsx(
                      'flex flex-col items-center gap-2',
                      isDark ? 'text-ink-muted' : 'text-gray-400'
                    )}>
                      <InboxIcon sx={{ fontSize: 28 }} />
                      <span className="text-sm font-mono">
                        {activeSearch ? 'No logs matched your search.' : 'No logs found in the selected time range.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Log rows ───────────────────────────────────────────────── */}
              {!loading && logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => toggleExpand(log.id)}
                    className={clsx(
                      'border-b cursor-pointer transition-colors duration-100',
                      isDark
                        ? 'border-surface-border hover:bg-surface-hover'
                        : 'border-gray-100 hover:bg-gray-50',
                      expandedId === log.id && (isDark ? 'bg-surface-hover' : 'bg-gray-50')
                    )}
                  >
                    {/* Timestamp */}
                    <td className={clsx(
                      'px-4 py-2.5 font-mono text-xs whitespace-nowrap',
                      isDark ? 'text-ink-secondary' : 'text-gray-500'
                    )}>
                      {format(new Date(log.timestamp), 'MM-dd HH:mm:ss')}
                    </td>

                    {/* Hostname */}
                    <td className={clsx(
                      'px-4 py-2.5 font-mono text-xs',
                      isDark ? 'text-ink-primary' : 'text-gray-700'
                    )}>
                      {log.hostname}
                    </td>

                    {/* Event ID badge */}
                    <td className="px-4 py-2.5">
                      <span className={clsx(
                        'inline-block text-xs font-mono px-2 py-0.5 rounded-sm border',
                        eventColor(log.eventid)
                      )}>
                        {log.eventid}
                      </span>
                    </td>

                    {/* Message + expand icon */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={clsx(
                          'text-xs font-mono',
                          isDark ? 'text-ink-secondary' : 'text-gray-600'
                        )}>
                          {truncate(log.message)}
                        </span>
                        <span className={clsx(
                          'shrink-0',
                          isDark ? 'text-ink-muted' : 'text-gray-400'
                        )}>
                          {expandedId === log.id
                            ? <ExpandLessIcon sx={{ fontSize: 16 }} />
                            : <ExpandMoreIcon sx={{ fontSize: 16 }} />
                          }
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded raw JSON row */}
                  {expandedId === log.id && (
                    <ExpandedRow
                      key={`${log.id}-expanded`}
                      isDark={isDark}
                      log={log}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {logs.length > 0 && !loading && (
          <div className="flex items-center justify-between">
            <span className={clsx(
              'text-xs font-mono',
              isDark ? 'text-ink-muted' : 'text-gray-400'
            )}>
              Showing {logs.length} of {total.toLocaleString()}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                disabled={currentPage === 0}
                className={clsx(
                  'text-xs font-mono px-3 py-1.5 rounded-sm border transition-all',
                  isDark
                    ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent disabled:opacity-30'
                    : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent disabled:opacity-30',
                  'disabled:cursor-not-allowed'
                )}
              >
                ← Prev
              </button>

              <span className={clsx(
                'text-xs font-mono',
                isDark ? 'text-ink-secondary' : 'text-gray-500'
              )}>
                {pageDisplay}
              </span>

              <button
                onClick={handleNext}
                disabled={!nextAfter}
                className={clsx(
                  'text-xs font-mono px-3 py-1.5 rounded-sm border transition-all',
                  isDark
                    ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent disabled:opacity-30'
                    : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent disabled:opacity-30',
                  'disabled:cursor-not-allowed'
                )}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Floating settings ─────────────────────────────────────────────── */}
      <SettingsPanel />

    </div>
  )
}