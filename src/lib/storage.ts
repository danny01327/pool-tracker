import type { AppData, PoolProfile, TestEntry, SlamSession } from '../types'

export function exportDataAsJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importDataFromJson(json: string): AppData {
  const parsed = JSON.parse(json) as Partial<AppData>
  return {
    pools: parsed.pools ?? [],
    activePoolId: parsed.activePoolId ?? null,
    tests: parsed.tests ?? [],
    slamSessions: parsed.slamSessions ?? [],
  }
}

export function testsForPool(data: AppData, poolId: string): TestEntry[] {
  return data.tests
    .filter((t) => t.poolId === poolId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function activeSessionForPool(data: AppData, poolId: string): SlamSession | undefined {
  return data.slamSessions.find((s) => s.poolId === poolId && !s.completedAt)
}

export function findPool(data: AppData, poolId: string | null): PoolProfile | undefined {
  if (!poolId) return undefined
  return data.pools.find((p) => p.id === poolId)
}
