import { Route, Routes } from 'react-router-dom'
import { useAppData } from './lib/AppDataContext'
import { useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import LogTest from './pages/LogTest'
import History from './pages/History'
import DosingCalculator from './pages/DosingCalculator'
import Slam from './pages/Slam'
import Settings from './pages/Settings'

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {children}
    </div>
  )
}

function App() {
  const { user, loading: authLoading } = useAuth()
  const { activePool, loading: dataLoading } = useAppData()

  if (authLoading) return <FullScreenMessage>Loading…</FullScreenMessage>
  if (!user) return <Login />
  if (dataLoading) return <FullScreenMessage>Loading your pool…</FullScreenMessage>
  if (!activePool) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="log" element={<LogTest />} />
        <Route path="history" element={<History />} />
        <Route path="calculator" element={<DosingCalculator />} />
        <Route path="slam" element={<Slam />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
