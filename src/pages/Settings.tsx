import { useRef, useState } from 'react'
import { useAppData } from '../lib/AppDataContext'
import { useAuth } from '../lib/AuthContext'
import PoolForm from '../components/PoolForm'
import { exportDataAsJson, importDataFromJson, testsForPool } from '../lib/storage'
import { exportTestsAsCsv, exportTestsAsPdf } from '../lib/reportExport'

export default function Settings() {
  const { data, activePool, updatePool, addPool, deletePool, setActivePoolId, importBackup } = useAppData()
  const { user, signOut } = useAuth()
  const [addingPool, setAddingPool] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportDataAsJson(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pool-boy-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = importDataFromJson(String(reader.result))
        if (confirm('This will add the pools and test history from this backup to your account. Continue?')) {
          importBackup(imported).catch((err) => alert(`Import failed: ${err.message ?? err}`))
        }
      } catch {
        alert('Could not read that file — is it a valid Pool Boy backup?')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleCsvExport() {
    if (!activePool) return
    exportTestsAsCsv(activePool, testsForPool(data, activePool.id))
  }

  async function handlePdfExport() {
    if (!activePool) return
    setExportingPdf(true)
    try {
      await exportTestsAsPdf(activePool, testsForPool(data, activePool.id))
    } catch (err: any) {
      alert(`PDF export failed: ${err.message ?? err}`)
    } finally {
      setExportingPdf(false)
    }
  }

  if (!activePool) return null

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h1 className="text-xl font-semibold mb-3">Pool profile</h1>
        <PoolForm
          key={activePool.id}
          initial={activePool}
          onSubmit={(values) => updatePool(activePool.id, values).catch((err) => alert(`Save failed: ${err.message ?? err}`))}
          submitLabel="Save changes"
        />
      </div>

      {data.pools.length > 1 && (
        <div>
          <h2 className="font-medium mb-2">Your pools</h2>
          <ul className="space-y-2">
            {data.pools.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-800 p-2">
                <span>{p.name}{p.id === activePool.id ? ' (active)' : ''}</span>
                <div className="flex gap-3 text-sm">
                  {p.id !== activePool.id && (
                    <button onClick={() => setActivePoolId(p.id)} className="underline text-sky-700 dark:text-sky-400">
                      Switch to
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.name}" and all its test history? This cannot be undone.`)) {
                        deletePool(p.id).catch((err) => alert(`Delete failed: ${err.message ?? err}`))
                      }
                    }}
                    className="underline text-rose-600 dark:text-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {addingPool ? (
          <div>
            <h2 className="font-medium mb-2">Add a pool</h2>
            <PoolForm
              onSubmit={(values) => {
                addPool(values)
                  .then(() => setAddingPool(false))
                  .catch((err) => alert(`Save failed: ${err.message ?? err}`))
              }}
              onCancel={() => setAddingPool(false)}
              submitLabel="Add pool"
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingPool(true)}
            className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2"
          >
            + Add another pool
          </button>
        )}
      </div>

      <div>
        <h2 className="font-medium mb-2">Backup &amp; restore</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2">
            Export data (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2"
          >
            Import data
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your test history is stored in your account and synced across any device you sign in on. Export a backup
          occasionally as an extra safety net.
        </p>
      </div>

      <div>
        <h2 className="font-medium mb-2">Reports</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCsvExport} className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2">
            Export CSV
          </button>
          <button
            onClick={handlePdfExport}
            disabled={exportingPdf}
            className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 disabled:opacity-60"
          >
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          A spreadsheet-friendly CSV or a printable PDF report of {activePool.name}'s test history — handy for a pool
          service tech, a home sale, or your own records.
        </p>
      </div>

      <div>
        <h2 className="font-medium mb-2">Account</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Signed in as {user?.email}</p>
        <button onClick={() => signOut()} className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2">
          Sign out
        </button>
      </div>
    </div>
  )
}
