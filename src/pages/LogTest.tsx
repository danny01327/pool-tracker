import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../lib/AppDataContext'

function toLocalDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toLocalTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function numOrUndef(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

function numToStr(n: number | undefined): string {
  return n !== undefined ? String(n) : ''
}

export default function LogTest() {
  const { activePool, data, addTest, updateTest } = useAppData()
  const navigate = useNavigate()
  const { testId } = useParams()

  const existing = testId ? data.tests.find((t) => t.id === testId) : undefined
  const isEditing = !!testId
  const initialDate = existing ? new Date(existing.timestamp) : new Date()

  const [date, setDate] = useState(toLocalDateInput(initialDate))
  const [time, setTime] = useState(toLocalTimeInput(initialDate))
  const [fc, setFc] = useState(numToStr(existing?.fc))
  const [cc, setCc] = useState(numToStr(existing?.cc))
  const [ph, setPh] = useState(numToStr(existing?.ph))
  const [ta, setTa] = useState(numToStr(existing?.ta))
  const [ch, setCh] = useState(numToStr(existing?.ch))
  const [cya, setCya] = useState(numToStr(existing?.cya))
  const [salt, setSalt] = useState(numToStr(existing?.salt))
  const [tds, setTds] = useState(numToStr(existing?.tds))
  const [waterTempF, setWaterTempF] = useState(numToStr(existing?.waterTempF))
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)

  if (!activePool) return null

  if (isEditing && !existing) {
    return <p className="text-gray-500">That test entry couldn't be found.</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activePool) return
    setSaving(true)
    const values = {
      poolId: activePool.id,
      timestamp: new Date(`${date}T${time}`).toISOString(),
      fc: numOrUndef(fc),
      cc: numOrUndef(cc),
      ph: numOrUndef(ph),
      ta: numOrUndef(ta),
      ch: numOrUndef(ch),
      cya: numOrUndef(cya),
      salt: numOrUndef(salt),
      tds: numOrUndef(tds),
      waterTempF: numOrUndef(waterTempF),
      notes: notes.trim() || undefined,
    }
    try {
      if (isEditing && existing) {
        await updateTest(existing.id, values)
        navigate('/history')
      } else {
        await addTest(values)
        navigate('/')
      }
    } catch (err: any) {
      alert(`Failed to save test: ${err.message ?? err}`)
      setSaving(false)
    }
  }

  const field = (id: string, label: string, value: string, setValue: (v: string) => void, unit: string, step = '0.1') => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label} {unit && <span className="text-gray-400 font-normal">({unit})</span>}
      </label>
      <input
        id={id}
        type="number"
        step={step}
        inputMode="decimal"
        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">{isEditing ? 'Edit test' : 'Log a test'}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="field-date" className="block text-sm font-medium mb-1">
            Date
          </label>
          <input
            id="field-date"
            type="date"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="field-time" className="block text-sm font-medium mb-1">
            Time
          </label>
          <input
            id="field-time"
            type="time"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('field-fc', 'Free Chlorine (FC)', fc, setFc, 'ppm')}
        {field('field-cc', 'Combined Chlorine (CC)', cc, setCc, 'ppm')}
        {field('field-ph', 'pH', ph, setPh, '')}
        {field('field-ta', 'Total Alkalinity (TA)', ta, setTa, 'ppm', '1')}
        {field('field-ch', 'Calcium Hardness (CH)', ch, setCh, 'ppm', '1')}
        {field('field-cya', 'Cyanuric Acid (CYA)', cya, setCya, 'ppm', '1')}
        {activePool.sanitizerType === 'salt' && field('field-salt', 'Salt', salt, setSalt, 'ppm', '1')}
        {field('field-temp', 'Water Temp', waterTempF, setWaterTempF, '°F', '1')}
        {field('field-tds', 'TDS (optional, for CSI)', tds, setTds, 'ppm', '1')}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Chemicals added, weather, bather load, anything unusual..."
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700 disabled:opacity-60"
      >
        {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save test'}
      </button>
    </form>
  )
}
