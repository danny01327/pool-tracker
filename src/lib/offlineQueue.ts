const QUEUE_KEY = 'pool-boy:outbox'

export type QueuedTable = 'pools' | 'tests' | 'slam_sessions'
export type QueuedAction = 'insert' | 'update' | 'delete'

export interface QueuedOp {
  id: string
  table: QueuedTable
  action: QueuedAction
  rowId: string
  data?: Record<string, unknown>
}

export function loadQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveQueue(queue: QueuedOp[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Adds an operation to the outbox, collapsing it against anything already
 * queued for the same row so replay stays small and correct:
 *  - an update folds into a still-queued insert for the same row
 *  - a delete cancels a still-queued insert outright (nothing to send), and
 *    drops any queued updates for that row (moot once it's deleted)
 */
export function enqueueOp(op: QueuedOp): void {
  const queue = loadQueue()

  if (op.action === 'update') {
    const insertIdx = queue.findIndex((q) => q.table === op.table && q.action === 'insert' && q.rowId === op.rowId)
    if (insertIdx !== -1) {
      queue[insertIdx] = { ...queue[insertIdx], data: { ...queue[insertIdx].data, ...op.data } }
      saveQueue(queue)
      return
    }
  }

  if (op.action === 'delete') {
    const insertIdx = queue.findIndex((q) => q.table === op.table && q.action === 'insert' && q.rowId === op.rowId)
    const withoutUpdates = queue.filter((q) => !(q.table === op.table && q.rowId === op.rowId && q.action === 'update'))
    if (insertIdx !== -1) {
      saveQueue(withoutUpdates.filter((q) => q.id !== queue[insertIdx].id))
    } else {
      saveQueue([...withoutUpdates, op])
    }
    return
  }

  queue.push(op)
  saveQueue(queue)
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message =
    err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err)
  return /failed to fetch|networkerror|network request failed|load failed/i.test(message)
}
