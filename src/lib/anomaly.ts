import type { TestEntry } from '../types'

export type AnomalyKey = 'fc' | 'ph' | 'ta' | 'ch' | 'cya' | 'salt'

export interface AnomalyFlag {
  key: AnomalyKey
  label: string
  current: number
  baseline: number
  message: string
}

interface RuleConfig {
  label: string
  /** flag if |current - baseline| exceeds this */
  absoluteThreshold?: number
  /** flag if current is more than this many times the baseline, or less than 1/this many */
  relativeFactor?: number
}

// TA/CH/CYA/salt only change from intentional additions or slow drift, so any
// big swing is worth a second look. FC swings on purpose all the time (that's
// the point of dosing), so it uses a much looser relative threshold instead
// of a tight absolute one, and only flags dramatic multi-x jumps or drops.
const RULES: Record<AnomalyKey, RuleConfig> = {
  ph: { label: 'pH', absoluteThreshold: 0.5 },
  ta: { label: 'Total Alkalinity (TA)', absoluteThreshold: 30 },
  ch: { label: 'Calcium Hardness (CH)', absoluteThreshold: 75 },
  cya: { label: 'Cyanuric Acid (CYA)', absoluteThreshold: 20 },
  salt: { label: 'Salt', absoluteThreshold: 500 },
  fc: { label: 'Free Chlorine (FC)', relativeFactor: 3 },
}

const MIN_HISTORY = 3
const BASELINE_WINDOW = 5

/**
 * priorTests must be sorted newest-first and NOT include `latest`.
 */
export function detectAnomalies(priorTests: TestEntry[], latest: TestEntry): AnomalyFlag[] {
  const flags: AnomalyFlag[] = []
  const recentPrior = priorTests.slice(0, BASELINE_WINDOW)
  if (recentPrior.length < MIN_HISTORY) return flags

  for (const key of Object.keys(RULES) as AnomalyKey[]) {
    const rule = RULES[key]
    const currentValue = latest[key]
    if (currentValue === undefined) continue

    const priorValues = recentPrior.map((t) => t[key]).filter((v): v is number => v !== undefined)
    if (priorValues.length < MIN_HISTORY) continue
    const baseline = priorValues.reduce((a, b) => a + b, 0) / priorValues.length
    const roundedBaseline = Math.round(baseline * 10) / 10

    let isAnomaly = false
    if (rule.absoluteThreshold !== undefined) {
      isAnomaly = Math.abs(currentValue - baseline) > rule.absoluteThreshold
    } else if (rule.relativeFactor !== undefined && baseline > 0) {
      isAnomaly = currentValue > baseline * rule.relativeFactor || currentValue < baseline / rule.relativeFactor
    }

    if (isAnomaly) {
      flags.push({
        key,
        label: rule.label,
        current: currentValue,
        baseline: roundedBaseline,
        message: `${currentValue} vs. a recent average of ${roundedBaseline} — bigger than the usual swing. Fine if you just dosed or adjusted it; worth a retest if not.`,
      })
    }
  }

  return flags
}
