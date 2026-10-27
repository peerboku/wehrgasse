// Reading and writing our tables. Screens never talk to Supabase directly.
import { supabase } from './supabaseClient'
import type { Assignment, Chore, Member } from './types'

export async function loadMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('id, name, emoji, color').order('name')
  if (error) throw error
  return data
}

export async function loadChores(): Promise<Chore[]> {
  const { data, error } = await supabase.from('chores').select('id, name, icon, sort_order').order('sort_order')
  if (error) throw error
  return data
}

/** All assignments of this week, plus older ones that are still open (overdue). */
export async function loadAssignments(currentWeek: string): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, week_start, chore_id, member_id, done_at, done_by')
    .or(`week_start.eq.${currentWeek},done_at.is.null`)
    .lte('week_start', currentWeek)
  if (error) throw error
  return data
}

/** `.is('done_at', null)`: a second tap (or a second phone) can't overwrite the first time. */
export async function markDone(assignmentId: string, memberId: string, doneAt: string): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .update({ done_at: doneAt, done_by: memberId })
    .eq('id', assignmentId)
    .is('done_at', null)
  if (error) throw error
}

/** Calls onChange whenever any assignment changes. Returns a function that stops listening. */
export function onAssignmentsChange(onChange: () => void): () => void {
  const channel = supabase
    .channel('assignments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Stores this phone's push subscription for a member. Delete first, then insert:
 * the endpoint is unique, and it may already be saved (same phone, maybe another name).
 */
export async function savePushSubscription(memberId: string, subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('push subscription without keys')
  await deletePushSubscription(endpoint)
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ member_id: memberId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
  if (error) throw error
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}

export function byId<T extends { id: string }>(list: T[], id: string): T {
  return list.find((item) => item.id === id)!
}
