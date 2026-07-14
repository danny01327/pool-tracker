import type { ParamAssessment, ParamStatus, PoolProfile, TestEntry } from '../types'

// ---------------------------------------------------------------------------
// FC/CYA target table (Trouble Free Pool "Chlorine/CYA Chart")
// Values are ppm. "shock" is the FC level used during a SLAM to kill algae.
// ---------------------------------------------------------------------------
interface FcRow {
  cya: number
  min: number
  targetLow: number
  targetHigh: number
  shock: number
}

const FC_CYA_TABLE: FcRow[] = [
  { cya: 0, min: 0.5, targetLow: 1, targetHigh: 2, shock: 2 },
  { cya: 10, min: 1, targetLow: 2, targetHigh: 3, shock: 5 },
  { cya: 20, min: 2, targetLow: 3, targetHigh: 5, shock: 10 },
  { cya: 30, min: 2, targetLow: 4, targetHigh: 6, shock: 12 },
  { cya: 40, min: 3, targetLow: 5, targetHigh: 8, shock: 16 },
  { cya: 50, min: 4, targetLow: 6, targetHigh: 10, shock: 20 },
  { cya: 60, min: 5, targetLow: 7, targetHigh: 11, shock: 24 },
  { cya: 70, min: 5, targetLow: 8, targetHigh: 13, shock: 28 },
  { cya: 80, min: 6, targetLow: 9, targetHigh: 15, shock: 32 },
  { cya: 90, min: 7, targetLow: 10, targetHigh: 16, shock: 36 },
  { cya: 100, min: 7, targetLow: 11, targetHigh: 18, shock: 40 },
]

function interpolateFcRow(cya: number): FcRow {
  const clamped = Math.max(0, Math.min(100, cya))
  let lower = FC_CYA_TABLE[0]
  let upper = FC_CYA_TABLE[FC_CYA_TABLE.length - 1]
  for (let i = 0; i < FC_CYA_TABLE.length - 1; i++) {
    if (clamped >= FC_CYA_TABLE[i].cya && clamped <= FC_CYA_TABLE[i + 1].cya) {
      lower = FC_CYA_TABLE[i]
      upper = FC_CYA_TABLE[i + 1]
      break
    }
  }
  if (lower.cya === upper.cya) return lower
  const t = (clamped - lower.cya) / (upper.cya - lower.cya)
  const lerp = (a: number, b: number) => a + (b - a) * t
  return {
    cya: clamped,
    min: lerp(lower.min, upper.min),
    targetLow: lerp(lower.targetLow, upper.targetLow),
    targetHigh: lerp(lower.targetHigh, upper.targetHigh),
    shock: lerp(lower.shock, upper.shock),
  }
}

