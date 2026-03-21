import { format } from 'date-fns'

// ── Severity dot color ──────────────────────────────────────────────────────
export const severityColor = (s) => {
  if (!s) return 'bg-surface-border'
  const map = {
    critical:    'bg-red-500',
    error:       'bg-orange-400',
    warning:     'bg-amber-400',
    information: 'bg-surface-border',
  }
  return map[s.toLowerCase()] || 'bg-surface-border'
}

// ── Row background based on severity ───────────────────────────────────────
export const severityRowClass = (s, isDark) => {
  if (!s) return ''
  const v = s.toLowerCase()
  if (v === 'critical') return isDark ? 'bg-red-500/8'    : 'bg-red-50'
  if (v === 'error')    return isDark ? 'bg-orange-400/8' : 'bg-orange-50'
  if (v === 'warning')  return isDark ? 'bg-amber-400/8'  : 'bg-amber-50'
  return ''
}

// ── Truncate message ────────────────────────────────────────────────────────
export const truncate = (str, n = 100) =>
  str?.length > n ? str.slice(0, n) + '…' : str

// ── Format timestamp ────────────────────────────────────────────────────────
export const fmtTime = (ts) => {
  try { return format(new Date(ts), 'MM-dd HH:mm:ss') }
  catch { return ts || '—' }
}

// ── CSV export ──────────────────────────────────────────────────────────────
export const exportCSV = (logs) => {
  const headers = ['Timestamp', 'Hostname', 'Channel', 'Event ID', 'Severity', 'Message']
  const rows    = logs.map(l => [
    l.event_time || '',
    l.hostname   || '',
    l.channel    || '',
    l.event_id   || '',
    l.severity   || '',
    `"${(l.message || '').replace(/"/g, '""')}"`,
  ])
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Drill-down filter keys accepted from URL params ─────────────────────────
export const DRILL_DOWN_KEYS = ['hostname', 'channel', 'event_id', 'severity']

// ── Time range options ──────────────────────────────────────────────────────
export const TIME_RANGES = [
  { label: 'Last 15 min',   value: '15m' },
  { label: 'Last 1 hour',   value: '1h'  },
  { label: 'Last 6 hours',  value: '6h'  },
  { label: 'Last 24 hours', value: '24h' },
]