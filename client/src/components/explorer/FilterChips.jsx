import clsx           from 'clsx'
import CloseIcon      from '@mui/icons-material/Close'
import FilterListIcon from '@mui/icons-material/FilterList'

const Chip = ({ isDark, label, value, onRemove }) => (
  <div className={clsx(
    'flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-mono',
    isDark ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-blue-50 border-blue-200 text-blue-600'
  )}>
    <span className={clsx('opacity-60', isDark ? 'text-ink-muted' : 'text-blue-400')}>{label}</span>
    <span>{value}</span>
    <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
      <CloseIcon sx={{ fontSize: 11 }} />
    </button>
  </div>
)

export default function FilterChips({ isDark, drillFilters, onRemove, onClearAll }) {
  if (!Object.keys(drillFilters).length) return null

  return (
    <div className={clsx(
      'flex items-center gap-2 px-4 py-2.5 mb-2 rounded-sm border',
      isDark ? 'bg-surface-card border-surface-border' : 'bg-white border-gray-200'
    )}>
      <FilterListIcon sx={{ fontSize: 14 }} className={clsx(isDark ? 'text-ink-muted' : 'text-gray-400')} />
      <span className={clsx('text-xs font-mono mr-1', isDark ? 'text-ink-muted' : 'text-gray-400')}>
        Filters
      </span>
      {Object.entries(drillFilters).map(([k, v]) => (
        <Chip key={k} isDark={isDark} label={k} value={v} onRemove={() => onRemove(k)} />
      ))}
      <button
        onClick={onClearAll}
        className={clsx('ml-auto text-xs font-mono transition-colors', isDark ? 'text-ink-muted hover:text-red-400' : 'text-gray-400 hover:text-red-400')}
      >
        Clear all
      </button>
    </div>
  )
}