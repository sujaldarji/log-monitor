import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate }                      from 'react-router-dom'
import { format }                           from 'date-fns'
import clsx                                 from 'clsx'

import SearchIcon       from '@mui/icons-material/Search'
import CloseIcon        from '@mui/icons-material/Close'
import LogoutIcon       from '@mui/icons-material/Logout'
import ArrowBackIcon    from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore'
import ExpandLessIcon   from '@mui/icons-material/ExpandLess'
import ContentCopyIcon  from '@mui/icons-material/ContentCopy'
import CheckIcon        from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InboxIcon        from '@mui/icons-material/Inbox'
import DownloadIcon     from '@mui/icons-material/Download'

import api              from '../lib/axios'
import SettingsPanel    from '../components/SettingsPanel'
import { useUIStore }   from '../store/uistore'
import Snowfall         from 'react-snowfall'

// ── Constants ──────────────────────────────────────────────────────────────
const TIME_RANGES = [
  { label: 'Last 15 min',  value: '15m' },
  { label: 'Last 1 hour',  value: '1h'  },
  { label: 'Last 6 hours', value: '6h'  },
  { label: 'Last 24 hours',value: '24h' },
]

// Severity dot color
const severityColor = (s) => {
  if (!s) return 'bg-surface-border'
  const map = {
    critical:    'bg-red-500',
    error:       'bg-orange-400',
    warning:     'bg-amber-400',
    information: 'bg-surface-border',
  }
  return map[s.toLowerCase()] || 'bg-surface-border'
}

// Truncate message to N chars
const truncate = (str, n = 100) =>
  str?.length > n ? str.slice(0, n) + '…' : str

// Format timestamp for display
const fmtTime = (ts) => {
  try { return format(new Date(ts), 'MM-dd HH:mm:ss') }
  catch { return ts || '—' }
}

