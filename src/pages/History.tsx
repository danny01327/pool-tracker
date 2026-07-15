import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../lib/AppDataContext'
import { testsForPool } from '../lib/storage'
import TrendChart from '../components/TrendChart'

const FIELDS: Array<{ key: 'fc' | 'cc' | 'ph' | 'ta' | 'ch' | 'cya' | 'salt' | 'tds' | 'waterTempF'; label: string }> = [
  { key: 'fc', label: 'FC' },
  { key: 'cc', label: 'CC' },
  { key: 'ph', label: 'pH' },
  { key: 'ta', label: 'TA' },
  { key: 'ch', label: 'CH' },
  { key: 'cya', label: 'CYA' },
  { key: 'salt', label: 'Salt' },
  { key: 'tds', label: 'TDS' },
  { key: 'waterTempF', label: 'Temp' },
]

export default function History() {
  const { data, activePool, deleteTest } = useAppData()
  const [showCharts, setShowCharts] = useState(true)

  if (!activePool) return null

  const tests = testsForPool(data, activePool.id)
  const chronological = [...tests].reverse()

  if (tests.length === 0) {
    return <p className="text-gray-500">No test results logged yet.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">History</h1>
        <button
          onClick={() => setShowCharts((s) => !s)}
          className="text-sm underline text-sky-700 dark:text-sky-400"
        >
          {showCharts ? 'Hide charts' : 'Show charts'}
        </button>
      </div>

      {showCharts && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TrendChart tests={chronological} dataKey="fc" label="Free Chlorine (ppm)" color="#0284c7" />
          <TrendChart tests={chronological} dataKey="ph" label="pH" color="#059669" />
          <TrendChart tests={chronological} dataKey="cya" label="CYA (ppm)" color="#d97706" />
          <TrendChart tests={chronological} dataKey="ta" label="TA (ppm)" color="#7c3aed" />
          <TrendChart tests={chronological} dataKey="ch" label="CH (ppm)" color="#db2777" />
          {activePool.sanitizerType === 'salt' && (
            <TrendChart tests={chronological} dataKey="salt" label="Salt (ppm)" color="#0891b2" />
          )}
        </div>
      )}

      <div className="space-y-3">
        {tests.map((t) => {
          const present = FIELDS.filter((f) => t[f.key] !== undefined)
          return (
            <div key={t.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{new Date(t.timestamp).toLocaleString()}</span>
                <div className="flex gap-3 text-sm shrink-0">
                  <Link to={`/log/${t.id}`} className="underline text-sky-700 dark:text-sky-400">
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Delete this test result?')) {
                        deleteTest(t.id).catch((err) => alert(`Delete failed: ${err.message ?? err}`))
                      }
                    }}
                    className="underline text-rose-600 dark:text-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {present.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2 text-gray-700 dark:text-gray-300">
                  {present.map((f) => (
                    <span key={f.key}>
                      <span className="text-gray-400">{f.label}:</span> {t[f.key]}
                    </span>
                  ))}
                </div>
              )}
              {t.notes && <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">{t.notes}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
