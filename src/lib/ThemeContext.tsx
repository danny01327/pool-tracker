import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'pool-tracker:theme'

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return getSystemPrefersDark() ? 'dark' : 'light'
  return preference
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

interface ThemeApi {
  theme: ThemePreference
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: ThemePreference) => void
  cycleTheme: () => void
}

const ThemeCtx = createContext<ThemeApi | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolve(theme))

  useEffect(() => {
    const resolved = resolve(theme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = resolve('system')
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  function setTheme(t: ThemePreference) {
    setThemeState(t)
  }

  function cycleTheme() {
    // A straight light<->dark flip based on what's currently showing, rather
    // than cycling through system/light/dark. When the OS is already in
    // light mode, system and light look identical, so a 3-way cycle made it
    // seem like the button did nothing on the first click.
    setThemeState(resolve(theme) === 'dark' ? 'light' : 'dark')
  }

  return <ThemeCtx.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
