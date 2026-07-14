import { Link } from 'react-router-dom'
import { useAppData } from '../lib/AppDataContext'
import { testsForPool, activeSessionForPool } from '../lib/storage'
import { assessAll, calculateCsi } from '../lib/chemistry'
import ParamCard from '../components/ParamCard'

const CSI_LABEL: Record<string, string> = {
  corrosive: 'Corrosive — water will etch plaster / corrode metal',
  balanced: 'Balanced',
  scaling: 'Scale-forming — expect calcium buildup, especially on heaters',
}

const CSI_STYLE: Record<string, string> = {
  corrosive: 'text-amber-600 dark:text-amber-400',
  balanced: 'text-emerald-600 dark:text-emerald-400',
  scaling: 'text-rose-600 dark:text-rose-400',
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export default function Dashboard() {
  const { data, activePool } = useAppData()
  if (!activePool) return null

  const tests = testsForPool(data, activePool.id)
  const latest = tests[0]
  const activeSlam = activeSessionForPool(data, activePool.id)

  if (!latest) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-lg font-medium">No test results logged yet for {activePool.name}.</p>
        <Link to="/log" className="inline-block rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">
          Log your first test
        </Link>
      </div>
    )
  }

  const assessments = assessAll(latest, activePool)
  const csi = calculateCsi(latest, activePool, latest.waterTempF ?? 80)
  const problems = assessments.filter((a) => a.status !== 'ok')
  const age = daysAgo(latest.timestamp)

  return (
    <div className="space-y-6">
      {activeSlam && (
        <div className="rounded-lg border border-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 flex items-center justify-between gap-2">
          <span className="font-medium text-rose-700 dark:text-rose-300">SLAM in progress</span>
          <Link to="/slam" className="text-sm underline">
            Go to SLAM tracker
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">Latest reading</h1>
          <span className="text-sm text-gray-500">
            {age === 0 ? 'today' : age === 1 ? '1 day ago' : `${age} days ago`}
          </span>
        </div>
        {assessments.length === 0 ? (
          <p className="text-gray-500 mt-1">This test entry has no readings recorded yet.</p>
        ) : problems.length === 0 ? (
          <p className="text-emerald-600 dark:text-emerald-400 mt-1">Everything is within target range. 🎉</p>
        ) : (
          <p className="text-amber-600 dark:text-amber-400 mt-1">
            {problems.length} parameter{problems.length > 1 ? 's' : ''} need attention.
          </p>
        )}
      </div>

      {assessments.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {assessments.map((a) => (
            <ParamCard key={a.key} assessment={a} />
          ))}
        </div>
      )}

      {csi && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
          <div className="flex items-baseline justify-between">
            <span className="font-medium">CSI (Calcite Saturation Index)</span>
            <span className={`font-bold ${CSI_STYLE[csi.status]}`}>{csi.csi}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{CSI_LABEL[csi.status]}</p>
          <p className="text-xs text-gray-500 mt-1">
            Target -0.3 to +0.3. Uses TDS {csi.tdsPpm} ppm ({latest.tds !== undefined ? 'measured' : 'estimated'}) —
            enter a measured TDS on the test form for a more precise number.
          </p>
        </div>
      )}

      <Link to="/log" className="inline-block rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">
        Log a new test
      </Link>
    </div>
  )
}
