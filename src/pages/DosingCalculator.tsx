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
  doseChlorineNeutralizer,
  doseCya,
  doseDilutionForReduction,
  doseNonChlorineShock,
  dosePhDecrease,
  dosePhIncrease,
  doseSalt,
  effectFromRate,
  fcLowerProductOptions,
  phDownProductOptions,
  phUpProductOptions,
  round1,
  saltProductOptions,
  boratesProductOptions,
  taLowerProductOptions,
  taRaiseProductOptions,
  type ChlorineProduct,
  type ChProduct,
  type CyaProduct,
  type DoseProduct,
  type MpsIntensity,
  type PhDownProduct,
  type PhUpProduct,
  type TaLowerProduct,
} from '../lib/chemistry'

type Param = 'fc' | 'ph' | 'ta' | 'ch' | 'cya' | 'salt' | 'borates' | 'shock'
type Direction = 'raise' | 'lower'

const PARAM_OPTIONS: Array<{ key: Param; label: string }> = [
  { key: 'fc', label: 'Free Chlorine (FC)' },
  { key: 'ph', label: 'pH' },
  { key: 'ta', label: 'Total Alkalinity (TA)' },
  { key: 'ch', label: 'Calcium Hardness (CH)' },
  { key: 'cya', label: 'Cyanuric Acid (CYA)' },
  { key: 'salt', label: 'Salt' },
  { key: 'borates', label: 'Borates' },
  { key: 'shock', label: 'Non-chlorine shock (MPS)' },
]

const PARAM_INFO: Record<Exclude<Param, 'shock'>, { label: string; unit: string }> = {
  fc: { label: 'Free Chlorine (FC)', unit: 'ppm' },
  ph: { label: 'pH', unit: '' },
  ta: { label: 'Total Alkalinity (TA)', unit: 'ppm' },
  ch: { label: 'Calcium Hardness (CH)', unit: 'ppm' },
  cya: { label: 'Cyanuric Acid (CYA)', unit: 'ppm' },
  salt: { label: 'Salt', unit: 'ppm' },
  borates: { label: 'Borates', unit: 'ppm' },
}

const selectClass = 'w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2'
const inputClass = selectClass

function pillClass(active: boolean) {
  return `px-3 py-1.5 rounded-md ${active ? 'bg-sky-600 text-white' : 'text-gray-600 dark:text-gray-400'}`
}

interface EffectChemical extends DoseProduct {
  id: string
  param: Exclude<Param, 'shock'>
  direction: Direction
}

function taggedOptions<T extends { key: string } & DoseProduct>(
  options: T[],
  param: Exclude<Param, 'shock'>,
  direction: Direction,
): EffectChemical[] {
  return options.map((o) => ({ ...o, id: `${param}:${direction}:${o.key}`, param, direction }))
}

const EFFECT_CHEMICALS: EffectChemical[] = [
  ...taggedOptions(chlorineProductOptions(), 'fc', 'raise'),
  ...taggedOptions(fcLowerProductOptions(), 'fc', 'lower'),
  ...taggedOptions(phUpProductOptions(), 'ph', 'raise'),
  ...taggedOptions(phDownProductOptions(), 'ph', 'lower'),
  ...taggedOptions(taRaiseProductOptions(), 'ta', 'raise'),
  ...taggedOptions(taLowerProductOptions(), 'ta', 'lower'),
  ...taggedOptions(chProductOptions(), 'ch', 'raise'),
  ...taggedOptions(cyaProductOptions(), 'cya', 'raise'),
  ...taggedOptions(saltProductOptions(), 'salt', 'raise'),
  ...taggedOptions(boratesProductOptions(), 'borates', 'raise'),
]

