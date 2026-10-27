// Reading and writing our tables. Screens never talk to Supabase directly.
import { supabase } from './supabaseClient'
import type { Photos } from './photos'
import type { Assignment, Chore, Member, RotationRow } from './types'

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

/** The fixed 4-week cycle. Used for the "Ab Montag" preview, next week's rows don't exist yet. */
export async function loadRotation(): Promise<RotationRow[]> {
  const { data, error } = await supabase.from('rotation_template').select('cycle_week, chore_id, member_id')
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

/** For each chore its newest done assignment (when and by whom it was done last). Never-done chores are missing. */
export async function loadLastDone(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, week_start, chore_id, member_id, done_at, done_by')
    .not('done_at', 'is', null)
    .order('done_at', { ascending: false })
  if (error) throw error
  // Newest first, so the first row we meet per chore is the last time it was done
  const newest = new Map<string, Assignment>()
  for (const row of data) {
    if (!newest.has(row.chore_id)) newest.set(row.chore_id, row)
  }
  return [...newest.values()]
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

/**
 * "Ich übernehm das": this week's open assignment becomes memberId's. The database
 * function take_over() checks "this week + still open" (migration 20261027180000).
 */
export async function takeOver(assignmentId: string, memberId: string): Promise<void> {
  const { error } = await supabase.rpc('take_over', { p_assignment_id: assignmentId, p_member_id: memberId })
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

// Profile photos: private bucket, one file <member_id>.jpg each (docs/decisions/0010)
const photoBucket = () => supabase.storage.from('avatars')

/**
 * Downloads all photos with the WG login and turns each into an object URL
 * (a "blob:" address that only works inside this app). A photo that fails to
 * load is left out, so that member keeps their emoji.
 */
export async function loadPhotos(): Promise<Photos> {
  const { data: files, error } = await photoBucket().list()
  if (error) throw error
  const photos: Photos = {}
  await Promise.all(
    files
      .filter((file) => file.name.endsWith('.jpg'))
      .map(async (file) => {
      // cacheNonce: a new photo gets a new address, so the browser can't show the old one
      const { data: blob } = await photoBucket().download(file.name, { cacheNonce: file.updated_at ?? undefined })
      if (blob) photos[file.name.replace('.jpg', '')] = URL.createObjectURL(blob)
    }),
  )
  return photos
}

export async function savePhoto(memberId: string, photo: Blob): Promise<void> {
  const { error } = await photoBucket().upload(`${memberId}.jpg`, photo, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
}

export async function deletePhoto(memberId: string): Promise<void> {
  const { error } = await photoBucket().remove([`${memberId}.jpg`])
  if (error) throw error
}

export function byId<T extends { id: string }>(list: T[], id: string): T {
  return list.find((item) => item.id === id)!
}
