import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../lib/AppDataContext'

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function numOrUndef(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

export default function LogTest() {
  const { activePool, addTest } = useAppData()
  const navigate = useNavigate()

  const [timestamp, setTimestamp] = useState(toLocalDatetimeInput(new Date()))
  const [fc, setFc] = useState('')
  const [cc, setCc] = useState('')
  const [ph, setPh] = useState('')
  const [ta, setTa] = useState('')
  const [ch, setCh] = useState('')
  const [cya, setCya] = useState('')
  const [salt, setSalt] = useState('')
  const [tds, setTds] = useState('')
  const [waterTempF, setWaterTempF] = useState('')
  const [notes, setNotes] = useState('')

  if (!activePool) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activePool) return
    addTest({
      poolId: activePool.id,
      timestamp: new Date(timestamp).toISOString(),
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
    })
    navigate('/')
  }

  const field = (id: string, label: string, value: string, setValue: (v: string) => void, unit: string, step = '0.1') => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label} <span className="text-gray-400 font-normal">({unit})</span>
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
      <h1 className="text-xl font-semibold">Log a test</h1>
      <div>
        <label className="block text-sm font-medium mb-1">Date &amp; time</label>
        <input
          type="datetime-local"
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      <button type="submit" className="rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">
        Save test
      </button>
    </form>
  )
}
