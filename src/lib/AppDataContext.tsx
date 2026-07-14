import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { AppData, PoolProfile, TestEntry, SlamSession } from '../types'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { enqueueOp, isNetworkError, loadQueue, saveQueue, type QueuedOp, type QueuedTable } from './offlineQueue'

const ACTIVE_POOL_KEY = 'pool-tracker:activePoolId'

// ---------------------------------------------------------------------------
// Row <-> app-model mapping (Postgres uses snake_case, the app uses camelCase)
// ---------------------------------------------------------------------------
function poolFromRow(row: any): PoolProfile {
  return {
    id: row.id,
    name: row.name,
    volumeGallons: row.volume_gallons,
    surfaceType: row.surface_type,
    sanitizerType: row.sanitizer_type,
    hasBorates: row.has_borates,
    createdAt: row.created_at,
  }
}

function poolToRow(pool: Partial<PoolProfile>) {
  const row: Record<string, unknown> = {}
  if (pool.name !== undefined) row.name = pool.name
  if (pool.volumeGallons !== undefined) row.volume_gallons = pool.volumeGallons
  if (pool.surfaceType !== undefined) row.surface_type = pool.surfaceType
  if (pool.sanitizerType !== undefined) row.sanitizer_type = pool.sanitizerType
  if (pool.hasBorates !== undefined) row.has_borates = pool.hasBorates
  return row
}

function testFromRow(row: any): TestEntry {
  return {
    id: row.id,
    poolId: row.pool_id,
    timestamp: row.timestamp,
    fc: row.fc ?? undefined,
    cc: row.cc ?? undefined,
    ph: row.ph ?? undefined,
    ta: row.ta ?? undefined,
    ch: row.ch ?? undefined,
    cya: row.cya ?? undefined,
    salt: row.salt ?? undefined,
    tds: row.tds ?? undefined,
    waterTempF: row.water_temp_f ?? undefined,
    notes: row.notes ?? undefined,
  }
}

function testToRow(test: Partial<TestEntry>) {
  const row: Record<string, unknown> = {}
  if (test.poolId !== undefined) row.pool_id = test.poolId
  if (test.timestamp !== undefined) row.timestamp = test.timestamp
  if (test.fc !== undefined) row.fc = test.fc
  if (test.cc !== undefined) row.cc = test.cc
  if (test.ph !== undefined) row.ph = test.ph
  if (test.ta !== undefined) row.ta = test.ta
  if (test.ch !== undefined) row.ch = test.ch
  if (test.cya !== undefined) row.cya = test.cya
  if (test.salt !== undefined) row.salt = test.salt
  if (test.tds !== undefined) row.tds = test.tds
  if (test.waterTempF !== undefined) row.water_temp_f = test.waterTempF
  if (test.notes !== undefined) row.notes = test.notes
  return row
}

function slamFromRow(row: any): SlamSession {
  return {
    id: row.id,
    poolId: row.pool_id,
    startedAt: row.started_at,
    cyaAtStart: row.cya_at_start,
    completedAt: row.completed_at ?? undefined,
    dailyChecks: row.daily_checks ?? [],
  }
}

function slamToRow(session: Partial<SlamSession>) {
  const row: Record<string, unknown> = {}
  if (session.poolId !== undefined) row.pool_id = session.poolId
  if (session.startedAt !== undefined) row.started_at = session.startedAt
  if (session.cyaAtStart !== undefined) row.cya_at_start = session.cyaAtStart
  if (session.completedAt !== undefined) row.completed_at = session.completedAt
  if (session.dailyChecks !== undefined) row.daily_checks = session.dailyChecks
  return row
}

function emptyData(): AppData {
  return { pools: [], activePoolId: null, tests: [], slamSessions: [] }
}

async function performOp(op: QueuedOp): Promise<void> {
  if (op.action === 'insert') {
    const { error } = await supabase.from(op.table).insert(op.data!)
    if (error) throw error
  } else if (op.action === 'update') {
    const { error } = await supabase.from(op.table).update(op.data!).eq('id', op.rowId)
    if (error) throw error
  } else {
    const { error } = await supabase.from(op.table).delete().eq('id', op.rowId)
    if (error) throw error
  }
}

