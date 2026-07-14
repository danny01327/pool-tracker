import { useMemo, useState } from 'react'
import { useAppData } from '../lib/AppDataContext'
import {
  chlorineProductOptions,
  chProductOptions,
  cyaProductOptions,
  doseAcidForTaReduction,
  doseBakingSodaForTa,
  doseBorates,
  doseBoricAcidForBorates,
  doseCalciumChloride,
  doseChlorine,
  doseCya,
  doseNonChlorineShock,
  dosePhIncrease,
  doseSalt,
  phUpProductOptions,
  taLowerProductOptions,
  type ChlorineProduct,
  type ChProduct,
  type CyaProduct,
  type MpsIntensity,
  type PhUpProduct,
  type TaLowerProduct,
} from '../lib/chemistry'

type Param = 'fc' | 'ph_up' | 'ta' | 'ch' | 'cya' | 'salt' | 'borates' | 'shock'

const PARAM_OPTIONS: Array<{ key: Param; label: string }> = [
  { key: 'fc', label: 'Raise Free Chlorine' },
  { key: 'ph_up', label: 'Raise pH' },
  { key: 'ta', label: 'Total Alkalinity' },
  { key: 'ch', label: 'Calcium Hardness (raise)' },
  { key: 'cya', label: 'Cyanuric Acid (raise)' },
  { key: 'salt', label: 'Salt (raise)' },
  { key: 'borates', label: 'Borates (raise)' },
  { key: 'shock', label: 'Non-chlorine shock (MPS)' },
]

const selectClass = 'w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2'
const inputClass = selectClass

export default function DosingCalculator() {
  const { activePool } = useAppData()
  const [param, setParam] = useState<Param>('fc')
  const [volume, setVolume] = useState(activePool?.volumeGallons ?? 15000)
  const [current, setCurrent] = useState('')
  const [target, setTarget] = useState('')
  const [chlorineProduct, setChlorineProduct] = useState<ChlorineProduct>('liquid_10')
  const [phUpProduct, setPhUpProduct] = useState<PhUpProduct>('soda_ash')
  const [taMode, setTaMode] = useState<'raise' | 'lower'>('raise')
  const [taLowerProduct, setTaLowerProduct] = useState<TaLowerProduct>('muriatic_acid')
  const [chProduct, setChProduct] = useState<ChProduct>('calcium_chloride_dihydrate')
  const [cyaProduct, setCyaProduct] = useState<CyaProduct>('granular')
  const [boratesProduct, setBoratesProduct] = useState<'borax_acid' | 'boric_acid'>('borax_acid')
  const [shockIntensity, setShockIntensity] = useState<MpsIntensity>('maintenance')

  const result = useMemo(() => {
    if (param === 'shock') return doseNonChlorineShock(volume, shockIntensity)
    const c = Number(current)
    const t = Number(target)
    if (current === '' || target === '' || Number.isNaN(c) || Number.isNaN(t)) return null
    switch (param) {
      case 'fc':
        return doseChlorine(c, t, volume, chlorineProduct)
      case 'ph_up':
        return dosePhIncrease(c, t, volume, phUpProduct)
      case 'ta':
        return taMode === 'raise' ? doseBakingSodaForTa(c, t, volume) : doseAcidForTaReduction(c, t, volume, taLowerProduct)
      case 'ch':
        return doseCalciumChloride(c, t, volume, chProduct)
      case 'cya':
        return doseCya(c, t, volume, cyaProduct)
      case 'salt':
        return doseSalt(c, t, volume)
      case 'borates':
        return boratesProduct === 'borax_acid' ? doseBorates(c, t, volume) : doseBoricAcidForBorates(c, t, volume)
    }
  }, [
    param,
    current,
    target,
    volume,
    chlorineProduct,
    phUpProduct,
    taMode,
    taLowerProduct,
    chProduct,
    cyaProduct,
    boratesProduct,
    shockIntensity,
  ])

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">Dosing calculator</h1>

      <div>
        <label className="block text-sm font-medium mb-1">What do you want to adjust?</label>
        <select className={selectClass} value={param} onChange={(e) => setParam(e.target.value as Param)}>
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
          <select className={selectClass} value={chlorineProduct} onChange={(e) => setChlorineProduct(e.target.value as ChlorineProduct)}>
            {chlorineProductOptions().map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {param === 'ph_up' && (
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select className={selectClass} value={phUpProduct} onChange={(e) => setPhUpProduct(e.target.value as PhUpProduct)}>
            {phUpProductOptions().map((p) => (
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
          <select className={selectClass} value={taMode} onChange={(e) => setTaMode(e.target.value as 'raise' | 'lower')}>
            <option value="raise">Raise TA (baking soda)</option>
            <option value="lower">Lower TA (acid)</option>
          </select>
        </div>
      )}

      {param === 'ta' && taMode === 'lower' && (
        <div>
          <label className="block text-sm font-medium mb-1">Acid</label>
          <select className={selectClass} value={taLowerProduct} onChange={(e) => setTaLowerProduct(e.target.value as TaLowerProduct)}>
            {taLowerProductOptions().map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {param === 'ch' && (
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select className={selectClass} value={chProduct} onChange={(e) => setChProduct(e.target.value as ChProduct)}>
            {chProductOptions().map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {param === 'cya' && (
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select className={selectClass} value={cyaProduct} onChange={(e) => setCyaProduct(e.target.value as CyaProduct)}>
            {cyaProductOptions().map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {param === 'borates' && (
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select
            className={selectClass}
            value={boratesProduct}
            onChange={(e) => setBoratesProduct(e.target.value as 'borax_acid' | 'boric_acid')}
          >
            <option value="borax_acid">Borax (20 Mule Team) + muriatic acid</option>
            <option value="boric_acid">Boric acid</option>
          </select>
        </div>
      )}

      {param === 'shock' && (
        <div>
          <label className="block text-sm font-medium mb-1">Dose</label>
          <select className={selectClass} value={shockIntensity} onChange={(e) => setShockIntensity(e.target.value as MpsIntensity)}>
            <option value="maintenance">Maintenance (after normal bather load)</option>
            <option value="shock">Shock (heavy bather load / cloudy water)</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Pool volume (gallons)</label>
        <input type="number" className={inputClass} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </div>

      {param !== 'shock' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Current level</label>
            <input type="number" step="0.1" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target level</label>
            <input type="number" step="0.1" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>
      )}

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
