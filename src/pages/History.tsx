import { useState } from 'react'
import { useAppData } from '../lib/AppDataContext'
import { testsForPool } from '../lib/storage'
import TrendChart from '../components/TrendChart'

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

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">FC</th>
              <th className="py-2 pr-3">CC</th>
              <th className="py-2 pr-3">pH</th>
              <th className="py-2 pr-3">TA</th>
              <th className="py-2 pr-3">CH</th>
              <th className="py-2 pr-3">CYA</th>
              {activePool.sanitizerType === 'salt' && <th className="py-2 pr-3">Salt</th>}
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 dark:border-gray-900">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(t.timestamp).toLocaleString()}</td>
                <td className="py-2 pr-3">{t.fc ?? '—'}</td>
                <td className="py-2 pr-3">{t.cc ?? '—'}</td>
                <td className="py-2 pr-3">{t.ph ?? '—'}</td>
                <td className="py-2 pr-3">{t.ta ?? '—'}</td>
                <td className="py-2 pr-3">{t.ch ?? '—'}</td>
                <td className="py-2 pr-3">{t.cya ?? '—'}</td>
                {activePool.sanitizerType === 'salt' && <td className="py-2 pr-3">{t.salt ?? '—'}</td>}
                <td className="py-2 pr-3">
                  <button
                    onClick={() => {
                      if (confirm('Delete this test result?')) {
                        deleteTest(t.id).catch((err) => alert(`Delete failed: ${err.message ?? err}`))
                      }
                    }}
                    className="text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
