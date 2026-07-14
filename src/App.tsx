import { Route, Routes } from 'react-router-dom'
import { useAppData } from './lib/AppDataContext'
import Layout from './components/Layout'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import LogTest from './pages/LogTest'
import History from './pages/History'
import DosingCalculator from './pages/DosingCalculator'
import Slam from './pages/Slam'
import Settings from './pages/Settings'

function App() {
  const { activePool } = useAppData()

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
