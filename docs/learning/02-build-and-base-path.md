# 02 — Building for production and the base path

## 1. The idea

The code you write is made for *humans*: many small files, TypeScript, imports between them. A browser wants few, small, plain-JavaScript files. A **build** translates one into the other:

1. **Type-check** (TypeScript compiler): stop if there's an error.
2. **Bundle**: follow all `import`s from the entry file and merge them into one (or a few) JavaScript files.
3. **Minify**: strip spaces and shorten names → smaller download.
4. **Hash file names**: `index-D5oDuFPz.js`. The hash is computed from the file's content. Same content → same name; change one character → new name. That lets browsers cache files forever and still get updates immediately, because an update has a new name.

The output goes into a folder (here `dist/`), which is *generated*, so you never edit it and never commit it.

**Base path**: a built app references its own files with URLs. If the app lives at the root of a domain (`example.com/`), `/assets/app.js` works. If it lives in a sub-folder (`example.com/myapp/`), that same URL points to the wrong place and you get a blank page. So the build must know its **base path**.

## 2. In our app

GitHub Pages serves a project repo at `https://peerboku.github.io/wehrgasse/`, which is a sub-folder. So [vite.config.ts](../../vite.config.ts) sets:

```ts
// GitHub Pages serves the app at https://<user>.github.io/<repo-name>/
base: '/wehrgasse/',
```

`npm run build` runs `tsc -b && vite build`. Real output (21.10.2026):

```
dist/index.html                   0.47 kB │ gzip:  0.30 kB
dist/assets/index-Gt5BMzPi.css    0.37 kB │ gzip:  0.23 kB
dist/assets/index-D5oDuFPz.js   219.76 kB │ gzip: 68.73 kB
✓ built in 64ms
```

And the generated `dist/index.html`. The base path was written into every asset URL:

```html
<script type="module" crossorigin src="/wehrgasse/assets/index-D5oDuFPz.js"></script>
<link rel="stylesheet" crossorigin href="/wehrgasse/assets/index-Gt5BMzPi.css">
```

Two observations from the raw output:

- **Almost all of the 220 kB is React**, not our 12-line app. That's the fixed cost of the library. (68 kB gzipped is what actually travels over the network.)
- **The hash was identical** in the build at 10:29 and the one at ~12:00 (`D5oDuFPz` both times), because nothing in `src/` changed. Builds are *deterministic*: same input, same output.

The base path also matters later: in Phase 1 the PWA manifest's `start_url` and `scope` must match `/wehrgasse/`, or the iPhone Home-Screen app opens the wrong page. And because Pages can't redirect unknown paths back to `index.html`, we'll use no router or only a `HashRouter` (`/wehrgasse/#/settings`). See [ADR 0002](../decisions/0002-github-pages-and-hashrouter.md).

## 3. Predict, then run

1. Write down the current two hashes (`D5oDuFPz` for JS, `Gt5BMzPi` for CSS).
2. Change the text of `comingSoon` in [src/lib/strings.ts](../../src/lib/strings.ts).
3. **Predict**: which hash changes, JS, CSS, both, or neither?
4. Run `npm run build` and compare. Then undo your change (`git checkout src/lib/strings.ts`).

Bonus: set `base` to `'/'`, build, run `npx vite preview --base /wehrgasse/` and open it. What do you see, and why?

## 4. What a pro would also do

- **Set a performance budget**: e.g. "first load < 100 kB gzipped", checked in CI. We're at 68.7 kB.
- **Check the built app, not only the dev server**: `npm run preview` serves `dist/` locally so you catch base-path bugs before deploying.
- **Run Lighthouse** in Chrome DevTools on the live URL for performance, accessibility and PWA checks (useful from Phase 1 on).

## 5. Sources

- Vite, "Building for production": <https://vite.dev/guide/build>
- Vite `base` option: <https://vite.dev/config/shared-options#base>
- MDN, HTTP caching: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching>

## 6. How we know it's right

- **`tsc`** passed (otherwise `vite build` wouldn't have run).
- **The generated HTML** shows `/wehrgasse/` in every asset URL. That's the build's own output, not our claim.
- **The live site** returns HTTP 200 and renders (see [chapter 04](04-ci-cd-github-pages.md)), which can only happen if the asset paths are right.

## 7. Check yourself

1. You deploy, and a flatmate still sees the old version. With hashed file names, which single file is most likely cached?
2. What exactly would break if we forgot `base: '/wehrgasse/'`?
3. Why is `dist/` in `.gitignore`?

<details><summary>Answers</summary>

1. `index.html`. It has no hash in its name, so a browser may serve a stale copy that still points to the old hashed JS file.
   1. New Content means new name (hash). Browser treats it as file it has never seen. So hashed files can be uploaded agressively. The new files need to get downloaded everytime and because everything points to the new file it doesnt matter if the old file is still there. Index.hmtl is the entry point and can be stale, because there is no new name. Sometimes after update needs to get fully reloaded (f.ex- clsoing app completely)
2. `index.html` would load `/assets/index-….js`, i.e. `https://peerboku.github.io/assets/…`, which doesn't exist → 404 → blank page.
3. It's generated from `src/` by the build; committing it means two sources of truth and noisy diffs. GitHub Actions builds it fresh.

</details>

## 8. Your notes

> _Explain "content hash" in your own words:_
- Every content creates a different hash. The content hash serves as the fingerprint that always leads to the same content but is unique. So changing only a small part of a file creates a new hash content. 
