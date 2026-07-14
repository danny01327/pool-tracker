import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { AppData, PoolProfile, TestEntry, SlamSession } from '../types'
import { loadData, saveData } from './storage'

interface AppDataApi {
  data: AppData
  activePool: PoolProfile | undefined
  setActivePoolId: (id: string) => void
  addPool: (pool: Omit<PoolProfile, 'id' | 'createdAt'>) => PoolProfile
  updatePool: (id: string, updates: Partial<PoolProfile>) => void
  deletePool: (id: string) => void
  addTest: (test: Omit<TestEntry, 'id'>) => TestEntry
  updateTest: (id: string, updates: Partial<TestEntry>) => void
  deleteTest: (id: string) => void
  startSlamSession: (poolId: string, cyaAtStart: number) => SlamSession
  updateSlamSession: (id: string, updates: Partial<SlamSession>) => void
  replaceAll: (data: AppData) => void
}

const AppDataCtx = createContext<AppDataApi | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const activePool = useMemo(
    () => data.pools.find((p) => p.id === data.activePoolId),
    [data.pools, data.activePoolId],
  )

  const api: AppDataApi = {
    data,
    activePool,
    setActivePoolId: (id) => setData((d) => ({ ...d, activePoolId: id })),
    addPool: (pool) => {
      const newPool: PoolProfile = { ...pool, id: uuid(), createdAt: new Date().toISOString() }
      setData((d) => ({
        ...d,
        pools: [...d.pools, newPool],
        activePoolId: d.activePoolId ?? newPool.id,
      }))
      return newPool
    },
    updatePool: (id, updates) => {
      setData((d) => ({
        ...d,
        pools: d.pools.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }))
    },
    deletePool: (id) => {
      setData((d) => ({
        ...d,
        pools: d.pools.filter((p) => p.id !== id),
        tests: d.tests.filter((t) => t.poolId !== id),
        slamSessions: d.slamSessions.filter((s) => s.poolId !== id),
        activePoolId: d.activePoolId === id ? (d.pools.find((p) => p.id !== id)?.id ?? null) : d.activePoolId,
      }))
    },
    addTest: (test) => {
      const newTest: TestEntry = { ...test, id: uuid() }
      setData((d) => ({ ...d, tests: [...d.tests, newTest] }))
      return newTest
    },
    updateTest: (id, updates) => {
      setData((d) => ({
        ...d,
        tests: d.tests.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }))
    },
    deleteTest: (id) => {
      setData((d) => ({ ...d, tests: d.tests.filter((t) => t.id !== id) }))
    },
    startSlamSession: (poolId, cyaAtStart) => {
      const session: SlamSession = {
        id: uuid(),
        poolId,
        startedAt: new Date().toISOString(),
        cyaAtStart,
        dailyChecks: [],
      }
      setData((d) => ({ ...d, slamSessions: [...d.slamSessions, session] }))
      return session
    },
    updateSlamSession: (id, updates) => {
      setData((d) => ({
        ...d,
        slamSessions: d.slamSessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }))
    },
    replaceAll: (newData) => setData(newData),
  }

  return <AppDataCtx.Provider value={api}>{children}</AppDataCtx.Provider>
}

export function useAppData(): AppDataApi {
  const ctx = useContext(AppDataCtx)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