export default function DosingCalculator() {
  const { activePool } = useAppData()
  const [calcMode, setCalcMode] = useState<'dose' | 'effects'>('dose')

  const [param, setParam] = useState<Param>('fc')
  const [direction, setDirection] = useState<Direction>('raise')
  const [volume, setVolume] = useState(activePool?.volumeGallons ?? 15000)
  const [current, setCurrent] = useState('')
  const [target, setTarget] = useState('')
  const [chlorineProduct, setChlorineProduct] = useState<ChlorineProduct>('liquid_10')
  const [phUpProduct, setPhUpProduct] = useState<PhUpProduct>('soda_ash')
  const [phDownProduct, setPhDownProduct] = useState<PhDownProduct>('muriatic_acid')
  const [taLowerProduct, setTaLowerProduct] = useState<TaLowerProduct>('muriatic_acid')
  const [chProduct, setChProduct] = useState<ChProduct>('calcium_chloride_dihydrate')
  const [cyaProduct, setCyaProduct] = useState<CyaProduct>('granular')
  const [boratesProduct, setBoratesProduct] = useState<'borax_acid' | 'boric_acid'>('borax_acid')
  const [shockIntensity, setShockIntensity] = useState<MpsIntensity>('maintenance')

  const [effectId, setEffectId] = useState(EFFECT_CHEMICALS[0].id)
  const [effectAmount, setEffectAmount] = useState('')
  const [effectCurrent, setEffectCurrent] = useState('')

  const result = useMemo(() => {
    if (param === 'shock') return doseNonChlorineShock(volume, shockIntensity)
    const c = Number(current)
    const t = Number(target)
    if (current === '' || target === '' || Number.isNaN(c) || Number.isNaN(t)) return null

    if (direction === 'lower') {
      switch (param) {
        case 'fc':
          return doseChlorineNeutralizer(c, t, volume)
        case 'ph':
          return dosePhDecrease(c, t, volume, phDownProduct)
        case 'ta':
          return doseAcidForTaReduction(c, t, volume, taLowerProduct)
        case 'ch':
          return doseDilutionForReduction(c, t, volume, 'calcium hardness')
        case 'cya':
          return doseDilutionForReduction(c, t, volume, 'CYA')
        case 'salt':
          return doseDilutionForReduction(c, t, volume, 'salt')
        case 'borates':
          return doseDilutionForReduction(c, t, volume, 'borates')
      }
    }

    switch (param) {
      case 'fc':
        return doseChlorine(c, t, volume, chlorineProduct)
      case 'ph':
        return dosePhIncrease(c, t, volume, phUpProduct)
      case 'ta':
        return doseBakingSodaForTa(c, t, volume)
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
    direction,
    current,
    target,
    volume,
    chlorineProduct,
    phUpProduct,
    phDownProduct,
    taLowerProduct,
    chProduct,
    cyaProduct,
    boratesProduct,
    shockIntensity,
  ])

  const selectedChemical = EFFECT_CHEMICALS.find((c) => c.id === effectId) ?? EFFECT_CHEMICALS[0]

  const effectResult = useMemo(() => {
    const amt = Number(effectAmount)
    if (effectAmount === '' || Number.isNaN(amt) || amt <= 0) return null
    const delta = effectFromRate(amt, volume, selectedChemical)
    const signedDelta = selectedChemical.direction === 'raise' ? delta : -delta
    const cur = effectCurrent === '' ? undefined : Number(effectCurrent)
    const newLevel = cur !== undefined && !Number.isNaN(cur) ? round1(cur + signedDelta) : undefined
    return { signedDelta: round1(signedDelta), newLevel }
  }, [effectAmount, effectCurrent, volume, selectedChemical])

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">{calcMode === 'dose' ? 'Dosing calculator' : 'Chemical effects calculator'}</h1>

      <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 text-sm">
        <button type="button" onClick={() => setCalcMode('dose')} className={pillClass(calcMode === 'dose')}>
          How much do I need?
        </button>
        <button type="button" onClick={() => setCalcMode('effects')} className={pillClass(calcMode === 'effects')}>
          What will this do?
        </button>
      </div>

      {calcMode === 'dose' ? (
        <>
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

          {param !== 'shock' && (
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 text-sm">
              <button type="button" onClick={() => setDirection('raise')} className={pillClass(direction === 'raise')}>
                Raise
              </button>
              <button type="button" onClick={() => setDirection('lower')} className={pillClass(direction === 'lower')}>
                Lower
              </button>
            </div>
          )}

          {param === 'fc' && direction === 'raise' && (
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

          {param === 'ph' && direction === 'raise' && (
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

          {param === 'ph' && direction === 'lower' && (
            <div>
              <label className="block text-sm font-medium mb-1">Acid</label>
              <select className={selectClass} value={phDownProduct} onChange={(e) => setPhDownProduct(e.target.value as PhDownProduct)}>
                {phDownProductOptions().map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {param === 'ta' && direction === 'lower' && (
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

          {param === 'ch' && direction === 'raise' && (
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

          {param === 'cya' && direction === 'raise' && (
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

          {param === 'borates' && direction === 'raise' && (
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
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Already added a chemical, or thinking about adding one? See roughly what it'll do to your numbers.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">Chemical</label>
            <select className={selectClass} value={effectId} onChange={(e) => setEffectId(e.target.value)}>
              {(Object.keys(PARAM_INFO) as Array<Exclude<Param, 'shock'>>).map((paramKey) => {
                const options = EFFECT_CHEMICALS.filter((c) => c.param === paramKey)
                if (options.length === 0) return null
                return (
                  <optgroup key={paramKey} label={PARAM_INFO[paramKey].label}>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.direction === 'raise' ? 'Raise' : 'Lower'} — {o.label}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pool volume (gallons)</label>
            <input type="number" className={inputClass} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount added ({selectedChemical.unit})</label>
              <input type="number" step="0.1" className={inputClass} value={effectAmount} onChange={(e) => setEffectAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Current {PARAM_INFO[selectedChemical.param].label} <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="number" step="0.1" className={inputClass} value={effectCurrent} onChange={(e) => setEffectCurrent(e.target.value)} />
            </div>
          </div>

          {effectResult && (
            <div className="rounded-lg border border-sky-300 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-700 p-4">
              <p className="text-2xl font-bold">
                {effectResult.signedDelta > 0 ? '+' : ''}
                {effectResult.signedDelta}{' '}
                <span className="text-base font-normal">{PARAM_INFO[selectedChemical.param].unit}</span>
              </p>
              <p className="font-medium mt-1">Estimated change in {PARAM_INFO[selectedChemical.param].label}</p>
              {effectResult.newLevel !== undefined && (
                <p className="mt-1">
                  New estimated level: <span className="font-semibold">{effectResult.newLevel}</span>
                </p>
              )}
              {(selectedChemical.note || selectedChemical.sideEffect) && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selectedChemical.note ?? selectedChemical.sideEffect}</p>
              )}
              <p className="text-xs text-gray-500 mt-3">
                Estimate only — real results vary by product concentration and pool conditions. Retest before adding more.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
