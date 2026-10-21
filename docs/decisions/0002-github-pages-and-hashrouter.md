# 0002 — GitHub Pages hosting, no router / HashRouter only

**Status:** Accepted, 2026-10-21

## Context
The frontend is static files. We want free hosting, HTTPS (required for service workers and push), and automatic deploys from git.

Alternatives considered:
- **Netlify / Vercel / Cloudflare Pages**: free tiers, SPA fallback built in, preview deploys. But another account and service to understand.
- **Supabase hosting**: not offered for static sites.
- **GitHub Pages**: the code already lives on GitHub; Actions deploys it.

GitHub Pages has no "SPA fallback": a request to `/wehrgasse/settings` returns 404 instead of `index.html`. The app also lives in a sub-path (`/wehrgasse/`), not at a domain root.

## Decision
Host on GitHub Pages, deployed by [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml). Vite `base: '/wehrgasse/'`. Navigation by in-app state (tab bar) or `HashRouter` (`/wehrgasse/#/settings`), never path-based routes. Manifest `start_url` and `scope` = `/wehrgasse/`.

## Consequences
- ➕ One account (GitHub), free, HTTPS, deploy on every push.
- ➕ Hash URLs always load `index.html`, so no 404s, also after iPhone reloads.
- ➖ The repo must be **public** for free Pages → nothing private may ever be committed (see [0004](0004-secrets-split-frontend-vs-functions.md)).
- ➖ Renaming the repo changes the URL and breaks installed Home-Screen apps; the base path, manifest and every phone must be updated.
- ➖ No preview deploys for testing changes before they go live.