export function getFcTargets(cya: number, sanitizerType: PoolProfile['sanitizerType']) {
  const row = interpolateFcRow(cya)
  if (sanitizerType === 'salt') {
    // SWG pools run FC steadily; TFP recommends staying in the upper half
    // of the range so the generator doesn't have to work as hard and FC
    // never dips near the minimum between production cycles.
    const mid = (row.targetLow + row.targetHigh) / 2
    return { ...row, targetLow: mid, targetHigh: row.targetHigh }
  }
  return row
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// ---------------------------------------------------------------------------
// Non-CYA-linked target ranges
// ---------------------------------------------------------------------------
export const PH_TARGET = { min: 7.2, max: 7.8, idealLow: 7.4, idealHigh: 7.6 }

export function getTaTarget(profile: PoolProfile) {
  if (profile.sanitizerType === 'salt') return { min: 50, max: 70, idealLow: 60, idealHigh: 70 }
  return { min: 50, max: 90, idealLow: 60, idealHigh: 70 }
}

export function getChTarget(profile: PoolProfile) {
  if (profile.surfaceType === 'plaster') return { min: 250, max: 400, idealLow: 300, idealHigh: 350 }
  return { min: 200, max: 400, idealLow: 250, idealHigh: 350 }
}

export function getCyaTarget(profile: PoolProfile) {
  if (profile.sanitizerType === 'salt') return { min: 60, max: 80, idealLow: 70, idealHigh: 80 }
  return { min: 30, max: 50, idealLow: 30, idealHigh: 40 }
}

export const BORATES_TARGET = { min: 30, max: 50, idealLow: 30, idealHigh: 50 }

export const SALT_TARGET_DEFAULT = { min: 2700, max: 3400, idealLow: 2900, idealHigh: 3200 }

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------
function statusFor(value: number, min: number, max: number): ParamStatus {
  if (value < min) return 'low'
  if (value > max) return 'high'
  return 'ok'
}

export function assessAll(test: TestEntry, profile: PoolProfile): ParamAssessment[] {
  const results: ParamAssessment[] = []
  const cya = test.cya ?? 30

  // FC — always assessed first, it's the single most important number in TFP.
  if (test.fc !== undefined) {
    const t = getFcTargets(cya, profile.sanitizerType)
    const status = statusFor(test.fc, t.min, t.targetHigh)
    let message = `Target ${round1(t.targetLow)}-${round1(t.targetHigh)} ppm for CYA ${round1(cya)}.`
    if (test.fc < t.min) {
      message = `Below the minimum of ${round1(t.min)} ppm for this CYA level — algae risk. Add chlorine now.`
    } else if (test.fc < t.targetLow) {
      message = `Above the bare minimum but below the target range (${round1(t.targetLow)}-${round1(t.targetHigh)} ppm). Top up.`
    } else if (test.fc > t.targetHigh) {
      message = `Above target range (${round1(t.targetLow)}-${round1(t.targetHigh)} ppm). Fine if from recent shocking — let it decay, don't add more.`
    }
    results.push({
      key: 'fc',
      label: 'Free Chlorine (FC)',
      value: test.fc,
      unit: 'ppm',
      status,
      targetMin: t.targetLow,
      targetMax: t.targetHigh,
      message,
      priority: 1,
    })
  }

  // CYA
  if (test.cya !== undefined) {
    const t = getCyaTarget(profile)
    const status = statusFor(test.cya, t.min, t.max)
    let message = `Target ${t.min}-${t.max} ppm.`
    if (test.cya < t.min) message = `Low — chlorine will burn off fast in sunlight. Add stabilizer to bring into ${t.min}-${t.max} ppm.`
    else if (test.cya > t.max) message = `High — chlorine effectiveness drops as CYA rises. Cannot be lowered chemically; partial drain/refill is the only fix.`
    results.push({
      key: 'cya',
      label: 'Cyanuric Acid (CYA)',
      value: test.cya,
      unit: 'ppm',
      status,
      targetMin: t.min,
      targetMax: t.max,
      message,
      priority: 2,
    })
  }

  // pH
  if (test.ph !== undefined) {
    const status = statusFor(test.ph, PH_TARGET.min, PH_TARGET.max)
    let message = `Target ${PH_TARGET.idealLow}-${PH_TARGET.idealHigh}.`
    if (test.ph < PH_TARGET.min) message = 'Low — can corrode metal and irritate skin/eyes. Add pH increaser (soda ash).'
    else if (test.ph > PH_TARGET.max) message = 'High — chlorine loses effectiveness and scale risk rises. Add muriatic/dry acid.'
    results.push({
      key: 'ph',
      label: 'pH',
      value: test.ph,
      unit: '',
      status,
      targetMin: PH_TARGET.idealLow,
      targetMax: PH_TARGET.idealHigh,
      message,
      priority: 3,
    })
  }

  // TA
  if (test.ta !== undefined) {
    const t = getTaTarget(profile)
    const status = statusFor(test.ta, t.min, t.max)
    let message = `Target ${t.min}-${t.max} ppm.`
    if (test.ta < t.min) message = 'Low — pH can swing unpredictably. Add baking soda.'
    else if (test.ta > t.max) message = 'High — pH will tend to keep rising (pH creep). Add acid, then aerate to hold TA down while pH recovers.'
    results.push({
      key: 'ta',
      label: 'Total Alkalinity (TA)',
      value: test.ta,
      unit: 'ppm',
      status,
      targetMin: t.min,
      targetMax: t.max,
      message,
      priority: 4,
    })
  }

  // CH
  if (test.ch !== undefined) {
    const t = getChTarget(profile)
    const status = statusFor(test.ch, t.min, t.max)
    let message = `Target ${t.min}-${t.max} ppm.`
    if (test.ch < t.min) {
      message =
        profile.surfaceType === 'plaster'
          ? 'Low — risk of etching plaster/grout. Add calcium chloride.'
          : 'Low — can be corrosive to metal fittings/heaters. Add calcium chloride.'
    } else if (test.ch > t.max) {
      message = 'High — scale risk, especially on heaters. Cannot be lowered chemically; partial drain/refill if it keeps climbing.'
    }
    results.push({
      key: 'ch',
      label: 'Calcium Hardness (CH)',
      value: test.ch,
      unit: 'ppm',
      status,
      targetMin: t.min,
      targetMax: t.max,
      message,
      priority: 5,
    })
  }

  // Salt (SWG only)
  if (profile.sanitizerType === 'salt' && test.salt !== undefined) {
    const t = SALT_TARGET_DEFAULT
    const status = statusFor(test.salt, t.min, t.max)
    let message = `Typical generator range ${t.min}-${t.max} ppm — check your manufacturer's spec.`
    if (test.salt < t.min) message = 'Low — generator may fault or work harder than needed. Add pool salt.'
    else if (test.salt > t.max) message = 'High — some generators fault above their max. Dilute with fresh water if it keeps rising.'
    results.push({
      key: 'salt',
      label: 'Salt',
      value: test.salt,
      unit: 'ppm',
      status,
      targetMin: t.min,
      targetMax: t.max,
      message,
      priority: 6,
    })
  }

  return results.sort((a, b) => a.priority - b.priority)
}

// ---------------------------------------------------------------------------
// Calcite (Calcium Carbonate) Saturation Index — the water-balance number
// TFP/Orenda/Taylor test kits call "CSI" (the pool-chemistry name for what's
// scientifically the Langelier Saturation Index, LSI — same formula, same
// thing, different industries' preferred name).
// CSI = pH + TF (temp) + CF (calcium) + AF (alkalinity) - TDS-based constant
// Target band roughly -0.3 to +0.3; negative = corrosive, positive = scaling.
// ---------------------------------------------------------------------------
function interpolateTable(table: Array<[number, number]>, x: number): number {
  if (x <= table[0][0]) return table[0][1]
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1]
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i]
    const [x1, y1] = table[i + 1]
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return y0 + (y1 - y0) * t
    }
  }
  return table[table.length - 1][1]
}

