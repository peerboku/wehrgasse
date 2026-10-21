# 0001 — Vite + React + TypeScript for the frontend

**Status:** Accepted, 2026-10-21

## Context
We need a mobile-first web app that can be installed on iPhones (PWA) with a custom service worker for push. The owner is new to coding (some Python); the app must be built in 5 days and maintained by one person afterwards.

Alternatives considered:
- **Plain HTML + JavaScript**: no build step, but no type checking, and UI state (done/overdue/celebration) gets messy fast.
- **Next.js / SvelteKit**: powerful, but built around a server; GitHub Pages can only serve static files.
- **Native iOS app (Swift)**: best push support, but needs a Mac dev setup, App Store/TestFlight, and excludes non-iPhone flatmates later.

## Decision
Vite + React + TypeScript, scaffolded with `npm create vite` (`react-ts` template). PWA via `vite-plugin-pwa` (injectManifest) in Phase 1.

## Consequences
- ➕ Biggest ecosystem and the most learning material for React; TypeScript catches mistakes at build time.
- ➕ Vite builds static files → any static host works.
- ➕ `vite-plugin-pwa` supports a hand-written service worker, needed for push.
- ➖ ~68 kB gzipped of React before any app code.
- ➖ Two languages to learn at once (TypeScript + JSX).
