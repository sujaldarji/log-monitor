import clsx         from 'clsx'
import SearchIcon   from '@mui/icons-material/Search'
import CloseIcon    from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import { TIME_RANGES, exportCSV } from '../../lib/explorerHelpers'

export default function SearchBar({
  isDark,
  searchInput,
  setSearchInput,
  timeRange,
  loading,
  logs,
  onSearch,
  onClear,
  onRangeChange,
}) {
  const handleKeyDown = (e) => { if (e.key === 'Enter') onSearch() }

  return (
    <div className={clsx(
      'flex items-center gap-3 p-4 rounded-sm mb-2 border',
      isDark ? 'bg-surface-card border-surface-border' : 'bg-white border-gray-200 shadow-sm'
    )}>

      {/* Search input */}
      <div className="relative flex-1">
        <span className={clsx('absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-ink-muted' : 'text-gray-400')}>
          <SearchIcon sx={{ fontSize: 16 }} />
        </span>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search… e.g. login or event_id:4624 or hostname:server01"
          className={clsx(
            'w-full pl-9 pr-9 py-2.5 rounded-sm text-sm font-mono border outline-none transition-all',
            isDark
              ? 'bg-surface border-surface-border text-ink-primary placeholder-ink-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20'
              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-accent/50'
          )}
        />
        {searchInput && (
          <button
            onClick={onClear}
            className={clsx('absolute right-3 top-1/2 -translate-y-1/2 transition-colors', isDark ? 'text-ink-muted hover:text-ink-secondary' : 'text-gray-400 hover:text-gray-600')}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </button>
        )}
      </div>

      {/* Time range */}
      <select
        value={timeRange}
        onChange={e => onRangeChange(e.target.value)}
        className={clsx(
          'text-sm font-mono px-3 py-2.5 rounded-sm border outline-none cursor-pointer transition-all',
          isDark ? 'bg-surface border-surface-border text-ink-secondary hover:border-accent/50' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-accent/50'
        )}
      >
        {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>

      {/* Search button */}
      <button
        onClick={onSearch}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm text-sm font-mono bg-accent hover:bg-accent-dim text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <DownloadIcon sx={{ fontSize: 15 }} /> Export
        </button>
      )}
    </div>
  )
}