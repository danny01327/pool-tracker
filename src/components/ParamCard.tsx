import type { ParamAssessment } from '../types'
import { round1 } from '../lib/chemistry'

const STATUS_STYLES: Record<ParamAssessment['status'], string> = {
  low: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40',
  ok: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  high: 'border-rose-400 bg-rose-50 dark:bg-rose-950/40',
  unknown: 'border-gray-300 bg-gray-50 dark:bg-gray-900',
}

const STATUS_LABEL: Record<ParamAssessment['status'], string> = {
  low: 'LOW',
  ok: 'OK',
  high: 'HIGH',
  unknown: '—',
}

export default function ParamCard({ assessment }: { assessment: ParamAssessment }) {
  return (
    <div className={`rounded-lg border-l-4 p-3 ${STATUS_STYLES[assessment.status]}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{assessment.label}</span>
        <span className="text-xs font-semibold tracking-wide">{STATUS_LABEL[assessment.status]}</span>
      </div>
      <div className="text-2xl font-bold mt-1">
        {assessment.value !== undefined ? round1(assessment.value) : '—'}
        <span className="text-sm font-normal ml-1 text-gray-500">{assessment.unit}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
        Target: {round1(assessment.targetMin)}–{round1(assessment.targetMax)} {assessment.unit}
      </p>
      {assessment.message && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{assessment.message}</p>}
    </div>
  )
}
