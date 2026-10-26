# 12 — From hallway test to fixes

## 1. The idea

A **hallway test** (Steve Krug, *Don't Make Me Think*) is the cheapest usability test there is: grab someone nearby, give them a task, **say nothing**, and watch. You aren't testing the person, you're testing the screen. Three to five people find most of the big problems. The rule that matters most: write down where they *hesitate*, not only where they fail. Hesitation is a problem the user solved by guessing.

Then the hard part, **triage**. You can't fix everything, so count: an issue that hit 2 of 2 people beats one that hit 1. Fix the top few, park the rest as ideas, and keep what people *liked* so you don't "fix" it away.

## 2. In our app

Test on 23.10.2026, notes in [hallway-test.md](../hallway-test.md). Noa and Carla tested; Manu hasn't yet.

The raw notes, grouped by task (summary table in [ROADMAP.md, "Test findings"](../../ROADMAP.md#test-findings)):

| Issue | Hit | What we did |
|---|---|---|
| Login: "Why put in password?" / "What password should I use?" | **2/2** | One shared WG password instead of 4 personal ones ([ADR 0007](../decisions/0007-shared-wg-login.md)). Peer explains it in person; we decided *not* to add an explanation line to the UI. |
| Overview: week/deadline too small; wants colour or icon per chore | 2/2 (different words, same problem: *hard to scan*) | `chores.icon` column (🗑️ 🛁 🚿 🍳) shown in every row; a week box with `strings.deadline()` → "fällig bis Sonntag, 1. Nov." at 17–20 px |
| MyWeek: "confused because task from last week is still open" | 1/2 | This week's big card first, overdue cards below with `strings.myWeek.fromWeek()` → "aus der Woche 19.–25. Okt." |
| "Maybe add pictures of everyone" | 1/2 | ROADMAP → Ideas (not built) |
| Animation + cheer texts | liked by 2/2 | kept unchanged |

Two things worth noticing:

- **Fix #1 is not a UI change.** The confusion came from the *model* (four personal passwords for four flatmates who live together). Changing the model removed the question instead of explaining the answer. It also changed the database design (members no longer linked to auth users), which is why it got an ADR.
- **Part of Noa's confusion came from the mock data.** The prototype faked "last week overdue" on purpose to show the red state. In real life there is no overdue item in launch week. We still fixed the order, because the core value in CLAUDE.md is *"open the app → instantly see my chore this week"*, and an old chore on top works against that.

A small coding mistake on the way: `fromWeek` first called `strings.weekRange(...)` *inside* the `strings` object. TypeScript can't infer the type of an object that refers to itself while it's being built, so we moved `weekRange` out into a plain function above `strings` ([strings.ts](../../src/lib/strings.ts)).

## 3. Predict, then run

Open [MyWeek.tsx](../../src/screens/MyWeek.tsx) and swap the two `<section>` blocks back (overdue first). **Predict:** does anything else break, a test or the build? Run `npm run test` and `npm run build`, then undo with `git checkout src/screens/MyWeek.tsx`.

## 4. What a pro would also do

- **Test the third person.** Manu's test is still open. One more tester often finds the issue the first two didn't.
- **Re-test the fixes** with someone who hasn't seen the app (a friend visiting). Fixes can create new hesitations.
- **Time the tasks** (task 2 asked for it). We wrote "quick" instead of seconds. Fine for us, but numbers let you compare before/after.

## 5. Sources

- Steve Krug, *Rocket Surgery Made Easy* (2010): the do-it-yourself usability test, including "three users is enough".
- Nielsen Norman Group, "Why You Only Need to Test with 5 Users": <https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/>

## 6. How we know it's right

- **Other people, not us:** the issues come from Noa's and Carla's words, quoted in `hallway-test.md`.
- **The fixes are checked at launch:** the real proof is whether the next round of questions in the flat chat is about password or "where is my chore". If nobody asks, the fix worked.
- `npm run test`, `npm run lint`, `npm run build` all pass after the change.

## 7. Check yourself

1. Why did "both testers asked about the password" rank above "one tester wants photos"?
2. Why did we fix the overdue order even though launch week has no overdue items?
3. What's the difference between *hesitated* and *failed* in the notes, and why record both?

<details><summary>Answers</summary>

1. It hit 2/2 people, and it's on the path to the core value (you can't see your chore before logging in). Photos are nice-to-have and hit 1/2.
2. From week 2 on, any forgotten chore would push "this week" down the screen. The core value says *my chore this week, instantly*.
3. Failed = couldn't do it. Hesitated = did it, but had to guess. Hesitation is an early warning of the same problem, and it's far more common.

</details>

## 8. Your notes

> _In your words: why was the password problem fixed by changing the login model instead of adding a help text?_
>
>
