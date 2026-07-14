import { useMemo, useState } from 'react'
import { useAppData } from '../lib/AppDataContext'
import {
  chlorineProductOptions,
  doseAcidForTaReduction,
  doseBakingSodaForTa,
  doseBorates,
  doseCalciumChloride,
  doseChlorine,
  doseCya,
  dosePhIncrease,
  doseSalt,
  type ChlorineProduct,
} from '../lib/chemistry'

type Param = 'fc' | 'ph_up' | 'ta' | 'ch' | 'cya' | 'salt' | 'borates'

const PARAM_OPTIONS: Array<{ key: Param; label: string }> = [
  { key: 'fc', label: 'Raise Free Chlorine' },
  { key: 'ph_up', label: 'Raise pH (soda ash)' },
  { key: 'ta', label: 'Total Alkalinity' },
  { key: 'ch', label: 'Calcium Hardness (raise)' },
  { key: 'cya', label: 'Cyanuric Acid (raise)' },
  { key: 'salt', label: 'Salt (raise)' },
  { key: 'borates', label: 'Borates (raise)' },
]

export default function DosingCalculator() {
  const { activePool } = useAppData()
  const [param, setParam] = useState<Param>('fc')
  const [volume, setVolume] = useState(activePool?.volumeGallons ?? 15000)
  const [current, setCurrent] = useState('')
  const [target, setTarget] = useState('')
  const [product, setProduct] = useState<ChlorineProduct>('liquid_10')
  const [taMode, setTaMode] = useState<'raise' | 'lower'>('raise')

  const result = useMemo(() => {
    const c = Number(current)
    const t = Number(target)
    if (current === '' || target === '' || Number.isNaN(c) || Number.isNaN(t)) return null
    switch (param) {
      case 'fc':
        return doseChlorine(c, t, volume, product)
      case 'ph_up':
        return dosePhIncrease(c, t, volume)
      case 'ta':
        return taMode === 'raise' ? doseBakingSodaForTa(c, t, volume) : doseAcidForTaReduction(c, t, volume)
      case 'ch':
        return doseCalciumChloride(c, t, volume)
      case 'cya':
        return doseCya(c, t, volume)
      case 'salt':
        return doseSalt(c, t, volume)
      case 'borates':
        return doseBorates(c, t, volume)
    }
  }, [param, current, target, volume, product, taMode])

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">Dosing calculator</h1>

      <div>
        <label className="block text-sm font-medium mb-1">What do you want to adjust?</label>
        <select
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={param}
          onChange={(e) => setParam(e.target.value as Param)}
        >
          {PARAM_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {param === 'fc' && (
        <div>
          <label className="block text-sm font-medium mb-1">Chlorine product</label>
          <select
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={product}
            onChange={(e) => setProduct(e.target.value as ChlorineProduct)}
          >
            {chlorineProductOptions().map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {param === 'ta' && (
        <div>
          <label className="block text-sm font-medium mb-1">Direction</label>
          <select
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={taMode}
            onChange={(e) => setTaMode(e.target.value as 'raise' | 'lower')}
          >
            <option value="raise">Raise TA (baking soda)</option>
            <option value="lower">Lower TA (muriatic acid)</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Pool volume (gallons)</label>
        <input
          type="number"
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Current level</label>
          <input
            type="number"
            step="0.1"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Target level</label>
          <input
            type="number"
            step="0.1"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-sky-300 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-700 p-4">
          <p className="text-2xl font-bold">
            {result.amount} <span className="text-base font-normal">{result.unit}</span>
          </p>
          <p className="font-medium mt-1">{result.label}</p>
          {('note' in result && result.note) || ('sideEffect' in result && result.sideEffect) ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {'note' in result ? result.note : (result as { sideEffect?: string }).sideEffect}
            </p>
          ) : null}
          <p className="text-xs text-gray-500 mt-3">
            Estimate only — real results vary by product concentration and pool conditions. Add gradually, circulate, and retest before adding more.
          </p>
        </div>
      )}
    </div>
  )
}