const TEMP_FACTOR: Array<[number, number]> = [
  [32, 0.0], [37, 0.1], [46, 0.2], [53, 0.3], [60, 0.4],
  [66, 0.5], [76, 0.6], [84, 0.7], [94, 0.8], [105, 0.9],
]

const CALCIUM_FACTOR: Array<[number, number]> = [
  [25, 1.0], [50, 1.3], [75, 1.5], [100, 1.6], [125, 1.7],
  [150, 1.8], [200, 1.9], [250, 2.0], [300, 2.1], [400, 2.2], [800, 2.5],
]

const ALKALINITY_FACTOR: Array<[number, number]> = [
  [25, 1.4], [50, 1.7], [75, 1.9], [100, 2.0], [125, 2.1],
  [150, 2.2], [200, 2.3], [250, 2.4], [300, 2.5], [400, 2.6], [800, 2.9],
]

// The additive constant is itself slightly TDS-dependent (Taylor/Orenda
// tables). This mostly matters for SWG pools, where salt alone can push
// TDS past 2000 ppm.
function tdsConstant(tdsPpm: number): number {
  if (tdsPpm < 1000) return 12.1
  if (tdsPpm < 2000) return 12.2
  return 12.3
}

/** Estimate total dissolved solids when the user hasn't measured it directly. */
export function estimateTds(test: TestEntry, profile: PoolProfile): number {
  const baseline = 500 // typical dissolved solids from fill water + added chemicals
  if (profile.sanitizerType === 'salt') return (test.salt ?? 0) + baseline
  return baseline
}

export interface CsiResult {
  csi: number
  status: 'corrosive' | 'balanced' | 'scaling'
  correctedTa: number
  tdsPpm: number
}

