// Scheduled function (invoked by pg_cron every ~15 min) that checks for due
// reminders — "haven't tested in a while" and "SLAM retest is due" — and
// sends a Web Push notification to each of that user's subscribed devices.
//
// Auth: this endpoint isn't tied to any one user's session (it's called by
// pg_cron, not a browser), so it's protected by a shared secret header
// instead of a user JWT. Internally it uses the service role key so it can
// see every user's pools/tests/SLAM sessions, bypassing RLS on purpose.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const TEST_DUE_DAYS = 4
const TEST_DUE_COOLDOWN_HOURS = 20
const SLAM_RETEST_HOURS = 2
const SLAM_RETEST_COOLDOWN_HOURS = 1.5

interface PushSub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

async function sendToUser(admin: ReturnType<typeof createClient>, userId: string, title: string, body: string, url: string) {
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', userId)
  for (const sub of (subs ?? []) as PushSub[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url }),
      )
    } catch (err: any) {
      // 404/410 = subscription is gone (unsubscribed, expired, browser data cleared) — clean it up.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('Push failed for subscription', sub.id, err)
      }
    }
  }
}

async function alreadyNotified(admin: ReturnType<typeof createClient>, kind: string, refId: string, cooldownHours: number) {
  const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('kind', kind)
    .eq('ref_id', refId)
    .gte('sent_at', since)
  return (count ?? 0) > 0
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  let testDueSent = 0
  let slamSent = 0

  // --- Test-due reminders --------------------------------------------------
  const { data: pools } = await admin.from('pools').select('id, user_id, name')
  for (const pool of pools ?? []) {
    const { data: latestTests } = await admin
      .from('tests')
      .select('timestamp')
      .eq('pool_id', pool.id)
      .order('timestamp', { ascending: false })
      .limit(1)
    const latest = latestTests?.[0]
    if (!latest) continue
    const daysSince = (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < TEST_DUE_DAYS) continue
    if (await alreadyNotified(admin, 'test_due', pool.id, TEST_DUE_COOLDOWN_HOURS)) continue

    await sendToUser(
      admin,
      pool.user_id,
      'Pool Boy',
      `It's been ${Math.floor(daysSince)} days since you tested ${pool.name}. Chemistry can drift fast — test soon.`,
      '/',
    )
    await admin.from('notification_log').insert({ user_id: pool.user_id, kind: 'test_due', ref_id: pool.id })
    testDueSent++
  }

  // --- SLAM retest reminders -------------------------------------------------
  const { data: sessions } = await admin
    .from('slam_sessions')
    .select('id, user_id, pool_id, started_at, daily_checks, pools(name)')
    .is('completed_at', null)
  for (const session of sessions ?? []) {
    const checks = (session.daily_checks ?? []) as Array<{ date: string }>
    const lastCheckTime = checks.length > 0 ? new Date(checks[checks.length - 1].date).getTime() : new Date(session.started_at).getTime()
    const hoursSince = (Date.now() - lastCheckTime) / (1000 * 60 * 60)
    if (hoursSince < SLAM_RETEST_HOURS) continue
    if (await alreadyNotified(admin, 'slam_retest', session.id, SLAM_RETEST_COOLDOWN_HOURS)) continue

    const poolName = (session as any).pools?.name ?? 'your pool'
    await sendToUser(
      admin,
      session.user_id,
      'Pool Boy — SLAM retest due',
      `Time to retest FC for ${poolName} and redose if it's dropped below target.`,
      '/slam',
    )
    await admin.from('notification_log').insert({ user_id: session.user_id, kind: 'slam_retest', ref_id: session.id })
    slamSent++
  }

  return Response.json({ testDueSent, slamSent })
})
