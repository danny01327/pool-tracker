import type { PoolProfile, SlamDailyCheck, SlamSession } from '../types'
import { getFcTargets } from './chemistry'

// TFP's SLAM (Shock Level And Maintain) process for clearing algae/cloudy
// water: hold FC at or above the CYA-based shock level around the clock
// (retest every couple hours in daylight, redose immediately if it drops),
// run the filter 24/7, and brush daily. Exit only once ALL THREE hold on
// the same day:
//   1. Overnight chlorine loss (OCLT) is 1 ppm FC or less over ~8 hours.
//   2. Combined chlorine (CC) is 0.5 ppm or less.
//   3. Water is clear enough to see a white object 8ft down (e.g. main drain).

export function getSlamFcTarget(cya: number, sanitizerType: PoolProfile['sanitizerType']): number {
  const targets = getFcTargets(cya, sanitizerType)
  return Math.round(targets.shock * 10) / 10
}

export interface SlamCheckEvaluation {
  ocltOk: boolean | undefined
  ccOk: boolean | undefined
  clearOk: boolean
  allPass: boolean
}

export function evaluateSlamCheck(check: SlamDailyCheck): SlamCheckEvaluation {
  const ocltOk = check.oclt === 'not-tested' ? undefined : check.oclt === 'pass'
  const ccOk = check.cc === undefined ? undefined : check.cc <= 0.5
  const clearOk = !check.cloudy
  const allPass = ocltOk === true && ccOk === true && clearOk
  return { ocltOk, ccOk, clearOk, allPass }
}

export function isSlamComplete(session: SlamSession): boolean {
  if (session.dailyChecks.length === 0) return false
  const latest = session.dailyChecks[session.dailyChecks.length - 1]
  return evaluateSlamCheck(latest).allPass
}

export function daysInSlam(session: SlamSession): number {
  const start = new Date(session.startedAt).getTime()
  const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now()
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
}