export function calculateCsi(test: TestEntry, profile: PoolProfile, waterTempF = 80): CsiResult | undefined {
  if (test.ph === undefined || test.ta === undefined || test.ch === undefined) return undefined
  const cya = test.cya ?? 0
  // Roughly a third of measured TA comes from CYA buffering rather than
  // true carbonate alkalinity — subtract it for a more accurate CSI.
  const correctedTa = Math.max(0, test.ta - cya / 3)
  const tdsPpm = test.tds ?? estimateTds(test, profile)
  const tf = interpolateTable(TEMP_FACTOR, waterTempF)
  const cf = interpolateTable(CALCIUM_FACTOR, test.ch)
  const af = interpolateTable(ALKALINITY_FACTOR, correctedTa)
  const csi = test.ph + tf + cf + af - tdsConstant(tdsPpm)
  const status = csi < -0.3 ? 'corrosive' : csi > 0.3 ? 'scaling' : 'balanced'
  return { csi: Math.round(csi * 100) / 100, status, correctedTa: Math.round(correctedTa), tdsPpm: Math.round(tdsPpm) }
}

// ---------------------------------------------------------------------------
// Dosing calculator
// All rates are the well-known approximate amounts to shift a parameter by
// a given delta per 10,000 US gallons. Real-world results vary — retest
// after mixing/circulating and adjust before adding more.
// ---------------------------------------------------------------------------
interface DoseProduct {
  label: string
  /** amount of product (in `unit`) to shift the reading by 1 ppm per 10,000 gallons */
  ratePerPpmPer10k: number
  unit: string
  sideEffect?: string
  note?: string
}

function doseFromRate(delta: number, volumeGallons: number, product: DoseProduct) {
  const amount = delta > 0 ? product.ratePerPpmPer10k * (volumeGallons / 10000) * delta : 0
  return { amount: round1(amount), unit: product.unit, label: product.label, sideEffect: product.sideEffect, note: product.note }
}

function productOptions<T extends string>(rates: Record<T, DoseProduct>) {
  return (Object.keys(rates) as T[]).map((key) => ({ key, ...rates[key] }))
}

// --- Chlorine (raise FC) ---------------------------------------------------
export type ChlorineProduct =
  | 'liquid_5'
  | 'bleach_6'
  | 'bleach_8_25'
  | 'liquid_10'
  | 'liquid_12_5'
  | 'liquid_15'
  | 'cal_hypo_65'
  | 'cal_hypo_73'
  | 'dichlor_56'
  | 'trichlor_90'
  | 'lithium_hypo_35'

const CHLORINE_RATES: Record<ChlorineProduct, DoseProduct> = {
  liquid_5: { label: 'Liquid chlorine / bleach (5%)', ratePerPpmPer10k: 26, unit: 'fl oz' },
  bleach_6: { label: 'Household bleach (6%)', ratePerPpmPer10k: 20.5, unit: 'fl oz' },
  bleach_8_25: { label: 'Pool-grade bleach (8.25%)', ratePerPpmPer10k: 15, unit: 'fl oz' },
  liquid_10: { label: 'Liquid chlorine (10%)', ratePerPpmPer10k: 10.7, unit: 'fl oz' },
  liquid_12_5: { label: 'Liquid pool shock (12.5%)', ratePerPpmPer10k: 8.6, unit: 'fl oz' },
  liquid_15: { label: 'Liquid chlorine (15%)', ratePerPpmPer10k: 7.2, unit: 'fl oz' },
  cal_hypo_65: {
    label: 'Cal-hypo, 65% (dry)',
    ratePerPpmPer10k: 2.0,
    unit: 'oz (dry)',
    sideEffect: 'Also raises calcium hardness — pre-dissolve and add away from plaster/liner.',
  },
  cal_hypo_73: {
    label: 'Cal-hypo, 73% (dry)',
    ratePerPpmPer10k: 1.8,
    unit: 'oz (dry)',
    sideEffect: 'Also raises calcium hardness — pre-dissolve and add away from plaster/liner.',
  },
  dichlor_56: {
    label: 'Dichlor, 56% (dry)',
    ratePerPpmPer10k: 2.5,
    unit: 'oz (dry)',
    sideEffect: 'Also raises CYA by roughly 0.9 ppm per ppm of FC added — fine for startup, not for routine dosing.',
  },
  trichlor_90: {
    label: 'Trichlor pucks, 90% (dry)',
    ratePerPpmPer10k: 1.6,
    unit: 'oz (dry)',
    sideEffect:
      "Not recommended by TFP for routine/shock dosing: it steadily drives CYA up (~0.6 ppm CYA per ppm FC) and is very acidic, pulling down pH and TA. Feeder/floater use only, and stop once CYA is in range.",
  },
  lithium_hypo_35: {
    label: 'Lithium hypochlorite, 35% (dry)',
    ratePerPpmPer10k: 3.7,
    unit: 'oz (dry)',
    sideEffect: "Doesn't raise CYA or calcium hardness — useful for vinyl/fiberglass pools, but expensive for routine use.",
  },
}