// ── Copy hook ──────────────────────────────────────────────────────────────
const useCopy = () => {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ── CSV Export ─────────────────────────────────────────────────────────────
// Exports current page logs as CSV — no extra library needed
const exportCSV = (logs) => {
  const headers = ['Timestamp', 'Hostname', 'Channel', 'Event ID', 'Severity', 'Message']
  const rows    = logs.map(l => [
    l.event_time || '',
    l.hostname   || '',
    l.channel    || '',
    l.event_id   || '',
    l.severity   || '',
    `"${(l.message || '').replace(/"/g, '""')}"`,  // escape quotes in message
  ])

  const csv      = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob     = new Blob([csv], { type: 'text/csv' })
  const url      = URL.createObjectURL(blob)
  const filename = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`

  // Trigger download
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Expanded row component ─────────────────────────────────────────────────
// Displays the full document fetched via GET /api/logs/:id
// Shows a loading spinner while fetching, error state if failed
const ExpandedRow = ({ isDark, log, detailLog, detailLoading, detailError, onClose }) => {
  const { copiedKey, copy } = useCopy()

  // Use full fetched document — fall back to table row data while loading
  const doc = detailLog || log

  // Common fields — always shown
  const commonFields = [
    { label: 'Timestamp',        value: doc.event_time,          key: 'event_time'          },
    { label: 'Event ID',         value: doc.event_id,            key: 'event_id'            },
    { label: 'Event Type',       value: doc.event_type,          key: 'event_type'          },
    { label: 'Channel',          value: doc.channel,             key: 'channel'             },
    { label: 'Hostname',         value: doc.hostname,            key: 'hostname'            },
    { label: 'Host FQDN',        value: doc.host,                key: 'host'                },
    { label: 'Severity',         value: doc.severity,            key: 'severity', dot: true },
    { label: 'Severity Value',   value: doc.severity_value,      key: 'severity_value'      },
    { label: 'Log Type',         value: doc.log_type,            key: 'log_type'            },
    { label: 'Event Category',   value: doc.event_category,      key: 'event_category'      },
    { label: 'Record Number',    value: doc.record_number,       key: 'record_number'       },
    { label: 'Message',          value: doc.message,             key: 'message', full: true },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '')

  // Extended fields — shown only if present in full document
  const extendedFields = [
    { label: 'Account Name',       value: doc.account_name,        key: 'account_name',        copyable: true },
    { label: 'Account Type',       value: doc.account_type,        key: 'account_type'                       },
    { label: 'Domain',             value: doc.domain,              key: 'domain'                             },
    { label: 'Subject User',       value: doc.subject_user_name,   key: 'subject_user_name'                  },
    { label: 'Subject Domain',     value: doc.subject_domain_name, key: 'subject_domain_name'                },
    { label: 'Target User',        value: doc.target_user_name,    key: 'target_user_name',    copyable: true },
    { label: 'Target Domain',      value: doc.target_domain_name,  key: 'target_domain_name'                 },
    { label: 'IP Address',         value: doc.ip_address,          key: 'ip_address',          copyable: true },
    { label: 'IP Port',            value: doc.ip_port,             key: 'ip_port'                            },
    { label: 'Port',               value: doc.port,                key: 'port'                               },
    { label: 'Process ID',         value: doc.process_id,          key: 'process_id'                         },
    { label: 'Process Name',       value: doc.process_name,        key: 'process_name'                       },
    { label: 'Source Name',        value: doc.source_name,         key: 'source_name'                        },
    { label: 'Category',           value: doc.category,            key: 'category'                           },
    { label: 'Elevated Token',     value: doc.elevated_token,      key: 'elevated_token'                     },
    { label: 'Logon Process',      value: doc.logon_process_name,  key: 'logon_process_name'                 },
    { label: 'Auth Package',       value: doc.auth_package_name,   key: 'auth_package_name'                  },
    { label: 'Monitor Reason',     value: doc.monitor_reason,      key: 'monitor_reason'                     },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '')

  const FieldRow = ({ label, value, fieldKey, full, dot, copyable }) => (
    <div className={clsx(
      'flex gap-4 py-1.5',
      full ? 'flex-col' : 'items-start'
    )}>
      <span className={clsx(
        'text-sm font-mono shrink-0 w-36',
        isDark ? 'text-ink-muted' : 'text-gray-400'
      )}>
        {label}
      </span>
      <span className={clsx(
        'text-sm font-mono flex items-center gap-2 flex-1',
        isDark ? 'text-ink-primary' : 'text-gray-700'
      )}>
        {/* Severity colored dot */}
        {dot && value && (
          <span className={clsx('w-2 h-2 rounded-full shrink-0', severityColor(value))} />
        )}
        <span className={full ? 'leading-relaxed whitespace-pre-wrap break-words' : ''}>
          {String(value)}
        </span>
        {/* Copy icon for copyable fields */}
        {copyable && (
          <button
            onClick={() => copy(String(value), fieldKey)}
            className={clsx(
              'ml-1 transition-colors',
              isDark ? 'text-ink-muted hover:text-ink-secondary' : 'text-gray-400 hover:text-gray-600'
            )}
            title={`Copy ${label}`}
          >
            {copiedKey === fieldKey
              ? <CheckIcon sx={{ fontSize: 13 }} />
              : <ContentCopyIcon sx={{ fontSize: 13 }} />
            }
          </button>
        )}
      </span>
    </div>
  )

  return (
    <tr>
      <td colSpan={5} className={clsx(
        'px-6 py-4 border-b',
        isDark ? 'border-surface-border bg-surface' : 'border-gray-100 bg-gray-50'
      )}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={clsx(
            'text-sm font-mono tracking-widest uppercase',
            isDark ? 'text-ink-secondary' : 'text-gray-400'
          )}>
            Log Detail — {log.id}
          </span>
          <button
            onClick={onClose}
            className={clsx(
              'flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-sm border transition-all',
              isDark
                ? 'border-surface-border text-ink-secondary hover:border-red-500/50 hover:text-red-400'
                : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
            )}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
            Close
          </button>
        </div>

        {/* Loading state */}
        {detailLoading && (
          <div className="flex items-center gap-2 py-6">
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
              Loading full document...
            </span>
          </div>
        )}

        {/* Error state */}
        {detailError && !detailLoading && (
          <div className="flex items-center gap-2 py-6 text-red-400">
            <ErrorOutlineIcon sx={{ fontSize: 16 }} />
            <span className="text-sm font-mono">{detailError}</span>
          </div>
        )}

        {/* Two column grid — common left, extended right */}
        {!detailLoading && !detailError && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-0">

            {/* Common fields */}
            <div className={clsx('divide-y', isDark ? 'divide-surface-border/50' : 'divide-gray-100')}>
              {commonFields.map(f => (
                <FieldRow
                  key={f.key}
                  label={f.label}
                  value={f.value ?? '—'}
                  fieldKey={f.key}
                  full={f.full}
                  dot={f.dot}
                  copyable={f.copyable}
                />
              ))}
            </div>

            {/* Extended fields — only if any exist */}
            {extendedFields.length > 0 && (
              <div className={clsx('divide-y', isDark ? 'divide-surface-border/50' : 'divide-gray-100')}>
                {extendedFields.map(f => (
                  <FieldRow
                    key={f.key}
                    label={f.label}
                    value={f.value}
                    fieldKey={f.key}
                    copyable={f.copyable}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Pagination controls ────────────────────────────────────────────────────
// Reused at both top and bottom of table
const PaginationControls = ({ isDark, currentPage, nextAfter, total, logsCount, onPrev, onNext, onPageInput }) => {
  const [pageInput, setPageInput] = useState('')

  const handlePageKeyDown = (e) => {
    if (e.key === 'Enter') {
      const num = parseInt(pageInput, 10)
      if (!isNaN(num) && num > 0) {
        onPageInput(num - 1)   // convert to 0-based
        setPageInput('')
      }
    }
  }

  return (
    <div className="flex items-center justify-between">
      <span className={clsx(
        'text-sm font-mono',
        isDark ? 'text-ink-muted' : 'text-gray-400'
      )}>
        {logsCount > 0 ? `Showing ${logsCount} of ${total.toLocaleString()}` : ''}
      </span>

      <div className="flex items-center gap-3">
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={currentPage === 0}
          className={clsx(
            'text-sm font-mono px-3 py-1.5 rounded-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
            isDark
              ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
              : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
          )}
        >
          ← Prev
        </button>

        {/* Editable page number */}
        <div className="flex items-center gap-1.5">
          <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
            Page
          </span>
          <input
            type="number"
            min={1}
            value={pageInput || currentPage + 1}
            onChange={e => setPageInput(e.target.value)}
            onKeyDown={handlePageKeyDown}
            onBlur={() => setPageInput('')}
            className={clsx(
              'w-14 text-center text-sm font-mono px-2 py-1 rounded-sm border outline-none transition-all',
              isDark
                ? 'bg-surface border-surface-border text-ink-primary focus:border-accent/50'
                : 'bg-white border-gray-200 text-gray-700 focus:border-accent/50'
            )}
            title="Type a page number and press Enter"
          />
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!nextAfter}
          className={clsx(
            'text-sm font-mono px-3 py-1.5 rounded-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
            isDark
              ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
              : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
          )}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function LogExplorer() {
  const navigate = useNavigate()
  const { isDark, snowfall } = useUIStore()

  // ── Search state ───────────────────────────────────────────────────────
  const [searchInput,  setSearchInput]  = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [timeRange,    setTimeRange]    = useState('15m')

  // ── Results state ──────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Cache fetched full documents — avoids re-fetching same log twice
  const detailCache = useRef(new Map())
  const [detailLog,     setDetailLog]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState(null)

  // ── Pagination ─────────────────────────────────────────────────────────
  // Stack of cursors — cursors[0] = null (page 1), cursors[n] = cursor after page n
  const [cursors,     setCursors]     = useState([null])
  const [currentPage, setCurrentPage] = useState(0)
  const [nextAfter,   setNextAfter]   = useState(null)

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (search, range, afterCursor) => {
    setLoading(true)
    setError(null)
    setExpandedId(null)

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

  // Auto-load on mount
  useEffect(() => { fetchLogs('', '15m', null) }, [fetchLogs])

  // ── Search ─────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setActiveSearch(searchInput)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs(searchInput, timeRange, null)
  }

  const handleKeyDown  = (e) => { if (e.key === 'Enter') handleSearch() }
  const handleClear    = () => { setSearchInput(''); setActiveSearch(''); setCursors([null]); setCurrentPage(0); fetchLogs('', timeRange, null) }
  const handleRangeChange = (e) => {
    const r = e.target.value
    setTimeRange(r)
    setCursors([null])
    setCurrentPage(0)
    fetchLogs(activeSearch, r, null)
  }

  // ── Pagination ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (!nextAfter) return
    const newCursors = [...cursors, nextAfter]
    const newPage    = currentPage + 1
    setCursors(newCursors)
    setCurrentPage(newPage)
    fetchLogs(activeSearch, timeRange, nextAfter)
  }

  const handlePrev = () => {
    if (currentPage === 0) return
    const newPage    = currentPage - 1
    const prevCursor = cursors[newPage]
    setCurrentPage(newPage)
    fetchLogs(activeSearch, timeRange, prevCursor)
  }

  // Jump to specific page — replays from page 1 up to target
  // Note: search_after doesn't support random access, so we fetch sequentially
  // For now, jump to page 1 if target not in cursor stack
  const handlePageInput = (targetPage) => {
    if (targetPage === 0) {
      setCursors([null])
      setCurrentPage(0)
      fetchLogs(activeSearch, timeRange, null)
    } else if (cursors[targetPage]) {
      setCurrentPage(targetPage)
      fetchLogs(activeSearch, timeRange, cursors[targetPage])
    }
    // If cursor not yet in stack, ignore — user must navigate there sequentially
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally {
      localStorage.removeItem('lm_username')
      navigate('/login')
    }
  }

  const username = localStorage.getItem('lm_username') || 'user'

  const paginationProps = {
    isDark, currentPage, nextAfter, total,
    logsCount: logs.length,
    onPrev: handlePrev,
    onNext: handleNext,
    onPageInput: handlePageInput,
  }

  return (
    <div className={clsx(
      'relative min-h-screen transition-colors duration-300',
      isDark ? 'bg-surface' : 'bg-gray-100'
    )}>

      {snowfall && (
        <Snowfall
          snowflakeCount={120}
          color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.4)'}
          style={{ zIndex: 0 }}
        />
      )}

      {isDark && <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />}

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 xl:px-10 2xl:px-16 py-6 xl:py-8">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-2.5 py-1.5 rounded-sm border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
                  : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
              )}
            >
              <ArrowBackIcon sx={{ fontSize: 14 }} />
              Dashboard
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 border border-accent/60 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-accent" />
              </div>
              <span className={clsx(
                'font-mono text-sm tracking-[0.15em] uppercase',
                isDark ? 'text-ink-secondary' : 'text-gray-500'
              )}>
                CLM / Explorer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
              {username}
            </span>
            <button
              onClick={handleLogout}
              className={clsx(
                'flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded-sm border transition-all',
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

        {/* ── Search bar ────────────────────────────────────────────────── */}
        <div className={clsx(
          'flex items-center gap-3 p-4 rounded-sm mb-4 border',
          isDark ? 'bg-surface-card border-surface-border' : 'bg-white border-gray-200 shadow-sm'
        )}>

          {/* Search input with clear button */}
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
              placeholder='Search… e.g. "login" or "event_id:4624" or "hostname:server01" or "channel:Security"'
              className={clsx(
                'w-full pl-9 pr-9 py-2.5 rounded-sm text-sm font-mono border outline-none transition-all',
                isDark
                  ? 'bg-surface border-surface-border text-ink-primary placeholder-ink-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20'
                  : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-accent/50'
              )}
            />
            {/* Clear button — visible only when search has text */}
            {searchInput && (
              <button
                onClick={handleClear}
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                  isDark ? 'text-ink-muted hover:text-ink-secondary' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </button>
            )}
          </div>

          {/* Time range */}
          <select
            value={timeRange}
            onChange={handleRangeChange}
            className={clsx(
              'text-sm font-mono px-3 py-2.5 rounded-sm border outline-none cursor-pointer transition-all',
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm text-sm font-mono
                       bg-accent hover:bg-accent-dim text-white transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <SearchIcon sx={{ fontSize: 15 }} />
            }
            Search
          </button>

          {/* Export CSV */}
          {logs.length > 0 && (
            <button
              onClick={() => exportCSV(logs)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-sm text-sm font-mono border transition-all',
                isDark
                  ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
                  : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
              )}
              title="Export current page as CSV"
            >
              <DownloadIcon sx={{ fontSize: 15 }} />
              Export
            </button>
          )}
        </div>

        {/* ── Results summary ────────────────────────────────────────────── */}
        {total > 0 && (
          <div className={clsx('text-sm font-mono mb-3', isDark ? 'text-ink-muted' : 'text-gray-400')}>
            {total.toLocaleString()} results
            {activeSearch && (
              <span> for <span className="text-accent">"{activeSearch}"</span></span>
            )}
          </div>
        )}

        {/* ── Pagination — top ───────────────────────────────────────────── */}
        {logs.length > 0 && !loading && (
          <div className="mb-3">
            <PaginationControls {...paginationProps} />
          </div>
        )}

        {/* ── Log table ─────────────────────────────────────────────────── */}
        <div className={clsx(
          'rounded-sm border overflow-hidden mb-4',
          isDark ? 'border-surface-border' : 'border-gray-200 shadow-sm'
        )}>
          <table className="w-full text-sm">

            {/* Header */}
            <thead>
              <tr className={clsx(
                'text-sm font-mono tracking-widest uppercase',
                isDark
                  ? 'bg-surface-card border-b border-surface-border text-ink-secondary'
                  : 'bg-gray-50 border-b border-gray-200 text-gray-500'
              )}>
                <th className="px-4 py-3 text-left w-40">Timestamp</th>
                <th className="px-4 py-3 text-left w-36">Hostname</th>
                <th className="px-4 py-3 text-left w-28">Channel</th>
                <th className="px-4 py-3 text-left w-24">Event ID</th>
                <th className="px-4 py-3 text-left">Message</th>
              </tr>
            </thead>

            <tbody>

              {/* Loading skeleton */}
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={clsx('border-b', isDark ? 'border-surface-border' : 'border-gray-100')}>
                  {[1, 2, 3, 4, 5].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className={clsx(
                        'h-3.5 rounded animate-pulse',
                        isDark ? 'bg-surface-border' : 'bg-gray-200',
                        j === 4 ? 'w-3/4' : 'w-full'
                      )} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Error state */}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-red-400">
                      <ErrorOutlineIcon sx={{ fontSize: 24 }} />
                      <span className="text-sm font-mono">{error}</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className={clsx(
                      'flex flex-col items-center gap-2',
                      isDark ? 'text-ink-muted' : 'text-gray-400'
                    )}>
                      <InboxIcon sx={{ fontSize: 28 }} />
                      <span className="text-sm font-mono">No logs found in the selected time range.</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Log rows */}
              {!loading && logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => {
                      const isOpen = expandedId === log.id
                      setExpandedId(isOpen ? null : log.id)
                      if (!isOpen) fetchDetail(log.id)
                    }}
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
                      'px-4 py-3 font-mono text-sm whitespace-nowrap',
                      isDark ? 'text-ink-secondary' : 'text-gray-500'
                    )}>
                      {fmtTime(log.event_time)}
                    </td>

                    {/* Hostname */}
                    <td className={clsx(
                      'px-4 py-3 font-mono text-sm',
                      isDark ? 'text-ink-primary' : 'text-gray-700'
                    )}>
                      {log.hostname || '—'}
                    </td>

                    {/* Channel */}
                    <td className={clsx(
                      'px-4 py-3 font-mono text-sm',
                      isDark ? 'text-ink-secondary' : 'text-gray-500'
                    )}>
                      {log.channel || '—'}
                    </td>

                    {/* Event ID — plain monospace, no badge */}
                    <td className={clsx(
                      'px-4 py-3 font-mono text-sm',
                      isDark ? 'text-ink-secondary' : 'text-gray-500'
                    )}>
                      {log.event_id || '—'}
                    </td>

                    {/* Message + expand toggle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={clsx(
                          'text-sm font-mono',
                          isDark ? 'text-ink-secondary' : 'text-gray-600'
                        )}>
                          {truncate(log.message)}
                        </span>
                        <span className={clsx(
                          'shrink-0',
                          isDark ? 'text-ink-muted' : 'text-gray-400'
                        )}>
                          {expandedId === log.id
                            ? <ExpandLessIcon sx={{ fontSize: 18 }} />
                            : <ExpandMoreIcon sx={{ fontSize: 18 }} />
                          }
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === log.id && (
                    <ExpandedRow
                      key={`${log.id}-expanded`}
                      isDark={isDark}
                      log={log}
                      detailLog={detailLog}
                      detailLoading={detailLoading}
                      detailError={detailError}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination — bottom ────────────────────────────────────────── */}
        {logs.length > 0 && !loading && (
          <PaginationControls {...paginationProps} />
        )}

      </div>

      <SettingsPanel />
    </div>
  )
}