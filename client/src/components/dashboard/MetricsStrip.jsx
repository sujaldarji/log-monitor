import clsx from 'clsx'

// ── % change calculation ────────────────────────────────────────────────────
const calcChange = (curr, prev) => {
  if (prev == null || prev === 0) return null
  const pct = ((curr - prev) / prev) * 100
  return Math.round(pct)
}

// ── Context-aware color ─────────────────────────────────────────────────────
// For errors: up = bad (red), down = good (green)
// For logs/hosts: up = neutral (blue), down = neutral (amber)
const trendColor = (pct, isError) => {
  if (pct === null) return ''
  if (isError) return pct > 0 ? 'text-red-400' : 'text-emerald-400'
  return pct > 0 ? 'text-blue-400' : 'text-amber-400'
}

// ── Trend badge ─────────────────────────────────────────────────────────────
const TrendBadge = ({ curr, prev, isError }) => {
  const pct = calcChange(curr, prev)
  if (pct === null) return null

  const arrow  = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  const label  = pct === 0 ? 'no change' : `${arrow} ${Math.abs(pct)}%`
  const color  = trendColor(pct, isError)

  return (
    <span className={clsx('text-xs font-mono mt-0.5', color)}>
      {label}
    </span>
  )
}

// ── Comparison label per range ──────────────────────────────────────────────
const PREV_LABEL = {
  '15m': 'vs prev 15 min',
  '1h':  'vs prev hour',
  '6h':  'vs prev 6 hours',
  '24h': 'vs yesterday',
}

// ── Individual metric tile ──────────────────────────────────────────────────
const Tile = ({ isDark, label, value, accent, trend }) => (
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
    {trend}
  </div>
)

// ── MetricsStrip ────────────────────────────────────────────────────────────
export default function MetricsStrip({ isDark, data, loading, timeRange = '15m' }) {
  const fmt = (n) => n != null ? n.toLocaleString() : null

  const curr = data?.current
  const prev = data?.previous
  const prevLabel = PREV_LABEL[timeRange] || 'vs prev period'

  const tiles = [
    {
      label:  'Total Logs',
      value:  loading ? '…' : fmt(curr?.totalLogs),
      accent: 'border-accent',
      trend:  loading || !prev ? null : (
        <TrendBadge curr={curr?.totalLogs} prev={prev?.totalLogs} isError={false} />
      ),
    },
    {
      label:  'Error Events (4625)',
      value:  loading ? '…' : fmt(curr?.errorCount),
      accent: 'border-red-500',
      trend:  loading || !prev ? null : (
        <TrendBadge curr={curr?.errorCount} prev={prev?.errorCount} isError={true} />
      ),
    },
    {
      label:  'Unique Hosts',
      value:  loading ? '…' : fmt(curr?.uniqueHosts),
      accent: 'border-emerald-500',
      trend:  loading || !prev ? null : (
        <TrendBadge curr={curr?.uniqueHosts} prev={prev?.uniqueHosts} isError={false} />
      ),
    },
    {
      label:  'Top Event ID',
      value:  loading ? '…' : (curr?.topEventId ?? '—'),
      accent: 'border-amber-500',
      trend:  null,
    },
  ]

  return (
    <div className="flex flex-col gap-1.5 mb-4 xl:mb-6">
      {!loading && prev && (
        <span className={clsx('text-xs font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
          {prevLabel}
        </span>
      )}
      <div className="flex gap-4 xl:gap-6">
        {tiles.map(t => (
          <Tile
            key={t.label}
            isDark={isDark}
            label={t.label}
            value={t.value}
            accent={t.accent}
            trend={t.trend}
          />
        ))}
      </div>
    </div>
  )
}