# 0004 — Split secrets: public in the build, private only in Supabase

**Status:** Accepted, 2026-10-21

## Context
The repo is public ([0002](0002-github-pages-and-hashrouter.md)), and everything in the frontend bundle is readable by anyone. We have values of different sensitivity: Supabase URL and anon key, the VAPID key pair, the Supabase service role key.

## Decision
- **Frontend (public, baked in at build time):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. Stored as GitHub Actions secrets for the build and in `.env.local` locally. Documented, without values, in [.env.example](../../.env.example).
- **Server only (Supabase function secrets):** `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, service role key. Never in git, never in frontend code, never in a chat.
- **`.gitignore`** ignores all `.env*` files except `.env.example`.
- The VAPID key pair was generated on Peer's laptop, not by an assistant, so the private key never left it.

## Consequences
- ➕ A leak of the frontend bundle exposes nothing that RLS doesn't already guard.
- ➕ Vite's `VITE_` prefix rule prevents accidentally bundling server secrets.
- ➖ The anon key's safety depends entirely on correct RLS policies → part of the Definition of Done.
- ➖ New secret values reach the live app only after a rebuild (next push).
- ➖ Rotating the VAPID pair breaks all existing push subscriptions; every phone must re-enable notifications.
