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

// Comparator block test kits (e.g. simple OTO/color-block chlorine and
// pH testers) only ever read one of a handful of fixed values — most stop
// at 5 ppm chlorine, beyond which the color block can't distinguish further.
const QUICK_FC_OPTIONS = ['0', '0.5', '1', '2', '3', '4', '5', '5+']
const QUICK_PH_OPTIONS = ['6.8', '7.2', '7.5', '7.8', '8.2']

/** "5+" isn't a real number — record it as 5 (the block's ceiling) rather than dropping it. */
function parseFc(v: string): number | undefined {
  if (v === '5+') return 5
  return numOrUndef(v)
}

export default function LogTest() {
  const { activePool, data, addTest, updateTest } = useAppData()
  const navigate = useNavigate()
  const { testId } = useParams()

  const existing = testId ? data.tests.find((t) => t.id === testId) : undefined
  const isEditing = !!testId
  const initialDate = existing ? new Date(existing.timestamp) : new Date()

  const [mode, setMode] = useState<'full' | 'quick'>('full')
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

  function switchMode(next: 'full' | 'quick') {
    // Keep the number input valid if "5+" was picked in quick mode.
    if (next === 'full' && fc === '5+') setFc('5')
    setMode(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activePool) return
    setSaving(true)
    const values = {
      poolId: activePool.id,
      timestamp: new Date(`${date}T${time}`).toISOString(),
      fc: parseFc(fc),
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
        className="w-full h-11 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 appearance-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )

  const selectField = (id: string, label: string, value: string, setValue: (v: string) => void, options: string[]) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <select
        id={id}
        className="w-full h-11 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">{isEditing ? 'Edit test' : 'Log a test'}</h1>

      {!isEditing && (
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => switchMode('full')}
            className={`px-3 py-1.5 rounded-md ${mode === 'full' ? 'bg-sky-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Full test
          </button>
          <button
            type="button"
            onClick={() => switchMode('quick')}
            className={`px-3 py-1.5 rounded-md ${mode === 'quick' ? 'bg-sky-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Quick test
          </button>
        </div>
      )}
      {!isEditing && mode === 'quick' && (
        <p className="text-xs text-gray-500">
          For a comparator block test kit — chlorine and pH only, picked from the block's fixed color values.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="field-date" className="block text-sm font-medium mb-1">
            Date
          </label>
          <input
            id="field-date"
            type="date"
            className="w-full h-11 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 appearance-none"
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
            className="w-full h-11 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 appearance-none"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {mode === 'quick' && !isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectField('field-fc-quick', 'Chlorine (ppm)', fc, setFc, QUICK_FC_OPTIONS)}
          {selectField('field-ph-quick', 'pH', ph, setPh, QUICK_PH_OPTIONS)}
        </div>
      ) : (
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
      )}

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
