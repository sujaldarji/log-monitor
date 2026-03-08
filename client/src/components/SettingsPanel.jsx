import { useState, useRef, useEffect } from 'react'
import SettingsIcon   from '@mui/icons-material/Settings'
import LightModeIcon  from '@mui/icons-material/LightMode'
import DarkModeIcon   from '@mui/icons-material/DarkMode'
import AcUnitIcon     from '@mui/icons-material/AcUnit'          // snowflake
import CloseIcon      from '@mui/icons-material/Close'
import { useUIStore } from '../store/uistore'
import clsx           from 'clsx'

/**
 * SettingsPanel — floating gear button (bottom-right corner).
 * Drop this into any page — it reads/writes global Zustand state.
 *
 * Usage:
 *   import SettingsPanel from '../components/SettingsPanel'
 *   <SettingsPanel />
 */
export default function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const panelRef        = useRef(null)

  const { isDark, toggleTheme, snowfall, toggleSnowfall } = useUIStore()

  // ── Close panel when clicking outside ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return ()  => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >

      {/* ── Settings popover ────────────────────────────────────────────── */}
      {open && (
        <div className={clsx(
          'w-52 rounded-sm border p-4 shadow-2xl',
          'animate-fade-up',
          isDark
            ? 'bg-surface-card border-surface-border text-ink-primary'
            : 'bg-white border-gray-200 text-gray-800'
        )}>

          {/* Popover header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono tracking-widest uppercase opacity-60">
              Preferences
            </span>
            <button
              onClick={() => setOpen(false)}
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </button>
          </div>

          {/* ── Toggle row: Dark / Light theme ────────────────────────── */}
          <ToggleRow
            isDark={isDark}
            icon={isDark ? <DarkModeIcon sx={{ fontSize: 16 }} /> : <LightModeIcon sx={{ fontSize: 16 }} />}
            label={isDark ? 'Dark mode' : 'Light mode'}
            active={true}         // always "active" — shows current state
            onToggle={toggleTheme}
          />

          <Divider isDark={isDark} />

          {/* ── Toggle row: Snowfall ──────────────────────────────────── */}
          <ToggleRow
            isDark={isDark}
            icon={<AcUnitIcon sx={{ fontSize: 16 }} />}
            label="Snowfall"
            active={snowfall}
            onToggle={toggleSnowfall}
          />
        </div>
      )}

      {/* ── Floating gear button ────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="Open settings"
        className={clsx(
          'w-10 h-10 rounded-sm flex items-center justify-center',
          'border transition-all duration-200 shadow-lg',
          open
            ? 'bg-accent border-accent text-white'
            : isDark
              ? 'bg-surface-card border-surface-border text-ink-secondary hover:border-accent hover:text-accent'
              : 'bg-white border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
        )}
      >
        <SettingsIcon
          sx={{ fontSize: 18 }}
          className={clsx(open && 'animate-spin-slow', 'transition-transform duration-500')}
        />
      </button>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

/**
 * A single toggle row inside the settings panel.
 */
function ToggleRow({ isDark, icon, label, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'w-full flex items-center justify-between py-2 px-1 rounded-sm',
        'text-sm transition-colors duration-150',
        isDark
          ? 'hover:bg-surface-hover'
          : 'hover:bg-gray-50'
      )}
    >
      <span className="flex items-center gap-2.5 opacity-80">
        {icon}
        <span className="font-mono text-xs">{label}</span>
      </span>

      {/* Pill toggle */}
      <span className={clsx(
        'w-8 h-4 rounded-full transition-colors duration-200 relative',
        active ? 'bg-accent' : isDark ? 'bg-surface-border' : 'bg-gray-300'
      )}>
        <span className={clsx(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 shadow-sm',
          active ? 'left-[18px]' : 'left-0.5'
        )} />
      </span>
    </button>
  )
}

function Divider({ isDark }) {
  return (
    <div className={clsx(
      'my-2 h-px',
      isDark ? 'bg-surface-border' : 'bg-gray-100'
    )} />
  )
}
