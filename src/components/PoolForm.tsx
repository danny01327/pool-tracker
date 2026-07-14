import { useState } from 'react'
import type { PoolProfile, SanitizerType, SurfaceType } from '../types'

interface PoolFormProps {
  initial?: PoolProfile
  onSubmit: (values: Omit<PoolProfile, 'id' | 'createdAt'>) => void
  onCancel?: () => void
  submitLabel?: string
}

export default function PoolForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: PoolFormProps) {
  const [name, setName] = useState(initial?.name ?? 'My Pool')
  const [volumeGallons, setVolumeGallons] = useState(initial?.volumeGallons ?? 15000)
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(initial?.surfaceType ?? 'plaster')
  const [sanitizerType, setSanitizerType] = useState<SanitizerType>(initial?.sanitizerType ?? 'chlorine')
  const [hasBorates, setHasBorates] = useState(initial?.hasBorates ?? false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name, volumeGallons, surfaceType, sanitizerType, hasBorates })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Pool name</label>
        <input
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Volume (US gallons)</label>
        <input
          type="number"
          min={100}
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={volumeGallons}
          onChange={(e) => setVolumeGallons(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Surface type</label>
        <select
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={surfaceType}
          onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
        >
          <option value="plaster">Plaster / gunite / tile</option>
          <option value="vinyl">Vinyl liner</option>
          <option value="fiberglass">Fiberglass</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sanitizer</label>
        <select
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={sanitizerType}
          onChange={(e) => setSanitizerType(e.target.value as SanitizerType)}
        >
          <option value="chlorine">Chlorine (liquid/bleach/tabs)</option>
          <option value="salt">Salt water chlorine generator (SWG)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="hasBorates"
          type="checkbox"
          checked={hasBorates}
          onChange={(e) => setHasBorates(e.target.checked)}
        />
        <label htmlFor="hasBorates" className="text-sm">I maintain borates (30-50 ppm) in this pool</label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
