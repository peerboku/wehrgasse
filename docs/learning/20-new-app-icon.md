# 20 — A new app icon: swapping assets in a PWA without leaving old ones behind

## 1. The idea

An app icon on the web is not one file but a **set**, because every place asks for its own:

| Who asks | Where it's declared | Our file |
|---|---|---|
| Browser tab | `<link rel="icon">` in `index.html` | `favicon.svg` (+ PNG fallbacks 32/16) |
| iPhone Home Screen | `<link rel="apple-touch-icon">` | `apple-touch-icon.png` (180×180, opaque) |
| Android / Chrome install, notifications | `icons` in the web manifest | `icon-192.png`, `icon-512.png` |
| Android adaptive icons | manifest icon with `purpose: "maskable"` | `icon-maskable-512.png` |

A **maskable** icon has its artwork shrunk to the inner 80 % (the "safe zone"), because Android may cut it into a circle, a squircle or a teardrop. An `any` icon fills the whole square.

Swapping an icon is mostly **finding every reference**. The old names can hide in four places: `index.html`, the manifest, the service worker (the notification icon) and whatever script generated them. A reference you forget doesn't fail loudly. It just shows the old icon, or nothing.

Then there are **caches**. Browsers cache files, a service worker caches files, and iOS keeps its own copy of the Home Screen icon from the moment you tapped "Zum Home-Bildschirm". The first two update on their own if the build is set up right. The third one doesn't.

## 2. In our app

The design handoff arrived in [`docs/wg-app-icon/`](../wg-app-icon/README.md): an orange sponge with a green check bubble on ink `#1D1838`, ready-made PNGs, and a [preview](../wg-app-icon/preview.png).

**The real decision:** until now `npm run icons` (`@vite-pwa/assets-generator`) built every PNG from *one* SVG ([chapter 11](11-pwa-install-on-iphone.md)). The new icon has *two* sources (the full icon, plus a simplified favicon for 16 px). We shipped the handoff's PNGs and removed the generator. Why: [ADR 0014](../decisions/0014-app-icon-from-design-handoff.md).

**Swap the files:**

```
$ rm public/pwa-64x64.png public/pwa-192x192.png public/pwa-512x512.png \
     public/maskable-icon-512x512.png public/apple-touch-icon-180x180.png public/favicon.svg
$ cp docs/wg-app-icon/{favicon.svg,favicon-32.png,favicon-16.png,apple-touch-icon.png,icon-192.png,icon-512.png,icon-maskable-512.png} public/
$ rm pwa-assets.config.ts
$ npm uninstall @vite-pwa/assets-generator
$ git diff --stat package.json package-lock.json
 package-lock.json | 834 -----------------------
 package.json      |   1 -
```

834 lines for one dev tool: it brings `sharp` and its native image libraries along. `npm uninstall` does **not** remove the `"icons"` script that called it, so we deleted that line in [package.json](../../package.json) by hand. Otherwise `npm run icons` would fail with "command not found".

We left `icon.svg`, `icon-maskable.svg` and `preview.png` out of `public/` on purpose. The service worker precaches every `*.svg`/`*.png` in the build (`globPatterns` in [vite.config.ts](../../vite.config.ts)), so every phone would download files nobody uses.

**Update the references** (4 places):

- [index.html](../../index.html): SVG favicon + two PNG fallbacks + `apple-touch-icon.png`. Paths stay relative (`./favicon.svg`), not `/favicon.svg` as in the handoff README, because the app lives under `/wehrgasse/` ([chapter 02](02-build-and-base-path.md)).
- [vite.config.ts](../../vite.config.ts): manifest `icons`, 3 entries; the 64 px one is gone.
- [src/sw.ts](../../src/sw.ts): `icon: 'icon-192.png'` in `showNotification`. This one is easy to miss, because it doesn't live in any icon config.
- Leftover colours from the old design: manifest `theme_color` was still the house-icon green `#1f9d6b`, and `background_color` plus the `<meta name="theme-color">` tags were the old iOS grey. They now use Design 3's `--bg`: `#f4f2fb` light, `#121022` dark.

**Check the build:**

```
$ npm run build
precache  12 entries (556.04 KiB)

$ cat dist/manifest.webmanifest
… "background_color":"#f4f2fb","theme_color":"#f4f2fb", …
"icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},
         {"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},
         {"src":"icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]

$ grep -o '"url":"[^"]*\.\(png\|svg\)"' dist/sw.js
"url":"icon-maskable-512.png"
"url":"icon-512.png"
"url":"icon-192.png"
"url":"favicon.svg"
"url":"favicon-32.png"
"url":"favicon-16.png"
"url":"apple-touch-icon.png"

$ grep -c 'pwa-\|maskable-icon-512x512\|apple-touch-icon-180' dist/sw.js dist/index.html
dist/index.html:0
dist/sw.js:0
```