export function doseChlorine(currentFc: number, targetFc: number, volumeGallons: number, product: ChlorineProduct) {
  return doseFromRate(targetFc - currentFc, volumeGallons, CHLORINE_RATES[product])
}

export function chlorineProductOptions() {
  return productOptions(CHLORINE_RATES)
}

// --- Raise pH ---------------------------------------------------------------
export type PhUpProduct = 'soda_ash' | 'borax'

const PH_UP_RATES: Record<PhUpProduct, DoseProduct> = {
  soda_ash: {
    label: 'Soda ash (sodium carbonate)',
    ratePerPpmPer10k: 30, // ~6 oz per 10k gal raises pH ~0.2
    unit: 'oz (dry)',
    note: 'Also raises TA somewhat. Add slowly, pre-dissolved, with the pump running; retest before adding more.',
  },
  borax: {
    label: 'Borax (20 Mule Team)',
    ratePerPpmPer10k: 10, // ~1 lb per 10k gal raises pH ~0.1
    unit: 'lb',
    note: 'Raises pH with little effect on TA, and adds some borates as a bonus. Dissolve first; retest before adding more.',
  },
}

export function dosePhIncrease(currentPh: number, targetPh: number, volumeGallons: number, product: PhUpProduct = 'soda_ash') {
  return doseFromRate(targetPh - currentPh, volumeGallons, PH_UP_RATES[product])
}

export function phUpProductOptions() {
  return productOptions(PH_UP_RATES)
}

// --- Lower TA (and pH) --------------------------------------------------
export type TaLowerProduct = 'muriatic_acid' | 'dry_acid'

const TA_LOWER_RATES: Record<TaLowerProduct, DoseProduct> = {
  muriatic_acid: {
    label: 'Muriatic acid (31.45%)',
    ratePerPpmPer10k: 2.5, // ~25 fl oz per 10k gal lowers TA by 10 ppm
    unit: 'fl oz',
    note: 'Pour in front of a return with pump running, in one spot, then aerate (fountains/waterfall/spa jets) for a few hours to bring pH back up without raising TA again.',
  },
  dry_acid: {
    label: 'Dry acid (sodium bisulfate)',
    ratePerPpmPer10k: 0.35, // ~3.5 lb per 10k gal lowers TA by 10 ppm
    unit: 'lb',
    note: 'Pre-dissolve in a bucket of water, pour in front of a return, then aerate to bring pH back up. Adds sulfate — muriatic acid is generally preferred for large/frequent doses.',
  },
}

export function doseAcidForTaReduction(currentTa: number, targetTa: number, volumeGallons: number, product: TaLowerProduct = 'muriatic_acid') {
  return doseFromRate(currentTa - targetTa, volumeGallons, TA_LOWER_RATES[product])
}

export function taLowerProductOptions() {
  return productOptions(TA_LOWER_RATES)
}

// --- Raise TA ----------------------------------------------------------
export function doseBakingSodaForTa(currentTa: number, targetTa: number, volumeGallons: number) {
  return doseFromRate(targetTa - currentTa, volumeGallons, {
    label: 'Baking soda (sodium bicarbonate)',
    ratePerPpmPer10k: 0.15,
    unit: 'lb',
    note: 'Dissolve and add with pump running. Retest after an hour of circulation.',
  })
}

// --- Raise calcium hardness ----------------------------------------------
export type ChProduct = 'calcium_chloride_dihydrate' | 'calcium_chloride_anhydrous'

