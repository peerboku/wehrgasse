# 0007 — One shared WG login, then pick your name

**Status:** Accepted, 2026-10-24. Replaces the "4 fixed accounts" rule in the first CLAUDE.md.

## Context
The plan was 4 Supabase auth users (one per flatmate), with `members.id = auth.users.id`, so the database itself could enforce "only the assigned person marks their chore done". In the hallway test (23.10.) **both** testers stumbled at the password step ("Why do I need a password? Which one?"). Only Peer ever logs into Supabase. The flatmates only see our app, so this is about how much friction the app's own login creates.

Alternatives considered:
- **4 app users with fake emails**: strongest, since the DB knows who is who and RLS enforces the owner rule. Costs: 4 passwords to hand out, and the hallway confusion stays.
- **Magic link by email**: no password, but needs real emails, and on iPhone the link opens in Safari, not in the Home-Screen app (separate storage), so the PWA stays logged out.
- **One shared WG user + pick your name** (chosen): one password for the flat, typed once per phone, then tap your name. The app remembers the name on the phone (`src/lib/me.ts`).

## Decision
One auth user `wg@wehrgasse.com` (never mailed: confirmation and password reset are off). After login, the name tiles come from the `members` table. `members.id` is its own uuid, with no link to `auth.users`. Sign-ups are **off** in the dashboard, so "authenticated" means "knows the WG password".

## Consequences
- ➕ One password to explain, and only once per phone.
- ➕ Members don't depend on auth users, so all seed data lives in migrations (no "create users first" ordering).
- ➖ The rule "only the owner marks done" is now enforced by the **UI**, not the database. Any flatmate could technically tick someone else's chore. The DB still checks `done_by = member_id`. For 4 people who trust each other, that's fine.
- ➖ `events.member_id` is what the phone *says*. Statistics trust it.
- ➖ If the WG password leaks, everyone has to log in again with a new one (Peer changes it in the dashboard).
- Revisit if trust becomes an issue or when "für Carla abhaken" (ROADMAP Ideas) is decided.
