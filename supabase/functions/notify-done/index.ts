// Edge Function notify-done: tells the other members what happened to a chore.
//   kind 'done':       "✅ Carla hat Bad Carla & Peer erledigt"
//   kind 'taken_over': "🔄 Noa übernimmt diese Woche Müll rausbringen (statt Peer)"
// Runs on Supabase (Deno), not in the browser. Called by the database triggers
// notify_done() (migration 20261027150000_push_webhook.sql) with { assignment_id }
// and notify_taken_over() (20261027180000_take_over.sql) with
// { kind: 'taken_over', assignment_id, from_member_id }.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// The notification text lives here and not in src/lib/strings.ts: this code runs
// on Supabase and can't import files from the app.
const TITLE = 'WG-App'
function doneText(memberName: string, choreName: string) {
  return `✅ ${memberName} hat ${choreName} erledigt`
}
function takenOverText(newName: string, choreName: string, oldName: string) {
  return `🔄 ${newName} übernimmt diese Woche ${choreName} (statt ${oldName})`
}

// Calls from the first trigger have no kind, they are always 'done'
type Kind = 'done' | 'taken_over'

// Apple keeps an undelivered push this long (seconds) if the phone is offline
const ONE_DAY = 24 * 60 * 60

type Subscription = {
  id: string
  member_id: string
  endpoint: string
  p256dh: string
  auth: string
}

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set by Supabase automatically.
// The service role skips RLS; the grants in the migration limit what it may do.
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// Sign every push with our VAPID key pair (docs/learning/07-web-push-keys.md)
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (request) => {
  // Only our database knows this secret (it reads it from Vault)
  const secret = Deno.env.get('NOTIFY_DONE_SECRET')
  if (!secret || request.headers.get('x-webhook-secret') !== secret) {
    return new Response('unauthorized', { status: 401 })
  }

  try {
    const { assignment_id: assignmentId, kind = 'done', from_member_id: fromMemberId } = await request.json()
    const result =
      kind === 'taken_over' ? await notifyTakenOver(assignmentId, fromMemberId) : await notifyDone(assignmentId)
    return Response.json(result)
  } catch (error) {
    console.error(error)
    return new Response(String(error), { status: 500 })
  }
})

async function notifyDone(assignmentId: string) {
  const assignment = await selectOne('assignments', 'chore_id, done_by', assignmentId)
  const [chore, doer] = await Promise.all([
    selectOne('chores', 'name', assignment.chore_id),
    selectOne('members', 'name', assignment.done_by),
  ])
  // Everyone except the person who did it
  return notifyAllExcept(assignment.done_by, doneText(doer.name, chore.name), assignmentId, 'done')
}

async function notifyTakenOver(assignmentId: string, fromMemberId: string) {
  const assignment = await selectOne('assignments', 'chore_id, member_id', assignmentId)
  const [chore, newOwner, oldOwner] = await Promise.all([
    selectOne('chores', 'name', assignment.chore_id),
    selectOne('members', 'name', assignment.member_id),
    selectOne('members', 'name', fromMemberId),
  ])
  // Everyone except the person who took it over, so the old owner hears it too
  const text = takenOverText(newOwner.name, chore.name, oldOwner.name)
  return notifyAllExcept(assignment.member_id, text, assignmentId, 'taken_over')
}

async function notifyAllExcept(memberId: string, text: string, assignmentId: string, kind: Kind) {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, member_id, endpoint, p256dh, auth')
    .neq('member_id', memberId)
  if (error) throw error

  const payload = JSON.stringify({ title: TITLE, body: text })
  const delivered = await Promise.all(
    subscriptions.map((subscription) => send(subscription, payload, assignmentId, kind)),
  )
  return { sent: delivered.filter(Boolean).length, total: subscriptions.length }
}

async function selectOne(table: string, columns: string, id: string) {
  const { data, error } = await supabase.from(table).select(columns).eq('id', id).single()
  if (error) throw error
  // deno-lint-ignore no-explicit-any
  return data as any
}

/** Sends one push and logs the outcome. Returns true if Apple (or Google, Mozilla) accepted it. */
async function send(subscription: Subscription, payload: string, assignmentId: string, kind: Kind): Promise<boolean> {
  const target = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }
  const details = { kind, assignment_id: assignmentId, subscription_id: subscription.id }

  try {
    const response = await webpush.sendNotification(target, payload, { TTL: ONE_DAY })
    await logEvent(subscription.member_id, 'push_sent', { ...details, status: response.statusCode })
    return true
  } catch (error) {
    const { statusCode, body, message } = error as { statusCode?: number; body?: string; message?: string }
    // 404/410 = this subscription is gone for good (app deleted, notifications turned off)
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
    }
    await logEvent(subscription.member_id, 'push_failed', {
      ...details,
      status: statusCode ?? null,
      message: String(body || message).slice(0, 300),
    })
    return false
  }
}

// member_id = the person who should have received the push
async function logEvent(memberId: string, type: 'push_sent' | 'push_failed', payload: Record<string, unknown>) {
  const { error } = await supabase.from('events').insert({ member_id: memberId, type, payload })
  if (error) console.error('[event] not saved:', type, error.message)
}
