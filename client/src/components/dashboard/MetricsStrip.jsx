import clsx from 'clsx'

const calcChange = (curr, prev) => {
  if (prev == null || prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

const trendColor = (pct, isError) => {
  if (pct === null) return ''
  if (isError) return pct > 0 ? 'text-red-400' : 'text-emerald-400'
  return pct > 0 ? 'text-blue-400' : 'text-amber-400'
}

const TrendBadge = ({ curr, prev, isError }) => {
  const pct = calcChange(curr, prev)
  if (pct === null) return null
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  const label = pct === 0 ? 'no change' : `${arrow} ${Math.abs(pct)}%`
  return (
    <span className={clsx('text-xs font-mono mt-0.5', trendColor(pct, isError))}>
      {label}
    </span>
  )
}

const PREV_LABEL = {
  '15m': 'vs prev 15 min',
  '1h':  'vs prev hour',
  '6h':  'vs prev 6 hours',
  '24h': 'vs yesterday',
  '7d':  'vs last 7 days'
}

const Tile = ({ isDark, label, value, accent, trend }) => (
  <div className={clsx(
    'flex flex-col gap-1 px-5 py-4 rounded-md border-l-[3px]',
    isDark ? 'bg-surface-card shadow-[0_4px_24px_rgba(0,0,0,0.4)]' : 'bg-white shadow-md',
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

export default function MetricsStrip({ isDark, data, loading, timeRange = '15m' }) {
  const fmt    = (n)   => n != null ? n.toLocaleString() : null
  const fmtPct = (n)   => n != null ? `${n}%` : null

  const curr      = data?.current
  const prev      = data?.previous
  const prevLabel = PREV_LABEL[timeRange] || 'vs prev period'

  const tiles = [
    {
      label:  'Total Logs',
      value:  loading ? '…' : fmt(curr?.totalLogs),
      accent: 'border-accent',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.totalLogs}       prev={prev?.totalLogs}       isError={false} />,
    },
    {
      label:  'Error Count',
      value:  loading ? '…' : fmt(curr?.errorCount),
      accent: 'border-red-500',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.errorCount}      prev={prev?.errorCount}      isError={true}  />,
    },
    {
      label:  'Error Rate',
      value:  loading ? '…' : fmtPct(curr?.errorRate),
      accent: 'border-orange-500',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.errorRate}       prev={prev?.errorRate}       isError={true}  />,
    },
    {
      label:  'Critical',
      value:  loading ? '…' : fmt(curr?.criticalCount),
      accent: 'border-rose-600',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.criticalCount}   prev={prev?.criticalCount}   isError={true}  />,
    },
    {
      label:  'Unique Hosts',
      value:  loading ? '…' : fmt(curr?.uniqueHosts),
      accent: 'border-emerald-500',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.uniqueHosts}     prev={prev?.uniqueHosts}     isError={false} />,
    },
    {
      label:  'Login Failures',
      value:  loading ? '…' : fmt(curr?.loginFailures),
      accent: 'border-amber-500',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.loginFailures}   prev={prev?.loginFailures}   isError={true}  />,
    },
    {
      label:  'PowerShell Events',
      value:  loading ? '…' : fmt(curr?.powershellCount),
      accent: 'border-purple-500',
      trend:  loading || !prev ? null : <TrendBadge curr={curr?.powershellCount} prev={prev?.powershellCount} isError={false} />,
    },
    {
      label:  'Top Event ID',
      value:  loading ? '…' : (curr?.topEventId ?? '—'),
      accent: 'border-surface-border',
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
      {/* 4 cols on md, 8 cols on xl — wraps to 2 rows on smaller screens */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 xl:gap-4">
        {tiles.map(t => (
          <Tile key={t.label} isDark={isDark} label={t.label} value={t.value} accent={t.accent} trend={t.trend} />
        ))}
      </div>
    </div>
  )
}