/// <reference lib="webworker" />
// Service worker: a script the browser runs in the background, separate from the page.
// Phase 1: it only caches the app files, so the Home Screen app starts fast.
// Phase 4 adds 'push' (show the notification) and 'notificationclick' (open the app).
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// A new version takes over right away instead of waiting until every tab is closed
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
// At build time, self.__WB_MANIFEST is replaced with the list of all built files
precacheAndRoute(self.__WB_MANIFEST)
