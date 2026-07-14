export type SurfaceType = 'plaster' | 'vinyl' | 'fiberglass' | 'other'
export type SanitizerType = 'chlorine' | 'salt'

export interface PoolProfile {
  id: string
  name: string
  volumeGallons: number
  surfaceType: SurfaceType
  sanitizerType: SanitizerType
  hasBorates: boolean
  createdAt: string
}

export interface TestEntry {
  id: string
  poolId: string
  timestamp: string
  fc?: number
  cc?: number
  ph?: number
  ta?: number
  ch?: number
  cya?: number
  salt?: number
  waterTempF?: number
  notes?: string
}

export type ParamKey = 'fc' | 'ph' | 'ta' | 'ch' | 'cya' | 'salt' | 'borates'

export type ParamStatus = 'low' | 'ok' | 'high' | 'unknown'

export interface ParamAssessment {
  key: ParamKey
  label: string
  value: number | undefined
  unit: string
  status: ParamStatus
  targetMin: number
  targetMax: number
  message: string
  priority: number
}

export interface DoseRecommendation {
  key: ParamKey
  chemical: string
  amount: number
  unit: string
  instructions: string
}

export interface SlamDailyCheck {
  id: string
  date: string
  fc: number
  ph?: number
  cc?: number
  cloudy: boolean
  oclt: 'pass' | 'fail' | 'not-tested'
  notes?: string
}

export interface SlamSession {
  id: string
  poolId: string
  startedAt: string
  cyaAtStart: number
  completedAt?: string
  dailyChecks: SlamDailyCheck[]
}

export interface AppData {
  pools: PoolProfile[]
  activePoolId: string | null
  tests: TestEntry[]
  slamSessions: SlamSession[]
}
