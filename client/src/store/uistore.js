import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global UI store — persisted to localStorage so preferences survive refresh.
 * Used by: SettingsPanel, Login, Dashboard, LogExplorer, LogDetail
 */
export const useUIStore = create(
  persist(
    (set) => ({
      // ── Theme ───────────────────────────────────────────────────────────
      isDark: true,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),

      // ── Snowfall ────────────────────────────────────────────────────────
      snowfall: false,
      toggleSnowfall: () => set((s) => ({ snowfall: !s.snowfall })),

       // ── Auth ──────────────────────────────────────────────────────────────
      // Role is set on login and cleared on logout.
      // Source of truth is the JWT cookie — this is just for UI decisions.
      role: null,
      setRole: (role) => set({ role }),
      clearRole: () => set({ role: null }),
    }),
    {
      name: 'lm-ui-prefs', // localStorage key
    }
  )
)