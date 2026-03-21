import clsx from 'clsx'

// ── Individual metric tile ──────────────────────────────────────────────────
const Tile = ({ isDark, label, value, accent }) => (
  <div className={clsx(
    'flex-1 flex flex-col gap-1 px-6 py-4 rounded-md border-l-[3px]',
    isDark
      ? 'bg-surface-card shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
      : 'bg-white shadow-md',
    accent
  )}>
    <span className={clsx('text-xs font-mono tracking-widest uppercase', isDark ? 'text-ink-muted' : 'text-gray-400')}>
      {label}
    </span>
    <span className={clsx('text-2xl font-mono font-semibold tabular-nums', isDark ? 'text-ink-primary' : 'text-gray-800')}>
      {value ?? '—'}
    </span>
  </div>
)

// ── MetricsStrip ────────────────────────────────────────────────────────────
export default function MetricsStrip({ isDark, data, loading }) {

  const fmt = (n) => n != null ? n.toLocaleString() : null

  const tiles = [
    {
      label:  'Total Logs',
      value:  loading ? '…' : fmt(data?.totalLogs),
      accent: 'border-accent',
    },
    {
      label:  'Error Events (4625)',
      value:  loading ? '…' : fmt(data?.errorCount),
      accent: 'border-red-500',
    },
    {
      label:  'Unique Hosts',
      value:  loading ? '…' : fmt(data?.uniqueHosts),
      accent: 'border-emerald-500',
    },
    {
      label:  'Top Event ID',
      value:  loading ? '…' : (data?.topEventId ?? '—'),
      accent: 'border-amber-500',
    },
  ]

  return (
    <div className="flex gap-4 xl:gap-6 mb-4 xl:mb-6">
      {tiles.map(t => (
        <Tile
          key={t.label}
          isDark={isDark}
          label={t.label}
          value={t.value}
          accent={t.accent}
        />
      ))}
    </div>
  )
}