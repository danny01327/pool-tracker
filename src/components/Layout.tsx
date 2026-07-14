import { NavLink, Outlet } from 'react-router-dom'
import { useAppData } from '../lib/AppDataContext'

const tabs = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/log', label: 'Log Test' },
  { to: '/history', label: 'History' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/slam', label: 'SLAM' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout() {
  const { data, activePool, setActivePoolId } = useAppData()

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span>🏊</span>
          <span>Pool Tracker</span>
        </div>
        {data.pools.length > 1 && (
          <select
            className="rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-sm"
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
      </header>
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
