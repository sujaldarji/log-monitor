import { useState }     from 'react'
import clsx             from 'clsx'
import CloseIcon        from '@mui/icons-material/Close'
import ContentCopyIcon  from '@mui/icons-material/ContentCopy'
import CheckIcon        from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { severityColor } from '../../lib/explorerHelpers'

// ── Copy hook ───────────────────────────────────────────────────────────────
const useCopy = () => {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ── Field row ───────────────────────────────────────────────────────────────
const FieldRow = ({ isDark, label, value, fieldKey, full, dot, copyable, copiedKey, onCopy }) => (
  <div className={clsx('flex gap-4 py-1.5', full ? 'flex-col' : 'items-start')}>
    <span className={clsx('text-sm font-mono shrink-0 w-36', isDark ? 'text-ink-muted' : 'text-gray-400')}>
      {label}
    </span>
    <span className={clsx('text-sm font-mono flex items-center gap-2 flex-1', isDark ? 'text-ink-primary' : 'text-gray-700')}>
      {dot && value && <span className={clsx('w-2 h-2 rounded-full shrink-0', severityColor(value))} />}
      <span className={full ? 'leading-relaxed whitespace-pre-wrap break-words' : ''}>
        {String(value)}
      </span>
      {copyable && (
        <button
          onClick={() => onCopy(String(value), fieldKey)}
          className={clsx('ml-1 transition-colors', isDark ? 'text-ink-muted hover:text-ink-secondary' : 'text-gray-400 hover:text-gray-600')}
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

// ── ExpandedRow ─────────────────────────────────────────────────────────────
export default function ExpandedRow({ isDark, log, detailLog, detailLoading, detailError, onClose }) {
  const { copiedKey, copy } = useCopy()
  const doc = detailLog || log

  const commonFields = [
    { label: 'Timestamp',      value: doc.event_time,     key: 'event_time'             },
    { label: 'Event ID',       value: doc.event_id,       key: 'event_id'               },
    { label: 'Event Type',     value: doc.event_type,     key: 'event_type'             },
    { label: 'Channel',        value: doc.channel,        key: 'channel'                },
    { label: 'Hostname',       value: doc.hostname,       key: 'hostname'               },
    { label: 'Host FQDN',      value: doc.host,           key: 'host'                   },
    { label: 'Severity',       value: doc.severity,       key: 'severity',   dot: true  },
    { label: 'Severity Value', value: doc.severity_value, key: 'severity_value'         },
    { label: 'Message',        value: doc.message,        key: 'message',    full: true },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '')

  const extendedFields = [
    { label: 'Account Name',   value: doc.account_name,        key: 'account_name',        copyable: true },
    { label: 'Account Type',   value: doc.account_type,        key: 'account_type'                       },
    { label: 'Domain',         value: doc.domain,              key: 'domain'                             },
    { label: 'Record Number',  value: doc.record_number,       key: 'record_number'                      },
    { label: 'Subject User',   value: doc.subject_user_name,   key: 'subject_user_name'                  },
    { label: 'Subject Domain', value: doc.subject_domain_name, key: 'subject_domain_name'                },
    { label: 'Target User',    value: doc.target_user_name,    key: 'target_user_name',    copyable: true },
    { label: 'Target Domain',  value: doc.target_domain_name,  key: 'target_domain_name'                 },
    { label: 'IP Address',     value: doc.ip_address,          key: 'ip_address',          copyable: true },
    { label: 'IP Port',        value: doc.ip_port,             key: 'ip_port'                            },
    { label: 'Port',           value: doc.port,                key: 'port'                               },
    { label: 'Process ID',     value: doc.process_id,          key: 'process_id'                         },
    { label: 'Process Name',   value: doc.process_name,        key: 'process_name'                       },
    { label: 'Source Name',    value: doc.source_name,         key: 'source_name'                        },
    { label: 'Category',       value: doc.category,            key: 'category'                           },
    { label: 'Elevated Token', value: doc.elevated_token,      key: 'elevated_token'                     },
    { label: 'Logon Process',  value: doc.logon_process_name,  key: 'logon_process_name'                 },
    { label: 'Auth Package',   value: doc.auth_package_name,   key: 'auth_package_name'                  },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '')

  return (
    <tr>
      <td colSpan={6} className={clsx('px-6 py-4 border-b', isDark ? 'border-surface-border bg-surface' : 'border-gray-100 bg-gray-50')}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={clsx('text-sm font-mono tracking-widest uppercase', isDark ? 'text-ink-secondary' : 'text-gray-400')}>
            Log Detail — {log.id}
          </span>
          <button
            onClick={onClose}
            className={clsx(
              'flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-sm border transition-all',
              isDark ? 'border-surface-border text-ink-secondary hover:border-red-500/50 hover:text-red-400' : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
            )}
          >
            <CloseIcon sx={{ fontSize: 14 }} /> Close
          </button>
        </div>

        {/* Loading */}
        {detailLoading && (
          <div className="flex items-center gap-2 py-6">
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
              Loading full document...
            </span>
          </div>
        )}

        {/* Error */}
        {detailError && !detailLoading && (
          <div className="flex items-center gap-2 py-6 text-red-400">
            <ErrorOutlineIcon sx={{ fontSize: 16 }} />
            <span className="text-sm font-mono">{detailError}</span>
          </div>
        )}

        {/* Fields grid */}
        {!detailLoading && !detailError && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12">
            <div className={clsx('divide-y', isDark ? 'divide-surface-border/50' : 'divide-gray-100')}>
              {commonFields.map(f => (
                <FieldRow
                  key={f.key} isDark={isDark}
                  label={f.label} value={f.value ?? '—'}
                  fieldKey={f.key} full={f.full} dot={f.dot}
                  copyable={f.copyable} copiedKey={copiedKey} onCopy={copy}
                />
              ))}
            </div>
            {extendedFields.length > 0 && (
              <div className={clsx('divide-y', isDark ? 'divide-surface-border/50' : 'divide-gray-100')}>
                {extendedFields.map(f => (
                  <FieldRow
                    key={f.key} isDark={isDark}
                    label={f.label} value={f.value}
                    fieldKey={f.key} copyable={f.copyable}
                    copiedKey={copiedKey} onCopy={copy}
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