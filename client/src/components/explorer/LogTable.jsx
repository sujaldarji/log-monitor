import { Fragment }     from 'react'
import clsx             from 'clsx'
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore'
import ExpandLessIcon   from '@mui/icons-material/ExpandLess'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InboxIcon        from '@mui/icons-material/Inbox'
import ExpandedRow      from './ExpandedRow'
import { severityColor, severityRowClass, truncate, fmtTime } from '../../lib/explorerHelpers'

export default function LogTable({
  isDark,
  logs,
  loading,
  error,
  expandedId,
  detailLog,
  detailLoading,
  detailError,
  onRowClick,
  onRowClose,
}) {
  return (
    <div className={clsx('rounded-sm border overflow-hidden mb-4', isDark ? 'border-surface-border' : 'border-gray-200 shadow-sm')}>
      <table className="w-full text-sm">

        {/* Header */}
        <thead>
          <tr className={clsx(
            'text-sm font-mono tracking-widest uppercase',
            isDark ? 'bg-surface-card border-b border-surface-border text-ink-secondary' : 'bg-gray-50 border-b border-gray-200 text-gray-500'
          )}>
            <th className="px-4 py-3 text-left w-40">Timestamp</th>
            <th className="px-4 py-3 text-left w-36">Hostname</th>
            <th className="px-4 py-3 text-left w-28">Channel</th>
            <th className="px-4 py-3 text-left w-24">Event ID</th>
            <th className="px-4 py-3 text-left w-24">Severity</th>
            <th className="px-4 py-3 text-left">Message</th>
          </tr>
        </thead>

        <tbody>

          {/* Loading skeleton */}
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className={clsx('border-b', isDark ? 'border-surface-border' : 'border-gray-100')}>
              {[1,2,3,4,5,6].map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className={clsx('h-3.5 rounded animate-pulse', isDark ? 'bg-surface-border' : 'bg-gray-200', j === 5 ? 'w-3/4' : 'w-full')} />
                </td>
              ))}
            </tr>
          ))}

          {/* Error state */}
          {!loading && error && (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center">
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
              <td colSpan={6} className="px-4 py-16 text-center">
                <div className={clsx('flex flex-col items-center gap-2', isDark ? 'text-ink-muted' : 'text-gray-400')}>
                  <InboxIcon sx={{ fontSize: 28 }} />
                  <span className="text-sm font-mono">No logs found.</span>
                </div>
              </td>
            </tr>
          )}

          {/* Log rows */}
          {!loading && logs.map((log) => (
            <Fragment key={log.id}>
              <tr
                onClick={() => onRowClick(log)}
                className={clsx(
                  'border-b cursor-pointer transition-colors duration-100',
                  isDark ? 'border-surface-border hover:bg-surface-hover' : 'border-gray-100 hover:bg-gray-50',
                  expandedId === log.id
                    ? (isDark ? 'bg-surface-hover' : 'bg-gray-50')
                    : severityRowClass(log.severity, isDark)
                )}
              >
                <td className={clsx('px-4 py-3 font-mono text-sm whitespace-nowrap', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                  {fmtTime(log.event_time)}
                </td>
                <td className={clsx('px-4 py-3 font-mono text-sm', isDark ? 'text-ink-primary' : 'text-gray-700')}>
                  {log.hostname || '—'}
                </td>
                <td className={clsx('px-4 py-3 font-mono text-sm', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                  {log.channel || '—'}
                </td>
                <td className={clsx('px-4 py-3 font-mono text-sm', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                  {log.event_id || '—'}
                </td>
                <td className="px-4 py-3">
                  {log.severity ? (
                    <div className="flex items-center gap-1.5">
                      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', severityColor(log.severity))} />
                      <span className={clsx('font-mono text-sm', isDark ? 'text-ink-secondary' : 'text-gray-500')}>
                        {log.severity}
                      </span>
                    </div>
                  ) : <span className={clsx('font-mono text-sm', isDark ? 'text-ink-muted' : 'text-gray-400')}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={clsx('text-sm font-mono', isDark ? 'text-ink-secondary' : 'text-gray-600')}>
                      {truncate(log.message)}
                    </span>
                    <span className={clsx('shrink-0', isDark ? 'text-ink-muted' : 'text-gray-400')}>
                      {expandedId === log.id
                        ? <ExpandLessIcon sx={{ fontSize: 18 }} />
                        : <ExpandMoreIcon sx={{ fontSize: 18 }} />
                      }
                    </span>
                  </div>
                </td>
              </tr>

              {expandedId === log.id && (
                <ExpandedRow
                  isDark={isDark}
                  log={log}
                  detailLog={detailLog}
                  detailLoading={detailLoading}
                  detailError={detailError}
                  onClose={onRowClose}
                />
              )}
            </Fragment>
          ))}

        </tbody>
      </table>
    </div>
  )
}