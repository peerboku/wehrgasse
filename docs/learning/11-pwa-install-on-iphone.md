# 11 — Progressive Web App: an app icon on the iPhone

## 1. The idea

A **Progressive Web App (PWA)** is a website that can be installed like an app: its own icon, its own window without the browser bar, and (later for us) push notifications. Three pieces make that happen:

1. **Web App Manifest** (`manifest.webmanifest`): a JSON file with name, icons, colours, and which URLs belong to the app (`start_url`, `scope`).
2. **Icons** in several sizes. iPhones use a separate **apple-touch-icon** (180×180 px, no transparency; iOS rounds the corners itself).
3. **Service worker**: a script the browser runs in the background, separate from the page. It can serve files from a cache (fast start, works offline) and receive push messages even when the app is closed.

On iPhone there's no "Install" button. People must tap **Teilen → Zum Home-Bildschirm** in Safari. Only an app opened from that icon can receive Web Push (iOS 16.4+). That's why Settings shows install steps whenever the app runs inside Safari.

## 2. In our app

**Install:**

```sh
npm install -D vite-plugin-pwa@2 @vite-pwa/assets-generator@2
npm install workbox-precaching@7 workbox-core@7
```

**Icon:** one SVG ([public/favicon.svg](../../public/favicon.svg): green square, white house, check mark) is the only source. [pwa-assets.config.ts](../../pwa-assets.config.ts) turns it into PNGs:

```
$ npm run icons
✔ PWA assets generated
public/apple-touch-icon-180x180.png   635 B
public/pwa-512x512.png               1626 B   (+ 64, 192, maskable 512)
```

We thought 635 bytes was too small to be a real icon, so we opened the files. They looked right; flat colours just compress extremely well. We set `padding: 0` and a green background, because the SVG already has its own margin, and the default would have added white borders around the Apple icon.

**Manifest + service worker:** [vite.config.ts](../../vite.config.ts) with `strategies: 'injectManifest'`, which means *we* write the service worker ([src/sw.ts](../../src/sw.ts)), because Phase 4 needs our own `push` handler. Today it only does:

```ts
self.skipWaiting(); clientsClaim()          // new version takes over immediately
precacheAndRoute(self.__WB_MANIFEST)        // cache all built files
```

At build time, `self.__WB_MANIFEST` is replaced by the list of files. Real build output:

```
PWA v2.0.0
mode      injectManifest
precache  15 entries (243.75 KiB)
files generated
  dist/sw.js
```

**Mistake: icons listed twice.** `grep '"url"' dist/sw.js` showed every PNG two times: once from our `globPatterns`, once because the plugin adds manifest icons by default. Fix: `includeManifestIcons: false` → `precache 11 entries`, 0 duplicates.

**Harmless warning:** `inlineDynamicImports option is deprecated` comes from inside the plugin, not from our config. Nothing to do.

**iPhone tags** in [index.html](../../index.html): `viewport-fit=cover` (we pad the safe areas ourselves), `apple-touch-icon`, `apple-mobile-web-app-capable`, title "WG", status bar style `default`, `theme-color` for light and dark. We picked `default` over `black-translucent`, because the latter always draws **white** status bar text, which would be invisible on our light background.

**Checked in WebKit** (Playwright, iPhone 15 size, against `npm run preview`):

```
service worker: { scope: 'http://localhost:4173/wehrgasse/', state: 'activating' }
manifest: { href: '…/wehrgasse/manifest.webmanifest', status: 200, start_url: '/wehrgasse/' }
apple-touch-icon status: 200
offline reload, title on screen: Wer bist du?
```

The last line: with the network switched off, the app still starts, served by the service worker.

## 3. Predict, then run

`npm run build && npm run preview`, open <http://localhost:4173/wehrgasse/> in Safari, then Develop menu → Service Workers. **Predict**: after you stop the preview server (Ctrl+C) and reload the page, does it load? Now open <http://localhost:4173/wehrgasse/assets/does-not-exist.js>. Same answer? Why not?

## 4. What a pro would also do

- **"New version available" prompt** instead of silent `autoUpdate`. For a 4-person app, silent is fine.
- **Splash screens** for iOS (`apple-touch-startup-image`, one per screen size). Nice, not needed.
- **Lighthouse PWA audit** in Chrome DevTools for a checklist score.

## 5. Sources

- MDN, Web app manifest: <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest>
- MDN, Service Worker API: <https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API>
- vite-plugin-pwa, injectManifest: <https://vite-pwa-org.netlify.app/guide/inject-manifest.html>
- Workbox precaching: <https://developer.chrome.com/docs/workbox/modules/workbox-precaching>
- Apple, configuring web applications (apple-touch-icon, meta tags): <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html>

## 6. How we know it's right

- **WebKit says so:** service worker active with scope `/wehrgasse/`, manifest 200, icon 200, offline start works.
- **The real test is your iPhone.** Peer ran this checklist on 21.10.2026 after the deploy (GitHub Actions run: success, 1m56s): everything worked.
  1. Open the GitHub Pages URL in **Safari** (not Chrome).
  2. Teilen (□↑, maybe under "⋯") → "Zum Home-Bildschirm" → name should say **WG** → "Hinzufügen".
  3. Check: green house icon on the Home Screen.
  4. Open it: **no Safari address bar**, top and bottom not cut off (notch, home bar).
  5. Settings tab: the install hint should be **gone** (the app knows it's installed).
  6. Switch iPhone to dark mode (Control Centre) → the app turns dark, status bar readable.
  7. Tell Claude what you saw (screenshots welcome); then the ROADMAP box gets ticked.

## 7. Check yourself

1. Why does iOS need a separate apple-touch-icon instead of the manifest icons?
2. What would break if `scope` in the manifest were `/` instead of `/wehrgasse/`?
3. Why did we write our own service worker even though it only caches files today?

<details><summary>Answers</summary>

1. iOS takes the Home Screen icon from `<link rel="apple-touch-icon">`, and it must be opaque; iOS adds the rounded corners.
2. The app lives under `/wehrgasse/` on GitHub Pages. The service worker is registered for `/wehrgasse/` and can't control `/`, and `start_url`/`scope` must match where the app really is (CLAUDE.md).
3. Phase 4 needs a `push` and a `notificationclick` handler. With `injectManifest` we add them to the same file later instead of switching strategies.

</details>

## 8. Your notes

> _What surprised you about installing a website as an app?_
>
>