const CH_RATES: Record<ChProduct, DoseProduct> = {
  calcium_chloride_dihydrate: {
    label: 'Calcium chloride, dihydrate (~77%)',
    ratePerPpmPer10k: 0.125,
    unit: 'lb',
    note: 'Pre-dissolve in a bucket of water before adding — it heats up. Add slowly with pump running.',
  },
  calcium_chloride_anhydrous: {
    label: 'Calcium chloride, anhydrous (~94-97%)',
    ratePerPpmPer10k: 0.1,
    unit: 'lb',
    note: 'More concentrated than dihydrate, so less is needed by weight. Pre-dissolve — it heats up. Add slowly with pump running.',
  },
}

export function doseCalciumChloride(currentCh: number, targetCh: number, volumeGallons: number, product: ChProduct = 'calcium_chloride_dihydrate') {
  return doseFromRate(targetCh - currentCh, volumeGallons, CH_RATES[product])
}

export function chProductOptions() {
  return productOptions(CH_RATES)
}

// --- Raise CYA -----------------------------------------------------------
export type CyaProduct = 'granular' | 'liquid'

const CYA_RATES: Record<CyaProduct, DoseProduct> = {
  granular: {
    label: 'Cyanuric acid, granular (stabilizer/conditioner)',
    ratePerPpmPer10k: 0.13,
    unit: 'lb',
    note: 'Dissolves slowly — put in a sock in front of a return jet, or in the skimmer basket with pump running, and check again in a week.',
  },
  liquid: {
    label: 'Liquid conditioner',
    ratePerPpmPer10k: 0.4,
    unit: 'fl oz',
    note: 'Liquid conditioner concentration varies a lot by brand — this is a rough estimate. Check the product label, add slowly, and retest before adding more.',
  },
}

export function doseCya(currentCya: number, targetCya: number, volumeGallons: number, product: CyaProduct = 'granular') {
  return doseFromRate(targetCya - currentCya, volumeGallons, CYA_RATES[product])
}

export function cyaProductOptions() {
  return productOptions(CYA_RATES)
}

// --- Raise salt (SWG pools) -----------------------------------------------
export function doseSalt(currentSalt: number, targetSalt: number, volumeGallons: number) {
  return doseFromRate(targetSalt - currentSalt, volumeGallons, {
    label: 'Pool salt (NaCl, 99%+ pure)',
    ratePerPpmPer10k: 0.083,
    unit: 'lb',
    note: 'Broadcast around the pool with pump running; brush any that settles. Retest after it fully dissolves (a few hours).',
  })
}

// --- Raise borates ---------------------------------------------------------
export function doseBorates(currentBorates: number, targetBorates: number, volumeGallons: number) {
  const delta = Math.max(0, targetBorates - currentBorates)
  const boraxLb = (delta / 10) * 1.75 * (volumeGallons / 10000)
  const acidOz = (delta / 10) * 20 * (volumeGallons / 10000)
  return {
    amount: round1(boraxLb),
    unit: 'lb borax + acid',
    label: 'Borax (20 Mule Team) + muriatic acid',
    note: `Approx. ${round1(boraxLb)} lb borax plus ${round1(acidOz)} fl oz muriatic acid to neutralize the pH bump. This is a rough estimate — add borax first, then acid to bring pH back to target, and retest.`,
  }
}

export function doseBoricAcidForBorates(currentBorates: number, targetBorates: number, volumeGallons: number) {
  return doseFromRate(targetBorates - currentBorates, volumeGallons, {
    label: 'Boric acid',
    ratePerPpmPer10k: 0.14,
    unit: 'lb',
    note: 'Simpler than borax + acid since no neutralizing acid is needed, but boric acid is mildly acidic — recheck pH afterward and add a little soda ash if it drops too far.',
  })
}

// --- Non-chlorine (oxidizer) shock -----------------------------------------
export type MpsIntensity = 'maintenance' | 'shock'

export function doseNonChlorineShock(volumeGallons: number, intensity: MpsIntensity = 'maintenance') {
  const lbPer10k = intensity === 'shock' ? 2.5 : 1
  const amount = lbPer10k * (volumeGallons / 10000)
  return {
    amount: round1(amount),
    unit: 'lb',
    label: 'Non-chlorine shock (potassium monopersulfate / MPS)',
    note: "Oxidizes combined chlorine and organics without adding FC — handy after heavy bather load. Doesn't kill algae and isn't a substitute for chlorine; wait per product label (often 15-30 min) before swimming or retesting FC.",
  }
}
