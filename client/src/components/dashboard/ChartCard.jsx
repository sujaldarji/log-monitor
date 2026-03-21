import clsx             from 'clsx'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

export default function ChartCard({ isDark, title, children, loading, error }) {
  return (
    <div className={clsx(
      'rounded-md flex flex-col gap-3 overflow-hidden',
      isDark
        ? 'bg-surface-card shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
        : 'bg-white shadow-md'
    )}>
      {/* Left accent bar + title */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0 border-l-[3px] border-accent">
        <span className={clsx('text-sm font-mono font-medium', isDark ? 'text-ink-secondary' : 'text-gray-600')}>
          {title}
        </span>
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        )}
      </div>

      {/* Chart area */}
      <div className="px-2 pb-4">
        {error ? (
          <div className="flex items-center gap-2 text-red-400 text-sm font-mono py-10 justify-center">
            <ErrorOutlineIcon sx={{ fontSize: 16 }} />
            {error}
          </div>
        ) : children}
      </div>
    </div>
  )
}