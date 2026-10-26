// Every meaningful action is logged as an event (see CLAUDE.md, "Event logging").
// Logging must never break the app: errors only go to the console.
import { getMyMemberId } from './me'
import { supabase } from './supabaseClient'

export type EventType = 'app_open' | 'login' | 'chore_done' | 'push_subscribed' | 'push_sent' | 'push_failed'

export function logEvent(type: EventType, payload: Record<string, unknown> = {}): void {
  supabase
    .from('events')
    .insert({ type, payload, member_id: getMyMemberId() })
    .then(({ error }) => {
      if (error) console.warn('[event] not saved:', type, error.message)
    })
}
