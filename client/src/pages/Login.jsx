import { useState }       from 'react'
import { useNavigate }    from 'react-router-dom'
import api             from '../lib/axios'
import Snowfall           from 'react-snowfall'
import clsx               from 'clsx'

import PersonOutlineIcon  from '@mui/icons-material/PersonOutline'
import LockOutlinedIcon   from '@mui/icons-material/LockOutlined'
import VisibilityIcon     from '@mui/icons-material/Visibility'
import VisibilityOffIcon  from '@mui/icons-material/VisibilityOff'
import WarningAmberIcon   from '@mui/icons-material/WarningAmber'
import EastIcon           from '@mui/icons-material/East'

import SettingsPanel      from '../components/SettingsPanel'
import { useUIStore }     from '../store/uistore'

export default function Login() {
  const navigate = useNavigate()

  // ── Form state ──────────────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // ── Global UI preferences ───────────────────────────────────────────────
  const { isDark, snowfall, setRole } = useUIStore()

  // ── Login handler ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })

      // Token is now stored in an httpOnly cookie (not accessible to JS).
      // Only store the display name for the UI.
      localStorage.setItem('lm_username', data.username)
      setRole(data.role)   // store role in Zustand for UI decisions

      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection error. Check the server.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={clsx(
      'relative min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-300',
      isDark ? 'bg-surface' : 'bg-gray-100'
    )}>

      {/* ── Snowfall ──────────────────────────────────────────────────────── */}
      {snowfall && (
        <Snowfall
          snowflakeCount={120}
          color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.4)'}
          style={{ zIndex: 0 }}
        />
      )}

      {/* ── Dot grid (dark only) ──────────────────────────────────────────── */}
      {isDark && <div className="absolute inset-0 dot-grid opacity-50" />}

      {/* ── Scanline sweep (dark only) ────────────────────────────────────── */}
      {isDark && (
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-scanline pointer-events-none" />
      )}

      {/* ── Corner accents (dark only) ────────────────────────────────────── */}
      {isDark && (
        <>
          <div className="absolute top-0 left-0 w-24 h-24 border-l-2 border-t-2 border-accent/20" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-r-2 border-b-2 border-accent/20" />
        </>
      )}

      {/* ── System status (top-right) ─────────────────────────────────────── */}
      <div className="absolute top-4 right-6 flex items-center gap-2 animate-fade-up">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-blink" />
        <span className={clsx(
          'text-xs font-mono tracking-widest uppercase',
          isDark ? 'text-ink-secondary' : 'text-gray-400'
        )}>
          System Online
        </span>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Heading */}
        <div className="mb-8 animate-fade-up">
          <h1 className={clsx(
            'text-3xl font-semibold leading-tight tracking-tight',
            isDark ? 'text-ink-primary' : 'text-gray-800'
          )}>
            Centralized Log<br />
            <span className="text-accent">Monitoring</span> Platform
          </h1>
          <p className={clsx(
            'mt-2 text-base',
            isDark ? 'text-ink-secondary' : 'text-gray-500'
          )}>
            Authenticate to access the observability console.
          </p>
        </div>

        {/* Form card */}
        <div className={clsx(
          'rounded-sm p-7 animate-fade-up-2',
          isDark ? 'bg-surface-card card-glow' : 'bg-white shadow-lg border border-gray-200'
        )}>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm
                            border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
              <WarningAmberIcon sx={{ fontSize: 16 }} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Username */}
            <div className="animate-fade-up-3">
              <label className={clsx(
                'block text-sm font-mono tracking-widest uppercase mb-2',
                isDark ? 'text-ink-secondary' : 'text-gray-500'
              )}>
                Username
              </label>
              <div className="relative">
                <span className={clsx(
                  'absolute left-3 top-1/2 -translate-y-1/2',
                  isDark ? 'text-ink-muted' : 'text-gray-400'
                )}>
                  <PersonOutlineIcon sx={{ fontSize: 16 }} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className={clsx(
                    'input-focus w-full pl-9 pr-3.5 py-2.5 rounded-sm text-sm font-mono',
                    !isDark && 'border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-up-3">
              <label className={clsx(
                'block text-sm font-mono tracking-widest uppercase mb-2',
                isDark ? 'text-ink-secondary' : 'text-gray-500'
              )}>
                Password
              </label>
              <div className="relative">
                <span className={clsx(
                  'absolute left-3 top-1/2 -translate-y-1/2',
                  isDark ? 'text-ink-muted' : 'text-gray-400'
                )}>
                  <LockOutlinedIcon sx={{ fontSize: 16 }} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={clsx(
                    'input-focus w-full pl-9 pr-10 py-2.5 rounded-sm text-sm font-mono',
                    !isDark && 'border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className={clsx(
                    'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                    isDark ? 'text-ink-muted hover:text-ink-secondary' : 'text-gray-400 hover:text-gray-600'
                  )}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass
                    ? <VisibilityOffIcon sx={{ fontSize: 16 }} />
                    : <VisibilityIcon    sx={{ fontSize: 16 }} />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="animate-fade-up-4 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-sm text-sm font-mono font-medium tracking-wide
                           bg-accent hover:bg-accent-dim active:scale-[0.99]
                           text-white transition-all duration-150
                           disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <EastIcon sx={{ fontSize: 14 }} />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className={clsx(
          'mt-4 flex justify-between text-sm font-mono animate-fade-up-4',
          isDark ? 'text-ink-muted' : 'text-gray-400'
        )}>
          <span>Internal use only</span>
          <span>JWT · 8h session</span>
        </div>
      </div>

      {/* ── Floating settings (every page) ────────────────────────────────── */}
      <SettingsPanel />

    </div>
  )
}