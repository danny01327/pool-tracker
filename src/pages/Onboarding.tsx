import { useAppData } from '../lib/AppDataContext'
import PoolForm from '../components/PoolForm'

export default function Onboarding() {
  const { addPool } = useAppData()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">🏊 Pool Tracker</h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Let's set up your pool so recommendations are tailored to it.
        </p>
        <PoolForm onSubmit={(values) => addPool(values)} submitLabel="Create pool" />
      </div>
    </div>
  )
}