interface AppDataApi {
  data: AppData
  loading: boolean
  pendingSyncCount: number
  activePool: PoolProfile | undefined
  setActivePoolId: (id: string) => void
  addPool: (pool: Omit<PoolProfile, 'id' | 'createdAt'>) => Promise<PoolProfile>
  updatePool: (id: string, updates: Partial<PoolProfile>) => Promise<void>
  deletePool: (id: string) => Promise<void>
  addTest: (test: Omit<TestEntry, 'id'>) => Promise<TestEntry>
  updateTest: (id: string, updates: Partial<TestEntry>) => Promise<void>
  deleteTest: (id: string) => Promise<void>
  startSlamSession: (poolId: string, cyaAtStart: number) => Promise<SlamSession>
  updateSlamSession: (id: string, updates: Partial<SlamSession>) => Promise<void>
  importBackup: (imported: AppData) => Promise<void>
  refresh: () => Promise<void>
  retrySync: () => Promise<void>
}

const AppDataCtx = createContext<AppDataApi | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<AppData>(() => emptyData())
  const [loading, setLoading] = useState(true)
  const [pendingSyncCount, setPendingSyncCount] = useState(() => loadQueue().length)
  const flushingRef = useRef(false)

  async function fetchAll() {
    if (!user) {
      setData(emptyData())
      setLoading(false)
      return
    }
    setLoading(true)
    const [poolsRes, testsRes, slamRes] = await Promise.all([
      supabase.from('pools').select('*').order('created_at', { ascending: true }),
      supabase.from('tests').select('*'),
      supabase.from('slam_sessions').select('*'),
    ])
    if (poolsRes.error) console.error('Failed to load pools', poolsRes.error)
    if (testsRes.error) console.error('Failed to load tests', testsRes.error)
    if (slamRes.error) console.error('Failed to load SLAM sessions', slamRes.error)

    const pools = (poolsRes.data ?? []).map(poolFromRow)
    const storedActiveId = localStorage.getItem(ACTIVE_POOL_KEY)
    const activePoolId = pools.find((p) => p.id === storedActiveId)?.id ?? pools[0]?.id ?? null

    setData({
      pools,
      activePoolId,
      tests: (testsRes.data ?? []).map(testFromRow),
      slamSessions: (slamRes.data ?? []).map(slamFromRow),
    })
    setLoading(false)
  }

  async function flushQueue() {
    if (flushingRef.current || !navigator.onLine) return
    flushingRef.current = true
    let processedAny = false
    try {
      let queue = loadQueue()
      while (queue.length > 0) {
        const op = queue[0]
        try {
          await performOp(op)
          processedAny = true
        } catch (err) {
          if (isNetworkError(err)) break
          console.error('Dropping queued operation that failed for a non-network reason', op, err)
        }
        queue = queue.slice(1)
        saveQueue(queue)
      }
    } finally {
      flushingRef.current = false
      setPendingSyncCount(loadQueue().length)
      if (processedAny) await fetchAll()
    }
  }

  useEffect(() => {
    fetchAll().then(() => flushQueue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    window.addEventListener('online', flushQueue)
    const interval = setInterval(flushQueue, 30000)
    return () => {
      window.removeEventListener('online', flushQueue)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const activePool = useMemo(() => data.pools.find((p) => p.id === data.activePoolId), [data.pools, data.activePoolId])

  function setActivePoolId(id: string) {
    localStorage.setItem(ACTIVE_POOL_KEY, id)
    setData((d) => ({ ...d, activePoolId: id }))
  }

  /** Try a write immediately; if it fails for network reasons, queue it for later instead of throwing. */
  async function writeOrQueue(table: QueuedTable, action: QueuedOp['action'], rowId: string, opData?: Record<string, unknown>) {
    const op: QueuedOp = { id: uuid(), table, action, rowId, data: opData }
    try {
      await performOp(op)
    } catch (err) {
      if (!isNetworkError(err)) throw err
      enqueueOp(op)
      setPendingSyncCount(loadQueue().length)
    }
  }

  async function addPool(pool: Omit<PoolProfile, 'id' | 'createdAt'>) {
    if (!user) throw new Error('Not signed in')
    const id = uuid()
    const createdAt = new Date().toISOString()
    const newPool: PoolProfile = { ...pool, id, createdAt }
    setData((d) => ({ ...d, pools: [...d.pools, newPool], activePoolId: d.activePoolId ?? newPool.id }))
    if (!data.activePoolId) localStorage.setItem(ACTIVE_POOL_KEY, newPool.id)
    await writeOrQueue('pools', 'insert', id, { ...poolToRow(pool), id, user_id: user.id, created_at: createdAt })
    return newPool
  }

  async function updatePool(id: string, updates: Partial<PoolProfile>) {
    setData((d) => ({ ...d, pools: d.pools.map((p) => (p.id === id ? { ...p, ...updates } : p)) }))
    await writeOrQueue('pools', 'update', id, poolToRow(updates))
  }

  async function deletePool(id: string) {
    setData((d) => {
      const pools = d.pools.filter((p) => p.id !== id)
      const activePoolId = d.activePoolId === id ? (pools[0]?.id ?? null) : d.activePoolId
      if (activePoolId) localStorage.setItem(ACTIVE_POOL_KEY, activePoolId)
      return {
        ...d,
        pools,
        tests: d.tests.filter((t) => t.poolId !== id),
        slamSessions: d.slamSessions.filter((s) => s.poolId !== id),
        activePoolId,
      }
    })
    await writeOrQueue('pools', 'delete', id)
  }

  async function addTest(test: Omit<TestEntry, 'id'>) {
    if (!user) throw new Error('Not signed in')
    const id = uuid()
    const newTest: TestEntry = { ...test, id }
    setData((d) => ({ ...d, tests: [...d.tests, newTest] }))
    await writeOrQueue('tests', 'insert', id, { ...testToRow(test), id, user_id: user.id })
    return newTest
  }

  async function updateTest(id: string, updates: Partial<TestEntry>) {
    setData((d) => ({ ...d, tests: d.tests.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))
    await writeOrQueue('tests', 'update', id, testToRow(updates))
  }

  async function deleteTest(id: string) {
    setData((d) => ({ ...d, tests: d.tests.filter((t) => t.id !== id) }))
    await writeOrQueue('tests', 'delete', id)
  }

  async function startSlamSession(poolId: string, cyaAtStart: number) {
    if (!user) throw new Error('Not signed in')
    const id = uuid()
    const startedAt = new Date().toISOString()
    const session: SlamSession = { id, poolId, startedAt, cyaAtStart, dailyChecks: [] }
    setData((d) => ({ ...d, slamSessions: [...d.slamSessions, session] }))
    await writeOrQueue('slam_sessions', 'insert', id, {
      id,
      pool_id: poolId,
      cya_at_start: cyaAtStart,
      started_at: startedAt,
      user_id: user.id,
    })
    return session
  }

  async function updateSlamSession(id: string, updates: Partial<SlamSession>) {
    setData((d) => ({
      ...d,
      slamSessions: d.slamSessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }))
    await writeOrQueue('slam_sessions', 'update', id, slamToRow(updates))
  }

  async function importBackup(imported: AppData) {
    if (!user) throw new Error('Not signed in')
    const poolIdMap = new Map<string, string>()
    for (const pool of imported.pools) {
      const { data: row, error } = await supabase
        .from('pools')
        .insert({ ...poolToRow(pool), user_id: user.id })
        .select()
        .single()
      if (error || !row) throw error ?? new Error('Failed to import a pool')
      poolIdMap.set(pool.id, row.id)
    }
    for (const test of imported.tests) {
      const newPoolId = poolIdMap.get(test.poolId)
      if (!newPoolId) continue
      const { error } = await supabase
        .from('tests')
        .insert({ ...testToRow({ ...test, poolId: newPoolId }), user_id: user.id })
      if (error) throw error
    }
    for (const session of imported.slamSessions) {
      const newPoolId = poolIdMap.get(session.poolId)
      if (!newPoolId) continue
      const { error } = await supabase
        .from('slam_sessions')
        .insert({ ...slamToRow({ ...session, poolId: newPoolId }), user_id: user.id })
      if (error) throw error
    }
    await fetchAll()
  }

  const api: AppDataApi = {
    data,
    loading,
    pendingSyncCount,
    activePool,
    setActivePoolId,
    addPool,
    updatePool,
    deletePool,
    addTest,
    updateTest,
    deleteTest,
    startSlamSession,
    updateSlamSession,
    importBackup,
    refresh: fetchAll,
    retrySync: flushQueue,
  }

  return <AppDataCtx.Provider value={api}>{children}</AppDataCtx.Provider>
}

export function useAppData(): AppDataApi {
  const ctx = useContext(AppDataCtx)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
