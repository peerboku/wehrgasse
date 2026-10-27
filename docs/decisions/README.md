# Architecture Decision Records (ADRs)

One short file per decision that had real alternatives. Format after [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): **Context** (the situation and forces), **Decision** (what we chose), **Consequences** (what gets easier, what gets harder).

Rules:
- Never edit an accepted ADR's decision. If we change our mind, write a new ADR that *supersedes* the old one, and mark the old one `Superseded by NNNN`.
- Number sequentially, keep them short (half a page).

| # | Decision | Status |
|---|---|---|
| [0001](0001-vite-react-typescript.md) | Vite + React + TypeScript for the frontend | Accepted |
| [0002](0002-github-pages-and-hashrouter.md) | GitHub Pages hosting, no router / HashRouter only | Accepted |
| [0003](0003-supabase-as-backend.md) | Supabase as backend | Accepted |
| [0004](0004-secrets-split-frontend-vs-functions.md) | Split secrets: public in build, private only in Supabase | Accepted |
| [0005](0005-dates-with-intl-no-library.md) | Week math with built-in `Intl`, no date library | Accepted |
| [0006](0006-css-modules.md) | Styling with CSS Modules + design tokens | Accepted |
| [0007](0007-shared-wg-login.md) | One shared WG login, then pick your name | Accepted |
| [0008](0008-migrations-straight-to-cloud.md) | Push migrations straight to the cloud DB (no local stack) | Accepted |
| [0009](0009-push-trigger-pg-net-vault.md) | Push via DB trigger (pg_net + Vault) in a migration, shared secret | Accepted |
| [0010](0010-private-avatar-bucket.md) | Profile photos in a private bucket, loaded with `download()` | Accepted |
