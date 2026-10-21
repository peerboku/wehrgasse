# 05 — Secrets and configuration

## 1. The idea

Code is the same everywhere; **configuration** differs per place (your laptop, GitHub Actions, production). The standard pattern is to keep config out of the code, in **environment variables** ([Twelve-Factor App, III](https://12factor.net/config)).

Some config is a **secret**: whoever has it can act as you. The single most important rule: **anything that ships to the browser is public.** Every user can open DevTools and read the JavaScript. So you sort every value into one of three bins:

| Bin | Example | May be in browser code? | May be in git? |
|---|---|---|---|
| Public config | API URL | yes | yes (but we still keep it out of git for easy changes) |
| Public *key*, safe only because of access rules | Supabase anon key | yes | better not |
| **Private secret** | service role key, VAPID private key | **never** | **never** |

How the public Supabase key can be safe: it only identifies *which* project you talk to. What a request may actually read or write is decided in the database by **Row Level Security (RLS)** policies. No RLS policy = the anon key opens everything. That's why "RLS still prevents non-members from reading anything" is in our Definition of Done.

If a private secret ever lands in git: deleting the file is **not enough** (it stays in history). You **rotate** it: create a new one, replace it everywhere, revoke the old one.

## 2. In our app

Where each value lives:

| Value | Bin | Lives in |
|---|---|---|
| `VITE_SUPABASE_URL` | public config | `.env.local` (laptop) + GitHub secret (build) |
| `VITE_SUPABASE_ANON_KEY` | public key + RLS | `.env.local` + GitHub secret |
| `VITE_VAPID_PUBLIC_KEY` | public key | `.env.local` + GitHub secret |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | private | Supabase function secrets only |
| service role key | private | Supabase (auto-available to Edge Functions) |

**The `VITE_` prefix is a safety catch.** Vite only exposes env vars starting with `VITE_` to browser code (as `import.meta.env.VITE_…`). A variable named `VAPID_PRIVATE_KEY` in `.env.local` would *not* be bundled, even by mistake.

[.env.example](../../.env.example) is committed. It documents *which* variables exist, with empty values. Your real `.env.local` is ignored.

Real state (21.10.2026):

```
$ gh secret list --repo peerboku/wehrgasse
VITE_VAPID_PUBLIC_KEY   2026-10-21T09:24:13Z

$ supabase secrets list        (names only; the CLI shows a hash, never the value)
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

→ `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **still missing** as GitHub secrets. Needed by Phase 3, when the live app talks to Supabase.

### Lesson from the raw output: one character in `.gitignore`

Commit `bf2f69c` changed this:

```diff
 .env
 .env.*
-!.env.example
+.env.example
+.env.local
```

In `.gitignore`, a leading `!` means **"exception: do *not* ignore this"**. The rule `.env.*` ignores `.env.example` too, and `!.env.example` was the exception that let it back in. Removing the `!` turned it into "ignore `.env.example`". Git confirms:

```
$ git check-ignore --no-index -v .env.example
.gitignore:14:.env.example	.env.example
```

Nothing broke *yet*, because `.env.example` was already committed and tracked files stay tracked ([chapter 03](03-git-and-github.md)). But someone cloning the repo and creating it fresh, or you after deleting and re-adding it, would get it silently ignored. The `.env.local` line is harmless but redundant: `.env.*` already covers it. Fix:

```diff
 .env
 .env.*
-.env.example
-.env.local
+!.env.example
```

Verify with `git check-ignore --no-index -v .env.example`. **No output** means "not ignored" ✓.

## 3. Predict, then run

1. Add a line `SECRET_TEST=hello` to your `.env.local`.
2. In [src/App.tsx](../../src/App.tsx), temporarily add `console.log(import.meta.env)` inside `App`.
3. **Predict**: will `SECRET_TEST` appear in the browser console? Will `VITE_SUPABASE_URL`?
4. `npm run dev`, open the console, check. Remove both changes afterwards.

## 4. What a pro would also do

- **Secret scanning**: GitHub can block pushes that contain known key formats (repo Settings → *Code security* → *Secret Protection* / push protection; free for public repos). Turn it on, it's one click.
- **A password manager entry per secret** with where it's used, so rotation is a checklist, not archaeology.
- **Never paste a private secret into a chat, an issue or a screenshot**, including AI chats. That's why you generated the VAPID keys yourself.

## 5. Sources

- Vite, env variables and modes: <https://vite.dev/guide/env-and-mode>
- Supabase API keys (anon vs. service role): <https://supabase.com/docs/guides/api/api-keys>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- GitHub Actions secrets: <https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions>
- `.gitignore` patterns (the `!` rule): <https://git-scm.com/docs/gitignore#_pattern_format>
- The Twelve-Factor App, Config: <https://12factor.net/config>

## 6. How we know it's right

- **`git check-ignore`**: git, not us, tells which rule ignores which file (it found the `.env.example` issue).
- **`gh secret list` / `supabase secrets list`** show which secrets exist, without revealing values.
- **The built bundle**: from Phase 3 on, search `dist/assets/*.js` for the strings `service_role` and `PRIVATE`. They must not appear. A pro adds this as a CI step.
- **RLS test (Phase 3)**: request a table with only the anon key and no login. Must return nothing.

## 7. Check yourself

1. Why is it OK that `VITE_SUPABASE_ANON_KEY` ends up in the browser, but never the service role key?
2. What does `!` at the start of a `.gitignore` line do?
3. You accidentally pushed `VAPID_PRIVATE_KEY` in a commit. What are the steps?

<details><summary>Answers</summary>

1. The anon key is limited by RLS policies to what a logged-in member may do. The service role key **bypasses RLS** and can read and delete everything.
2. It's an exception: re-include a file that an earlier pattern ignored.
3. Generate a new key pair, update both secrets (GitHub + Supabase), redeploy, and have everyone re-enable notifications (old subscriptions belong to the old key). Then remove the file from the repo. Removing it alone is not enough, since the history keeps it.

</details>

## 8. Your notes

> _Sort these into the three bins without looking: Supabase URL, database password, VAPID public key, service role key._
>
>
