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
    }),
    {
      name: 'lm-ui-prefs', // localStorage key
    }
  )
)