// Every meaningful action is logged as an event (see CLAUDE.md, "Event logging").
// Phase 1 (mock): events only go to the browser console.
// Phase 3: this function inserts into the `events` table instead.

export type EventType = 'app_open' | 'login' | 'chore_done' | 'push_subscribed' | 'push_sent' | 'push_failed'

export function logEvent(type: EventType, payload: Record<string, unknown> = {}): void {
  console.info('[event]', type, payload)
}
