import { useRef, useState } from 'react'
import { useAppData } from '../lib/AppDataContext'
import PoolForm from '../components/PoolForm'
import { exportDataAsJson, importDataFromJson } from '../lib/storage'

export default function Settings() {
  const { data, activePool, updatePool, addPool, deletePool, setActivePoolId, replaceAll } = useAppData()
  const [addingPool, setAddingPool] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportDataAsJson(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pool-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
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
        if (confirm('This will replace all current data with the imported backup. Continue?')) {
          replaceAll(imported)
        }
      } catch {
        alert('Could not read that file — is it a valid Pool Tracker backup?')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (!activePool) return null

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h1 className="text-xl font-semibold mb-3">Pool profile</h1>
        <PoolForm
          key={activePool.id}
          initial={activePool}
          onSubmit={(values) => updatePool(activePool.id, values)}
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
                      if (confirm(`Delete "${p.name}" and all its test history? This cannot be undone.`)) deletePool(p.id)
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
                setAddingPool(false)
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
        <div className="flex gap-2">
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
          All data is stored only in this browser. Export a backup periodically, especially before clearing browser
          data or switching devices.
        </p>
      </div>
    </div>
  )
}
