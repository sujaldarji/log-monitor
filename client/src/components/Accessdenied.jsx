import { useNavigate } from 'react-router-dom'
import clsx            from 'clsx'
import BlockIcon       from '@mui/icons-material/Block'
import ArrowBackIcon   from '@mui/icons-material/ArrowBack'
import { useUIStore }  from '../store/uistore'

/**
 * 403 Access Denied page.
 * Shown when a user's role doesn't match the required role for a route.
 * Props:
 *   requiredRole — string, displayed to user so they know what's needed
 */
export default function AccessDenied({ requiredRole }) {
  const navigate   = useNavigate()
  const { isDark } = useUIStore()

  return (
    <div className={clsx(
      'min-h-screen flex items-center justify-center',
      isDark ? 'bg-surface' : 'bg-gray-100'
    )}>
      <div className="text-center flex flex-col items-center gap-4">

        {/* Icon */}
        <div className="w-16 h-16 rounded-sm border border-red-500/30 bg-red-500/10
                        flex items-center justify-center">
          <BlockIcon sx={{ fontSize: 32 }} className="text-red-400" />
        </div>

        {/* Message */}
        <div>
          <h1 className={clsx(
            'text-2xl font-semibold tracking-tight mb-1',
            isDark ? 'text-ink-primary' : 'text-gray-800'
          )}>
            Access Denied
          </h1>
          <p className={clsx(
            'text-sm font-mono',
            isDark ? 'text-ink-secondary' : 'text-gray-500'
          )}>
            You don't have permission to view this page.
          </p>
          {requiredRole && (
            <p className={clsx(
              'text-xs font-mono mt-1',
              isDark ? 'text-ink-muted' : 'text-gray-400'
            )}>
              Required role: <span className="text-red-400">{requiredRole}</span>
            </p>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className={clsx(
            'flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-sm border transition-all mt-2',
            isDark
              ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
              : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
          )}
        >
          <ArrowBackIcon sx={{ fontSize: 13 }} />
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}