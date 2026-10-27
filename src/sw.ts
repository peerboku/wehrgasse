/// <reference lib="webworker" />
// Service worker: a script the browser runs in the background, separate from the page.
// It caches the app files (so the Home Screen app starts fast), shows push
// notifications ('push') and opens the app when one is tapped ('notificationclick').
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// A new version takes over right away instead of waiting until every tab is closed
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
// At build time, self.__WB_MANIFEST is replaced with the list of all built files
precacheAndRoute(self.__WB_MANIFEST)

// A push arrived from supabase/functions/notify-done: { title, body }.
// Always show a notification: iOS cancels the subscription after "silent" pushes.
self.addEventListener('push', (event) => {
  let message = { title: 'WG-App', body: '' }
  try {
    message = { ...message, ...event.data?.json() }
  } catch {
    message.body = event.data?.text() ?? ''
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: 'icon-192.png',
    }),
  )
})

// Tapping the notification: bring the open app to the front, or start it
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const app = windows.find((client) => client.url.startsWith(self.registration.scope))
      if (app) {
        await app.focus()
      } else {
        await self.clients.openWindow(self.registration.scope)
      }
    })(),
  )
})
