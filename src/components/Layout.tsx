import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppData } from '../lib/AppDataContext'
import { useTheme } from '../lib/ThemeContext'
import AppLogo from './AppLogo'

const tabs = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/log', label: 'Log Test' },
  { to: '/history', label: 'History' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/slam', label: 'SLAM' },
  { to: '/settings', label: 'Settings' },
]

const THEME_ICON = { light: '☀️', dark: '🌙' }
const THEME_LABEL = { light: 'Switch to dark mode', dark: 'Switch to light mode' }

export default function Layout() {
  const { data, activePool, setActivePoolId, pendingSyncCount, retrySync } = useAppData()
  const { resolvedTheme, cycleTheme } = useTheme()
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
        <AppLogo className="shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          {data.pools.length > 1 && (
            <select
              className="min-w-0 max-w-[9rem] rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-sm"
              value={activePool?.id ?? ''}
              onChange={(e) => setActivePoolId(e.target.value)}
            >
              {data.pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={cycleTheme}
            title={THEME_LABEL[resolvedTheme]}
            aria-label={THEME_LABEL[resolvedTheme]}
            className="shrink-0 rounded border border-gray-300 dark:border-gray-600 w-9 h-9 flex items-center justify-center text-base"
          >
            {THEME_ICON[resolvedTheme]}
          </button>
        </div>
      </header>

      {(!online || pendingSyncCount > 0) && (
        <div className="px-4 py-1.5 text-xs flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900">
          <span>
            {!online
              ? pendingSyncCount > 0
                ? `Offline — ${pendingSyncCount} change${pendingSyncCount > 1 ? 's' : ''} will sync when you're back online.`
                : "Offline — changes will be saved and synced when you're back online."
              : `${pendingSyncCount} change${pendingSyncCount > 1 ? 's' : ''} waiting to sync…`}
          </span>
          {online && pendingSyncCount > 0 && (
            <button type="button" onClick={() => retrySync()} className="underline shrink-0">
              Retry now
            </button>
          )}
        </div>
      )}

      <nav className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 text-sm">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-4 max-w-3xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
