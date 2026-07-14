import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppData } from '../lib/AppDataContext'
import { testsForPool, activeSessionForPool } from '../lib/storage'
import { getSlamFcTarget } from '../lib/slam'
import { evaluateSlamCheck, isSlamComplete, daysInSlam, getNextRetestDue } from '../lib/slam'
import type { SlamDailyCheck } from '../types'

const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window

export default function Slam() {
  const { data, activePool, startSlamSession, updateSlamSession } = useAppData()
  const [startCya, setStartCya] = useState('')

  // form state for adding a daily check
  const [checkFc, setCheckFc] = useState('')
  const [checkPh, setCheckPh] = useState('')
  const [checkCc, setCheckCc] = useState('')
  const [checkCloudy, setCheckCloudy] = useState(false)
  const [checkOclt, setCheckOclt] = useState<'pass' | 'fail' | 'not-tested'>('not-tested')
  const [checkNotes, setCheckNotes] = useState('')
  const [, forceTick] = useState(0)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationsSupported ? Notification.permission : 'unsupported',
  )

  const session = activePool ? activeSessionForPool(data, activePool.id) : undefined

  // Force a re-render every minute so the "next retest due" countdown and its
  // overdue styling stay accurate without any other state changing.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Best-effort local notification for the next retest — only fires if the
  // tab/PWA stays open and the OS doesn't suspend it; there's no push server
  // behind this, so it can't wake a closed app.
  useEffect(() => {
    if (!session || notifPermission !== 'granted') return
    const dueInMs = getNextRetestDue(session).getTime() - Date.now()
    if (dueInMs <= 0) return
    const timeoutId = setTimeout(() => {
      new Notification('Pool Boy — SLAM retest due', { body: 'Time to retest FC and redose if it has dropped.' })
    }, dueInMs)
    return () => clearTimeout(timeoutId)
  }, [session, notifPermission])

  if (!activePool) return null

  const latestTest = testsForPool(data, activePool.id)[0]

  if (!session) {
    const defaultCya = latestTest?.cya ?? 30
    const shockTarget = getSlamFcTarget(Number(startCya) || defaultCya, activePool.sanitizerType)
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-xl font-semibold">SLAM mode</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          SLAM (Shock Level And Maintain) is the TFP process for clearing algae or cloudy water. You hold FC at or
          above a CYA-based shock level around the clock — retesting every couple of hours during the day and
          redosing immediately if it drops — run the filter 24/7, and brush daily. You exit only when, on the same
          day, all three hold: overnight chlorine loss (OCLT) of 1 ppm or less, combined chlorine (CC) of 0.5 ppm or
          less, and water clear enough to see a white object 8 feet down.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">Current CYA (ppm)</label>
          <input
            type="number"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            value={startCya}
            onChange={(e) => setStartCya(e.target.value)}
            placeholder={String(defaultCya)}
          />
        </div>
        <p className="text-sm">
          Shock FC target: <span className="font-bold">{shockTarget} ppm</span>
        </p>
        <button
          onClick={() =>
            startSlamSession(activePool.id, Number(startCya) || defaultCya).catch((err) =>
              alert(`Failed to start SLAM: ${err.message ?? err}`),
            )
          }
          className="rounded bg-rose-600 text-white px-4 py-2 font-medium hover:bg-rose-700"
        >
          Start SLAM
        </button>
      </div>
    )
  }

  const shockTarget = getSlamFcTarget(session.cyaAtStart, activePool.sanitizerType)
  const complete = isSlamComplete(session)
  const sortedChecks = [...session.dailyChecks].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const nextDue = getNextRetestDue(session)
  const overdue = nextDue.getTime() <= Date.now()

  function addCheck() {
    if (checkFc === '') return
    const newCheck: SlamDailyCheck = {
      id: uuid(),
      date: new Date().toISOString(),
      fc: Number(checkFc),
      ph: checkPh === '' ? undefined : Number(checkPh),
      cc: checkCc === '' ? undefined : Number(checkCc),
      cloudy: checkCloudy,
      oclt: checkOclt,
      notes: checkNotes.trim() || undefined,
    }
    updateSlamSession(session!.id, { dailyChecks: [...session!.dailyChecks, newCheck] }).catch((err) =>
      alert(`Failed to save check: ${err.message ?? err}`),
    )
    setCheckFc('')
    setCheckPh('')
    setCheckCc('')
    setCheckCloudy(false)
    setCheckOclt('not-tested')
    setCheckNotes('')
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">SLAM in progress</h1>
        <span className="text-sm text-gray-500">Day {daysInSlam(session)}</span>
      </div>

      <div className="rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 p-3">
        <p>
          Keep FC at or above <span className="font-bold">{shockTarget} ppm</span> at all times. Retest every 2 hours
          during the day and redose immediately if it drops below target. Run the filter 24/7 and brush daily.
        </p>
      </div>

      <div
        className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${
          overdue
            ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            : 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
        }`}
      >
        <span className="font-medium">
          {overdue ? 'Retest overdue — ' : 'Next retest due '}
          {nextDue.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={() => Notification.requestPermission().then(setNotifPermission)}
            className="text-xs underline shrink-0"
          >
            Enable alerts
          </button>
        )}
      </div>

      {complete && (
        <div className="rounded-lg border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 space-y-2">
          <p className="font-medium text-emerald-700 dark:text-emerald-300">
            Exit criteria met! Run the filter 24-48 more hours, clean/backwash the filter, then return to normal FC/CYA
            targets.
          </p>
          <button
            onClick={() =>
              updateSlamSession(session.id, { completedAt: new Date().toISOString() }).catch((err) =>
                alert(`Failed to update SLAM session: ${err.message ?? err}`),
              )
            }
            className="rounded bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700"
          >
            Mark SLAM complete
          </button>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
        <h2 className="font-medium">Add today's check</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">FC (ppm)</label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
              value={checkFc}
              onChange={(e) => setCheckFc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">pH</label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
              value={checkPh}
              onChange={(e) => setCheckPh(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CC (ppm)</label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
              value={checkCc}
              onChange={(e) => setCheckCc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overnight loss test (OCLT)</label>
            <select
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
              value={checkOclt}
              onChange={(e) => setCheckOclt(e.target.value as typeof checkOclt)}
            >
              <option value="not-tested">Not tested</option>
              <option value="pass">Pass (≤1 ppm loss)</option>
              <option value="fail">Fail (&gt;1 ppm loss)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="cloudy"
            type="checkbox"
            checked={checkCloudy}
            onChange={(e) => setCheckCloudy(e.target.checked)}
          />
          <label htmlFor="cloudy" className="text-sm">
            Water is still cloudy / can't see 8ft down
          </label>
        </div>
        <textarea
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
          rows={2}
          placeholder="Notes"
          value={checkNotes}
          onChange={(e) => setCheckNotes(e.target.value)}
        />
        <button onClick={addCheck} className="rounded bg-sky-600 text-white px-4 py-2 font-medium hover:bg-sky-700">
          Save check
        </button>
      </div>

      {sortedChecks.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium">Check history</h2>
          {sortedChecks.map((c) => {
            const ev = evaluateSlamCheck(c)
            return (
              <div key={c.id} className="rounded border border-gray-200 dark:border-gray-800 p-2 text-sm">
                <div className="flex justify-between">
                  <span>{new Date(c.date).toLocaleString()}</span>
                  <span className={ev.allPass ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
                    {ev.allPass ? 'All criteria pass' : 'Not yet'}
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  FC {c.fc}{c.ph !== undefined ? ` · pH ${c.ph}` : ''}{c.cc !== undefined ? ` · CC ${c.cc}` : ''} · OCLT {c.oclt} · {c.cloudy ? 'cloudy' : 'clear'}
                </div>
                {c.notes && <div className="text-gray-500 italic">{c.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
