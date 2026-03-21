import { useNavigate }   from 'react-router-dom'
import clsx             from 'clsx'
import { format }       from 'date-fns'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import OpenInNewIcon    from '@mui/icons-material/OpenInNew'
import InboxIcon        from '@mui/icons-material/Inbox'

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtTime = (ts) => {
  try { return format(new Date(ts), 'MM-dd HH:mm:ss') }
  catch { return ts || '—' }
}

const truncate = (str, n = 72) =>
  str?.length > n ? str.slice(0, n) + '…' : str

// ── Severity badge ───────────────────────────────────────────────────────────
const SeverityBadge = ({ severity }) => {
  if (!severity) return <span className="text-gray-400 font-mono text-xs">—</span>
  const v = severity.toLowerCase()
  const styles = {
    critical:    'bg-red-500/15 text-red-400 border-red-500/30',
    error:       'bg-orange-400/15 text-orange-400 border-orange-400/30',
    warning:     'bg-amber-400/15 text-amber-400 border-amber-400/30',
    information: 'bg-surface-border/30 text-ink-muted border-surface-border',
  }
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-sm border text-xs font-mono tracking-wide',
      styles[v] || 'bg-surface-border/30 text-ink-muted border-surface-border'
    )}>
      {severity}
    </span>
  )
}

// ── Channel badge ────────────────────────────────────────────────────────────
const ChannelBadge = ({ channel, isDark }) => {
  if (!channel) return <span className={clsx('font-mono text-xs', isDark ? 'text-ink-muted' : 'text-gray-400')}>—</span>
  const v = channel.toLowerCase()
  const color = v === 'security'    ? (isDark ? 'text-blue-400'   : 'text-blue-600')
              : v === 'system'      ? (isDark ? 'text-purple-400' : 'text-purple-600')
              : v === 'application' ? (isDark ? 'text-teal-400'   : 'text-teal-600')
              : (isDark ? 'text-ink-muted' : 'text-gray-500')
  return (
    <span className={clsx('font-mono text-xs', color)}>
      {channel}
    </span>
  )
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
const Skeleton = ({ isDark }) => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <tr key={i} className={clsx('border-b', isDark ? 'border-surface-border' : 'border-gray-100')}>
        {[28, 32, 24, 16, 60].map((w, j) => (
          <td key={j} className="px-4 py-3">
            <div className={clsx(
              'h-3 rounded animate-pulse',
              isDark ? 'bg-surface-border' : 'bg-gray-200',
              `w-${w}`
            )} />
          </td>
        ))}
      </tr>
    ))}
  </>
)

// ── RecentLogsTable ──────────────────────────────────────────────────────────
export default function RecentLogsTable({ isDark, data = [], loading, error, timeRange = '15m' }) {
  const navigate = useNavigate()

  // Row click — open explorer filtered to same hostname + severity
  const handleRowClick = (row) => {
    const params = new URLSearchParams({
      hostname: row.hostname,
      severity: row.severity,
      range:    timeRange,
    })
    navigate(`/explorer?${params.toString()}`)
  }

  // View All — open explorer pre-filtered to errors/critical in same time range
  const handleViewAll = () => {
    const params = new URLSearchParams({
      severity: 'error',   // explorer will show error + critical via backend
      range:    timeRange,
    })
    navigate(`/explorer?${params.toString()}`)
  }

  return (
    <div className={clsx(
      'rounded-md overflow-hidden',
      isDark
        ? 'bg-surface-card shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
        : 'bg-white shadow-md'
    )}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-l-[3px] border-red-500">
        <div className="flex items-center gap-3">
          <span className={clsx('text-sm font-mono font-medium', isDark ? 'text-ink-secondary' : 'text-gray-600')}>
            Recent Errors &amp; Critical
          </span>
          {/* Live indicator dot */}
          <span className={clsx(
            'flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border',
            isDark ? 'border-surface-border text-ink-muted' : 'border-gray-200 text-gray-400'
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            live
          </span>
        </div>

        {/* View All button */}
        <button
          onClick={handleViewAll}
          className={clsx(
            'flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border transition-all',
            isDark
              ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
              : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
          )}
        >
          <OpenInNewIcon sx={{ fontSize: 12 }} />
          View All in Explorer
        </button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          {/* Column headers */}
          <thead>
            <tr className={clsx(
              'text-xs font-mono tracking-widest uppercase border-b',
              isDark
                ? 'bg-surface border-surface-border text-ink-muted'
                : 'bg-gray-50 border-gray-100 text-gray-400'
            )}>
              <th className="px-4 py-2.5 text-left w-36">Time</th>
              <th className="px-4 py-2.5 text-left w-36">Host</th>
              <th className="px-4 py-2.5 text-left w-28">Channel</th>
              <th className="px-4 py-2.5 text-left w-24">Event ID</th>
              <th className="px-4 py-2.5 text-left w-24">Severity</th>
              <th className="px-4 py-2.5 text-left">Message</th>
            </tr>
          </thead>

          <tbody>

            {/* Loading */}
            {loading && <Skeleton isDark={isDark} />}

            {/* Error */}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-red-400">
                    <ErrorOutlineIcon sx={{ fontSize: 20 }} />
                    <span className="text-xs font-mono">{error}</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty */}
            {!loading && !error && data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className={clsx('flex flex-col items-center gap-2', isDark ? 'text-ink-muted' : 'text-gray-400')}>
                    <InboxIcon sx={{ fontSize: 22 }} />
                    <span className="text-xs font-mono">No errors or critical events in this window.</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Rows */}
            {!loading && !error && data.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => handleRowClick(row)}
                className={clsx(
                  'border-b cursor-pointer transition-colors duration-100 group',
                  isDark
                    ? 'border-surface-border hover:bg-surface-hover'
                    : 'border-gray-50 hover:bg-gray-50',
                  // Subtle left accent based on severity
                  row.severity?.toLowerCase() === 'critical'
                    ? 'border-l-2 border-l-red-500'
                    : 'border-l-2 border-l-orange-400'
                )}
              >
                {/* Time */}
                <td className={clsx('px-4 py-3 font-mono text-xs whitespace-nowrap', isDark ? 'text-ink-muted' : 'text-gray-400')}>
                  {fmtTime(row.event_time)}
                </td>

                {/* Host */}
                <td className={clsx('px-4 py-3 font-mono text-xs', isDark ? 'text-ink-primary' : 'text-gray-700')}>
                  <span className="group-hover:text-accent transition-colors">
                    {row.hostname || '—'}
                  </span>
                </td>

                {/* Channel */}
                <td className="px-4 py-3">
                  <ChannelBadge channel={row.channel} isDark={isDark} />
                </td>

                {/* Event ID */}
                <td className={clsx('px-4 py-3 font-mono text-xs tabular-nums', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                  {row.event_id || '—'}
                </td>

                {/* Severity */}
                <td className="px-4 py-3">
                  <SeverityBadge severity={row.severity} />
                </td>

                {/* Message */}
                <td className={clsx('px-4 py-3 font-mono text-xs', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                  {truncate(row.message)}
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {/* ── Footer — row count ── */}
      {!loading && !error && data.length > 0 && (
        <div className={clsx(
          'flex items-center justify-between px-6 py-3 border-t text-xs font-mono',
          isDark ? 'border-surface-border text-ink-muted' : 'border-gray-100 text-gray-400'
        )}>
          <span>Showing {data.length} most recent errors &amp; critical events</span>
          <button
            onClick={handleViewAll}
            className={clsx('transition-colors hover:text-accent')}
          >
            View all →
          </button>
        </div>
      )}
    </div>
  )
}