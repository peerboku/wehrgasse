// Turning push notifications on and off on this phone.
// The browser asks Apple's push service for a "subscription" (an address for this
// phone), and we store it in push_subscriptions. supabase/functions/notify-done
// sends to those addresses. Background: docs/learning/07-web-push-keys.md
import { deletePushSubscription, savePushSubscription } from './data'
import { logEvent } from './events'

export type EnableResult = 'on' | 'denied' | 'error'

/** False in Safari on the iPhone until the app is opened from the Home Screen. */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function isPushOn(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  return (await currentSubscription()) !== null
}

/** Call this only from a tap: iOS refuses to ask for permission otherwise. */
export async function enablePush(memberId: string): Promise<EnableResult> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const registration = await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true, // promise: every push shows a notification (required by Safari)
        applicationServerKey: base64UrlToBytes(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      }))

    await savePushSubscription(memberId, subscription)
    logEvent('push_subscribed', { endpoint_host: new URL(subscription.endpoint).host })
    return 'on'
  } catch (error) {
    console.warn('[push] enable failed:', error)
    return 'error'
  }
}

/** Best effort: removes the subscription on this phone and in the database. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  try {
    const subscription = await currentSubscription()
    if (!subscription) return
    await deletePushSubscription(subscription.endpoint)
    await subscription.unsubscribe()
  } catch (error) {
    console.warn('[push] disable failed:', error)
  }
}

// The VAPID public key is written in base64url (letters, digits, - and _).
// The browser wants the raw bytes.
function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}
