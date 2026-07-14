import { useAppData } from '../lib/AppDataContext'
import PoolForm from '../components/PoolForm'
import AppLogo from '../components/AppLogo'

export default function Onboarding() {
  const { addPool } = useAppData()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="max-w-md w-full space-y-4">
        <AppLogo iconSize={40} textClassName="text-2xl" className="justify-center" />
        <p className="text-center text-gray-600 dark:text-gray-400">
          Let's set up your pool so recommendations are tailored to it.
        </p>
        <PoolForm
          onSubmit={(values) => addPool(values).catch((err) => alert(`Failed to create pool: ${err.message ?? err}`))}
          submitLabel="Create pool"
        />
      </div>
    </div>
  )
}