**Check what the server really serves** (`vite preview`):

```
apple-touch-icon.png 200 image/png
icon-192.png 200 image/png
…
manifest.webmanifest 200 application/manifest+json
pwa-192x192.png 200 text/html
```

**A trap in the last line:** the deleted old icon still answered `200`. Look at the type: `text/html`. The preview server answers *every* unknown path with `index.html` (an SPA fallback). A status code alone doesn't prove a file exists, so check the content type too. GitHub Pages has no such fallback and answers `404`.

**Cache busting:** nothing to do by hand. Workbox stores a content hash (`revision`) for every precached file, so a changed file gets a new hash and is downloaded again. `registerType: 'autoUpdate'` activates the new service worker. The one cache we can't reach is **iOS's Home Screen icon**: each flatmate removes the app from the Home Screen and adds it again via Safari › Teilen › „Zum Home-Bildschirm".

**That costs more than the icon.** On iOS each Home Screen web app has **its own storage**, separate from Safari. Removing the app deletes that storage (WG login, picked name, [`me.ts`](../../src/lib/me.ts)) and its push subscription. After re-adding, everyone has to:

1. enter the WG password and tap their name again,
2. tap „Benachrichtigungen aktivieren" in Einstellungen again.

The dead subscription in `push_subscriptions` cleans itself up: Apple answers `410` on the next push, and `notify-done` deletes that row ([chapter 15](15-push-notifications.md)). Best done together, before the 12/12 push test matrix in ROADMAP Phase 4, so it doesn't have to be redone.

Lint, `tsc -b` and 23/23 tests stayed green.

## 3. Predict, then run

Write down first: if you open `https://<you>.github.io/wehrgasse/pwa-192x192.png` after the deploy, what status code and what content type do you get? Why is the answer different from `vite preview`?

Then run `curl -sI https://<you>.github.io/wehrgasse/pwa-192x192.png | head -3`.

<details><summary>What happens</summary>

`404`. GitHub Pages serves only files that exist (plus its own `404.html`). `vite preview` imitates an SPA host and falls back to `index.html`, which is why it said `200 text/html`. That's also why we use no router ([ADR 0002](../decisions/0002-github-pages-and-hashrouter.md)).

</details>

## 4. What a pro would also do

- **Splash screens for iOS** (`apple-touch-startup-image`, one per screen size), now that the app has a strong brand colour. Still not needed.
- **A test in CI** that every file named in the manifest and `index.html` exists in `dist/`. The grep above does the same by hand.
- **Monochrome icon** (`purpose: "monochrome"`) for Android's themed icons. Our phones are iPhones.

## 5. Sources

- W3C Web App Manifest: [`icons` and `purpose`](https://www.w3.org/TR/appmanifest/#icons-member), [`theme_color`](https://www.w3.org/TR/appmanifest/#theme_color-member), [`background_color`](https://www.w3.org/TR/appmanifest/#background_color-member)
- W3C: [Maskable icon safe zone](https://www.w3.org/TR/appmanifest/#icon-masks)
- MDN: [`<link rel="icon">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel#icon), [`<meta name="theme-color">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color)
- Workbox: [precaching and revisions](https://developer.chrome.com/docs/workbox/modules/workbox-precaching)
- Handoff: [docs/wg-app-icon/README.md](../wg-app-icon/README.md)

## 6. How we know it's right

- **The build output** (above): the manifest names only the new files, the service worker precaches all 7, and no old name appears in `dist/`.
- **The server:** all 7 icons and the manifest come back `200` with an image/manifest content type.
- **The design:** the shipped PNGs are byte-for-byte the ones in the handoff's [preview](../wg-app-icon/preview.png) (`cp`, no re-render).
- ⏳ **The iPhone:** after deploy, remove the app from the Home Screen, add it again → the sponge shows; log in and turn notifications on again. Do the same on Carla's, Noa's and Manu's phones.

## 7. Check yourself

1. We changed 4 places that name the icon. Which one wouldn't show up in any "icon" config, and what would you have seen if we'd missed it?
2. Why doesn't the maskable icon just use `icon-512.png`?
3. After the deploy, what updates the icon in Safari's tab by itself, and what doesn't update by itself?

<details><summary>Answers</summary>

1. `src/sw.ts`, the `icon` in `showNotification`. Push notifications would have shown no icon (the file no longer exists).
2. Android cuts maskable icons into its own shapes and may cut off up to 20 % at the edges. The maskable version has the sponge shrunk to 80 % so nothing important gets cut off.
3. Tab icon: the new service worker plus Workbox revisions refresh it by themselves. iOS's Home Screen icon doesn't: you have to remove the app and add it again.

</details>

## 8. Your notes

> _Explain to Manu, in two sentences, why they have to delete and re-add the app to see the sponge, and why they then have to log in and turn notifications on again:_
>
>
